<script setup lang="ts">
import type { Employee } from '@virtual-office/shared';
import { computed } from 'vue';

import { ACTIVITY_ICONS } from '@/features/employees/activity-icons';
import { useStatusLookups } from '@/features/office/composables/useStatusLookups';
import { ACTIVITY_META, PRESENCE_META } from '@/shared/constants';

const props = withDefaults(defineProps<{ employee: Employee; detail?: boolean }>(), { detail: true });

const { statusLineOf } = useStatusLookups();

const offline = computed(() => props.employee.presence.status === 'OFFLINE');
const meta = computed(() => (offline.value ? PRESENCE_META.OFFLINE : ACTIVITY_META[props.employee.activity.type]));
const icon = computed(() => ACTIVITY_ICONS[offline.value ? 'OFFLINE' : props.employee.activity.type]);
const text = computed(() => (props.detail ? statusLineOf(props.employee) : meta.value.label));
</script>

<template>
  <span class="inline-flex min-w-0 items-center gap-1.5 text-xs" :style="{ color: meta.color }">
    <component :is="icon" :size="12" class="shrink-0" />
    <span class="truncate">{{ text }}</span>
  </span>
</template>
