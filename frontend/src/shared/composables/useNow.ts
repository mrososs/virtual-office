import { onScopeDispose, shallowRef } from 'vue';

/** A clock ref that ticks every `intervalMs` — for countdowns and "x min ago" labels. */
export function useNow(intervalMs = 1000) {
  const now = shallowRef(Date.now());
  const timer = window.setInterval(() => (now.value = Date.now()), intervalMs);
  onScopeDispose(() => window.clearInterval(timer));
  return now;
}
