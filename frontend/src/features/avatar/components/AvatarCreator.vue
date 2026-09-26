<script setup lang="ts">
import { employeeTitle, type Direction } from '@virtual-office/shared';
import { ArrowRight, Footprints, RotateCcw, RotateCw, Save, Shuffle, Undo2 } from 'lucide-vue-next';
import { computed, shallowRef } from 'vue';

import { BaseButton, IconButton } from '@/shared/components';
import { useAuthStore } from '@/stores/auth.store';
import { useAvatarStore } from '@/stores/avatar.store';

import { AVATAR_CREATOR_SECTIONS } from '../avatar-creator.sections';
import { useAvatarDraft } from '../composables/useAvatarDraft';

import AvatarOptionGroup from './AvatarOptionGroup.vue';
import AvatarPreview from './AvatarPreview.vue';

/**
 * The avatar creator: live preview on the left, every option from the
 * catalog on the right. Used for first-time setup (/avatar) and for editing
 * from inside the office (/office/avatar).
 */
const props = defineProps<{ mode: 'setup' | 'edit' }>();
const emit = defineEmits<{ enter: [] }>();

const authStore = useAuthStore();
const avatarStore = useAvatarStore();
const { draft, dirty, needsSave, saving, select, reset, randomize, save } = useAvatarDraft();

const TURN_ORDER: readonly Direction[] = ['down', 'left', 'up', 'right'];
const DIRECTION_LABEL: Record<Direction, string> = { down: 'Front', left: 'Left side', up: 'Back', right: 'Right side' };
const direction = shallowRef<Direction>('down');
const walking = shallowRef(false);

const name = computed(() => authStore.currentUser?.displayName ?? 'You');
const jobTitle = computed(() => (authStore.currentUser ? employeeTitle(authStore.currentUser) : null));
const enterLabel = computed(() => (props.mode === 'setup' ? 'Enter Office' : 'Back to office'));
const status = computed(() => {
  if (saving.value) return 'Saving…';
  if (dirty.value) return 'Unsaved changes';
  return avatarStore.hasAvatar ? 'All changes saved' : 'Pick a look and save it to continue';
});

function turn(step: 1 | -1): void {
  const index = TURN_ORDER.indexOf(direction.value);
  direction.value = TURN_ORDER[(index + step + TURN_ORDER.length) % TURN_ORDER.length] ?? 'down';
}

async function enterOffice(): Promise<void> {
  if (needsSave.value && !(await save())) return;
  emit('enter');
}
</script>

<template>
  <div class="grid gap-5 lg:grid-cols-[340px_minmax(0,1fr)] xl:grid-cols-[380px_minmax(0,1fr)]">
    <aside class="lg:sticky lg:top-4 lg:self-start">
      <div class="vo-panel overflow-hidden">
        <div class="avatar-stage relative flex flex-col items-center px-4 pb-3 pt-5">
          <AvatarPreview :appearance="draft" :direction="direction" :walking="walking" />
          <div class="mt-1 flex items-center gap-1 rounded-full bg-white/70 p-1 shadow-sm ring-1 ring-black/5 backdrop-blur">
            <IconButton label="Turn left" size="sm" class="!text-slate-600 hover:!bg-black/5 hover:!text-slate-900" @click="turn(-1)"><RotateCcw :size="14" /></IconButton>
            <span class="w-[74px] text-center text-2xs font-semibold text-slate-600" aria-live="polite">{{ DIRECTION_LABEL[direction] }}</span>
            <IconButton label="Turn right" size="sm" class="!text-slate-600 hover:!bg-black/5 hover:!text-slate-900" @click="turn(1)"><RotateCw :size="14" /></IconButton>
            <span class="mx-0.5 h-4 w-px bg-black/10" />
            <button
              type="button"
              class="inline-flex h-7 items-center gap-1.5 rounded-full px-2.5 text-2xs font-semibold transition-colors"
              :class="walking ? 'bg-accent text-accent-ink' : 'text-slate-600 hover:bg-black/5 hover:text-slate-900'"
              :aria-pressed="walking"
              @click="walking = !walking"
            >
              <Footprints :size="13" /> Walk
            </button>
          </div>
        </div>

        <div class="border-t border-line/[0.06] px-5 py-4">
          <p class="truncate text-sm font-semibold text-ink">{{ name }}</p>
          <p class="truncate text-xs text-muted">{{ jobTitle ?? 'Team member' }} · Your look is independent of your role</p>
          <div class="mt-3.5 grid grid-cols-2 gap-2">
            <BaseButton size="sm" @click="randomize"><Shuffle :size="13" /> Randomize</BaseButton>
            <BaseButton size="sm" :disabled="!dirty" title="Discard unsaved changes" @click="reset"><Undo2 :size="13" /> Reset</BaseButton>
          </div>
        </div>
      </div>
    </aside>

    <div class="min-w-0 space-y-4 pb-2">
      <section v-for="section in AVATAR_CREATOR_SECTIONS" :key="section.id" class="vo-panel p-4 sm:p-5" :aria-labelledby="`avatar-section-${section.id}`">
        <h2 :id="`avatar-section-${section.id}`" class="vo-section-label mb-3.5">{{ section.title }}</h2>
        <div class="space-y-5">
          <AvatarOptionGroup v-for="group in section.groups" :key="group.slot" :group="group" :appearance="draft" @select="select(group.slot, $event)" />
        </div>
      </section>
    </div>
  </div>

  <div class="sticky bottom-0 z-10 -mx-1 mt-4 flex flex-wrap items-center gap-3 border-t border-line/[0.06] bg-canvas/90 px-1 py-3 backdrop-blur-md">
    <p class="text-xs" :class="dirty ? 'text-amber-300/90' : 'text-subtle'" aria-live="polite">{{ status }}</p>
    <div class="ml-auto flex gap-2">
      <BaseButton :disabled="!needsSave || saving" @click="save"><Save :size="14" /> Save Avatar</BaseButton>
      <BaseButton variant="primary" :disabled="saving" @click="enterOffice">{{ enterLabel }} <ArrowRight :size="14" /></BaseButton>
    </div>
  </div>
</template>

<style scoped>
/* The preview stands on the office floor, so the look is judged against the real background. */
.avatar-stage {
  background-color: #dde2ea;
  background-image:
    radial-gradient(ellipse at 50% 40%, rgb(255 255 255 / 0.55), transparent 65%),
    linear-gradient(rgb(15 23 42 / 0.045) 1px, transparent 1px),
    linear-gradient(90deg, rgb(15 23 42 / 0.045) 1px, transparent 1px);
  background-size: auto, 32px 32px, 32px 32px;
  background-position: center, center, center;
}
</style>
