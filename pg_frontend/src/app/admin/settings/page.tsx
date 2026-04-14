"use client";

import { FormEvent, useEffect, useState } from "react";
import { DashboardLayout } from "@/components/home/dashboard-layout";

type Setting = {
  property_name: string;
  contact_phone: string;
  contact_email: string;
  address: string;
  currency: string;
  timezone: string;
  invoice_prefix: string;
};

const defaultSetting: Setting = {
  property_name: "",
  contact_phone: "",
  contact_email: "",
  address: "",
  currency: "INR",
  timezone: "Asia/Kolkata",
  invoice_prefix: "INV",
};

export default function SettingsPage() {
  const [form, setForm] = useState<Setting>(defaultSetting);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const loadSetting = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/settings", { cache: "no-store" });
      const data = (await response.json()) as Partial<Setting> & { message?: string };
      if (!response.ok) {
        setError(data.message || "Failed to fetch settings");
        return;
      }

      setForm({
        property_name: data.property_name || "",
        contact_phone: data.contact_phone || "",
        contact_email: data.contact_email || "",
        address: data.address || "",
        currency: data.currency || "INR",
        timezone: data.timezone || "Asia/Kolkata",
        invoice_prefix: data.invoice_prefix || "INV",
      });
    } catch {
      setError("Unable to load settings right now.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { loadSetting(); }, []);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = (await response.json()) as { message?: string };
      if (!response.ok) {
        setError(data.message || "Failed to save settings");
        return;
      }

      setSuccess("Settings saved successfully.");
    } catch {
      setError("Unable to save settings right now.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <DashboardLayout>
      <section className="rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-[var(--shadow-feature)] sm:p-8">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--color-sky)]">Settings</p>
          <h1 className="mt-1 text-3xl font-black tracking-tight text-[var(--color-text-title)] sm:text-4xl">System settings</h1>
          <p className="mt-2 text-sm text-[var(--color-text-muted)]">Configure property-level preferences and billing defaults.</p>
        </div>

        {error ? <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">{error}</p> : null}
        {success ? <p className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-700">{success}</p> : null}

        <form onSubmit={onSubmit} className="mt-5 grid gap-3 sm:grid-cols-2">
          <label className="text-sm font-medium text-[var(--color-text-secondary)] sm:col-span-2">
            Property Name
            <input value={form.property_name} onChange={(e) => setForm((p) => ({ ...p, property_name: e.target.value }))} className="mt-1 w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm" />
          </label>
          <label className="text-sm font-medium text-[var(--color-text-secondary)]">
            Contact Phone
            <input value={form.contact_phone} onChange={(e) => setForm((p) => ({ ...p, contact_phone: e.target.value }))} className="mt-1 w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm" />
          </label>
          <label className="text-sm font-medium text-[var(--color-text-secondary)]">
            Contact Email
            <input type="email" value={form.contact_email} onChange={(e) => setForm((p) => ({ ...p, contact_email: e.target.value }))} className="mt-1 w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm" />
          </label>
          <label className="text-sm font-medium text-[var(--color-text-secondary)] sm:col-span-2">
            Address
            <input value={form.address} onChange={(e) => setForm((p) => ({ ...p, address: e.target.value }))} className="mt-1 w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm" />
          </label>
          <label className="text-sm font-medium text-[var(--color-text-secondary)]">
            Currency
            <input value={form.currency} onChange={(e) => setForm((p) => ({ ...p, currency: e.target.value.toUpperCase() }))} className="mt-1 w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm" />
          </label>
          <label className="text-sm font-medium text-[var(--color-text-secondary)]">
            Timezone
            <input value={form.timezone} onChange={(e) => setForm((p) => ({ ...p, timezone: e.target.value }))} className="mt-1 w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm" />
          </label>
          <label className="text-sm font-medium text-[var(--color-text-secondary)]">
            Invoice Prefix
            <input value={form.invoice_prefix} onChange={(e) => setForm((p) => ({ ...p, invoice_prefix: e.target.value.toUpperCase() }))} className="mt-1 w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm" />
          </label>
          <div className="sm:col-span-2 flex justify-end"><button disabled={isLoading || isSaving} type="submit" className="cursor-pointer rounded-md bg-[var(--color-emerald)] px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-60">{isSaving ? "Saving..." : "Save Settings"}</button></div>
        </form>
      </section>
    </DashboardLayout>
  );
}
