import type { ActivityType, Build, Employee, EmployeeActivity, UUID } from '@virtual-office/shared';

import { applyDynamicState } from '@/features/office/data/apply-office-snapshot';
import { useAuthStore } from '@/stores/auth.store';
import { useDemoStore } from '@/stores/demo.store';
import { useEmployeeStore } from '@/stores/employee.store';
import { useMeetingStore } from '@/stores/meeting.store';
import { useNotificationStore } from '@/stores/notification.store';
import { useRoomStore } from '@/stores/room.store';
import { useWorkStore } from '@/stores/work.store';

import { createDemoSnapshot } from '../demo-office.data-source';
import { BUILD, DEMO_ORGANIZATION_ID, PULL_REQUEST } from '../demo.ids';
import { DEMO_CYCLE_LENGTH_S, DEMO_TIMELINE, type DemoAction, type DemoActivity } from '../simulation.demo';

const TICK_MS = 250;

export type DemoTrigger = 'meeting' | 'code-review' | 'break' | 'build';

interface ScheduledTask {
  atMs: number;
  run: () => void;
}

/**
 * Plays the scripted demo timeline against the stores. Everything it does is
 * a domain mutation (activity, presence, meeting/build/PR status); avatars
 * move only because the office director reacts to those changes.
 */
class DemoSimulationService {
  private timer: number | null = null;
  private cycleStartedAt = 0;
  private pausedAt: number | null = null;
  private pausedTotalMs = 0;
  private stepIndex = 0;
  private tasks: ScheduledTask[] = [];

  get isRunning(): boolean {
    return this.timer !== null;
  }

  start(): void {
    if (this.timer !== null) return;
    const demo = useDemoStore();
    demo.cycleLengthMs = DEMO_CYCLE_LENGTH_S * 1000;
    this.beginCycle();
    this.timer = window.setInterval(() => this.tick(), TICK_MS);
    demo.status = 'running';
  }

  stop(): void {
    if (this.timer !== null) window.clearInterval(this.timer);
    this.timer = null;
    this.tasks = [];
    useDemoStore().status = 'idle';
  }

  pause(): void {
    if (this.pausedAt !== null || this.timer === null) return;
    this.pausedAt = Date.now();
    useDemoStore().status = 'paused';
  }

  resume(): void {
    if (this.pausedAt === null) return;
    this.pausedTotalMs += Date.now() - this.pausedAt;
    this.pausedAt = null;
    useDemoStore().status = 'running';
  }

  /** Hard reset: fresh seed data, avatars snap back to their seeded places, timeline from zero. */
  restart(): void {
    const demo = useDemoStore();
    demo.hardResetToken += 1;
    this.reseed();
    useNotificationStore().clear();
    demo.cycle = 1;
    this.beginCycle();
    if (this.timer === null) this.start();
    this.resume();
  }

  setLoop(loop: boolean): void {
    useDemoStore().loop = loop;
  }

  trigger(kind: DemoTrigger): string {
    switch (kind) {
      case 'meeting':
        return this.triggerMeeting();
      case 'code-review':
        return this.triggerTemporaryActivity('CODE_REVIEW', { title: 'Sprint health dashboard filters', pullRequestId: PULL_REQUEST.dashboardFilters, source: 'AZURE_DEVOPS' }, 40);
      case 'break':
        return this.triggerTemporaryActivity('BREAK', { title: 'Quick game break', source: 'MANUAL' }, 35);
      case 'build':
        return this.triggerBuild();
    }
  }

  private get elapsedMs(): number {
    const pausedNow = this.pausedAt !== null ? Date.now() - this.pausedAt : 0;
    return Date.now() - this.cycleStartedAt - this.pausedTotalMs - pausedNow;
  }

  private beginCycle(): void {
    this.cycleStartedAt = Date.now();
    this.pausedTotalMs = 0;
    this.pausedAt = null;
    this.stepIndex = 0;
    this.tasks = [];
    this.publishProgress();
  }

