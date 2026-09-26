<script setup lang="ts">
import { ExternalLink, KeyRound, X } from 'lucide-vue-next';
import { useTemplateRef, watch } from 'vue';

import { REQUIRED_PAT_SCOPES, personalAccessTokensUrl } from '../azure-pat-help';

/** "How do I create a token?" — native <dialog> (focus trap + Esc for free). */
const props = defineProps<{ organization: string | null }>();
const open = defineModel<boolean>('open', { required: true });
const dialog = useTemplateRef<HTMLDialogElement>('dialog');

watch(open, (isOpen) => {
  if (isOpen) dialog.value?.showModal();
  else dialog.value?.close();
});

const tokensUrl = personalAccessTokensUrl(props.organization);
</script>

<template>
  <!-- Teleported: inside a spaced form container the sibling margin would pull the modal off-center. -->
  <Teleport to="body">
    <dialog
      ref="dialog"
      class="vo-panel m-auto w-[min(560px,calc(100vw-32px))] p-0 text-ink shadow-pop backdrop:bg-black/60"
      aria-labelledby="pat-help-title"
      @close="open = false"
      @click.self="open = false"
    >
      <div class="max-h-[80vh] overflow-y-auto p-6">
        <div class="flex items-start gap-3">
          <KeyRound :size="18" class="mt-0.5 shrink-0 text-accent" />
          <div class="min-w-0 flex-1">
            <h2 id="pat-help-title" class="text-sm font-semibold">Create an Azure DevOps personal access token</h2>
            <p class="mt-1 text-xs text-muted">Takes about a minute. The Virtual Office only reads data — it never changes anything in Azure DevOps.</p>
          </div>
          <button type="button" class="rounded-md p-1 text-subtle hover:bg-hover hover:text-ink" aria-label="Close" @click="open = false"><X :size="15" /></button>
        </div>

        <ol class="mt-5 list-decimal space-y-2 pl-5 text-[13px] leading-relaxed text-muted">
          <li>
            Open Azure DevOps{{ organization ? ` (${organization})` : '' }} →
            <span class="text-ink">User settings</span> (the person icon, top right) → <span class="text-ink">Personal access tokens</span>.
            <a :href="tokensUrl" target="_blank" rel="noopener noreferrer" class="ml-1 inline-flex items-center gap-1 text-accent hover:underline">Open it <ExternalLink :size="11" /></a>
          </li>
          <li>Select <span class="text-ink">+ New Token</span>.</li>
          <li>Name it, e.g. <span class="text-ink">iSaned Virtual Office</span>.</li>
          <li>Organization: choose <span class="text-ink">{{ organization ?? 'the iSaned organization' }}</span> only — not "All accessible organizations".</li>
          <li>Expiration: a sensible, short period (for example 30 days). Enter the same date here so we can remind you.</li>
          <li>
            Scopes: <span class="text-ink">Custom defined</span>, then tick only these, each <span class="text-ink">Read</span>:
            <ul class="mt-1.5 space-y-1">
              <li v-for="scope in REQUIRED_PAT_SCOPES" :key="scope.area" class="flex gap-2">
                <span class="w-40 shrink-0 font-medium text-ink">{{ scope.area }} ({{ scope.access }})</span>
                <span class="text-subtle">{{ scope.why }}</span>
              </li>
            </ul>
          </li>
          <li>Select <span class="text-ink">Create</span> and copy the token right away.</li>
        </ol>

        <div class="mt-5 space-y-1.5 rounded-lg border border-amber-400/20 bg-amber-400/[0.06] p-3 text-xs leading-relaxed text-amber-100/90">
          <p><span class="font-semibold">Azure DevOps shows the token only once.</span> If you lose it, create a new one.</p>
          <p>Never share your token with teammates — each person uses their own.</p>
          <p>No write, manage or admin scopes are needed. Don't add them.</p>
        </div>
      </div>
    </dialog>
  </Teleport>
</template>
