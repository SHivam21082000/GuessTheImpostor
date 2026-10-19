"use client";

import { useMemo, useState } from "react";
import {
  HINT_LABELS,
  poolFor,
  searchCricketers,
  type RoomView,
  type RoundOutcome,
  type Seat,
  type Settings,
} from "@gti/shared";
import { send } from "@/lib/socket";
import { useGame } from "@/lib/store";
import { sfx } from "@/lib/sound";
import { CricketerCardView, Countdown, HintCardView, PlayerChip } from "./ui";
import { Confetti, MuteButton, Stumps, useGameEffects } from "./effects";

/** Send an action; show the server's error as a toast. */
async function act(event: Parameters<typeof send>[0], payload?: unknown) {
  const res = await send(event, payload);
  if (!res.ok) {
    sfx.error();
    useGame.getState().showToast(res.error);
  }
  return res.ok;
}

const nameOf = (v: RoomView, id: string | null | undefined) => v.players.find((p) => p.id === id)?.name ?? "Someone";
const seatOf = (v: RoomView, id: string) => v.players.find((p) => p.id === id);

export function GameScreen({ view }: { view: RoomView }) {
  useGameEffects(view);
  // Re-key per phase (and per revote) so each screen animates in.
  const screenKey = `${view.phase}-${view.round?.number ?? 0}`;
  return (
    <div className="space-y-5">
      <TopBar view={view} />
      <div key={screenKey} className="phase-in">
        {view.phase === "lobby" && <Lobby view={view} />}
        {view.phase === "reveal" && <Reveal view={view} />}
        {view.phase === "clues" && <Clues view={view} />}
        {view.phase === "discussion" && <Discussion view={view} />}
        {(view.phase === "vote" || view.phase === "revote") && <Vote view={view} />}
        {view.phase === "guess" && <Guess view={view} />}
        {view.phase === "result" && <Result view={view} />}
        {view.phase === "matchEnd" && <MatchEnd view={view} />}
      </div>
    </div>
  );
}

function TopBar({ view }: { view: RoomView }) {
  const inMatch = view.phase !== "lobby";
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <span className="scoreboard text-xl tracking-[0.2em] text-chalk-dim">{view.code}</span>
      <span className="flex items-center gap-3">
        {inMatch && view.round && (
          <span className="scoreboard text-xl text-chalk-dim">
            Round {view.round.number}/{view.settings.rounds}
          </span>
        )}
        <MuteButton />
      </span>
    </div>
  );
}

// ---------------- Lobby ----------------

function Lobby({ view }: { view: RoomView }) {
  const isHost = view.hostId === view.you;
  const link = typeof window !== "undefined" ? `${window.location.origin}/room/${view.code}` : "";
  const enough = view.players.filter((p) => p.connected).length >= 3;

  async function share() {
    const text = `Join my Guess the Impostor (cricket) game! Room code ${view.code}: ${link}`;
    try {
      if (navigator.share) await navigator.share({ text });
      else {
        await navigator.clipboard.writeText(link);
        useGame.getState().showToast("Link copied");
      }
    } catch {
      /* cancelled */
    }
  }

  return (
    <div className="space-y-5">
      <section className="card p-5 text-center">
        <p className="text-xs uppercase tracking-[0.25em] text-chalk-dim">Room code</p>
        <p className="scoreboard my-1 text-6xl tracking-[0.2em] text-gold">{view.code}</p>
        <p className="text-sm text-chalk-dim">Same room? Everyone opens this site and enters the code.</p>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <button className="btn btn-ghost" onClick={share}>
            Share link
          </button>
          <a
            className="btn btn-ghost"
            href={`https://wa.me/?text=${encodeURIComponent(`Join my Guess the Impostor game: ${link}`)}`}
            target="_blank"
            rel="noreferrer"
          >
            WhatsApp
          </a>
        </div>
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-medium text-chalk-dim">
          Players {view.players.length}/10
        </h2>
        <ul className="space-y-2">
          {view.players.map((p) => (
            <li key={p.id} className="card slide-in flex items-center justify-between px-4 py-3">
              <span className="flex items-center gap-3">
                <span className="text-2xl">{p.avatar}</span>
                <span className={p.connected ? "" : "opacity-50"}>
                  {p.name}
                  {p.id === view.you && <span className="text-chalk-dim"> (you)</span>}
                </span>
                {p.id === view.hostId && <span className="rounded bg-gold/20 px-1.5 py-0.5 text-xs text-gold">HOST</span>}
              </span>
              {isHost && p.id !== view.you && (
                <button className="text-xs text-leather" onClick={() => act("room:kick", { playerId: p.id })}>
                  Remove
                </button>
              )}
            </li>
          ))}
        </ul>
      </section>

      {isHost ? <SettingsPanel settings={view.settings} /> : <SettingsSummary settings={view.settings} />}

      {isHost ? (
        <button className="btn btn-primary w-full text-lg" disabled={!enough} onClick={() => act("match:start")}>
          {enough ? "Start match" : "Need at least 3 players"}
        </button>
      ) : (
        <p className="text-center text-sm text-chalk-dim">Waiting for {nameOf(view, view.hostId)} to start…</p>
      )}
      <button className="w-full text-center text-sm text-chalk-dim underline" onClick={() => act("room:leave").then(() => (window.location.href = "/"))}>
        Leave room
      </button>
    </div>
  );
}

