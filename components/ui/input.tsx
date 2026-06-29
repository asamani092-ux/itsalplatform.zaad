import type { InputHTMLAttributes } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

export function Input({ label, className = "", id, ...props }: InputProps) {
  return (
    <div className="space-y-1">
      {label && (
        <label className="label-field" htmlFor={id}>
          {label}
        </label>
      )}
      <input
        id={id}
        className={`input-field rounded-lg focus:ring-2 focus:ring-primary/20 ${className}`}
        {...props}
      />
    </div>
  );
}
