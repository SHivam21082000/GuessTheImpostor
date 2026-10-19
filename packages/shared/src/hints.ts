import type { Cricketer, Hint, HintType } from "./types";

/** A hint must fit at least this many players in the active pool, so it never gives the answer away. */
export const MIN_HINT_MATCHES = 3;

const HINT_TYPES: HintType[] = ["country", "profile", "iplTeam"];

function bowlingFamily(style: string): "pace" | "offSpin" | "legSpin" | "leftSpin" {
  const s = style.toLowerCase();
  if (s.includes("off-spin")) return "offSpin";
  if (s.includes("leg-spin") || (s.includes("wrist-spin") && s.startsWith("right"))) return "legSpin";
  if (s.includes("orthodox") || s.includes("wrist-spin")) return "leftSpin";
  return "pace";
}

/**
 * Coarse playing profile, e.g. "Left-handed batter", "Right-arm pace bowler",
 * "Spin-bowling all-rounder". Kept deliberately broad so many players share it.
 */
export function profileOf(c: Cricketer): string {
  switch (c.role) {
    case "wicketkeeper":
      return "Wicketkeeper-batter";
    case "batter":
      return `${c.battingHand === "left" ? "Left" : "Right"}-handed batter`;
    case "allrounder": {
      const fam = c.bowlingStyle ? bowlingFamily(c.bowlingStyle) : "pace";
      return fam === "pace" ? "Pace-bowling all-rounder" : "Spin-bowling all-rounder";
    }
    case "bowler": {
      const style = c.bowlingStyle ?? "right-arm fast";
      const fam = bowlingFamily(style);
      if (fam === "pace") return style.startsWith("left") ? "Left-arm pace bowler" : "Right-arm pace bowler";
      if (fam === "offSpin") return "Off-spinner";
      if (fam === "legSpin") return "Leg-spinner";
      return "Left-arm spinner";
    }
  }
}

export function hintValue(c: Cricketer, type: HintType): string | null {
  switch (type) {
    case "country":
      return c.country;
    case "profile":
      return profileOf(c);
    case "iplTeam":
      return c.lastIplTeam;
  }
}

export function countMatches(pool: Cricketer[], type: HintType, value: string): number {
  return pool.filter((c) => hintValue(c, type) === value).length;
}

/** Hint types that are safe to give for this secret player within this pool. */
export function eligibleHintTypes(secret: Cricketer, pool: Cricketer[]): HintType[] {
  return HINT_TYPES.filter((t) => {
    const v = hintValue(secret, t);
    return v !== null && countMatches(pool, t, v) >= MIN_HINT_MATCHES;
  });
}

/**
 * Pick the impostor's hint. Uses the host's fixed type when it is still eligible,
 * otherwise a random eligible type, falling back to country.
 */
export function chooseHint(
  secret: Cricketer,
  pool: Cricketer[],
  mode: "random" | HintType,
  rng: () => number,
): Hint {
  const eligible = eligibleHintTypes(secret, pool);
  let type: HintType;
  if (mode !== "random" && eligible.includes(mode)) type = mode;
  else if (eligible.length > 0) type = eligible[Math.floor(rng() * eligible.length)]!;
  else type = "country";
  return { type, value: hintValue(secret, type) ?? secret.country };
}
