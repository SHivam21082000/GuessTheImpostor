/**
 * Pure game rules. The server owns one GameState per room and calls these
 * functions in response to player actions and timer expiry. Every function
 * mutates the state it is given and throws GameError on an illegal action.
 * Time and randomness are injected so the rules are fully testable.
 */
import { CRICKETERS, getCricketer } from "./data/players";
import { chooseHint } from "./hints";
import { clueRevealsName } from "./names";
import {
  DEFAULT_SETTINGS,
  MAX_PLAYERS,
  MIN_PLAYERS,
  type Cricketer,
  type GameState,
  type Round,
  type RoundOutcome,
  type Settings,
} from "./types";

export interface Ctx {
  now: number;
  rng: () => number;
}

export class GameError extends Error {
  constructor(
    public code: string,
    message: string,
  ) {
    super(message);
  }
}

const fail = (code: string, message: string): never => {
  throw new GameError(code, message);
};

export const MAX_CLUE_LENGTH = 60;
const RECENT_LIMIT = 20;

// ---------- helpers ----------

export function poolFor(settings: Settings): Cricketer[] {
  return settings.eraFilter === "all" ? CRICKETERS : CRICKETERS.filter((c) => c.era === settings.eraFilter);
}

function shuffle<T>(arr: T[], rng: () => number): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

function seat(state: GameState, playerId: string) {
  return state.players.find((p) => p.id === playerId) ?? fail("not_in_room", "You are not in this room.");
}

function requireHost(state: GameState, playerId: string) {
  if (state.hostId !== playerId) fail("not_host", "Only the host can do that.");
}

function requirePhase(state: GameState, ...phases: GameState["phase"][]) {
  if (!phases.includes(state.phase)) fail("wrong_phase", `Not allowed during ${state.phase}.`);
}

function round(state: GameState): Round {
  return state.round ?? fail("no_round", "No round in progress.");
}

const connectedIds = (state: GameState) => state.players.filter((p) => p.connected).map((p) => p.id);

// ---------- room lifecycle ----------

export function createGame(code: string, host: { id: string; name: string; avatar: string }): GameState {
  return {
    code,
    hostId: host.id,
    players: [{ ...host, score: 0, connected: true }],
    settings: { ...DEFAULT_SETTINGS },
    phase: "lobby",
    endsAt: null,
    round: null,
    roundsPlayed: 0,
    recent: [],
  };
}

export function addPlayer(state: GameState, p: { id: string; name: string; avatar: string }) {
  if (state.phase !== "lobby") fail("in_progress", "A match is in progress. Wait for it to finish.");
  if (state.players.length >= MAX_PLAYERS) fail("room_full", "Room is full.");
  const name = p.name.trim().slice(0, 16);
  if (!name) fail("bad_name", "Pick a nickname.");
  if (state.players.some((s) => s.name.toLowerCase() === name.toLowerCase())) fail("name_taken", "That nickname is taken in this room.");
  state.players.push({ id: p.id, name, avatar: p.avatar, score: 0, connected: true });
}

export function setConnected(state: GameState, playerId: string, connected: boolean, ctx: Ctx) {
  const s = state.players.find((p) => p.id === playerId);
  if (!s) return;
  s.connected = connected;
  if (!connected && state.hostId === playerId) migrateHost(state);
  if (!connected) maybeAdvanceAfterDeparture(state, ctx);
}

function migrateHost(state: GameState) {
  const next = state.players.find((p) => p.connected && p.id !== state.hostId);
  if (next) state.hostId = next.id;
}

/** Player leaves for good (kicked or left). */
export function removePlayer(state: GameState, playerId: string, ctx: Ctx) {
  const idx = state.players.findIndex((p) => p.id === playerId);
  if (idx < 0) return;
  state.players.splice(idx, 1);
  if (state.hostId === playerId && state.players[0]) {
    state.hostId = (state.players.find((p) => p.connected) ?? state.players[0]).id;
  }
  const r = state.round;
  if (!r || state.phase === "lobby" || state.phase === "matchEnd" || state.phase === "result") return;
  if (r.impostorId === playerId) {
    finishRound(state, "void", ctx);
    return;
  }
  if (state.players.length < MIN_PLAYERS) {
    finishRound(state, "void", ctx);
    return;
  }
  // Drop them from turn order without skipping the current speaker.
  const pos = r.turnOrder.indexOf(playerId);
  if (pos >= 0) {
    r.turnOrder.splice(pos, 1);
    if (pos < r.turnIndex) r.turnIndex--;
    if (state.phase === "clues" && pos === r.turnIndex) {
      if (r.turnIndex >= r.turnOrder.length) {
        r.turnIndex = 0;
        r.lap++;
      }
      if (r.lap > state.settings.laps) startDiscussion(state, ctx);
      else state.endsAt = ctx.now + state.settings.turnSeconds * 1000;
    }
  }
  delete r.votes[playerId];
  maybeAdvanceAfterDeparture(state, ctx);
}

