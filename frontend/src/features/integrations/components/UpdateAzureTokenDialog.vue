<script setup lang="ts">
import type { AzureTokenUpdateResponse } from '@virtual-office/shared';
import { KeyRound, X } from 'lucide-vue-next';
import { shallowRef, useTemplateRef, watch } from 'vue';

import AzureTokenFields from '@/features/auth/components/AzureTokenFields.vue';
import SignInNoticeCard from '@/features/auth/components/SignInNoticeCard.vue';
import { tokenRequestNotice, type SignInNotice } from '@/features/auth/sign-in-messages';
import { BaseButton } from '@/shared/components';

/**
 * "Update token": replace the saved Azure DevOps PAT with a new one. Same
 * employee, same history — the backend re-verifies it belongs to them, seals
 * it, and never sends it back.
 */
const props = defineProps<{
  organization: string | null;
  save: (token: string, expiresOn: string | null) => Promise<AzureTokenUpdateResponse>;
}>();
const open = defineModel<boolean>('open', { required: true });
const emit = defineEmits<{ saved: [result: AzureTokenUpdateResponse] }>();

const dialog = useTemplateRef<HTMLDialogElement>('dialog');
const token = shallowRef('');
const expiresOn = shallowRef('');
const saving = shallowRef(false);
const notice = shallowRef<SignInNotice | null>(null);

watch(open, (isOpen) => {
  if (isOpen) {
    notice.value = null;
    dialog.value?.showModal();
  } else {
    token.value = '';
    dialog.value?.close();
  }
});

async function submit(): Promise<void> {
  if (saving.value || !token.value) return;
  saving.value = true;
  notice.value = null;
  try {
    const result = await props.save(token.value, expiresOn.value || null);
    emit('saved', result);
    open.value = false;
  } catch (error) {
    notice.value = tokenRequestNotice(error);
  } finally {
    token.value = '';
    saving.value = false;
  }
}
</script>

<template>
  <dialog
    ref="dialog"
    class="vo-panel m-auto w-[min(460px,calc(100vw-32px))] p-0 text-ink shadow-pop backdrop:bg-black/60"
    aria-labelledby="update-token-title"
    @close="open = false"
  >
    <form class="space-y-4 p-6" @submit.prevent="submit">
      <div class="flex items-start gap-3">
        <KeyRound :size="18" class="mt-0.5 shrink-0 text-accent" />
        <div class="min-w-0 flex-1">
          <h2 id="update-token-title" class="text-sm font-semibold">Update Azure DevOps token</h2>
          <p class="mt-1 text-xs text-muted">Paste a new token you created. It replaces the saved one; your account and office stay the same.</p>
        </div>
        <button type="button" class="rounded-md p-1 text-subtle hover:bg-hover hover:text-ink" aria-label="Close" @click="open = false"><X :size="15" /></button>
      </div>

      <SignInNoticeCard v-if="notice" :notice="notice" />
      <AzureTokenFields v-model:token="token" v-model:expires-on="expiresOn" :organization="organization" :disabled="saving" />

      <div class="flex justify-end gap-2">
        <BaseButton variant="ghost" @click="open = false">Cancel</BaseButton>
        <BaseButton type="submit" variant="primary" :disabled="saving || !token">{{ saving ? 'Verifying…' : 'Save token' }}</BaseButton>
      </div>
      <p class="text-2xs leading-relaxed text-subtle">Encrypted on the server and never shown again — not to you, not to anyone else.</p>
    </form>
  </dialog>
</template>
