import Link from "next/link";

const PORTAL_LINKS = [
  {
    href: "/submit/communications",
    title: "تقديم طلب",
    desc: "نموذج ديناميكي حسب القسم ونوع الطلب",
    accent: "border-primary",
  },
  {
    href: "/login",
    title: "تسجيل الدخول",
    desc: "مساحة الموظف أو مركز تحكم المدير",
    accent: "border-secondary",
  },
  {
    href: "/manager/kanban",
    title: "لوحة Kanban",
    desc: "للمدير بعد الدخول — إسناد ومتابعة SLA",
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
          <p className="text-sm text-brand-gray">جمعية الزاد</p>
        </div>

        <div className="mb-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
            <h2 className="text-lg font-bold text-primary">الاستقبال</h2>
            <p className="mt-2 text-xs text-brand-gray">
              <code dir="ltr" className="text-[11px]">
                /reception/reception-demo-token
              </code>
            </p>
          </div>
        </div>

        <div className="card-section space-y-2 text-sm text-brand-gray">
          <p>
            حساب تجريبي للمدير: <code dir="ltr">0500000001</code> /{" "}
            <code>password123</code>
          </p>
          <p>
            حساب موظف: <code dir="ltr">0500000002</code> / <code>password123</code>
          </p>
        </div>
      </main>
    </div>
  );
}
