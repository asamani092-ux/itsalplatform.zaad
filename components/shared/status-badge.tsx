const STATUS_STYLES: Record<string, string> = {
  Pending_Manager: "badge-warning",
  Approved_Pending_Assignment: "badge-primary",
  In_Progress: "badge-primary",
  Completed: "badge-success",
  Archived: "badge-warning",
};

const STATUS_LABELS: Record<string, string> = {
  Pending_Manager: "بانتظار المدير",
  Approved_Pending_Assignment: "معتمد — بانتظار الإسناد",
  In_Progress: "قيد التنفيذ",
  Completed: "مكتمل",
  Archived: "مؤرشف",
};

export default function StatusBadge({ status }: { status: string }) {
  return (
    <span className={STATUS_STYLES[status] ?? "badge-primary"}>
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}
