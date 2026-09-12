"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();
  const isChunk =
    /ChunkLoadError|Loading chunk|Failed to fetch dynamically imported module/i.test(
      error.message,
    );

  useEffect(() => {
    console.error(error);
    if (isChunk) {
      // Stale Next build after deploy/restart — hard reload once.
      const key = "zaad-chunk-reload";
      if (!sessionStorage.getItem(key)) {
        sessionStorage.setItem(key, "1");
        window.location.reload();
      }
    }
  }, [error, isChunk]);

  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 p-6 text-center">
      <h2 className="text-lg font-bold text-primary">تعذّر عرض الصفحة</h2>
      <p className="max-w-md text-sm text-brand-gray">
        {isChunk
          ? "ملفات الواجهة غير متزامنة مع السيرفر. أعد التحميل بعد إعادة تشغيل المعاينة."
          : error.message || "حدث خطأ غير متوقع"}
      </p>
      <div className="flex flex-wrap justify-center gap-2">
        <Button type="button" variant="primary" className="bg-primary text-white" onClick={() => reset()}>
          إعادة المحاولة
        </Button>
        <Button
          type="button"
          variant="secondary"
          onClick={() => {
            sessionStorage.removeItem("zaad-chunk-reload");
            window.location.assign("/dashboard");
          }}
        >
          العودة للمنصة
        </Button>
        <Button type="button" variant="secondary" onClick={() => router.refresh()}>
          تحديث
        </Button>
      </div>
    </div>
  );
}
