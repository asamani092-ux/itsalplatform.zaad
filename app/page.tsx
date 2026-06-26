const API_ENDPOINTS = [
  { method: "POST", path: "/api/requests", desc: "تقديم طلب جديد + إرسال رابط موافقة للمدير" },
  { method: "GET/POST", path: "/api/approve?token=...", desc: "موافقة المدير المباشر (بدون تسجيل دخول)" },
  { method: "GET", path: "/api/dashboard/requests?view=active", desc: "لوحة الطلبات — نشطة" },
  { method: "GET", path: "/api/dashboard/requests?view=archive", desc: "لوحة الطلبات — أرشيف" },
  { method: "GET", path: "/api/dashboard/requests/:id", desc: "تفاصيل طلب + SLA" },
  { method: "POST", path: "/api/dashboard/requests/:id/assign", desc: "إسناد لموظف" },
  { method: "POST", path: "/api/dashboard/requests/:id/reassign", desc: "إعادة إسناد" },
  { method: "PATCH", path: "/api/dashboard/requests/:id/status", desc: "إكمال / أرشفة" },
  { method: "GET/POST", path: "/api/employees", desc: "موظفو قسم الاتصال" },
  { method: "GET/POST", path: "/api/hospitality/bookings", desc: "حجوزات القاعات" },
  { method: "GET/POST", path: "/api/media/documents", desc: "مركز الوثائق الإعلامية" },
];

export default function HomePage() {
  return (
    <main className="page-container mx-auto px-4 py-12">
      <div className="card space-y-6">
        <h1 className="text-2xl font-bold text-primary">
          منصة قسم الاتصال المؤسسي — جمعية الزاد
        </h1>
        <p className="text-sm text-brand-gray">
          Backend API جاهز — الواجهة ستُبنى لاحقاً وفق نظام تصميم الزاد.
        </p>
        <div className="card-section">
          <h2 className="mb-3 text-lg font-bold text-primary">سير العمل</h2>
          <code className="block text-xs text-brand-gray" dir="ltr">
            Pending_Manager → Approved_Pending_Assignment → In_Progress → Completed → Archived
          </code>
        </div>
        <ul className="space-y-2 text-sm">
          {API_ENDPOINTS.map((ep) => (
            <li key={ep.path} className="flex flex-wrap gap-2">
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
