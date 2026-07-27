export function formatRelativeTimeAr(input: Date | string): string {
  const date = typeof input === "string" ? new Date(input) : input;
  const diffMs = Date.now() - date.getTime();
  if (Number.isNaN(diffMs)) return "—";

  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return "الآن";
  if (minutes < 60) return `منذ ${minutes} دقيقة`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `منذ ${hours} ساعة`;

  const days = Math.floor(hours / 24);
  if (days === 1) return "أمس";
  return `منذ ${days} يوم`;
}
