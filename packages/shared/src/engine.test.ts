import { describe, expect, it } from "vitest";
import { CRICKETERS, getCricketer } from "./data/players";
import {
  addPlayer,
  callGuess,
  castVote,
  createGame,
  currentSpeaker,
  GameError,
  markReady,
  nextRound,
  onTimeout,
  removePlayer,
  startMatch,
  submitClue,
  submitGuess,
  updateSettings,
  type Ctx,
} from "./engine";
import { chooseHint, eligibleHintTypes, MIN_HINT_MATCHES, countMatches, hintValue } from "./hints";
import { clueRevealsName, searchCricketers } from "./names";
import type { GameState } from "./types";
import { buildView } from "./view";

function seeded(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

function setup(n = 4, seed = 1) {
  const ctx: Ctx = { now: 1_000_000, rng: seeded(seed) };
  const g = createGame("ABCDEF", { id: "p1", name: "P1", avatar: "🏏" });
  for (let i = 2; i <= n; i++) addPlayer(g, { id: `p${i}`, name: `P${i}`, avatar: "🏏" });
  updateSettings(g, "p1", { laps: 1, discussionSeconds: 30 });
  startMatch(g, "p1", ctx);
  return { g, ctx };
}

function toClues(g: GameState, ctx: Ctx) {
  for (const p of g.players) markReady(g, p.id, ctx);
  expect(g.phase).toBe("clues");
}

function playClues(g: GameState, ctx: Ctx) {
  while (g.phase === "clues") submitClue(g, currentSpeaker(g)!, "", ctx);
}

function toVote(g: GameState, ctx: Ctx) {
  toClues(g, ctx);
  playClues(g, ctx);
  expect(g.phase).toBe("discussion");
  ctx.now = g.endsAt!;
  onTimeout(g, ctx);
  expect(g.phase).toBe("vote");
}

describe("player data", () => {
  it("has unique ids", () => {
    expect(new Set(CRICKETERS.map((c) => c.id)).size).toBe(CRICKETERS.length);
  });
  it("gives every bowler and all-rounder a bowling style", () => {
    for (const c of CRICKETERS) if (c.role === "bowler" || c.role === "allrounder") expect(c.bowlingStyle, c.id).toBeTruthy();
  });
  it("includes retired players", () => {
    expect(CRICKETERS.some((c) => c.era === "retired")).toBe(true);
  });
});

describe("hints", () => {
  it("only offers hints that match at least 3 players", () => {
    for (const c of CRICKETERS) {
      for (const t of eligibleHintTypes(c, CRICKETERS)) {
        expect(countMatches(CRICKETERS, t, hintValue(c, t)!)).toBeGreaterThanOrEqual(MIN_HINT_MATCHES);
      }
    }
  });
  it("skips the IPL hint for players who never played IPL", () => {
    const kapil = getCricketer("kapil-dev");
    expect(eligibleHintTypes(kapil, CRICKETERS)).not.toContain("iplTeam");
    expect(chooseHint(kapil, CRICKETERS, "iplTeam", seeded(3)).type).not.toBe("iplTeam");
  });
  it("respects a fixed hint mode when eligible", () => {
    const h = chooseHint(getCricketer("jasprit-bumrah"), CRICKETERS, "iplTeam", seeded(1));
    expect(h).toEqual({ type: "iplTeam", value: "Mumbai Indians" });
  });
});

describe("names", () => {
  const dhoni = getCricketer("ms-dhoni");
  it("blocks clues containing the name or aliases", () => {
    expect(clueRevealsName("dhoni finishes", dhoni)).toBe(true);
    expect(clueRevealsName("Thala for a reason", dhoni)).toBe(true);
    expect(clueRevealsName("helicopter shot", dhoni)).toBe(false);
  });
  it("finds players by alias and typo", () => {
    expect(searchCricketers(CRICKETERS, "hitman")[0]?.id).toBe("rohit-sharma");
    expect(searchCricketers(CRICKETERS, "bumra")[0]?.id).toBe("jasprit-bumrah");
  });
});

describe("round flow", () => {
  it("never makes the impostor speak first", () => {
    for (let seed = 1; seed < 40; seed++) {
      const { g } = setup(5, seed);
      expect(g.round!.turnOrder[0]).not.toBe(g.round!.impostorId);
    }
  });

  it("hides the secret from the impostor and the hint from crew", () => {
    const { g } = setup();
    const imp = g.round!.impostorId;
    const crew = g.players.find((p) => p.id !== imp)!.id;
    const iv = buildView(g, imp);
    const cv = buildView(g, crew);
    expect(iv.role.kind).toBe("impostor");
    expect(JSON.stringify(iv)).not.toContain(g.round!.secretId);
    expect(cv.role.kind).toBe("crew");
    expect(cv.round!.reveal).toBeNull();
  });

  it("rejects clues out of turn and clues with the name", () => {
    const { g, ctx } = setup();
    toClues(g, ctx);
    const speaker = currentSpeaker(g)!;
    const other = g.players.find((p) => p.id !== speaker)!.id;
    expect(() => submitClue(g, other, "hi", ctx)).toThrow(GameError);
    const name = getCricketer(g.round!.secretId).name;
    expect(() => submitClue(g, speaker, name, ctx)).toThrow(/gives the name away/);
    submitClue(g, speaker, "great fielder", ctx);
    expect(g.round!.clues).toHaveLength(1);
  });

  it("auto-advances the turn when the timer runs out", () => {
    const { g, ctx } = setup();
    toClues(g, ctx);
    const first = currentSpeaker(g);
    ctx.now = g.endsAt!;
    onTimeout(g, ctx);
    expect(currentSpeaker(g)).not.toBe(first);
    expect(g.round!.turnIndex).toBe(1);
  });

  it("crew catches the impostor and impostor guesses wrong", () => {
    const { g, ctx } = setup();
    toVote(g, ctx);
    const imp = g.round!.impostorId;
    const crew = g.players.filter((p) => p.id !== imp).map((p) => p.id);
    for (const id of crew) castVote(g, id, imp, ctx);
    castVote(g, imp, crew[0]!, ctx);
    expect(g.phase).toBe("guess");
    const wrong = CRICKETERS.find((c) => c.id !== g.round!.secretId)!.id;
    submitGuess(g, imp, wrong, ctx);
    expect(g.round!.outcome).toBe("caughtWrongGuess");
    for (const id of crew) expect(g.players.find((p) => p.id === id)!.score).toBe(3);
    expect(g.players.find((p) => p.id === imp)!.score).toBe(0);
  });

  it("caught impostor steals the round with a correct guess", () => {
    const { g, ctx } = setup();
    toVote(g, ctx);
    const imp = g.round!.impostorId;
    const crew = g.players.filter((p) => p.id !== imp).map((p) => p.id);
    for (const id of crew) castVote(g, id, imp, ctx);
    castVote(g, imp, crew[0]!, ctx);
    submitGuess(g, imp, g.round!.secretId, ctx);
    expect(g.round!.outcome).toBe("caughtRightGuess");
    expect(g.players.find((p) => p.id === imp)!.score).toBe(3);
  });

  it("tie goes to a revote, second tie lets the impostor escape", () => {
    const { g, ctx } = setup(4);
    toVote(g, ctx);
    const [a, b, c, d] = g.players.map((p) => p.id) as [string, string, string, string];
    castVote(g, a, b, ctx);
    castVote(g, b, a, ctx);
    castVote(g, c, a, ctx);
    castVote(g, d, b, ctx);
    expect(g.phase).toBe("revote");
    expect(g.round!.revoteCandidates!.sort()).toEqual([a, b].sort());
    castVote(g, a, b, ctx);
    castVote(g, b, a, ctx);
    castVote(g, c, a, ctx);
    castVote(g, d, b, ctx);
    expect(g.round!.outcome).toBe("escaped");
    expect(g.players.find((p) => p.id === g.round!.impostorId)!.score).toBe(3);
  });

  it("impostor can call 'I know it!' mid-round", () => {
    const { g, ctx } = setup();
    toClues(g, ctx);
    callGuess(g, g.round!.impostorId, ctx);
    expect(g.phase).toBe("guess");
    submitGuess(g, g.round!.impostorId, g.round!.secretId, ctx);
    expect(g.round!.outcome).toBe("midGuessRight");
    expect(g.players.find((p) => p.id === g.round!.impostorId)!.score).toBe(4);
  });

  it("voids the round if the impostor leaves", () => {
    const { g, ctx } = setup(4);
    toClues(g, ctx);
    removePlayer(g, g.round!.impostorId, ctx);
    expect(g.phase).toBe("result");
    expect(g.round!.outcome).toBe("void");
  });

  it("ends the match after the set number of rounds", () => {
    const { g, ctx } = setup(3);
    g.settings.rounds = 2;
    for (let i = 0; i < 2; i++) {
      toVote(g, ctx);
      ctx.now = g.endsAt!;
      onTimeout(g, ctx); // nobody votes -> escaped
      expect(g.phase).toBe("result");
      nextRound(g, "p1", ctx);
    }
    expect(g.phase).toBe("matchEnd");
    expect(g.roundsPlayed).toBe(2);
  });
});
