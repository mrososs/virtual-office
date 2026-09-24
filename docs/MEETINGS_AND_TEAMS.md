# Meetings & Microsoft Teams integration

## Flow (target architecture)

```
Microsoft 365 Calendar
        │  (Microsoft Graph)
        ▼
backend/src/modules/microsoft/calendar   (MicrosoftCalendarService)
        │  CalendarEventMapper -> internal Meeting domain type
        ▼
backend/src/modules/meetings              (MeetingSchedulerService)
        │  tracks upcoming/starting-soon/live meetings
        ▼
MeetingRoomAllocator                       (picks/reserves a virtual Meeting Room)
        │
        ▼
Socket event (meeting:scheduled / starting_soon / started / room_assigned)
        │
        ▼
Phaser (via GameBridge)  — attendee avatars can auto-walk to the assigned room
        │
        ▼
Vue Meeting Room panel — title, time, attendees, LIVE/UPCOMING, "Join Teams Meeting" button
```

The user always chooses whether to actually join — clicking **Join Teams
Meeting** opens the real Microsoft Teams `joinUrl` in a new tab/window.
**Never** auto-enable microphone/camera, and never auto-connect a user to a
call. This rule has no exception and no config flag.

## Domain model, independent of Microsoft Graph

`shared`'s `Meeting` type is provider-agnostic:

```ts
Meeting {
  id, organizationId
  externalProvider: 'TEAMS' | 'GOOGLE_MEET' | 'ZOOM' | 'OTHER'
  externalMeetingId
  title, startAt, endAt
  status: 'SCHEDULED' | 'STARTING_SOON' | 'LIVE' | 'ENDED' | 'CANCELLED'
  joinUrl        // opaque, supplied by the provider — never hand-constructed
  attendees: MeetingParticipant[]
  roomId
}
```

Teams is the first (and only implemented) provider, but nothing in the
scheduler, allocator, or domain types assumes Microsoft specifically —
adding Zoom/Google Meet later means writing a new mapper under a new
`modules/<provider>/meetings/` folder, not touching `meetings/`.

`MeetingParticipant` maps a calendar attendee to an internal `Employee` by
email via `MeetingParticipantMapper` — **not every attendee is necessarily a
registered employee** (external guests, distribution lists); the mapper must
tolerate `employeeId: null`.

## Meeting Scheduler

`backend/src/modules/meetings/meeting-scheduler.service.ts`. Responsibilities:

- Track upcoming meetings (from synced calendar data).
- Identify meetings starting soon (configurable lead time, e.g. 2 minutes)
  and emit `meeting:starting_soon`.
- Identify meetings that have gone live and emit `meeting:started`.
- Ask `MeetingRoomAllocator` to assign/release a virtual room.
- Emit meeting lifecycle events: `meeting:scheduled`, `meeting:starting_soon`,
  `meeting:started`, `meeting:ended`, `meeting:cancelled`,
  `meeting:room_assigned`.

No cron/queue infrastructure yet — a simple service interface + TODO for the
scheduling trigger (a NestJS `@Interval`/`@Cron` later, or an external queue,
is an implementation detail deferred past this scaffold).

## Meeting Room Allocation

`backend/src/modules/meetings/meeting-room-allocator.service.ts`. Given N
mapped attendees, prefer the smallest available room whose `capacity >= N`
(e.g. 6 attendees → a capacity-8 room over a capacity-12 room). Kept
intentionally simple — no waitlists, no overflow splitting, no reservation
conflict algorithms in this scaffold.

## Future: embedded Teams via Azure Communication Services

Not implemented, not installed (no ACS SDK dependency added). Documented
here so the seam is obvious later:

```
Virtual Office → Meeting Room → "Join Meeting" → Azure Communication Services → Teams Meeting
```

Would add mic/camera/audio/video/screen-share *inside* the app as an
advanced/premium tier. For MVP, "Join Meeting" simply opens the Teams
`joinUrl` in the browser — that behavior should not need to change when ACS
is added later (it becomes an additional option, not a replacement).
