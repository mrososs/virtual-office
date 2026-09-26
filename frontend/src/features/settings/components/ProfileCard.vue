<script setup lang="ts">
import { avatarColorHex, employeeTitle, normalizeAvatarAppearance } from '@virtual-office/shared';
import { LogOut, Shirt } from 'lucide-vue-next';
import { computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';

import { useSignOut } from '@/features/auth/composables/useSignOut';
import { avatarPortraitUrl } from '@/features/avatar/avatar-portrait';
import { tint } from '@/game/rendering/canvas-texture';
import { BaseButton } from '@/shared/components';
import { useAuthStore } from '@/stores/auth.store';
import { useAvatarStore } from '@/stores/avatar.store';

/** Who you are to the app: name + email, job title and team from our employee list, and your avatar. No token details. */
const authStore = useAuthStore();
const avatarStore = useAvatarStore();
const router = useRouter();
const { signOut, signingOut } = useSignOut();

onMounted(() => void avatarStore.ensureLoaded());

const user = computed(() => authStore.currentUser);
const appearance = computed(() => normalizeAvatarAppearance(avatarStore.ownProfile ?? avatarStore.starter));
const portrait = computed(() => avatarPortraitUrl(appearance.value));
const portraitBackground = computed(() => tint(avatarColorHex('topColor', appearance.value.topColor), 0.62));
</script>

<template>
  <section class="vo-panel p-5">
    <p class="vo-section-label mb-3">My profile</p>
    <div v-if="user" class="flex flex-wrap items-center gap-4">
      <img :src="portrait" alt="Your avatar" class="h-16 w-16 rounded-full object-cover" :style="{ backgroundColor: portraitBackground }" draggable="false">
      <div class="min-w-0 flex-1">
        <p class="text-sm font-semibold text-ink">{{ user.displayName }}</p>
        <p class="text-xs text-muted">{{ employeeTitle(user) }}</p>
        <p v-if="user.team" class="text-2xs text-subtle">{{ [user.team, user.discipline].filter(Boolean).join(' · ') }}</p>
        <p class="truncate text-2xs text-subtle">{{ user.email }}</p>
        <p v-if="!avatarStore.hasAvatar && avatarStore.status === 'ready'" class="mt-1 text-2xs text-amber-300/90">You haven't created your avatar yet.</p>
      </div>
      <div class="flex flex-wrap gap-2">
        <BaseButton size="sm" @click="router.push(avatarStore.hasAvatar ? { name: 'office-avatar' } : { name: 'avatar-setup' })"><Shirt :size="13" /> Edit avatar</BaseButton>
        <BaseButton v-if="!authStore.isDemoSession" size="sm" variant="ghost" :disabled="signingOut" @click="signOut()"><LogOut :size="13" /> Sign out</BaseButton>
      </div>
    </div>
  </section>
</template>
