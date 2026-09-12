export default function Progress({
  value,
  label,
}: {
  value: number;
  label?: string;
}) {
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <div className="space-y-1">
      {label && (
        <p className="text-xs text-brand-gray">
          {label}: {clamped}%
        </p>
      )}
      <div
        className="zad-progress"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={clamped}
        aria-label={label ?? "التقدّم"}
      >
        <div className="zad-progress__bar" style={{ width: `${clamped}%` }} />
      </div>
    </div>
  );
}
