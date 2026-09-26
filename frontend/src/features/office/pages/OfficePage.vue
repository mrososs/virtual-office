<script setup lang="ts">
import { computed } from 'vue';
import { useRoute } from 'vue-router';

import { runtimeEnv } from '@/core/config';
import DemoControlPanel from '@/features/demo/components/DemoControlPanel.vue';
import ControlsHint from '@/features/office/components/ControlsHint.vue';
import DetailsDrawerHost from '@/features/office/components/DetailsDrawerHost.vue';
import InteractionPrompt from '@/features/office/components/InteractionPrompt.vue';
import LocalNavigationPill from '@/features/office/components/LocalNavigationPill.vue';
import LocationChip from '@/features/office/components/LocationChip.vue';
import OfficeCanvas from '@/features/office/components/OfficeCanvas.vue';
import OfficeErrorState from '@/features/office/components/OfficeErrorState.vue';
import OfficeHud from '@/features/office/components/OfficeHud.vue';
import OfficeLoadingOverlay from '@/features/office/components/OfficeLoadingOverlay.vue';
import RealtimeDisconnectedBanner from '@/features/office/components/RealtimeDisconnectedBanner.vue';
import ZoomControls from '@/features/office/components/ZoomControls.vue';
import { useOfficeExperience } from '@/features/office/composables/useOfficeExperience';
import { useOfficeHotkeys } from '@/features/office/composables/useOfficeHotkeys';
import { useOfficeStore } from '@/stores/office.store';

const { phase, errorMessage, canvasKey, retry } = useOfficeExperience();
useOfficeHotkeys();

const route = useRoute();
const officeStore = useOfficeStore();
// Side panels shift the HUD; overlays (Edit avatar) cover the office instead.
const panelOpen = computed(() => route.name !== 'office' && !route.meta.overlay);
// Production realtime is required for a truthful picture; demo mode can run fully local.
const showDisconnected = computed(() => !runtimeEnv.demoMode && officeStore.realtimeStatus === 'disconnected');
</script>

<template>
  <div class="relative h-full w-full overflow-hidden bg-canvas">
    <OfficeCanvas :key="canvasKey" class="absolute inset-0" />

    <template v-if="phase === 'ready'">
      <OfficeHud class="absolute top-3 z-10 transition-[left] duration-200" :class="panelOpen ? 'left-[344px]' : 'left-3'" />

      <RouterView v-slot="{ Component }">
        <Transition
          enter-active-class="transition duration-200 ease-out"
          enter-from-class="opacity-0 -translate-x-3"
          leave-active-class="transition duration-150 ease-in"
          leave-to-class="opacity-0 -translate-x-3"
        >
          <component :is="Component" />
        </Transition>
      </RouterView>

      <DetailsDrawerHost />
      <LocalNavigationPill class="absolute left-1/2 top-3 z-10 -translate-x-1/2" />
      <RealtimeDisconnectedBanner v-if="showDisconnected" class="absolute left-1/2 top-14 z-20 -translate-x-1/2" />
      <InteractionPrompt class="absolute bottom-4 left-1/2 z-10 -translate-x-1/2" />
      <ControlsHint class="absolute bottom-16 left-1/2 z-10 -translate-x-1/2" />

      <div class="absolute bottom-3 z-10 flex items-end gap-2 transition-[left] duration-200" :class="panelOpen ? 'left-[344px]' : 'left-3'">
        <DemoControlPanel v-if="runtimeEnv.demoMode" />
        <LocationChip />
      </div>
      <ZoomControls />
    </template>

    <Transition leave-active-class="transition duration-300 ease-in" leave-to-class="opacity-0">
      <OfficeLoadingOverlay v-if="phase === 'loading' || phase === 'starting'" :phase="phase" />
    </Transition>
    <OfficeErrorState v-if="phase === 'error'" :message="errorMessage" @retry="retry" />
  </div>
</template>
