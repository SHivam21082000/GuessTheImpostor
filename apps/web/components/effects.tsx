"use client";

import { useEffect, useRef, useState } from "react";
import type { RoomView } from "@gti/shared";
import { isMuted, onMuteChange, setMuted, sfx, unlockAudio, vibrate } from "@/lib/sound";
import { useSecondsLeft } from "./ui";

/** Plays sounds and vibrations when the game state changes. Renders nothing. */
export function useGameEffects(view: RoomView) {
  const prev = useRef<RoomView | null>(null);

  useEffect(() => {
    const p = prev.current;
    prev.current = view;
    if (!p) return;

    // Lobby joins
    if (view.phase === "lobby" && view.players.length > p.players.length) sfx.join();

    // Phase changes
    if (view.phase !== p.phase) {
      switch (view.phase) {
        case "reveal":
          sfx.bat();
          break;
        case "clues":
        case "discussion":
        case "vote":
        case "revote":
          sfx.whistle();
          break;
        case "guess":
          if (view.round?.midRoundGuess) sfx.steal();
          else sfx.bowled();
          if (view.role.kind === "impostor") vibrate([200, 80, 200]);
          break;
        case "result": {
          const o = view.round?.reveal?.outcome;
          if (o === "caughtWrongGuess" || o === "midGuessWrong") sfx.crowd();
          else if (o === "caughtRightGuess" || o === "midGuessRight") sfx.steal();
          else if (o === "escaped") sfx.escaped();
          break;
        }
        case "matchEnd":
          sfx.fanfare();
          vibrate([100, 50, 100, 50, 300]);
          break;
      }
    }

    // Your turn
    const speaker = view.round?.speakerId;
    if (view.phase === "clues" && speaker === view.you && (p.round?.speakerId !== speaker || p.phase !== "clues")) {
      // Small delay so the chime isn't swallowed by the whistle on the first turn.
      setTimeout(() => sfx.yourTurn(), p.phase !== "clues" ? 450 : 0);
      vibrate([120, 60, 120]);
    }

    // New clue on the board (from someone else)
    const n = view.round?.clues.length ?? 0;
    const pn = p.round?.clues.length ?? 0;
    if (n > pn && view.round?.clues[n - 1]?.playerId !== view.you) sfx.clue();
  }, [view]);

  // Ticks in the last 5 seconds when the clock matters to you.
  const left = useSecondsLeft(view.endsAt);
  const lastTick = useRef<number | null>(null);
  const caresAboutClock =
    (view.phase === "clues" && view.round?.speakerId === view.you) ||
    view.phase === "vote" ||
    view.phase === "revote" ||
    (view.phase === "guess" && view.role.kind === "impostor");
  useEffect(() => {
    if (left === null || !caresAboutClock) return;
    if (left > 0 && left <= 5 && lastTick.current !== left) sfx.tick(left <= 2);
    lastTick.current = left;
  }, [left, caresAboutClock]);
}

/** Unlocks audio on the first tap anywhere (browsers block autoplay). */
export function useAudioUnlock() {
  useEffect(() => {
    const h = () => unlockAudio();
    window.addEventListener("pointerdown", h, { passive: true });
    window.addEventListener("keydown", h);
    return () => {
      window.removeEventListener("pointerdown", h);
      window.removeEventListener("keydown", h);
    };
  }, []);
}

export function MuteButton() {
  const [muted, setM] = useState(false);
  useEffect(() => {
    setM(isMuted());
    const off = onMuteChange(setM);
    return () => {
      off();
    };
  }, []);
  return (
    <button
      className="grid h-9 w-9 place-items-center rounded-full bg-white/8 text-base"
      aria-label={muted ? "Turn sound on" : "Mute sound"}
      aria-pressed={muted}
      onClick={() => {
        setMuted(!muted);
        if (muted) setTimeout(() => sfx.tap(), 0);
      }}
    >
      {muted ? "🔇" : "🔊"}
    </button>
  );
}

/**
 * Three stumps and two bails. With `knocked`, a ball flies in, the stumps
 * scatter and the bails fly off.
 */
export function Stumps({ knocked }: { knocked: boolean }) {
  return (
    <div className={`stumps mx-auto ${knocked ? "is-knocked" : ""}`} aria-hidden>
      <svg viewBox="0 0 160 120" width="160" height="120" style={{ overflow: "visible" }}>
        <ellipse cx="80" cy="112" rx="60" ry="5" fill="rgba(0,0,0,0.25)" />
        <g className="stump s1">
          <rect x="54" y="30" width="8" height="82" rx="3" fill="#f3efe3" />
        </g>
        <g className="stump s2">
          <rect x="76" y="30" width="8" height="82" rx="3" fill="#f3efe3" />
        </g>
        <g className="stump s3">
          <rect x="98" y="30" width="8" height="82" rx="3" fill="#f3efe3" />
        </g>
        <rect className="bail b1" x="56" y="24" width="26" height="5" rx="2.5" fill="#f2c14e" />
        <rect className="bail b2" x="80" y="24" width="26" height="5" rx="2.5" fill="#f2c14e" />
        <circle className="ball" cx="80" cy="80" r="8" fill="#d43d3d" />
      </svg>
    </div>
  );
}

const CONFETTI_COLORS = ["#f2c14e", "#d43d3d", "#f3efe3", "#3fa36b", "#7cc4ff"];

/** CSS-only confetti burst; positions are deterministic so render is stable. */
export function Confetti({ count = 48 }: { count?: number }) {
  return (
    <div className="confetti" aria-hidden>
      {Array.from({ length: count }, (_, i) => {
        const left = (i * 37) % 100;
        const delay = ((i * 53) % 100) / 70;
        const dur = 2.4 + ((i * 29) % 100) / 60;
        const rot = (i * 71) % 360;
        return (
          <span
            key={i}
            style={{
              left: `${left}%`,
              background: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
              animationDelay: `${delay}s`,
              animationDuration: `${dur}s`,
              transform: `rotate(${rot}deg)`,
              width: i % 3 === 0 ? 6 : 9,
              height: i % 3 === 0 ? 12 : 6,
            }}
          />
        );
      })}
    </div>
  );
}
