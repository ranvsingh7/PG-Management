"use client";

import type { ChangeEvent } from "react";
import { InputField } from "@/components/ui/input-field";

type DateFieldProps = {
  label: string;
  value: string;
  onChange?: (event: ChangeEvent<HTMLInputElement>) => void;
  required?: boolean;
  placeholder?: string;
  min?: number | string;
  max?: number | string;
  disabled?: boolean;
};

export function DateField({ label, value, onChange, required, placeholder, min, max, disabled }: DateFieldProps) {
  return (
    <InputField
      label={label}
      value={value}
      onChange={onChange}
      required={required}
      type="date"
      placeholder={placeholder}
      min={min}
      max={max}
      disabled={disabled}
    />
  );
}
