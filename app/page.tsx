import Link from "next/link";
import { getFormSettings } from "@/lib/form-settings/server";
import { getEnabledModules } from "@/lib/modules/server";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [settings, modules] = await Promise.all([
    getFormSettings(),
    getEnabledModules(),
  ]);

  const publicServices = modules.filter((m) => {
    if (!m.publicHref) return false;
    if (m.key === "request-form") return settings.isPublished;
    return true;
  });

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-muted p-4 sm:p-6">
      <main className="w-full max-w-2xl space-y-6">
        <div className="text-center">
          <p className="text-xs text-brand-gray">جمعية الزاد</p>
          <h1 className="mt-1 text-2xl font-extrabold text-primary sm:text-3xl">
            منصة الاتصال المؤسسي
          </h1>
          <p className="mt-2 text-sm text-brand-gray">
            إدارة طلبات الاتصال المؤسسي وخدماته
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Link
            href="/login"
            className="card block border-t-4 border-primary transition-shadow hover:shadow-md focus-visible:ring-2 focus-visible:ring-primary/20"
          >
            <h2 className="text-lg font-bold text-primary">دخول المنصة</h2>
            <p className="mt-2 text-sm text-brand-gray">
              مركز تحكم المدير أو مساحة الموظف
            </p>
          </Link>

          {publicServices.map((service) => (
            <Link
              key={service.key}
              href={service.publicHref ?? "/"}
              className="card block border-t-4 border-secondary transition-shadow hover:shadow-md focus-visible:ring-2 focus-visible:ring-primary/20"
            >
              <h2 className="text-lg font-bold text-primary">
                {service.publicLabel ?? service.label}
              </h2>
              <p className="mt-2 text-sm text-brand-gray">{service.description}</p>
            </Link>
          ))}
        </div>

        {publicServices.length === 0 && (
          <p className="text-center text-sm text-brand-gray">
            لا توجد خدمات عامة منشورة حالياً.
          </p>
        )}

        <p className="text-center text-xs text-brand-gray">
          تحت إشراف المركز الوطني لتنمية القطاع غير الربحي
        </p>
      </main>
    </div>
  );
}
