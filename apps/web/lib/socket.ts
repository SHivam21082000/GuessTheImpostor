"use client";

import { io, type Socket } from "socket.io-client";
import type { ClientToServerEvents, ServerToClientEvents } from "@gti/shared";

export type GameSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

let socket: GameSocket | null = null;

export function serverUrl(): string {
  if (process.env.NEXT_PUBLIC_SERVER_URL) return process.env.NEXT_PUBLIC_SERVER_URL;
  // Dev default: game server on port 4000 of whatever host served this page,
  // so phones on the same Wi-Fi can play through the laptop's IP.
  return `${window.location.protocol}//${window.location.hostname}:4000`;
}

export function getSocket(): GameSocket {
  if (!socket) socket = io(serverUrl(), { transports: ["websocket", "polling"] });
  return socket;
}

type AckResult<T> = ({ ok: true } & T) | { ok: false; code: string; error: string };

/** Emit an event and resolve with its ack. */
export function send<T = object>(event: keyof ClientToServerEvents, payload?: unknown): Promise<AckResult<T>> {
  const s = getSocket() as unknown as { emit: (...a: unknown[]) => void };
  return new Promise((resolve) => {
    if (payload === undefined) s.emit(event, resolve);
    else s.emit(event, payload, resolve);
  });
}
