<script setup lang="ts">
import { CalendarDays, GitBranch, GitPullRequest, Hammer, ListChecks, Video } from 'lucide-vue-next';

import { runtimeEnv } from '@/core/config';
import { BaseButton, StatusBadge } from '@/shared/components';

const integrations = [
  {
    key: 'azure-devops',
    name: 'Azure DevOps',
    mark: 'AZ',
    color: '#0078d4',
    description: 'Work items, pull requests and pipeline runs become activity signals — e.g. an active PR review walks the reviewer to Code Review.',
    signals: [
      { icon: ListChecks, label: 'Work items → Working / Blocked' },
      { icon: GitPullRequest, label: 'PR reviews → Code review' },
      { icon: Hammer, label: 'Pipelines → Building' },
    ],
  },
  {
    key: 'microsoft',
    name: 'Microsoft 365 & Teams',
    mark: 'MS',
    color: '#5b5fc7',
    description: 'Calendar events with Teams links become office meetings: a room is assigned, attendees can walk over, and “Join” opens the real Teams link.',
    signals: [
      { icon: CalendarDays, label: 'Calendar → Meeting rooms' },
      { icon: Video, label: 'Teams join URL → Join button' },
      { icon: GitBranch, label: 'Attendees → mapped by email' },
    ],
  },
];
</script>

<template>
  <div class="h-full overflow-y-auto">
    <div class="mx-auto max-w-[880px] px-6 py-8">
      <h1 class="text-lg font-semibold">Integrations</h1>
      <p class="mt-1 max-w-[620px] text-[13px] leading-relaxed text-muted">
        The office understands your company through these connections. Signals describe work — they never monitor devices, keyboards or screens.
      </p>

      <div class="mt-6 grid gap-4 md:grid-cols-2">
        <article v-for="integration in integrations" :key="integration.key" class="vo-panel flex flex-col p-5">
          <div class="flex items-center gap-3">
            <span class="flex h-10 w-10 items-center justify-center rounded-xl text-xs font-bold text-white" :style="{ backgroundColor: integration.color }">{{ integration.mark }}</span>
            <div class="min-w-0 flex-1">
              <h2 class="text-sm font-semibold">{{ integration.name }}</h2>
              <StatusBadge v-if="runtimeEnv.demoMode" color="#f59e0b" label="Demo data" class="mt-1" />
              <StatusBadge v-else color="#94a3b8" label="Not connected" class="mt-1" />
            </div>
          </div>
          <p class="mt-3 text-[13px] leading-relaxed text-muted">{{ integration.description }}</p>
          <ul class="mt-4 space-y-2">
            <li v-for="signal in integration.signals" :key="signal.label" class="flex items-center gap-2 text-xs text-muted">
              <component :is="signal.icon" :size="13" class="text-subtle" />
              {{ signal.label }}
            </li>
          </ul>
          <div class="mt-5 flex items-center gap-3 border-t border-line/[0.06] pt-4">
            <BaseButton disabled title="OAuth connection ships in the next phase">Connect</BaseButton>
            <span class="text-2xs text-subtle">OAuth connection ships in the next phase.</span>
          </div>
        </article>
      </div>
    </div>
  </div>
</template>