function SettingsPanel({ settings }: { settings: Settings }) {
  const set = (patch: Partial<Settings>) => act("room:settings", patch);
  return (
    <section className="card space-y-3 p-5">
      <h2 className="font-medium">Match settings</h2>
      <Select label="Turn time" value={settings.turnSeconds} options={[15, 30, 45, 60].map((n) => [n, `${n}s`])} onChange={(v) => set({ turnSeconds: Number(v) })} />
      <Select label="Clue laps" value={settings.laps} options={[1, 2, 3].map((n) => [n, String(n)])} onChange={(v) => set({ laps: Number(v) })} />
      <Select label="Rounds" value={settings.rounds} options={[3, 5, 7, 10].map((n) => [n, String(n)])} onChange={(v) => set({ rounds: Number(v) })} />
      <Select
        label="Discussion"
        value={settings.discussionSeconds}
        options={[0, 30, 60, 90, 120].map((n) => [n, n === 0 ? "Skip" : `${n}s`])}
        onChange={(v) => set({ discussionSeconds: Number(v) })}
      />
      <Select
        label="Impostor hint"
        value={settings.hintMode}
        options={[
          ["random", "Random"],
          ["country", HINT_LABELS.country],
          ["profile", HINT_LABELS.profile],
          ["iplTeam", HINT_LABELS.iplTeam],
        ]}
        onChange={(v) => set({ hintMode: v as Settings["hintMode"] })}
      />
      <Select
        label="Difficulty"
        value={settings.difficulty}
        options={[
          ["easy", "Easy: household names"],
          ["mixed", "Mixed: everyone"],
          ["hard", "Hard: deep cuts"],
        ]}
        onChange={(v) => set({ difficulty: v as Settings["difficulty"] })}
      />
      <Select
        label="Players"
        value={settings.eraFilter}
        options={[
          ["all", "Current + retired"],
          ["current", "Current only"],
          ["retired", "Retired legends only"],
        ]}
        onChange={(v) => set({ eraFilter: v as Settings["eraFilter"] })}
      />
    </section>
  );
}

function Select({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string | number;
  options: [string | number, string][];
  onChange: (v: string) => void;
}) {
  return (
    <label className="flex items-center justify-between gap-3 text-sm">
      <span className="whitespace-nowrap text-chalk-dim">{label}</span>
      <select className="input w-auto py-2" value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map(([v, l]) => (
          <option key={v} value={v}>
            {l}
          </option>
        ))}
      </select>
    </label>
  );
}

