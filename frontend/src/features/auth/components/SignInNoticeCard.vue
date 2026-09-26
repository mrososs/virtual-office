<script setup lang="ts">
import { AlertTriangle, Info, ShieldAlert } from 'lucide-vue-next';
import { computed } from 'vue';

import type { SignInNotice } from '../sign-in-messages';

const props = defineProps<{ notice: SignInNotice }>();

const TONES = {
  info: { icon: Info, classes: 'border-sky-400/20 bg-sky-400/[0.06] text-sky-100/90' },
  warning: { icon: AlertTriangle, classes: 'border-amber-400/20 bg-amber-400/[0.06] text-amber-100/90' },
  danger: { icon: ShieldAlert, classes: 'border-rose-400/25 bg-rose-400/[0.07] text-rose-100/90' },
} as const;

const tone = computed(() => TONES[props.notice.tone]);
</script>

<template>
  <div class="flex gap-2.5 rounded-lg border p-3 text-[13px] leading-relaxed" :class="tone.classes" role="alert">
    <component :is="tone.icon" :size="16" class="mt-0.5 shrink-0" />
    <div class="min-w-0">
      <p class="font-semibold">{{ notice.title }}</p>
      <p v-if="notice.body" class="mt-0.5 opacity-80">{{ notice.body }}</p>
    </div>
  </div>
</template>
