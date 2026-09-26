# Demo mode

Demo mode runs the full office experience with a seeded team (the company
from `COMPANY_BRANDING` — 11 people, 11 rooms, 15 desks, Teams meetings,
Azure DevOps work items / PRs / builds) and a scripted timeline, **without**
any real identity provider, database or third-party integration.

The team: Karim (General Manager), Mariam (Project Manager), Mohamed (Team
Lead), Ahmed, Rana, Youssef, Omar and Tamer (Developers), Sara, Nour and Ali
(QA). Desks are assigned by role (`assignDesksByRole`): GM office, PM
office, Team Lead area, Development area, QA area. Everyone has a distinct
seeded avatar — chosen per person, never per role.

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
- **Production auth is intact and separate.** Every HTTP route is protected
  by `SessionAuthGuard` (the Microsoft-backed HttpOnly session cookie — see
  [`MICROSOFT_AUTH_SETUP.md`](./MICROSOFT_AUTH_SETUP.md)). JWTs are never
  accepted for HTTP at all. Demo identities (`emp-karim`, …) do not exist in
  the database and never become sessions.
- **Realtime is still authenticated.** In demo mode the frontend gets a demo
  token from `POST /api/demo/session` (`{ employeeId, organizationId }` → a
  signed token with a `demo: true` claim) and sends it in the Socket.IO
  handshake (`auth.token`). `DemoTokenService` verifies it **only while demo
  mode is on** (`DEMO_MODE=true` and `NODE_ENV≠production`), so a demo token
  is rejected by any other backend, even one sharing `JWT_SECRET`. Demo
  sockets never touch database presence or production broadcasts. Without
  `DEMO_MODE=true` the endpoint does not exist, so a demo frontend runs the
  office locally with the realtime pill showing **Local only**. The same
  happens when the backend is not running at all.
- The backend logs a warning at startup whenever the demo module is active.
- **Same floor plan.** Demo and production render the same HQ floor
  (`features/office/layout/hq-floor-plan.ts`); only the people and work data
  differ.

## Avatars in demo mode

- Teammates render with their seeded looks (`DEMO_AVATAR_LOOKS` in
  `employees.demo.ts`).
- **Your** avatar only exists once you save it: the first time you open the
  office as any demo identity in a browser, you land on `/profile/avatar` to create
  it (starting from that person's seeded look). After saving, you go
  straight to the office on every later visit.
- Saved looks are kept in `localStorage` (`vo:demo-avatar-profiles:v1`) by
  `demo/demo-avatar-profile.repository.ts` — demo-only; production uses the
  `AvatarProfileRepository` API boundary. Clear that key to see first-time
  setup again.
- Edit your avatar any time: profile menu → **Edit avatar** (an overlay over
  the running office). Connected teammates see the change live.

## Identities and multiplayer testing

Each browser tab picks its identity independently:

- `http://localhost:5173/office` — you are **Mohamed** (the default identity).
- `http://localhost:5173/office?demoUser=ahmed` — you are Ahmed (any demo
  first name or employee id works). The choice is remembered in
  `sessionStorage` for that tab only.
- The profile menu → **Open as…** opens another identity in a new tab.

Open two tabs with different identities to see each other move live. The
other person's avatar switches from scripted (NPC) to live control while
their tab is connected, and returns to the script when it closes. Their
saved look arrives with their join, and later changes arrive live — try it
from a private window, which shares no storage with the first one.

## The simulation

`frontend/src/demo/simulation/demo-simulation.service.ts` plays the
deterministic timeline from `frontend/src/demo/simulation.demo.ts` (about
18 steps over ~160 s): the Team Daily Standup goes "starting soon" →
attendees walk to Meeting Room 1 → live → ended; the release readiness
review (PM + QA) wraps up and QA goes back to testing at their desks; PR
approvals and a code review in the collaboration area; builds running and
passing; coffee breaks in the game room / kitchen; focus time at the desk; a
blocked bug getting unblocked. It loops after a 20 s pause.
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
