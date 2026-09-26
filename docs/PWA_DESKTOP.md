# Desktop app (PWA)

iSaned Virtual Office installs as a **Progressive Web App** on Windows (Edge
or Chrome): its own window, Start menu entry, taskbar icon (pinnable), and it
opens straight into `/office` when the session is valid.

Implementation: [`vite-plugin-pwa`](https://vite-pwa-org.netlify.app/) (Workbox
`generateSW`), configured in `frontend/vite.config.ts`.

## Manifest

| Field              | Value                                   |
| ------------------ | --------------------------------------- |
| `name`             | iSaned Virtual Office                   |
| `short_name`       | iSaned Office                           |
| `id` / `scope`     | `/`                                     |
| `start_url`        | `/office` (unauthenticated → `/login`)  |
| `display`          | `standalone`                            |
| `theme_color` / `background_color` | `#0a0c11` (the office canvas) |
| icons              | `pwa-192x192.png`, `pwa-512x512.png` (rounded tile), `pwa-maskable-512x512.png` (full bleed, logo in the safe zone); plus `favicon.ico`, `favicon-32x32.png`, `apple-touch-icon-180x180.png` |

Icons are generated from `frontend/src/assets/branding/company-logo.png`
(scaled uniformly, centered on the dark canvas color because the logo has
white shapes): `bash frontend/scripts/generate-pwa-icons.sh` (needs ffmpeg).

## Service worker strategy

The office is an online, realtime app; the service worker does **not**
pretend otherwise.

- **Precached:** the app shell — `index.html`, JS/CSS chunks (Phaser
  included), fonts, icons, images. Demo-only chunks are excluded.
- **Never cached:** everything under `/api/` (auth, `/auth/me`, office state,
  avatars, integrations, Azure data) and `/socket.io/`. There is no
  `runtimeCaching`, and `navigateFallbackDenylist` keeps `/api/*` and
  `/socket.io/*` navigations (including the Microsoft callback) on the network.
- **Offline / backend down:** the shell still opens; `/login` says *"Can't
  reach the Virtual Office"* with Retry, and inside the office a
  *"Disconnected — reconnecting… statuses may be out of date"* banner shows
  while the socket reconnects (with backoff, indefinitely). After reconnect
  the office reloads its live state from the API.

## Updates

`registerType: 'prompt'`: a new deployment is downloaded in the background and
a small **"New version available · Update"** toast appears. Nothing reloads
until the person clicks **Update** (the page then reloads onto the new
version). Long-running windows check for updates hourly.

## Install

- **In the app:** profile menu → **Install iSaned Virtual Office**, or
  Settings → Desktop app. Shown only when the browser reports the app is
  installable (`beforeinstallprompt`) and it isn't already running as the
  installed app (`display-mode: standalone`).
- **From the browser:** the install icon in the address bar, or Edge ⋯ →
  Apps → *Install this site as an app* / Chrome ⋮ → *Cast, save and share → Install page as app*.

Requirements: HTTPS in production (localhost is allowed for development).

## Start with Windows

Browsers do not let a page register itself for Windows startup, and the app
doesn't try. For an Edge-installed app each user can turn it on:

1. Open `edge://apps`.
2. On the **iSaned Virtual Office** card choose **Details** (or its ⋯ menu).
3. Turn on **Auto-start on device login**.

Edge may also offer this in the install dialog. Settings → Desktop app and a
one-time toast after installing explain the same steps. Chrome has no
per-app auto-start setting.

**Later (not implemented):** iSaned IT can enforce installation and startup
for managed devices with Microsoft Edge enterprise policies
(`WebAppInstallForceList`, and the web app auto-start policies).

## Sign-in inside the installed app

Current mode (`AUTH_PROVIDER=azure_pat`): the first launch shows the login
form (work email + Azure DevOps token, once). It is an in-app form — nothing
redirects out of the window. After that the session cookie keeps the app
signed in (up to 14 days without use, 30 days at most), so launching from the
Start menu or taskbar opens `/office` directly; `/profile/avatar` comes first
only on the very first login. An expired Azure token never blocks the office —
it shows *Azure connection needs attention*.

Future Entra mode: the Microsoft round trip happens in the app window (the
out-of-scope `login.microsoftonline.com` pages appear with a small origin
bar) and the callback (`/api/auth/microsoft/callback`, same origin, inside
the scope) returns to the office. Sign-in is always a deliberate action, never
automatic, so a failed attempt cannot loop.

## Notifications (prepared, not built)

No notification permission is requested. When push notifications are added
(meeting starting, someone asking for you, build failed, review requested),
the service worker is already in place; ask for permission from a clear user
action, never on first load.

## Testing locally

```bash
npm run build:shared && npm run build:frontend
npm run dev:backend                                  # or: node backend/dist/main
npm run preview -w frontend                          # http://localhost:4173, /api proxied
```

Service workers are disabled in `vite dev`; use `preview` and start the backend
with `APP_URL=http://localhost:4173` (the API only accepts that one browser
origin; token sign-in needs nothing else — an Entra redirect URI only matters
in the future Entra mode). Cookies are not port-specific, so a session created
on `:5173` is also valid on `:4173`. In Chrome DevTools → Application: check
*Manifest* (installability) and *Service workers*.

Verified on 2026-09-26 against the real backend: the preview opened `/office`
directly with an existing session, the service worker precached the shell
(nothing under `/api` or `/socket.io`), offline reload showed *Can't reach the
Virtual Office* with Retry, and Retry returned to the office once online.
