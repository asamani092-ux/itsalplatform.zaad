"use client";

import { useCallback, useEffect, useState } from "react";
import { getApiErrorMessage, parseApiResponse } from "@/components/lib/api-types";
import {
  CATEGORY_LABELS,
  MODULE_ICON_PATHS,
  type ModuleCategory,
  type PlatformModuleState,
} from "@/lib/modules/registry";
import { IconButton, IconLinkButton } from "@/components/ui/icon-button";
import { IconExternal, IconPower } from "@/components/shared/icons";

const CATEGORY_ORDER: ModuleCategory[] = ["operations", "services", "admin"];

export default function ModuleManager() {
  const [modules, setModules] = useState<PlatformModuleState[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyKey, setBusyKey] = useState("");
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/manager/settings/modules");
      const payload = await parseApiResponse<{ modules: PlatformModuleState[] }>(res);
      if (!res.ok || !payload.success) {
        throw new Error(getApiErrorMessage(payload, "تعذّر تحميل الأدوات"));
      }
      setModules(payload.data.modules);
    } catch (e) {
      setError(e instanceof Error ? e.message : "خطأ");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function toggle(key: string, isEnabled: boolean) {
    setBusyKey(key);
    setError("");
    setStatus("");
    try {
      const res = await fetch("/api/manager/settings/modules", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, isEnabled }),
      });
      const payload = await parseApiResponse<{ modules: PlatformModuleState[] }>(res);
      if (!res.ok || !payload.success) {
        throw new Error(getApiErrorMessage(payload, "فشل التحديث"));
      }
      setModules(payload.data.modules);
      setStatus("تم التحديث — حدّث الصفحة لتظهر التغييرات في القائمة الجانبية");
      window.setTimeout(() => setStatus(""), 5000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "خطأ");
    } finally {
      setBusyKey("");
    }
  }

  if (loading) {
    return (
      <div className="card py-10 text-center text-sm text-brand-gray">
        جاري تحميل الأدوات...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="card-section">
        <h2 className="text-lg font-bold text-primary">الخدمات والأدوات</h2>
        <p className="mt-1 text-sm text-brand-gray">
          المنصة أساسها إدارة الاتصال المؤسسي. فعّل أو عطّل كل خدمة على حدة — الأدوات
          الأساسية لا يمكن تعطيلها لأن سير العمل يعتمد عليها.
        </p>
      </div>

      {error && (
        <p className="text-sm text-[var(--tmkeen-danger)]" role="alert">
          {error}
        </p>
      )}
      {status && (
        <p className="text-sm font-semibold text-primary" role="status">
          {status}
        </p>
      )}

      {CATEGORY_ORDER.map((category) => {
        const items = modules.filter((m) => m.category === category);
        if (items.length === 0) return null;

        return (
          <section key={category} className="space-y-2">
            <h3 className="text-sm font-bold text-brand-gray">
              {CATEGORY_LABELS[category]}
            </h3>
            <div className="grid gap-3 md:grid-cols-2">
              {items.map((item) => (
                <article key={item.key} className="card flex flex-col gap-2 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-2">
                      <svg
                        width="22"
                        height="22"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="shrink-0 text-primary"
                        aria-hidden
                        focusable="false"
                      >
                        {MODULE_ICON_PATHS[item.icon].map((d) => (
                          <path key={d} d={d} />
                        ))}
                      </svg>
                      <h4 className="truncate font-bold text-primary">{item.label}</h4>
                    </div>
                    {item.core ? (
                      <span className="badge-warning shrink-0">أساسية</span>
                    ) : (
                      <span
                        className={item.isEnabled ? "badge-success" : "badge-danger"}
                      >
                        {item.isEnabled ? "مفعّلة" : "معطّلة"}
                      </span>
                    )}
                  </div>

                  <p className="flex-1 text-sm text-brand-gray">{item.description}</p>

                  {item.publicHref && (
                    <p className="text-xs text-brand-gray">
                      الرابط العام:{" "}
                      <a
                        href={item.publicHref}
                        target="_blank"
                        rel="noreferrer"
                        className="font-semibold text-primary underline"
                        dir="ltr"
                      >
                        {item.publicHref}
                      </a>
                    </p>
                  )}

                  <div className="flex flex-wrap gap-1">
                    <IconLinkButton
                      label="فتح الأداة"
                      icon={<IconExternal size={18} />}
                      href={item.href}
                    />
                    <IconButton
                      label={
                        item.core
                          ? "أداة أساسية لا يمكن تعطيلها"
                          : item.isEnabled
                            ? "تعطيل الأداة"
                            : "تفعيل الأداة"
                      }
                      icon={<IconPower size={18} />}
                      tone={item.isEnabled ? "danger" : "primary"}
                      disabled={item.core || busyKey === item.key}
                      onClick={() => void toggle(item.key, !item.isEnabled)}
                    />
                  </div>
                </article>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
