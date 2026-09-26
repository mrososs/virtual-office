# Activity Engine

Lives in `backend/src/modules/activities/`. Its job: turn raw signals from
work tools into one resolved `EmployeeActivity` per employee, without
scattering Azure DevOps / Teams logic across the codebase.

```
AZURE_DEVOPS ──┐
MICROSOFT_TEAMS ├─▶ ActivitySignal[] ──▶ ActivityResolver ──▶ EmployeeActivity ──▶ Socket event ──▶ Vue + Phaser
MANUAL ─────────┤        (per employee)   (+ ActivityResolutionStrategy)
SYSTEM ─────────┘
```

## Concepts

- **ActivitySource** — where a signal came from: `AZURE_DEVOPS`,
  `MICROSOFT_TEAMS`, `MANUAL` (user picked a status), `SYSTEM`.
- **ActivitySignal** — one raw, timestamped observation, e.g. "employee X is
  a reviewer on an active PR" → `{ type: 'CODE_REVIEW', source: 'AZURE_DEVOPS',
  confidence: 0.7, occurredAt, expiresAt }`.
- **ActivityConfidence** — 0–1, how much the engine trusts a signal. Manual
  status changes should be confidence `1`.
- **EmployeeActivity** — the single resolved value attached to the employee
  and broadcast over `employee:activity_changed`.

## How signals arrive

- `ingestSignal(signal)` — one event (future Service Hooks, manual status).
- `replaceSource(source, signalsByEmployee)` — a source's complete current
  picture. The Azure DevOps scheduled sync uses this: everyone's
  `AZURE_DEVOPS` signals are replaced after each run; other sources are
  untouched. At startup the signals are rebuilt from the persisted
  `azure_*` tables (if the last sync is recent enough).
- Every Azure signal carries an `expiresAt` (~3 sync intervals); a 60 s sweep
  re-resolves expired employees. With no live signal an employee resolves to
  `AVAILABLE` (source `SYSTEM`).
- `changes$` emits only real changes; the realtime gateway broadcasts them as
  `employee:activity_changed`. Signals may reference `workItemId`,
  `pullRequestId` or `buildId`, copied onto the resolved activity so the UI
  can show "Reviewing PR #493".

## Signal → state mapping

Implemented (Azure DevOps, `azure-devops/azure-activity.mapper.ts`):

| Azure DevOps data                                             | `ActivityType` |
|---------------------------------------------------------------|----------------|
| Assigned item Active / In Progress / Dev In Progress / Committed / In Review | `WORKING` |
| Assigned item Ready for Test / Ready for Testing / In Test / Testing | `TESTING` |
| Assigned item Blocked / On Hold, or tagged `Blocked`            | `BLOCKED`      |
| Reviewer without a vote on an active PR opened < 4 h ago        | `CODE_REVIEW`  |
| Author of an active draft PR opened < 8 h ago                   | `CODING`       |
| Own build in progress                                           | `BUILDING`     |

Planned sources:

| Signal                          | Resulting `ActivityType` |
|----------------------------------|---------------------------|
| Active Teams meeting (Graph)      | `MEETING`                 |
| User manually sets Focus          | `FOCUS`                   |
| User manually sets Break          | `BREAK`                   |

Where an activity puts the avatar is a separate concern, decided by
`resolveActivityPlacement` (`shared/src/domain/activity-placement.ts`):
work activities (`WORKING`, `CODING`, `BUILDING`, `TESTING`, `FOCUS`,
`BLOCKED`) keep people at their own desk, `CODE_REVIEW` goes to the
collaboration area, `MEETING` to the meeting's room and `BREAK` to a break
room. It is never hardcoded inside `azure-devops`/`microsoft` services —
those modules only ever produce `ActivitySignal`s.

## Conflict resolution

Sources can disagree (Azure says `WORKING`, Calendar says `MEETING`).
`ActivityResolutionStrategy` (`backend/src/modules/activities/activity-resolution-strategy.ts`)
resolves this via a **configurable, ordered priority list** rather than
if/else chains scattered through the codebase:

```
MEETING > BLOCKED > CODE_REVIEW > BUILDING > TESTING > CODING > WORKING > FOCUS > BREAK > AVAILABLE
```

`DefaultActivityResolutionStrategy` takes the priority list as
constructor/config input so it can be changed later without touching call
sites. Among signals of the winning type the resolver picks the highest
confidence, then the most recent. Because Azure is only one source, a
future Teams `MEETING` signal outranks any Azure work signal automatically.

## Presence stays separate

`activities/` never writes to `EmployeePresence`. Presence is owned by
`presence/` and the realtime gateway's connect/disconnect lifecycle only.
See `ARCHITECTURE.md` §10.
