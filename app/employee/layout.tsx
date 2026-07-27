import NotificationBell from "@/components/notifications/NotificationBell";

export default function EmployeeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div dir="rtl" className="min-h-screen bg-surface-muted">
      <header className="flex items-center justify-between border-b border-surface-border bg-surface px-4 py-4 sm:px-6">
        <div>
          <p className="text-xs text-brand-gray">جمعية الزاد</p>
          <h1 className="text-lg font-bold text-primary">مساحة الموظف</h1>
        </div>
        <NotificationBell />
      </header>
      <main className="page-container py-6">{children}</main>
    </div>
  );
}
