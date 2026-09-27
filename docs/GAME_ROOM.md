# Game Room — stations, external games and sounds

The Game Room is a social break space, not a game platform. The office
coordinates **who plays where**; established browser games run the actual
gameplay (rules, networking, latency, scoring, reconnection) in their own tab.

```text
Office (Vercel SPA) ──socket (low-frequency)──► Railway API: who sits at which table, which private room
        │
        └── "Open game" → new tab ──────────────► provider site (lichess.org, papergames.io, pixoplays.com)
```

## GameStation

A station is a physical spot in the office (`shared/src/domain/game-stations.ts`):

```ts
{ id: 'game-chess-01', gameType: 'CHESS', name: 'Chess Table', roomId: HQ_ROOM.game,
  capacity: 2, launchType: 'EXTERNAL_URL', providerId: 'lichess' }
```

| Station | Game | Provider | Room mode |
| --- | --- | --- | --- |
| `game-pong-01` Ping Pong Table | Ping Pong | PixoPlays Pong | `ROOM_CODE` |
| `game-chess-01` Chess Table | Chess | Lichess | `API_CREATED_ROOM` |
| `game-tictactoe-01` Tic-Tac-Toe Table | Tic-Tac-Toe | papergames.io | `MANUAL_INVITE_LINK` |
| `game-connect4-01` Connect Four Table | Connect Four | papergames.io | `MANUAL_INVITE_LINK` |

