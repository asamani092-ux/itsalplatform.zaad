import type { ReactNode } from "react";

export default function FilterBar({
  children,
  onClear,
  clearLabel = "مسح الكل",
}: {
  children: ReactNode;
  onClear?: () => void;
  clearLabel?: string;
}) {
  return (
    <div className="zad-filter-bar" role="search">
      {children}
      {onClear && (
        <button type="button" className="btn-secondary text-xs" onClick={onClear}>
          {clearLabel}
        </button>
      )}
    </div>
  );
}
