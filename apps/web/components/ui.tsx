"use client";

import { useEffect, useState } from "react";
import { HINT_LABELS, type CricketerCard, type Hint, type Seat } from "@gti/shared";
import { useGame } from "@/lib/store";

export const AVATARS = ["🏏", "🧢", "🧤", "🎯", "🔥", "⚡", "🦁", "🐯", "🦅", "🌟"];

/** Seconds left until the server's `endsAt`, corrected for clock offset. */
export function useSecondsLeft(endsAt: number | null): number | null {
  const offset = useGame((s) => s.clockOffset);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (endsAt === null) return;
    const t = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(t);
  }, [endsAt]);
  if (endsAt === null) return null;
  return Math.max(0, Math.ceil((endsAt - (now + offset)) / 1000));
}

export function Countdown({ endsAt, total, size = 72 }: { endsAt: number | null; total: number; size?: number }) {
  const left = useSecondsLeft(endsAt);
  if (left === null) return null;
  const r = size / 2 - 5;
  const c = 2 * Math.PI * r;
  const frac = total > 0 ? Math.min(1, left / total) : 0;
  const urgent = left <= 5;
  return (
    <div
      className={`relative shrink-0 ${urgent && left > 0 ? "shake" : ""}`}
      style={{ width: size, height: size }}
      aria-label={`${left} seconds left`}
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} stroke="rgba(243,239,227,0.12)" strokeWidth="6" fill="none" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={urgent ? "var(--color-leather)" : "var(--color-gold)"}
          strokeWidth="6"
          fill="none"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - frac)}
          style={{ transition: "stroke-dashoffset 0.25s linear" }}
        />
      </svg>
      <span className={`scoreboard absolute inset-0 grid place-items-center text-3xl ${urgent ? "text-leather" : "text-gold"}`}>
        {left}
      </span>
    </div>
  );
}

export function PlayerChip({
  seat,
  highlight,
  dim,
  badge,
}: {
  seat: Seat;
  highlight?: boolean;
  dim?: boolean;
  badge?: React.ReactNode;
}) {
  return (
    <div
      className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-sm ${
        highlight ? "bg-gold text-[#1a1404] font-bold" : "bg-white/8"
      } ${dim || !seat.connected ? "opacity-45" : ""}`}
    >
      <span className="text-lg leading-none">{seat.avatar}</span>
      <span className="truncate">{seat.name}</span>
      {badge}
    </div>
  );
}

export function Toast() {
  const toast = useGame((s) => s.toast);
  if (!toast) return null;
  return (
    <div className="pop fixed inset-x-4 bottom-6 z-50 mx-auto max-w-md rounded-xl bg-leather px-4 py-3 text-center font-medium text-white shadow-lg">
      {toast}
    </div>
  );
}

export function CricketerCardView({ card }: { card: CricketerCard }) {
  return (
    <div className="space-y-3">
      <p className="text-xs uppercase tracking-[0.2em] text-chalk-dim">Secret player</p>
      <p className="scoreboard text-5xl leading-none text-gold">{card.name}</p>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
        <Fact k="Country" v={card.country} />
        <Fact k="Profile" v={card.profile} />
        <Fact k="Last IPL team" v={card.lastIplTeam ?? "Never played IPL"} />
        <Fact k="Status" v={card.era === "retired" ? "Retired" : "Current"} />
      </dl>
    </div>
  );
}

export function HintCardView({ hint }: { hint: Hint }) {
  return (
    <div className="space-y-3">
      <p className="scoreboard text-5xl leading-none text-leather">You are the impostor</p>
      <p className="text-sm text-chalk-dim">You don&apos;t know the player. Your only clue:</p>
      <div className="rounded-xl bg-black/25 p-4">
        <p className="text-xs uppercase tracking-[0.2em] text-chalk-dim">{HINT_LABELS[hint.type]}</p>
        <p className="mt-1 text-2xl font-bold">{hint.value}</p>
      </div>
      <p className="text-sm text-chalk-dim">Blend in. Listen to the clues and work out who it is.</p>
    </div>
  );
}

function Fact({ k, v }: { k: string; v: string }) {
  return (
    <div>
      <dt className="text-xs text-chalk-dim">{k}</dt>
      <dd className="font-medium">{v}</dd>
    </div>
  );
}
