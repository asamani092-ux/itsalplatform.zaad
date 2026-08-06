export default function Chip({
  label,
  active = false,
  onClick,
  onRemove,
}: {
  label: string;
  active?: boolean;
  onClick?: () => void;
  onRemove?: () => void;
}) {
  if (onClick) {
    return (
      <button
        type="button"
        className="zad-chip"
        data-active={active ? "true" : "false"}
        onClick={onClick}
      >
        {label}
      </button>
    );
  }

  return (
    <span className="zad-chip" data-active={active ? "true" : "false"}>
      {label}
      {onRemove && (
        <button
          type="button"
          className="zad-chip__remove"
          aria-label={`إزالة ${label}`}
          onClick={onRemove}
        >
          ×
        </button>
      )}
    </span>
  );
}
