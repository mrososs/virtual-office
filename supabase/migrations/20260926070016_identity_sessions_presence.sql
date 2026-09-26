-- iSaned Virtual Office — identity, sessions, avatars and presence.
--
-- One shared database for the one iSaned team. The NestJS backend is the only
-- client: it connects with the service role (which bypasses RLS) and owns every
-- read and write. RLS is enabled with no policies and anon/authenticated lose
-- all privileges, so nothing here is reachable with the public anon key.

-- Shared trigger: keep updated_at honest on every UPDATE.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- employees: the pre-approved team. A row must exist before someone can sign
-- in; the first Microsoft sign-in links entra_tenant_id + entra_object_id
-- (stable), after which email is informational only.
-- ---------------------------------------------------------------------------
create table public.employees (
  id               uuid primary key default gen_random_uuid(),
  entra_object_id  uuid,
  entra_tenant_id  uuid,
  email            text not null unique,
  display_name     text not null,
  role             text not null,
  assigned_desk_id text,
  current_room_id  text,
  is_active        boolean not null default true,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  last_login_at    timestamptz,
  constraint employees_email_normalized check (email = lower(btrim(email)) and email <> ''),
  constraint employees_display_name_present check (btrim(display_name) <> ''),
  constraint employees_role_known check (role in ('GENERAL_MANAGER', 'PROJECT_MANAGER', 'TEAM_LEAD', 'DEVELOPER', 'QA')),
  constraint employees_entra_identity_complete check ((entra_object_id is null) = (entra_tenant_id is null))
);

comment on table public.employees is 'Pre-approved iSaned team members. Roles are owned by this app, never inferred from Microsoft.';
comment on column public.employees.assigned_desk_id is 'Desk id from the HQ floor plan (shared/src/domain/hq-floor-plan.ts).';

create unique index employees_entra_identity_key
  on public.employees (entra_tenant_id, entra_object_id)
  where entra_object_id is not null;

create unique index employees_assigned_desk_key
  on public.employees (assigned_desk_id)
  where assigned_desk_id is not null;

create trigger employees_set_updated_at
  before update on public.employees
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- avatar_profiles: one saved look per employee, as catalog ids (validated by
-- the application against AVATAR_CATALOG, so new options need no migration).
-- ---------------------------------------------------------------------------
create table public.avatar_profiles (
  id           uuid primary key default gen_random_uuid(),
  employee_id  uuid not null unique references public.employees (id) on delete cascade,
  body_type    text not null,
  skin_tone    text not null,
  hair_style   text not null,
  hair_color   text not null,
  top_style    text not null,
  top_color    text not null,
  bottom_style text not null,
  bottom_color text not null,
  shoes_style  text not null,
  accessory    text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create trigger avatar_profiles_set_updated_at
  before update on public.avatar_profiles
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- app_sessions: server-side sessions behind the HttpOnly cookie. Only a keyed
-- hash of the cookie value is stored, so a database read cannot be replayed
-- as a cookie.
-- ---------------------------------------------------------------------------
create table public.app_sessions (
  id           uuid primary key default gen_random_uuid(),
  employee_id  uuid not null references public.employees (id) on delete cascade,
  token_hash   text not null unique,
  created_at   timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  expires_at   timestamptz not null,
  user_agent   text
);

create index app_sessions_employee_idx on public.app_sessions (employee_id);
create index app_sessions_expires_idx on public.app_sessions (expires_at);

-- ---------------------------------------------------------------------------
-- microsoft_token_caches: each employee's MSAL token cache (refresh token for
-- delegated Azure DevOps / future Graph calls), AES-256-GCM encrypted by the
-- backend with TOKEN_ENCRYPTION_KEY. Never sent to the browser.
-- ---------------------------------------------------------------------------
create table public.microsoft_token_caches (
  employee_id     uuid primary key references public.employees (id) on delete cascade,
  home_account_id text not null,
  encrypted_cache text not null,
  updated_at      timestamptz not null default now()
);

create trigger microsoft_token_caches_set_updated_at
  before update on public.microsoft_token_caches
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- employee_presence: "connected to the Virtual Office" only — never Microsoft
-- sign-in state or Azure activity. socket_count lets several tabs/devices stay
-- online until the last one disconnects.
-- ---------------------------------------------------------------------------
create table public.employee_presence (
  employee_id  uuid primary key references public.employees (id) on delete cascade,
  online       boolean not null default false,
  socket_count integer not null default 0 check (socket_count >= 0),
  last_seen_at timestamptz,
  updated_at   timestamptz not null default now()
);

-- Atomic counters, so two tabs connecting at once cannot lose an increment.
create or replace function public.presence_connect(p_employee_id uuid)
returns public.employee_presence
language sql
set search_path = ''
as $$
  insert into public.employee_presence as p (employee_id, online, socket_count, last_seen_at, updated_at)
  values (p_employee_id, true, 1, now(), now())
  on conflict (employee_id) do update
    set socket_count = p.socket_count + 1,
        online       = true,
        last_seen_at = now(),
        updated_at   = now()
  returning p.*;
$$;

create or replace function public.presence_disconnect(p_employee_id uuid)
returns public.employee_presence
language sql
set search_path = ''
as $$
  update public.employee_presence as p
     set socket_count = greatest(p.socket_count - 1, 0),
         online       = p.socket_count - 1 > 0,
         last_seen_at = now(),
         updated_at   = now()
   where p.employee_id = p_employee_id
  returning p.*;
$$;

-- The backend is a single instance: on boot no socket can still be connected.
create or replace function public.presence_reset_all()
returns void
language sql
set search_path = ''
as $$
  update public.employee_presence
     set online = false, socket_count = 0, updated_at = now()
   where online or socket_count > 0;
$$;

-- ---------------------------------------------------------------------------
-- Lock everything down to the backend's service role.
-- ---------------------------------------------------------------------------
alter table public.employees              enable row level security;
alter table public.avatar_profiles        enable row level security;
alter table public.app_sessions           enable row level security;
alter table public.microsoft_token_caches enable row level security;
alter table public.employee_presence      enable row level security;

revoke all on table
  public.employees,
  public.avatar_profiles,
  public.app_sessions,
  public.microsoft_token_caches,
  public.employee_presence
from anon, authenticated;

grant select, insert, update, delete on table
  public.employees,
  public.avatar_profiles,
  public.app_sessions,
  public.microsoft_token_caches,
  public.employee_presence
to service_role;

revoke execute on function
  public.presence_connect(uuid),
  public.presence_disconnect(uuid),
  public.presence_reset_all(),
  public.set_updated_at()
from public, anon, authenticated;

grant execute on function
  public.presence_connect(uuid),
  public.presence_disconnect(uuid),
  public.presence_reset_all()
to service_role;
