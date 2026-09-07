/**
 * Sliding-window rate limiter + failure lockouts.
 * Auth lock state is file-backed so it survives Next.js route-module isolation.
 * Burst rate limits stay in-memory (best-effort for single instance).
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

interface WindowEntry {
  timestamps: number[];
}

interface LockEntry {
  failures: number;
  lockedUntil: number;
}

const globalStore = globalThis as typeof globalThis & {
  __zaadRateLimitStore?: Map<string, WindowEntry>;
};

const store =
  globalStore.__zaadRateLimitStore ??
  (globalStore.__zaadRateLimitStore = new Map<string, WindowEntry>());

const LOCK_FILE = join(process.cwd(), ".data", "auth-locks.json");

function readLocks(): Record<string, LockEntry> {
  try {
    if (!existsSync(LOCK_FILE)) return {};
    const raw = readFileSync(LOCK_FILE, "utf8");
    const parsed = JSON.parse(raw) as Record<string, LockEntry>;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeLocks(data: Record<string, LockEntry>): void {
  try {
    mkdirSync(dirname(LOCK_FILE), { recursive: true });
    writeFileSync(LOCK_FILE, JSON.stringify(data), "utf8");
  } catch {
    // best-effort; lockout degrades open if disk fails
  }
}

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
  const locks = readLocks();
  const entry = locks[key];
  if (!entry) return 0;
  const remaining = entry.lockedUntil - Date.now();
  if (remaining <= 0) {
    delete locks[key];
    writeLocks(locks);
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
  const locks = readLocks();
  const existing = locks[key];
  if (existing && existing.lockedUntil > now) {
    return { locked: true, retryAfterMs: existing.lockedUntil - now };
  }

  const expiredLock = Boolean(
    existing && existing.lockedUntil > 0 && existing.lockedUntil <= now,
  );
  const failures = (expiredLock ? 0 : existing?.failures ?? 0) + 1;
  if (failures >= maxFailures) {
    locks[key] = { failures: 0, lockedUntil: now + lockMs };
    writeLocks(locks);
    return { locked: true, retryAfterMs: lockMs };
  }
  locks[key] = { failures, lockedUntil: 0 };
  writeLocks(locks);
  return { locked: false };
}

export function clearAuthFailures(key: string): void {
  const locks = readLocks();
  if (!(key in locks)) return;
  delete locks[key];
  writeLocks(locks);
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
