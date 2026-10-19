/** Socket.IO event contracts shared by server and web client. */
import type { Settings } from "./types";
import type { RoomView } from "./view";

export type Ack<T = object> = (res: ({ ok: true } & T) | { ok: false; code: string; error: string }) => void;

export interface JoinResult {
  code: string;
  playerId: string;
  /** Keep this to rejoin the same seat after a refresh. */
  token: string;
}

export interface ClientToServerEvents {
  "room:create": (p: { name: string; avatar: string }, ack: Ack<JoinResult>) => void;
  "room:join": (p: { code: string; name: string; avatar: string }, ack: Ack<JoinResult>) => void;
  "room:resume": (p: { code: string; token: string }, ack: Ack<JoinResult>) => void;
  "room:leave": (ack: Ack) => void;
  "room:kick": (p: { playerId: string }, ack: Ack) => void;
  "room:settings": (p: Partial<Settings>, ack: Ack) => void;
  "match:start": (ack: Ack) => void;
  "round:ready": (ack: Ack) => void;
  "clue:submit": (p: { text: string }, ack: Ack) => void;
  "discussion:skip": (ack: Ack) => void;
  "vote:cast": (p: { targetId: string }, ack: Ack) => void;
  "guess:call": (ack: Ack) => void;
  "guess:submit": (p: { cricketerId: string }, ack: Ack) => void;
  "round:next": (ack: Ack) => void;
  "match:lobby": (ack: Ack) => void;
  "time:sync": (ack: (serverNow: number) => void) => void;
}

export interface ServerToClientEvents {
  "room:state": (view: RoomView) => void;
  "room:kicked": () => void;
}