Public state, broadcast to the whole office: `AVAILABLE` (0/2) · `WAITING`
(1/2, `joinable` once the host's room exists) · `IN_GAME` (2/2). Players see
temporary context on their avatar ("Waiting for Chess", "Playing Chess");
presence stays ONLINE and the stored Azure activity is never changed.

The floor plan places each station by id (`features/office/layout/hq-floor-plan.ts`,
`stations` + the furniture carrying `stationId`). Walking up to a table shows
"Press E"; E, a click on the table or on its chip opens **one generic panel**
(`features/games/game-room/GameStationPanel.vue`) for every station.

## Launch types

- **`EXTERNAL_URL`** — every station today. The backend never simulates the game.
- **`INTERNAL_GAME`** — our own engine. The internal Pong engine
  (`backend/src/modules/games/pong/`, `features/games/pong/`) is kept for a
  possible future use but **no station uses it**: its 30 Hz loop is created only
  for an `INTERNAL_GAME` session, so today there is zero Pong simulation,
  no `game:state` traffic and no timer. To bring it back, set a station's
  `launchType: 'INTERNAL_GAME'` (no provider).

## Providers and room modes

`shared/src/domain/game-providers.ts` is the only place a provider is defined:
name, game, room mode, the fixed start page, allowed hostnames, allowed path
pattern, allowed query parameters, short host steps and a one-line note.

| Room mode | How the room exists | What the host does |
| --- | --- | --- |
| `API_CREATED_ROOM` | the backend calls the provider's documented public API | nothing — press Play |
| `MANUAL_INVITE_LINK` | the host creates it on the provider's site | paste the invite link |
| `ROOM_CODE` | the host creates it on the provider's site; the provider has no invite links | paste the room code |

### What was verified (September 2026, two isolated browser sessions, no accounts)

| Provider | Private room | Login | Invite behaviour | Allowed host | Notes |
| --- | --- | --- | --- | --- | --- |
| **Lichess** (chess) | documented [open challenge API](https://lichess.org/api#tag/Challenges/operation/challengeOpen) (`POST /api/challenge/open`, no auth) | none — anonymous | returns `https://lichess.org/{id}?color=white` / `?color=black`; each player gets their own seat link; both landed in the same game | `lichess.org` | ad-free, open source. Created as casual 10+5, expires after 1 h |
| **papergames.io** (tic-tac-toe, connect 4) | "Play with a friend" | guest nickname only | `https://papergames.io/en/r/{room}/{code}` — the code pre-fills; both guests played the same game | `papergames.io` | shows display ads and a small corner video ad around the lobby/board. Its API is a paid "games as a service" product, so rooms stay manual |
| **PixoPlays Pong** (ping pong) | Multiplayer → Host game | guest mode | **no invite links**: a 6-character room code, typed under Join game; peer-to-peer match ran between both guests | `pixoplays.com` | no ads seen. Peer-to-peer (WebRTC): very locked-down networks may block it; a stale room returned "peer-unavailable" once |

Rejected: `multiplayer-pong.netlify.app` (connection timed out),
`pong-multiplayer.eu` (unreachable), the itch.io "Ping Pong Arcade" (room-ID
P2P never connected), pingpong5d.com (needs phones as controllers).

## Session lifecycle

```text
host presses Play      → SETUP (1/2)   API mode: room created server-side → WAITING
host shares link/code  → WAITING (1/2, joinable) — validated first
opponent presses Join  → IN_GAME (2/2) — both receive their room access
anyone leaves / drops  → session ends for everyone, table AVAILABLE (0/2)
```

- **Leaving:** any player leaving ends the external session (the provider's
  game can't continue at our table alone); the other player is told
  ("Momen left the table") and the table is free.
- **Disconnects:** closing the office tab, a network drop or sign-out releases
  the place after a **15 s grace period**; a reload within it resumes the same
  session (room link intact). Several tabs of one employee count as one.
- **Walking away:** someone only *waiting* (SETUP / WAITING) who walks out of
  the Game Room is warned and released after **20 s** outside; coming back
  cancels it. Once `IN_GAME`, avatar movement never cancels anything — the game
  is in another tab.
- **Expiry:** SETUP 10 min, WAITING 30 min, IN_GAME 90 min without a change →
  the table is freed and players are told.
- Leaving the office page (another route) leaves the table immediately.

## Security

- **Identity** comes only from the authenticated socket (session cookie,
  single-use realtime ticket, or demo token in demo mode). Payloads carry a
  station id and a link/code — never an employee id. Only the host can share or
  replace the room, and only before the opponent joined.
- **URL validation** (`checkExternalInvite`, used by the backend's
  `ExternalGameUrlValidator` and for instant feedback in the UI) parses with the
  platform `URL` parser: `https:` only · no username/password · default port ·
  **exact** allowlisted hostname (no IPs, no `localhost`, no look-alike
  subdomains such as `papergames.io.evil.com`) · provider path pattern · only
  allowlisted query parameters survive (`next=https://…` is dropped) · fragment
  dropped · max 512 characters. `javascript:`, `data:`, `file:`, `http:` and
  malformed input are rejected. Even Lichess API answers pass the validator.
- **Opening:** `window.open(url, '_blank', 'noopener,noreferrer')` — the game
  site gets no opener and no referrer. The office opens only provider start
  pages from the catalog or links the server validated; there is no redirect
  endpoint.
- **No credentials in links:** nothing from our side (session, ticket, PAT,
  employee id, keys) is ever added to a provider URL. Lichess rooms are created
  with game settings only.
- **Abuse limits:** 12 control events per socket burst (3/s refill); Lichess
  room creation is capped at 6 per minute for the whole backend.

## Privacy

Room links and codes are sent **only to the participants** (host: their seat
link; opponent: theirs, once they joined). Station broadcasts, the activity
feed, the Team API and the office snapshot never contain them. Feed lines are
minimal: "Mohamed is waiting for Chess", "Mohamed and Momen started Chess",
"Chess game ended". Links live in backend memory only and disappear with the
session; nothing is written to Supabase.

## Sounds

Via the shared SoundManager (Games / Environment channels, master and mute
respected): Game Room entry cue and ambience, a soft cue when stepping up to a
table, a chime when you take a place, "opponent joined", and a soft tone when
you leave. Short cues still play while the office tab is in the background (the
host is usually in the game tab); ambience stops there. Nothing inside the
provider's page is controlled. Sound is never the only signal: toasts, the
panel, the status pill and — when the office tab is hidden — the tab title
("● Momen joined") say the same.

## Performance

External games generate only coordination events (a handful per session) — no
realtime stream. Per occupied table the server holds one expiry timer; an idle
Game Room holds none. The office stays at ~60 FPS with all four stations.

## Current limitation

**Game sessions require a single backend instance** (Railway runs one): station
occupancy and room links live in this process's memory, like the office
presence registry. Scaling out means moving them to shared state (e.g. Redis)
first. A backend restart frees every table.

## Adding a provider or station

1. Verify the provider in two isolated browser sessions (live, private room,
   join from a shared link/code, login needs, ads, domain of the invite link).
2. Add it to `GAME_PROVIDERS` with its exact `allowedHosts`, `invitePath`,
   `allowedQuery`/`roomCode`, short `hostSteps` and an honest `note`. For a
   documented room-creation API, add a small client like `LichessRoomClient`
   and use `API_CREATED_ROOM`; never automate undocumented endpoints.
3. Add a station to `GAME_STATIONS` (and a `GameType` + label if new).
4. Place it in the floor plan: furniture with `stationId` plus a
   `stations` entry with two player spots.
5. Add URL cases to the security test and run a two-browser test.
