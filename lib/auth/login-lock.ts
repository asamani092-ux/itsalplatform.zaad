/**
 * Persistent login failure lockouts (10 fails → 20 minutes).
 * Stored in PlatformModule settings so state survives route-module isolation.
 */
import "server-only";

import { prisma } from "@/lib/prisma";

const AUTH_LOCKS_KEY = "auth-locks";

interface LockEntry {
  failures: number;
  lockedUntil: number;
}

type LockMap = Record<string, LockEntry>;

async function readLocks(): Promise<LockMap> {
  const row = await prisma.platformModule.findUnique({
    where: { key: AUTH_LOCKS_KEY },
    select: { settings: true },
  });
  const raw = row?.settings;
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  return raw as unknown as LockMap;
}

async function writeLocks(locks: LockMap): Promise<void> {
  await prisma.platformModule.upsert({
    where: { key: AUTH_LOCKS_KEY },
    update: { settings: locks as object, isEnabled: true },
    create: {
      key: AUTH_LOCKS_KEY,
      isEnabled: true,
      sortOrder: 999,
      settings: locks as object,
    },
  });
}

export async function getLockRemainingMs(key: string): Promise<number> {
  const locks = await readLocks();
  const entry = locks[key];
  if (!entry) return 0;
  const remaining = entry.lockedUntil - Date.now();
  if (remaining <= 0) {
    delete locks[key];
    await writeLocks(locks);
    return 0;
  }
  return remaining;
}

export async function recordAuthFailure(
  key: string,
  maxFailures: number,
  lockMs: number,
): Promise<{ locked: boolean; retryAfterMs?: number; failures: number }> {
  const now = Date.now();
  const locks = await readLocks();
  const existing = locks[key];
  if (existing && existing.lockedUntil > now) {
    return {
      locked: true,
      retryAfterMs: existing.lockedUntil - now,
      failures: maxFailures,
    };
  }

  const expiredLock = Boolean(
    existing && existing.lockedUntil > 0 && existing.lockedUntil <= now,
  );
  const failures = (expiredLock ? 0 : existing?.failures ?? 0) + 1;
  if (failures >= maxFailures) {
    locks[key] = { failures: 0, lockedUntil: now + lockMs };
    await writeLocks(locks);
    return { locked: true, retryAfterMs: lockMs, failures };
  }
  locks[key] = { failures, lockedUntil: 0 };
  await writeLocks(locks);
  return { locked: false, failures };
}

export async function clearAuthFailures(key: string): Promise<void> {
  const locks = await readLocks();
  if (!(key in locks)) return;
  delete locks[key];
  await writeLocks(locks);
}
