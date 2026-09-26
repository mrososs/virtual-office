import { computed, shallowRef } from 'vue';

/** Chromium's install prompt event (not in the DOM typings). */
interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const deferredPrompt = shallowRef<BeforeInstallPromptEvent | null>(null);
const installedThisSession = shallowRef(false);
const standalone = shallowRef(detectStandalone());

function detectStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.matchMedia('(display-mode: window-controls-overlay)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

let listening = false;

/**
 * Starts listening for the browser's install prompt. Called once from
 * bootstrap: `beforeinstallprompt` may fire before any component mounts. The
 * browser only fires it when the app is installable and not installed yet.
 */
export function captureInstallPrompt(): void {
  if (listening || typeof window === 'undefined') return;
  listening = true;
  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault(); // Keep the mini-infobar away; we offer install from the profile menu / Settings.
    deferredPrompt.value = event as BeforeInstallPromptEvent;
  });
  window.addEventListener('appinstalled', () => {
    deferredPrompt.value = null;
    installedThisSession.value = true;
  });
  window.matchMedia('(display-mode: standalone)').addEventListener('change', () => (standalone.value = detectStandalone()));
}

/** Install affordance state — only offered when installation is possible and we are not already the installed app. */
export function usePwaInstall() {
  const canInstall = computed(() => deferredPrompt.value !== null && !standalone.value);

  async function promptInstall(): Promise<'accepted' | 'dismissed' | 'unavailable'> {
    const prompt = deferredPrompt.value;
    if (!prompt) return 'unavailable';
    await prompt.prompt();
    const { outcome } = await prompt.userChoice;
    // A prompt can only be used once; the browser fires a new beforeinstallprompt if it becomes possible again.
    deferredPrompt.value = null;
    return outcome;
  }

  return {
    canInstall,
    isStandalone: computed(() => standalone.value),
    installedThisSession: computed(() => installedThisSession.value),
    promptInstall,
  };
}
