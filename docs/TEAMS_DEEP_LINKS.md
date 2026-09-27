# Microsoft Teams — current integration (deep links, no Graph)

The Virtual Office talks to Microsoft Teams **only through official Teams deep
links** built from each employee's work email. There is no Microsoft Entra app
registration, no Microsoft Graph, no token, secret, API key or password —
and employees never configure anything for Teams in the office.

Requirements:

- the employee has a valid company email on their employee record (the same
  address they sign in to the office with), and
- they are signed in to Microsoft Teams (desktop or web) in that browser/PC.

## Identity

`employee.email` **is** the Microsoft Teams sign-in name at iSaned
(`mohamed.osama@obeikan.com.sa` is used for the office, Azure DevOps mapping
and Teams alike). `teamsIdentityOf()` (`shared/src/domain/teams-links.ts`)
returns it lower-cased and validated; if the address is missing or invalid,
Teams actions for that person stay disabled with a note until the employee
record is corrected — there is no Teams setup screen.

A future employee whose Microsoft sign-in differs could get an optional
`teamsUpn` override (`teamsUpn ?? email`); the helper already honours it, but
no one has one, nothing asks for it, and no schema change was made.

## Features

| Where | Action | Deep link |
| --- | --- | --- |
| Employee drawer | **Teams Chat** | `https://teams.microsoft.com/l/chat/0/0?users=<email>` |
| Employee drawer | **Call** (audio) | `https://teams.microsoft.com/l/call/0/0?users=<email>` |
| Collaboration Area | **Start Teams Call** | `…/l/call/0/0?users=<a>,<b>,…` (everyone in the room now) |
| Collaboration Area | **Open Group Chat** | `…/l/chat/0/0?users=<a>,<b>&topicName=<room>` |
| Meeting rooms | **Join Teams Meeting** | the room's pasted, validated Teams meeting link |
| Meeting rooms | **Schedule in Teams** | `…/l/meeting/new?subject=…&attendees=…&startTime=…&endTime=…&content=…` |

Formats follow Microsoft's documentation ([deep links for workflows](https://learn.microsoft.com/microsoftteams/platform/concepts/build-and-test/deep-link-workflow)):
Teams asks for confirmation before placing a call, and a pre-filled chat
message is only placed in the compose box — nothing is sent or dialled
automatically. Parameters are percent-encoded (`%20` for spaces, never `+`);
scheduling times are ISO 8601 with the local UTC offset.

**There is no video call** — no `withVideo`, no camera or microphone access
from the office, no embedded media. Links open with
`window.open(url, '_blank', 'noopener,noreferrer')`; Teams does the rest.

All links come from one helper, `shared/src/domain/teams-links.ts`
(`createChatLink`, `createCallLink`, `createGroupCallLink`,
`createMeetingScheduleLink`, `checkTeamsMeetingUrl`), used by
`features/teams/composables/useTeamsActions.ts`.

## Rooms: live occupancy

Group calls and meeting participants come from the **server's live room
occupancy**, not from what a browser renders (which also shows scripted demo
avatars). Each client reports the room its avatar is in (`player:room`); the
backend keeps one list per room in the presence registry, drops people the
moment their last tab closes, and broadcasts `room:live_occupancy`. Room ids
are validated; the employee is always the socket's authenticated identity.
Only connected employees count, so no stale occupant ends up in a call.

### Collaboration Area (quick collaboration)

Walking in shows a small card: who is here (live), and — once someone else is
there — **Start Teams Call** and **Open Group Chat** for everyone in the room
(unique, without yourself). Alone: "You're the only person here. Waiting for
teammates…". When a teammate walks in while you're there, a toast says
"Mariam joined Collaboration Area" with a **Start Teams Call** button (once per
person per two minutes) and a soft cue plays. **Entering never opens Teams.**

### Meeting rooms (formal meetings)

A meeting room can hold one shared Teams meeting (`MeetingRoomSession`: room,
title, join URL, who attached it, when). Someone standing in the room pastes
an existing Teams meeting link (**Add Teams Meeting Link**); everyone who then
enters sees **Join Teams Meeting**, which opens that link — the office never
joins for anyone. An empty room says so and offers **Add Teams Meeting Link**
and **Schedule in Teams** (Teams' own new-meeting form, pre-filled with the
people in the room). Without Graph the office can't read the new meeting's
link back, so the organizer pastes it afterwards — the UI says this. The
session is ended by whoever attached it or anyone in the room, and expires
after 12 h. Sessions live in backend memory (single Railway instance, like
presence and games): a redeploy clears them.

### Meeting-link security

`checkTeamsMeetingUrl` (enforced by the server before storing; also used for
instant feedback): `https:` only · no username/password · default port · exact
host `teams.microsoft.com`, `teams.live.com` or `teams.cloud.microsoft` (no IPs,
`localhost`, or look-alikes such as `teams.microsoft.com.evil.com`) · path
`/l/meetup-join/19:meeting_…@thread.v2/<n>` or `/meet/<meeting id>` · only
`context` (tenant/organizer ids) and `p` (passcode) survive · fragment dropped
· 512 characters max. `javascript:`, `data:`, `file:`, `http:` and malformed
input are rejected; Outlook Safe Links wrappers get a hint to paste the
original link. The office has no redirect endpoint.

## Office status is not Teams presence

The statuses the office shows — online / away / offline, and temporary office
context such as **Collaborating**, **In Meeting Room 1** or **Playing Chess** —
are **Virtual Office** states (connection + where your avatar is). They are not
Microsoft Teams presence and never claim to be; "Available" means available in
the Virtual Office. Azure DevOps activity underneath is never overwritten.
Calling is never blocked by office status: the caller decides.

## Privacy

Employee emails are only served to signed-in employees (the authenticated
office snapshot). Room occupancy broadcasts carry employee ids, not emails;
group-call links are built in the caller's own browser. Meeting links go to
signed-in office members only.

## Not available without Graph / an app registration

- official Teams presence (Available, Busy, In a call, …)
- automatic calendar sync or meeting import
- reading the join link of a meeting scheduled from the office
- attendance data, call state, recordings, embedded Teams media

## Future (when IT approves an app registration)

Microsoft Graph would **enhance** these same drawers and rooms, not replace
them: official presence next to office status, calendar-driven meeting rooms
(the existing `modules/microsoft` + `meetings` Graph flow in
[`MEETINGS_AND_TEAMS.md`](./MEETINGS_AND_TEAMS.md)), automatic join links, and
attendee lists. The deep-link actions stay as they are.
