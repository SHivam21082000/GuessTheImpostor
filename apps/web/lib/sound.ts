"use client";

/**
 * Sound effects synthesized with the Web Audio API: no audio files to load or license.
 * Browsers only allow audio after a user gesture, so the context is created lazily
 * and resumed on the first tap (see unlockAudio).
 */

const MUTE_KEY = "gti:muted";

let ctx: AudioContext | null = null;
let muted = readMuted();
const listeners = new Set<(m: boolean) => void>();

function readMuted(): boolean {
  try {
    return typeof localStorage !== "undefined" && localStorage.getItem(MUTE_KEY) === "1";
  } catch {
    return false;
  }
}

export function isMuted() {
  return muted;
}

export function setMuted(m: boolean) {
  muted = m;
  try {
    localStorage.setItem(MUTE_KEY, m ? "1" : "0");
  } catch {
    /* ignore */
  }
  listeners.forEach((l) => l(m));
}

export function onMuteChange(l: (m: boolean) => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

function audio(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  return ctx;
}

/** Call once from a pointer handler so later sounds are allowed to play. */
export function unlockAudio() {
  const a = audio();
  if (a && a.state === "suspended") void a.resume();
}

interface ToneOpts {
  freq: number;
  to?: number;
  dur: number;
  type?: OscillatorType;
  gain?: number;
  delay?: number;
}

function tone({ freq, to, dur, type = "sine", gain = 0.18, delay = 0 }: ToneOpts) {
  const a = audio();
  if (!a || muted) return;
  const t = a.currentTime + delay;
  const osc = a.createOscillator();
  const g = a.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  if (to) osc.frequency.exponentialRampToValueAtTime(to, t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain, t + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(g).connect(a.destination);
  osc.start(t);
  osc.stop(t + dur + 0.02);
}

/** Short filtered noise burst: bat on ball, stumps, crowd. */
interface NoiseOpts {
  dur: number;
  freq?: number;
  q?: number;
  gain?: number;
  delay?: number;
  type?: BiquadFilterType;
}

function noise({ dur, freq = 1200, q = 1, gain = 0.25, delay = 0, type = "bandpass" }: NoiseOpts) {
  const a = audio();
  if (!a || muted) return;
  const t = a.currentTime + delay;
  const len = Math.max(1, Math.floor(a.sampleRate * dur));
  const buf = a.createBuffer(1, len, a.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len) ** 2;
  const src = a.createBufferSource();
  src.buffer = buf;
  const f = a.createBiquadFilter();
  f.type = type;
  f.frequency.value = freq;
  f.Q.value = q;
  const g = a.createGain();
  g.gain.value = gain;
  src.connect(f).connect(g).connect(a.destination);
  src.start(t);
}

export const sfx = {
  /** Someone joined the lobby. */
  join() {
    tone({ freq: 660, dur: 0.09, type: "triangle" });
    tone({ freq: 990, dur: 0.12, type: "triangle", delay: 0.07 });
  },
  /** Generic button tap. */
  tap() {
    tone({ freq: 520, dur: 0.05, type: "triangle", gain: 0.08 });
  },
  /** Card flipped over. */
  flip() {
    noise({ dur: 0.12, freq: 2600, q: 0.8, gain: 0.12 });
  },
  /** Bat-on-ball "tock": round starts, clue sent. */
  bat() {
    noise({ dur: 0.07, freq: 1800, q: 3, gain: 0.35 });
    tone({ freq: 220, to: 140, dur: 0.12, type: "sine", gain: 0.2 });
  },
  /** A new clue landed on the board. */
  clue() {
    tone({ freq: 880, dur: 0.08, type: "sine", gain: 0.12 });
  },
  /** It's your turn: two bright chimes. */
  yourTurn() {
    tone({ freq: 784, dur: 0.18, type: "triangle", gain: 0.22 });
    tone({ freq: 1175, dur: 0.28, type: "triangle", gain: 0.22, delay: 0.14 });
  },
  /** Last seconds of a timer. */
  tick(urgent = false) {
    tone({ freq: urgent ? 1400 : 1000, dur: 0.04, type: "square", gain: 0.05 });
  },
  /** Umpire's whistle: phase change (discussion / vote). */
  whistle() {
    tone({ freq: 2100, to: 2300, dur: 0.22, type: "sine", gain: 0.12 });
    tone({ freq: 2100, to: 2400, dur: 0.3, type: "sine", gain: 0.12, delay: 0.26 });
  },
  vote() {
    tone({ freq: 440, dur: 0.06, type: "triangle", gain: 0.12 });
    tone({ freq: 660, dur: 0.08, type: "triangle", gain: 0.12, delay: 0.05 });
  },
  /** Stumps shattered: impostor caught. */
  bowled() {
    noise({ dur: 0.08, freq: 2400, q: 4, gain: 0.4 });
    noise({ dur: 0.25, freq: 900, q: 1.2, gain: 0.3, delay: 0.05 });
    tone({ freq: 3200, dur: 0.05, type: "square", gain: 0.05, delay: 0.12 });
    tone({ freq: 2700, dur: 0.05, type: "square", gain: 0.05, delay: 0.2 });
    sfx.crowd(0.25);
  },
  /** Crowd roar. */
  crowd(delay = 0) {
    noise({ dur: 1.6, freq: 700, q: 0.5, gain: 0.22, delay, type: "lowpass" });
  },
  /** Impostor got away: sad descending tones. */
  escaped() {
    [392, 370, 349, 294].forEach((f, i) => tone({ freq: f, dur: 0.32, type: "sawtooth", gain: 0.07, delay: i * 0.28 }));
  },
  /** Impostor guessed right: sly rising riff. */
  steal() {
    [330, 392, 494, 659].forEach((f, i) => tone({ freq: f, dur: 0.16, type: "square", gain: 0.06, delay: i * 0.1 }));
  },
  /** Match winner fanfare. */
  fanfare() {
    const notes = [523, 659, 784, 1047, 784, 1047];
    notes.forEach((f, i) => tone({ freq: f, dur: i === notes.length - 1 ? 0.6 : 0.16, type: "triangle", gain: 0.2, delay: i * 0.14 }));
    sfx.crowd(0.5);
  },
  error() {
    tone({ freq: 220, dur: 0.15, type: "square", gain: 0.06 });
  },
};

export function vibrate(pattern: number | number[]) {
  if (muted) return;
  try {
    navigator.vibrate?.(pattern);
  } catch {
    /* unsupported */
  }
}
