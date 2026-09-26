<script setup lang="ts">
import { onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { useAvatarStore } from '@/stores/avatar.store';

import AvatarCreator from '../components/AvatarCreator.vue';

/** First-time setup: shown before the office when the signed-in user has no avatar yet. */
const route = useRoute();
const router = useRouter();
const avatarStore = useAvatarStore();

onMounted(() => void avatarStore.ensureLoaded());

function enterOffice(): void {
  const redirect = typeof route.query.redirect === 'string' && route.query.redirect.startsWith('/office') ? route.query.redirect : '/office';
  void router.push(redirect);
}
</script>

<template>
  <div class="mx-auto max-w-[1180px] px-4 pt-6 sm:px-6 lg:pt-8">
    <div class="mb-5 max-w-2xl">
      <p class="vo-section-label mb-1.5">{{ avatarStore.hasAvatar ? 'Your avatar' : 'Welcome — one quick step' }}</p>
      <h1 class="text-xl font-semibold tracking-tight text-ink">{{ avatarStore.hasAvatar ? 'Edit your avatar' : 'Create your avatar' }}</h1>
      <p class="mt-1.5 text-[13px] leading-relaxed text-muted">
        This is how teammates see you walking around the office. The preview updates as you choose, and you can change it any time from your profile menu.
      </p>
    </div>
    <AvatarCreator mode="setup" @enter="enterOffice" />
  </div>
</template>
