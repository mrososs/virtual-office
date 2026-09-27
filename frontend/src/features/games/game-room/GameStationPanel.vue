<script setup lang="ts">
import { findGameProvider, findGameStation, GAME_TYPE_LABEL, type ExternalGameSession, type GameType } from '@virtual-office/shared';
import { CircleDot, Crown, ExternalLink, Footprints, Gamepad2, Grid3x3, LoaderCircle, LogOut } from 'lucide-vue-next';
import { computed, shallowRef, watch } from 'vue';

import EmployeeAvatar from '@/features/employees/components/EmployeeAvatar.vue';
import { useOfficeCommands } from '@/features/office/composables/useOfficeCommands';
import { BaseButton, DrawerShell, StatusBadge } from '@/shared/components';
import { useNow } from '@/shared/composables';
import { formatRelativeTime } from '@/shared/utils/format';
import { firstNameOf } from '@/shared/utils/names';
import { useAuthStore } from '@/stores/auth.store';
import { useEmployeeStore } from '@/stores/employee.store';
import { useGameStore } from '@/stores/game.store';
import { useOfficeStore } from '@/stores/office.store';
import { useUiStore } from '@/stores/ui.store';

import { useGameRoomActions } from '../composables/useGameRoomActions';

/**
 * One panel for every game table (click the table, or press E next to it).
 * The office only coordinates: who is at the table and which private room to
 * open. The game itself runs on the provider's site, in a new tab. Joining is
 * always an explicit choice — walking past a table never seats you.
 */
const props = defineProps<{ stationId: string }>();
const emit = defineEmits<{ close: [] }>();

const GAME_ICON: Record<GameType, typeof Gamepad2> = { PONG: Gamepad2, CHESS: Crown, TIC_TAC_TOE: Grid3x3, CONNECT_FOUR: CircleDot };

const gameStore = useGameStore();
const authStore = useAuthStore();
const employeeStore = useEmployeeStore();
const officeStore = useOfficeStore();
const uiStore = useUiStore();
const { walkTo } = useOfficeCommands();
const { join, leave, shareRoom, openExternal } = useGameRoomActions();
const now = useNow(15_000);

const station = computed(() => findGameStation(props.stationId));
const provider = computed(() => findGameProvider(station.value?.providerId));
const game = computed(() => GAME_TYPE_LABEL[station.value?.gameType ?? 'PONG']);
const state = computed(() => gameStore.stationOf(props.stationId));
const live = computed(() => officeStore.realtimeStatus === 'connected' && gameStore.synced);
const localId = computed(() => authStore.currentEmployeeId);
const seated = computed(() => !!state.value?.participants.some((participant) => participant.employeeId === localId.value));
const seatedElsewhere = computed(() => {
  const at = gameStore.stationIdOf(localId.value);
  return at !== null && at !== props.stationId;
});
const near = computed(() => uiStore.interaction?.kind === 'STATION' && uiStore.interaction.id === props.stationId);
const pending = computed(() => gameStore.pendingStationId === props.stationId);
const session = computed<ExternalGameSession | null>(() => {
  const current = gameStore.session;
  return current?.kind === 'EXTERNAL' && current.stationId === props.stationId && current.endReason === null ? current : null;
});
const isHost = computed(() => session.value?.hostEmployeeId === localId.value);

const players = computed(() =>
  (state.value?.participants ?? []).map((participant, index) => ({
    ...participant,
    employee: employeeStore.byId(participant.employeeId),
    isMe: participant.employeeId === localId.value,
    isHost: index === 0,
  })),
);
const host = computed(() => players.value[0]);
const opponentName = computed(() => {
  const other = players.value.find((player) => !player.isMe);
  return other?.employee ? firstNameOf(other.employee.displayName) : 'your opponent';
});
const full = computed(() => !!state.value && state.value.participants.length >= state.value.capacity);

const invite = shallowRef('');
watch(
  () => session.value?.sessionId,
  () => (invite.value = ''),
);

const badge = computed(() => {
  if (!live.value || !state.value) return { label: 'Offline', color: '#6b7385' };
  const count = `${state.value.participants.length}/${state.value.capacity}`;
  if (state.value.status === 'AVAILABLE') return { label: 'Available · 0/2', color: '#22c55e' };
  if (state.value.status === 'WAITING') return { label: `${count} · ${state.value.joinable ? 'Waiting' : 'Setting up'}`, color: '#f59e0b' };
  return { label: `${count} · In game`, color: '#7c83ff' };
});

