"use client";

/** Per-browser conveniences. Wrapped in try/catch: storage can be unavailable (private mode). */

export interface Seat {
  token: string;
  playerId: string;
}

const KEY = "gti:seats";
const PROFILE = "gti:profile";

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* ignore */
  }
}

export function getSeat(code: string): Seat | null {
  return read<Record<string, Seat>>(KEY, {})[code] ?? null;
}

export function saveSeat(code: string, seat: Seat) {
  const all = read<Record<string, Seat>>(KEY, {});
  all[code] = seat;
  write(KEY, all);
}

export function clearSeat(code: string) {
  const all = read<Record<string, Seat>>(KEY, {});
  delete all[code];
  write(KEY, all);
}

export interface Profile {
  name: string;
  avatar: string;
}

export function getProfile(): Profile {
  return read<Profile>(PROFILE, { name: "", avatar: "🏏" });
}

export function saveProfile(p: Profile) {
  write(PROFILE, p);
}
