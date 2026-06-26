"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { getApiErrorMessage, parseApiResponse } from "@/components/lib/api-types";

export default function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next");

  const [phoneNumber, setPhoneNumber] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phoneNumber, password }),
      });
      const payload = await parseApiResponse<{
        user: { role: string };
      }>(res);

      if (!res.ok || !payload.success) {
        setError(getApiErrorMessage(payload, "فشل تسجيل الدخول"));
        return;
      }

      const role = payload.data.user.role;
      const dest =
        next ??
        (role === "MANAGER" ? "/manager" : "/employee");
      router.push(dest);
      router.refresh();
    } catch {
      setError("حدث خطأ في الاتصال");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page-shell flex min-h-screen items-center justify-center">
      <form onSubmit={(e) => void handleSubmit(e)} className="card w-full max-w-md space-y-4">
        <div className="text-center">
          <h1 className="text-xl font-bold text-primary">تسجيل الدخول</h1>
          <p className="text-xs text-brand-gray">قسم الاتصال المؤسسي — جمعية الزاد</p>
        </div>

        <Input
          id="phone"
          label="رقم الهاتف"
          dir="ltr"
          value={phoneNumber}
          onChange={(e) => setPhoneNumber(e.target.value)}
          placeholder="05xxxxxxxx"
          required
        />
        <Input
          id="password"
          label="كلمة المرور"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        {error && (
          <p className="text-sm font-semibold text-[var(--zaad-danger)]" role="alert">
            {error}
          </p>
        )}

        <Button
          type="submit"
          className="w-full py-3"
          disabled={loading}
        >
          {loading ? "جاري الدخول..." : "دخول"}
        </Button>

        <p className="text-center text-xs text-brand-gray">
          <Link href="/" className="underline">
            العودة للرئيسية
          </Link>
        </p>
      </form>
    </div>
  );
}
