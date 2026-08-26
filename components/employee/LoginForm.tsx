"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { getApiErrorMessage, parseApiResponse } from "@/components/lib/api-types";
import { fetchWithTimeout } from "@/lib/client/fetch-with-timeout";
import BrandLogo from "@/components/shared/brand-logo";

export default function LoginForm({ nextUrl }: { nextUrl?: string | null }) {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetchWithTimeout("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, rememberMe }),
      });
      const payload = await parseApiResponse<{
        user: { role: string; deskAccess?: boolean };
      }>(res);

      if (!res.ok || !payload.success) {
        setError(getApiErrorMessage(payload, "فشل تسجيل الدخول"));
        return;
      }

      const { role, deskAccess } = payload.data.user;
      const isManagement = role === "DIRECTOR" || role === "SECTION_MANAGER";
      const dest =
        nextUrl ??
        (isManagement
          ? "/dashboard"
          : deskAccess
            ? "/dashboard/reception"
            : "/employee");
      router.push(dest);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "حدث خطأ في الاتصال");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-surface-muted p-4 sm:p-6">
      <form
        onSubmit={(e) => void handleSubmit(e)}
        className="card w-full max-w-md space-y-4 p-4 sm:p-6"
      >
        <div className="flex flex-col items-center gap-3 text-center">
          <BrandLogo size="lg" />
          <div>
            <h1 className="text-xl font-bold text-primary">تسجيل الدخول</h1>
            <p className="text-xs text-brand-gray">قسم الاتصال المؤسسي</p>
          </div>
        </div>

        <Input
          id="email"
          label="البريد الإلكتروني"
          type="email"
          dir="ltr"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="name@zaad.org"
          required
        />
        <Input
          id="password"
          label="كلمة المرور"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        <div className="flex flex-wrap items-center justify-between gap-2">
          <label
            className="zad-touch inline-flex cursor-pointer items-center gap-2 text-sm text-brand-gray"
            htmlFor="remember"
          >
            <input
              id="remember"
              type="checkbox"
              className="h-4 w-4 accent-[var(--zaad-primary)]"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
            />
            تذكرني
          </label>
          <Link href="/forgot-password" className="zad-touch inline-flex items-center text-sm text-primary underline">
            نسيت كلمة المرور؟
          </Link>
        </div>

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
          {loading ? "جاري الدخول..." : "دخول"}
        </Button>
      </form>
    </div>
  );
}
