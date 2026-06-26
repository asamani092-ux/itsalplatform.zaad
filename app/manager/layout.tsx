import ManagerSidebar from "@/components/manager/ManagerSidebar";

export default function ManagerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="page-shell flex min-h-screen flex-col lg:flex-row">
      <ManagerSidebar />
      <div className="flex-1">{children}</div>
    </div>
  );
}