function SettingsSummary({ settings: s }: { settings: Settings }) {
  return (
    <p className="text-center text-xs text-chalk-dim">
      {s.rounds} rounds · {s.difficulty} · {s.laps} lap{s.laps > 1 ? "s" : ""} · {s.turnSeconds}s turns · hint:{" "}
      {s.hintMode === "random" ? "random" : HINT_LABELS[s.hintMode].toLowerCase()}
    </p>
  );
}

// ---------------- Secret card ----------------

/** Tap-to-reveal card so nobody can read your screen by accident. */
function SecretCard({ view, startOpen = false, allowGuess = false }: { view: RoomView; startOpen?: boolean; allowGuess?: boolean }) {
  const [open, setOpen] = useState(startOpen);
  const role = view.role;
  const toggle = (o: boolean) => {
    sfx.flip();
    setOpen(o);
  };
  return (
    <div className={`flip ${open ? "is-open" : ""}`}>
      <div className="flip-inner">
        {/* Front: face-down card */}
        <button
          className="flip-face card flex w-full flex-col items-center justify-center gap-2 p-8"
          onClick={() => toggle(true)}
          tabIndex={open ? -1 : 0}
          aria-hidden={open}
        >
          <span className="text-4xl">🏏</span>
          <span className="scoreboard text-3xl">Tap to see your card</span>
          <span className="text-xs text-chalk-dim">Keep your screen hidden from others</span>
        </button>
        {/* Back: your role. Content only mounts while open so it can't be read mid-flip. */}
        <div
          className={`flip-face flip-back card space-y-4 p-5 ${role.kind === "impostor" ? "!border-leather/60" : "!border-gold/50"}`}
          aria-hidden={!open}
        >
          {open && (
            <>
              {role.kind === "crew" && <CricketerCardView card={role.card} />}
              {role.kind === "impostor" && <HintCardView hint={role.hint} />}
              {allowGuess && role.kind === "impostor" && (
                <button className="btn btn-danger w-full" onClick={() => act("guess:call")}>
                  I know it! Guess now
                </button>
              )}
              <button className="btn btn-ghost w-full" onClick={() => toggle(false)}>
                Hide card
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------------- Reveal ----------------

function Reveal({ view }: { view: RoomView }) {
  const r = view.round!;
  const ready = r.readyIds.includes(view.you);
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="scoreboard text-4xl">Check your card</h2>
          <p className="text-sm text-chalk-dim">
            {r.readyIds.length}/{view.players.filter((p) => p.connected).length} ready
          </p>
        </div>
        <Countdown endsAt={view.endsAt} total={view.settings.revealSeconds} />
      </div>
      <SecretCard view={view} />
      <button className="btn btn-primary w-full" disabled={ready} onClick={() => act("round:ready")}>
        {ready ? "Waiting for others…" : "Got it, I'm ready"}
      </button>
    </div>
  );
}

// ---------------- Clues ----------------

function ClueBoard({ view }: { view: RoomView }) {
  const clues = view.round?.clues ?? [];
  return (
    <section className="space-y-2">
      <h3 className="text-sm font-medium text-chalk-dim">Clue board</h3>
      {clues.length === 0 ? (
        <p className="card p-4 text-sm text-chalk-dim">No typed clues yet. Spoken clues don&apos;t appear here.</p>
      ) : (
        <ul className="space-y-1.5">
          {clues.map((c, i) => {
            const s = seatOf(view, c.playerId);
            return (
              <li key={i} className="card slide-in flex items-start gap-3 px-4 py-2.5">
                <span className="text-lg">{s?.avatar ?? "❔"}</span>
                <span className="min-w-0">
                  <span className="block text-xs text-chalk-dim">
                    {s?.name ?? "Left the room"} · lap {c.lap}
                  </span>
                  <span className="font-medium break-words">{c.text}</span>
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

function Clues({ view }: { view: RoomView }) {
  const r = view.round!;
  const myTurn = r.speakerId === view.you;
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);

  async function submit() {
    setSending(true);
    const ok = await act("clue:submit", { text });
    setSending(false);
    if (ok) setText("");
  }

  return (
    <div className="space-y-5">
      <section key={r.speakerId ?? "none"} className={`card pop p-5 ${myTurn ? "ring-2 ring-gold turn-pulse" : ""}`}>
        <div className="flex items-center gap-4">
          <Countdown endsAt={view.endsAt} total={view.settings.turnSeconds} />
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-[0.2em] text-chalk-dim">
              Lap {Math.min(r.lap, view.settings.laps)}/{view.settings.laps}
            </p>
            <p className="scoreboard truncate text-4xl">{myTurn ? "Your turn!" : `${nameOf(view, r.speakerId)}'s turn`}</p>
          </div>
        </div>
        {myTurn && (
          <form
            className="mt-4 space-y-2"
            onSubmit={(e) => {
              e.preventDefault();
              void submit();
            }}
          >
            <input
              className="input"
              autoFocus
              maxLength={60}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Type a clue (don't say the name)"
            />
            <button className="btn btn-primary w-full" disabled={sending}>
              {text.trim() ? "Send clue" : "Done (said it out loud)"}
            </button>
          </form>
        )}
      </section>

      <div className="flex flex-wrap gap-2">
        {r.turnOrder.map((id, i) => {
          const s = seatOf(view, id);
          if (!s) return null;
          return (
            <div key={id} className={`rounded-full ${id === r.speakerId ? "turn-pulse" : ""}`}>
              <PlayerChip seat={s} highlight={id === r.speakerId} dim={i < r.turnOrder.indexOf(r.speakerId ?? "")} />
            </div>
          );
        })}
      </div>

      <ClueBoard view={view} />
      <SecretCard view={view} allowGuess />
    </div>
  );
}

// ---------------- Discussion ----------------

function Discussion({ view }: { view: RoomView }) {
  return (
    <div className="space-y-5">
      <section className="card flex items-center gap-4 p-5">
        <Countdown endsAt={view.endsAt} total={view.settings.discussionSeconds} />
        <div>
          <p className="scoreboard text-4xl">Discuss!</p>
          <p className="text-sm text-chalk-dim">Whose clue didn&apos;t fit? Voting starts when the timer ends.</p>
        </div>
      </section>
      {view.hostId === view.you && (
        <button className="btn btn-ghost w-full" onClick={() => act("discussion:skip")}>
          Skip to vote
        </button>
      )}
      <ClueBoard view={view} />
      <SecretCard view={view} allowGuess />
    </div>
  );
}

// ---------------- Vote ----------------

function Vote({ view }: { view: RoomView }) {
  const r = view.round!;
  const revote = view.phase === "revote";
  const candidates = view.players.filter((p) => p.id !== view.you && (!revote || r.revoteCandidates?.includes(p.id)));
  return (
    <div className="space-y-5">
      <section className="card flex items-center gap-4 p-5">
        <Countdown endsAt={view.endsAt} total={revote ? 15 : view.settings.voteSeconds} />
        <div>
          <p className="scoreboard text-4xl">{revote ? "Tie! Vote again" : "Who's the impostor?"}</p>
          <p className="text-sm text-chalk-dim">
            {r.votedIds.length}/{view.players.filter((p) => p.connected).length} voted · secret ballot
          </p>
        </div>
      </section>
      <div className="grid grid-cols-2 gap-3">
        {candidates.map((p) => {
          const picked = view.yourVote === p.id;
          return (
            <button
              key={`${p.id}-${picked}`}
              onClick={() => {
                sfx.vote();
                void act("vote:cast", { targetId: p.id });
              }}
              className={`card flex flex-col items-center gap-1 p-4 transition ${picked ? "bump !border-gold ring-2 ring-gold" : ""}`}
            >
              <span className="text-3xl">{p.avatar}</span>
              <span className="truncate font-medium">{p.name}</span>
              <span className="text-xs text-chalk-dim">{r.votedIds.includes(p.id) ? "has voted" : "thinking…"}</span>
            </button>
          );
        })}
      </div>
      <p className="text-center text-xs text-chalk-dim">You can change your vote until everyone has voted.</p>
      <ClueBoard view={view} />
    </div>
  );
}

// ---------------- Guess ----------------

function Guess({ view }: { view: RoomView }) {
  const r = view.round!;
  const amImpostor = view.role.kind === "impostor";
  const [q, setQ] = useState("");
  const pool = useMemo(() => poolFor(view.settings), [view.settings]);
  const results = useMemo(() => searchCricketers(pool, q, 8), [pool, q]);

  if (!amImpostor) {
    return (
      <section className="card flex flex-col items-center space-y-3 p-6 text-center">
        {!r.midRoundGuess && <Stumps knocked />}
        <Countdown endsAt={view.endsAt} total={view.settings.guessSeconds} size={88} />
        <p className="scoreboard text-4xl">{r.midRoundGuess ? "The impostor called it!" : "Impostor caught!"}</p>
        <p className="text-chalk-dim">
          The impostor is guessing the player. If they get it right, they steal the round.
        </p>
      </section>
    );
  }

  return (
    <div className="space-y-4">
      {!r.midRoundGuess && <Stumps knocked />}
      <section className="card flex items-center gap-4 p-5">
        <Countdown endsAt={view.endsAt} total={view.settings.guessSeconds} />
        <div>
          <p className="scoreboard text-4xl text-leather">{r.midRoundGuess ? "Name the player" : "You were caught!"}</p>
          <p className="text-sm text-chalk-dim">One guess. Get it right to steal the round.</p>
        </div>
      </section>
      {view.role.kind === "impostor" && (
        <p className="text-sm text-chalk-dim">
          Your hint: <b className="text-chalk">{HINT_LABELS[view.role.hint.type]}: {view.role.hint.value}</b>
        </p>
      )}
      <input className="input" autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Start typing a name or nickname" />
      <ul className="space-y-2">
        {results.map((c) => (
          <li key={c.id}>
            <button className="card flex w-full items-center justify-between px-4 py-3 text-left" onClick={() => act("guess:submit", { cricketerId: c.id })}>
              <span className="font-medium">{c.name}</span>
              <span className="text-xs text-chalk-dim">{c.country}</span>
            </button>
          </li>
        ))}
      </ul>
      <ClueBoard view={view} />
    </div>
  );
}

// ---------------- Result ----------------

const OUTCOME_TEXT: Record<RoundOutcome, { title: string; crewWon: boolean | null }> = {
  caughtWrongGuess: { title: "Crew wins! Impostor caught", crewWon: true },
  caughtRightGuess: { title: "Caught, but the impostor guessed it!", crewWon: false },
  escaped: { title: "The impostor got away", crewWon: false },
  midGuessRight: { title: "The impostor cracked it!", crewWon: false },
  midGuessWrong: { title: "Wrong guess! Crew wins", crewWon: true },
  void: { title: "Round cancelled: the impostor left", crewWon: null },
};

function Scoreboard({ view, points }: { view: RoomView; points?: Record<string, number> }) {
  const sorted = [...view.players].sort((a, b) => b.score - a.score);
  return (
    <ol className="space-y-2">
      {sorted.map((p, i) => (
        <li key={p.id} className="card flex items-center justify-between px-4 py-3">
          <span className="flex items-center gap-3">
            <span className="scoreboard w-6 text-xl text-chalk-dim">{i + 1}</span>
            <span className="text-xl">{p.avatar}</span>
            <span className="font-medium">{p.name}</span>
          </span>
          <span className="flex items-center gap-2">
            {points?.[p.id] ? <span className="float-up text-sm text-gold">+{points[p.id]}</span> : null}
            <span className={`scoreboard text-3xl ${points?.[p.id] ? "count-up" : ""}`}>{p.score}</span>
          </span>
        </li>
      ))}
    </ol>
  );
}

function Result({ view }: { view: RoomView }) {
  const rv = view.round!.reveal!;
  const o = OUTCOME_TEXT[rv.outcome];
  const isHost = view.hostId === view.you;
  const last = view.roundsPlayed >= view.settings.rounds;
  const impostor = seatOf(view, rv.impostorId);
  const tally = (votes: Record<string, string>) => {
    const t: Record<string, string[]> = {};
    for (const [voter, target] of Object.entries(votes)) (t[target] ??= []).push(nameOf(view, voter));
    return t;
  };
  const votes = tally(rv.votes);

  return (
    <div className="space-y-5">
      <section className="pop space-y-3 text-center">
        {(rv.outcome === "caughtWrongGuess" || rv.outcome === "caughtRightGuess") && <Stumps knocked />}
        {rv.outcome === "midGuessWrong" && <p className="text-5xl">🙅</p>}
        {(rv.outcome === "escaped" || rv.outcome === "midGuessRight") && <p className="pop text-5xl">🥷</p>}
        <p className={`scoreboard text-5xl leading-none ${o.crewWon ? "text-gold" : o.crewWon === false ? "text-leather" : ""}`}>{o.title}</p>
      </section>

      <section className="card space-y-3 p-5">
        <p className="text-sm text-chalk-dim">The impostor was</p>
        <div className="flex items-center gap-3">
          <span className="text-4xl">{impostor?.avatar ?? "❔"}</span>
          <span className="scoreboard text-4xl text-leather">{impostor?.name ?? "(left)"}</span>
        </div>
        <p className="text-sm text-chalk-dim">
          Their hint: {HINT_LABELS[rv.hint.type]} – <b className="text-chalk">{rv.hint.value}</b>
        </p>
        {rv.guess && (
          <p className="text-sm">
            They guessed <b>{rv.guess.name}</b> {rv.guess.id === rv.secret.id ? "✅" : "❌"}
          </p>
        )}
      </section>

      <section className="card p-5">
        <CricketerCardView card={rv.secret} />
      </section>

      {Object.keys(votes).length > 0 && (
        <section className="space-y-2">
          <h3 className="text-sm font-medium text-chalk-dim">Votes</h3>
          <ul className="space-y-1 text-sm">
            {Object.entries(votes).map(([target, voters]) => (
              <li key={target} className="card px-4 py-2">
                <b className={target === rv.impostorId ? "text-leather" : ""}>{nameOf(view, target)}</b> ← {voters.join(", ")}
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="space-y-2">
        <h3 className="text-sm font-medium text-chalk-dim">Scores</h3>
        <Scoreboard view={view} points={rv.points} />
      </section>

      {isHost ? (
        <button className="btn btn-primary w-full text-lg" onClick={() => act("round:next")}>
          {last ? "Final scores" : "Next round"}
        </button>
      ) : (
        <p className="text-center text-sm text-chalk-dim">Waiting for the host…</p>
      )}
    </div>
  );
}

// ---------------- Match end ----------------

function MatchEnd({ view }: { view: RoomView }) {
  const isHost = view.hostId === view.you;
  const top = Math.max(...view.players.map((p) => p.score));
  const winners: Seat[] = view.players.filter((p) => p.score === top);
  return (
    <div className="space-y-5">
      <Confetti />
      <section className="pop space-y-2 pt-4 text-center">
        <p className="bump text-6xl">🏆</p>
        <p className="scoreboard text-5xl text-gold">{winners.map((w) => w.name).join(" & ")}</p>
        <p className="text-chalk-dim">{winners.length > 1 ? "share the win" : "wins the match"} with {top} points</p>
      </section>
      <Scoreboard view={view} />
      {isHost ? (
        <div className="grid gap-2">
          <button className="btn btn-primary w-full" onClick={() => act("match:start")}>
            Play again
          </button>
          <button className="btn btn-ghost w-full" onClick={() => act("match:lobby")}>
            Back to lobby (change settings)
          </button>
        </div>
      ) : (
        <p className="text-center text-sm text-chalk-dim">Waiting for the host…</p>
      )}
    </div>
  );
}
