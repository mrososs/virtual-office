# Azure DevOps (read-only) — setup

Phase 1 reads the iSaned Azure DevOps project with a **scheduled sync** and
never writes. Credentials are per employee and pluggable:

| Mode (`AUTH_PROVIDER`)      | Credential used for Azure DevOps                                  | Status   |
| --------------------------- | ----------------------------------------------------------------- | -------- |
| `azure_pat`                 | each employee's own **Personal Access Token**, entered once at sign-in (or *Update token*), stored AES-256-GCM encrypted — see [AZURE_PAT_AUTH.md](./AZURE_PAT_AUTH.md) | **current** |
| `microsoft_entra`           | delegated Microsoft Entra OAuth (resource `499b84ac-1321-427f-aa17-267ca6975798`, scopes `vso.profile vso.project vso.work vso.code vso.build`) | future — needs an IT-approved app registration |

No legacy Azure DevOps OAuth (deprecated), no source code. The REST client
only receives an `Authorization` value from `AzureCredentialService`
(`Basic` for a PAT, `Bearer` for Entra), so a future team/service credential
is one more credential type — the sync, mappers and Activity Engine don't change.

## PAT scopes (current mode)

Organization-scoped token, **read only**:

| Scope in the Azure DevOps dialog | REST APIs the sync calls                                           |
| -------------------------------- | ------------------------------------------------------------------ |
| Work Items (Read)                | `work/teamsettings/iterations`, `wit/wiql`, `wit/workitemsbatch`     |
| Code (Read)                      | `git/pullrequests` (metadata only)                                  |
| Build (Read)                     | `build/builds`                                                     |
| Project and Team (Read)          | `projects/{project}`, `teams/{team}`, `teams/{team}/members`         |

Identity (`_apis/connectionData`) works with any valid token of the
organization — **User Profile (Read) is not needed** (verified against iSaned
on 2026-09-26: sign-in and the full sync ran with exactly the four scopes above). When a scope is missing, the sync marks that connection
`ERROR` and names the scope ("This token can't read Build data. Give it the
"Build (Read)" scope…"), then tries the next connected employee.

## Entra delegated scopes (future mode)

| What                      | Value                                              |
| ------------------------- | -------------------------------------------------- |
| Entra resource (app ID)   | `499b84ac-1321-427f-aa17-267ca6975798`             |
| Resource URI              | `https://app.vssps.visualstudio.com`               |
| Scopes requested          | `vso.profile`, `vso.project`, `vso.work`, `vso.code`, `vso.build` |
| Not requested             | `user_impersonation`, any `*_write` / `*_manage` / `*_execute` scope |

## 1. Prerequisites

- The Azure DevOps organization must be **connected to the iSaned Microsoft
  Entra tenant** (Organization settings → Microsoft Entra). Entra apps don't
  support MSA-backed organizations for this resource.
- Sign-in is already set up ([MICROSOFT_AUTH_SETUP.md](./MICROSOFT_AUTH_SETUP.md)).

## 2. (Future Entra mode) Add the permissions to the app registration

Entra admin center → **App registrations → iSaned Virtual Office → API
permissions → Add a permission → APIs my organization uses →** search
**Azure DevOps** → **Delegated permissions** → tick:

- `vso.profile`
- `vso.project`
- `vso.work`
- `vso.code`
- `vso.build`

→ **Add permissions**. If users may not consent themselves, click **Grant
admin consent for iSaned** (otherwise each person sees Microsoft's consent
screen once when they connect).

## 3. Configure the backend

```ini
AZURE_DEVOPS_ORGANIZATION=<name in https://dev.azure.com/<name>>
# the plain project name, never URL-encoded (the API client encodes it once)
AZURE_DEVOPS_PROJECT=<project name>
# optional; default = the project's default team
AZURE_DEVOPS_TEAM=
# seconds, min 60 (default 120)
AZURE_DEVOPS_SYNC_INTERVAL_SECONDS=120
```

iSaned today (`backend/.env`):

```ini
AZURE_DEVOPS_ORGANIZATION=iSaned
AZURE_DEVOPS_PROJECT=Saned System - Version 03
AZURE_DEVOPS_TEAM=
AZURE_DEVOPS_SYNC_INTERVAL_SECONDS=120
```

With `AZURE_DEVOPS_TEAM` empty the sync uses the project's default team —
*Saned System - Version 03 Team* — and its current iteration (Sprint 8,
2026-09-22 → 2026-10-05 at the time of writing). Set it only if the office
should follow a different team's sprint.

## 4. Connect (each employee, once)

**Current (PAT):** signing in with email + token already connects Azure
DevOps. Later: **Integrations → Azure DevOps → Update token / Verify /
Disconnect**. The backend checks the token's identity (it must be the
employee's own), checks project access, seals it, and starts a sync.

**Future (Entra):** **Integrations → Azure DevOps → Connect with Microsoft.** This is incremental
consent: sign-in never asked for Azure DevOps access; now Microsoft is asked
for exactly the five read scopes (the account is pre-selected and must be the
same one signed in to the office). The backend then:

1. stores the refreshed MSAL token cache (encrypted, `microsoft_token_caches`),
2. calls `https://dev.azure.com/<org>/_apis/connectionData` — proves the
   organization is reachable and returns the caller's Azure DevOps identity,
3. reads the configured project — proves project access,
4. saves a **verified** identity mapping (`azure_devops_identities`,
   `match_method = VERIFIED_SIGN_IN`) and marks the connection `CONNECTED`,
5. starts a sync immediately.

Outcomes shown on the Integrations page: `connected`, `account_mismatch`,
`organization_inaccessible`, `project_inaccessible`, `consent_required`,
`cancelled`, `not_configured`, `service_unavailable`, `failed`.

**Disconnect** stops the office from using that person's access. Revoking the
consent itself is done by the user at <https://myapps.microsoft.com> (or by an
admin in Enterprise applications).

