import type { Metadata } from "next";
import ResetPasswordForm from "@/components/employee/ResetPasswordForm";

export const metadata: Metadata = {
  title: "تعيين كلمة مرور جديدة — منصة الاتصال المؤسسي",
};

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  return <ResetPasswordForm token={token ?? null} />;
}
