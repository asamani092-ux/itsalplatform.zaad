import Link from "next/link";

export default function ModuleDisabled({ label }: { label: string }) {
  return (
    <div className="card space-y-3 py-12 text-center">
      <span className="badge-warning">أداة غير مفعّلة</span>
      <p className="text-sm text-brand-gray">
        «{label}» غير مفعّلة حالياً في هذه المنصة.
      </p>
      <Link href="/dashboard/settings?section=modules" className="btn-secondary inline-flex">
        إدارة الخدمات والأدوات
      </Link>
    </div>
  );
}
