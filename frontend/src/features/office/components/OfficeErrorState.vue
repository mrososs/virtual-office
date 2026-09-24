<script setup lang="ts">
import { RotateCcw, TriangleAlert } from 'lucide-vue-next';

import { BaseButton } from '@/shared/components';

defineProps<{ message: string }>();
const emit = defineEmits<{ retry: [] }>();
</script>

<template>
  <div class="absolute inset-0 z-40 flex items-center justify-center bg-canvas/95 p-6" role="alert">
    <div class="vo-panel w-full max-w-[380px] p-5">
      <div class="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-red-500/10 text-red-400">
        <TriangleAlert :size="18" />
      </div>
      <p class="text-sm font-semibold">The office couldn't load</p>
      <p class="mt-1.5 text-[13px] leading-relaxed text-muted">{{ message }}</p>
      <div class="mt-4 flex gap-2">
        <BaseButton variant="primary" @click="emit('retry')">
          <RotateCcw :size="14" /> Try again
        </BaseButton>
      </div>
    </div>
  </div>
</template>
