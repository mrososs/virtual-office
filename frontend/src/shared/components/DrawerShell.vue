<script setup lang="ts">
import { X } from 'lucide-vue-next';

import IconButton from './IconButton.vue';

withDefaults(defineProps<{ eyebrow?: string; closable?: boolean }>(), { eyebrow: undefined, closable: true });
const emit = defineEmits<{ close: [] }>();
</script>

<template>
  <section class="vo-panel flex max-h-full min-h-0 flex-col overflow-hidden">
    <header class="flex items-start gap-3 border-b border-line/[0.06] px-4 pb-3 pt-3.5">
      <div class="min-w-0 flex-1">
        <p v-if="eyebrow" class="vo-section-label mb-1.5">{{ eyebrow }}</p>
        <slot name="header" />
      </div>
      <IconButton v-if="closable" label="Close (Esc)" size="sm" class="-mr-1.5 -mt-0.5" @click="emit('close')">
        <X :size="15" />
      </IconButton>
    </header>
    <div class="min-h-0 flex-1 overflow-y-auto">
      <slot />
    </div>
    <footer v-if="$slots.footer" class="border-t border-line/[0.06] px-4 py-3">
      <slot name="footer" />
    </footer>
  </section>
</template>
