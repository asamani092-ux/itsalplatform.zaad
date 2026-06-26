import type { Metadata } from "next";
import DashboardBoard from "@/components/dashboard/DashboardBoard";

export const metadata: Metadata = {
  title: "لوحة التحكم — منصة الاتصال المؤسسي",
  description: "لوحة قسم الاتصال المؤسسي — إدارة الطلبات وSLA",
};

export default function DashboardPage() {
  return <DashboardBoard />;
}
