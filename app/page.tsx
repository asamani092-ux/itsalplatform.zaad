import Link from "next/link";

const PORTAL_LINKS = [
  {
    href: "/submit",
    title: "تقديم طلب",
    desc: "نموذج للموظفين — يُرسل رابط موافقة للمدير",
    accent: "border-primary",
  },
  {
    href: "/dashboard",
    title: "لوحة التحكم",
    desc: "Kanban — إسناد الطلبات ومتابعة SLA",
    accent: "border-secondary",
  },
] as const;

export default function HomePage() {
  return (
    <div className="page-shell min-h-screen">
      <main className="page-container py-12">
        <div className="mb-10 space-y-3 text-center">
          <h1 className="text-3xl font-extrabold text-primary">
            منصة قسم الاتصال المؤسسي
          </h1>
          <p className="text-sm text-brand-gray">جمعية الزاد — الواجهات جاهزة</p>
        </div>

        <div className="mb-10 grid gap-4 sm:grid-cols-2">
          {PORTAL_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`card block border-t-4 ${link.accent} transition-shadow hover:shadow-md`}
            >
              <h2 className="text-lg font-bold text-primary">{link.title}</h2>
              <p className="mt-2 text-xs text-brand-gray">{link.desc}</p>
            </Link>
          ))}
          <div className="card border-t-4 border-surface-border">
            <h2 className="text-lg font-bold text-primary">موافقة المدير</h2>
            <p className="mt-2 text-xs text-brand-gray">
              يفتح عبر الرابط من البريد — مثال:{" "}
              <code dir="ltr" className="text-[11px]">/approve?token=xyz</code>
            </p>
          </div>
        </div>

        <div className="card-section space-y-3 text-sm text-brand-gray">
          <h2 className="text-lg font-bold text-primary">كيف تظهر البطاقات في اللوحة؟</h2>
          <ol className="list-decimal space-y-2 ps-5">
            <li>
              قدّم طلباً من{" "}
              <Link href="/submit" className="font-semibold text-primary underline">
                /submit
              </Link>
            </li>
            <li>
              يوافق المدير عبر{" "}
              <code dir="ltr" className="text-xs">/approve?token=...</code>
            </li>
            <li>
              بعد الموافقة يظهر الطلب في{" "}
              <Link href="/dashboard" className="font-semibold text-primary underline">
                /dashboard
              </Link>
            </li>
          </ol>
        </div>
      </main>
    </div>
  );
}
