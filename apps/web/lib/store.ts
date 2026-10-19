"use client";

import { create } from "zustand";
import type { RoomView } from "@gti/shared";

interface GameStore {
  view: RoomView | null;
  /** serverNow - clientNow, measured on connect. */
  clockOffset: number;
  connected: boolean;
  toast: string | null;
  setView: (v: RoomView | null) => void;
  setOffset: (o: number) => void;
  setConnected: (c: boolean) => void;
  showToast: (msg: string) => void;
}

let toastTimer: ReturnType<typeof setTimeout> | undefined;

export const useGame = create<GameStore>((set) => ({
  view: null,
  clockOffset: 0,
  connected: false,
  toast: null,
  setView: (view) => set({ view }),
  setOffset: (clockOffset) => set({ clockOffset }),
  setConnected: (connected) => set({ connected }),
  showToast: (toast) => {
    clearTimeout(toastTimer);
    set({ toast });
    toastTimer = setTimeout(() => set({ toast: null }), 3200);
  },
}));