function maybeAdvanceAfterDeparture(state: GameState, ctx: Ctx) {
  if (state.phase === "reveal") maybeFinishReveal(state, ctx);
  if (state.phase === "vote" || state.phase === "revote") maybeResolveVotes(state, ctx);
}

export function kick(state: GameState, hostId: string, targetId: string, ctx: Ctx) {
  requireHost(state, hostId);
  if (targetId === hostId) fail("bad_target", "You can't kick yourself.");
  seat(state, targetId);
  removePlayer(state, targetId, ctx);
}

export function updateSettings(state: GameState, playerId: string, patch: Partial<Settings>) {
  requireHost(state, playerId);
  requirePhase(state, "lobby", "matchEnd");
  const s = { ...state.settings, ...patch };
  const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, Math.round(v)));
  s.turnSeconds = clamp(s.turnSeconds, 10, 120);
  s.laps = clamp(s.laps, 1, 3);
  s.rounds = clamp(s.rounds, 1, 10);
  s.revealSeconds = clamp(s.revealSeconds, 5, 60);
  s.discussionSeconds = clamp(s.discussionSeconds, 0, 300);
  s.voteSeconds = clamp(s.voteSeconds, 10, 120);
  s.guessSeconds = clamp(s.guessSeconds, 10, 120);
  if (!["random", "country", "profile", "iplTeam"].includes(s.hintMode)) s.hintMode = "random";
  if (!["all", "current", "retired"].includes(s.eraFilter)) s.eraFilter = "all";
  state.settings = s;
}

// ---------- match flow ----------

export function startMatch(state: GameState, playerId: string, ctx: Ctx) {
  requireHost(state, playerId);
  requirePhase(state, "lobby", "matchEnd");
  if (connectedIds(state).length < MIN_PLAYERS) fail("not_enough_players", `Need at least ${MIN_PLAYERS} players.`);
  state.players = state.players.filter((p) => p.connected);
  for (const p of state.players) p.score = 0;
  state.roundsPlayed = 0;
  startRound(state, ctx);
}

function startRound(state: GameState, ctx: Ctx) {
  const pool = poolFor(state.settings);
  const fresh = pool.filter((c) => !state.recent.includes(c.id));
  const candidates = fresh.length > 0 ? fresh : pool;
  const secret = candidates[Math.floor(ctx.rng() * candidates.length)]!;
  state.recent = [...state.recent, secret.id].slice(-RECENT_LIMIT);

  const ids = state.players.map((p) => p.id);
  const impostorId = ids[Math.floor(ctx.rng() * ids.length)]!;
  const order = shuffle(ids, ctx.rng);
  // The impostor never speaks first: they need to hear a clue or two.
  if (order[0] === impostorId && order.length > 1) [order[0], order[1]] = [order[1]!, order[0]!];

  state.round = {
    number: state.roundsPlayed + 1,
    secretId: secret.id,
    impostorId,
    hint: chooseHint(secret, pool, state.settings.hintMode, ctx.rng),
    turnOrder: order,
    turnIndex: 0,
    lap: 1,
    clues: [],
    ready: [],
    votes: {},
    firstVotes: null,
    revoteCandidates: null,
    midRoundGuess: false,
    guessId: null,
    outcome: null,
    points: {},
  };
  state.phase = "reveal";
  state.endsAt = ctx.now + state.settings.revealSeconds * 1000;
}

export function markReady(state: GameState, playerId: string, ctx: Ctx) {
  requirePhase(state, "reveal");
  seat(state, playerId);
  const r = round(state);
  if (!r.ready.includes(playerId)) r.ready.push(playerId);
  maybeFinishReveal(state, ctx);
}

function maybeFinishReveal(state: GameState, ctx: Ctx) {
  const r = round(state);
  if (connectedIds(state).every((id) => r.ready.includes(id))) startClues(state, ctx);
}

