import type { UatState } from "./report";
import { UAT_VERSION } from "./checklist";

/** Current browser draft key. */
export const UAT_STORAGE_KEY = `zaad-uat-${UAT_VERSION}`;

/**
 * Older keys kept so a version bump does not hide prior notes.
 * Order: newest legacy first.
 */
export const UAT_LEGACY_STORAGE_KEYS = [
  "zaad-uat-v1.1.0-prelaunch",
  "zaad-uat-v1.0.0-pilot",
  "zaad-uat-v1.0.0-prelaunch",
] as const;

function looksLikeUatState(value: unknown): value is UatState {
  if (!value || typeof value !== "object") return false;
  const obj = value as Record<string, unknown>;
  return typeof obj.results === "object" && obj.results !== null && typeof obj.meta === "object";
}

function hasProgress(state: UatState): boolean {
  if (Object.keys(state.results).length > 0) return true;
  if (state.criticalNotes?.trim()) return true;
  if (state.improvementNotes?.trim()) return true;
  if (state.decision) return true;
  if (state.meta?.evaluator?.trim()) return true;
  return false;
}

function readKey(key: string): UatState | null {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!looksLikeUatState(parsed)) return null;
    return parsed;
  } catch {
    return null;
  }
}

/**
 * Load the current draft, or migrate the newest legacy draft that still has data.
 * Time: O(k) over known keys (+ localStorage length for fallback scan).
 */
export function loadUatDraft(): { state: UatState | null; migratedFrom: string | null } {
  const current = readKey(UAT_STORAGE_KEY);
  if (current && hasProgress(current)) {
    return { state: current, migratedFrom: null };
  }

  for (const key of UAT_LEGACY_STORAGE_KEYS) {
    const legacy = readKey(key);
    if (legacy && hasProgress(legacy)) {
      try {
        window.localStorage.setItem(UAT_STORAGE_KEY, JSON.stringify(legacy));
      } catch {
        // Still return in-memory restore even if write fails.
      }
      return { state: legacy, migratedFrom: key };
    }
  }

  // Last resort: any other zaad-uat-* key with progress.
  try {
    for (let i = 0; i < window.localStorage.length; i += 1) {
      const key = window.localStorage.key(i);
      if (!key || !key.startsWith("zaad-uat-") || key === UAT_STORAGE_KEY) continue;
      if ((UAT_LEGACY_STORAGE_KEYS as readonly string[]).includes(key)) continue;
      const candidate = readKey(key);
      if (candidate && hasProgress(candidate)) {
        try {
          window.localStorage.setItem(UAT_STORAGE_KEY, JSON.stringify(candidate));
        } catch {
          // ignore
        }
        return { state: candidate, migratedFrom: key };
      }
    }
  } catch {
    // localStorage enumeration unavailable
  }

  if (current) return { state: current, migratedFrom: null };
  return { state: null, migratedFrom: null };
}

export function saveUatDraft(state: UatState): void {
  window.localStorage.setItem(UAT_STORAGE_KEY, JSON.stringify(state));
}
