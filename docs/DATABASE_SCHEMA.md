# Database schema (Supabase / PostgreSQL)

One shared database for the one iSaned team (not a database per user, not a
tenant model). Versioned, repeatable SQL migrations live in
[`supabase/migrations/`](../supabase/migrations):

| Migration                                         | Contents                                            |
| ------------------------------------------------- | --------------------------------------------------- |
| `20260926070016_identity_sessions_presence.sql`   | employees, avatar_profiles, app_sessions, microsoft_token_caches, employee_presence (+ presence functions) |
| `20260926070036_azure_devops.sql`                 | Azure DevOps identity mapping, connections, sync state, work items, pull requests, builds |
| `20260926073755_azure_pat_connections.sql`        | PAT credentials on `azure_devops_connections` (sealed PAT, expiry, credential type, org/project, last sync) and the widened status set |
| `20260926091032_employee_profile_metadata.sql`    | `job_title`, `team`, `discipline` on `employees` (descriptive, never authorization) |

Apply them with the Supabase CLI (`supabase db push` against the linked
project), the Supabase MCP `apply_migration`, or by running each file in
order in the SQL editor — never by clicking tables together in the dashboard.

## Security model

- The **NestJS backend is the only database client**. It uses the service
  role key (bypasses RLS) and owns every read and write; the key never reaches
  the frontend. The frontend never talks to Supabase directly.
- Every table has **RLS enabled with no policies**, and `anon` /
  `authenticated` have all privileges revoked, so the public anon key can read
  nothing. Presence functions are executable by `service_role` only.
- Provider secrets are stored encrypted by the application (AES-256-GCM,
  `TOKEN_ENCRYPTION_KEY`); session cookies are stored only as a keyed hash.

## Identity & people

- **employees** — the pre-approved team. `id, entra_object_id, entra_tenant_id,
  email (unique, lowercase), display_name, role, job_title, team, discipline,
  assigned_desk_id, current_room_id, is_active, created_at, updated_at,
  last_login_at`.
  - `role` ∈ `GENERAL_MANAGER, PROJECT_MANAGER, TEAM_LEAD, DEVELOPER, QA`
    (CHECK constraint): the **authorization** role, owned by this app, never
    inferred from Microsoft or Azure DevOps. Today it picks the default desk
    area and the fallback Team panel group; no endpoint grants more by role.
  - `job_title` ("Mobile Flutter Developer"), `team` ("Mobile Development") and
    `discipline` ("Flutter / Mobile Development") describe what the person does.
    Nullable, trimmed, length-checked; the UI shows the job title (falling back
    to the role label) and groups the Team panel by team. Set only by the seed.
  - Sign-in identity: with `AUTH_PROVIDER=azure_pat` the stable Azure DevOps
    identity id is linked in `azure_devops_identities` on the first sign-in
    (verified email = typed email = employee email) and decides every later
    sign-in. With Entra, `(entra_tenant_id, entra_object_id)` is unique and plays
    that role. Email is only used for the first match either way.
  - `assigned_desk_id` is a desk id from the HQ floor plan
    (`shared/src/domain/hq-floor-plan.ts`), unique when set.
  - `current_room_id` is reserved (live room occupancy is in the realtime layer).
  - Provisioned by `npm run seed:employees -w backend` (no passwords): upsert
    by normalized email, safe to re-run, never touches identity links, rejects
    unknown fields. The full team (emails not yet confirmed) is kept in
    [`docs/team-roster.example.json`](./team-roster.example.json), which the app never reads.
- **avatar_profiles** — one per employee (`employee_id` unique, cascade):
  `body_type, skin_tone, hair_style, hair_color, top_style, top_color,
  bottom_style, bottom_color, shoes_style, accessory`. Catalog ids, validated
  by the API against `AVATAR_CATALOG`; plain columns, 1:1 with the shared
  `AvatarProfile` type.

## Sessions & Microsoft tokens

- **app_sessions** — `id, employee_id, token_hash (unique), created_at,
  last_seen_at, expires_at, user_agent`. Sliding idle timeout on
  `last_seen_at`, absolute `expires_at`; expired rows are swept hourly.
- **microsoft_token_caches** — `employee_id (PK), home_account_id,
  encrypted_cache, updated_at`: the employee's MSAL cache (refresh token) for
  delegated Azure DevOps / Graph calls. Unused while `AUTH_PROVIDER=azure_pat`;
  kept for the future Entra mode.

## Presence

- **employee_presence** — `employee_id (PK), online, socket_count,
  last_seen_at, updated_at`. "Connected to the Virtual Office" only.
  `presence_connect(uuid)` / `presence_disconnect(uuid)` change the count
  atomically, so a second tab or device keeps someone online until the last
  connection closes; `presence_reset_all()` runs at backend start (single
  instance).

## Azure DevOps (read-only mirror of "now")

- **azure_devops_identities** — `employee_id (PK), azure_identity_id
  (unique), azure_descriptor, azure_unique_name, azure_display_name,
  match_method (VERIFIED_SIGN_IN | EMAIL)`.
- **azure_devops_connections** — each employee's Azure DevOps credential:
  `employee_id (PK), credential_type (PAT | ENTRA), encrypted_pat,
  pat_expires_at, organization, project, status (CONNECTED | EXPIRED |
  INVALID | ERROR | DISCONNECTED), connected_at, last_verified_at,
  last_sync_at, last_error`. `encrypted_pat` is AES-256-GCM sealed by the
  backend; a CHECK constraint accepts only that sealed format (never a raw
  PAT), and a PAT connection must hold a PAT unless DISCONNECTED.
- **azure_sync_state** — single row (`id = 1`): last run status/times/error,
  who it ran as, project/team/current iteration, counts.
- **azure_work_items** — `work_item_id (PK), title, work_item_type, state,
  assigned_to_*, assigned_employee_id, iteration_path, tags, url, changed_at,
  synced_at`.
- **azure_pull_requests** — `pull_request_id (PK), repository_*, title,
  status, is_draft, created_by_*, author_employee_id, reviewers (jsonb),
  reviewer_employee_ids (uuid[]), source_ref, target_ref, created_at_azure,
  closed_at, url, synced_at`.
- **azure_builds** — `build_id (PK), build_number, pipeline_id,
  pipeline_name, status, result, requested_for_*, requested_for_employee_id,
  source_branch, queued_at, started_at, finished_at, url, synced_at`.

Each sync upserts what it saw and deletes rows it didn't (`synced_at` older
than the run), so these tables never accumulate history.

## Relationships

```
employees 1─1 avatar_profiles
employees 1─* app_sessions
employees 1─1 microsoft_token_caches
employees 1─1 employee_presence
employees 1─1 azure_devops_identities
employees 1─1 azure_devops_connections
employees 1─* azure_work_items / azure_pull_requests / azure_builds   (nullable FKs, ON DELETE SET NULL)
```

## Not in the database (on purpose)

- **Floor plan** (rooms, desks, furniture): static code shared by demo and
  production — one physical office. Only desk *assignment* is data.
- **Resolved activity**: computed in memory by the Activity Engine and rebuilt
  from the Azure tables at startup.
- **Meetings**: arrive with the Microsoft Graph (Teams/Calendar) phase.
- No organizations/tenants, billing, audit logs or RBAC tables — this is one
  team. Add tables when a feature actually needs them.
