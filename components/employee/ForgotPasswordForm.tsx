"use client";

import { useState } from "react";
import Link from "next/link";
import BrandLogo from "@/components/shared/brand-logo";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { getApiErrorMessage, parseApiResponse } from "@/components/lib/api-types";
import { fetchWithTimeout } from "@/lib/client/fetch-with-timeout";

export default function ForgotPasswordForm() {
  const [phoneNumber, setPhoneNumber] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetchWithTimeout("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phoneNumber }),
      });
      const payload = await parseApiResponse<{ message: string }>(res);
      if (!res.ok || !payload.success) {
        setError(getApiErrorMessage(payload, "تعذّر إرسال الرابط"));
        return;
      }
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "حدث خطأ في الاتصال");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-muted p-6">
      <div className="w-full max-w-md space-y-4 rounded-lg border border-surface-border bg-surface p-6 shadow-sm">
        <div className="flex flex-col items-center gap-3 text-center">
          <BrandLogo size="lg" />
          <div>
            <h1 className="text-xl font-bold text-primary">استعادة كلمة المرور</h1>
            <p className="text-xs text-brand-gray">
              أدخل رقم هاتفك وسنرسل رابط إعادة التعيين إلى بريد الحساب
            </p>
          </div>
        </div>

        {sent ? (
          <div className="space-y-4 text-center" role="status">
            <span className="badge-success">تم الإرسال</span>
            <p className="text-sm text-brand-gray">
              إذا كان الرقم مسجلاً، فقد أُرسل رابط إعادة التعيين إلى بريد الحساب. الرابط
              صالح لمدة ساعة.
            </p>
            <Link href="/" className="btn-secondary inline-flex">
              العودة لتسجيل الدخول
            </Link>
          </div>
        ) : (
          <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
            <Input
              id="phone"
              label="رقم الهاتف"
              dir="ltr"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder="05xxxxxxxx"
              required
            />

            {error && (
              <p className="text-sm font-semibold text-[var(--tmkeen-danger)]" role="alert">
                {error}
              </p>
            )}

            <Button
              type="submit"
              className="w-full bg-primary py-2.5 text-white"
              disabled={loading}
            >
              {loading ? "جاري الإرسال..." : "إرسال رابط الاستعادة"}
            </Button>

            <p className="text-center text-xs text-brand-gray">
              <Link href="/" className="underline">
                العودة لتسجيل الدخول
              </Link>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
