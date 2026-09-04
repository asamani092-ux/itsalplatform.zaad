"use client";

import { useEffect } from "react";

/**
 * Auto-recover from ChunkLoadError after a standalone rebuild left the
 * browser holding an old build id (white screen on tab navigation).
 */
export default function ChunkLoadRecovery() {
  useEffect(() => {
    function maybeReload(message: string) {
      if (
        !/ChunkLoadError|Loading chunk|Failed to fetch dynamically imported module/i.test(
          message,
        )
      ) {
        return;
      }
      const key = "zaad-chunk-reload";
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, "1");
      window.location.reload();
    }

    const onError = (event: ErrorEvent) => {
      maybeReload(event.message || String(event.error ?? ""));
    };
    const onRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason;
      const message =
        reason instanceof Error
          ? reason.message
          : typeof reason === "string"
            ? reason
            : String(reason ?? "");
      maybeReload(message);
    };

    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);
    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
    };
  }, []);

  return null;
}
