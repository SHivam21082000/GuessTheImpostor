import { randomBytes, randomUUID } from "node:crypto";
import { createGame, type GameState } from "@gti/shared";

/** Live room held in memory. TASKS.md T2.8 moves this to Redis for multi-instance hosting. */
export interface Room {
  state: GameState;
  /** session token -> player id */
  tokens: Map<string, string>;
  /** player id -> socket id */
  sockets: Map<string, string>;
  timer: NodeJS.Timeout | null;
  lastActive: number;
}

// No 0/O/1/I/L to avoid mix-ups when read aloud.
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

export class RoomStore {
  private rooms = new Map<string, Room>();

  newCode(): string {
    for (;;) {
      const bytes = randomBytes(6);
      const code = [...bytes].map((b) => ALPHABET[b % ALPHABET.length]).join("");
      if (!this.rooms.has(code)) return code;
    }
  }

  create(host: { name: string; avatar: string }): { room: Room; playerId: string; token: string } {
    const code = this.newCode();
    const playerId = randomUUID();
    const token = randomUUID();
    const room: Room = {
      state: createGame(code, { id: playerId, name: host.name.trim().slice(0, 16) || "Host", avatar: host.avatar }),
      tokens: new Map([[token, playerId]]),
      sockets: new Map(),
      timer: null,
      lastActive: Date.now(),
    };
    this.rooms.set(code, room);
    return { room, playerId, token };
  }

  get(code: string): Room | undefined {
    return this.rooms.get(code.toUpperCase().trim());
  }

  delete(code: string) {
    const r = this.rooms.get(code);
    if (r?.timer) clearTimeout(r.timer);
    this.rooms.delete(code);
  }

  /** Drop rooms with no activity for `idleMs`. Returns removed codes. */
  sweep(idleMs: number, now = Date.now()): string[] {
    const removed: string[] = [];
    for (const [code, r] of this.rooms) {
      if (now - r.lastActive > idleMs) {
        this.delete(code);
        removed.push(code);
      }
    }
    return removed;
  }

  get size() {
    return this.rooms.size;
  }
}