function startClues(state: GameState, ctx: Ctx) {
  state.phase = "clues";
  state.endsAt = ctx.now + state.settings.turnSeconds * 1000;
}

export function currentSpeaker(state: GameState): string | null {
  if (state.phase !== "clues" || !state.round) return null;
  return state.round.turnOrder[state.round.turnIndex] ?? null;
}

/**
 * The speaker ends their turn. `text` is the typed clue; it may be empty when
 * the clue was said out loud in the same room.
 */
export function submitClue(state: GameState, playerId: string, text: string, ctx: Ctx) {
  requirePhase(state, "clues");
  const r = round(state);
  if (currentSpeaker(state) !== playerId) fail("not_your_turn", "It's not your turn.");
  const clean = text.replace(/\s+/g, " ").trim().slice(0, MAX_CLUE_LENGTH);
  if (clean && clueRevealsName(clean, getCricketer(r.secretId))) {
    fail("name_in_clue", "Your clue gives the name away. Try something sneakier.");
  }
  if (clean) r.clues.push({ playerId, text: clean, lap: r.lap });
  advanceTurn(state, ctx);
}

function advanceTurn(state: GameState, ctx: Ctx) {
  const r = round(state);
  r.turnIndex++;
  if (r.turnIndex >= r.turnOrder.length) {
    r.turnIndex = 0;
    r.lap++;
  }
  if (r.lap > state.settings.laps) startDiscussion(state, ctx);
  else state.endsAt = ctx.now + state.settings.turnSeconds * 1000;
}

function startDiscussion(state: GameState, ctx: Ctx) {
  if (state.settings.discussionSeconds <= 0) return startVote(state, ctx);
  state.phase = "discussion";
  state.endsAt = ctx.now + state.settings.discussionSeconds * 1000;
}

/** Host can cut discussion short. */
export function skipDiscussion(state: GameState, playerId: string, ctx: Ctx) {
  requireHost(state, playerId);
  requirePhase(state, "discussion");
  startVote(state, ctx);
}

function startVote(state: GameState, ctx: Ctx) {
  const r = round(state);
  r.votes = {};
  state.phase = "vote";
  state.endsAt = ctx.now + state.settings.voteSeconds * 1000;
}

export function castVote(state: GameState, voterId: string, targetId: string, ctx: Ctx) {
  requirePhase(state, "vote", "revote");
  const r = round(state);
  seat(state, voterId);
  seat(state, targetId);
  if (voterId === targetId) fail("self_vote", "You can't vote for yourself.");
  if (state.phase === "revote" && !r.revoteCandidates?.includes(targetId)) fail("bad_target", "Vote for one of the tied players.");
  r.votes[voterId] = targetId;
  maybeResolveVotes(state, ctx);
}

function maybeResolveVotes(state: GameState, ctx: Ctx) {
  const r = round(state);
  // Players on a revote ballot can still vote (for the other tied player).
  const voters = connectedIds(state);
  if (voters.every((id) => r.votes[id] !== undefined)) resolveVotes(state, ctx);
}

function resolveVotes(state: GameState, ctx: Ctx) {
  const r = round(state);
  const tally = new Map<string, number>();
  for (const t of Object.values(r.votes)) tally.set(t, (tally.get(t) ?? 0) + 1);
  const max = Math.max(0, ...tally.values());
  const top = [...tally.entries()].filter(([, n]) => n === max).map(([id]) => id);

  if (max === 0) return finishRound(state, "escaped", ctx);

  if (top.length > 1) {
    if (state.phase === "vote") {
      r.firstVotes = r.votes;
      r.votes = {};
      r.revoteCandidates = top;
      state.phase = "revote";
      state.endsAt = ctx.now + 15_000;
      return;
    }
    return finishRound(state, "escaped", ctx); // second tie: impostor escapes
  }

  if (top[0] === r.impostorId) {
    state.phase = "guess";
    state.endsAt = ctx.now + state.settings.guessSeconds * 1000;
  } else {
    finishRound(state, "escaped", ctx);
  }
}

/** Impostor presses "I know it!" during clues or discussion. */
export function callGuess(state: GameState, playerId: string, ctx: Ctx) {
  requirePhase(state, "clues", "discussion");
  const r = round(state);
  if (r.impostorId !== playerId) fail("not_impostor", "Only the impostor can call a guess.");
  r.midRoundGuess = true;
  state.phase = "guess";
  state.endsAt = ctx.now + state.settings.guessSeconds * 1000;
}

