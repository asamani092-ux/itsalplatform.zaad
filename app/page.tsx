import Link from "next/link";
import { getFormSettings } from "@/lib/form-settings/server";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const settings = await getFormSettings();

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-muted p-4 sm:p-6">
      <main className="w-full max-w-2xl space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-extrabold text-primary sm:text-3xl">
            {settings.pageTitle}
          </h1>
          <p className="mt-2 text-sm text-brand-gray">منصة قسم الاتصال المؤسسي</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Link
            href="/request"
            className="card block border-t-4 border-primary transition-shadow hover:shadow-md focus-visible:ring-2 focus-visible:ring-primary/20"
          >
            <h2 className="text-lg font-bold text-primary">تقديم طلب</h2>
            <p className="mt-2 text-sm text-brand-gray">
              نموذج عام — لا يتطلب تسجيل دخول
            </p>
          </Link>

          <Link
            href="/login"
            className="card block border-t-4 border-secondary transition-shadow hover:shadow-md focus-visible:ring-2 focus-visible:ring-primary/20"
          >
            <h2 className="text-lg font-bold text-primary">دخول المنصة</h2>
            <p className="mt-2 text-sm text-brand-gray">
              مركز تحكم المدير أو مساحة الموظف
            </p>
          </Link>
        </div>

        <p className="text-center text-xs text-brand-gray">
          تحت إشراف المركز الوطني لتنمية القطاع غير الربحي
        </p>
      </main>
    </div>
  );
}