  private reseed(): void {
    const snapshot = createDemoSnapshot(Date.now());
    applyDynamicState(snapshot);
  }

  private tick(): void {
    if (this.pausedAt !== null) return;
    const elapsed = this.elapsedMs;

    while (this.stepIndex < DEMO_TIMELINE.length && (DEMO_TIMELINE[this.stepIndex]?.at ?? Infinity) * 1000 <= elapsed) {
      const step = DEMO_TIMELINE[this.stepIndex];
      this.stepIndex += 1;
      if (!step) continue;
      for (const action of step.actions) this.apply(action);
      useDemoStore().lastStepLabel = step.label;
    }

    const due = this.tasks.filter((task) => task.atMs <= elapsed);
    this.tasks = this.tasks.filter((task) => task.atMs > elapsed);
    for (const task of due) task.run();

    const demo = useDemoStore();
    if (elapsed >= DEMO_CYCLE_LENGTH_S * 1000) {
      if (demo.loop) {
        demo.cycle += 1;
        this.reseed();
        this.beginCycle();
      } else {
        demo.elapsedMs = DEMO_CYCLE_LENGTH_S * 1000;
        demo.nextStepLabel = null;
      }
      return;
    }
    this.publishProgress();
  }

  private publishProgress(): void {
    const demo = useDemoStore();
    demo.elapsedMs = Math.max(0, this.elapsedMs);
    demo.nextStepLabel = DEMO_TIMELINE[this.stepIndex]?.label ?? (demo.loop ? 'Next cycle' : null);
  }

  private schedule(delaySeconds: number, run: () => void): void {
    this.tasks.push({ atMs: this.elapsedMs + delaySeconds * 1000, run });
  }

  private apply(action: DemoAction): void {
    const now = new Date().toISOString();
    switch (action.type) {
      case 'ACTIVITY':
        this.setActivity(action.employeeId, action.activity, action.meetingId ?? null);
        return;
      case 'PRESENCE':
        useEmployeeStore().setPresence(action.employeeId, { status: action.status, lastSeenAt: now, connectedSocketId: null });
        return;
      case 'MEETING':
        useMeetingStore().setStatus(action.meetingId, action.status);
        return;
      case 'BUILD':
        useWorkStore().setBuildStatus(action.buildId, action.status);
        return;
      case 'PULL_REQUEST':
        useWorkStore().setPullRequestStatus(action.pullRequestId, action.status);
        return;
      case 'WORK_ITEM':
        useWorkStore().setWorkItemState(action.workItemId, action.state);
        return;
    }
  }

  private setActivity(employeeId: UUID, activity: DemoActivity, meetingId: UUID | null): void {
    const meeting = meetingId ? useMeetingStore().byId(meetingId) : undefined;
    const resolved: EmployeeActivity = {
      ...activity,
      confidence: activity.source === 'MANUAL' ? 1 : 0.8,
      updatedAt: new Date().toISOString(),
    };
    useEmployeeStore().setActivity(employeeId, resolved, meetingId ? { meetingId, roomId: meeting?.roomId ?? null } : null);
  }

  /* Manual triggers ------------------------------------------------------ */

  private candidates(allowed: ActivityType[]): UUID[] {
    const localId = useAuthStore().currentEmployeeId;
    return useEmployeeStore()
      .all.filter((employee) => employee.id !== localId && employee.presence.status === 'ONLINE' && allowed.includes(employee.activity.type))
      .map((employee) => employee.id);
  }

