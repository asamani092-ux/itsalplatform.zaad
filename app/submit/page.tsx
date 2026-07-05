import type { Metadata } from "next";
import Link from "next/link";
import SubmitRequestForm from "@/components/forms/SubmitRequestForm";

export const metadata: Metadata = {
  title: "تقديم طلب — منصة الاتصال المؤسسي",
  description: "نموذج تقديم طلب تواصل لموظفي جمعية الزاد",
};

export default function SubmitPage() {
  return (
    <div className="page-shell">
      <header className="border-b border-surface-border bg-surface shadow-sm">
        <div className="mx-auto flex max-w-page items-center justify-between px-4 py-3">
          <Link href="/" className="text-lg font-bold text-primary">
            جمعية الزاد — الاتصال المؤسسي
          </Link>
          <span className="badge-primary text-xs">تقديم طلب</span>
        </div>
      </header>

      <main className="page-container-narrow py-10">
        <div className="mb-6 space-y-2 text-center">
          <h1 className="text-2xl font-extrabold text-primary">
            طلب خدمة تواصل مؤسسي
          </h1>
          <p className="text-sm text-brand-gray">
            قدّم طلبك وسيتم إشعار مديرك المباشر للموافقة عليه.
          </p>
        </div>

        <SubmitRequestForm />
      </main>
    </div>
  );
}
