/**
 * Slug helpers for admin-facing entities.
 * Time: O(n) over input length. Space: O(n) for the output string.
 */

import { createHash } from "node:crypto";

/** Latin-safe slug: lowercase, hyphenated, max 40 chars. */
export function normalizeSlug(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

/**
 * Build a stable technical slug from a display name.
 * Arabic (or other non-Latin) names fall back to adm-<hash> so the field
 * never needs to be typed by the manager.
 */
export function slugFromDisplayName(name: string, prefix = "adm"): string {
  const fromLatin = normalizeSlug(name);
  if (fromLatin.length >= 2) return fromLatin;
  const hash = createHash("sha1").update(name.trim()).digest("hex").slice(0, 10);
  return `${prefix}-${hash}`;
}
