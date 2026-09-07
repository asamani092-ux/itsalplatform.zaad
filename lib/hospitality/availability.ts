/**
 * Pure, client-safe slot computation for hall booking. No prisma imports here
 * so this module can be used from both server routes and client components.
 */

export interface BookedRange {
  start: string;
  end: string;
}

export interface AvailableSlot {
  startTime: string;
  endTime: string;
}

/** Convert "HH:MM" or "HH:MM:SS" to minutes since midnight. Returns -1 on invalid input. */
export function timeToMinutes(time: string): number {
  const match = /^(\d{1,2}):(\d{2})/.exec(time);
  if (!match) return -1;
  const h = Number(match[1]);
  const m = Number(match[2]);
  if (Number.isNaN(h) || Number.isNaN(m) || h < 0 || h > 23 || m < 0 || m > 59) return -1;
  return h * 60 + m;
}

/** Convert minutes since midnight back to "HH:MM". */
export function minutesToTime(minutes: number): string {
  const clamped = Math.max(0, Math.min(24 * 60, minutes));
  const h = Math.floor(clamped / 60);
  const m = clamped % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

const MIN_DURATION_HOURS = 1;
const MAX_DURATION_HOURS = 5;

function rangesOverlap(
  aStart: number,
  aEnd: number,
  bStart: number,
  bEnd: number,
): boolean {
  return aStart < bEnd && bStart < aEnd;
}

/**
 * Computes non-overlapping candidate windows of `durationHours` length within
 * the workday [dayStart, dayEnd) that do not overlap any booked range.
 *
 * Step is the requested duration itself, so slots are contiguous non-overlapping
 * candidate windows (e.g. an 8-16 day with a 2h duration yields 08-10, 10-12, 12-14, 14-16).
 */
export function computeAvailableSlots(params: {
  dayStart: string;
  dayEnd: string;
  durationHours: number;
  booked: BookedRange[];
}): AvailableSlot[] {
  const durationHours = Math.max(
    MIN_DURATION_HOURS,
    Math.min(MAX_DURATION_HOURS, Math.round(params.durationHours)),
  );
  const durationMinutes = durationHours * 60;

  const dayStartMin = timeToMinutes(params.dayStart);
  const dayEndMin = timeToMinutes(params.dayEnd);
  if (dayStartMin < 0 || dayEndMin < 0 || dayStartMin >= dayEndMin) return [];

  const bookedRanges = params.booked
    .map((b) => ({ start: timeToMinutes(b.start), end: timeToMinutes(b.end) }))
    .filter((b) => b.start >= 0 && b.end >= 0 && b.end > b.start);

  const slots: AvailableSlot[] = [];
  for (
    let cursor = dayStartMin;
    cursor + durationMinutes <= dayEndMin;
    cursor += durationMinutes
  ) {
    const slotStart = cursor;
    const slotEnd = cursor + durationMinutes;
    const conflicts = bookedRanges.some((b) =>
      rangesOverlap(slotStart, slotEnd, b.start, b.end),
    );
    if (!conflicts) {
      slots.push({
        startTime: minutesToTime(slotStart),
        endTime: minutesToTime(slotEnd),
      });
    }
  }

  return slots;
}
