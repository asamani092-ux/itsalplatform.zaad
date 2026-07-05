import type { Metadata } from "next";
import ManagerApprovalView from "@/components/approve/ManagerApprovalView";

export const metadata: Metadata = {
  title: "موافقة المدير — منصة الاتصال المؤسسي",
  description: "موافقة المدير المباشر على طلب التواصل — بدون تسجيل دخول",
};

export default async function ApprovePage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  return <ManagerApprovalView token={token ?? null} />;
}
