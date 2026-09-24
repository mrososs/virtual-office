<script setup lang="ts">
import type { MeetingStatus } from '@virtual-office/shared';
import { computed } from 'vue';

import { StatusBadge } from '@/shared/components';
import { MEETING_STATUS_META } from '@/shared/constants';

const props = defineProps<{ status: MeetingStatus }>();
const meta = computed(() => MEETING_STATUS_META[props.status]);
</script>

<template>
  <StatusBadge :color="meta.color" :label="meta.label" :pulse="status === 'LIVE'" />
</template>
