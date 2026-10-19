import cors from "@fastify/cors";
import Fastify from "fastify";
import { randomUUID } from "node:crypto";
import { Server, type Socket } from "socket.io";
import {
  addPlayer,
  backToLobby,
  buildView,
  callGuess,
  castVote,
  GameError,
  kick,
  markReady,
  nextRound,
  onTimeout,
  removePlayer,
  setConnected,
  skipDiscussion,
  startMatch,
  submitClue,
  submitGuess,
  updateSettings,
  type Ack,
  type ClientToServerEvents,
  type Ctx,
  type ServerToClientEvents,
} from "@gti/shared";
import { RoomStore, type Room } from "./rooms.js";

interface SocketData {
  code?: string;
  playerId?: string;
}
type GameSocket = Socket<ClientToServerEvents, ServerToClientEvents, Record<string, never>, SocketData>;

export interface ServerOptions {
  corsOrigin?: string | string[] | boolean;
  /** Remove lobby players who stay disconnected this long. */
  lobbyGraceMs?: number;
  idleRoomMs?: number;
  logger?: boolean;
}

const AVATARS = ["🏏", "🧢", "🧤", "🎯", "🔥", "⚡", "🦁", "🐯", "🦅", "🌟"];

export function buildServer(opts: ServerOptions = {}) {
  const lobbyGraceMs = opts.lobbyGraceMs ?? 60_000;
  const idleRoomMs = opts.idleRoomMs ?? 30 * 60_000;
  const app = Fastify({ logger: opts.logger ?? false });
  const store = new RoomStore();
  const origin = opts.corsOrigin ?? true;
  void app.register(cors, { origin });

  app.get("/health", async () => ({ ok: true, rooms: store.size }));

  const io = new Server<ClientToServerEvents, ServerToClientEvents, Record<string, never>, SocketData>(app.server, {
    cors: { origin },
  });

  const ctx = (): Ctx => ({ now: Date.now(), rng: Math.random });

  function broadcast(room: Room) {
    for (const [playerId, socketId] of room.sockets) {
      io.to(socketId).emit("room:state", buildView(room.state, playerId));
    }
  }

  function schedule(room: Room) {
    if (room.timer) clearTimeout(room.timer);
    room.timer = null;
    const endsAt = room.state.endsAt;
    if (endsAt === null) return;
    room.timer = setTimeout(() => {
      room.timer = null;
      onTimeout(room.state, ctx());
      room.lastActive = Date.now();
      schedule(room);
      broadcast(room);
    }, Math.max(0, endsAt - Date.now()) + 50);
  }

  /** Apply a change, then push fresh views and re-arm the room timer. */
  function commit(room: Room) {
    room.lastActive = Date.now();
    schedule(room);
    broadcast(room);
  }

  function attach(socket: GameSocket, room: Room, playerId: string) {
    const old = room.sockets.get(playerId);
    if (old && old !== socket.id) io.sockets.sockets.get(old)?.disconnect(true);
    room.sockets.set(playerId, socket.id);
    socket.data.code = room.state.code;
    socket.data.playerId = playerId;
    void socket.join(room.state.code);
  }

  function fail(ack: Ack<never> | undefined, e: unknown) {
    if (e instanceof GameError) ack?.({ ok: false, code: e.code, error: e.message });
    else {
      app.log.error(e);
      ack?.({ ok: false, code: "server_error", error: "Something went wrong." });
    }
  }

  io.on("connection", (socket: GameSocket) => {
    /** Wrap an in-room action: look up room + player, run, commit, ack. */
    const inRoom =
      <A extends unknown[]>(fn: (room: Room, playerId: string, ...args: A) => void) =>
      (...args: [...A, Ack]) => {
        const ack = args[args.length - 1] as Ack;
        const rest = args.slice(0, -1) as unknown as A;
        const { code, playerId } = socket.data;
        const room = code ? store.get(code) : undefined;
        if (!room || !playerId) return ack?.({ ok: false, code: "no_room", error: "You're not in a room." });
        try {
          fn(room, playerId, ...rest);
          commit(room);
          ack?.({ ok: true });
        } catch (e) {
          fail(ack as Ack<never>, e);
        }
      };

    socket.on("time:sync", (ack) => ack(Date.now()));

    socket.on("room:create", (p, ack) => {
      try {
        const avatar = AVATARS.includes(p?.avatar) ? p.avatar : AVATARS[0]!;
        const { room, playerId, token } = store.create({ name: String(p?.name ?? ""), avatar });
        attach(socket, room, playerId);
        commit(room);
        ack({ ok: true, code: room.state.code, playerId, token });
      } catch (e) {
        fail(ack as Ack<never>, e);
      }
    });

    socket.on("room:join", (p, ack) => {
      const room = store.get(String(p?.code ?? ""));
      if (!room) return ack({ ok: false, code: "no_room", error: "No room with that code." });
      try {
        const playerId = randomUUID();
        const token = randomUUID();
        const avatar = AVATARS.includes(p?.avatar) ? p.avatar : AVATARS[0]!;
        addPlayer(room.state, { id: playerId, name: String(p?.name ?? ""), avatar });
        room.tokens.set(token, playerId);
        attach(socket, room, playerId);
        commit(room);
        ack({ ok: true, code: room.state.code, playerId, token });
      } catch (e) {
        fail(ack as Ack<never>, e);
      }
    });

    socket.on("room:resume", (p, ack) => {
      const room = store.get(String(p?.code ?? ""));
      const playerId = room?.tokens.get(String(p?.token ?? ""));
      if (!room || !playerId || !room.state.players.some((s) => s.id === playerId)) {
        return ack({ ok: false, code: "no_seat", error: "That seat is gone." });
      }
      attach(socket, room, playerId);
      setConnected(room.state, playerId, true, ctx());
      commit(room);
      ack({ ok: true, code: room.state.code, playerId, token: String(p.token) });
    });

    socket.on(
      "room:leave",
      inRoom((room, playerId) => {
        removePlayer(room.state, playerId, ctx());
        room.sockets.delete(playerId);
        for (const [t, id] of room.tokens) if (id === playerId) room.tokens.delete(t);
        void socket.leave(room.state.code);
        socket.data = {};
        if (room.state.players.length === 0) store.delete(room.state.code);
      }),
    );

    socket.on(
      "room:kick",
      inRoom((room, playerId, p: { playerId: string }) => {
        kick(room.state, playerId, String(p?.playerId), ctx());
        const sid = room.sockets.get(p.playerId);
        if (sid) {
          const s = io.sockets.sockets.get(sid);
          s?.emit("room:kicked");
          if (s) s.data = {};
          void s?.leave(room.state.code);
        }
        room.sockets.delete(p.playerId);
        for (const [t, id] of room.tokens) if (id === p.playerId) room.tokens.delete(t);
      }),
    );

    socket.on("room:settings", inRoom((room, id, p) => updateSettings(room.state, id, p ?? {})));
    socket.on("match:start", inRoom((room, id) => startMatch(room.state, id, ctx())));
    socket.on("round:ready", inRoom((room, id) => markReady(room.state, id, ctx())));
    socket.on("clue:submit", inRoom((room, id, p: { text: string }) => submitClue(room.state, id, String(p?.text ?? ""), ctx())));
    socket.on("discussion:skip", inRoom((room, id) => skipDiscussion(room.state, id, ctx())));
    socket.on("vote:cast", inRoom((room, id, p: { targetId: string }) => castVote(room.state, id, String(p?.targetId), ctx())));
    socket.on("guess:call", inRoom((room, id) => callGuess(room.state, id, ctx())));
    socket.on("guess:submit", inRoom((room, id, p: { cricketerId: string }) => submitGuess(room.state, id, String(p?.cricketerId), ctx())));
    socket.on("round:next", inRoom((room, id) => nextRound(room.state, id, ctx())));
    socket.on("match:lobby", inRoom((room, id) => backToLobby(room.state, id)));

    socket.on("disconnect", () => {
      const { code, playerId } = socket.data;
      const room = code ? store.get(code) : undefined;
      if (!room || !playerId || room.sockets.get(playerId) !== socket.id) return;
      room.sockets.delete(playerId);
      setConnected(room.state, playerId, false, ctx());
      commit(room);
      // In the lobby, free the seat if they don't come back.
      setTimeout(() => {
        const seat = room.state.players.find((s) => s.id === playerId);
        if (seat && !seat.connected && room.state.phase === "lobby") {
          removePlayer(room.state, playerId, ctx());
          if (room.state.players.length === 0) store.delete(room.state.code);
          else commit(room);
        }
      }, lobbyGraceMs).unref();
    });
  });

  const sweeper = setInterval(() => store.sweep(idleRoomMs), 60_000);
  sweeper.unref();
  app.addHook("onClose", async () => {
    clearInterval(sweeper);
    await io.close();
  });

  return { app, io, store };
}
