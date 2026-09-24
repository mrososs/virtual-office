<script setup lang="ts">
import type { PresenceStatus } from '@virtual-office/shared';
import { computed } from 'vue';

import { PRESENCE_META } from '@/shared/constants';

const props = withDefaults(defineProps<{ status: PresenceStatus; size?: 'sm' | 'md' }>(), { size: 'sm' });

const meta = computed(() => PRESENCE_META[props.status]);
</script>

<template>
  <span
    class="inline-block shrink-0 rounded-full ring-2 ring-surface"
    :class="size === 'md' ? 'h-2.5 w-2.5' : 'h-2 w-2'"
    :style="{ backgroundColor: meta.color }"
    :title="meta.label"
  />
</template>
