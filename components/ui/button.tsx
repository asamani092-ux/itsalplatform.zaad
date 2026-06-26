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
      ? "btn-primary"
      : variant === "danger"
        ? "btn-secondary border-[var(--zaad-danger)] text-[var(--zaad-danger)]"
        : "btn-secondary";

  return (
    <button type="button" className={`${base} ${className}`} {...props}>
      {children}
    </button>
  );
}
