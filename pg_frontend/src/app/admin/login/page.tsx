"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { AuthShell } from "@/components/auth/auth-shell";
import { ToastViewport, useToast } from "@/components/ui/toast";

type LoginForm = {
  email: string;
  password: string;
};

const initialForm: LoginForm = {
  email: "",
  password: "",
};

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function AdminLoginPage() {
  const router = useRouter();
  const [form, setForm] = useState<LoginForm>(initialForm);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast, showToast } = useToast({ defaultDurationMs: 3200 });

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    const email = form.email.trim().toLowerCase();
    const password = form.password;

    if (!email || !password) {
      const message = "Please enter email and password.";
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

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/admin/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      const result = (await response.json()) as { message?: string };

      if (!response.ok) {
        const message = result.message || "Unable to login right now.";
        setError(message);
        showToast(message, "error");
        return;
      }

      showToast("Login successful.", "success");
      router.replace("/admin");
    } catch {
      const message = "Unable to login right now. Please try again.";
      setError(message);
      showToast(message, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <AuthShell
        title="Admin Login"
        subtitle="Access your EasyPG admin dashboard and manage your PG operations."
        footerText="New to EasyPG?"
        footerLinkLabel="Create account"
        footerHref="/admin/signup"
      >
        <form onSubmit={handleSubmit} className="grid gap-4">
          <Field
            label="Email"
            type="email"
            value={form.email}
            onChange={(value) => setForm((prev) => ({ ...prev, email: value }))}
            placeholder="eg. admin@easypg.app"
            required
          />
          <Field
            label="Password"
            type="password"
            value={form.password}
            onChange={(value) => setForm((prev) => ({ ...prev, password: value }))}
            placeholder="Enter your password"
            required
          />

          <div className="-mt-1 flex items-center justify-end">
            <Link href="/admin/signup" className="text-xs font-semibold text-[var(--color-sky)] hover:text-[var(--color-sky-strong)]">
              Forgot password?
            </Link>
          </div>

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
            {isSubmitting ? "Logging in..." : "Login"}
          </button>
        </form>
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
