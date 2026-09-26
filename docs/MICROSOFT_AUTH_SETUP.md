# Microsoft Entra ID sign-in — setup (future / optional)

> **Status: inactive.** The current Virtual Office signs people in with an
> Azure DevOps token (`AUTH_PROVIDER=azure_pat`, see
> [AZURE_PAT_AUTH.md](./AZURE_PAT_AUTH.md)) because creating an Entra app
> registration in the company tenant needs IT approval. Everything below is
> implemented and kept ready: once IT approves the registration, set
> `AUTH_PROVIDER=microsoft_entra` plus the `ENTRA_*` values — no change to
> employees, avatars, sessions, the office or the Activity Engine. It is also
> the prerequisite for Teams / Calendar (Microsoft Graph).

The Virtual Office signs people in with **Microsoft Entra ID**, single-tenant
(the iSaned tenant only), using the **authorization code flow with PKCE** in a
backend-for-frontend design:

```
Vue /login ──click──▶ GET /api/auth/microsoft/login          (NestJS, MSAL Node)
                         │  state + nonce + PKCE verifier sealed in an HttpOnly cookie (10 min)
                         ▼
             login.microsoftonline.com/<iSaned tenant>/oauth2/v2.0/authorize
                         │  (user signs in on Microsoft's page)
                         ▼
          GET /api/auth/microsoft/callback?code&state        (NestJS)
             validate state → redeem code (+ verifier, nonce) → check tid / iss / aud / oid
             → match a pre-approved employee → create app session → Set-Cookie (HttpOnly)
                         ▼
             302 → /office (or /profile/avatar on first login) → Vue calls GET /api/auth/me
```

The browser/PWA only ever holds the app's **HttpOnly session cookie**. The
client secret, Microsoft access/refresh tokens and the code exchange stay in
the backend; refresh tokens are stored AES-256-GCM encrypted in Supabase
(`microsoft_token_caches`) for delegated Azure DevOps access.

