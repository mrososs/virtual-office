import { onBeforeUnmount, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { useGameStore } from '@/stores/game.store';
import { useUiStore } from '@/stores/ui.store';

import { useOfficeCommands } from './useOfficeCommands';

/** Esc closes the innermost thing: a walk in progress, then the drawer, then the side panel. */
export function useOfficeHotkeys(): void {
  const uiStore = useUiStore();
  const gameStore = useGameStore();
  const route = useRoute();
  const router = useRouter();
  const { cancelWalk } = useOfficeCommands();

  function onKeydown(event: KeyboardEvent): void {
    if (event.key !== 'Escape' || event.defaultPrevented) return;
    const target = event.target as HTMLElement | null;
    if (target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return;
    // An internal match on screen owns the keyboard; leaving it is an explicit button, never a stray Esc.
    if (gameStore.session?.kind === 'PONG') return;

    if (uiStore.localNavigationLabel) cancelWalk();
    else if (uiStore.selection) uiStore.clearSelection();
    else if (route.name !== 'office' && route.path.startsWith('/office')) void router.push({ name: 'office' });
  }

  onMounted(() => window.addEventListener('keydown', onKeydown));
  onBeforeUnmount(() => window.removeEventListener('keydown', onKeydown));
}
