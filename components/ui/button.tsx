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
      ? "btn-primary zad-touch rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
      : variant === "danger"
        ? "btn-secondary zad-touch rounded-lg border-[var(--zaad-danger)] text-[var(--zaad-danger)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
        : "btn-secondary zad-touch rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2";

  return (
    <button type="button" className={`${base} ${className}`} {...props}>
      {children}
    </button>
  );
}
