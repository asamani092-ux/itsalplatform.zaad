/** Convert "HH:MM" or "HH:MM:SS" to minutes since midnight. */
export function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map((part) => Number(part));
  if (Number.isNaN(h) || Number.isNaN(m)) return -1;
  return h * 60 + m;
}

export function timesOverlap(
  startA: string,
  endA: string,
  startB: string,
  endB: string,
): boolean {
  const aStart = timeToMinutes(startA);
  const aEnd = timeToMinutes(endA);
  const bStart = timeToMinutes(startB);
  const bEnd = timeToMinutes(endB);
  if ([aStart, aEnd, bStart, bEnd].some((v) => v < 0)) return false;
  return aStart < bEnd && bStart < aEnd;
}

export function sameCalendarDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}
