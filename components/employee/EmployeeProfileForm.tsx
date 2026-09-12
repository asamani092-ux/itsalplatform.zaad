"use client";

import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { getApiErrorMessage, parseApiResponse } from "@/components/lib/api-types";
import { fetchWithTimeout } from "@/lib/client/fetch-with-timeout";

interface ProfileUser {
  id: string;
  name: string;
  email: string;
  phoneNumber: string;
  role: string;
}

export default function EmployeeProfileForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetchWithTimeout("/api/auth/me");
        const payload = await parseApiResponse<{ user: ProfileUser }>(res);
        if (!res.ok || !payload.success) {
          throw new Error(getApiErrorMessage(payload, "تعذّر تحميل البيانات"));
        }
        setName(payload.data.user.name);
        setEmail(payload.data.user.email);
        setPhoneNumber(payload.data.user.phoneNumber);
      } catch (e) {
        setError(e instanceof Error ? e.message : "خطأ");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setStatus("");

    if (newPassword || confirmPassword) {
      if (newPassword !== confirmPassword) {
        setError("كلمة المرور الجديدة وتأكيدها غير متطابقتين");
        return;
      }
      if (!currentPassword) {
        setError("أدخل كلمة المرور الحالية لتغييرها");
        return;
      }
    }

    setSaving(true);
    try {
      const res = await fetchWithTimeout("/api/auth/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          phoneNumber,
          ...(newPassword
            ? { currentPassword, newPassword }
            : {}),
        }),
      });
      const payload = await parseApiResponse<{
        user: ProfileUser;
        message: string;
      }>(res);
      if (!res.ok || !payload.success) {
        throw new Error(getApiErrorMessage(payload, "فشل حفظ البيانات"));
      }
      setName(payload.data.user.name);
      setEmail(payload.data.user.email);
      setPhoneNumber(payload.data.user.phoneNumber);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setStatus(payload.data.message || "تم الحفظ");
    } catch (err) {
      setError(err instanceof Error ? err.message : "حدث خطأ");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="card py-10 text-center text-sm text-brand-gray">
        جاري تحميل البيانات...
      </div>
    );
  }

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className="card max-w-lg space-y-4">
      <div>
        <h2 className="text-lg font-bold text-primary">بيانات الحساب</h2>
        <p className="mt-1 text-xs text-brand-gray">
          عدّل بياناتك الشخصية أو غيّر كلمة المرور.
        </p>
      </div>

      <Input
        id="profile-name"
        label="الاسم"
        value={name}
        onChange={(e) => setName(e.target.value)}
        required
      />
      <Input
        id="profile-email"
        label="البريد الإلكتروني"
        type="email"
        dir="ltr"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
      />
      <Input
        id="profile-phone"
        label="رقم الجوال"
        dir="ltr"
        value={phoneNumber}
        onChange={(e) => setPhoneNumber(e.target.value)}
        required
      />

      <div className="border-t border-surface-border pt-4">
        <h3 className="text-sm font-bold text-primary">تغيير كلمة المرور</h3>
        <p className="mt-1 text-xs text-brand-gray">
          اترك الحقول فارغة إذا لم ترغب بتغيير كلمة المرور.
        </p>
      </div>

      <Input
        id="profile-current-password"
        label="كلمة المرور الحالية"
        type="password"
        value={currentPassword}
        onChange={(e) => setCurrentPassword(e.target.value)}
        autoComplete="current-password"
      />
      <Input
        id="profile-new-password"
        label="كلمة المرور الجديدة"
        type="password"
        value={newPassword}
        onChange={(e) => setNewPassword(e.target.value)}
        autoComplete="new-password"
      />
      <Input
        id="profile-confirm-password"
        label="تأكيد كلمة المرور الجديدة"
        type="password"
        value={confirmPassword}
        onChange={(e) => setConfirmPassword(e.target.value)}
        autoComplete="new-password"
      />

      {error && (
        <p className="text-sm font-semibold text-[var(--tmkeen-danger)]" role="alert">
          {error}
        </p>
      )}
      {status && (
        <p className="text-sm font-semibold text-primary" role="status">
          {status}
        </p>
      )}

      <Button type="submit" className="w-full bg-primary text-white" disabled={saving}>
        {saving ? "جاري الحفظ..." : "حفظ التغييرات"}
      </Button>
    </form>
  );
}
