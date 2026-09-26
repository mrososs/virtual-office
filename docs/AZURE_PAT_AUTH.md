# Sign-in with an Azure DevOps token (current mode)

`AUTH_PROVIDER=azure_pat` — the interim, IT-independent way into iSaned
Virtual Office. It needs **no Microsoft Entra app registration**. Microsoft
Entra sign-in stays implemented but inactive until IT approves one (see
[MICROSOFT_AUTH_SETUP.md](./MICROSOFT_AUTH_SETUP.md)).

## How it works

```
First use                                   Later (installed PWA, next morning…)
─────────                                   ──────────────────────────────────
/login: work email + PAT (once)             open app → cookie present
  │ POST /api/auth/azure-pat/login            │ GET /api/auth/me → 200
  ▼                                           ▼
NestJS asks Azure DevOps whose token it is   office opens directly — no token prompt
  (GET https://dev.azure.com/<org>/_apis/connectionData, Basic auth)
  │ → Azure identity: id + verified email (uniqueName)
  ▼
match an APPROVED employee (employees table):
  • identity id already linked → that employee (typed email must be theirs)
  • else Azure's verified email == typed email == an employee row → link it
  • otherwise → "Your account is not authorized to access iSaned Virtual Office."
  │
  ├─ PAT sealed (AES-256-GCM, TOKEN_ENCRYPTION_KEY) → azure_devops_connections
  ├─ identity mapping saved (azure_devops_identities, VERIFIED_SIGN_IN)
  └─ app session created (app_sessions) → HttpOnly cookie
  ▼
no avatar? → /profile/avatar → save to Supabase → office
```

**The PAT is not the session.** It is an external integration credential.
The browser receives only our opaque session cookie (HttpOnly, SameSite=Lax,
Secure + `__Host-` over HTTPS). Every later request — and the Socket.IO
connection — is authenticated by that cookie, never by the PAT. The PAT is
used server-side only, to read Azure DevOps.

You are asked for a token again only when:

- your application session ended (14 days without opening the app, 30 days at most, or you signed out), or
- you chose **Disconnect** — or Azure DevOps rejects the saved token (expired / revoked). In
  that case you **stay in the office**; the top bar and the Integrations page
  show *"Azure connection needs attention"* with **Update token**.

## Security model

| What                   | How                                                                                     |
| ---------------------- | --------------------------------------------------------------------------------------- |
| PAT in transit         | Once, in the sign-in / "Update token" request body over HTTPS (same origin).            |
| PAT at rest            | `azure_devops_connections.encrypted_pat` = AES-256-GCM sealed `v1.<iv>.<tag>.<ciphertext>` (fresh IV per seal, auth tag rejects tampering). A database CHECK constraint refuses anything that is not in that sealed format, so a plaintext PAT cannot be stored. Key: `TOKEN_ENCRYPTION_KEY` (backend only). |
| PAT in use             | Decrypted in memory just before an Azure DevOps request, sent as `Authorization: Basic base64(":" + PAT)` from NestJS only. |
| Returned to browsers   | Never. No API returns the PAT or its encrypted value; the form clears the field after sending. |
| Logs                   | Only method + path are logged; request bodies, headers and PATs are not. Refusals log a code (`invalid_token`, …), not the value. |
| Errors to the browser  | Our own codes/messages only (`invalid_token`, `email_mismatch`, `not_authorized`, …) — never Azure's raw text. |
| Brute force            | Failed checks are rate-limited: 5 per email and 20 per IP per 15 minutes (also 5 per employee for "Update token"), answered with HTTP 429. |
| Who may sign in        | Only rows in `employees` (seeded by the team). A valid Azure DevOps user who is not on the roster is refused; nobody is created automatically. |
| Identity keys          | Azure identity **id** (stable) once linked; the verified email only for the first link. Display names are never used as keys. |
| Other users            | A PAT is used only for its owner's connection and, when that connection is picked, for the read-only team sync. It is never shared with or visible to other employees. |

Microsoft's guidance is to prefer Entra tokens over PATs for applications;
this mode exists because an app registration is not available yet. Keep PATs
**organization-scoped, read-only and short-lived** (global PATs stop working on
1 December 2026).

## Create a token (users)

The login page and the Integrations page have a **How do I create a token?**
guide. In short:

1. Azure DevOps → **User settings** (person icon, top right) → **Personal access tokens**
   (`https://dev.azure.com/<org>/_usersSettings/tokens`).
2. **+ New Token**, name it e.g. *iSaned Virtual Office*.
3. **Organization:** the iSaned organization only (not "All accessible organizations").
4. **Expiration:** short and sensible, e.g. 30 days. Enter the same date in the
   Virtual Office form (optional) so it can warn you before it expires.
