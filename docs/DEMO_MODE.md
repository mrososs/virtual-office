# Demo mode

Demo mode runs the full office experience with a seeded company (Acme
Engineering — 12 people, 11 rooms, 16 desks, Teams meetings, Azure DevOps
work items / PRs / builds) and a scripted timeline, **without** any real
identity provider, database or third-party integration.

It is enabled **only by environment configuration**, separately on each side:

| Side     | Variable              | Where it is set                                  | Effect when `true`                                                                    |
| -------- | --------------------- | ------------------------------------------------ | ------------------------------------------------------------------------------------- |
| Frontend | `VITE_DEMO_MODE=true` | `frontend/.env.development` (dev server only)    | Demo sign-in, demo data source, demo simulation, demo control panel                   |
| Backend  | `DEMO_MODE=true`      | `backend/.env` (copy of `backend/.env.example`)  | Registers `DemoModule` → `POST /api/demo/session`. Ignored when `NODE_ENV=production` |

`vite build` runs in production mode and does not read `.env.development`,
so a production bundle has demo mode off unless someone sets
`VITE_DEMO_MODE=true` explicitly. The demo layer (`frontend/src/demo/`) is
only reached through dynamic `import()` calls behind `env.demoMode`, so it
ships as separate chunks that a non-demo build never loads.

## What demo mode bypasses — and what it does not

- **Frontend sign-in only.** `app/bootstrap/restoreSession.ts` calls
  `demoSessionService.start()`, which puts a demo identity into the auth store
  (`authStore.startDemoSession`). The router's `requiresAuth` guard is
  unchanged; it simply sees a signed-in (demo) user.
- **Production auth is intact.** `AuthService.login`, `JwtStrategy`, and
  `JwtAuthGuard` still protect every HTTP route. Demo tokens carry a
  `demo: true` claim and are **rejected** (HTTP and sockets) by any backend
  running without demo mode, even one that shares the signing secret.
- **Realtime is still authenticated.** The Socket.IO gateway verifies a JWT on
  every handshake (`auth.token`) in every mode. In demo mode the frontend
  gets that token from `POST /api/demo/session`
  (`{ employeeId, organizationId }` → a normal signed token with a
  `demo: true` claim). Without `DEMO_MODE=true` on the backend, that
  endpoint does not exist (the module isn't registered), so a demo frontend
  runs the office locally with the realtime pill showing **Local only**. The
  same happens when the backend is not running at all; the only console
  entry is then the browser's own network error for the token request.
- The backend logs a warning at startup whenever the demo module is active.

## Identities and multiplayer testing

Each browser tab picks its identity independently:

- `http://localhost:5173/office` — you are **Mohamed** (the default identity).
- `http://localhost:5173/office?demoUser=ahmed` — you are Ahmed (any demo
  first name or employee id works). The choice is remembered in
  `sessionStorage` for that tab only.
- The profile menu → **Open as…** opens another identity in a new tab.

Open two tabs with different identities to see each other move live. The
other person's avatar switches from scripted (NPC) to live control while
their tab is connected, and returns to the script when it closes.

## The simulation

`frontend/src/demo/simulation/demo-simulation.service.ts` plays the
deterministic timeline from `frontend/src/demo/simulation.demo.ts` (about
20 steps over ~160 s): the Frontend Daily Standup goes "starting soon" →
attendees walk to Meeting Room 1 → live → ended; a design review; PR
approvals and a code review; builds running and passing; coffee breaks;
focus time; a blocked bug getting unblocked. It loops after a 20 s pause.
Placement is never scripted by coordinates — the simulation only changes
activity/meeting state, and `resolveActivityPlacement` (in `shared`) decides
where each person should be.

The **Demo** pill (bottom-left of the office) controls it: pause/resume,
restart (reseeds all data), and manual triggers (start a meeting, code
review, break, build). It is only rendered when `VITE_DEMO_MODE=true`.

Everything the simulation does goes through the same stores and the same
`GameBridge` commands a real backend-driven office would use. The simulation
never manipulates Phaser objects directly.

## Never in demo mode

- No real Microsoft / Azure DevOps OAuth, Graph or REST calls.
- Demo meetings have **no join URL** (`joinUrl: null`); the Join button is
  disabled and explains why. No production Teams link is invented.
- Microphone and camera are never touched.
