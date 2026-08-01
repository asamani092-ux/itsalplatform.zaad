import type { Metadata } from "next";
import ForgotPasswordForm from "@/components/employee/ForgotPasswordForm";

export const metadata: Metadata = {
  title: "استعادة كلمة المرور — منصة الاتصال المؤسسي",
};

export default function ForgotPasswordPage() {
  return <ForgotPasswordForm />;
}
