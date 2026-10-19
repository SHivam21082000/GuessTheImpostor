"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { JoinResult } from "@gti/shared";
import { send } from "@/lib/socket";
import { getProfile, saveProfile, saveSeat } from "@/lib/session";
import { AVATARS } from "@/components/ui";

export default function Home() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [avatar, setAvatar] = useState("🏏");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const p = getProfile();
    setName(p.name);
    setAvatar(p.avatar);
  }, []);

  async function go(kind: "create" | "join") {
    if (!name.trim()) return setError("Pick a nickname first.");
    if (kind === "join" && code.trim().length !== 6) return setError("Room codes are 6 letters.");
    setBusy(true);
    setError(null);
    saveProfile({ name: name.trim(), avatar });
    const res =
      kind === "create"
        ? await send<JoinResult>("room:create", { name: name.trim(), avatar })
        : await send<JoinResult>("room:join", { code: code.trim().toUpperCase(), name: name.trim(), avatar });
    setBusy(false);
    if (!res.ok) return setError(res.error);
    saveSeat(res.code, { token: res.token, playerId: res.playerId });
    router.push(`/room/${res.code}`);
  }

  return (
    <div className="space-y-8">
      <header className="pt-6 text-center">
        <p className="text-xs uppercase tracking-[0.3em] text-chalk-dim">Cricket edition</p>
        <h1 className="scoreboard mt-2 text-6xl leading-[0.9] text-gold">
          Guess the
          <br />
          <span className="text-chalk">Impostor</span>
        </h1>
        <p className="mx-auto mt-4 max-w-xs text-sm text-chalk-dim">
          Everyone knows the cricketer. One player only gets a hint. Give clues, spot the bluffer.
        </p>
      </header>

      <section className="card space-y-4 p-5">
        <label className="block space-y-2">
          <span className="text-sm font-medium">Your nickname</span>
          <input className="input" maxLength={16} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Shivam" />
        </label>
        <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Avatar">
          {AVATARS.map((a) => (
            <button
              key={a}
              role="radio"
              aria-checked={a === avatar}
              onClick={() => setAvatar(a)}
              className={`grid h-11 w-11 place-items-center rounded-full text-xl ${a === avatar ? "bg-gold" : "bg-white/8"}`}
            >
              {a}
            </button>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <button className="btn btn-primary w-full text-lg" disabled={busy} onClick={() => go("create")}>
          Create a room
        </button>
        <div className="flex gap-2">
          <input
            className="input scoreboard text-center text-2xl tracking-[0.3em] uppercase"
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))}
            placeholder="CODE"
            aria-label="Room code"
          />
          <button className="btn btn-ghost shrink-0" disabled={busy} onClick={() => go("join")}>
            Join
          </button>
        </div>
        {error && <p className="text-center text-sm text-leather">{error}</p>}
      </section>

      <details className="card p-5 text-sm text-chalk-dim">
        <summary className="cursor-pointer font-medium text-chalk">How to play</summary>
        <ol className="mt-3 list-decimal space-y-1.5 pl-5">
          <li>Everyone gets the same secret cricketer, except the impostor, who gets one hint: country, playing profile or last IPL team.</li>
          <li>Take turns giving a clue. Say it aloud in the same room, or type it when playing remotely. Don&apos;t say the name!</li>
          <li>Discuss, then vote out who you think is bluffing.</li>
          <li>If caught, the impostor can still steal the round by guessing the player.</li>
        </ol>
      </details>
    </div>
  );
}