/** One line for someone who isn't at the table. */
const visitorMessage = computed(() => {
  if (!live.value) return 'The Game Room needs a live connection to the office. It reconnects on its own.';
  if (seatedElsewhere.value) return 'You are already at another table. Leave it first.';
  if (full.value) return `${players.value.map((player) => firstNameOf(player.employee?.displayName ?? 'Someone')).join(' and ')} are playing.`;
  if (host.value && state.value?.joinable) return `${host.value.employee?.displayName ?? 'A teammate'} is waiting for an opponent.`;
  if (host.value) return `${host.value.employee?.displayName ?? 'A teammate'} is setting up a room…`;
  return `Play ${game.value}${provider.value ? ` on ${provider.value.name}` : ''}? It opens in a new tab; the office keeps your place at the table.`;
});

/** What the second player does once they open the game. */
const guestHint = computed(() => {
  const room = session.value?.room;
  switch (provider.value?.roomMode) {
    case 'API_CREATED_ROOM':
      return 'Open the game — Lichess seats you and the clock starts on the first move.';
    case 'ROOM_CODE':
      return `Open ${provider.value.name}, choose Multiplayer → Join game and type the code ${room?.code ?? ''}.`;
    default:
      return 'Open the link and press Play (pick any guest name).';
  }
});

function walkToTable(): void {
  if (!station.value) return;
  walkTo({ kind: 'STATION', stationId: props.stationId, slot: state.value?.participants.length ?? 0 }, `Walking to the ${station.value.name}`);
}

function submitInvite(): void {
  if (session.value && provider.value) shareRoom(props.stationId, provider.value.id, invite.value);
}
</script>

