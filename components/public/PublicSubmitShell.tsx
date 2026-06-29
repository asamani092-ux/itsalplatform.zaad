export default function PublicSubmitShell({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-muted p-6">
      <div className="w-full max-w-lg">
        <div className="rounded-lg border border-surface-border bg-surface p-6 shadow-sm">
          <div className="mb-6 text-center">
            <h1 className="text-xl font-bold text-primary">جمعية الزاد</h1>
            <p className="mt-1 text-sm text-brand-gray">تقديم طلب</p>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
