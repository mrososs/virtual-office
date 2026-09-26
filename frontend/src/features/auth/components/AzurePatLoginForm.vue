<script setup lang="ts">
import type { AuthMeResponse } from '@virtual-office/shared';
import { Lock } from 'lucide-vue-next';
import { shallowRef } from 'vue';

import { authService } from '@/core/auth';
import { BaseButton } from '@/shared/components';

import { tokenRequestNotice, type SignInNotice } from '../sign-in-messages';

import AzureTokenFields from './AzureTokenFields.vue';
import SignInNoticeCard from './SignInNoticeCard.vue';

/**
 * Work email + Azure DevOps PAT, entered once. The token is sent to our backend
 * only (which verifies it with Azure DevOps and stores it encrypted), then
 * wiped from the form; the browser keeps nothing but the session cookie.
 */
const props = defineProps<{ organization: string | null }>();
const emit = defineEmits<{ signedIn: [me: AuthMeResponse] }>();

const LAST_EMAIL_KEY = 'vo:last-work-email';

const email = shallowRef(readLastEmail());
const token = shallowRef('');
const expiresOn = shallowRef('');
const submitting = shallowRef(false);
const notice = shallowRef<SignInNotice | null>(null);

async function submit(): Promise<void> {
  if (submitting.value) return;
  submitting.value = true;
  notice.value = null;
  try {
    const me = await authService.loginWithAzurePat({ email: email.value.trim(), token: token.value, expiresOn: expiresOn.value || null });
    rememberEmail(email.value.trim());
    emit('signedIn', me);
  } catch (error) {
    notice.value = tokenRequestNotice(error);
  } finally {
    // Never keep the token around after it has been sent, whatever the outcome.
    token.value = '';
    submitting.value = false;
  }
}

/** Only the email is remembered (it is not a secret) so the next sign-in is quicker. */
function readLastEmail(): string {
  try {
    return window.localStorage.getItem(LAST_EMAIL_KEY) ?? '';
  } catch {
    return '';
  }
}

function rememberEmail(value: string): void {
  try {
    window.localStorage.setItem(LAST_EMAIL_KEY, value);
  } catch {
    // Storage unavailable: nothing to remember.
  }
}
</script>

<template>
  <form class="space-y-4" @submit.prevent="submit">
    <SignInNoticeCard v-if="notice" :notice="notice" />

    <label class="block">
      <span class="mb-1 block text-xs font-medium text-muted">Work email</span>
      <input
        v-model="email"
        type="email"
        name="email"
        autocomplete="username"
        required
        :disabled="submitting"
        placeholder="name@isaned.com"
        class="h-9 w-full rounded-lg border border-line/10 bg-raised px-3 text-[13px] placeholder:text-subtle focus:border-accent/50 focus:outline-none disabled:opacity-60"
      >
    </label>

    <AzureTokenFields v-model:token="token" v-model:expires-on="expiresOn" :organization="props.organization" :disabled="submitting" />

    <BaseButton type="submit" variant="primary" block :disabled="submitting || !email || !token">
      {{ submitting ? 'Verifying with Azure DevOps…' : 'Connect & Sign In' }}
    </BaseButton>

    <p class="flex gap-2 text-2xs leading-relaxed text-subtle">
      <Lock :size="12" class="mt-0.5 shrink-0" />
      Your Azure DevOps token is encrypted and stored securely on the server. It is never exposed to other users.
    </p>
  </form>
</template>
