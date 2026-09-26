# Virtual Office — Architecture

## 1. Product concept

Virtual Office is a real-time 2D office for remote software teams. It visually
represents a real company:

```
Company tools (Azure DevOps, Microsoft Teams, Microsoft 365 Calendar)
        │
        ▼
  Activity Engine   (backend/src/modules/activities)
        │
        ▼
  Virtual Office     (Vue shell + Phaser world, realtime over Socket.IO)
```

It is built for **one internal software team** (iSaned). Employees have an
authorization role (General Manager, Project Manager, Team Lead, Developer,
QA), a job title and team that describe what they actually do ("Mobile
Flutter Developer" in "Mobile Development"), a personal desk in their role's
area, and an avatar they design themselves.
The floor has a General Manager office, a Project Manager office, a Team
Lead area, the Development and QA areas, two meeting rooms, a collaboration
(code review) area, a game room and a kitchen & lounge. Everyday work
(coding, building, testing) happens at the person's own desk; only meetings,
code review and breaks move people. Where an avatar appears can be informed
by real work activity (an active PR review, an upcoming Teams meeting) — but
the product must never imply surveillance. See [Presence vs. Activity](#presence-vs-activity).

## 2. Monorepo layout

```
virtual-office/            (repo root — plain npm workspaces, no Nx/Turborepo)
├── frontend/               Vue 3 + Phaser 3 app
├── backend/                 NestJS API + realtime gateway
├── shared/                   @virtual-office/shared — types & socket event contract
└── docs/                      this folder
```

`shared` is the single source of truth for domain types (`Employee`, `Room`,
`Meeting`, ...) and the Socket.IO event contract (`SOCKET_EVENTS` + payload
types). Both `frontend` and `backend` depend on it via the npm workspace
(`"@virtual-office/shared": "*"`) — event names and payload shapes are never
duplicated or hand-typed as strings on either side.

## 3. Frontend architecture

Vue owns the application shell (auth, dashboard, settings, employee profiles,
meeting details, notifications, room configuration). Phaser owns ONLY the
game world (map, rooms, avatars, movement, collisions, camera). The two are
never coupled directly — no Vue component imports a Phaser scene, and no
Phaser system imports a Vue component or Pinia store directly.

```
Vue  ──emit──▶  GameBridge  ──emit──▶  Phaser
Phaser ──emit──▶  GameBridge  ──emit──▶  Vue (via Pinia store actions / composables)
```

`frontend/src/game/bridge/GameBridge.ts` is a strongly typed pub/sub
singleton (mitt); `GameEvents.ts` holds the event names and the payload map.
No magic strings — every event name is a typed constant.

| Direction    | Events                                                                                                                                                                                                                                                                              |
| ------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Phaser → Vue | `GAME_READY`, `OFFICE_LOADED`, `GAME_ERROR`, `EMPLOYEE_CLICKED`, `DESK_CLICKED`, `ROOM_CLICKED`, `BACKGROUND_CLICKED`, `OPEN_MEETING_DETAILS`, `MEETING_JOIN_REQUESTED`, `PLAYER_ENTERED_ROOM`, `PLAYER_LEFT_ROOM`, `EMPLOYEE_ROOM_CHANGED`, `EMPLOYEE_ARRIVED`, `INTERACTION_AVAILABLE`, `CAMERA_CHANGED`, `LOCAL_NAVIGATION_CHANGED`, `REALTIME_STATUS_CHANGED`, `LIVE_EMPLOYEES_CHANGED`, `REMOTE_AVATAR_RECEIVED` |
| Vue → Phaser | `OFFICE_INIT`, `RESET_OFFICE`, `SET_EMPLOYEE_STATUS`, `SET_EMPLOYEE_APPEARANCE`, `MOVE_EMPLOYEE`, `SET_ROOM_MEETING`, `SET_SELECTION`, `FOCUS_EMPLOYEE`, `FOCUS_ROOM`, `RECENTER_CAMERA`, `SET_ZOOM`, `NAVIGATE_LOCAL_PLAYER`, `CANCEL_LOCAL_NAVIGATION`                                          |

Inside the scene, `OfficeCommandRouter` subscribes to the Vue → Phaser
commands and catches handler errors (reported back as `GAME_ERROR`), so one
bad command cannot kill the render loop.

### 3.1 Stores (single owner per concern)

| Store          | Owns                                                                                |
| -------------- | ----------------------------------------------------------------------------------- |
| `auth`         | Signed-in user, demo-session flag, realtime token                                   |
| `office`       | Office/floor/map definition (`markRaw`), load / game / realtime status             |
| `employee`     | Employees (incl. role), presence, activity, everyone's `AvatarProfile`, online count |
| `avatar`       | The signed-in user's own avatar: loaded/saved via the repository, drives first-time setup |
| `room`         | Rooms, desks, **derived** occupancy (from reported room membership, never hard-coded) |
| `meeting`      | Meetings, status transitions, "current meeting for room", live count                |
| `work`         | Azure DevOps-shaped work items, pull requests, builds, sprint                       |
| `ui`           | Selection, nearby interaction, local room, zoom, camera-follow, live-connected ids  |
| `notification` | Inbox and transient toasts                                                          |
| `feed`         | Activity feed entries                                                               |
| `demo`         | Simulation status for the control panel: running/paused, clock, last/next step      |

Stores hold **state**, never positions per frame: avatar coordinates live
only inside Phaser. Vue learns about movement at the granularity it needs
(room entered/left, arrived, nearby interaction).

### 3.2 The office "director" and narrator

- `features/office/composables/useOfficeWorldSync.ts` is the **only** Vue
  code that pushes store state into Phaser. It watches the stores and sends
  diffs (`SET_EMPLOYEE_STATUS`, `SET_EMPLOYEE_APPEARANCE`, `MOVE_EMPLOYEE`,
  `SET_ROOM_MEETING`, …) keyed by a signature per entity, so unchanged
  entities cost nothing.
  One-off user commands (focus camera, zoom, walk to, cancel walk) go
  through `useOfficeCommands.ts`; components never emit bridge events
  themselves.
- Placement (where someone should be) is decided by
  `resolveActivityPlacement` in `shared/src/domain/activity-placement.ts`:
  presence gates visibility (offline ⇒ hidden), activity picks a target
  through data-driven rules (work activities incl. `TESTING` and `FOCUS` →
  own desk, `CODE_REVIEW` → the collaboration area, `MEETING` → that
  meeting's room, `BREAK` → a `BREAK` room), and rooms of the same type are
  spread by load. Someone without a desk goes to their role's home area
  (`ROLE_CONFIG[role].defaultAreaType`). The backend can reuse the same policy.
- `features/activity/composables/useOfficeNarrator.ts` turns store
  transitions into feed entries and toasts.

### 3.3 Data sources

`features/office/data/office-data-source.ts` defines `OfficeDataSource`
(returns an `OfficeSnapshot`). `resolveOfficeDataSource(demoMode)` picks the
demo source (dynamic import of `src/demo/`) or the API source:
`GET /api/office/state` (members with presence + resolved activity, avatar
profiles, synced Azure DevOps work) composed with the static HQ floor plan
(`features/office/layout/hq-floor-plan.ts`, ids from
`shared/src/domain/hq-floor-plan.ts` — one physical office for demo and
production). See [`DEMO_MODE.md`](./DEMO_MODE.md).

`core/socket/socket-client.ts` wraps Socket.IO, typed against `shared`'s
`ClientToServerEvents`/`ServerToClientEvents`. Production sockets are
same-origin and authenticated by the HttpOnly session cookie; demo sockets
send a demo token (`auth.token`). Vue subscribes to domain events through
`socketClient.on()` (`useOfficeLiveUpdates`: presence, activity,
`work:synced`, `session:ended`) — subscriptions survive reconnects, and a
reconnect reloads the office state.

### 3.4 Authentication (backend-for-frontend)

Sign-in is pluggable (`AUTH_PROVIDER`, read once by `ActiveAuthProvider`):

| Provider          | Proof of identity                                          | Status  |
| ----------------- | ---------------------------------------------------------- | ------- |
| `azure_pat`       | work email + Azure DevOps PAT → `connectionData` identity → approved employee ([`AZURE_PAT_AUTH.md`](./AZURE_PAT_AUTH.md)) | current |
| `microsoft_entra` | Entra single-tenant auth code + PKCE ([`MICROSOFT_AUTH_SETUP.md`](./MICROSOFT_AUTH_SETUP.md)) | inactive until IT approves an app registration |
| `demo`            | demo identities (development only)                         | dev     |

Each provider (`AzurePatAuthProvider`, `MicrosoftEntraAuthProvider`) only
decides *which approved employee* this is; `SignInService` then starts the
same server-side session for all of them. Kept separate: application
authentication (session cookie), the external Azure credential
(`AzureCredentialService`: PAT now, Entra token later), employee identity
(`employees` + `azure_devops_identities`) and activity data (normalized
`azure_*` tables → Activity Engine). The SPA's only credential is the
HttpOnly `vo_session` cookie; it learns who is signed in from
`GET /api/auth/me` (normalized employee, role from our DB, avatar, desk,
Azure connection status), never from provider tokens or claims. The login
page asks `GET /api/auth/config` which form to show. `app/bootstrap/restoreSession.ts` calls it before
the first navigation; guards route to `/login` (sign-in is always a click,
so failures never loop) and to `/profile/avatar` on first login. Sign-out
reloads to `/login`, tearing down Phaser, the socket and all stores.

### 3.5 Desktop app (PWA)

`vite-plugin-pwa` (prompt-to-update service worker, app-shell precache only,
`/api` and `/socket.io` never cached). See [`PWA_DESKTOP.md`](./PWA_DESKTOP.md).

## 4. Phaser architecture

Scenes: `BootScene` → `PreloadScene` → `OfficeScene`. `OfficeScene` only
orchestrates systems/managers — it must never grow into a god-object holding
networking logic, movement logic, and UI logic inline.

- **Systems** (`game/systems/`): `MovementSystem`, `CollisionSystem`,
  `InteractionSystem`, `PresenceSystem`, `AnimationSystem`, `RoomSystem`,
  `AutoMovementSystem` — one responsibility each.
- **Managers** (`game/managers/`): `PlayerManager`, `EmployeeManager`,
  `RoomManager`, `DeskManager`, `OfficeMapManager`, `InteractionManager`,
  `MeetingRoomManager`, `CameraManager` — own collections of entities and
  coordinate systems.
- **Network** (`game/network/`): `OfficeSocket`, `PlayerSync`, `PresenceSync`
  — the only place Socket.IO is touched inside the game layer.
- Room *domain* models (`shared`'s `Room`) are mapped to Phaser-side visuals
  in `game/rooms/` — rendering and domain stay decoupled, so a `RoomType`
  can be re-skinned without touching backend/domain code.
- **Maps** (`game/maps/`): `OfficeMapDefinition` is plain data (floors,
  walls with door gaps, furniture, rugs, room spots). The demo floor is
  defined in `src/demo/office.demo.ts`; a Tiled/JSON or office-builder
  loader can produce the same shape later.
- **Navigation** (`game/navigation/`): an 8 px `NavigationGrid` built from
  the building footprint and furniture/wall blockers (dilated by one cell of
  clearance), A* with a binary heap, then turn compression and line-of-sight
  smoothing. Unreachable targets fall back to a fade-teleport for NPCs.
- **Physics**: Arcade physics is used only for the local player (a small
  feet body against static blocker zones). NPCs and remote players move
  kinematically along paths / server positions.

### 4.1 Rendering and performance

- **Art is procedural** (`game/rendering/`, `game/avatars/`): avatars,
  ~30 furniture kinds, badges and UI shapes are drawn once with Canvas 2D
  into textures. The only bitmap is the company logo (see §4.2).
- **Avatars are layered** (body, bottom, shoes, top, hair, accessory, plus
  back hair) and built from each person's `AvatarProfile` by one renderer
  for the local player, NPCs and remote players. Layer textures are shared
  and reference-counted; one animation controller drives all layers. See
  [`AVATAR_SYSTEM.md`](./AVATAR_SYSTEM.md).
- **HiDPI**: the canvas backing store is CSS size × device pixel ratio
  (clamped to 1–2) with `Scale.NONE`; textures are rasterized at 2–3× so
  they stay crisp at any zoom (`render-scale.ts`).
- **No per-frame vector work.** Phaser re-tessellates `Graphics` objects
  every frame, and rounded, stroked shapes are expensive. Label pills, room
  chips, meeting signs, nameplates, tooltips and selection rings are cached
  textures keyed by style and size (`ui-textures.ts`). Floor finishes are
  `TileSprite`s, and rugs and the building shadow are baked images. The
  remaining `Graphics` draw only plain rects and straight lines. Measured
  on an integrated GPU at 1920×1080, this cut `renderer.render` from ~30 ms
  to ~4 ms per frame (25–33 fps → 60 fps).
- Depth is Y-sorted: avatars set `depth = y` every frame, and furniture and
  desks get a static depth from the bottom of their footprint, so people
  walk behind and in front of objects correctly. Fixed layers (floors, rugs,
  walls, labels, tooltips) use constants from `depth.ts`.
- A dev-only debug handle, `window.__VO_OFFICE__` (installed only when
  `import.meta.env.DEV`), exposes a read-only snapshot of avatars, occupancy
  and camera for runtime testing.

### 4.2 Company branding

`frontend/src/core/config/branding.ts` (`COMPANY_BRANDING`) is the single
place the company name, product name, logo and brand accent are defined.
The logo is a bundled asset (`src/assets/branding/company-logo.png`,
imported through Vite — never an absolute path). The Vue shell (top bar,
onboarding header, loading screen, sign-in, tab title) and Phaser both read
the config; Phaser never imports Vue.

- `PreloadScene` loads the logo once under `logoAssetKey` (cached like any
  texture).
- Where signage hangs is map data: `OfficeMapDefinition.signage.companySign`
  (center + size). On the demo floor it is mounted on the reception wall
  behind the reception desk.
- `OfficeMapManager` builds a `CompanySign`: a dark wall panel with the
  logo (aspect ratio preserved) and the company name, baked into one
  texture at wall depth. It is decorative only — no physics body, no input,
  not part of the navigation grid.
- If the logo cannot load, the sign shows the company name alone, the top
  bar drops the image, and a development warning is logged.

## 5. Movement architecture

Every avatar has a `PlayerControlMode` (from `shared`):

- `MANUAL` — the human is actively driving via WASD/arrow keys.
- `AUTO_NAVIGATION` — the system is walking the avatar to a target (e.g. a
  meeting starting soon, a break).
- `STATIC` — not moving (idle at desk, offline ghost).

`AutoMovementSystem` must never override a player currently in `MANUAL`
mode — it queues/defers instead. This keeps human control authoritative
while still allowing "meeting starting → walk to Meeting Room 1" automation.
Conversely, any manual input cancels an auto-walk of the local player
("Walk to …" from a drawer), and `Esc` cancels it from the UI.

Avatars have a controller as well as a mode: `LOCAL` (this tab's human),
`NPC` (scripted/placement-driven), or `REMOTE` (another connected tab —
positions come from the server and are interpolated). When a person
connects, their NPC avatar switches to `REMOTE`; on disconnect it returns
to `NPC` and the placement policy takes over again.

## 6. Backend architecture

Modular NestJS app (`backend/src/modules/*`), one module per bounded
context: `session` (app sessions + `SessionAuthGuard`, global), `entra`
(MSAL Node — inactive until an Entra app registration exists), `auth`
(`/auth/config`, Azure DevOps PAT sign-in, future Microsoft login/callback,
`/auth/me`, logout), `employees`,
`avatars`, `offices` (incl. `/office/state`), `rooms`, `meetings`,
`presence`, `activities`, `realtime`, `azure-devops` (read client with pluggable
credentials — PAT now, Entra later — scheduled sync, identity mapping,
Integrations API), `microsoft` (Graph,
next phase), `webhooks` (future Service Hooks), `demo`, plus the reserved
`organizations`/`teams` stubs. Cross-cutting concerns live in `common/`
(security: crypto + CSRF origin check; supabase; filters/interceptors) and
`config/` (typed config + fail-fast env validation).

Data access goes through one repository per table
(`EmployeeRepository`, `AvatarProfileRepository`, `SessionRepository`,
`MicrosoftTokenCacheRepository`, `PresenceRepository`,
`AzureWorkItemRepository`, `AzurePullRequestRepository`,
`AzureBuildRepository`, …) — controllers never query Supabase. A database
failure surfaces as HTTP 503 (`database_unavailable`).

All HTTP routes are served under the `/api` prefix and protected by
`SessionAuthGuard` (HttpOnly session cookie → `app_sessions`). Unsafe
methods must carry the app's own `Origin` (CSRF defense on top of
SameSite=Lax). The optional `demo` module is registered only when
`DEMO_MODE=true` and `NODE_ENV` is not `production`
(`ConditionalModule.registerWhen`); demo tokens are verified only while demo
mode is on. See [`DEMO_MODE.md`](./DEMO_MODE.md).

`realtime/office.gateway.ts` is the only NestJS WebSocket Gateway, typed
against `shared`'s `ServerToClientEvents`/`ClientToServerEvents`/`SocketData`.
Multiplayer is intentionally simple: **server-authoritative position
broadcasting**, no rollback, no client prediction, no lag compensation — this
is a collaborative office, not a competitive game.

```
Client moves → player:move → Nest validates → broadcasts player:position → other clients update RemotePlayer
```

Avatar appearance travels separately and rarely: the joiner's
`AvatarProfile` is sent once in `office:join` (and replayed to late joiners
in `player:joined`); a saved change is sent as `player:avatar_update`,
validated against the shared avatar catalog, and relayed as
`player:avatar_updated`. Movement packets never carry appearance.

- **Handshake auth**: a Socket.IO middleware checks the `Origin` against
  `APP_URL`, then resolves the **session cookie** to an employee (production)
  — or, only in demo mode, verifies a demo token from `handshake.auth.token`.
  `employeeId`, `organizationId` and `sessionId` go into `socket.data`; the
  client never names itself. Production sockets may only join the configured
  office.
- **Identity is server-side**: `office:join` and `player:move` are accepted
  only for the socket's own employee, and positions are validated before
  they are relayed to the *other* members of the office room.
- **Late joiners & multiple tabs**: `OfficePresenceRegistry` (in memory)
  keeps one member per employee with the set of their open sockets; a new
  member receives a snapshot of everyone already there, and `player:left` is
  sent only when an employee's *last* connection closes.
- **Presence** (session sockets): join/leave call the atomic
  `presence_connect`/`presence_disconnect` functions and broadcast
  `employee:presence_changed` when someone comes online or goes offline.
- **Domain broadcasts**: Activity Engine changes →
  `employee:activity_changed`; a finished Azure sync → `work:synced`; a
  signed-out/expired session → `session:ended` and its sockets are closed.
- The client throttles position packets to ~11/s while moving and always
  sends a final packet when the player stops.

## 7. Activity Engine

See [`ACTIVITY_ENGINE.md`](./ACTIVITY_ENGINE.md).

## 8. Meetings & Microsoft Teams

See [`MEETINGS_AND_TEAMS.md`](./MEETINGS_AND_TEAMS.md).

## 9. Database

See [`DATABASE_SCHEMA.md`](./DATABASE_SCHEMA.md).

## 10. Presence vs. Activity

These are deliberately separate fields on `Employee` (`shared/src/types`):

- `EmployeePresence` — is the person connected to the Virtual Office right
  now (`ONLINE` / `OFFLINE`; `AWAY` reserved). Set only by the realtime
  gateway from office socket joins/leaves, counted per connection
  (`employee_presence.socket_count`) — never from Microsoft sign-in state or
  Azure DevOps.
- `EmployeeActivity` — what the employee appears to be doing (`WORKING`,
  `CODE_REVIEW`, `MEETING`, `BREAK`, ...), resolved by the Activity Engine
  from work-tool signals.

**Azure DevOps activity is never used as proof someone is at their machine.**
An employee can be `OFFLINE` (presence) while Azure DevOps still reports an
active work item (the office hides offline people regardless, and their
status line reads "Offline"), or `ONLINE` with no work signal at all
(`AVAILABLE`). Never collapse these into a single field.

## 11. Roles

`Employee.role` is one of `GENERAL_MANAGER`, `PROJECT_MANAGER`, `TEAM_LEAD`,
`DEVELOPER`, `QA` (`shared/src/types/role.types.ts`). Everything a role
implies is data in `ROLE_CONFIG` (`shared/src/domain/role-config.ts`):
display label, group heading, default work area (a `RoomType`) and display
order. `assignDesksByRole` gives each person the first free desk in their
role's area. Adding a role (e.g. `DEVOPS`) is one union member plus one
config entry, and a room of its area type if it gets its own area. Code
never branches on role values, and roles never influence avatar appearance.

**Role ≠ job title.** `role` is authorization; what a person does lives in
`jobTitle`, `team` and `discipline` (`EmployeeProfileFields`, columns
`job_title`, `team`, `discipline`, set by the employee seed). The UI shows
`employeeTitle()` — the job title, falling back to the role label — and the
Team panel groups by team (`groupEmployeesByTeam()`, ordered by each team's
most senior role), falling back to role groups when no team is set
(`shared/src/domain/employee-profile.ts`). Today no endpoint grants more by
role, so professions without a matching role (Business Analyst, UX/UI
Designer) use `DEVELOPER`, the least privileged one, and sit in the shared
Development area; a new role is added only when a real permission needs it.

## 12. Current scope and non-goals

Implemented: the office UI, the Phaser world (map, collisions, pathfinding,
camera), the seeded demo team and simulation, role configuration, user-owned
layered avatars with the avatar creator and live sync, company branding,
derived occupancy, meeting lifecycle, drawers/panels/search/notifications/feed,
tab-to-tab multiplayer with authenticated sockets, Microsoft Entra sign-in
(single tenant, BFF sessions), Supabase persistence (employees, avatars,
sessions, presence, encrypted token caches), the API-backed office, the
installable PWA, and the read-only Azure DevOps integration (delegated Entra
OAuth, scheduled sync, identity mapping, Activity Engine feed).

Explicitly out of scope until later milestones:

- Microsoft Graph calendar / Teams meetings sync (the delegated token
  architecture is ready; meetings are empty in production for now).
- Azure DevOps Service Hooks (push) — the endpoint exists but is disabled.
- Embedded Teams calls via Azure Communication Services (architecture-only,
  see `MEETINGS_AND_TEAMS.md` §Future), audio/video, screen sharing.
- Office builder, AI features, permission-based RBAC (roles today are
  labels + default areas only), billing, multi-company branding.
- Client-side prediction, lag compensation, or a horizontally scaled
  presence registry (today it is in-memory, single instance).
- Auto-enabling microphone/camera or auto-joining calls — never implemented,
  not even behind a flag.
