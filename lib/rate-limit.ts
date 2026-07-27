/**
 * In-memory sliding-window rate limiter keyed by IP + route.
 * Suitable for single-instance deployments; replace with Redis for multi-instance.
 */

interface WindowEntry {
  timestamps: number[];
}

const store = new Map<string, WindowEntry>();

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

export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0]?.trim() || "unknown";
  }
  return request.headers.get("x-real-ip") ?? "unknown";
}

export function rateLimitKey(request: Request, route: string): string {
  return `${getClientIp(request)}:${route}`;
}
