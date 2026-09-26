-- iSaned Virtual Office — Azure DevOps read integration (Phase 1: scheduled sync).
--
-- Only the metadata the office visualizes: current-iteration work items,
-- active pull requests and recent builds of the one configured project. No
-- source code, no history. Rows are replaced on every sync (upsert + delete
-- rows not seen in that run), so the tables always mirror "now".

-- ---------------------------------------------------------------------------
-- Identity mapping: Virtual Office employee <-> Azure DevOps identity.
-- VERIFIED_SIGN_IN comes from the employee's own delegated token
-- (connectionData.authenticatedUser); EMAIL is a team-member sync match on
-- uniqueName = employees.email. Display names are never used as keys.
-- ---------------------------------------------------------------------------
create table public.azure_devops_identities (
  employee_id        uuid primary key references public.employees (id) on delete cascade,
  azure_identity_id  text not null unique,
  azure_descriptor   text,
  azure_unique_name  text not null,
  azure_display_name text not null,
  match_method       text not null check (match_method in ('VERIFIED_SIGN_IN', 'EMAIL')),
  updated_at         timestamptz not null default now()
);

-- Employees who granted delegated Azure DevOps access (their token cache lives
-- in microsoft_token_caches). The scheduled sync runs with one of them.
create table public.azure_devops_connections (
  employee_id      uuid primary key references public.employees (id) on delete cascade,
  status           text not null check (status in ('CONNECTED', 'RECONNECT_REQUIRED', 'ERROR')),
  connected_at     timestamptz not null default now(),
  last_verified_at timestamptz,
  last_error       text,
  updated_at       timestamptz not null default now()
);

create trigger azure_devops_connections_set_updated_at
  before update on public.azure_devops_connections
  for each row execute function public.set_updated_at();

create trigger azure_devops_identities_set_updated_at
  before update on public.azure_devops_identities
  for each row execute function public.set_updated_at();

-- Single row describing the latest sync run and the project/team/iteration it read.
create table public.azure_sync_state (
  id                    smallint primary key default 1 check (id = 1),
  status                text check (status in ('RUNNING', 'SUCCEEDED', 'FAILED')),
  started_at            timestamptz,
  finished_at           timestamptz,
  last_success_at       timestamptz,
  error                 text,
  synced_by_employee_id uuid references public.employees (id) on delete set null,
  project_id            text,
  project_name          text,
  team_id               text,
  team_name             text,
  iteration_id          text,
  iteration_name        text,
  iteration_path        text,
  iteration_start       timestamptz,
  iteration_end         timestamptz,
  work_item_count       integer not null default 0,
  pull_request_count    integer not null default 0,
  build_count           integer not null default 0,
  updated_at            timestamptz not null default now()
);

insert into public.azure_sync_state (id) values (1);

create trigger azure_sync_state_set_updated_at
  before update on public.azure_sync_state
  for each row execute function public.set_updated_at();

create table public.azure_work_items (
  work_item_id             integer primary key,
  title                    text not null,
  work_item_type           text not null,
  state                    text not null,
  assigned_to_identity_id  text,
  assigned_to_unique_name  text,
  assigned_to_display_name text,
  assigned_employee_id     uuid references public.employees (id) on delete set null,
  iteration_path           text,
  tags                     text[] not null default '{}',
  url                      text not null,
  changed_at               timestamptz not null,
  synced_at                timestamptz not null default now()
);

create index azure_work_items_assignee_idx on public.azure_work_items (assigned_employee_id);

create table public.azure_pull_requests (
  pull_request_id         integer primary key,
  repository_id           text not null,
  repository_name         text not null,
  title                   text not null,
  status                  text not null,
  is_draft                boolean not null default false,
  created_by_identity_id  text,
  created_by_unique_name  text,
  created_by_display_name text,
  author_employee_id      uuid references public.employees (id) on delete set null,
  -- [{ identityId, uniqueName, displayName, vote, isRequired, employeeId }]
  reviewers               jsonb not null default '[]'::jsonb,
  reviewer_employee_ids   uuid[] not null default '{}',
  source_ref              text,
  target_ref              text,
  created_at_azure        timestamptz not null,
  closed_at               timestamptz,
  url                     text not null,
  synced_at               timestamptz not null default now()
);

create index azure_pull_requests_author_idx on public.azure_pull_requests (author_employee_id);

create table public.azure_builds (
  build_id                   integer primary key,
  build_number               text not null,
  pipeline_id                integer,
  pipeline_name              text not null,
  status                     text not null,
  result                     text,
  requested_for_identity_id  text,
  requested_for_unique_name  text,
  requested_for_display_name text,
  requested_for_employee_id  uuid references public.employees (id) on delete set null,
  source_branch              text,
  queued_at                  timestamptz,
  started_at                 timestamptz,
  finished_at                timestamptz,
  url                        text not null,
  synced_at                  timestamptz not null default now()
);

create index azure_builds_requested_for_idx on public.azure_builds (requested_for_employee_id);

-- ---------------------------------------------------------------------------
-- Backend-only, like every other table.
-- ---------------------------------------------------------------------------
alter table public.azure_devops_identities  enable row level security;
alter table public.azure_devops_connections enable row level security;
alter table public.azure_sync_state         enable row level security;
alter table public.azure_work_items         enable row level security;
alter table public.azure_pull_requests      enable row level security;
alter table public.azure_builds             enable row level security;

revoke all on table
  public.azure_devops_identities,
  public.azure_devops_connections,
  public.azure_sync_state,
  public.azure_work_items,
  public.azure_pull_requests,
  public.azure_builds
from anon, authenticated;

grant select, insert, update, delete on table
  public.azure_devops_identities,
  public.azure_devops_connections,
  public.azure_sync_state,
  public.azure_work_items,
  public.azure_pull_requests,
  public.azure_builds
to service_role;
