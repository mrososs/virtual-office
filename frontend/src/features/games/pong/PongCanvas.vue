<script setup lang="ts">
import { PONG_RULES, SOCKET_EVENTS, type PongDirection, type PongSessionStatus } from '@virtual-office/shared';
import { ChevronDown, ChevronUp } from 'lucide-vue-next';
import { onBeforeUnmount, onMounted, shallowRef, watch } from 'vue';

import { socketClient } from '@/core/socket';

import { gameRoomClient } from '../game-room.client';
import { PongView } from './pong-view';

/**
 * The table itself: a 2D canvas redrawn every animation frame from the
 * latest server snapshot (see PongView). Input goes out only when the
 * direction changes, plus a slow heartbeat while a match is live — never
 * per frame. Snapshots bypass Vue reactivity entirely.
 */
const props = defineProps<{ sessionId: string; mySide: 0 | 1; status: PongSessionStatus }>();

const UP_KEYS = new Set(['w', 'W', 'ArrowUp']);
const DOWN_KEYS = new Set(['s', 'S', 'ArrowDown']);
const LIVE_STATUSES: ReadonlySet<PongSessionStatus> = new Set(['COUNTDOWN', 'PLAYING', 'PAUSED']);

const canvas = shallowRef<HTMLCanvasElement | null>(null);
const wrapper = shallowRef<HTMLElement | null>(null);
const touchUp = shallowRef(false);
const touchDown = shallowRef(false);

const view = new PongView(props.mySide);
const keys = { up: false, down: false };
let sentDirection: PongDirection = 0;
let frame = 0;
let lastFrameAt = 0;
let scale = 1;
let heartbeat = 0;
let observer: ResizeObserver | null = null;

const unsubscribeState = socketClient.on(SOCKET_EVENTS.GAME_STATE, (state) => {
  if (state.sessionId === props.sessionId) view.receive(state, performance.now());
});

function currentDirection(): PongDirection {
  const up = keys.up || touchUp.value;
  const down = keys.down || touchDown.value;
  return up === down ? 0 : up ? -1 : 1;
}

function pushDirection(force = false): void {
  const direction = props.status === 'PLAYING' ? currentDirection() : 0;
  view.setDirection(direction);
  if (!force && direction === sentDirection) return;
  sentDirection = direction;
  gameRoomClient.input(props.sessionId, direction);
}

function onKey(event: KeyboardEvent, pressed: boolean): void {
  const up = UP_KEYS.has(event.key);
  const down = DOWN_KEYS.has(event.key);
  if (!up && !down) return;
  event.preventDefault();
  if (up) keys.up = pressed;
  if (down) keys.down = pressed;
  pushDirection();
}
const onKeyDown = (event: KeyboardEvent) => onKey(event, true);
const onKeyUp = (event: KeyboardEvent) => onKey(event, false);
const onBlur = () => {
  keys.up = false;
  keys.down = false;
  pushDirection();
};

function touch(button: 'up' | 'down', pressed: boolean): void {
  (button === 'up' ? touchUp : touchDown).value = pressed;
  pushDirection();
}

function resize(): void {
  const element = canvas.value;
  const box = wrapper.value;
  if (!element || !box) return;
  const { width } = box.getBoundingClientRect();
  const cssWidth = Math.max(160, width);
  const cssHeight = (cssWidth * PONG_RULES.fieldHeight) / PONG_RULES.fieldWidth;
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  element.style.width = `${cssWidth}px`;
  element.style.height = `${cssHeight}px`;
  element.width = Math.round(cssWidth * dpr);
  element.height = Math.round(cssHeight * dpr);
  scale = (cssWidth * dpr) / PONG_RULES.fieldWidth;
}

function render(now: number): void {
  const ctx = canvas.value?.getContext('2d');
  const dt = lastFrameAt ? Math.min(0.05, (now - lastFrameAt) / 1000) : 0;
  lastFrameAt = now;
  if (ctx) view.draw(ctx, scale, now, dt);
  frame = requestAnimationFrame(render);
}

watch(
  () => props.status,
  (status, previous) => {
    view.setPlaying(status === 'PLAYING');
    // A fresh game (after the match-found screen or a finished match) starts from a clean table.
    if (status === 'COUNTDOWN' && (previous === 'READY' || previous === 'ENDED')) view.reset();
    pushDirection(true);
  },
);

onMounted(() => {
  view.setPlaying(props.status === 'PLAYING');
  resize();
  observer = new ResizeObserver(resize);
  if (wrapper.value) observer.observe(wrapper.value);
  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  window.addEventListener('blur', onBlur);
  // The server pauses a match whose player goes quiet; this keeps a live player's connection counted.
  heartbeat = window.setInterval(() => {
    if (LIVE_STATUSES.has(props.status)) pushDirection(true);
  }, PONG_RULES.inputHeartbeatMs);
  frame = requestAnimationFrame(render);
});

onBeforeUnmount(() => {
  cancelAnimationFrame(frame);
  window.clearInterval(heartbeat);
  observer?.disconnect();
  window.removeEventListener('keydown', onKeyDown);
  window.removeEventListener('keyup', onKeyUp);
  window.removeEventListener('blur', onBlur);
  unsubscribeState();
});
</script>

<template>
  <div ref="wrapper" class="relative w-full">
    <canvas ref="canvas" class="block rounded-lg" role="img" aria-label="Ping Pong table" />
    <!-- Touch screens: hold to move the paddle. -->
    <div class="pointer-events-none absolute inset-y-0 right-2 hidden flex-col justify-center gap-3 [@media(pointer:coarse)]:flex">
      <button
        v-for="button in (['up', 'down'] as const)"
        :key="button"
        type="button"
        class="pointer-events-auto flex h-16 w-16 touch-none select-none items-center justify-center rounded-2xl border border-line/15 bg-raised/80 text-ink active:bg-accent/30"
        :aria-label="button === 'up' ? 'Move paddle up' : 'Move paddle down'"
        @pointerdown.prevent="touch(button, true)"
        @pointerup="touch(button, false)"
        @pointercancel="touch(button, false)"
        @pointerleave="touch(button, false)"
      >
        <ChevronUp v-if="button === 'up'" :size="28" />
        <ChevronDown v-else :size="28" />
      </button>
    </div>
  </div>
</template>
