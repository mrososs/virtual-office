<script setup lang="ts">
import { CircleHelp } from 'lucide-vue-next';
import { shallowRef, useId } from 'vue';

import PatHelpDialog from './PatHelpDialog.vue';

/**
 * PAT + optional expiry inputs, shared by sign-in and "Update token". The
 * value lives only in this form until it is submitted; the page clears it
 * afterwards and it is never shown again.
 */
defineProps<{ organization: string | null; disabled?: boolean }>();
const token = defineModel<string>('token', { required: true });
const expiresOn = defineModel<string>('expiresOn', { required: true });

const helpOpen = shallowRef(false);
const tokenInputId = useId();
const today = new Date().toISOString().slice(0, 10);
</script>

<template>
  <div class="space-y-3">
    <div>
      <!-- The help button must not sit inside the <label>, or it would take over the field's accessible name. -->
      <div class="mb-1 flex items-center justify-between gap-3">
        <label :for="tokenInputId" class="text-xs font-medium text-muted">Azure DevOps token</label>
        <button type="button" class="inline-flex shrink-0 items-center gap-1 text-2xs font-medium text-accent hover:underline" @click="helpOpen = true">
          <CircleHelp :size="12" /> How do I create a token?
        </button>
      </div>
      <input
        :id="tokenInputId"
        v-model.trim="token"
        type="password"
        name="azure-devops-token"
        autocomplete="off"
        spellcheck="false"
        required
        :disabled="disabled"
        placeholder="Paste your token"
        class="h-9 w-full rounded-lg border border-line/10 bg-raised px-3 font-mono text-[13px] tracking-wide placeholder:font-sans placeholder:tracking-normal placeholder:text-subtle focus:border-accent/50 focus:outline-none disabled:opacity-60"
      >
    </div>
    <label class="block">
      <span class="mb-1 block text-xs font-medium text-muted">Token expires on <span class="font-normal text-subtle">(optional — for a renewal reminder)</span></span>
      <input
        v-model="expiresOn"
        type="date"
        name="azure-devops-token-expiry"
        :min="today"
        :disabled="disabled"
        class="h-9 w-full rounded-lg border border-line/10 bg-raised px-3 text-[13px] text-ink [color-scheme:dark] focus:border-accent/50 focus:outline-none disabled:opacity-60"
      >
    </label>
    <PatHelpDialog v-model:open="helpOpen" :organization="organization" />
  </div>
</template>
