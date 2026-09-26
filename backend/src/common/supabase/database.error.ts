import type { PostgrestError } from '@supabase/supabase-js';

/**
 * Raised by repositories when Supabase is unreachable, misconfigured or
 * rejects a query. The global filter turns it into a 503 so the client can
 * show "service unavailable" instead of a generic failure.
 */
export class DatabaseError extends Error {
  constructor(
    message: string,
    readonly code?: string,
  ) {
    super(message);
    this.name = 'DatabaseError';
  }
}

/** Postgres unique_violation — callers that race on a unique key can treat it as "someone else won". */
export const UNIQUE_VIOLATION = '23505';

/** Throws a `DatabaseError` for a failed Supabase call; returns the data otherwise. */
export function unwrap<T>(result: { data: T; error: PostgrestError | null }, operation: string): T {
  if (result.error) {
    throw new DatabaseError(`${operation} failed: ${result.error.message}`, result.error.code);
  }
  return result.data;
}

/** For `.single()` calls: the row, or a `DatabaseError` if the call failed or returned nothing. */
export function unwrapRow<T>(result: { data: T | null; error: PostgrestError | null }, operation: string): T {
  const row = unwrap(result, operation);
  if (row === null) throw new DatabaseError(`${operation} returned no row`);
  return row;
}
