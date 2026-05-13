"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { AuthShell } from "@/components/auth/auth-shell";
import { ToastViewport, useToast } from "@/components/ui/toast";

type LoginForm = {
  login_id: string;
  password: string;
};

const initialForm: LoginForm = {
  login_id: "",
  password: "",
};

export default function TenantLoginPage() {
  const router = useRouter();
  const [form, setForm] = useState<LoginForm>(initialForm);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast, showToast } = useToast({ defaultDurationMs: 3200 });

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    const loginId = form.login_id.trim();
    const password = form.password;

    if (!loginId || !password) {
      const message = "Please enter login ID and password.";
      setError(message);
      showToast(message, "error");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/tenant/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ login_id: loginId, password }),
      });

      const result = (await response.json()) as { message?: string };

      if (!response.ok) {
        const message = result.message || "Unable to login right now.";
        setError(message);
        showToast(message, "error");
        return;
      }

      showToast("Login successful.", "success");
      router.replace("/tenant");
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
        title="Tenant Login"
        subtitle="Sign in to complete onboarding and view your payments."
        footerText="Need help?"
        footerLinkLabel="Contact support"
        footerHref="/"
      >
        <form onSubmit={handleSubmit} className="grid gap-4">
          <label className="grid gap-2">
            <span className="text-sm font-semibold text-[var(--color-text-secondary)]">Login ID (Mobile)</span>
            <input
              value={form.login_id}
              onChange={(event) => setForm((prev) => ({ ...prev, login_id: event.target.value }))}
              type="tel"
              placeholder="Enter your mobile number"
              className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 text-sm text-[var(--color-text-primary)] outline-none transition focus:border-[var(--color-sky)] focus:ring-2 focus:ring-[var(--color-sky-soft)]"
            />
          </label>

          <label className="grid gap-2">
            <span className="text-sm font-semibold text-[var(--color-text-secondary)]">Password</span>
            <input
              value={form.password}
              onChange={(event) => setForm((prev) => ({ ...prev, password: event.target.value }))}
              type="password"
              placeholder="Enter your password"
              className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 text-sm text-[var(--color-text-primary)] outline-none transition focus:border-[var(--color-sky)] focus:ring-2 focus:ring-[var(--color-sky-soft)]"
            />
          </label>

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
            {isSubmitting ? "Signing in..." : "Login"}
          </button>
        </form>
      </AuthShell>

      <ToastViewport toast={toast} />
    </>
  );
}
