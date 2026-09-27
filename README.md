# Virtual Office

A real-time 2D virtual office for remote software teams — avatars, desks,
rooms and meetings, with activity informed by Azure DevOps, Microsoft Teams
and Microsoft 365 Calendar.

Built for one team (iSaned). Pre-approved employees sign in once with their
work email and an **Azure DevOps personal access token** (verified against
Azure DevOps, stored encrypted; the browser only gets a session cookie),
design a layered avatar that is saved in **Supabase**, and walk a shared
office with real Socket.IO multiplayer and presence. Work activity comes from
a read-only **Azure DevOps** sync. Microsoft Entra sign-in and Teams/Calendar
are implemented/prepared but wait for an IT-approved app registration. The app installs as a Windows
**desktop PWA**. A seeded **demo mode** (11 people, scripted timeline) stays
available for development — see [`docs/DEMO_MODE.md`](./docs/DEMO_MODE.md).

## Structure

```
virtual-office/
├── frontend/   Vue 3 + TypeScript + Vite + Pinia + Vue Router + Phaser 3 + Tailwind
├── backend/    NestJS + Socket.IO gateway + Supabase (PostgreSQL)
├── shared/     @virtual-office/shared — domain types, placement policy, realtime contract
├── supabase/   SQL migrations (versioned, repeatable)
└── docs/       architecture, auth, Azure DevOps, PWA, demo mode, database, activity engine
```

Plain npm workspaces monorepo — no Nx/Turborepo.

## Run it

Requires Node 22+ (supabase-js needs its native WebSocket; developed on Node 24).

### Demo mode (no Microsoft / Supabase needed)

```bash
npm install                                # all three workspaces
cp backend/.env.example backend/.env       # then set DEMO_MODE=true
npm run build:shared                       # build @virtual-office/shared first

npm run dev:backend                        # NestJS API + realtime → http://localhost:3001
npm run dev:frontend                       # Vite → http://localhost:5173/office (proxies /api + /socket.io)
```

`frontend/.env.development` sets `VITE_DEMO_MODE=true`, so the dev server
signs you in as **Mohamed**. The first visit asks you to create your avatar
(`/profile/avatar`), then opens the office. The backend is optional for
single-tab use ("Local only"); it is required for multiplayer.

**Multiplayer check:** open `http://localhost:5173/office` and, in another
browser window (or a private one), `http://localhost:5173/office?demoUser=ahmed`.

### Real mode (Azure DevOps token sign-in + Supabase)

1. Apply the SQL migrations in [`supabase/migrations/`](./supabase/migrations) to your Supabase project.
2. Fill `backend/.env`: `AUTH_PROVIDER=azure_pat`, `AZURE_DEVOPS_ORGANIZATION`, `AZURE_DEVOPS_PROJECT`,
   Supabase service role key, `SESSION_SECRET`, `TOKEN_ENCRYPTION_KEY`, `DEMO_MODE=false`. No `ENTRA_*` values needed.
3. Approve the team: `cp backend/seed/employees.example.json backend/seed/employees.json`, add each person with their
   confirmed work email (as Azure DevOps shows it), `role` (authorization) and `jobTitle` / `team` (what the UI shows), then
   `npm run seed:employees -w backend`. The full iSaned roster lives in [`docs/team-roster.example.json`](./docs/team-roster.example.json).
4. Run `npm run dev:backend` and the frontend with `VITE_DEMO_MODE=false`
   (e.g. `frontend/.env.development.local`), open http://localhost:5173 and sign in with your
   work email + an Azure DevOps token — [`docs/AZURE_PAT_AUTH.md`](./docs/AZURE_PAT_AUTH.md).
5. Azure DevOps sync details: [`docs/AZURE_DEVOPS_SETUP.md`](./docs/AZURE_DEVOPS_SETUP.md).
6. Desktop app: [`docs/PWA_DESKTOP.md`](./docs/PWA_DESKTOP.md).
   Hosting (SPA on Vercel, API on Railway): [`docs/DEPLOYMENT.md`](./docs/DEPLOYMENT.md).
7. Later, when IT approves an Entra app registration: [`docs/MICROSOFT_AUTH_SETUP.md`](./docs/MICROSOFT_AUTH_SETUP.md) (`AUTH_PROVIDER=microsoft_entra`).

Production build and checks:

