/**
 * Format stored 24h "HH:MM" / "HH:MM:SS" as Arabic 12-hour clock (ص/م).
 * Storage and APIs stay 24h; display only.
 */
export function formatTime12h(hhmm: string): string {
  const match = /^(\d{1,2}):(\d{2})/.exec(hhmm.trim());
  if (!match) return hhmm;
  let hours = Number(match[1]);
  const minutes = match[2];
  if (!Number.isFinite(hours) || hours < 0 || hours > 23) return hhmm;
  const suffix = hours >= 12 ? "م" : "ص";
  hours = hours % 12;
  if (hours === 0) hours = 12;
  return `${hours}:${minutes} ${suffix}`;
}

export function formatTimeRange12h(start: string, end: string, sep = " — "): string {
  return `${formatTime12h(start)}${sep}${formatTime12h(end)}`;
}
