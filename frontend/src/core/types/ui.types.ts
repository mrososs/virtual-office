/**
 * Frontend-only types that describe UI/view concerns rather than domain
 * data — these do not belong in `@virtual-office/shared` because the
 * backend has no use for them.
 */
export type AsyncStatus = 'idle' | 'loading' | 'success' | 'error';

export interface AsyncState<TData> {
  status: AsyncStatus;
  data: TData | null;
  error: string | null;
}

export function createIdleAsyncState<TData>(): AsyncState<TData> {
  return { status: 'idle', data: null, error: null };
}

export interface ToastMessage {
  id: string;
  kind: 'info' | 'success' | 'warning' | 'error';
  text: string;
}
