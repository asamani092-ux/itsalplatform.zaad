import { redirect } from "next/navigation";
import Link from "next/link";
import { formPublicPath } from "@/lib/forms/schema";
import { getDefaultForm } from "@/lib/forms/server";

export const dynamic = "force-dynamic";

export default async function RequestRedirectPage() {
  const form = await getDefaultForm();
  if (form) redirect(formPublicPath(form.slug));

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-muted p-6">
      <div className="w-full max-w-md space-y-4 rounded-lg border border-surface-border bg-surface p-6 text-center shadow-sm">
        <span className="badge-warning">لا توجد نماذج منشورة</span>
        <p className="text-sm text-brand-gray">
          لم يُنشر أي نموذج طلبات بعد. يرجى التواصل مع قسم الاتصال المؤسسي.
        </p>
        <Link href="/" className="btn-secondary inline-flex">
          العودة لبوابة المنصة
        </Link>
      </div>
    </div>
  );
}
