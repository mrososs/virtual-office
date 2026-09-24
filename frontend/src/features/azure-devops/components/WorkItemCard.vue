<script setup lang="ts">
import type { WorkItem } from '@virtual-office/shared';
import { Bug, ClipboardCheck, Layers, BookOpen } from 'lucide-vue-next';
import { computed } from 'vue';

import { WORK_ITEM_STATE_META, WORK_ITEM_TYPE_LABEL } from '@/features/azure-devops/work-meta';
import { StatusBadge } from '@/shared/components';

const props = defineProps<{ workItem: WorkItem }>();

const icon = computed(() => ({ TASK: ClipboardCheck, BUG: Bug, USER_STORY: BookOpen, FEATURE: Layers })[props.workItem.type]);
const state = computed(() => WORK_ITEM_STATE_META[props.workItem.state]);
</script>

<template>
  <article class="rounded-lg border border-line/[0.07] bg-raised/70 p-3">
    <div class="flex items-center gap-2 text-2xs text-subtle">
      <component :is="icon" :size="12" />
      <span class="font-semibold tabular-nums text-muted">#{{ workItem.externalId }}</span>
      <span>{{ WORK_ITEM_TYPE_LABEL[workItem.type] }}</span>
      <StatusBadge class="ml-auto" :color="state.color" :label="state.label" />
    </div>
    <p class="mt-1.5 text-[13px] font-medium leading-snug text-ink">{{ workItem.title }}</p>
    <p class="mt-1 text-2xs text-subtle">{{ workItem.projectName }} · Azure Boards</p>
  </article>
</template>
