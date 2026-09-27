/**
 * Token bucket per key (a socket id): `capacity` events in a burst, refilled
 * at `refillPerSecond`. Enough to stop a script flooding the game loop; a
 * person clicking or pressing keys never gets near it.
 */
export class SocketRateLimiter {
  private readonly buckets = new Map<string, { tokens: number; updatedAt: number }>();

  constructor(
    private readonly capacity: number,
    private readonly refillPerSecond: number,
  ) {}

  allow(key: string, now: number = Date.now()): boolean {
    const bucket = this.buckets.get(key) ?? { tokens: this.capacity, updatedAt: now };
    bucket.tokens = Math.min(this.capacity, bucket.tokens + ((now - bucket.updatedAt) / 1000) * this.refillPerSecond);
    bucket.updatedAt = now;
    this.buckets.set(key, bucket);
    if (bucket.tokens < 1) return false;
    bucket.tokens -= 1;
    return true;
  }

  forget(key: string): void {
    this.buckets.delete(key);
  }
}
