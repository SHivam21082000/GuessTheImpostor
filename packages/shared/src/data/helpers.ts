import type { Cricketer, Era, Hand, PlayingRole } from "../types";

// IPL franchise names (current names for renamed franchises).
export const IPL = {
  CSK: "Chennai Super Kings",
  MI: "Mumbai Indians",
  RCB: "Royal Challengers Bengaluru",
  KKR: "Kolkata Knight Riders",
  DC: "Delhi Capitals",
  PBKS: "Punjab Kings",
  RR: "Rajasthan Royals",
  SRH: "Sunrisers Hyderabad",
  GT: "Gujarat Titans",
  LSG: "Lucknow Super Giants",
  DECCAN: "Deccan Chargers",
  PUNE: "Pune Warriors",
  RPS: "Rising Pune Supergiant",
  GL: "Gujarat Lions",
} as const;

export function p(
  id: string,
  name: string,
  aliases: string[],
  country: string,
  role: PlayingRole,
  battingHand: Hand,
  bowlingStyle: string | null,
  lastIplTeam: string | null,
  era: Era,
  popularity: number,
): Cricketer {
  return { id, name, aliases, country, role, battingHand, bowlingStyle, lastIplTeam, era, popularity };
}

export const R = "right";
export const L = "left";

