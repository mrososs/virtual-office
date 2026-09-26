-- iSaned Virtual Office — Azure DevOps PAT connections (interim mode without an
-- Entra app registration).
--
-- Each employee's Azure DevOps credential lives on their existing
-- azure_devops_connections row: either a Personal Access Token (sealed with
-- AES-256-GCM by the backend, TOKEN_ENCRYPTION_KEY) or a delegated Entra
-- token cache (microsoft_token_caches, future mode). Additive only: new
-- nullable/defaulted columns, and the status CHECK is widened (the old
-- RECONNECT_REQUIRED value is folded into EXPIRED first). No data is removed.

alter table public.azure_devops_connections
  add column credential_type text not null default 'PAT',
  add column encrypted_pat   text,
  add column pat_expires_at  timestamptz,
  add column organization    text,
  add column project         text,
  add column last_sync_at    timestamptz;

comment on column public.azure_devops_connections.encrypted_pat is
  'AES-256-GCM sealed PAT (v1.<iv>.<tag>.<ciphertext>). Never plaintext; never returned by the API.';
comment on column public.azure_devops_connections.pat_expires_at is
  'Expiry the employee entered when saving the PAT (Azure DevOps does not expose it to PAT holders).';

alter table public.azure_devops_connections
  add constraint azure_devops_connections_credential_type_check
    check (credential_type in ('PAT', 'ENTRA')),
  -- Defense in depth: only the backend's sealed format can be stored, so a raw token can never land here.
  add constraint azure_devops_connections_encrypted_pat_sealed
    check (encrypted_pat is null or encrypted_pat ~ '^v1\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$'),
  -- A usable PAT connection must actually hold a PAT; disconnecting clears it.
  add constraint azure_devops_connections_pat_present
    check (credential_type <> 'PAT' or status = 'DISCONNECTED' or encrypted_pat is not null);

-- Statuses: CONNECTED, EXPIRED (past its expiry / needs renewal), INVALID (rejected:
-- mistyped, revoked or expired without a known date), ERROR (valid but cannot read
-- the configured project), DISCONNECTED (removed by the employee).
update public.azure_devops_connections set status = 'EXPIRED' where status = 'RECONNECT_REQUIRED';

alter table public.azure_devops_connections
  drop constraint azure_devops_connections_status_check;

alter table public.azure_devops_connections
  add constraint azure_devops_connections_status_check
    check (status in ('CONNECTED', 'EXPIRED', 'INVALID', 'ERROR', 'DISCONNECTED'));