## 5. How the sync works (Phase 1: scheduled)

Every `AZURE_DEVOPS_SYNC_INTERVAL_SECONDS` (and right after startup/connect),
one run, never overlapping:

1. Pick a **connected** employee (most recently verified first) and get
   their credential from `AzureCredentialService` (decrypt the PAT, or mint
   an Entra token). Past the entered expiry → `EXPIRED`; rejected by Azure
   DevOps → `INVALID` (or `EXPIRED` if the entered date has passed); missing
   scope / no project access → `ERROR`. The next connected employee is tried.
2. Read, for the configured project/team:
   - project + team, team members
   - **current iteration** (`work/teamsettings/iterations?$timeframe=current`)
   - work items: Tasks, Bugs, User Stories / PBIs **in the current
     iteration** (max 200; without an iteration: open items changed in the
     last 14 days), fields: id, title, type, state, assigned to, iteration,
     tags, changed date
   - **active** pull requests (metadata only)
   - builds queued in the **last 24 h**
3. Map identities → employees: stored mapping by Azure identity id first,
   then `uniqueName` = employee email. Team members whose `uniqueName`
   matches an employee email get an `EMAIL` mapping. Display names are never
   used as keys.
4. Persist (`azure_work_items`, `azure_pull_requests`, `azure_builds`,
   `azure_sync_state`) — rows are replaced per run, so no history piles up.
5. Feed the **Activity Engine** (Azure is just one signal source) and notify
   open offices (`work:synced` → clients refetch `/api/work`).

The data visible is what the connected team member can see in Azure DevOps.
With several people connected the sync keeps working when one of them leaves
or loses access.

### Activity signals (source `AZURE_DEVOPS`)

| Azure DevOps data                                          | Activity      |
| ---------------------------------------------------------- | ------------- |
| assigned item Active / In Progress / Dev In Progress / Committed / In Review | `WORKING` |
| assigned item in a test state (Ready for Test/Testing, In Test, Testing) | `TESTING` |
| assigned item Blocked / On Hold, or tagged `Blocked`       | `BLOCKED`     |
| reviewer with no vote on an active, non-draft PR opened < 4 h ago | `CODE_REVIEW` |
| author of an active **draft** PR opened < 8 h ago          | `CODING`      |
| own build in progress                                      | `BUILDING`    |

State names are matched case-insensitively; a state the mapper doesn't know
(e.g. *To Do*, *New*, or a new custom state) counts as NEW and produces no
signal, so nobody looks busy by accident. The iSaned process adds two custom
states — *Dev In Progress* and *Ready for Testing* — which are mapped
explicitly. If the process gains more (e.g. a QA state), add them to
`STATE_BY_NAME` in `azure-work.mapper.ts`.

Signals expire after ~3 sync intervals, so if syncing stops the office falls
back to *Available* instead of showing stale work. Priority (MEETING >
BLOCKED > CODE_REVIEW > BUILDING > TESTING > CODING > WORKING) stays in the
existing resolution strategy — a future Teams `MEETING` signal wins over any
Azure signal. Azure activity is **never** used as presence: offline people
stay offline.

### Rate limits

~7 REST calls per run, every 2 minutes, from one identity — far below Azure
DevOps' global limits. Don't set the interval below 60 s.

## 6. Future: Service Hooks (push)

`POST /api/webhooks/azure-devops` is kept for a later phase. It is disabled
(503) unless `AZURE_DEVOPS_WEBHOOK_SECRET` is set; subscriptions must then use
Basic auth with that secret as the password. Scheduled sync remains the
source of truth until then.

## 7. Verified against the real project (2026-09-26)

Organization *iSaned*, project *Saned System - Version 03*, one employee
(Mohamed Osama) signed in with a new read-only PAT (the four scopes above):

- Sign-in: `connectionData` returned the identity (GUID id, descriptor,
  `uniqueName` = the employee email) → linked as `VERIFIED_SIGN_IN` → PAT
  sealed (`v1.` format) → session cookie → avatar setup → office.
- Sync: default team and current sprint resolved without `AZURE_DEVOPS_TEAM`;
  65 work items, 10 active PRs, 0 builds (none in the last 24 h); 52 items
  mapped to the one approved employee through the identity id. Scheduled
  runs every 120 s; two simultaneous *Sync now* requests shared one run.
- Activity: a *Dev In Progress* PBI assigned to the employee became
  `WORKING · #16985` on the avatar, Team panel and drawer; *To Do* tasks
  produced no signal.
- Failure paths: a malformed token is refused before Azure is called (400);
  a well-formed but invalid one gets `invalid_token` (401) from Azure; *Update
  token* with an invalid token leaves the saved one untouched; *Disconnect*
  removes the sealed PAT, keeps the identity link and the session.

Not observed yet (no data for it at the time): `BUILDING` (no running
builds), `CODE_REVIEW` / `CODING` from PR reviews and drafts involving an
approved employee, a second connected employee taking over the sync, and
Service Hooks.
