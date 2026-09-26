<script setup lang="ts">
import { avatarColorHex, type Employee } from '@virtual-office/shared';
import { computed } from 'vue';

import { avatarPortraitUrl } from '@/features/avatar/avatar-portrait';
import { tint } from '@/game/rendering/canvas-texture';
import { PresenceDot } from '@/shared/components';
import { useEmployeeStore } from '@/stores/employee.store';

const props = withDefaults(
  defineProps<{
    employee: Employee;
    size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
    showPresence?: boolean;
    live?: boolean;
  }>(),
  { size: 'sm', showPresence: true, live: false },
);

const employeeStore = useEmployeeStore();

/** The person's actual avatar (same renderer as the office), on a soft tint of their top color. */
const appearance = computed(() => employeeStore.appearanceOf(props.employee.id));
const portrait = computed(() => avatarPortraitUrl(appearance.value));
const background = computed(() => tint(avatarColorHex('topColor', appearance.value.topColor), 0.62));
const offline = computed(() => props.employee.presence.status === 'OFFLINE');
const sizeClass = computed(
  () =>
    ({
      xs: 'h-5 w-5',
      sm: 'h-7 w-7',
      md: 'h-9 w-9',
      lg: 'h-12 w-12',
      xl: 'h-16 w-16',
    })[props.size],
);
</script>

<template>
  <span class="relative inline-flex shrink-0">
    <span
      class="inline-flex overflow-hidden rounded-full ring-1 ring-black/10"
      :class="[sizeClass, offline && 'opacity-55 grayscale-[35%]', live && 'ring-2 ring-emerald-400/70']"
      :style="{ backgroundColor: background }"
      :title="employee.displayName"
    >
      <img v-if="portrait" :src="portrait" alt="" class="h-full w-full" draggable="false">
    </span>
    <PresenceDot
      v-if="showPresence && size !== 'xs'"
      :status="employee.presence.status"
      :size="size === 'lg' || size === 'xl' ? 'md' : 'sm'"
      class="absolute -bottom-0.5 -right-0.5"
    />
  </span>
</template>
