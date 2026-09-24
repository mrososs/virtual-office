# Virtual Office

A real-time 2D virtual office for remote software teams — avatars, desks,
rooms and meetings, with activity informed by Azure DevOps, Microsoft Teams
and Microsoft 365 Calendar.

The current build is a **functional demo**: a polished office (11 rooms,
16 desks, 12 people) running on seeded data and a scripted timeline, with
real Socket.IO multiplayer between browser tabs. Real Microsoft/Azure
integrations are not implemented yet; their service boundaries exist as
stubs. See [`docs/DEMO_MODE.md`](./docs/DEMO_MODE.md).

## Structure

```
virtual-office/
├── frontend/   Vue 3 + TypeScript + Vite + Pinia + Vue Router + Phaser 3 + Tailwind
├── backend/    NestJS + Socket.IO gateway + Supabase (PostgreSQL)
├── shared/     @virtual-office/shared — domain types, placement policy, realtime contract
└── docs/       architecture, demo mode, database schema, meetings/Teams, activity engine
```

Plain npm workspaces monorepo — no Nx/Turborepo.

## Run it

Requires Node 20+ (developed on Node 24).

```bash
npm install                                # all three workspaces
cp backend/.env.example backend/.env       # DEMO_MODE=true is preset for local use
npm run build:shared                       # build @virtual-office/shared first

npm run dev:backend                        # NestJS API + realtime → http://localhost:3001/api
npm run dev:frontend                       # Vite → http://localhost:5173/office
```

The frontend's `frontend/.env.development` already sets `VITE_DEMO_MODE=true`,
so the dev server opens straight into the demo office as **Mohamed**. The
backend is optional for single-tab use (the office then runs "Local only");
it is required for multiplayer.

**Multiplayer check:** open `http://localhost:5173/office` and, in another
browser window (or a private one), `http://localhost:5173/office?demoUser=ahmed`.
Each tab sees the other avatar move live.

Production build of everything:

```bash
npm run build          # shared → backend → frontend (vue-tsc + vite build)
npm run lint           # ESLint (frontend) + tsc --noEmit (backend)
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
- [`docs/DEMO_MODE.md`](./docs/DEMO_MODE.md) — what demo mode enables, what it
  never bypasses, identities, the simulation.
- [`docs/ACTIVITY_ENGINE.md`](./docs/ACTIVITY_ENGINE.md) — how work-tool
  signals resolve into an employee's activity state.
- [`docs/MEETINGS_AND_TEAMS.md`](./docs/MEETINGS_AND_TEAMS.md) — meeting
  scheduling, room allocation, Teams join flow, future ACS embedding.
- [`docs/DATABASE_SCHEMA.md`](./docs/DATABASE_SCHEMA.md) — Postgres/Supabase
  table design.

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

All visual assets are **generated in code** at runtime: characters,
furniture, floors, badges and UI shapes are drawn with Canvas 2D in
`frontend/src/game/rendering/`. No third-party sprites, tilesets or images
are used.

Third-party packages that ship visual/typographic assets:

| Package                         | Used for       | License                               |
| ------------------------------- | -------------- | ------------------------------------- |
| `lucide-vue-next`               | UI icons       | ISC                                   |
| `@fontsource-variable/inter`    | Inter typeface | SIL Open Font License 1.1 (font), MIT |
| `phaser`                        | Game engine    | MIT                                   |
