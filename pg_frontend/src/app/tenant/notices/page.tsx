"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { TenantLayout } from "@/components/tenant/tenant-layout";
import { ToastViewport, useToast } from "@/components/ui/toast";

type Notice = {
  id: string;
  notice_date: string;
  vacate_date: string;
  reason?: string;
  status?: string;
};

export default function TenantNoticesPage() {
  const [notices, setNotices] = useState<Notice[]>([]);
  const [form, setForm] = useState({ notice_date: "", vacate_date: "", reason: "" });
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast, showToast } = useToast({ defaultDurationMs: 3200 });

  const loadNotices = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/tenant/notices", { cache: "no-store" });
      const data = (await response.json()) as Notice[] | { message?: string };

      if (response.ok) {
        setNotices(Array.isArray(data) ? data : []);
      }
    } catch {
      showToast("Unable to load notices.", "error");
    } finally {
      setIsLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadNotices();
  }, [loadNotices]);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!form.notice_date || !form.vacate_date) {
      showToast("Please provide notice and vacate dates.", "error");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/tenant/notices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const result = (await response.json()) as { message?: string } & Notice;
      if (!response.ok) {
        showToast(result.message || "Failed to submit notice.", "error");
        return;
      }

      setForm({ notice_date: "", vacate_date: "", reason: "" });
      setNotices((prev) => [result, ...prev]);
      showToast("Notice submitted.", "success");
    } catch {
      showToast("Unable to submit notice.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <TenantLayout>
      <section className="rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-[var(--shadow-feature)] sm:p-8">
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--color-sky)]">Notices</p>
        <h1 className="mt-2 text-3xl font-black tracking-tight text-[var(--color-text-title)]">Vacate request</h1>
        <p className="mt-2 text-sm text-[var(--color-text-muted)]">Submit a notice to vacate your room.</p>

        <form onSubmit={onSubmit} className="mt-6 grid gap-4 sm:grid-cols-2">
          <label className="text-sm font-medium text-[var(--color-text-secondary)]">
            Notice Date
            <input type="date" value={form.notice_date} onChange={(e) => setForm((p) => ({ ...p, notice_date: e.target.value }))} className="mt-1 w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm" />
          </label>
          <label className="text-sm font-medium text-[var(--color-text-secondary)]">
            Vacate Date
            <input type="date" value={form.vacate_date} onChange={(e) => setForm((p) => ({ ...p, vacate_date: e.target.value }))} className="mt-1 w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm" />
          </label>
          <label className="text-sm font-medium text-[var(--color-text-secondary)] sm:col-span-2">
            Reason (optional)
            <input value={form.reason} onChange={(e) => setForm((p) => ({ ...p, reason: e.target.value }))} className="mt-1 w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm" />
          </label>
          <div className="sm:col-span-2 flex justify-end">
            <button disabled={isSubmitting} type="submit" className="cursor-pointer rounded-md bg-[var(--color-emerald)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">
              {isSubmitting ? "Submitting..." : "Submit Notice"}
            </button>
          </div>
        </form>

        {isLoading ? (
          <div className="mt-6 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-6 text-sm text-[var(--color-text-muted)]">
            Loading notices...
          </div>
        ) : notices.length ? (
          <div className="mt-6 overflow-x-auto rounded-2xl border border-[var(--color-border)]">
            <table className="w-full text-sm">
              <thead className="bg-[var(--color-surface-muted)] text-[var(--color-text-muted)]">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-[0.08em]">Notice Date</th>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-[0.08em]">Vacate Date</th>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-[0.08em]">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-[0.08em]">Reason</th>
                </tr>
              </thead>
              <tbody>
                {notices.map((notice) => (
                  <tr key={notice.id} className="border-t border-[var(--color-border)]">
                    <td className="px-4 py-3 text-[var(--color-text-secondary)]">{notice.notice_date}</td>
                    <td className="px-4 py-3 text-[var(--color-text-secondary)]">{notice.vacate_date}</td>
                    <td className="px-4 py-3 text-[var(--color-text-secondary)]">{notice.status || "pending"}</td>
                    <td className="px-4 py-3 text-[var(--color-text-secondary)]">{notice.reason || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="mt-4 text-sm text-[var(--color-text-muted)]">No notices submitted yet.</p>
        )}
      </section>

      <ToastViewport toast={toast} />
    </TenantLayout>
  );
}
