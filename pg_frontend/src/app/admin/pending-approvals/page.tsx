"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { DashboardLayout } from "@/components/home/dashboard-layout";
import { SelectField } from "@/components/ui/select-field";

type Row = {
  id: string;
  applicant_name: string;
  approval_type: "tenant" | "staff" | "booking" | "other";
  request_note: string;
  submitted_date: string;
  status: "pending" | "approved" | "rejected";
  reviewed_date: string | null;
};

type FormState = {
  applicant_name: string;
  approval_type: "tenant" | "staff" | "booking" | "other";
  request_note: string;
  submitted_date: string;
};

const getTodayDate = () => new Date().toISOString().slice(0, 10);

const defaultForm = (): FormState => ({
  applicant_name: "",
  approval_type: "tenant",
  request_note: "",
  submitted_date: "",
});

export default function PendingApprovalsPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"all" | "pending" | "approved" | "rejected">("pending");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState<FormState>(defaultForm());
  const [formError, setFormError] = useState<string | null>(null);

  const loadRows = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ search, status });
      const response = await fetch(`/api/admin/pending-approvals?${params.toString()}`, { cache: "no-store" });
      const data = (await response.json()) as Row[] | { message?: string };
      if (!response.ok) {
        const message = "message" in data ? data.message : "Failed to fetch approvals";
        setError(message || "Failed to fetch approvals");
        setRows([]);
        return;
      }
      setRows(Array.isArray(data) ? data : []);
    } catch {
      setError("Unable to load approvals right now.");
      setRows([]);
    } finally {
      setIsLoading(false);
    }
  }, [search, status]);

  useEffect(() => { loadRows(); }, [loadRows]);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);

    if (!form.applicant_name.trim() || !form.submitted_date) {
      setFormError("Applicant name and submitted date are required.");
      return;
    }

    try {
      const response = await fetch("/api/admin/pending-approvals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, applicant_name: form.applicant_name.trim() }),
      });
      const data = (await response.json()) as { message?: string };
      if (!response.ok) {
        setFormError(data.message || "Failed to add request");
        return;
      }
      setIsModalOpen(false);
      setForm({ ...defaultForm(), submitted_date: getTodayDate() });
      setSuccess("Approval request added.");
      await loadRows();
    } catch {
      setFormError("Unable to save request right now.");
    }
  };

  const onSetStatus = async (id: string, nextStatus: "approved" | "rejected") => {
    try {
      const response = await fetch(`/api/admin/pending-approvals/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      if (!response.ok) {
        const data = (await response.json()) as { message?: string };
        setError(data.message || "Failed to update request");
        return;
      }
      setSuccess(`Request ${nextStatus}.`);
      await loadRows();
    } catch {
      setError("Unable to update request right now.");
    }
  };

  const onDelete = async (id: string) => {
    try {
      const response = await fetch(`/api/admin/pending-approvals/${id}`, { method: "DELETE" });
      if (!response.ok && response.status !== 204) {
        const data = (await response.json()) as { message?: string };
        setError(data.message || "Failed to delete request");
        return;
      }
      setSuccess("Request deleted.");
      await loadRows();
    } catch {
      setError("Unable to delete request right now.");
    }
  };

  return (
    <DashboardLayout>
      <section className="rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-[var(--shadow-feature)] sm:p-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--color-sky)]">Pending Approvals</p>
            <h1 className="mt-1 text-3xl font-black tracking-tight text-[var(--color-text-title)] sm:text-4xl">Manage approvals</h1>
          </div>
          <button
            onClick={() => {
              setFormError(null);
              setForm({ ...defaultForm(), submitted_date: getTodayDate() });
              setIsModalOpen(true);
            }}
            className="cursor-pointer rounded-xl bg-[var(--color-emerald)] px-4 py-2 text-sm font-bold text-[var(--color-text-inverse)]"
          >
            Add Request
          </button>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search applicant/type" className="rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm" />
          <SelectField label="Status" value={status} onChange={(value) => setStatus(value as typeof status)} options={[{ value: "all", label: "All" }, { value: "pending", label: "Pending" }, { value: "approved", label: "Approved" }, { value: "rejected", label: "Rejected" }]} />
          <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-muted)] px-3 py-2 text-sm text-[var(--color-text-secondary)]">Total: {rows.length}</div>
        </div>

        {success ? <p className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-700">{success}</p> : null}
        {error ? <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">{error}</p> : null}

        <div className="mt-5 overflow-x-auto rounded-xl border border-[var(--color-border)]">
          <table className="w-full text-sm">
            <thead className="bg-[var(--color-surface-muted)]">
              <tr>
                <th className="px-3 py-2 text-left">Applicant</th>
                <th className="px-3 py-2 text-left">Type</th>
                <th className="px-3 py-2 text-left">Submitted</th>
                <th className="px-3 py-2 text-left">Status</th>
                <th className="px-3 py-2 text-left">Note</th>
                <th className="px-3 py-2 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? <tr><td colSpan={6} className="px-3 py-6 text-center">Loading...</td></tr> : null}
              {!isLoading && rows.length === 0 ? <tr><td colSpan={6} className="px-3 py-6 text-center">No approval requests found.</td></tr> : null}
              {!isLoading && rows.map((row) => (
                <tr key={row.id} className="border-t border-[var(--color-border)]">
                  <td className="px-3 py-2 font-semibold">{row.applicant_name}</td>
                  <td className="px-3 py-2 capitalize">{row.approval_type}</td>
                  <td className="px-3 py-2">{row.submitted_date}</td>
                  <td className="px-3 py-2"><span className="rounded-full bg-slate-100 px-2 py-1 text-xs">{row.status}</span></td>
                  <td className="px-3 py-2">{row.request_note || "-"}</td>
                  <td className="px-3 py-2">
                    <div className="flex gap-2">
                      {row.status === "pending" ? <button onClick={() => onSetStatus(row.id, "approved")} className="cursor-pointer rounded-md border border-emerald-300 px-2 py-1 text-xs text-emerald-700">Approve</button> : null}
                      {row.status === "pending" ? <button onClick={() => onSetStatus(row.id, "rejected")} className="cursor-pointer rounded-md border border-amber-300 px-2 py-1 text-xs text-amber-700">Reject</button> : null}
                      <button onClick={() => onDelete(row.id)} className="cursor-pointer rounded-md border border-rose-300 px-2 py-1 text-xs text-rose-700">Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {isModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
          <div className="w-full max-w-xl rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
            <div className="flex items-center justify-between"><h3 className="text-xl font-semibold">Add Approval Request</h3><button onClick={() => setIsModalOpen(false)} className="cursor-pointer rounded-md border px-3 py-1 text-sm">Close</button></div>
            <form onSubmit={onSubmit} className="mt-4 grid gap-3 sm:grid-cols-2">
              <input value={form.applicant_name} onChange={(e) => setForm((p) => ({ ...p, applicant_name: e.target.value }))} placeholder="Applicant name" className="rounded-lg border px-3 py-2 text-sm" />
              <SelectField label="Type" value={form.approval_type} onChange={(value) => setForm((p) => ({ ...p, approval_type: value as FormState["approval_type"] }))} options={[{ value: "tenant", label: "Tenant" }, { value: "staff", label: "Staff" }, { value: "booking", label: "Booking" }, { value: "other", label: "Other" }]} />
              <input value={form.submitted_date} onChange={(e) => setForm((p) => ({ ...p, submitted_date: e.target.value }))} type="date" className="rounded-lg border px-3 py-2 text-sm" />
              <input value={form.request_note} onChange={(e) => setForm((p) => ({ ...p, request_note: e.target.value }))} placeholder="Request note" className="rounded-lg border px-3 py-2 text-sm" />
              {formError ? <p className="sm:col-span-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{formError}</p> : null}
              <div className="sm:col-span-2 flex justify-end gap-2"><button type="button" onClick={() => setIsModalOpen(false)} className="cursor-pointer rounded-md border px-3 py-1.5 text-sm">Cancel</button><button type="submit" className="cursor-pointer rounded-md bg-[var(--color-emerald)] px-3 py-1.5 text-sm font-semibold text-white">Save</button></div>
            </form>
          </div>
        </div>
      ) : null}
    </DashboardLayout>
  );
}
