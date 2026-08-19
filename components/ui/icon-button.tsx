"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";

export type IconButtonTone = "neutral" | "primary" | "danger";

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Required — becomes both the accessible name and the hover tooltip. */
  label: string;
  icon: ReactNode;
  tone?: IconButtonTone;
}

const TONE_CLASSES: Record<IconButtonTone, string> = {
  neutral:
    "text-brand-gray hover:bg-[color-mix(in_srgb,var(--zaad-primary)_8%,transparent)] hover:text-primary",
  primary:
    "text-primary hover:bg-[color-mix(in_srgb,var(--zaad-primary)_8%,transparent)]",
  danger:
    "text-[var(--zaad-danger)] hover:bg-[var(--zaad-danger-bg)]",
};

/**
 * Square icon action per the brand guide: 36px, 10px radius, transparent
 * background, primary-tinted hover.
 */
export function IconButton({
  label,
  icon,
  tone = "neutral",
  className = "",
  type = "button",
  ...props
}: IconButtonProps) {
  return (
    <button
      type={type}
      aria-label={label}
      title={label}
      className={`inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-[var(--radius-md)] border border-transparent bg-transparent transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--zaad-primary)] disabled:cursor-not-allowed disabled:opacity-50 ${TONE_CLASSES[tone]} ${className}`}
      {...props}
    >
      {icon}
    </button>
  );
}

/** Same visual language for links that open a resource. */
export function IconLinkButton({
  label,
  icon,
  tone = "neutral",
  className = "",
  ...props
}: {
  label: string;
  icon: ReactNode;
  tone?: IconButtonTone;
  className?: string;
} & React.AnchorHTMLAttributes<HTMLAnchorElement>) {
  return (
    <a
      aria-label={label}
      title={label}
      className={`inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-[var(--radius-md)] border border-transparent bg-transparent transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--zaad-primary)] ${TONE_CLASSES[tone]} ${className}`}
      {...props}
    >
      {icon}
    </a>
  );
}