<template>
  <DrawerShell v-if="station" eyebrow="Game Room" @close="emit('close')">
    <template #header>
      <div class="flex items-center gap-3">
        <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent/15 text-accent"><component :is="GAME_ICON[station.gameType]" :size="18" /></span>
        <div class="min-w-0">
          <h2 class="text-[15px] font-semibold text-ink">{{ station.name }}</h2>
          <p class="text-xs text-muted">{{ game }}<template v-if="provider"> · on {{ provider.name }}</template> · 2 players</p>
        </div>
        <StatusBadge class="ml-auto" :color="badge.color" :label="badge.label" />
      </div>
    </template>

    <div class="space-y-5 px-4 py-4">
      <section class="space-y-2">
        <p class="vo-section-label">At the table</p>
        <ul v-if="players.length > 0" class="space-y-1.5">
          <li v-for="player in players" :key="player.employeeId" class="flex items-center gap-3 rounded-lg border border-line/[0.07] bg-raised/70 p-2.5">
            <EmployeeAvatar v-if="player.employee" :employee="player.employee" size="sm" />
            <span class="min-w-0 flex-1">
              <span class="block truncate text-[13px] font-medium text-ink">
                {{ player.employee?.displayName ?? 'A teammate' }}<span v-if="player.isMe" class="ml-1.5 text-2xs font-semibold text-accent">You</span>
              </span>
              <span class="block text-2xs text-muted">{{ state?.status === 'IN_GAME' ? 'Playing' : player.isHost ? `Host · joined ${formatRelativeTime(player.joinedAt, now)}` : 'Joined' }}</span>
            </span>
          </li>
        </ul>
        <p v-else class="text-xs text-subtle">Nobody yet.</p>
      </section>

      <!-- Host: set up the room -->
      <section v-if="session && isHost && session.status === 'SETUP'" class="space-y-3">
        <p class="vo-section-label">Set up your room</p>
        <p v-if="provider?.roomMode === 'API_CREATED_ROOM'" class="flex items-center gap-2 text-[13px] text-ink" role="status">
          <LoaderCircle :size="15" class="animate-spin text-accent" /> Creating a private {{ provider.name }} game…
        </p>
        <template v-else-if="provider">
          <ol class="list-decimal space-y-1 pl-4 text-xs leading-relaxed text-muted">
            <li v-for="step in provider.hostSteps" :key="step">{{ step }}</li>
          </ol>
          <BaseButton size="sm" @click="openExternal(provider.startUrl)"><ExternalLink :size="13" /> Open {{ provider.name }}</BaseButton>
          <form class="space-y-1.5" @submit.prevent="submitInvite">
            <label :for="`invite-${stationId}`" class="block text-xs font-medium text-ink">{{ provider.roomMode === 'ROOM_CODE' ? 'Room code' : 'Invite link' }}</label>
            <input
              :id="`invite-${stationId}`"
              v-model="invite"
              type="text"
              autocomplete="off"
              spellcheck="false"
              maxlength="512"
              :placeholder="provider.roomMode === 'ROOM_CODE' ? 'e.g. 7BP43Q' : `https://${provider.allowedHosts[0]}/…`"
              class="h-8 w-full rounded-lg border border-line/10 bg-raised px-2.5 text-[13px] text-ink placeholder:text-subtle focus:border-accent/60"
              :aria-invalid="!!gameStore.inviteError"
              :aria-describedby="gameStore.inviteError ? `invite-error-${stationId}` : undefined"
            >
            <p v-if="gameStore.inviteError" :id="`invite-error-${stationId}`" class="text-2xs text-red-300" role="alert">{{ gameStore.inviteError }}</p>
            <BaseButton type="submit" size="sm" variant="primary" :disabled="pending || !invite.trim()">{{ pending ? 'Checking…' : 'Start waiting' }}</BaseButton>
          </form>
        </template>
      </section>

      <!-- Host: waiting for an opponent -->
      <section v-else-if="session && isHost && session.status === 'WAITING'" class="space-y-2">
        <p class="text-[13px] font-medium text-ink" role="status">Waiting for an opponent… · 1/2</p>
        <p v-if="session.room?.code" class="text-xs text-muted">Room code <span class="ml-1 rounded bg-black/30 px-1.5 py-0.5 font-mono text-[13px] tracking-widest text-ink">{{ session.room.code }}</span></p>
        <p class="text-xs text-muted">Keep the game tab open. Whoever joins here gets the same room.</p>
      </section>

      <!-- Both players: the game is on -->
      <section v-else-if="session && session.status === 'IN_GAME'" class="space-y-2">
        <p class="text-[13px] font-medium text-ink" role="status">{{ isHost ? `${opponentName} joined — have fun!` : `You're playing ${opponentName}.` }} · 2/2</p>
        <p v-if="!isHost" class="text-xs text-muted">{{ guestHint }}</p>
        <p v-if="session.room?.code" class="text-xs text-muted">Room code <span class="ml-1 rounded bg-black/30 px-1.5 py-0.5 font-mono text-[13px] tracking-widest text-ink">{{ session.room.code }}</span></p>
      </section>

      <p v-else-if="!seated" class="text-[13px] text-ink" role="status" aria-live="polite">{{ visitorMessage }}</p>

      <p v-if="provider" class="text-2xs text-subtle">{{ provider.note }}</p>
    </div>

    <template #footer>
      <div class="flex flex-wrap items-center gap-2">
        <template v-if="session">
          <BaseButton v-if="session.room" size="sm" variant="primary" @click="openExternal(session.room.url)"><ExternalLink :size="13" /> Open game</BaseButton>
          <BaseButton size="sm" @click="leave(stationId)"><LogOut :size="13" /> {{ session.status === 'IN_GAME' ? 'Done — leave table' : 'Leave table' }}</BaseButton>
        </template>
        <BaseButton v-else-if="seated" size="sm" @click="leave(stationId)"><LogOut :size="13" /> Leave table</BaseButton>
        <template v-else-if="live && !full && !seatedElsewhere && (!host || state?.joinable)">
          <BaseButton v-if="near" size="sm" variant="primary" :disabled="pending" @click="join(stationId)">
            <component :is="GAME_ICON[station.gameType]" :size="13" /> {{ pending ? 'Joining…' : host ? 'Join game' : 'Play' }}
          </BaseButton>
          <template v-else>
            <BaseButton size="sm" variant="primary" @click="walkToTable"><Footprints :size="13" /> Walk to table</BaseButton>
            <span class="text-2xs text-subtle">{{ host ? 'Join' : 'Play' }} when you're next to it.</span>
          </template>
        </template>
        <BaseButton v-else size="sm" disabled>{{ !live ? 'Offline' : full ? 'Table is busy' : host ? 'Setting up…' : 'Play' }}</BaseButton>
      </div>
    </template>
  </DrawerShell>
</template>
