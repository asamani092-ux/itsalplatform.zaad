/**
 * Persistent login failure lockouts (10 fails → 20 minutes).
 * Uses raw SQL for both read and write — Prisma Json upsert was not
 * persisting settings updates under the pg adapter in this runtime.
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
  const rows = await prisma.$queryRawUnsafe<Array<{ settings: unknown }>>(
    `SELECT settings FROM "PlatformModule" WHERE key = $1 LIMIT 1`,
    AUTH_LOCKS_KEY,
  );
  let raw: unknown = rows[0]?.settings;
  if (typeof raw === "string") {
    try {
      raw = JSON.parse(raw);
    } catch {
      return {};
    }
  }
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  return { ...(raw as LockMap) };
}

async function writeLocks(locks: LockMap): Promise<void> {
  const payload = JSON.stringify(locks);
  await prisma.$executeRawUnsafe(
    `
    INSERT INTO "PlatformModule" (id, key, "isEnabled", "sortOrder", settings, "createdAt", "updatedAt")
    VALUES ($1, $2, true, 999, $3::jsonb, NOW(), NOW())
    ON CONFLICT (key) DO UPDATE SET
      settings = EXCLUDED.settings,
      "updatedAt" = NOW()
    `,
    `pm_${AUTH_LOCKS_KEY}`,
    AUTH_LOCKS_KEY,
    payload,
  );
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
