"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { AuthShell } from "@/components/auth/auth-shell";
import { ToastViewport, useToast } from "@/components/ui/toast";

type SignUpForm = {
  fullName: string;
  email: string;
  password: string;
  confirmPassword: string;
};

const initialForm: SignUpForm = {
  fullName: "",
  email: "",
  password: "",
  confirmPassword: "",
};

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function AdminSignupPage() {
  const router = useRouter();
  const [form, setForm] = useState<SignUpForm>(initialForm);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast, showToast } = useToast({ defaultDurationMs: 3200 });

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    const fullName = form.fullName.trim();
    const email = form.email.trim().toLowerCase();
    const password = form.password;
    const confirmPassword = form.confirmPassword;

    if (!fullName || !email || !password || !confirmPassword) {
      const message = "Please fill all required fields.";
      setError(message);
      showToast(message, "error");
      return;
    }

    if (!emailRegex.test(email)) {
      const message = "Please enter a valid email address.";
      setError(message);
      showToast(message, "error");
      return;
    }

    if (password.length < 8) {
      const message = "Password must be at least 8 characters.";
      setError(message);
      showToast(message, "error");
      return;
    }

    if (password !== confirmPassword) {
      const message = "Password and Confirm Password must match.";
      setError(message);
      showToast(message, "error");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/admin/auth/signup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          full_name: fullName,
          email,
          password,
        }),
      });

      const result = (await response.json()) as { message?: string };

      if (!response.ok) {
        const message = result.message || "Unable to sign up right now.";
        setError(message);
        showToast(message, "error");
        return;
      }

      showToast("Admin account created successfully.", "success");
      router.replace("/admin");
    } catch {
      const message = "Unable to sign up right now. Please try again.";
      setError(message);
      showToast(message, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <AuthShell
        title="Create Admin Account"
        subtitle="Create your admin profile using email and password."
        footerText="Already have an account?"
        footerLinkLabel="Login"
        footerHref="/admin/login"
      >
        <form onSubmit={handleSubmit} className="grid gap-4">
          <Field
            label="Full Name*"
            value={form.fullName}
            onChange={(value) => setForm((prev) => ({ ...prev, fullName: value }))}
            placeholder="eg. Arjun Mehra"
            required
          />
          <Field
            label="Email*"
            type="email"
            value={form.email}
            onChange={(value) => setForm((prev) => ({ ...prev, email: value }))}
            placeholder="eg. admin@easypg.app"
            required
          />
          <Field
            label="Password*"
            type="password"
            value={form.password}
            onChange={(value) => setForm((prev) => ({ ...prev, password: value }))}
            placeholder="Minimum 8 characters"
            required
          />
          <Field
            label="Confirm Password*"
            type="password"
            value={form.confirmPassword}
            onChange={(value) => setForm((prev) => ({ ...prev, confirmPassword: value }))}
            placeholder="Re-enter password"
            required
          />

          {error ? (
            <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex items-center justify-center rounded-xl bg-[var(--color-emerald)] px-4 py-3 text-sm font-black text-[var(--color-text-inverse)] shadow-[var(--shadow-cta)] transition hover:bg-[var(--color-emerald-hover)] disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isSubmitting ? "Creating account..." : "Create Admin Account"}
          </button>
        </form>

        <p className="mt-4 text-xs text-[var(--color-text-muted)]">
          By signing up, you agree to EasyPG Terms and Privacy Policy.
        </p>
      </AuthShell>

      <ToastViewport toast={toast} />
    </>
  );
}

type FieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: "text" | "email" | "password";
  placeholder?: string;
  required?: boolean;
};

function Field({ label, value, onChange, type = "text", placeholder, required = false }: FieldProps) {
  return (
    <label className="grid gap-2">
      <span className="text-sm font-semibold text-[var(--color-text-secondary)]">{label}</span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        type={type}
        placeholder={placeholder}
        required={required}
        className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 text-sm text-[var(--color-text-primary)] outline-none transition focus:border-[var(--color-sky)] focus:ring-2 focus:ring-[var(--color-sky-soft)]"
      />
    </label>
  );
}
