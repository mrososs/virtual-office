<script setup lang="ts">
import type { AuthConfigResponse, AuthMeResponse } from '@virtual-office/shared';
import { RefreshCw } from 'lucide-vue-next';
import { computed, onMounted, shallowRef } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { authService } from '@/core/auth';
import { COMPANY_BRANDING } from '@/core/config/branding';
import { BaseButton, CompanyBrand } from '@/shared/components';
import { useAuthStore } from '@/stores/auth.store';
import { useAvatarStore } from '@/stores/avatar.store';

import AzurePatLoginForm from '../components/AzurePatLoginForm.vue';
import MicrosoftSignInButton from '../components/MicrosoftSignInButton.vue';
import SignInNoticeCard from '../components/SignInNoticeCard.vue';
import { SESSION_ENDED_NOTICE, SIGNED_OUT_NOTICE, sessionProblemNotice, signInErrorNotice } from '../sign-in-messages';

/**
 * Sign-in entry. Shows the method the server is configured for
 * (`/api/auth/config`): work email + Azure DevOps token today, Microsoft
 * sign-in once an Entra app registration exists. Signing in is always a
 * deliberate action, so an unreachable backend or a refusal shows a message
 * here instead of looping.
 */
const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();
const avatarStore = useAvatarStore();

const config = shallowRef<AuthConfigResponse | null>(null);
const configFailed = shallowRef(false);
const redirecting = shallowRef(false);
const retrying = shallowRef(false);

const returnTo = computed(() => {
  const redirect = route.query.redirect;
  return typeof redirect === 'string' && redirect.startsWith('/') && !redirect.startsWith('//') ? redirect : '/office';
});

const serverUnavailable = computed(() => authStore.status === 'unavailable' || configFailed.value);
const notice = computed(
  () =>
    sessionProblemNotice(authStore.status === 'unavailable' ? authStore.problem : configFailed.value ? 'backend_unreachable' : null) ??
    signInErrorNotice(route.query.error) ??
    (route.query.sessionEnded ? SESSION_ENDED_NOTICE : null) ??
    (route.query.signedOut ? SIGNED_OUT_NOTICE : null),
);

async function loadConfig(): Promise<void> {
  config.value = await authService.fetchConfig();
  configFailed.value = config.value === null;
}

onMounted(loadConfig);

function enter(me: AuthMeResponse): void {
  authStore.setSession(me);
  avatarStore.prime(me.employee.id, me.employee.avatar);
  // First login: the avatar guard sends people without an avatar to the creator first.
  void router.replace(returnTo.value);
}

function signInWithMicrosoft(): void {
  redirecting.value = true;
  window.location.assign(authService.microsoftSignInUrl(returnTo.value));
}

async function retry(): Promise<void> {
  retrying.value = true;
  try {
    const me = await authStore.restore();
    if (me) return enter(me);
    await loadConfig();
  } finally {
    retrying.value = false;
  }
}
</script>

<template>
  <div class="space-y-5">
    <CompanyBrand size="md" :subtitle="null" />
    <div>
      <h1 class="text-base font-semibold">{{ COMPANY_BRANDING.companyName }} {{ COMPANY_BRANDING.productName }}</h1>
      <p class="mt-1 text-[13px] leading-relaxed text-muted">
        <template v-if="config?.provider === 'azure_pat'">Sign in once with your work email and an Azure DevOps token. After that the app opens straight into the office.</template>
        <template v-else-if="config?.provider === 'microsoft_entra'">Use your {{ COMPANY_BRANDING.companyName }} Microsoft work account.</template>
        <template v-else>Sign in to continue.</template>
      </p>
    </div>

    <SignInNoticeCard v-if="notice" :notice="notice" />

    <BaseButton v-if="serverUnavailable" variant="primary" block :disabled="retrying" @click="retry">
      <RefreshCw :size="14" :class="retrying && 'animate-spin'" /> {{ retrying ? 'Checking…' : 'Retry' }}
    </BaseButton>
    <template v-else-if="config">
      <AzurePatLoginForm v-if="config.provider === 'azure_pat'" :organization="config.azureDevOps.organization" @signed-in="enter" />
      <MicrosoftSignInButton v-else-if="config.provider === 'microsoft_entra'" :busy="redirecting" @click="signInWithMicrosoft" />
      <p v-else class="rounded-lg border border-line/10 bg-raised p-3 text-[13px] text-muted">This server runs in demo mode: open the office with the demo frontend (VITE_DEMO_MODE=true).</p>
    </template>
    <p v-else class="text-[13px] text-muted">Loading…</p>

    <p class="text-2xs leading-relaxed text-subtle">Only approved {{ COMPANY_BRANDING.companyName }} team members can sign in.</p>
  </div>
</template>
