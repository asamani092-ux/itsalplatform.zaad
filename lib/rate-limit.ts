/**
 * In-memory sliding-window rate limiter + failure lockouts.
 * Suitable for single-instance deployments; replace with Redis for multi-instance.
 */

interface WindowEntry {
  timestamps: number[];
}

interface LockEntry {
  failures: number;
  lockedUntil: number;
}

const store = new Map<string, WindowEntry>();
const locks = new Map<string, LockEntry>();

export interface RateLimitResult {
  allowed: boolean;
  retryAfterMs?: number;
}

export function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number,
): RateLimitResult {
  const now = Date.now();
  const entry = store.get(key) ?? { timestamps: [] };
  entry.timestamps = entry.timestamps.filter((t) => now - t < windowMs);

  if (entry.timestamps.length >= limit) {
    const oldest = entry.timestamps[0] ?? now;
    return { allowed: false, retryAfterMs: windowMs - (now - oldest) };
  }

  entry.timestamps.push(now);
  store.set(key, entry);
  return { allowed: true };
}

/** Returns remaining lockout ms if locked, else 0. */
export function getLockRemainingMs(key: string): number {
  const entry = locks.get(key);
  if (!entry) return 0;
  const remaining = entry.lockedUntil - Date.now();
  if (remaining <= 0) {
    locks.delete(key);
    return 0;
  }
  return remaining;
}

export function recordAuthFailure(
  key: string,
  maxFailures: number,
  lockMs: number,
): { locked: boolean; retryAfterMs?: number } {
  const now = Date.now();
  const existing = locks.get(key);
  if (existing && existing.lockedUntil > now) {
    return { locked: true, retryAfterMs: existing.lockedUntil - now };
  }

  const failures = (existing && existing.lockedUntil <= now ? 0 : existing?.failures ?? 0) + 1;
  if (failures >= maxFailures) {
    locks.set(key, { failures: 0, lockedUntil: now + lockMs });
    return { locked: true, retryAfterMs: lockMs };
  }
  locks.set(key, { failures, lockedUntil: 0 });
  return { locked: false };
}

export function clearAuthFailures(key: string): void {
  locks.delete(key);
}

export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0]?.trim() || "unknown";
  }
  return request.headers.get("x-real-ip") ?? "unknown";
}

export function rateLimitKey(request: Request, route: string): string {
  return `${route}:${getClientIp(request)}`;
}
