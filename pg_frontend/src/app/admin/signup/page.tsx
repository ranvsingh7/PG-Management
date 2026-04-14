"use client";

import { FormEvent, useEffect, useState } from "react";
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
  const [isGoogleReady, setIsGoogleReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast, showToast } = useToast({ defaultDurationMs: 3200 });

  useEffect(() => {
    const existingScript = document.getElementById("google-gsi-client");
    if (existingScript) {
      setIsGoogleReady(true);
      return;
    }

    const script = document.createElement("script");
    script.id = "google-gsi-client";
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = () => setIsGoogleReady(true);
    document.head.appendChild(script);
  }, []);

  const handleGoogleSignup = async () => {
    const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

    if (!googleClientId) {
      showToast("Set NEXT_PUBLIC_GOOGLE_CLIENT_ID to enable Google signup.", "error");
      return;
    }

    if (!isGoogleReady) {
      showToast("Google auth is still loading. Please try again.", "error");
      return;
    }

    const google = (window as Window & {
      google?: {
        accounts: {
          id: {
            initialize: (config: {
              client_id: string;
              callback: (response: { credential?: string }) => void;
              use_fedcm_for_prompt?: boolean;
            }) => void;
            prompt: (
              listener?: (notification: {
                isNotDisplayed?: () => boolean;
                isSkippedMoment?: () => boolean;
                getNotDisplayedReason?: () => string;
                getSkippedReason?: () => string;
              }) => void
            ) => void;
          };
        };
      };
    }).google;

    if (!google?.accounts?.id) {
      showToast("Google script not loaded yet. Please try again.", "error");
      return;
    }

    google.accounts.id.initialize({
      client_id: googleClientId,
      use_fedcm_for_prompt: false,
      callback: async (response) => {
        const credential = response.credential;
        if (!credential) {
          showToast("Google did not return a credential.", "error");
          return;
        }

        const authResponse = await fetch("/api/admin/auth/google", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id_token: credential }),
        });

        const result = (await authResponse.json()) as { message?: string };

        if (!authResponse.ok) {
          showToast(result.message || "Google signup failed.", "error");
          return;
        }

        showToast("Google signup successful.", "success");
        router.replace("/admin");
      },
    });

    google.accounts.id.prompt((notification) => {
      const notDisplayed = notification?.isNotDisplayed?.() === true;
      const skipped = notification?.isSkippedMoment?.() === true;

      if (notDisplayed || skipped) {
        const reason =
          notification?.getNotDisplayedReason?.() || notification?.getSkippedReason?.() || "google_prompt_unavailable";
        showToast(`Google sign-up unavailable (${reason}). Use form signup or enable third-party sign-in.`, "error");
      }
    });
  };

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
        subtitle="Sign up with Google or create your admin profile using email and password."
        footerText="Already have an account?"
        footerLinkLabel="Login"
        footerHref="/admin/login"
      >
        <button
          type="button"
          onClick={handleGoogleSignup}
          className="inline-flex w-full items-center justify-center gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 text-sm font-bold text-[var(--color-text-secondary)] transition hover:bg-[var(--color-surface-soft)]"
        >
          <GoogleIcon />
          Sign up with Google
        </button>

        <div className="my-5 flex items-center gap-3 text-xs font-bold uppercase tracking-[0.14em] text-[var(--color-text-muted)]">
          <span className="h-px flex-1 bg-[var(--color-border)]" />
          <span>or continue with form</span>
          <span className="h-px flex-1 bg-[var(--color-border)]" />
        </div>

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

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5">
      <path fill="#EA4335" d="M12 10.2v3.9h5.5c-.24 1.25-.95 2.31-2.02 3.03l3.26 2.52c1.9-1.75 3-4.32 3-7.39 0-.72-.07-1.41-.2-2.07H12z" />
      <path fill="#34A853" d="M12 22c2.7 0 4.97-.9 6.63-2.44l-3.26-2.52c-.9.6-2.04.96-3.37.96-2.6 0-4.8-1.76-5.58-4.12H3.05v2.59A10 10 0 0 0 12 22z" />
      <path fill="#4A90E2" d="M6.42 13.88A6 6 0 0 1 6.1 12c0-.65.11-1.28.31-1.88V7.53H3.05A10 10 0 0 0 2 12c0 1.62.39 3.15 1.05 4.47l3.37-2.59z" />
      <path fill="#FBBC05" d="M12 5.98c1.47 0 2.78.5 3.81 1.47l2.85-2.85C16.97 2.99 14.7 2 12 2a10 10 0 0 0-8.95 5.53l3.36 2.59C7.2 7.74 9.4 5.98 12 5.98z" />
    </svg>
  );
}