  private triggerTemporaryActivity(type: ActivityType, activity: Omit<DemoActivity, 'type'>, durationSeconds: number): string {
    const employeeStore = useEmployeeStore();
    const [employeeId] = this.candidates(['WORKING', 'CODING', 'TESTING', 'AVAILABLE', 'BUILDING']);
    if (!employeeId) return 'Everyone is busy right now — try again in a moment.';
    const employee = employeeStore.byId(employeeId);
    if (!employee) return 'Nobody available.';
    const previous = { activity: { ...employee.activity }, meeting: employee.meeting ?? null };
    this.setActivity(employeeId, { type, ...activity }, null);
    this.schedule(durationSeconds, () => {
      if (employeeStore.byId(employeeId)?.activity.type === type) {
        employeeStore.setActivity(employeeId, { ...previous.activity, updatedAt: new Date().toISOString() }, previous.meeting);
      }
    });
    return `${employee.displayName} → ${type === 'BREAK' ? 'Break room' : 'Collaboration Area'}`;
  }

  private triggerMeeting(): string {
    const meetingStore = useMeetingStore();
    const roomStore = useRoomStore();
    const employeeStore = useEmployeeStore();
    const meeting = meetingStore.all.find((candidate) => candidate.status === 'SCHEDULED');
    if (!meeting) return 'No scheduled meetings left to start.';

    const attendees = meeting.attendees
      .map((attendee) => (attendee.employeeId ? employeeStore.byId(attendee.employeeId) : undefined))
      .filter((employee): employee is Employee => employee !== undefined && employee.presence.status === 'ONLINE');

    // Mirrors MeetingRoomAllocator: smallest free meeting room that fits everyone.
    const busyRoomIds = new Set(meetingStore.all.filter((m) => m.status === 'LIVE' || m.status === 'STARTING_SOON').map((m) => m.roomId));
    const room = roomStore.all
      .filter((candidate) => candidate.type === 'MEETING' && !busyRoomIds.has(candidate.id) && candidate.capacity >= attendees.length)
      .sort((a, b) => a.capacity - b.capacity)[0];
    if (!room) return 'Every meeting room is busy.';

    const start = Date.now() + 8000;
    meetingStore.reschedule(meeting.id, {
      startAt: new Date(start).toISOString(),
      endAt: new Date(start + 30 * 60_000).toISOString(),
      roomId: room.id,
    });
    meetingStore.setStatus(meeting.id, 'STARTING_SOON');

    const previous = new Map(attendees.map((employee) => [employee.id, { activity: { ...employee.activity }, meeting: employee.meeting ?? null }]));
    for (const employee of attendees) {
      this.setActivity(employee.id, { type: 'MEETING', source: 'MICROSOFT_TEAMS', title: meeting.title }, meeting.id);
    }
    this.schedule(8, () => meetingStore.setStatus(meeting.id, 'LIVE'));
    this.schedule(50, () => {
      meetingStore.setStatus(meeting.id, 'ENDED');
      for (const [employeeId, before] of previous) {
        if (employeeStore.byId(employeeId)?.meeting?.meetingId === meeting.id) {
          employeeStore.setActivity(employeeId, { ...before.activity, updatedAt: new Date().toISOString() }, before.meeting);
        }
      }
    });
    return `${meeting.title} → ${room.name}`;
  }

  private triggerBuild(): string {
    const workStore = useWorkStore();
    const localId = useAuthStore().currentEmployeeId;
    const existing = workStore.build(BUILD.frontendCiNext);
    if (existing?.status === 'RUNNING') return 'Build #247 is already running.';
    const build: Build = {
      id: BUILD.frontendCiNext,
      organizationId: DEMO_ORGANIZATION_ID,
      provider: 'AZURE_DEVOPS',
      externalId: '247',
      pipelineName: 'Frontend CI',
      branch: 'feature/16178-org-permissions',
      status: 'QUEUED',
      triggeredByEmployeeId: localId,
      startedAt: null,
      finishedAt: null,
      url: null,
    };
    workStore.upsertBuild(build);
    workStore.setBuildStatus(build.id, 'RUNNING');
    this.schedule(12, () => workStore.setBuildStatus(build.id, 'SUCCEEDED'));
    return 'Build #247 · Frontend CI started';
  }
}

export const demoSimulation = new DemoSimulationService();