```bash
npm run build          # shared → backend → frontend (vue-tsc + vite build + service worker)
npm run lint           # ESLint (frontend) + tsc --noEmit (backend)
npm run preview -w frontend   # serve the built PWA on http://localhost:4173 (API proxied)
```

## Using the office

| Action                         | How                                                              |
| ------------------------------ | ---------------------------------------------------------------- |
| Walk                           | WASD / arrow keys                                                |
| Interact with what's nearby    | `E` (person, desk, or the room you're in)                        |
| Select a person / room / desk  | Click it on the map                                              |
| Find a teammate                | `/` or the top-bar search → Enter focuses the camera on them     |
| Walk to someone                | "Walk to …" in their drawer (auto-navigation; moving or `Esc` cancels) |
| Zoom                           | Mouse wheel or the `−` / `+` buttons; click the percentage to reset |
| Close drawers                  | `Esc` or click empty floor                                       |
| Demo timeline controls         | The **Demo** pill, bottom-left (demo mode only)                  |

## Read next

- [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md) — system overview, Vue/Phaser
  bridge, stores, rendering, movement, backend modules, realtime.
- [`docs/AVATAR_SYSTEM.md`](./docs/AVATAR_SYSTEM.md) — avatar profiles, the
  catalog, layered rendering, the creator, realtime sync, adding options.
- [`docs/DEMO_MODE.md`](./docs/DEMO_MODE.md) — what demo mode enables, what it
  never bypasses, identities, the simulation.
- [`docs/ACTIVITY_ENGINE.md`](./docs/ACTIVITY_ENGINE.md) — how work-tool
  signals resolve into an employee's activity state.
- [`docs/MEETINGS_AND_TEAMS.md`](./docs/MEETINGS_AND_TEAMS.md) — meeting
  scheduling, room allocation, Teams join flow, future ACS embedding.
- [`docs/DATABASE_SCHEMA.md`](./docs/DATABASE_SCHEMA.md) — Supabase tables,
  migrations and the backend-only security model.
- [`docs/AZURE_PAT_AUTH.md`](./docs/AZURE_PAT_AUTH.md) — current sign-in: email +
  Azure DevOps token, security model, token scopes, renewal, sessions.
- [`docs/MICROSOFT_AUTH_SETUP.md`](./docs/MICROSOFT_AUTH_SETUP.md) — future Entra
  sign-in (needs IT approval), the employee seed, failure states.
- [`docs/AZURE_DEVOPS_SETUP.md`](./docs/AZURE_DEVOPS_SETUP.md) — delegated
  read scopes, connect flow, scheduled sync, activity mapping.
- [`docs/GAME_ROOM.md`](./docs/GAME_ROOM.md) — Game Room stations, external game
  providers (Lichess, papergames.io, PixoPlays), link security, sounds
- [`docs/PWA_DESKTOP.md`](./docs/PWA_DESKTOP.md) — install, updates, service
  worker caching rules, Windows auto-start.

## Design principles

1. **Vue owns the app shell. Phaser owns only the game world.** They never
   import each other directly — everything crosses through the typed
   `GameBridge`.
2. **Presence ≠ Activity.** Being connected to the app is not the same as
   what work tools say you're doing. Azure DevOps activity is never treated
   as proof someone is at their machine.
3. **Shared types, not duplicated strings.** Socket event names and domain
   shapes live once, in `shared/`, imported by both apps.
4. **Never auto-join calls.** Joining Teams is always an explicit user click
   that opens the real Teams URL. Microphone and camera are never touched.
5. **Simple multiplayer.** Server-authoritative broadcast only — this is a
   collaborative office, not a competitive game engine.

## Assets & licenses

All visual assets are **generated in code** at runtime: avatars (layered,
`frontend/src/game/avatars/`), furniture, floors, badges and UI shapes are
drawn with Canvas 2D. No third-party sprites, tilesets or images are used.
The one bitmap is the company's own logo
(`frontend/src/assets/branding/company-logo.png`, configured in
`frontend/src/core/config/branding.ts`).

Third-party packages that ship visual/typographic assets:

| Package                         | Used for       | License                               |
| ------------------------------- | -------------- | ------------------------------------- |
| `lucide-vue-next`               | UI icons       | ISC                                   |
| `@fontsource-variable/inter`    | Inter typeface | SIL Open Font License 1.1 (font), MIT |
| `phaser`                        | Game engine    | MIT                                   |
