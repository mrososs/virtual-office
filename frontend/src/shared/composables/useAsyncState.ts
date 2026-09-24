import { reactive } from 'vue';

import type { AsyncState } from '@/core/types';
import { createIdleAsyncState } from '@/core/types';

/**
 * Small helper composable for wrapping a promise-returning call in a
 * reactive {status,data,error} shape. Not a data-fetching library — just
 * enough structure to avoid ad hoc loading/error booleans in every
 * feature composable.
 */
export function useAsyncState<TData>() {
  // Cast past Vue's UnwrapNestedRefs<AsyncState<TData>> — for an unconstrained
  // generic TData it cannot prove TData assignable to UnwrapRef<TData>, but
  // the state genuinely only ever holds plain TData values, never a Ref<TData>.
  const state = reactive(createIdleAsyncState<TData>()) as AsyncState<TData>;

  async function run(task: () => Promise<TData>): Promise<void> {
    state.status = 'loading';
    state.error = null;
    try {
      state.data = await task();
      state.status = 'success';
    } catch (error) {
      state.error = error instanceof Error ? error.message : 'Unknown error';
      state.status = 'error';
    }
  }

  return { state, run };
}
