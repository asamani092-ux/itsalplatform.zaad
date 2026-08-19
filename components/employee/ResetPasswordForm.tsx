"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import BrandLogo from "@/components/shared/brand-logo";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { getApiErrorMessage, parseApiResponse } from "@/components/lib/api-types";
import { fetchWithTimeout } from "@/lib/client/fetch-with-timeout";

export default function ResetPasswordForm({ token }: { token: string | null }) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (password.length < 8) {
      setError("كلمة المرور يجب أن تكون 8 أحرف على الأقل");
      return;
    }
    if (password !== confirm) {
      setError("كلمتا المرور غير متطابقتين");
      return;
    }

    setLoading(true);
    try {
      const res = await fetchWithTimeout("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const payload = await parseApiResponse<{ message: string }>(res);
      if (!res.ok || !payload.success) {
        setError(getApiErrorMessage(payload, "تعذّر تحديث كلمة المرور"));
        return;
      }
      setDone(true);
      window.setTimeout(() => router.push("/"), 2500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "حدث خطأ في الاتصال");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-muted p-6">
      <div className="card w-full max-w-md space-y-4">
        <div className="flex flex-col items-center gap-3 text-center">
          <BrandLogo size="lg" />
          <h1 className="text-xl font-bold text-primary">تعيين كلمة مرور جديدة</h1>
        </div>

        {!token ? (
          <div className="space-y-4 text-center">
            <span className="badge-danger">رابط غير صالح</span>
            <p className="text-sm text-brand-gray">
              لم يُعثر على رمز إعادة التعيين. اطلب رابطاً جديداً.
            </p>
            <Link href="/forgot-password" className="btn-secondary inline-flex">
              طلب رابط جديد
            </Link>
          </div>
        ) : done ? (
          <div className="space-y-4 text-center" role="status">
            <span className="badge-success">تم التحديث</span>
            <p className="text-sm text-brand-gray">
              تم تحديث كلمة المرور. جارٍ تحويلك لتسجيل الدخول...
            </p>
          </div>
        ) : (
          <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
            <Input
              id="password"
              label="كلمة المرور الجديدة"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <Input
              id="confirm"
              label="تأكيد كلمة المرور"
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
            />

            {error && (
              <p className="text-sm font-semibold text-[var(--zaad-danger)]" role="alert">
                {error}
              </p>
            )}

            <Button
              type="submit"
              className="w-full bg-primary py-2.5 text-white"
              disabled={loading}
            >
              {loading ? "جاري الحفظ..." : "حفظ كلمة المرور"}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
