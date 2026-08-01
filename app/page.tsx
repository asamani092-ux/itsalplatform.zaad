import Link from "next/link";
import BrandLogo from "@/components/shared/brand-logo";

export const dynamic = "force-dynamic";

export default function HomePage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-muted p-4 sm:p-6">
      <main className="w-full max-w-md space-y-6 text-center">
        <div className="flex flex-col items-center gap-4">
          <BrandLogo size="lg" withWordmark={false} />
          <div>
            <h1 className="text-2xl font-extrabold text-primary">جمعية الزاد</h1>
            <p className="mt-1 text-sm text-brand-gray">منصة الاتصال المؤسسي</p>
          </div>
        </div>

        <div className="rounded-lg border border-surface-border bg-surface p-6 shadow-sm">
          <p className="text-sm text-brand-gray">
            منصة إدارية لقسم الاتصال المؤسسي — الدخول مخصص لمنسوبي الجمعية.
          </p>
          <Link href="/login" className="btn-primary mt-4 w-full justify-center">
            دخول المنصة
          </Link>
        </div>

        <p className="text-xs text-brand-gray">
          تحت إشراف المركز الوطني لتنمية القطاع غير الربحي
        </p>
      </main>
    </div>
  );
}
