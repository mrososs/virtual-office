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

## Example signal → state mapping

| Signal                          | Resulting `ActivityType` |
|----------------------------------|---------------------------|
| Active work item assigned         | `WORKING`                 |
| Recent commit                      | `CODING`                  |
| Assigned PR reviewer                | `CODE_REVIEW`             |
| Pipeline running                     | `BUILDING`                |
| Work item flagged blocked             | `BLOCKED`                 |
| Active Teams meeting                   | `MEETING`                 |
| User manually sets Focus                | `FOCUS`                   |
| User manually sets Break                 | `BREAK`                   |

Where an activity puts the avatar (desk / Code Review room / Meeting room /
Lounge / Focus room) is a separate concern, decided by domain logic in
`rooms`/`realtime`, never hardcoded inside `azure-devops`/`microsoft`
services. Those modules only ever produce `ActivitySignal`s.

## Conflict resolution

Sources can disagree (Azure says `WORKING`, Calendar says `MEETING`).
`ActivityResolutionStrategy` (`backend/src/modules/activities/activity-resolution-strategy.ts`)
resolves this via a **configurable, ordered priority list** rather than
if/else chains scattered through the codebase:

```
MEETING > BLOCKED > CODE_REVIEW > BUILDING > CODING > WORKING > AVAILABLE
```

This is an example ordering, not a law — `DefaultActivityResolutionStrategy`
takes the priority list as constructor/config input so it can be changed
(or made per-organization) later without touching call sites.

## Presence stays separate

`activities/` never writes to `EmployeePresence`. Presence is owned by
`presence/` and the realtime gateway's connect/disconnect lifecycle only.
See `ARCHITECTURE.md` §10.
