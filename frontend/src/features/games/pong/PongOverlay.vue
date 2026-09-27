<script setup lang="ts">
import { findGameStation, PONG_RULES, type PongSession, type UUID } from '@virtual-office/shared';
import { DoorOpen, Gamepad2, Hourglass, LogOut, RotateCcw, WifiOff } from 'lucide-vue-next';
import { computed, nextTick, onBeforeUnmount, onMounted, shallowRef, watch } from 'vue';

import { soundManager } from '@/core/audio';
import EmployeeAvatar from '@/features/employees/components/EmployeeAvatar.vue';
import { BaseButton } from '@/shared/components';
import { firstNameOf } from '@/shared/utils/names';
import { useAuthStore } from '@/stores/auth.store';
import { useEmployeeStore } from '@/stores/employee.store';
import { useGameStore } from '@/stores/game.store';
import { useOfficeStore } from '@/stores/office.store';

import { useGameRoomActions } from '../composables/useGameRoomActions';
import PongCanvas from './PongCanvas.vue';

/**
 * The match, full screen over the office (which keeps running underneath,
 * so the socket, session and your avatar's place at the table are kept).
 * Every state is written out in text — sound is only ever a companion.
 */
const props = defineProps<{ session: PongSession }>();

const gameStore = useGameStore();
const authStore = useAuthStore();
const employeeStore = useEmployeeStore();
const officeStore = useOfficeStore();
const { leave, ready, dismissResult } = useGameRoomActions();

const primaryButton = shallowRef<InstanceType<typeof BaseButton> | null>(null);
const clock = shallowRef(performance.now());
let clockTimer = 0;

const localId = computed(() => authStore.currentEmployeeId);
const mySide = computed<0 | 1>(() => (props.session.players[1] === localId.value ? 1 : 0));
const opponentId = computed(() => props.session.players[mySide.value === 0 ? 1 : 0]);
const station = computed(() => findGameStation(props.session.stationId));
const connected = computed(() => officeStore.realtimeStatus === 'connected');

const nameOf = (id: UUID) => employeeStore.byId(id)?.displayName ?? 'Teammate';
const firstOf = (id: UUID) => (id === localId.value ? 'You' : firstNameOf(nameOf(id)));
const opponentName = computed(() => firstNameOf(nameOf(opponentId.value)));
const iAmReady = computed(() => !!localId.value && props.session.readyPlayerIds.includes(localId.value));

/** ms left on a server countdown, counted from when the session arrived. */
function remaining(ms: number | null): number {
  return ms === null ? 0 : Math.max(0, ms - (clock.value - gameStore.sessionReceivedAt));
}
const countdown = computed(() => (props.session.status === 'COUNTDOWN' ? Math.ceil(remaining(props.session.countdownMs) / 1000) : null));
const graceSeconds = computed(() => Math.ceil(remaining(props.session.graceMs) / 1000));
const decisionSeconds = computed(() => Math.ceil(remaining(props.session.decisionMs) / 1000));

const result = computed(() => {
  const { status, winnerId, endReason } = props.session;
  if (status === 'ENDED') return winnerId === localId.value ? { title: 'You won!', tone: 'win' as const } : { title: `${opponentName.value} won`, tone: 'lose' as const };
  if (status !== 'ABANDONED') return null;
  if (endReason === 'OPPONENT_DISCONNECTED') return { title: 'Opponent disconnected', tone: 'neutral' as const };
  if (endReason === 'TIMED_OUT') return { title: `${opponentName.value} didn't respond`, tone: 'neutral' as const };
  return { title: `${opponentName.value} left the game`, tone: 'neutral' as const };
});

const announcement = computed(() => {
  const [left, right] = props.session.players;
  const score = `${firstOf(left)} ${props.session.score[0]}, ${firstOf(right)} ${props.session.score[1]}`;
  if (!connected.value) return 'Connection lost. Reconnecting.';
  switch (props.session.status) {
    case 'READY':
      return iAmReady.value ? `Waiting for ${opponentName.value} to press Start.` : `Opponent found: ${opponentName.value}. Press Start game.`;
    case 'COUNTDOWN':
      return countdown.value ? `Starting in ${countdown.value}` : 'Go';
    case 'PAUSED':
      return `Paused. Waiting for a player to reconnect. ${score}`;
    case 'ENDED':
    case 'ABANDONED':
      return `${result.value?.title}. ${score}`;
    default:
      return score;
  }
});

