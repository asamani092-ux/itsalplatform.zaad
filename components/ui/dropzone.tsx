"use client";

import { useRef, useState } from "react";

export default function Dropzone({
  accept,
  label = "اسحب الملف هنا أو اختر من الجهاز",
  hint,
  disabled = false,
  onFiles,
}: {
  accept?: string;
  label?: string;
  hint?: string;
  disabled?: boolean;
  onFiles: (files: FileList) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [active, setActive] = useState(false);

  return (
    <div
      role="button"
      tabIndex={disabled ? -1 : 0}
      className="zad-dropzone"
      data-active={active ? "true" : "false"}
      aria-label={label}
      aria-disabled={disabled || undefined}
      onClick={() => {
        if (!disabled) inputRef.current?.click();
      }}
      onKeyDown={(e) => {
        if (disabled) return;
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          inputRef.current?.click();
        }
      }}
      onDragOver={(e) => {
        e.preventDefault();
        if (!disabled) setActive(true);
      }}
      onDragLeave={() => setActive(false)}
      onDrop={(e) => {
        e.preventDefault();
        setActive(false);
        if (disabled || !e.dataTransfer.files?.length) return;
        onFiles(e.dataTransfer.files);
      }}
    >
      <p className="text-sm font-semibold text-primary">{label}</p>
      {hint && <p className="text-xs text-brand-gray">{hint}</p>}
      <button type="button" className="btn-secondary text-xs" disabled={disabled}>
        استعراض الملفات
      </button>
      <input
        ref={inputRef}
        type="file"
        className="sr-only"
        accept={accept}
        disabled={disabled}
        onChange={(e) => {
          if (e.target.files?.length) onFiles(e.target.files);
        }}
      />
    </div>
  );
}
