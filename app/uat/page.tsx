import type { Metadata } from "next";
import Link from "next/link";
import UatEvaluationForm from "@/components/uat/UatEvaluationForm";
import BrandLogo from "@/components/shared/brand-logo";

export const metadata: Metadata = {
  title: "نموذج تقييم الأدوات — منصة الاتصال المؤسسي",
  description: "تقييم أدوات المنصة قبل الإطلاق",
};

export default function UatPage() {
  return (
    <div dir="rtl" className="min-h-screen bg-surface-muted">
      <header className="border-b border-surface-border bg-surface px-4 py-4 sm:px-6">
        <div className="page-container flex flex-wrap items-center justify-between gap-3 py-0">
          <div className="flex items-center gap-3">
            <BrandLogo size="md" withWordmark={false} />
            <div>
              <p className="text-xs text-brand-gray">جمعية الزاد</p>
              <h1 className="text-lg font-bold text-primary">نموذج تقييم الأدوات</h1>
            </div>
          </div>
          <Link href="/" className="btn-secondary text-sm">
            الرئيسية
          </Link>
        </div>
      </header>

      <main className="page-container space-y-6 py-6">
        <div className="card-section text-sm text-brand-gray">
          <p className="font-semibold text-primary">تعليمات</p>
          <p className="mt-1">
            جرّب كل أداة ثم قيّمها من 1 إلى 5 (5 ممتاز · 1 لا يعمل)، وحدّد ما إذا كانت تعمل،
            وأضف ملاحظاتك. عند الانتهاء اضغط «نسخ التقرير» وأرسله لفريق التطوير.
          </p>
        </div>

        <UatEvaluationForm />
      </main>
    </div>
  );
}
