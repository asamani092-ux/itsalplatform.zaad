export function formatDurationMs(ms: number | null): string {
  if (ms === null || ms < 0) return "—";

  const minutes = Math.floor(ms / 60_000);
  if (minutes < 60) return `${minutes} د`;

  const hours = Math.floor(minutes / 60);
  const remMin = minutes % 60;
  if (hours < 24) return remMin > 0 ? `${hours} س ${remMin} د` : `${hours} س`;

  const days = Math.floor(hours / 24);
  const remHours = hours % 24;
  return remHours > 0 ? `${days} ي ${remHours} س` : `${days} ي`;
}

export function formatElapsedSince(iso: string | null): string {
  if (!iso) return "—";
  return formatDurationMs(Date.now() - new Date(iso).getTime());
}
