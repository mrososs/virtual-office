<script setup lang="ts">
import type { AvatarAppearance, Direction } from '@virtual-office/shared';
import { onBeforeUnmount, onMounted, useTemplateRef, watch } from 'vue';

import {
  AVATAR_FEET_Y,
  AVATAR_FRAME_HEIGHT,
  AVATAR_FRAME_WIDTH,
  AvatarAnimationController,
  drawAvatarFrame,
  type AvatarPose,
  type AvatarView,
} from '@/game/avatars';

/**
 * Live, animated preview for the avatar creator. Uses the office's own
 * painters and animation controller, so what you see here is exactly what
 * teammates will see walking around — updated instantly on every change.
 */
const props = withDefaults(defineProps<{ appearance: AvatarAppearance; direction: Direction; walking: boolean; scale?: number }>(), { scale: 6 });

const HEADROOM = 3;
const canvas = useTemplateRef<HTMLCanvasElement>('canvas');
const cssWidth = AVATAR_FRAME_WIDTH * props.scale + 24;
const cssHeight = (AVATAR_FRAME_HEIGHT + HEADROOM) * props.scale + 8;

let frame: { view: AvatarView; pose: AvatarPose; flip: boolean } = { view: 'down', pose: 'idle', flip: false };
let dirty = true;
let rafId = 0;
let lastTime = 0;

const controller = new AvatarAnimationController({
  showFrame(view, pose, flip) {
    if (view === frame.view && pose === frame.pose && flip === frame.flip) return;
    frame = { view, pose, flip };
    dirty = true;
  },
});

function draw(): void {
  const element = canvas.value;
  const ctx = element?.getContext('2d');
  if (!element || !ctx) return;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  if (element.width !== Math.round(cssWidth * dpr)) {
    element.width = Math.round(cssWidth * dpr);
    element.height = Math.round(cssHeight * dpr);
  }
  const scale = props.scale * dpr;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, element.width, element.height);

  const originX = (element.width - AVATAR_FRAME_WIDTH * scale) / 2;
  const originY = HEADROOM * scale;
  // Ground the character with the same soft contact shadow as in the office.
  const feetY = originY + AVATAR_FEET_Y * scale;
  const gradient = ctx.createRadialGradient(element.width / 2, feetY, 0, element.width / 2, feetY, 14 * scale);
  gradient.addColorStop(0, 'rgba(0, 0, 0, 0.38)');
  gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.save();
  ctx.translate(element.width / 2, feetY);
  ctx.scale(1, 0.3);
  ctx.translate(-element.width / 2, -feetY);
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(element.width / 2, feetY, 14 * scale, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  drawAvatarFrame(ctx, props.appearance, frame.view, frame.pose, frame.flip, { x: originX, y: originY, scale });
}

function tick(time: number): void {
  const delta = lastTime ? Math.min(time - lastTime, 100) : 0;
  lastTime = time;
  controller.update(props.direction, props.walking, delta);
  if (dirty) {
    dirty = false;
    draw();
  }
  rafId = requestAnimationFrame(tick);
}

watch(
  () => props.appearance,
  () => (dirty = true),
  { deep: true },
);

onMounted(() => {
  rafId = requestAnimationFrame(tick);
});

onBeforeUnmount(() => cancelAnimationFrame(rafId));
</script>

<template>
  <canvas ref="canvas" :style="{ width: `${cssWidth}px`, height: `${cssHeight}px` }" role="img" aria-label="Live preview of your avatar" />
</template>
