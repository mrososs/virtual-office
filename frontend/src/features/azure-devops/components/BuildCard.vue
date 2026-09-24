<script setup lang="ts">
import type { Build } from '@virtual-office/shared';
import { Hammer, LoaderCircle } from 'lucide-vue-next';
import { computed } from 'vue';

import { BUILD_STATUS_META } from '@/features/azure-devops/work-meta';
import { StatusBadge } from '@/shared/components';
import { useNow } from '@/shared/composables';
import { formatRelativeTime } from '@/shared/utils/format';

const props = defineProps<{ build: Build }>();
const now = useNow(5000);

const status = computed(() => BUILD_STATUS_META[props.build.status]);
const timing = computed(() => {
  if (props.build.status === 'RUNNING' && props.build.startedAt) return `started ${formatRelativeTime(props.build.startedAt, now.value)}`;
  if (props.build.finishedAt) return `finished ${formatRelativeTime(props.build.finishedAt, now.value)}`;
  return 'waiting for an agent';
});
</script>

<template>
  <article class="rounded-lg border border-line/[0.07] bg-raised/70 p-3">
    <div class="flex items-center gap-2 text-2xs text-subtle">
      <LoaderCircle v-if="build.status === 'RUNNING'" :size="12" class="animate-spin text-amber-400" />
      <Hammer v-else :size="12" />
      <span class="font-semibold tabular-nums text-muted">Build #{{ build.externalId }}</span>
      <StatusBadge class="ml-auto" :color="status.color" :label="status.label" :pulse="build.status === 'RUNNING'" />
    </div>
    <p class="mt-1.5 text-[13px] font-medium text-ink">{{ build.pipelineName }}</p>
    <p class="mt-1 truncate text-2xs text-subtle"><span class="font-mono">{{ build.branch }}</span> · {{ timing }}</p>
  </article>
</template>
