<script setup lang="ts">
import { Volume2, VolumeX } from 'lucide-vue-next';

import { soundManager, type SoundCategory, type SoundId, type SoundPreferences } from '@/core/audio';
import { BaseButton } from '@/shared/components';
import { useSoundPreferences } from '@/shared/composables';

/** Settings → Sound. Stored per browser; releasing a slider plays a short sample at the new level. */
const { preferences, update, reset } = useSoundPreferences();

type VolumeKey = Exclude<keyof SoundPreferences, 'enabled'>;

const CHANNELS: Array<{ key: SoundCategory; label: string; hint: string; sample: SoundId }> = [
  { key: 'environment', label: 'Environment', hint: 'Room cues and Game Room ambience', sample: 'room-game' },
  { key: 'movement', label: 'Footsteps', hint: 'Only your own avatar', sample: 'footstep' },
  { key: 'ui', label: 'Interface', hint: 'Opening panels, confirmations', sample: 'ui-success' },
  { key: 'notifications', label: 'Notifications', hint: 'Meetings, reviews, failed builds', sample: 'notify' },
  { key: 'games', label: 'Games', hint: 'Ping Pong and future games', sample: 'pong-hit' },
];

function setVolume(key: VolumeKey, event: Event): void {
  update({ [key]: Number((event.target as HTMLInputElement).value) });
}

function preview(sample: SoundId): void {
  soundManager.play(sample);
}
</script>

<template>
  <section class="vo-panel p-5">
    <p class="vo-section-label mb-3">Sound</p>

    <div class="flex flex-wrap items-start gap-3">
      <component :is="preferences.enabled ? Volume2 : VolumeX" :size="18" class="mt-0.5 text-accent" aria-hidden="true" />
      <div class="min-w-0 flex-1 text-[13px] leading-relaxed text-muted">
        <p class="font-medium text-ink">Office sounds</p>
        <p class="mt-0.5">Quiet footsteps, room cues, notification chimes and game sounds. Saved in this browser only. Everything is always shown on screen too.</p>
      </div>
      <button
        type="button"
        role="switch"
        :aria-checked="preferences.enabled"
        aria-label="Sound"
        class="relative mt-0.5 inline-flex h-6 w-11 shrink-0 items-center rounded-full border transition-colors duration-150"
        :class="preferences.enabled ? 'border-accent/60 bg-accent' : 'border-line/15 bg-raised'"
        @click="update({ enabled: !preferences.enabled })"
      >
        <span class="inline-block h-4 w-4 rounded-full bg-white shadow transition-transform duration-150" :class="preferences.enabled ? 'translate-x-6' : 'translate-x-1'" />
        <span class="sr-only">{{ preferences.enabled ? 'On' : 'Off' }}</span>
      </button>
    </div>

    <div class="mt-5 grid grid-cols-[minmax(0,150px)_1fr_40px] items-center gap-x-4 gap-y-3.5 text-[13px]" :class="!preferences.enabled && 'opacity-45'">
      <label for="sound-master" class="font-medium text-ink">Master volume</label>
      <input
        id="sound-master"
        type="range"
        min="0"
        max="100"
        step="5"
        :value="preferences.master"
        :disabled="!preferences.enabled"
        class="h-1.5 w-full cursor-pointer accent-accent disabled:cursor-not-allowed"
        @input="setVolume('master', $event)"
        @change="preview('ui-success')"
      >
      <span class="text-right tabular-nums text-muted">{{ preferences.master }}%</span>

      <template v-for="channel in CHANNELS" :key="channel.key">
        <label :for="`sound-${channel.key}`" class="min-w-0">
          <span class="block text-ink">{{ channel.label }}</span>
          <span class="block truncate text-2xs text-subtle">{{ channel.hint }}</span>
        </label>
        <input
          :id="`sound-${channel.key}`"
          type="range"
          min="0"
          max="100"
          step="5"
          :value="preferences[channel.key]"
          :disabled="!preferences.enabled"
          class="h-1.5 w-full cursor-pointer accent-accent disabled:cursor-not-allowed"
          @input="setVolume(channel.key, $event)"
          @change="preview(channel.sample)"
        >
        <span class="text-right tabular-nums text-muted">{{ preferences[channel.key] }}%</span>
      </template>
    </div>

    <div class="mt-4 flex justify-end">
      <BaseButton size="sm" variant="ghost" @click="reset()">Restore defaults</BaseButton>
    </div>
  </section>
</template>
