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

Employees have avatars, personal desks, and move through rooms (Development,
Design, QA, Code Review, Manager, Meeting, Focus, Game, Kitchen, Lounge,
General Work Area). Where an avatar appears can be informed by real work
activity (an active PR review, an upcoming Teams meeting) — but the product
must never imply surveillance. See [Presence vs. Activity](#presence-vs-activity).

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
| Phaser → Vue | `GAME_READY`, `OFFICE_LOADED`, `GAME_ERROR`, `EMPLOYEE_CLICKED`, `DESK_CLICKED`, `ROOM_CLICKED`, `BACKGROUND_CLICKED`, `OPEN_MEETING_DETAILS`, `MEETING_JOIN_REQUESTED`, `PLAYER_ENTERED_ROOM`, `PLAYER_LEFT_ROOM`, `EMPLOYEE_ROOM_CHANGED`, `EMPLOYEE_ARRIVED`, `INTERACTION_AVAILABLE`, `CAMERA_CHANGED`, `LOCAL_NAVIGATION_CHANGED`, `REALTIME_STATUS_CHANGED`, `LIVE_EMPLOYEES_CHANGED` |
| Vue → Phaser | `OFFICE_INIT`, `RESET_OFFICE`, `SET_EMPLOYEE_STATUS`, `MOVE_EMPLOYEE`, `SET_ROOM_MEETING`, `SET_SELECTION`, `FOCUS_EMPLOYEE`, `FOCUS_ROOM`, `RECENTER_CAMERA`, `SET_ZOOM`, `NAVIGATE_LOCAL_PLAYER`, `CANCEL_LOCAL_NAVIGATION`                                                                         |

Inside the scene, `OfficeCommandRouter` subscribes to the Vue → Phaser
commands and catches handler errors (reported back as `GAME_ERROR`), so one
bad command cannot kill the render loop.

### 3.1 Stores (single owner per concern)

| Store          | Owns                                                                                |
| -------------- | ----------------------------------------------------------------------------------- |
| `auth`         | Signed-in user, demo-session flag, realtime token                                   |
| `office`       | Office/floor/map definition (`markRaw`), teams, load / game / realtime status       |
| `employee`     | Employees, presence, activity, avatar appearance, derived online count              |
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
  diffs (`SET_EMPLOYEE_STATUS`, `MOVE_EMPLOYEE`, `SET_ROOM_MEETING`, …) keyed
  by a JSON signature per entity, so unchanged entities cost nothing.
  One-off user commands (focus camera, zoom, walk to, cancel walk) go
  through `useOfficeCommands.ts`; components never emit bridge events
  themselves.
- Placement (where someone should be) is decided by
  `resolveActivityPlacement` in `shared/src/domain/activity-placement.ts`:
  presence gates visibility (offline ⇒ hidden), activity picks a target
  through data-driven rules (e.g. `CODE_REVIEW` → a Code Review room,
  `MEETING` → that meeting's room, `BREAK` → Game/Lounge/Kitchen), and rooms
  of the same type are spread by load. The backend can reuse the same policy.
- `features/activity/composables/useOfficeNarrator.ts` turns store
  transitions into feed entries and toasts.

### 3.3 Data sources

`features/office/data/office-data-source.ts` defines `OfficeDataSource`
(returns an `OfficeSnapshot`). `resolveOfficeDataSource(demoMode)` picks the
demo source (dynamic import of `src/demo/`) or the API source (not
implemented yet — it throws a clear error that the page renders as an error
state). See [`DEMO_MODE.md`](./DEMO_MODE.md).

`core/socket/socket-client.ts` wraps Socket.IO, typed against `shared`'s
`ClientToServerEvents`/`ServerToClientEvents`, and sends the access token in
the handshake (`auth.token`).

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

- **All art is procedural** (`game/rendering/`): characters (4 directions ×
  4 poses, 7 hair styles), ~30 furniture kinds, badges and UI shapes are
  drawn once with Canvas 2D into textures. There are no binary assets.
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
context: `auth`, `users`, `organizations`, `teams`, `employees`, `offices`,
`rooms`, `meetings`, `presence`, `activities`, `realtime`, `azure-devops`,
`microsoft`, `webhooks`. Cross-cutting concerns live in `common/`
(guards/decorators/filters/interceptors/utils) and `config/`.

All HTTP routes are served under the `/api` prefix. Production auth
(`AuthService`, `JwtStrategy`, `JwtAuthGuard`) protects them; the optional
`demo` module is registered only when `DEMO_MODE=true` and `NODE_ENV` is
not `production` (`ConditionalModule.registerWhen`). See
[`DEMO_MODE.md`](./DEMO_MODE.md).

`realtime/office.gateway.ts` is the only NestJS WebSocket Gateway, typed
against `shared`'s `ServerToClientEvents`/`ClientToServerEvents`/`SocketData`.
Multiplayer is intentionally simple: **server-authoritative position
broadcasting**, no rollback, no client prediction, no lag compensation — this
is a collaborative office, not a competitive game.

```
Client moves → player:move → Nest validates → broadcasts player:position → other clients update RemotePlayer
```

- **Handshake auth**: a Socket.IO middleware verifies the JWT from
  `handshake.auth.token` and stores `employeeId` / `organizationId` in
  `socket.data`. Connections without a valid token are rejected.
  (Not yet enforced: that the token's organization owns the office being
  joined — a TODO in `handleOfficeJoin`, needed once offices are persisted.)
- **Identity is server-side**: `office:join` and `player:move` are accepted
  only for the employee in the token, and positions are validated before
  they are relayed to the *other* members of the office room.
- **Late joiners**: `OfficePresenceRegistry` (in memory) remembers who is in
  each office with their last position; a new member receives a snapshot of
  everyone already there. On disconnect a member is removed only if the
  disconnecting socket is still their current one (a reload doesn't
  "leave" the newer tab).
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

- `EmployeePresence` — is the client connected right now (`ONLINE` / `AWAY` /
  `OFFLINE`). Set only by the realtime gateway on connect/disconnect/heartbeat.
- `EmployeeActivity` — what the employee appears to be doing (`WORKING`,
  `CODE_REVIEW`, `MEETING`, `BREAK`, ...), resolved by the Activity Engine
  from work-tool signals.

**Azure DevOps activity is never used as proof someone is at their machine.**
An employee can be `OFFLINE` (presence) while still showing `PR_UNDER_REVIEW`
style activity from a stale signal window, or `ONLINE` with `UNKNOWN`
activity. Never collapse these into a single field.

## 11. Current scope and non-goals

Implemented: the office UI, the Phaser world (map, collisions, pathfinding,
camera), the seeded demo company and simulation, derived occupancy, meeting
lifecycle, drawers/panels/search/notifications/feed, and tab-to-tab
multiplayer with authenticated sockets.

Explicitly out of scope until later milestones:

- Real Azure DevOps / Microsoft Graph API calls and OAuth (service stubs only).
- The API-backed office data source (Supabase persistence for offices,
  employees, meetings).
- Embedded Teams calls via Azure Communication Services (architecture-only,
  see `MEETINGS_AND_TEAMS.md` §Future), audio/video, screen sharing.
- Office builder, AI features, permissions/roles, billing.
- Client-side prediction, lag compensation, or a horizontally scaled
  presence registry (today it is in-memory, single instance).
- Auto-enabling microphone/camera or auto-joining calls — never implemented,
  not even behind a flag.
