<script setup lang="ts">
import { shallowRef } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { BaseButton } from '@/shared/components';
import { useAuthStore } from '@/stores/auth.store';

const email = shallowRef('');
const password = shallowRef('');
const error = shallowRef<string | null>(null);
const authStore = useAuthStore();
const router = useRouter();
const route = useRoute();

async function handleSubmit(): Promise<void> {
  error.value = null;
  try {
    await authStore.login(email.value, password.value);
    await router.push(typeof route.query.redirect === 'string' ? route.query.redirect : { name: 'office' });
  } catch {
    error.value = 'Sign-in is not available yet. Run the frontend with VITE_DEMO_MODE=true to explore the demo office.';
  }
}
</script>

<template>
  <form class="space-y-4" @submit.prevent="handleSubmit">
    <div class="flex items-center gap-2.5">
      <img src="/favicon.svg" alt="" class="h-7 w-7">
      <h1 class="text-base font-semibold">Sign in to Virtual Office</h1>
    </div>
    <input v-model="email" type="email" autocomplete="email" name="email" placeholder="Work email" class="h-9 w-full rounded-lg border border-line/10 bg-raised px-3 text-[13px] placeholder:text-subtle focus:border-accent/50 focus:outline-none">
    <input v-model="password" type="password" autocomplete="current-password" name="password" placeholder="Password" class="h-9 w-full rounded-lg border border-line/10 bg-raised px-3 text-[13px] placeholder:text-subtle focus:border-accent/50 focus:outline-none">
    <p v-if="error" class="text-xs leading-relaxed text-amber-300/90">{{ error }}</p>
    <BaseButton type="submit" variant="primary" block :disabled="authStore.isAuthenticating">Sign in</BaseButton>
  </form>
</template>
