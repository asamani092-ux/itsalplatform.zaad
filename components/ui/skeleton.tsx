export default function Skeleton({
  className = "",
  lines = 1,
}: {
  className?: string;
  lines?: number;
}) {
  return (
    <div role="status" aria-live="polite" className={`space-y-2 ${className}`}>
      <span className="sr-only">جارٍ التحميل</span>
      {Array.from({ length: lines }).map((_, i) => (
        <span
          key={i}
          className="zad-skeleton block h-4 w-full"
          style={{ width: i === lines - 1 && lines > 1 ? "70%" : "100%" }}
        />
      ))}
    </div>
  );
}
