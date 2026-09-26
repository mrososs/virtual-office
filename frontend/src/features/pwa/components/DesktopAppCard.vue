<script setup lang="ts">
import { CheckCircle2, MonitorSmartphone, Power } from 'lucide-vue-next';

import { usePwaInstall } from '../install-prompt';

import InstallAppButton from './InstallAppButton.vue';

/**
 * Settings → Desktop app. Browsers do not let a web page make itself start
 * with Windows, so auto-start is explained (Edge's own setting) rather than
 * forced. Company-wide rollout can later use Edge enterprise policies.
 */
const { canInstall, isStandalone, installedThisSession } = usePwaInstall();
</script>

<template>
  <section class="vo-panel p-5">
    <p class="vo-section-label mb-3">Desktop app</p>

    <div class="flex flex-wrap items-start gap-3">
      <MonitorSmartphone :size="18" class="mt-0.5 text-accent" />
      <div class="min-w-0 flex-1 text-[13px] leading-relaxed text-muted">
        <template v-if="isStandalone">
          <p class="flex items-center gap-1.5 font-medium text-ink"><CheckCircle2 :size="14" class="text-emerald-400" /> You're using the installed iSaned Virtual Office app.</p>
          <p class="mt-1">It lives in the Start menu and can be pinned to the taskbar like any Windows app.</p>
        </template>
        <template v-else-if="installedThisSession">
          <p class="flex items-center gap-1.5 font-medium text-ink"><CheckCircle2 :size="14" class="text-emerald-400" /> Installed. Open it from the Start menu or taskbar.</p>
        </template>
        <template v-else-if="canInstall">
          <p class="font-medium text-ink">Install iSaned Virtual Office on this computer.</p>
          <p class="mt-1">It opens in its own window, appears in the Start menu and taskbar, and starts straight in the office.</p>
          <InstallAppButton class="mt-3" />
        </template>
        <template v-else>
          <p class="font-medium text-ink">Install from Microsoft Edge or Google Chrome.</p>
          <p class="mt-1">Use the install icon in the address bar (or the browser menu → Apps → Install this site as an app). If it is already installed, open it from the Start menu.</p>
        </template>
      </div>
    </div>

    <div class="mt-4 flex gap-3 rounded-lg border border-line/[0.08] bg-raised/60 p-3.5 text-[13px] leading-relaxed text-muted">
      <Power :size="16" class="mt-0.5 shrink-0 text-accent" />
      <div>
        <p class="font-medium text-ink">Want iSaned Virtual Office to open automatically when you sign in to Windows?</p>
        <ol class="mt-1.5 list-decimal space-y-0.5 pl-4">
          <li>In Microsoft Edge, go to <code class="rounded bg-black/30 px-1 text-2xs">edge://apps</code>.</li>
          <li>On the iSaned Virtual Office card, select <span class="text-ink">Details</span> (or the app's <span class="text-ink">⋯</span> menu).</li>
          <li>Turn on <span class="text-ink">Auto-start on device login</span>.</li>
        </ol>
        <p class="mt-1.5 text-2xs text-subtle">Edge may also offer this option in the install dialog. Chrome has no per-app auto-start setting.</p>
      </div>
    </div>
  </section>
</template>
