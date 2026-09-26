<script setup lang="ts">
import type { AvatarAppearance } from '@virtual-office/shared';
import { Check } from 'lucide-vue-next';
import { computed, useTemplateRef } from 'vue';

import type { CreatorGroup } from '../avatar-creator.sections';

import AvatarOptionThumb from './AvatarOptionThumb.vue';

/**
 * One customization choice (e.g. hair style) as an accessible radio group:
 * color swatches or visual cards. Arrow keys move and select, like native radios.
 */
const props = defineProps<{ group: CreatorGroup; appearance: AvatarAppearance }>();
const emit = defineEmits<{ select: [id: string | null] }>();

const radiogroup = useTemplateRef<HTMLElement>('radiogroup');
const selectedId = computed(() => props.appearance[props.group.slot] ?? null);
const selectedIndex = computed(() => Math.max(0, props.group.options.findIndex((option) => option.id === selectedId.value)));
const selectedLabel = computed(() => props.group.options[selectedIndex.value]?.label ?? '');

/** The avatar as it would look with `id` chosen — rendered on the option card. */
function withOption(id: string | null): AvatarAppearance {
  return { ...props.appearance, [props.group.slot]: id };
}

function move(from: number, step: number): void {
  const count = props.group.options.length;
  const next = (from + step + count) % count;
  const option = props.group.options[next];
  if (!option) return;
  emit('select', option.id);
  radiogroup.value?.querySelectorAll<HTMLButtonElement>('[role="radio"]')[next]?.focus();
}

function onKeydown(event: KeyboardEvent, index: number): void {
  const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[event.key];
  if (step === undefined) return;
  event.preventDefault();
  move(index, step);
}
</script>

<template>
  <div>
    <div class="mb-2 flex items-baseline justify-between gap-3">
      <p :id="`avatar-group-${group.slot}`" class="text-xs font-semibold text-ink">{{ group.label }}</p>
      <p class="truncate text-2xs text-subtle">{{ selectedLabel }}</p>
    </div>

    <div
      ref="radiogroup"
      role="radiogroup"
      :aria-labelledby="`avatar-group-${group.slot}`"
      :class="group.kind === 'swatch' ? 'flex flex-wrap gap-2' : 'grid grid-cols-[repeat(auto-fill,minmax(76px,1fr))] gap-2'"
    >
      <template v-for="(option, index) in group.options" :key="option.id ?? 'none'">
        <button
          v-if="group.kind === 'swatch'"
          type="button"
          role="radio"
          :aria-checked="option.id === selectedId"
          :aria-label="option.label"
          :title="option.label"
          :tabindex="index === selectedIndex ? 0 : -1"
          class="relative h-8 w-8 rounded-full ring-1 ring-inset ring-black/20 transition-transform duration-150 hover:scale-110 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
          :class="option.id === selectedId ? 'ring-2 ring-accent ring-offset-2 ring-offset-surface' : ''"
          :style="{ backgroundColor: option.hex }"
          @click="emit('select', option.id)"
          @keydown="onKeydown($event, index)"
        >
          <Check v-if="option.id === selectedId" :size="14" class="absolute inset-0 m-auto text-white drop-shadow-[0_1px_1px_rgba(0,0,0,0.7)]" />
        </button>

        <button
          v-else
          type="button"
          role="radio"
          :aria-checked="option.id === selectedId"
          :tabindex="index === selectedIndex ? 0 : -1"
          class="group relative flex flex-col items-center gap-1 rounded-xl border px-1.5 pb-2 pt-1.5 text-center transition-colors duration-150"
          :class="option.id === selectedId ? 'border-accent/70 bg-accent/[0.1]' : 'border-line/[0.07] bg-raised/60 hover:border-line/[0.16] hover:bg-hover/70'"
          @click="emit('select', option.id)"
          @keydown="onKeydown($event, index)"
        >
          <span class="flex h-[52px] w-full items-center justify-center overflow-hidden rounded-lg bg-canvas/60">
            <AvatarOptionThumb :appearance="withOption(option.id)" :crop="group.crop" />
          </span>
          <span class="w-full truncate text-2xs font-medium" :class="option.id === selectedId ? 'text-ink' : 'text-muted group-hover:text-ink'">{{ option.label }}</span>
          <span v-if="option.id === selectedId" class="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-accent text-accent-ink">
            <Check :size="10" :stroke-width="3" />
          </span>
        </button>
      </template>
    </div>
  </div>
</template>
