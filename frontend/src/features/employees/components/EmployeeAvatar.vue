<script setup lang="ts">
import type { Employee } from '@virtual-office/shared';
import { computed } from 'vue';

import { PresenceDot } from '@/shared/components';
import { initialsOf } from '@/shared/utils/avatar-appearance';
import { useEmployeeStore } from '@/stores/employee.store';

const props = withDefaults(
  defineProps<{
    employee: Employee;
    size?: 'xs' | 'sm' | 'md' | 'lg';
    showPresence?: boolean;
    live?: boolean;
  }>(),
  { size: 'sm', showPresence: true, live: false },
);

const employeeStore = useEmployeeStore();

const appearance = computed(() => employeeStore.appearanceOf(props.employee.id));
const offline = computed(() => props.employee.presence.status === 'OFFLINE');
const sizeClass = computed(
  () =>
    ({
      xs: 'h-5 w-5 text-[8.5px]',
      sm: 'h-7 w-7 text-[10.5px]',
      md: 'h-9 w-9 text-xs',
      lg: 'h-12 w-12 text-sm',
    })[props.size],
);
</script>

<template>
  <span class="relative inline-flex shrink-0">
    <span
      class="inline-flex items-center justify-center rounded-full font-semibold text-white ring-1 ring-black/10"
      :class="[sizeClass, offline && 'opacity-55 grayscale-[35%]', live && 'ring-2 ring-emerald-400/70']"
      :style="{ background: `linear-gradient(145deg, ${appearance.shirt}, ${appearance.shirt}cc)` }"
      :title="employee.displayName"
    >
      {{ initialsOf(employee.displayName) }}
    </span>
    <PresenceDot
      v-if="showPresence && size !== 'xs'"
      :status="employee.presence.status"
      :size="size === 'lg' ? 'md' : 'sm'"
      class="absolute -bottom-0.5 -right-0.5"
    />
  </span>
</template>
