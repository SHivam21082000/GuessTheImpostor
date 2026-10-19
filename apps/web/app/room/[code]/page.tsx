"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import type { JoinResult } from "@gti/shared";
import { getSocket, send } from "@/lib/socket";
import { clearSeat, getProfile, getSeat, saveProfile, saveSeat } from "@/lib/session";
import { useGame } from "@/lib/store";
import { AVATARS, Toast } from "@/components/ui";
import { GameScreen } from "@/components/screens";
import { useAudioUnlock } from "@/components/effects";

export default function RoomPage() {
  const { code: raw } = useParams<{ code: string }>();
  const code = raw.toUpperCase();
  const router = useRouter();
  const { view, setView, setOffset, setConnected, connected, showToast } = useGame();
  const [needsJoin, setNeedsJoin] = useState(false);
  useAudioUnlock();

  const resume = useCallback(async () => {
    const seat = getSeat(code);
    if (!seat) return setNeedsJoin(true);
    const res = await send<JoinResult>("room:resume", { code, token: seat.token });
    if (!res.ok) {
      clearSeat(code);
      setNeedsJoin(true);
    }
  }, [code]);

  useEffect(() => {
    const s = getSocket();
    const onConnect = () => {
      setConnected(true);
      const t0 = Date.now();
      s.emit("time:sync", (serverNow: number) => {
        const t1 = Date.now();
        setOffset(serverNow - (t0 + t1) / 2);
      });
      void resume();
    };
    const onDisconnect = () => setConnected(false);
    const onKicked = () => {
      clearSeat(code);
      setView(null);
      showToast("The host removed you from the room.");
      router.push("/");
    };
    s.on("connect", onConnect);
    s.on("disconnect", onDisconnect);
    s.on("room:state", setView);
    s.on("room:kicked", onKicked);
    if (s.connected) onConnect();
    return () => {
      s.off("connect", onConnect);
      s.off("disconnect", onDisconnect);
      s.off("room:state", setView);
      s.off("room:kicked", onKicked);
    };
  }, [code, resume, router, setConnected, setOffset, setView, showToast]);

  return (
    <>
      {!connected && (
        <div className="mb-3 rounded-lg bg-leather/20 px-3 py-2 text-center text-sm text-leather">Reconnecting to the game server…</div>
      )}
      {needsJoin ? (
        <JoinForm
          code={code}
          onJoined={() => {
            setNeedsJoin(false);
          }}
        />
      ) : view && view.code === code ? (
        <GameScreen view={view} />
      ) : (
        <p className="pt-20 text-center text-chalk-dim">Loading room {code}…</p>
      )}
      <Toast />
    </>
  );
}

function JoinForm({ code, onJoined }: { code: string; onJoined: () => void }) {
  const [name, setName] = useState("");
  const [avatar, setAvatar] = useState("🏏");
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    const p = getProfile();
    setName(p.name);
    setAvatar(p.avatar);
  }, []);

  async function join() {
    if (!name.trim()) return setError("Pick a nickname first.");
    saveProfile({ name: name.trim(), avatar });
    const res = await send<JoinResult>("room:join", { code, name: name.trim(), avatar });
    if (!res.ok) return setError(res.error);
    saveSeat(res.code, { token: res.token, playerId: res.playerId });
    onJoined();
  }

  return (
    <div className="card space-y-4 p-5">
      <p className="text-sm text-chalk-dim">Joining room</p>
      <p className="scoreboard text-5xl tracking-[0.2em] text-gold">{code}</p>
      <input className="input" maxLength={16} value={name} onChange={(e) => setName(e.target.value)} placeholder="Your nickname" />
      <div className="flex flex-wrap gap-2">
        {AVATARS.map((a) => (
          <button
            key={a}
            onClick={() => setAvatar(a)}
            className={`grid h-11 w-11 place-items-center rounded-full text-xl ${a === avatar ? "bg-gold" : "bg-white/8"}`}
          >
            {a}
          </button>
        ))}
      </div>
      <button className="btn btn-primary w-full" onClick={join}>
        Join game
      </button>
      {error && <p className="text-center text-sm text-leather">{error}</p>}
    </div>
  );
}