5. **Scopes:** *Custom defined*, then only:

   | Scope (as shown in Azure DevOps) | Used for                                  |
   | -------------------------------- | ----------------------------------------- |
   | **Work Items — Read**            | current sprint, tasks, bugs, iterations   |
   | **Code — Read**                  | pull request metadata and reviewers (never file contents) |
   | **Build — Read**                 | running and recent builds                 |
   | **Project and Team — Read**      | the project, its team and members         |

   No write, manage, execute or admin scopes.
6. **Create**, copy the token — **Azure DevOps shows it only once.**

Never share a token with a teammate; everyone uses their own.

> Identity check: `_apis/connectionData` (whose token is this) is answered for
> any valid token of the organization. Microsoft's Profiles API is not used —
> it does not accept PATs. Verified against iSaned on 2026-09-26: sign-in,
> identity linking and the full sync work with exactly the four scopes above;
> **User Profile (Read) is not required.**

## Expiry and renewal

A PAT can't be refreshed like OAuth. Statuses of your connection:

| Status        | Meaning                                                            | You see                         |
| ------------- | ------------------------------------------------------------------ | ------------------------------- |
| CONNECTED     | Token works and can read the project                               | Connected                       |
| EXPIRED       | Past the expiry date you entered                                   | Needs attention → Update token  |
| INVALID       | Azure DevOps rejects it (revoked, expired, mistyped; Azure answers the same 401 for all of these) | Needs attention → Update token |
| ERROR         | Token works but can't read the configured project (missing scope / not a project member) — the message names the scope | Needs attention |
| NOT_CONNECTED | No token saved (never added, or Disconnect)                        | Add token                       |

**Update token** (Integrations page) re-verifies that the new token is yours,
replaces the sealed value and keeps the same employee record, avatar and
history. **Disconnect** erases the sealed PAT; your office account stays.

The app re-checks a saved token in the background when you open it (at most
every few hours), and the scheduled sync marks tokens it can't use.

## Sessions

| Setting                         | Default | Why                                                                 |
| ------------------------------- | ------- | ------------------------------------------------------------------- |
| `SESSION_IDLE_TIMEOUT_HOURS`    | 336 (14 days) | Signing in again means creating a new PAT (Azure shows it once), so a normal holiday must not sign people out. |
| `SESSION_ABSOLUTE_TIMEOUT_DAYS` | 30      | Matches Azure DevOps' default PAT lifetime: token and session renew together. |

Sign out deletes the server session, clears the cookie and closes that
session's sockets (office presence ends immediately). Disabling an employee
(`is_active = false`) ends their sessions at the next request.

## Team data: one sync, many identities

The scheduled sync (default every 120 s) reads the project **once per run**
with one healthy connection (most recently verified first), then maps
*Assigned To*, reviewers and *Requested For* to employees through the stored
identity mapping. Other employees' tokens are not used for that run — their
connections stay as identity proof and fallbacks if the first one fails. Data
visible to the office is what that team member can read in Azure DevOps. A
future team/service credential would plug in as one more credential type
without touching the Activity Engine. Details: [AZURE_DEVOPS_SETUP.md](./AZURE_DEVOPS_SETUP.md).

## API

| Method & path                       | Auth     | Purpose                                              |
| ----------------------------------- | -------- | ---------------------------------------------------- |
| `GET /api/auth/config`              | public   | which sign-in the login page shows                   |
| `POST /api/auth/azure-pat/login`    | public   | `{ email, token, expiresOn? }` → session cookie + `/auth/me` body |
| `GET /api/auth/me`                  | session  | employee, avatar, session expiry, Azure connection status |
| `POST /api/auth/logout`             | —        | destroy session, clear cookie                        |
| `GET /api/integrations/status`      | session  | Azure DevOps connection + sync details               |
| `POST /api/integrations/azure/token`| session  | `{ token, expiresOn? }` replace my PAT               |
| `POST /api/integrations/azure/verify` | session | re-check my saved token now                          |
| `POST /api/integrations/azure/sync` | session  | run the team sync now                                |
| `DELETE /api/integrations/azure`    | session  | forget my PAT                                        |

## Configuration

```ini
AUTH_PROVIDER=azure_pat
AZURE_DEVOPS_ORGANIZATION=<name in https://dev.azure.com/<name>>   # required
AZURE_DEVOPS_PROJECT=<project>                                      # needed for the team sync
AZURE_DEVOPS_TEAM=                                                  # optional (default team)
TOKEN_ENCRYPTION_KEY=<32 random bytes, base64>                      # encrypts PATs
SESSION_SECRET=<48+ random chars>
```

No `ENTRA_*` value is needed in this mode, in development or production.
