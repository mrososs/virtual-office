<script setup lang="ts">
/**
 * Development-only controls for the demo simulation. Rendered only when
 * VITE_DEMO_MODE=true (OfficePage checks runtimeEnv before mounting it), and
 * it loads the simulation module lazily so it never ships in normal builds.
 */
import { ChevronDown, Coffee, Eye, FlaskConical, Hammer, Pause, Play, Repeat, RotateCcw, Video } from 'lucide-vue-next';
import { storeToRefs } from 'pinia';
import { computed, shallowRef, useTemplateRef } from 'vue';

import type { DemoTrigger } from '@/demo/simulation/demo-simulation.service';
import { useClickOutside } from '@/shared/composables';
import { useDemoStore } from '@/stores/demo.store';

const demoStore = useDemoStore();
const { status, loop, cycle, elapsedMs, cycleLengthMs, nextStepLabel, lastStepLabel } = storeToRefs(demoStore);

const open = shallowRef(false);
const feedback = shallowRef<string | null>(null);
const root = useTemplateRef<HTMLElement>('root');
useClickOutside(root, open, () => (open.value = false));

const clock = computed(() => {
  const seconds = Math.floor(elapsedMs.value / 1000);
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
});
const progress = computed(() => (cycleLengthMs.value ? Math.min(100, (elapsedMs.value / cycleLengthMs.value) * 100) : 0));

const triggers: Array<{ kind: DemoTrigger; label: string; icon: typeof Video }> = [
  { kind: 'meeting', label: 'Start a meeting', icon: Video },
  { kind: 'code-review', label: 'Code review', icon: Eye },
  { kind: 'break', label: 'Take a break', icon: Coffee },
  { kind: 'build', label: 'Run a build', icon: Hammer },
];

async function simulation() {
  const { demoSimulation } = await import('@/demo/simulation/demo-simulation.service');
  return demoSimulation;
}

async function togglePause(): Promise<void> {
  const sim = await simulation();
  if (status.value === 'paused') sim.resume();
  else sim.pause();
}

async function restart(): Promise<void> {
  (await simulation()).restart();
  feedback.value = 'Demo restarted from the seed state.';
}

async function toggleLoop(): Promise<void> {
  (await simulation()).setLoop(!loop.value);
}

async function trigger(kind: DemoTrigger): Promise<void> {
  feedback.value = (await simulation()).trigger(kind);
}
</script>

<template>
  <div ref="root" class="relative">
    <button
      type="button"
      class="vo-chip gap-2 border-amber-400/20 py-1.5 text-xs text-ink transition-colors hover:bg-hover"
      :aria-expanded="open"
      @click="open = !open"
    >
      <FlaskConical :size="13" class="text-amber-300" />
      <span class="font-semibold">Demo</span>
      <span class="tabular-nums text-muted">{{ clock }}</span>
      <span class="h-1.5 w-1.5 rounded-full" :class="status === 'running' ? 'bg-emerald-400' : status === 'paused' ? 'bg-amber-400' : 'bg-subtle'" />
      <ChevronDown :size="12" class="text-subtle transition-transform" :class="open && 'rotate-180'" />
    </button>

    <Transition
      enter-active-class="transition duration-150 ease-out"
      enter-from-class="opacity-0 translate-y-1"
      leave-active-class="transition duration-100 ease-in"
      leave-to-class="opacity-0 translate-y-1"
    >
      <div v-if="open" class="vo-panel absolute bottom-10 left-0 w-[300px] p-3 shadow-pop">
        <div class="flex items-center justify-between">
          <p class="text-[13px] font-semibold">Demo simulation</p>
          <span class="text-2xs text-subtle">Cycle {{ cycle }}</span>
        </div>
        <div class="mt-2.5 h-1 overflow-hidden rounded-full bg-raised">
          <div class="h-full rounded-full bg-amber-400/80 transition-[width] duration-300" :style="{ width: `${progress}%` }" />
        </div>
        <p class="mt-2 truncate text-2xs text-muted"><span class="text-subtle">Last:</span> {{ lastStepLabel ?? 'Office opened' }}</p>
        <p class="truncate text-2xs text-muted"><span class="text-subtle">Next:</span> {{ nextStepLabel ?? 'End of script' }}</p>

        <div class="mt-3 flex gap-1.5">
          <button type="button" class="demo-btn" @click="togglePause">
            <Play v-if="status === 'paused'" :size="13" /><Pause v-else :size="13" />
            {{ status === 'paused' ? 'Resume' : 'Pause' }}
          </button>
          <button type="button" class="demo-btn" @click="restart"><RotateCcw :size="13" /> Restart</button>
          <button type="button" class="demo-btn" :class="loop && 'text-amber-200'" :aria-pressed="loop" @click="toggleLoop"><Repeat :size="13" /> Loop</button>
        </div>

        <p class="vo-section-label mb-1.5 mt-4">Trigger</p>
        <div class="grid grid-cols-2 gap-1.5">
          <button v-for="item in triggers" :key="item.kind" type="button" class="demo-btn justify-start" @click="trigger(item.kind)">
            <component :is="item.icon" :size="13" /> {{ item.label }}
          </button>
        </div>
        <p v-if="feedback" class="mt-2.5 text-2xs text-amber-200/80">{{ feedback }}</p>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.demo-btn {
  @apply inline-flex h-7 flex-1 items-center justify-center gap-1.5 rounded-md border border-line/[0.08] bg-raised px-2 text-2xs font-medium text-muted transition-colors hover:bg-hover hover:text-ink;
}
</style>
