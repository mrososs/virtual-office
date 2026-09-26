<script setup lang="ts">
import { StatusBadge } from '@/shared/components';

/** Shared frame of one integration: mark, name, status, then details (default slot) and actions (#actions). */
defineProps<{ name: string; mark: string; color: string; status: { label: string; color: string } }>();
</script>

<template>
  <article class="vo-panel flex flex-col p-5">
    <div class="flex items-center gap-3">
      <span class="flex h-10 w-10 items-center justify-center rounded-xl text-xs font-bold text-white" :style="{ backgroundColor: color }">{{ mark }}</span>
      <div class="min-w-0 flex-1">
        <h2 class="text-sm font-semibold">{{ name }}</h2>
        <StatusBadge :color="status.color" :label="status.label" class="mt-1" />
      </div>
    </div>
    <div class="mt-4 flex-1 text-[13px] leading-relaxed text-muted">
      <slot />
    </div>
    <div v-if="$slots.actions" class="mt-5 flex flex-wrap items-center gap-2 border-t border-line/[0.06] pt-4">
      <slot name="actions" />
    </div>
  </article>
</template>
