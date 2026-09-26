<script setup lang="ts">
import { avatarAppearanceKey, type AvatarAppearance } from '@virtual-office/shared';
import { onMounted, useTemplateRef, watch } from 'vue';

import { drawAvatarFrame, type AvatarView } from '@/game/avatars';

import type { ThumbCrop } from '../avatar-creator.sections';

/** A tiny render of the current avatar wearing one option, so choices are visual rather than names. */
const props = withDefaults(defineProps<{ appearance: AvatarAppearance; crop: ThumbCrop; size?: number }>(), { size: 52 });

const canvas = useTemplateRef<HTMLCanvasElement>('canvas');

const CROPS: Record<ThumbCrop, { x: number; y: number; width: number; height: number; view: AvatarView }> = {
  full: { x: 1, y: -1, width: 30, height: 43, view: 'down' },
  head: { x: 3, y: -1.5, width: 26, height: 26, view: 'down' },
  bust: { x: 2, y: 2, width: 28, height: 30, view: 'down' },
  torso: { x: 2, y: 12, width: 28, height: 25, view: 'down' },
  legs: { x: 5, y: 24, width: 22, height: 18, view: 'down' },
  feet: { x: 8, y: 33, width: 16, height: 9, view: 'left' },
};

function draw(): void {
  const element = canvas.value;
  const ctx = element?.getContext('2d');
  if (!element || !ctx) return;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const pixels = Math.round(props.size * dpr);
  if (element.width !== pixels) {
    element.width = pixels;
    element.height = pixels;
  }
  ctx.clearRect(0, 0, pixels, pixels);
  const crop = CROPS[props.crop];
  const scale = pixels / Math.max(crop.width, crop.height);
  const offsetX = (pixels - crop.width * scale) / 2;
  const offsetY = (pixels - crop.height * scale) / 2;
  drawAvatarFrame(ctx, props.appearance, crop.view, 'idle', false, { x: offsetX - crop.x * scale, y: offsetY - crop.y * scale, scale });
}

watch(() => `${avatarAppearanceKey(props.appearance)}|${props.crop}`, draw);
onMounted(draw);
</script>

<template>
  <canvas ref="canvas" :style="{ width: `${size}px`, height: `${size}px` }" aria-hidden="true" />
</template>
