import type { ButtonHTMLAttributes, ReactNode } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger";
  children: ReactNode;
}

export function Button({
  variant = "primary",
  className = "",
  children,
  ...props
}: ButtonProps) {
  const base =
    variant === "primary"
      ? "btn-primary rounded-lg focus:ring-2 focus:ring-primary/20"
      : variant === "danger"
        ? "btn-secondary rounded-lg border-[var(--zaad-danger)] text-[var(--zaad-danger)] focus:ring-2 focus:ring-primary/20"
        : "btn-secondary rounded-lg focus:ring-2 focus:ring-primary/20";

  return (
    <button type="button" className={`${base} ${className}`} {...props}>
      {children}
    </button>
  );
}
