import { HttpException, HttpStatus, Injectable } from '@nestjs/common';

const WINDOW_MS = 15 * 60_000;
/** Failed credential checks allowed per window, per key kind. */
const LIMITS = { email: 5, ip: 20, employee: 5 } as const;

type KeyKind = keyof typeof LIMITS;

/**
 * Caps failed token checks (sign-in and "Update token") so nobody can use the
 * Virtual Office to probe Azure DevOps credentials. In memory, like the rest of
 * the single-instance realtime state; successful attempts clear the counters.
 */
@Injectable()
export class LoginRateLimiter {
  private readonly failures = new Map<string, number[]>();

  keys(parts: Partial<Record<KeyKind, string | null | undefined>>): string[] {
    return (Object.entries(parts) as Array<[KeyKind, string | null | undefined]>)
      .filter(([, value]) => Boolean(value))
      .map(([kind, value]) => `${kind}:${String(value).toLowerCase()}`);
  }

  /** Throws 429 (`rate_limited`, with Retry-After) when any key is over its limit. */
  assertAllowed(keys: string[]): void {
    const now = Date.now();
    for (const key of keys) {
      const recent = this.recent(key, now);
      const limit = LIMITS[key.split(':')[0] as KeyKind];
      if (recent.length >= limit) {
        const retryAfter = Math.ceil((recent[0]! + WINDOW_MS - now) / 1000);
        throw new HttpException(
          { code: 'rate_limited', message: 'Too many attempts. Wait a few minutes and try again.', retryAfterSeconds: retryAfter },
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }
    }
  }

  recordFailure(keys: string[]): void {
    const now = Date.now();
    for (const key of keys) this.failures.set(key, [...this.recent(key, now), now]);
    if (this.failures.size > 5000) this.prune(now);
  }

  reset(keys: string[]): void {
    for (const key of keys) this.failures.delete(key);
  }

  private recent(key: string, now: number): number[] {
    return (this.failures.get(key) ?? []).filter((at) => now - at < WINDOW_MS);
  }

  private prune(now: number): void {
    for (const [key, attempts] of this.failures) {
      if (attempts.every((at) => now - at >= WINDOW_MS)) this.failures.delete(key);
    }
  }
}
