# Database schema (PostgreSQL / Supabase)

Documentation only at this stage — no migrations have been generated yet.
Tables map closely to the `shared` domain types so the backend's Supabase
repositories can serialize/deserialize with minimal translation.

## Core / tenancy

- **organizations** — `id, name, created_at`
- **users** — platform login accounts. `id, email, organization_id, created_at`.
  Distinct from `employees`: a `user` is who can log in; an `employee` is who
  appears in the office (usually 1:1, but keeps auth separate from the
  office domain).
- **organization_members** — join table, `user_id, organization_id, role`
- **teams** — `id, organization_id, name`

## People & office

- **employees** — `id, organization_id, user_id nullable, display_name,
  avatar_url, job_title, team_id`
- **offices** — `id, organization_id, name, default_floor_id`
- **office_floors** — `id, office_id, name, map_key, order`
- **office_rooms** — `id, office_id, floor_id, name, type, bounds_x,
  bounds_y, bounds_width, bounds_height, capacity, nav_target_x, nav_target_y`
- **office_objects** — furniture/decoration/interactive/signage placements.
  `id, office_id, floor_id, type, asset_key, position_x, position_y, rotation`
- **desks** — `id, office_id, employee_id nullable, position_x, position_y,
  rotation, type`. Nullable `employee_id` = unassigned desk.

## Realtime state (frequently-updated, candidate for a fast KV/cache later)

- **employee_presence** — `employee_id PK, status, last_seen_at,
  connected_socket_id nullable`
- **employee_activity** — `employee_id PK, type, source, title nullable,
  work_item_id nullable, confidence, updated_at`
- **player_positions** — `employee_id PK, office_id, x, y, direction,
  control_mode, updated_at`

## Meetings

- **meetings** — `id, organization_id, external_provider, external_meeting_id,
  title, start_at, end_at, status, join_url nullable, room_id nullable`
- **meeting_participants** — `id, meeting_id, employee_id nullable,
  external_email, display_name, response_status, is_organizer`
- **meeting_room_reservations** — `id, room_id, meeting_id, reserved_from,
  reserved_until, released_at nullable`

## Integrations

- **microsoft_connections** — `id, organization_id, employee_id,
  tenant_id, access_token (encrypted), refresh_token (encrypted), expires_at`
- **azure_connections** — `id, organization_id, azure_org_url,
  access_token (encrypted), refresh_token (encrypted), expires_at`
- **azure_projects** — `id, azure_connection_id, project_id, name`
- **azure_work_items** — `id, azure_project_id, work_item_id, title,
  state, assigned_employee_id nullable, updated_at`
- **azure_pull_requests** — `id, azure_project_id, pull_request_id, title,
  status, author_employee_id nullable, reviewer_employee_ids (array),
  updated_at`
- **azure_builds** — `id, azure_project_id, build_id, status, updated_at`

## Relationships (high level)

```
organizations 1─* users
organizations 1─* teams
organizations 1─* employees
organizations 1─* offices
offices 1─* office_floors 1─* office_rooms
offices 1─* desks (0..1 employee)
employees 1─1 employee_presence
employees 1─1 employee_activity
employees 1─1 player_positions
organizations 1─* meetings *─* employees (via meeting_participants)
meetings 0..1─* meeting_room_reservations ─1 office_rooms
organizations 1─1 azure_connections / microsoft_connections (per employee for Microsoft)
azure_connections 1─* azure_projects 1─* {azure_work_items, azure_pull_requests, azure_builds}
```

## Deliberately not modeled yet

No tables for: notifications, audit logs, billing/subscriptions, granular
RBAC permissions, office builder version history. Add these when the
feature that needs them is actually being built — see the "no unnecessary
tables" constraint in the original product brief.
