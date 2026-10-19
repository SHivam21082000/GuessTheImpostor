/**
 * What each player is allowed to see. The server never sends GameState itself;
 * it sends buildView(state, viewerId) to each socket, so the impostor's browser
 * never holds the secret player.
 */
import { getCricketer } from "./data/players";
import { profileOf } from "./hints";
import { currentSpeaker } from "./engine";
import type { Clue, GameState, Hint, Phase, RoundOutcome, Seat, Settings } from "./types";

export interface CricketerCard {
  id: string;
  name: string;
  country: string;
  profile: string;
  lastIplTeam: string | null;
  era: "current" | "retired";
}

export type YourRole =
  | { kind: "none" }
  | { kind: "crew"; card: CricketerCard }
  | { kind: "impostor"; hint: Hint };

export interface RoundView {
  number: number;
  turnOrder: string[];
  speakerId: string | null;
  lap: number;
  clues: Clue[];
  readyIds: string[];
  /** Who has voted in the current ballot (not for whom). */
  votedIds: string[];
  revoteCandidates: string[] | null;
  midRoundGuess: boolean;
  /** Filled only once the round is over. */
  reveal: null | {
    secret: CricketerCard;
    impostorId: string;
    hint: Hint;
    votes: Record<string, string>;
    firstVotes: Record<string, string> | null;
    guess: CricketerCard | null;
    outcome: RoundOutcome;
    points: Record<string, number>;
  };
}

export interface RoomView {
  code: string;
  you: string;
  hostId: string;
  players: Seat[];
  settings: Settings;
  phase: Phase;
  endsAt: number | null;
  roundsPlayed: number;
  role: YourRole;
  /** Your own vote in the current ballot. */
  yourVote: string | null;
  round: RoundView | null;
}

export function cardOf(id: string): CricketerCard {
  const c = getCricketer(id);
  return { id: c.id, name: c.name, country: c.country, profile: profileOf(c), lastIplTeam: c.lastIplTeam, era: c.era };
}

export function buildView(state: GameState, viewerId: string): RoomView {
  const r = state.round;
  const over = state.phase === "result" || state.phase === "matchEnd";
  let role: YourRole = { kind: "none" };
  if (r && state.phase !== "lobby") {
    role = r.impostorId === viewerId ? { kind: "impostor", hint: r.hint } : { kind: "crew", card: cardOf(r.secretId) };
  }
  return {
    code: state.code,
    you: viewerId,
    hostId: state.hostId,
    players: state.players,
    settings: state.settings,
    phase: state.phase,
    endsAt: state.endsAt,
    roundsPlayed: state.roundsPlayed,
    role,
    yourVote: r?.votes[viewerId] ?? null,
    round:
      r && state.phase !== "lobby"
        ? {
            number: r.number,
            turnOrder: r.turnOrder,
            speakerId: currentSpeaker(state),
            lap: r.lap,
            clues: r.clues,
            readyIds: r.ready,
            votedIds: Object.keys(r.votes),
            revoteCandidates: r.revoteCandidates,
            midRoundGuess: r.midRoundGuess,
            reveal:
              over && r.outcome
                ? {
                    secret: cardOf(r.secretId),
                    impostorId: r.impostorId,
                    hint: r.hint,
                    votes: r.votes,
                    firstVotes: r.firstVotes,
                    guess: r.guessId ? cardOf(r.guessId) : null,
                    outcome: r.outcome,
                    points: r.points,
                  }
                : null,
          }
        : null,
  };
}
