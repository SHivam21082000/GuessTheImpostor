# Build tasks

The build plan split into small, shippable tasks. Each one ends with something that can be run or tested.
`[x]` = done in this repo, `[ ]` = still to do.

## Milestone 0 – Foundations (week 1)

- [x] **T0.1** pnpm monorepo: `packages/shared`, `apps/server`, `apps/web`
- [x] **T0.2** Shared TypeScript config, scripts (`dev`, `test`, `typecheck`, `build`)
- [x] **T0.3** Cricketer seed data: current + retired men's players (`packages/shared/src/data/players.ts`)
- [x] **T0.4** GitHub Actions CI: install, typecheck, test on every push
- [ ] **T0.5** Grow the pool to ~250 players and add a data-check script (no duplicate ids, valid teams)

## Milestone 1 – Core game engine (weeks 2–3)

- [x] **T1.1** Shared types: room, player, phases, settings, socket event contracts
- [x] **T1.2** Hint engine: pick hint type (country / profile / last IPL team), ≥3-match ambiguity rule, skip IPL hint for pre-2008 players
- [x] **T1.3** Round state machine: lobby → reveal → clues → discussion → vote → (revote) → guess → result → match end
- [x] **T1.4** Turn rotation with laps; impostor never speaks first
- [x] **T1.5** Typed clue validation: block clues containing the player's name or aliases
- [x] **T1.6** Voting with tie-break revote; second tie = impostor escapes
- [x] **T1.7** Impostor final guess + mid-round "I know it!" guess, fuzzy name matching
- [x] **T1.8** Scoring table from the plan
- [x] **T1.9** Unit tests for engine (Vitest)
- [ ] **T1.10** Support 2 impostors for 7–10 players

## Milestone 2 – Realtime server (weeks 3–4)

- [x] **T2.1** Fastify + Socket.IO server with health endpoint
- [x] **T2.2** Create / join room with 6-letter code; nickname + avatar
- [x] **T2.3** Role-private payloads: secret player only to crew, hint only to impostor
- [x] **T2.4** Server-authoritative timers using `endsAt` timestamps; auto-advance phases
- [x] **T2.5** Reconnect into the same seat via session token; host migration
- [x] **T2.6** Kick player, update settings, start match, next round (host only)
- [x] **T2.7** Room cleanup after 30 min idle
- [ ] **T2.8** Move room state to Redis + Socket.IO Redis adapter (multi-instance)
- [ ] **T2.9** Rate limiting on socket events

## Milestone 3 – Web client (weeks 3–5)

- [x] **T3.1** Next.js app, mobile-first layout, cricket theme
- [x] **T3.2** Home: create room / join by code
- [x] **T3.3** Lobby: code, share link, player list, host settings, start button
- [x] **T3.4** Role reveal: hold-to-reveal card (crew card vs impostor hint card)
- [x] **T3.5** Clue round: speaker highlight, countdown ring, clue text field + Send, shared clue board, "I know it!" button
- [x] **T3.6** Discussion screen with countdown
- [x] **T3.7** Vote screen (+ revote) with "who has voted" indicators
- [x] **T3.8** Impostor guess screen with autocomplete
- [x] **T3.9** Round result + match summary, play again
- [x] **T3.10** Reconnect after refresh, clock-offset sync for timers
- [ ] **T3.11** Animations (card flip, stumps falling), sounds, vibration on your turn
- [ ] **T3.12** QR code for room join

## Milestone 4 – Launch (weeks 5–6)

- [ ] **T4.1** Playwright multi-tab end-to-end test (4 players, full match)
- [ ] **T4.2** Deploy web to Vercel, server to Railway/Render (Mumbai/Singapore region)
- [ ] **T4.3** Sentry + PostHog
- [ ] **T4.4** Playtests with friends, tune default timers and scoring

## Milestone 5 – v2 (weeks 7–12)

- [ ] **T5.1** Player-pool filters: IPL only, by country, current vs retired
- [ ] **T5.2** Difficulty levels via popularity score
- [ ] **T5.3** PWA install (web only, no app stores)
- [ ] **T5.4** LiveKit voice for remote rooms
- [ ] **T5.5** Accounts (Google / phone OTP), stats, history in Postgres
- [ ] **T5.6** Hindi + Gujarati UI
- [ ] **T5.7** Pass-and-play mode on one phone
