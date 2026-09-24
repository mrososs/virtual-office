<script setup lang="ts">
import type { Employee, PullRequest } from '@virtual-office/shared';
import { GitPullRequest } from 'lucide-vue-next';
import { computed } from 'vue';

import { PULL_REQUEST_STATUS_META } from '@/features/azure-devops/work-meta';
import EmployeeAvatar from '@/features/employees/components/EmployeeAvatar.vue';
import { StatusBadge } from '@/shared/components';
import { useEmployeeStore } from '@/stores/employee.store';

const props = defineProps<{ pullRequest: PullRequest }>();
const employeeStore = useEmployeeStore();

const status = computed(() => PULL_REQUEST_STATUS_META[props.pullRequest.status]);
const reviewers = computed(() =>
  props.pullRequest.reviewerEmployeeIds.map((id) => employeeStore.byId(id)).filter((employee): employee is Employee => employee !== undefined),
);
</script>

<template>
  <article class="rounded-lg border border-line/[0.07] bg-raised/70 p-3">
    <div class="flex items-center gap-2 text-2xs text-subtle">
      <GitPullRequest :size="12" />
      <span class="font-semibold tabular-nums text-muted">PR #{{ pullRequest.externalId }}</span>
      <span class="truncate">{{ pullRequest.repository }}</span>
      <StatusBadge class="ml-auto" :color="status.color" :label="status.label" />
    </div>
    <p class="mt-1.5 text-[13px] font-medium leading-snug text-ink">{{ pullRequest.title }}</p>
    <div class="mt-2 flex items-center gap-2 text-2xs text-subtle">
      <span class="truncate font-mono text-[10.5px]">{{ pullRequest.sourceBranch }} → {{ pullRequest.targetBranch }}</span>
      <span v-if="reviewers.length" class="ml-auto flex -space-x-1" :title="`Reviewers: ${reviewers.map((reviewer) => reviewer.displayName).join(', ')}`">
        <EmployeeAvatar v-for="reviewer in reviewers" :key="reviewer.id" :employee="reviewer" size="xs" :show-presence="false" class="rounded-full ring-2 ring-raised" />
      </span>
    </div>
  </article>
</template>
