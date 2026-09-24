# @virtual-office/shared

Domain types and the Socket.IO event contract shared between `frontend` and
`backend`. Nothing here should depend on Vue, Phaser, or NestJS — this
package must stay framework-agnostic so both apps can import it freely.

- `src/types/` — `Employee`, `Office`, `Room`, `Desk`, `Meeting`, activity &
  presence types, navigation/movement types.
- `src/events/socket-events.ts` — `SOCKET_EVENTS` (canonical event-name
  constants), `ServerToClientEvents` / `ClientToServerEvents` /
  `InterServerEvents` / `SocketData` for typing the Socket.IO server and
  client, and one payload interface per event.

## Build

```bash
npm run build --workspace shared
```

Emits `dist/` (`.js` + `.d.ts`). Both `frontend` and `backend` resolve this
package via the npm workspace (`"@virtual-office/shared": "*"`), so run this
build (or `npm run dev --workspace shared` to watch) whenever you change a
shared type while the other apps' dev servers are running.

## Adding a new domain type or event

1. Add the type to the relevant file in `src/types/`, export it from
   `src/types/index.ts`.
2. For a new realtime event: add the name to `SOCKET_EVENTS`, add its
   payload interface, and add it to `ServerToClientEvents` or
   `ClientToServerEvents` in `src/events/socket-events.ts`.
3. Rebuild (`npm run build --workspace shared`). Both apps get the new type
   immediately — never redefine it locally in `frontend` or `backend`.
