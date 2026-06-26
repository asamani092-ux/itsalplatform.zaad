const KPI_STATS = [
  { label: "طلبات نشطة", value: "12" },
  { label: "بانتظار الموافقة", value: "3" },
  { label: "قيد التنفيذ", value: "7" },
  { label: "مكتملة هذا الشهر", value: "24" },
];

const REQUESTS = [
  {
    title: "تصميم بوستر فعالية التمكين",
    requester: "أحمد محمد",
    status: "قيد التنفيذ",
    badge: "badge-primary" as const,
    date: "2026-06-20",
  },
  {
    title: "تغطية إعلامية — ورشة عمل",
    requester: "سارة علي",
    status: "بانتظار الموافقة",
    badge: "badge-warning" as const,
    date: "2026-06-22",
  },
  {
    title: "نشر خبر على المنصات",
    requester: "خالد العتيبي",
    status: "مكتمل",
    badge: "badge-success" as const,
    date: "2026-06-18",
  },
];

const DOCUMENTS = [
  { title: "دليل الهوية البصرية", category: "هوية", status: "متاح" },
  { title: "قالب بيان صحفي", category: "قوالب", status: "متاح" },
  { title: "سياسة النشر الإعلامي", category: "سياسات", status: "متاح" },
];

export default function PrototypePage() {
  return (
    <div className="page-shell">
      <header className="border-b border-surface-border bg-surface shadow-sm">
        <div className="mx-auto flex max-w-page items-center justify-between px-4 py-3">
          <strong className="text-xl font-bold text-primary">
            جمعية الزاد — الاتصال المؤسسي
          </strong>
          <nav className="flex gap-2">
            <button type="button" className="btn-primary text-sm">
              تقديم طلب
            </button>
            <button type="button" className="btn-secondary text-sm">
              لوحة التحكم
            </button>
          </nav>
        </div>
      </header>

      <main className="page-container space-y-8">
        <section>
          <h1 className="text-3xl font-extrabold text-primary">
            نموذج أولي — منصة الاتصال المؤسسي
          </h1>
          <p className="mt-2 text-sm text-brand-gray">
            معاينة بصرية للفكرة باستخدام نظام تصميم الزاد. لا يوجد backend أو
            قاعدة بيانات — للعرض والتصميم فقط.
          </p>
        </section>

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {KPI_STATS.map((stat) => (
            <div key={stat.label} className="card text-center">
              <p className="text-2xl font-bold text-primary">{stat.value}</p>
              <p className="mt-1 text-sm text-brand-gray">{stat.label}</p>
            </div>
          ))}
        </section>

        <section className="card space-y-4">
          <h2 className="text-xl font-bold text-primary">تقديم طلب تواصل</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="label-field" htmlFor="title">
                عنوان الطلب
              </label>
              <input
                id="title"
                type="text"
                className="input-field"
                placeholder="مثال: تصميم بوستر فعالية"
              />
            </div>
            <div>
              <label className="label-field" htmlFor="required-date">
                التاريخ المطلوب
              </label>
              <input
                id="required-date"
                type="date"
                className="input-field"
                dir="ltr"
              />
            </div>
            <div className="md:col-span-2">
              <label className="label-field" htmlFor="description">
                وصف الطلب
              </label>
              <textarea
                id="description"
                className="input-field min-h-24 resize-y"
                placeholder="اشرح احتياجك بالتفصيل..."
              />
            </div>
            <div>
              <label className="label-field" htmlFor="email">
                البريد الإلكتروني
              </label>
              <input
                id="email"
                type="email"
                className="input-field"
                dir="ltr"
                placeholder="user@example.com"
              />
            </div>
            <div>
              <label className="label-field" htmlFor="phone">
                الجوال
              </label>
              <input
                id="phone"
                type="tel"
                className="input-field"
                dir="ltr"
                placeholder="+966500000000"
              />
            </div>
          </div>
          <div className="flex flex-wrap gap-3 pt-2">
            <button type="button" className="btn-primary">
              إرسال الطلب
            </button>
            <button type="button" className="btn-secondary">
              إلغاء
            </button>
          </div>
        </section>

        <section className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xl font-bold text-primary">لوحة الطلبات</h2>
            <div className="tab-bar max-w-md">
              <button type="button" className="active" data-active="true">
                نشطة
              </button>
              <button type="button">مكتملة</button>
              <button type="button">الأرشيف</button>
            </div>
          </div>
          <div className="card overflow-x-auto p-0">
            <table className="zaad-table">
              <thead>
                <tr>
                  <th>الطلب</th>
                  <th>مقدّم الطلب</th>
                  <th>التاريخ</th>
                  <th>الحالة</th>
                  <th>إجراء</th>
                </tr>
              </thead>
              <tbody>
                {REQUESTS.map((req) => (
                  <tr key={req.title}>
                    <td className="font-semibold text-primary">{req.title}</td>
                    <td>{req.requester}</td>
                    <td dir="ltr">{req.date}</td>
                    <td>
                      <span className={req.badge}>{req.status}</span>
                    </td>
                    <td>
                      <button type="button" className="btn-recommend text-xs">
                        عرض
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <div className="card-section space-y-4">
            <h2 className="text-lg font-bold text-primary">حجز قاعة</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="label-field" htmlFor="room">
                  القاعة
                </label>
                <select id="room" className="input-field">
                  <option>قاعة الاجتماعات أ</option>
                  <option>قاعة الاجتماعات ب</option>
                </select>
              </div>
              <div>
                <label className="label-field" htmlFor="attendees">
                  عدد الحضور
                </label>
                <input
                  id="attendees"
                  type="number"
                  className="input-field"
                  placeholder="20"
                />
              </div>
            </div>
            <button type="button" className="btn-register">
              حجز القاعة
            </button>
          </div>

          <div className="card space-y-4">
            <h2 className="text-lg font-bold text-primary">مركز الوثائق</h2>
            <ul className="space-y-3">
              {DOCUMENTS.map((doc) => (
                <li
                  key={doc.title}
                  className="flex items-center justify-between border-b border-surface-border pb-3 last:border-0"
                >
                  <div>
                    <p className="font-semibold text-primary">{doc.title}</p>
                    <p className="text-xs text-brand-gray">{doc.category}</p>
                  </div>
                  <span className="badge-success">{doc.status}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="card space-y-4">
          <h2 className="text-lg font-bold text-primary">مكوّنات النظام</h2>
          <div className="flex flex-wrap gap-3">
            <button type="button" className="btn-primary">
              أساسي
            </button>
            <button type="button" className="btn-secondary">
              ثانوي
            </button>
            <button type="button" className="btn-recommend">
              توصية
            </button>
            <button type="button" className="btn-register">
              تسجيل
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="badge-primary">نشط</span>
            <span className="badge-warning">معلّق</span>
            <span className="badge-danger">مرفوض</span>
            <span className="badge-success">مكتمل ✓</span>
          </div>
        </section>
      </main>

      <footer className="border-t border-surface-border bg-surface py-4 text-center text-xs text-brand-gray">
        نظام تصميم الزاد — نموذج أولي للاستخدام الداخلي
      </footer>
    </div>
  );
}