function returnToOffice(): void {
  leave(props.session.stationId);
}

/* Sounds: countdown beats, points, the result. */
watch(countdown, (value, previous) => {
  if (value && value !== previous) soundManager.play('countdown-tick');
});
watch(
  () => props.session.status,
  (status, previous) => {
    if (status === 'PLAYING' && previous === 'COUNTDOWN') soundManager.play('countdown-go');
    if (status === 'ENDED' && previous !== 'ENDED') soundManager.play(props.session.winnerId === localId.value ? 'game-win' : 'game-lose');
    void focusPrimary();
  },
);
watch(
  () => [...props.session.score] as [number, number],
  (score, previous) => {
    if (!previous || props.session.status === 'ENDED' || score[0] + score[1] <= previous[0] + previous[1]) return;
    soundManager.play(score[mySide.value] > previous[mySide.value] ? 'pong-score-for' : 'pong-score-against');
  },
);

async function focusPrimary(): Promise<void> {
  await nextTick();
  (primaryButton.value?.$el as HTMLElement | undefined)?.focus();
}

onMounted(() => {
  clockTimer = window.setInterval(() => (clock.value = performance.now()), 200);
  void focusPrimary();
});
onBeforeUnmount(() => window.clearInterval(clockTimer));
</script>

<template>
  <div class="absolute inset-0 z-40 flex items-center justify-center bg-canvas/[0.92] p-4" role="dialog" aria-modal="true" aria-labelledby="pong-title">
    <div class="flex w-full max-w-[920px] flex-col gap-3">
      <header class="vo-panel flex flex-wrap items-center gap-3 px-4 py-3">
        <span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent/15 text-accent"><Gamepad2 :size="17" /></span>
        <div class="min-w-0">
          <h2 id="pong-title" class="text-[15px] font-semibold text-ink">{{ station?.name ?? 'Ping Pong' }}</h2>
          <p class="text-2xs text-muted">First to {{ session.targetScore }} · <kbd class="vo-kbd">W</kbd> <kbd class="vo-kbd">S</kbd> or <kbd class="vo-kbd">↑</kbd> <kbd class="vo-kbd">↓</kbd></p>
        </div>

        <div class="mx-auto flex items-center gap-3 text-sm font-semibold tabular-nums" aria-hidden="true">
          <span class="truncate text-right" :class="mySide === 0 ? 'text-accent' : 'text-ink'">{{ firstOf(session.players[0]) }}</span>
          <span class="rounded-lg bg-raised px-3 py-1 text-lg text-ink">{{ session.score[0] }} – {{ session.score[1] }}</span>
          <span class="truncate" :class="mySide === 1 ? 'text-accent' : 'text-ink'">{{ firstOf(session.players[1]) }}</span>
        </div>

        <BaseButton size="sm" @click="returnToOffice"><LogOut :size="13" /> Leave game</BaseButton>
      </header>

      <div class="relative">
        <PongCanvas :key="session.sessionId" :session-id="session.sessionId" :my-side="mySide" :status="session.status" />

        <!-- State cards over the table -->
        <div v-if="!connected" class="absolute inset-0 flex items-center justify-center rounded-lg bg-canvas/70">
          <div class="vo-panel flex items-center gap-3 px-5 py-4 text-[13px] text-ink"><WifiOff :size="16" class="text-amber-300" /> Connection lost — reconnecting…</div>
        </div>

        <div v-else-if="countdown" class="pointer-events-none absolute inset-0 flex items-center justify-center">
          <span class="text-7xl font-bold tabular-nums text-ink/90 drop-shadow">{{ countdown }}</span>
        </div>

        <div v-else-if="session.status === 'READY'" class="absolute inset-0 flex items-center justify-center rounded-lg bg-canvas/60">
          <div class="vo-panel w-[340px] max-w-[92%] p-5 text-center">
            <p class="vo-section-label mb-3">{{ iAmReady ? 'Ready' : 'Opponent found!' }}</p>
            <div class="flex items-center justify-center gap-3">
              <template v-for="(playerId, index) in session.players" :key="playerId">
                <span v-if="index === 1" class="text-xs font-semibold text-subtle">vs</span>
                <span class="flex flex-col items-center gap-1">
                  <EmployeeAvatar v-if="employeeStore.byId(playerId)" :employee="employeeStore.byId(playerId)!" size="md" :show-presence="false" />
                  <span class="text-xs font-medium text-ink">{{ firstOf(playerId) }}</span>
                  <span class="text-2xs" :class="session.readyPlayerIds.includes(playerId) ? 'text-emerald-400' : 'text-subtle'">{{ session.readyPlayerIds.includes(playerId) ? 'Ready' : 'Not ready' }}</span>
                </span>
              </template>
            </div>
            <div class="mt-4 flex justify-center gap-2">
              <BaseButton v-if="!iAmReady" ref="primaryButton" variant="primary" @click="ready(session.sessionId)"><Gamepad2 :size="14" /> Start game</BaseButton>
              <BaseButton @click="returnToOffice">Leave</BaseButton>
            </div>
            <p class="mt-3 text-2xs text-subtle">{{ iAmReady ? `Waiting for ${opponentName}…` : 'The game starts when you both press Start.' }} · {{ decisionSeconds }} s</p>
          </div>
        </div>

        <div v-else-if="session.status === 'PAUSED'" class="absolute inset-0 flex items-center justify-center rounded-lg bg-canvas/60">
          <div class="vo-panel flex max-w-[92%] items-center gap-3 px-5 py-4 text-[13px] text-ink">
            <Hourglass :size="16" class="text-amber-300" />
            <span>{{ session.pausedPlayerId === localId ? 'Reconnecting you…' : `${opponentName}'s connection dropped` }} · waiting {{ graceSeconds }} s</span>
          </div>
        </div>

        <div v-else-if="result" class="absolute inset-0 flex items-center justify-center rounded-lg bg-canvas/60">
          <div class="vo-panel w-[340px] max-w-[92%] p-5 text-center">
            <p class="text-lg font-semibold" :class="result.tone === 'win' ? 'text-emerald-400' : 'text-ink'">{{ result.title }}</p>
            <p class="mt-1 text-sm tabular-nums text-muted">{{ firstOf(session.players[0]) }} {{ session.score[0] }} – {{ session.score[1] }} {{ firstOf(session.players[1]) }}</p>
            <div class="mt-4 flex flex-wrap justify-center gap-2">
              <template v-if="session.status === 'ENDED'">
                <BaseButton v-if="!iAmReady" ref="primaryButton" variant="primary" @click="ready(session.sessionId)"><RotateCcw :size="14" /> Rematch</BaseButton>
                <BaseButton @click="returnToOffice"><DoorOpen :size="14" /> Return to office</BaseButton>
              </template>
              <template v-else>
                <BaseButton ref="primaryButton" variant="primary" @click="dismissResult()"><Hourglass :size="14" /> Wait for opponent</BaseButton>
                <BaseButton @click="returnToOffice"><DoorOpen :size="14" /> Return to office</BaseButton>
              </template>
            </div>
            <p v-if="session.status === 'ENDED'" class="mt-3 text-2xs text-subtle">
              {{ iAmReady ? `Waiting for ${opponentName}…` : `Rematch or return within ${decisionSeconds} s.` }}
            </p>
          </div>
        </div>
      </div>

      <p class="sr-only" role="status" aria-live="polite">{{ announcement }}</p>
      <p class="text-center text-2xs text-subtle">Your avatar stays at the table in the Game Room while you play. First to {{ PONG_RULES.targetScore }} wins.</p>
    </div>
  </div>
</template>
