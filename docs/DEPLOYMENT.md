# Deployment — Vercel (SPA) + Railway (API)

```text
browser ──► https://isaned-virtual-office.vercel.app   Vue SPA + PWA (static, Vercel)
   │            └─ /api/*  ──rewrite──►  https://api-production-15b0.up.railway.app/api/*
   │                                          NestJS (Railway) ──► Supabase
   └── wss://api-production-15b0.up.railway.app/socket.io   (direct, realtime ticket)
```

## Why it is wired this way

`*.vercel.app` and `*.up.railway.app` are different **sites**, and the session
is an HttpOnly, SameSite=Lax, host-only cookie (`__Host-vo_session`). So:

- **HTTP API — same origin through a Vercel rewrite.** The browser only ever
  talks to the Vercel host; Vercel proxies `/api/*` to Railway. The cookie is
  first-party, `APP_URL` is the Vercel URL, and the Origin check (CSRF) passes.
- **Socket.IO — direct to Railway with a realtime ticket.** Vercel cannot
  proxy WebSockets, and the cookie can't reach Railway. With `VITE_SOCKET_URL`
  set, the client first calls `POST /api/auth/realtime-ticket` (same origin,
  cookie-authenticated) and connects with `auth: { ticket }`. The ticket is
  HMAC-signed with a key derived from `SESSION_SECRET`, bound to one session,
  valid 60 s and accepted once; the gateway then checks the session like a
  cookie (alive, employee active), and logout / disabling still closes it.
  Without `VITE_SOCKET_URL` (local dev, single-origin hosting) nothing changes:
  the socket uses the cookie.

Preview deployments (other `*.vercel.app` URLs) are rejected by the Origin
check on purpose — only the production domain in `APP_URL` can use the API.

## Railway (API)

Service `api` in project *imaginative-strength*, domain
`https://api-production-15b0.up.railway.app` (target port 8080). Build and start
come from [`railway.json`](../railway.json) (Railpack, npm workspaces:
`npm run build:shared && npm run build -w backend`, start
`npm run start:prod -w backend`, health check `GET /api/auth/config`).

Variables (secrets are set from the CLI, never committed):

| Variable | Value |
| --- | --- |
| `NODE_ENV` | `production` (boot refuses missing secrets / demo mode) |
| `NPM_CONFIG_INCLUDE` | `dev` (the build needs TypeScript and the Nest CLI) |
| `PORT` | `8080` |
| `APP_URL` | `https://isaned-virtual-office.vercel.app` (the Vercel production URL) |
| `TRUST_PROXY_HOPS` | `2` (Vercel + Railway proxies → rate limits see the visitor) |
| `AUTH_PROVIDER` / `DEMO_MODE` | `azure_pat` / `false` |
| `SESSION_SECRET` | production-only random value (≥ 32 chars) |
| `TOKEN_ENCRYPTION_KEY` | same key as the environment that saved existing tokens (they are sealed with it) |
| `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` | the Supabase project |
| `AZURE_DEVOPS_ORGANIZATION` / `AZURE_DEVOPS_PROJECT` | `iSaned` / `Saned System - Version 03` |
| `AZURE_DEVOPS_SYNC_INTERVAL_SECONDS` | `120` |
| `SESSION_IDLE_TIMEOUT_HOURS` | `336` |

Deploy: `railway link` (project, environment `production`, service `api`), then
`railway up` from the repository root. The CLI uploads the working tree minus
`.gitignore`d and [`.railwayignore`](../.railwayignore)d files, so `backend/.env`
never leaves the machine. (Railway plans to retire `railway.json` on 2026-12-01 in
favor of `.railway/railway.ts`: `railway config migrate`.)

## Vercel (SPA)

Project `isaned-virtual-office` (production: https://isaned-virtual-office.vercel.app). [`vercel.json`](../vercel.json) sets the npm
workspace build, output `frontend/dist`, the `/api` rewrite, the SPA fallback,
and cache headers (`sw.js`, manifest and `index.html` always revalidate; hashed
`/assets` are immutable).

Environment (production): `VITE_DEMO_MODE=false`,
`VITE_SOCKET_URL=https://api-production-15b0.up.railway.app`.

Deploy with a local build so only the built files are uploaded:

```bash
vercel pull --yes --environment=production
vercel build --prod
vercel deploy --prebuilt --prod
```

A plain `vercel deploy` uploads source and does not honor `.gitignore`;
`.vercelignore` keeps `.env` files and the backend out if someone runs it.

## Database

Production uses the same Supabase project as local development (there is only
one). Don't run a local backend against it while production is live — both
would run the Azure DevOps sync and count presence. Migrations are applied as
before (Supabase MCP / SQL editor); deploying the API never changes the schema.

## After a deploy

1. `GET https://isaned-virtual-office.vercel.app/api/auth/config` → `{"provider":"azure_pat", …}`.
2. Sign in on the Vercel URL (work email + your own read-only PAT).
3. The office shows *Live*: `POST /api/auth/realtime-ticket` → 200, socket connected.