Library: [`@azure/msal-node`](https://www.npmjs.com/package/@azure/msal-node) v7
(`ConfidentialClientApplication`), Microsoft's supported Node library for web
apps. Legacy Azure DevOps OAuth is **not** used (deprecated, closed to new
apps since April 2025).

---

## 1. Create the app registration (Microsoft Entra admin center)

You need an account that can register applications in the iSaned tenant.

1. Go to <https://entra.microsoft.com> → **Identity → Applications → App registrations → New registration**.
2. **Name:** `iSaned Virtual Office`.
3. **Supported account types:** **Accounts in this organizational directory only (iSaned only — Single tenant)**.
   Do not choose multitenant or personal Microsoft accounts.
4. **Redirect URI:** platform **Web** (not SPA), value:
   - local development: `http://localhost:5173/api/auth/microsoft/callback`
   - production: `https://<your-office-domain>/api/auth/microsoft/callback`
5. **Register.**

On the **Overview** page copy:

| Portal field                      | Backend env var    |
| --------------------------------- | ------------------ |
| Directory (tenant) ID             | `ENTRA_TENANT_ID`  |
| Application (client) ID           | `ENTRA_CLIENT_ID`  |

> The tenant ID must be the GUID. `common`, `organizations` and `consumers`
> are rejected at startup — they would let other tenants' users reach the
> sign-in page.

### Redirect URIs (Authentication blade)

Add every environment's callback as a **Web** redirect URI. Localhost over
`http://` is allowed by Microsoft; production must be `https://`. The value
must match `ENTRA_REDIRECT_URI` exactly (scheme, host, port, path).

Leave **Implicit grant** (access tokens / ID tokens) **unchecked** — the app
uses the authorization code flow only. Front-channel logout URL is not needed.

### Client secret (Certificates & secrets)

**New client secret** → description `virtual-office-backend`, pick an expiry
(e.g. 12 months) → copy the **Value** (not the Secret ID) into
`ENTRA_CLIENT_SECRET`. Put a reminder in the calendar to rotate it before it
expires. It goes in the backend environment only — never in the frontend, never
in git.

### API permissions (delegated)

Sign-in needs only the OpenID Connect basics. Under **API permissions → Add a
permission → Microsoft Graph → Delegated**:

| Permission        | Why                                                  |
| ----------------- | ---------------------------------------------------- |
| `openid`          | sign-in                                              |
| `profile`         | display name                                         |
| `email`           | work email (matched against the approved employee list) |
| `offline_access`  | refresh token, so the backend can later call Azure DevOps on the user's behalf |

(`User.Read` is added by default; it is harmless but not required — you may
remove it.) Azure DevOps permissions are added separately — see
[AZURE_DEVOPS_SETUP.md](./AZURE_DEVOPS_SETUP.md).

**Grant admin consent for iSaned** if your tenant does not allow users to
consent to apps themselves (common in companies). Without it, users see
"Need admin approval" and the app shows *"iSaned Virtual Office needs approval
from your organization."*

### Optional hardening

- **Enterprise applications → iSaned Virtual Office → Properties →
  Assignment required? = Yes**, then assign the team (or a group). Microsoft
  then blocks everyone else before they even reach the app. The app keeps its
  own pre-approved employee list either way.
- Conditional Access / MFA policies apply automatically (it's a normal Entra sign-in).

---

## 2. Configure the backend

`backend/.env` (copy of `backend/.env.example`, gitignored):

```ini
AUTH_PROVIDER=microsoft_entra
APP_URL=http://localhost:5173
ENTRA_TENANT_ID=<Directory (tenant) ID>
ENTRA_CLIENT_ID=<Application (client) ID>
ENTRA_CLIENT_SECRET=<client secret value>
ENTRA_REDIRECT_URI=http://localhost:5173/api/auth/microsoft/callback

# 48+ random chars / 32 random bytes — generate once per environment:
SESSION_SECRET=<node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))">
TOKEN_ENCRYPTION_KEY=<node -e "console.log(require('crypto').randomBytes(32).toString('base64'))">

SUPABASE_URL=https://<project-ref>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<service role / secret key — backend only>
```

With `NODE_ENV=production` and `AUTH_PROVIDER=microsoft_entra` the backend
refuses to start unless all of the above are set, `APP_URL`/`ENTRA_REDIRECT_URI` use `https://`, and
`DEMO_MODE` is not `true`.

Rotating `TOKEN_ENCRYPTION_KEY` makes stored Microsoft tokens unreadable
(people simply reconnect Azure DevOps). Rotating `SESSION_SECRET` signs
everyone out.

## 3. Approve the team (employee seed)

Nobody can create an account by signing in: an `employees` row must exist
first, matched by email on the first sign-in, then linked permanently to the
Microsoft object ID (`entra_object_id` + `entra_tenant_id`). Email changes
later do not break the link.

```bash
cp backend/seed/employees.example.json backend/seed/employees.json   # gitignored
# edit: email (work UPN/email), displayName, role, optional deskId
npm run seed:employees -w backend -- --dry-run
npm run seed:employees -w backend
```

Roles are **only** `GENERAL_MANAGER`, `PROJECT_MANAGER`, `TEAM_LEAD`,
`DEVELOPER`, `QA`, and they come from this list — never from Microsoft job
titles or Azure DevOps permissions. Omitted desks are assigned on first
sign-in (first free desk in the role's area). To remove access, set
`"isActive": false` and re-run the seed: existing sessions end at their next
request.

The email in the seed must equal what Entra returns as `email` or, if empty,
`preferred_username` (usually the UPN, e.g. `name@isaned.com`).

## 4. Local development

```bash
npm install
cp backend/.env.example backend/.env    # fill in Entra + Supabase + secrets, DEMO_MODE=false
npm run build:shared
npm run dev:backend                     # http://localhost:3001 (API + Socket.IO)
# frontend: production auth instead of demo identities
VITE_DEMO_MODE=false npm run dev:frontend   # http://localhost:5173 — /api and /socket.io are proxied
```

On Windows PowerShell: `$env:VITE_DEMO_MODE='false'; npm run dev:frontend`, or
create `frontend/.env.development.local` with `VITE_DEMO_MODE=false`.

The app, API and socket share the origin `http://localhost:5173` through the
Vite proxy, so the session cookie is first-party and the Microsoft redirect
URI stays on the app's origin.

## 5. Production deployment notes

- Serve the built SPA and the API from **one origin**, e.g. a reverse proxy:
  `/` → `frontend/dist` (SPA fallback to `index.html`), `/api/*` and
  `/socket.io/*` (WebSocket upgrade) → NestJS. Cookies are then
  `__Host-vo_session` (HttpOnly, Secure, SameSite=Lax, Path=/).
- `APP_URL` = that origin; the API rejects state-changing requests and
  sockets from any other `Origin`.
- The backend sets `trust proxy` in production so `Secure` cookies work
  behind TLS termination.
- Run a **single** backend instance (presence and realtime state are in
  process); scale-out needs a shared store first.

## 6. Session policy

| Setting                          | Default | Meaning                                    |
| -------------------------------- | ------- | ------------------------------------------ |
| `SESSION_IDLE_TIMEOUT_HOURS`     | 168     | ends after 7 days without any request      |
| `SESSION_ABSOLUTE_TIMEOUT_DAYS`  | 30      | hard maximum, active or not                |

The installed PWA reopens straight into the office while the session is valid;
after expiry it shows the sign-in page (one click, usually no password thanks
to Microsoft SSO). **Sign out** deletes the server session, clears the cookie,
closes that session's sockets (office presence ends immediately) and reloads to
`/login`. It does not sign you out of Microsoft itself.

## 7. Failure states you may see

| `/login?error=`       | Cause                                                            |
| --------------------- | ---------------------------------------------------------------- |
| `not_authorized`      | Microsoft account is not a pre-approved employee (or its email is linked to another Microsoft account) — "Your account is not authorized to access iSaned Virtual Office." |
| `account_disabled`    | employee `is_active = false`                                     |
| `wrong_tenant`        | token from another tenant / unexpected issuer                   |
| `cancelled`           | user cancelled or declined consent                               |
| `consent_required`    | tenant requires admin consent                                    |
| `login_expired`       | flow cookie missing/expired, state mismatch, code already used   |
| `not_configured`      | `ENTRA_*` not set on the server                                  |
| `service_unavailable` | Microsoft or the database unreachable                            |
| `login_failed`        | anything else (see backend logs)                                 |

If the backend itself is unreachable, `/login` shows *"Can't reach the
Virtual Office"* with **Retry** instead of redirecting anywhere (no loops).

## 8. Microsoft Graph later (Teams / Calendar)

The same app registration and token cache are reused: when the calendar
integration ships, add delegated **Microsoft Graph → `Calendars.Read`** (and
`OnlineMeetings.Read` only if needed) and request it with incremental consent
from the Integrations page, exactly like Azure DevOps. Nothing is requested at
sign-in beyond the OpenID basics.
