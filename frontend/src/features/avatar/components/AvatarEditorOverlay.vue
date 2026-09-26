<script setup lang="ts">
import { X } from 'lucide-vue-next';
import { onMounted, useTemplateRef } from 'vue';
import { useRouter } from 'vue-router';

import { IconButton } from '@/shared/components';
import { useAvatarStore } from '@/stores/avatar.store';

import AvatarCreator from './AvatarCreator.vue';

/**
 * Edit Avatar, opened from inside the office (/office/avatar). The office
 * stays mounted and connected underneath, so a save re-skins your avatar in
 * place and teammates see the change live — no reload of the Phaser world.
 * Key presses are kept inside the overlay so arrow keys never walk you around.
 */
const router = useRouter();
const avatarStore = useAvatarStore();
const root = useTemplateRef<HTMLElement>('root');

onMounted(() => {
  void avatarStore.ensureLoaded();
  root.value?.focus();
});

function close(): void {
  void router.push({ name: 'office' });
}
</script>

<template>
  <div
    ref="root"
    tabindex="-1"
    class="absolute inset-0 z-40 overflow-y-auto bg-canvas/[0.97] outline-none backdrop-blur-sm"
    role="dialog"
    aria-modal="true"
    aria-labelledby="edit-avatar-title"
    @keydown.stop
    @keydown.esc="close"
  >
    <div class="mx-auto max-w-[1180px] px-4 pt-5 sm:px-6">
      <div class="mb-4 flex items-start gap-3">
        <div class="min-w-0">
          <p class="vo-section-label mb-1">My profile</p>
          <h1 id="edit-avatar-title" class="text-lg font-semibold tracking-tight text-ink">Edit avatar</h1>
        </div>
        <IconButton label="Close (Esc)" class="ml-auto" @click="close"><X :size="16" /></IconButton>
      </div>
      <AvatarCreator mode="edit" @enter="close" />
    </div>
  </div>
</template>
