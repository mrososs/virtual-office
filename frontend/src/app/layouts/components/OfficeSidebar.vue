<script setup lang="ts">
import { Activity, Building2, CalendarDays, PanelLeftClose, PanelLeftOpen, Plug, Settings, Users } from 'lucide-vue-next';
import { storeToRefs } from 'pinia';
import { computed } from 'vue';
import { useRoute } from 'vue-router';

import { runtimeEnv } from '@/core/config';
import { useUiStore } from '@/stores/ui.store';

const route = useRoute();
const uiStore = useUiStore();
const { sidebarCollapsed } = storeToRefs(uiStore);

const items = [
  { name: 'office', label: 'Office', icon: Building2 },
  { name: 'office-team', label: 'Team', icon: Users },
  { name: 'office-meetings', label: 'Meetings', icon: CalendarDays },
  { name: 'office-activity', label: 'Activity', icon: Activity },
  { name: 'integrations', label: 'Integrations', icon: Plug },
  { name: 'settings', label: 'Settings', icon: Settings },
] as const;

const activeName = computed(() => route.name);

/** Panel items toggle: clicking the open panel closes it back to the plain office. */
function targetFor(name: (typeof items)[number]['name']) {
  return activeName.value === name && name.startsWith('office-') ? { name: 'office' } : { name };
}
</script>

<template>
  <nav
    class="flex shrink-0 flex-col border-r border-line/[0.06] bg-surface/60 px-2 py-3 transition-[width] duration-200"
    :class="sidebarCollapsed ? 'w-[60px]' : 'w-[212px]'"
    aria-label="Primary"
  >
    <ul class="flex flex-col gap-0.5">
      <li v-for="item in items" :key="item.name">
        <RouterLink
          :to="targetFor(item.name)"
          class="group relative flex h-9 items-center gap-3 rounded-lg px-2.5 text-[13px] font-medium transition-colors"
          :class="activeName === item.name ? 'bg-hover text-ink' : 'text-muted hover:bg-hover/60 hover:text-ink'"
          :title="sidebarCollapsed ? item.label : undefined"
          :aria-current="activeName === item.name ? 'page' : undefined"
        >
          <span
            v-if="activeName === item.name"
            class="absolute left-0 top-2 h-5 w-[3px] rounded-r-full bg-accent"
            aria-hidden="true"
          />
          <component :is="item.icon" :size="17" class="shrink-0" :class="activeName === item.name ? 'text-accent' : ''" />
          <span v-if="!sidebarCollapsed" class="truncate">{{ item.label }}</span>
        </RouterLink>
      </li>
    </ul>

    <div class="mt-auto flex flex-col gap-2">
      <div
        v-if="runtimeEnv.demoMode && !sidebarCollapsed"
        class="rounded-lg border border-amber-400/15 bg-amber-400/[0.06] px-2.5 py-2 text-2xs leading-relaxed text-amber-200/80"
      >
        <span class="font-semibold text-amber-200">Demo mode</span> · seeded company, no real integrations.
      </div>
      <button
        type="button"
        class="flex h-9 items-center gap-3 rounded-lg px-2.5 text-[13px] text-subtle transition-colors hover:bg-hover/60 hover:text-ink"
        :aria-label="sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'"
        @click="uiStore.toggleSidebar()"
      >
        <PanelLeftOpen v-if="sidebarCollapsed" :size="17" />
        <PanelLeftClose v-else :size="17" />
        <span v-if="!sidebarCollapsed">Collapse</span>
      </button>
    </div>
  </nav>
</template>
