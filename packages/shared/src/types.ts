// ---------- Cricketers ----------

export type PlayingRole = "batter" | "bowler" | "allrounder" | "wicketkeeper";
export type Hand = "left" | "right";
/** International status. Women's cricket is out of scope. */
export type Era = "current" | "retired";

export interface Cricketer {
  id: string;
  name: string;
  aliases: string[];
  country: string;
  role: PlayingRole;
  battingHand: Hand;
  /** e.g. "right-arm fast", "slow left-arm orthodox"; null for non-bowlers. */
  bowlingStyle: string | null;
  /**
   * Last IPL franchise the player appeared for, using the franchise's current name
   * (Delhi Daredevils -> Delhi Capitals, Kings XI Punjab -> Punjab Kings).
   * Defunct franchises (Deccan Chargers, Pune Warriors...) keep their own name.
   * null = never played IPL.
   */
  lastIplTeam: string | null;
  era: Era;
  /** 1 (deep cut) .. 5 (household name). */
  popularity: number;
}

// ---------- Hints ----------

export type HintType = "country" | "profile" | "iplTeam";

export interface Hint {
  type: HintType;
  value: string;
}

export const HINT_LABELS: Record<HintType, string> = {
  country: "Country",
  profile: "Player profile",
  iplTeam: "Last IPL team",
};

// ---------- Room / match ----------

export type Phase =
  | "lobby"
  | "reveal"
  | "clues"
  | "discussion"
  | "vote"
  | "revote"
  | "guess"
  | "result"
  | "matchEnd";

export interface Settings {
  turnSeconds: number; // 15 | 30 | 45 | 60
  laps: number; // 1..3
  rounds: number; // 3..10
  revealSeconds: number;
  discussionSeconds: number;
  voteSeconds: number;
  guessSeconds: number;
  hintMode: "random" | HintType;
  eraFilter: "all" | Era;
}

export const DEFAULT_SETTINGS: Settings = {
  turnSeconds: 30,
  laps: 2,
  rounds: 5,
  revealSeconds: 15,
  discussionSeconds: 60,
  voteSeconds: 20,
  guessSeconds: 30,
  hintMode: "random",
  eraFilter: "all",
};

export const MIN_PLAYERS = 3;
export const MAX_PLAYERS = 10;

export interface Seat {
  id: string;
  name: string;
  avatar: string;
  score: number;
  connected: boolean;
}

export interface Clue {
  playerId: string;
  text: string;
  lap: number;
}

export type RoundOutcome =
  | "caughtWrongGuess" // impostor voted out, failed final guess
  | "caughtRightGuess" // impostor voted out, guessed the player
  | "escaped" // vote missed the impostor
  | "midGuessRight" // impostor called "I know it!" and was right
  | "midGuessWrong" // impostor called "I know it!" and was wrong
  | "void"; // impostor left the room

export interface Round {
  number: number;
  secretId: string;
  impostorId: string;
  hint: Hint;
  turnOrder: string[];
  turnIndex: number;
  lap: number;
  clues: Clue[];
  ready: string[];
  votes: Record<string, string>;
  /** Votes from the first ballot when a revote happened. */
  firstVotes: Record<string, string> | null;
  revoteCandidates: string[] | null;
  /** true when the impostor pressed "I know it!" mid-round. */
  midRoundGuess: boolean;
  guessId: string | null;
  outcome: RoundOutcome | null;
  points: Record<string, number>;
}

export interface GameState {
  code: string;
  hostId: string;
  players: Seat[];
  settings: Settings;
  phase: Phase;
  /** Epoch ms when the current phase / turn times out. null = no timer. */
  endsAt: number | null;
  round: Round | null;
  roundsPlayed: number;
  /** Recently used cricketer ids, newest last; avoids repeats. */
  recent: string[];
}
