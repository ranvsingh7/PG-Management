"use client";

import type { ChangeEvent, HTMLInputTypeAttribute } from "react";

type InputFieldProps = {
  label: string;
  value: string;
  onChange?: (event: ChangeEvent<HTMLInputElement>) => void;
  required?: boolean;
  type?: HTMLInputTypeAttribute;
  placeholder?: string;
  min?: number | string;
  max?: number | string;
  disabled?: boolean;
};

export function InputField({
  label,
  value,
  onChange,
  required = false,
  type = "text",
  placeholder,
  min,
  max,
  disabled = false,
}: InputFieldProps) {
  const isReadOnly = !onChange;

  return (
    <div className="grid gap-2">
      <span className="text-sm font-semibold text-[var(--color-text-secondary)]">{label}</span>
      <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        min={min}
        max={max}
        disabled={disabled}
        readOnly={isReadOnly}
        className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 text-sm text-[var(--color-text-primary)] outline-none transition focus:border-[var(--color-sky)] focus:ring-2 focus:ring-[var(--color-sky-soft)] disabled:cursor-not-allowed disabled:opacity-70"
      />
    </div>
  );
}
