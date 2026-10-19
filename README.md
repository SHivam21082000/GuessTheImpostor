# Guess the Impostor – Cricket edition

A web party game for 3–10 players. Everyone gets the same secret cricketer, except the
**impostor**, who gets just one hint: the player's **country**, **playing profile** or
**last IPL team**. Players take timed turns giving clues, out loud in the same room or
typed when playing remotely. Then everyone votes on who's bluffing. If the impostor is
caught, they still get one guess at the player's name to steal the round.

The pool covers current and retired men's cricketers. The game is web only, with no
paid tiers.

## Project layout

```
packages/shared   Game rules (pure TS): types, cricketer data, hint engine,
                  round state machine, scoring, per-player views, socket contracts
apps/server       Node game server: Fastify + Socket.IO, server-authoritative timers
apps/web          Next.js mobile-first client
TASKS.md          Build plan split into tasks, with progress
```

The server is authoritative. It keeps the full game state and sends each player only
what they're allowed to see, so the impostor's browser never receives the secret
player.

## Run it locally

Requirements: Node 20+ and pnpm (`npm i -g pnpm`).

```bash
pnpm install
pnpm dev          # server on :4000, web on :3000
```

Open http://localhost:3000, create a room and share the code.

**Same-room play on phones:** keep your laptop and phones on the same Wi-Fi. Then open
`http://<your-laptop-ip>:3000` on each phone. The web app connects to the game server
on port 4000 of the same host automatically.

## Scripts

| Command | What it does |
| --- | --- |
| `pnpm dev` | Run server and web in watch mode |
| `pnpm test` | Engine unit tests + socket integration tests (Vitest) |
| `pnpm typecheck` | TypeScript check for all packages |
| `pnpm build` | Production builds (`apps/server/dist`, `apps/web/.next`) |

## Configuration

| Variable | Where | Default |
| --- | --- | --- |
| `PORT` | server | `4000` |
| `CORS_ORIGIN` | server | allow all (comma-separated list in production) |
| `NEXT_PUBLIC_SERVER_URL` | web | `http(s)://<page host>:4000` |

## Game rules in short

- **Hints** must match at least 3 players in the pool, so they never give the answer away.
  Players who never played IPL never get the IPL-team hint.
- **Turns:** turn order is random, but the impostor never goes first. Each turn has a
  countdown, and the turn passes automatically when time runs out. Typed clues that
  contain the player's name or a nickname are blocked.
- **Voting:** a secret ballot. A tie goes to a revote between the tied players; a second
  tie lets the impostor escape.
- **Scoring:**

  | Outcome | Points |
  | --- | --- |
  | Impostor caught, wrong guess | Crew +2 each, +1 for voting correctly |
  | Impostor caught, right guess | Impostor +3 |
  | Impostor escapes | Impostor +3 |
  | Mid-round "I know it!", right | Impostor +4 |
  | Mid-round "I know it!", wrong | Crew +2 each |

## Player data

The cricketer pool is in `packages/shared/src/data/players.ts`. Last IPL teams change
after every auction, so re-check them each season (TASKS.md T0.5).