export function submitGuess(state: GameState, playerId: string, cricketerId: string, ctx: Ctx) {
  requirePhase(state, "guess");
  const r = round(state);
  if (r.impostorId !== playerId) fail("not_impostor", "Only the impostor guesses.");
  getCricketer(cricketerId);
  r.guessId = cricketerId;
  const right = cricketerId === r.secretId;
  const outcome: RoundOutcome = r.midRoundGuess
    ? right
      ? "midGuessRight"
      : "midGuessWrong"
    : right
      ? "caughtRightGuess"
      : "caughtWrongGuess";
  finishRound(state, outcome, ctx);
}

// ---------- scoring ----------

export const POINTS = {
  crewCatch: 2,
  correctVoteBonus: 1,
  impostorEscape: 3,
  impostorCaughtButGuessed: 3,
  impostorMidGuess: 4,
  crewMidGuessWrong: 2,
} as const;

export function scoreRound(state: GameState, outcome: RoundOutcome): Record<string, number> {
  const r = round(state);
  const pts: Record<string, number> = {};
  const crew = state.players.filter((p) => p.id !== r.impostorId).map((p) => p.id);
  const give = (id: string, n: number) => (pts[id] = (pts[id] ?? 0) + n);
  switch (outcome) {
    case "caughtWrongGuess":
      for (const id of crew) {
        give(id, POINTS.crewCatch);
        if (r.votes[id] === r.impostorId) give(id, POINTS.correctVoteBonus);
      }
      break;
    case "caughtRightGuess":
      give(r.impostorId, POINTS.impostorCaughtButGuessed);
      break;
    case "escaped":
      give(r.impostorId, POINTS.impostorEscape);
      break;
    case "midGuessRight":
      give(r.impostorId, POINTS.impostorMidGuess);
      break;
    case "midGuessWrong":
      for (const id of crew) give(id, POINTS.crewMidGuessWrong);
      break;
    case "void":
      break;
  }
  return pts;
}

function finishRound(state: GameState, outcome: RoundOutcome, ctx: Ctx) {
  const r = round(state);
  r.outcome = outcome;
  r.points = scoreRound(state, outcome);
  for (const p of state.players) p.score += r.points[p.id] ?? 0;
  state.roundsPlayed++;
  state.phase = "result";
  state.endsAt = null;
  void ctx;
}

/** Host moves on from the result screen. */
export function nextRound(state: GameState, playerId: string, ctx: Ctx) {
  requireHost(state, playerId);
  requirePhase(state, "result");
  if (state.roundsPlayed >= state.settings.rounds) {
    state.phase = "matchEnd";
    state.endsAt = null;
    return;
  }
  // Players who dropped out for good are not dealt in.
  if (connectedIds(state).length < MIN_PLAYERS) fail("not_enough_players", `Need at least ${MIN_PLAYERS} connected players.`);
  state.players = state.players.filter((p) => p.connected);
  if (!state.players.some((p) => p.id === state.hostId)) migrateHost(state);
  startRound(state, ctx);
}

/** Host sends everyone back to the lobby after a match. */
export function backToLobby(state: GameState, playerId: string) {
  requireHost(state, playerId);
  requirePhase(state, "matchEnd", "result");
  state.phase = "lobby";
  state.endsAt = null;
  state.round = null;
  state.roundsPlayed = 0;
  state.players = state.players.filter((p) => p.connected);
  for (const p of state.players) p.score = 0;
}

// ---------- timers ----------

/** Called by the server when `endsAt` passes. Applies the timeout rule for the phase. */
export function onTimeout(state: GameState, ctx: Ctx) {
  if (state.endsAt === null || ctx.now < state.endsAt) return;
  switch (state.phase) {
    case "reveal":
      return startClues(state, ctx);
    case "clues":
      return advanceTurn(state, ctx); // speaker ran out of time
    case "discussion":
      return startVote(state, ctx);
    case "vote":
    case "revote":
      return resolveVotes(state, ctx);
    case "guess":
      // No guess in time counts as a wrong guess.
      return finishRound(state, round(state).midRoundGuess ? "midGuessWrong" : "caughtWrongGuess", ctx);
    default:
      state.endsAt = null;
  }
}
