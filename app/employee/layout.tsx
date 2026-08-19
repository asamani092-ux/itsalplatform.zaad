import EmployeeHeader from "@/components/employee/EmployeeHeader";

export default function EmployeeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div dir="rtl" className="min-h-screen bg-surface-muted">
      <EmployeeHeader />
      <main className="page-container py-6">{children}</main>
    </div>
  );
}
