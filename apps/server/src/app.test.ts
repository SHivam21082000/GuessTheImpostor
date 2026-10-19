import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { io as connect, type Socket } from "socket.io-client";
import type { AddressInfo } from "node:net";
import type { ClientToServerEvents, JoinResult, RoomView, ServerToClientEvents } from "@gti/shared";
import { buildServer } from "./app.js";

type Client = Socket<ServerToClientEvents, ClientToServerEvents>;

let url = "";
const { app } = buildServer();

beforeAll(async () => {
  await app.listen({ port: 0, host: "127.0.0.1" });
  url = `http://127.0.0.1:${(app.server.address() as AddressInfo).port}`;
});
afterAll(async () => {
  await app.close();
});

function client(): Promise<{ s: Client; views: RoomView[] }> {
  const s: Client = connect(url, { transports: ["websocket"], forceNew: true });
  const views: RoomView[] = [];
  s.on("room:state", (v) => views.push(v));
  return new Promise((res) => s.on("connect", () => res({ s, views })));
}

const call = <T>(fn: (ack: (r: T) => void) => void) => new Promise<T>((res) => fn(res));
const last = (v: RoomView[]) => v[v.length - 1]!;
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

describe("game server", () => {
  it("plays a round over sockets without leaking the secret to the impostor", async () => {
    const a = await client();
    const b = await client();
    const c = await client();

    const created = await call<{ ok: boolean } & JoinResult>((ack) => a.s.emit("room:create", { name: "Asha", avatar: "🏏" }, ack as never));
    expect(created.ok).toBe(true);
    for (const [cl, name] of [
      [b, "Bilal"],
      [c, "Chirag"],
    ] as const) {
      const r = await call<{ ok: boolean }>((ack) => cl.s.emit("room:join", { code: created.code, name, avatar: "🧢" }, ack as never));
      expect(r.ok).toBe(true);
    }

    const bad = await call<{ ok: boolean; code?: string }>((ack) => b.s.emit("match:start", ack as never));
    expect(bad).toMatchObject({ ok: false, code: "not_host" });

    await call((ack) => a.s.emit("room:settings", { laps: 1, discussionSeconds: 0, turnSeconds: 10 }, ack as never));
    const started = await call<{ ok: boolean }>((ack) => a.s.emit("match:start", ack as never));
    expect(started.ok).toBe(true);
    await wait(50);

    const all = [a, b, c];
    const impostor = all.find((x) => last(x.views).role.kind === "impostor")!;
    const crew = all.filter((x) => x !== impostor);
    expect(crew).toHaveLength(2);
    const secretId = (last(crew[0]!.views).role as { card: { id: string } }).card.id;
    expect(JSON.stringify(impostor.views)).not.toContain(secretId);

    for (const x of all) await call((ack) => x.s.emit("round:ready", ack as never));
    await wait(30);
    expect(last(a.views).phase).toBe("clues");

    // Each speaker sends a clue in turn.
    for (let i = 0; i < 3; i++) {
      const speakerId = last(a.views).round!.speakerId!;
      const speaker = all.find((x) => last(x.views).you === speakerId)!;
      const r = await call<{ ok: boolean }>((ack) => speaker.s.emit("clue:submit", { text: `clue ${i}` }, ack as never));
      expect(r.ok).toBe(true);
      await wait(30);
    }
    expect(last(a.views).phase).toBe("vote");
    expect(last(a.views).round!.clues).toHaveLength(3);

    const impId = last(impostor.views).you;
    for (const x of crew) await call((ack) => x.s.emit("vote:cast", { targetId: impId }, ack as never));
    await call((ack) => impostor.s.emit("vote:cast", { targetId: last(crew[0]!.views).you }, ack as never));
    await wait(30);
    expect(last(a.views).phase).toBe("guess");

    await call((ack) => impostor.s.emit("guess:submit", { cricketerId: secretId }, ack as never));
    await wait(30);
    const result = last(a.views);
    expect(result.phase).toBe("result");
    expect(result.round!.reveal!.outcome).toBe("caughtRightGuess");
    expect(result.round!.reveal!.secret.id).toBe(secretId);

    for (const x of all) x.s.disconnect();
  });

  it("lets a player resume their seat with the session token", async () => {
    const a = await client();
    const created = await call<JoinResult>((ack) => a.s.emit("room:create", { name: "Host", avatar: "🏏" }, ack as never));
    a.s.disconnect();
    await wait(30);
    const again = await client();
    const r = await call<{ ok: boolean; playerId: string }>((ack) =>
      again.s.emit("room:resume", { code: created.code, token: created.token }, ack as never),
    );
    expect(r).toMatchObject({ ok: true, playerId: created.playerId });
    await wait(30);
    expect(last(again.views).players[0]!.connected).toBe(true);
    again.s.disconnect();
  });
});
