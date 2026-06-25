const API_ENDPOINTS = [
  { method: "POST", path: "/api/requests", desc: "تقديم طلب جديد" },
  { method: "GET", path: "/api/approve?token=...", desc: "موافقة المدير" },
  { method: "GET", path: "/api/dashboard/requests?view=active", desc: "لوحة الطلبات" },
  { method: "GET", path: "/api/employees", desc: "موظفو القسم" },
  { method: "POST", path: "/api/hospitality/bookings", desc: "حجز قاعة" },
  { method: "GET", path: "/api/media/documents", desc: "مركز الوثائق" },
];

export default function HomePage() {
  return (
    <main className="page-container mx-auto px-4 py-12">
      <div className="card space-y-6">
        <h1 className="text-2xl font-bold text-primary">
          منصة قسم الاتصال المؤسسي
        </h1>
        <p className="text-sm text-brand-gray">
          واجهة API جاهزة — لا توجد صفحات واجهة مستخدم بعد.
        </p>
        <ul className="space-y-2 text-sm">
          {API_ENDPOINTS.map((ep) => (
            <li key={ep.path} className="flex gap-2">
              <span className="badge-primary font-mono text-xs">{ep.method}</span>
              <code dir="ltr" className="text-primary">
                {ep.path}
              </code>
              <span className="text-brand-gray">— {ep.desc}</span>
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}
