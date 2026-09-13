/** Shared hall name helpers — safe for client and server. */

export const DEFAULT_ROOMS = [
  "قاعة الحسني",
  "قاعة الضبيب",
  "قاعة الاجتماعات الكبرى",
  "قاعة التدريب",
  "قاعة الاستقبال",
  "قاعة الوسائط",
];

/** Legacy short labels that must map to a canonical room for availability matching. */
export const ROOM_ALIASES: Record<string, string> = {
  "قاعة الاجتماعات": "قاعة الاجتماعات الكبرى",
  "قاعة اجتماعات": "قاعة الاجتماعات الكبرى",
  "قاعة الوسائط المتعددة": "قاعة الوسائط",
};

export function canonicalizeRoomName(roomName: string): string {
  const trimmed = roomName.trim();
  return ROOM_ALIASES[trimmed] ?? trimmed;
}

/** All DB labels that should match a selected room (canonical + legacy aliases). */
export function roomNameMatchVariants(roomName: string): string[] {
  const canonical = canonicalizeRoomName(roomName);
  const aliases = Object.entries(ROOM_ALIASES)
    .filter(([, to]) => to === canonical)
    .map(([from]) => from);
  return Array.from(new Set([roomName.trim(), canonical, ...aliases].filter(Boolean)));
}

/**
 * Detect hall renames when the configured list changes.
 * Time O(n), Space O(n): pair removed names with added names by order of appearance.
 */
export function detectRoomRenames(
  previousRooms: string[],
  nextRooms: string[],
): Array<{ from: string; to: string }> {
  const prev = previousRooms.map(canonicalizeRoomName).filter(Boolean);
  const next = nextRooms.map(canonicalizeRoomName).filter(Boolean);
  const prevSet = new Set(prev);
  const nextSet = new Set(next);
  const removed = prev.filter((r) => !nextSet.has(r));
  const added = next.filter((r) => !prevSet.has(r));
  const count = Math.min(removed.length, added.length);
  const renames: Array<{ from: string; to: string }> = [];
  for (let i = 0; i < count; i += 1) {
    if (removed[i] !== added[i]) {
      renames.push({ from: removed[i], to: added[i] });
    }
  }
  return renames;
}
