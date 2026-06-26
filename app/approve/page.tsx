import type { Metadata } from "next";
import { Suspense } from "react";
import ManagerApprovalView from "@/components/approve/ManagerApprovalView";

export const metadata: Metadata = {
  title: "موافقة المدير — منصة الاتصال المؤسسي",
  description: "موافقة المدير المباشر على طلب التواصل — بدون تسجيل دخول",
};

function ApprovalLoading() {
  return (
    <div className="page-shell flex min-h-screen items-center justify-center">
      <p className="text-sm text-brand-gray">جاري التحميل...</p>
    </div>
  );
}

export default function ApprovePage() {
  return (
    <Suspense fallback={<ApprovalLoading />}>
      <ManagerApprovalView />
    </Suspense>
  );
}
