"use client";

import { FormEvent, useEffect, useState } from "react";
import { TenantLayout } from "@/components/tenant/tenant-layout";
import { ToastViewport, useToast } from "@/components/ui/toast";

type TenantProfile = {
  name?: string;
  login_id?: string;
  onboarding_status?: string;
};

export default function TenantProfilePage() {
  const [tenant, setTenant] = useState<TenantProfile | null>(null);
  const [form, setForm] = useState({ current_password: "", new_password: "" });
  const [isSaving, setIsSaving] = useState(false);
  const { toast, showToast } = useToast({ defaultDurationMs: 3200 });

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const response = await fetch("/api/tenant/auth/me", { cache: "no-store" });
        const data = (await response.json()) as { tenant?: TenantProfile; message?: string };
        if (response.ok) {
          setTenant(data.tenant || null);
        }
      } catch {
        setTenant(null);
      }
    };

    loadProfile();
  }, []);

  const onChangePassword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!form.current_password || !form.new_password) {
      showToast("Enter current and new password.", "error");
      return;
    }

    setIsSaving(true);

    try {
      const response = await fetch("/api/tenant/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const result = (await response.json()) as { message?: string };
      if (!response.ok) {
        showToast(result.message || "Unable to change password.", "error");
        return;
      }

      setForm({ current_password: "", new_password: "" });
      showToast("Password updated.", "success");
    } catch {
      showToast("Unable to change password.", "error");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <TenantLayout>
      <section className="rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-[var(--shadow-feature)] sm:p-8">
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--color-sky)]">Profile</p>
        <h1 className="mt-2 text-3xl font-black tracking-tight text-[var(--color-text-title)]">Account settings</h1>
        <p className="mt-2 text-sm text-[var(--color-text-muted)]">Manage your login credentials.</p>

        <div className="mt-6 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-4 text-sm text-[var(--color-text-secondary)]">
          <p><span className="font-semibold text-[var(--color-text-title)]">Name:</span> {tenant?.name || "-"}</p>
          <p className="mt-1"><span className="font-semibold text-[var(--color-text-title)]">Login ID:</span> {tenant?.login_id || "-"}</p>
          <p className="mt-1"><span className="font-semibold text-[var(--color-text-title)]">Onboarding:</span> {tenant?.onboarding_status || "pending"}</p>
        </div>

        <form onSubmit={onChangePassword} className="mt-6 grid gap-4 sm:grid-cols-2">
          <label className="text-sm font-medium text-[var(--color-text-secondary)]">
            Current Password
            <input value={form.current_password} onChange={(e) => setForm((p) => ({ ...p, current_password: e.target.value }))} type="password" className="mt-1 w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm" />
          </label>
          <label className="text-sm font-medium text-[var(--color-text-secondary)]">
            New Password
            <input value={form.new_password} onChange={(e) => setForm((p) => ({ ...p, new_password: e.target.value }))} type="password" className="mt-1 w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm" />
          </label>
          <div className="sm:col-span-2 flex justify-end">
            <button disabled={isSaving} type="submit" className="cursor-pointer rounded-md bg-[var(--color-emerald)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">
              {isSaving ? "Saving..." : "Change Password"}
            </button>
          </div>
        </form>
      </section>

      <ToastViewport toast={toast} />
    </TenantLayout>
  );
}
