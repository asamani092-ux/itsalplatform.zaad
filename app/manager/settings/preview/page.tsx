import DynamicSubmitForm from "@/components/public/DynamicSubmitForm";
import Link from "next/link";

export default function SettingsPreviewPage() {
  return (
    <main className="page-container space-y-6 py-8">
      <div>
        <Link href="/manager/settings" className="text-xs text-brand-gray underline">
          ← الإعدادات
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-primary">معاينة النموذج العام</h1>
        <p className="text-sm text-brand-gray">
          عرض حي لنموذج التقديم كما يراه الموظفون — بناءً على الإعدادات الحالية
        </p>
      </div>
      <DynamicSubmitForm slug="communications" preview />
    </main>
  );
}
