import type { ReactNode } from "react";

export default function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="card space-y-3 py-12 text-center">
      <p className="text-lg font-bold text-primary">{title}</p>
      {description && <p className="text-sm text-brand-gray">{description}</p>}
      {action}
    </div>
  );
}
