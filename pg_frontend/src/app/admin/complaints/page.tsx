"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { DashboardLayout } from "@/components/home/dashboard-layout";
import { SelectField } from "@/components/ui/select-field";

type ComplaintStatus = "open" | "in_progress" | "resolved";
type ComplaintPriority = "low" | "medium" | "high";
type ComplaintCategory = "maintenance" | "electricity" | "cleaning" | "security" | "other";

type ComplaintItem = {
  id: string;
  tenant_name: string;
  room_number: string;
  category: ComplaintCategory;
  priority: ComplaintPriority;
  description: string;
  status: ComplaintStatus;
  complaint_date: string;
  resolved_date: string | null;
  created_at: string;
};

type ComplaintForm = {
  tenant_name: string;
  room_number: string;
  category: ComplaintCategory;
  priority: ComplaintPriority;
  description: string;
  complaint_date: string;
};

const defaultForm = (): ComplaintForm => ({
  tenant_name: "",
  room_number: "",
  category: "maintenance",
  priority: "medium",
  description: "",
  complaint_date: new Date().toISOString().slice(0, 10),
});

const STATUS_OPTIONS: Array<{ value: "all" | ComplaintStatus; label: string }> = [
  { value: "all", label: "All" },
  { value: "open", label: "Open" },
  { value: "in_progress", label: "In Progress" },
  { value: "resolved", label: "Resolved" },
];

const CATEGORY_OPTIONS: Array<{ value: ComplaintCategory; label: string }> = [
  { value: "maintenance", label: "Maintenance" },
  { value: "electricity", label: "Electricity" },
  { value: "cleaning", label: "Cleaning" },
  { value: "security", label: "Security" },
  { value: "other", label: "Other" },
];

const PRIORITY_OPTIONS: Array<{ value: ComplaintPriority; label: string }> = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
];

const getMonthKey = (date = new Date()) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

const prettyDate = (value: string | null) => {
  if (!value) {
    return "-";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return date.toLocaleDateString("en-IN", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  });
};

export default function ComplaintsPage() {
  const [complaints, setComplaints] = useState<ComplaintItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [listError, setListError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState<ComplaintForm>(defaultForm());
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [selectedMonth, setSelectedMonth] = useState(getMonthKey());
  const [statusFilter, setStatusFilter] = useState<"all" | ComplaintStatus>("all");
  const [searchText, setSearchText] = useState("");

  const loadComplaints = useCallback(async () => {
    setIsLoading(true);
    setListError(null);

    try {
      const params = new URLSearchParams({
        month: selectedMonth,
        status: statusFilter,
        search: searchText.trim(),
      });

      const response = await fetch(`/api/admin/complaints?${params.toString()}`, { cache: "no-store" });
      const data = (await response.json()) as ComplaintItem[] | { message?: string };

      if (!response.ok) {
        const message = "message" in data ? data.message : "Failed to fetch complaints";
        setListError(message || "Failed to fetch complaints");
        setComplaints([]);
        return;
      }

      setComplaints(Array.isArray(data) ? data : []);
    } catch {
      setListError("Unable to load complaints right now.");
      setComplaints([]);
    } finally {
      setIsLoading(false);
    }
  }, [searchText, selectedMonth, statusFilter]);

  useEffect(() => {
    loadComplaints();
  }, [loadComplaints]);

  const summary = useMemo(() => {
    const open = complaints.filter((c) => c.status === "open").length;
    const inProgress = complaints.filter((c) => c.status === "in_progress").length;
    const resolved = complaints.filter((c) => c.status === "resolved").length;

    return {
      total: complaints.length,
      open,
      inProgress,
      resolved,
    };
  }, [complaints]);

  const onOpenCreateModal = () => {
    setForm(defaultForm());
    setFormError(null);
    setIsModalOpen(true);
  };

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);
    setIsSubmitting(true);

    const tenantName = form.tenant_name.trim();
    const roomNumber = form.room_number.trim();
    const description = form.description.trim();

    if (!tenantName || !roomNumber || !description || !form.complaint_date) {
      setFormError("Please fill all required fields.");
      setIsSubmitting(false);
      return;
    }

    try {
      const response = await fetch("/api/admin/complaints", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          tenant_name: tenantName,
          room_number: roomNumber,
          category: form.category,
          priority: form.priority,
          description,
          complaint_date: form.complaint_date,
          status: "open",
        }),
      });

      const result = (await response.json()) as { message?: string; errors?: string[] };

      if (!response.ok) {
        setFormError(result.errors?.join(", ") || result.message || "Failed to create complaint.");
        return;
      }

      setIsModalOpen(false);
      setSuccessMessage("Complaint created successfully.");
      await loadComplaints();
    } catch {
      setFormError("Unable to save complaint right now.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const onUpdateStatus = async (item: ComplaintItem, nextStatus: ComplaintStatus) => {
    try {
      const response = await fetch(`/api/admin/complaints/${item.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          status: nextStatus,
        }),
      });

      const result = (await response.json()) as { message?: string };
      if (!response.ok) {
        setListError(result.message || "Failed to update complaint status.");
        return;
      }

      setSuccessMessage("Complaint status updated.");
      await loadComplaints();
    } catch {
      setListError("Unable to update complaint status right now.");
    }
  };

  const onDeleteComplaint = async (id: string) => {
    try {
      const response = await fetch(`/api/admin/complaints/${id}`, {
        method: "DELETE",
      });

      if (!response.ok && response.status !== 204) {
        const result = (await response.json()) as { message?: string };
        setListError(result.message || "Failed to delete complaint.");
        return;
      }

      setSuccessMessage("Complaint deleted successfully.");
      await loadComplaints();
    } catch {
      setListError("Unable to delete complaint right now.");
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <section className="rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-[var(--shadow-feature)] sm:p-8">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--color-sky)]">Complaint Management</p>
              <h1 className="mt-1 text-3xl font-black tracking-tight text-[var(--color-text-title)] sm:text-4xl">
                Track and resolve complaints
              </h1>
              <p className="mt-2 text-sm text-[var(--color-text-muted)]">
                Create complaints, update progress, and mark them resolved.
              </p>
            </div>

            <button
              type="button"
              onClick={onOpenCreateModal}
              className="cursor-pointer inline-flex items-center justify-center rounded-xl bg-[var(--color-emerald)] px-4 py-2 text-sm font-bold text-[var(--color-text-inverse)] shadow-[var(--shadow-cta)] transition hover:bg-[var(--color-emerald-hover)]"
            >
              Add Complaint
            </button>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Total" value={summary.total} tone="default" />
          <StatCard label="Open" value={summary.open} tone="open" />
          <StatCard label="In Progress" value={summary.inProgress} tone="progress" />
          <StatCard label="Resolved" value={summary.resolved} tone="resolved" />
        </section>

        <section className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-feature)]">
          <div className="flex items-center justify-between border-b border-[var(--color-border)] px-5 py-4">
            <h2 className="text-base font-semibold text-[var(--color-text-title)]">Complaint Records</h2>
            <p className="text-sm text-[var(--color-text-secondary)]">Month: {selectedMonth}</p>
          </div>

          <div className="grid grid-cols-1 gap-3 border-b border-[var(--color-border)] px-5 py-4 sm:grid-cols-3">
            <label className="text-sm font-medium text-[var(--color-text-secondary)]">
              Month
              <input
                type="month"
                value={selectedMonth}
                onChange={(event) => setSelectedMonth(event.target.value)}
                className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm outline-none focus:border-[var(--color-sky)] focus:ring-2 focus:ring-[var(--color-sky-soft)]"
              />
            </label>

            <label className="text-sm font-medium text-[var(--color-text-secondary)]">
              Search
              <input
                type="text"
                value={searchText}
                onChange={(event) => setSearchText(event.target.value)}
                placeholder="Tenant, room, category"
                className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm outline-none focus:border-[var(--color-sky)] focus:ring-2 focus:ring-[var(--color-sky-soft)]"
              />
            </label>

            <SelectField
              label="Status"
              value={statusFilter}
              onChange={(value) => setStatusFilter(value as "all" | ComplaintStatus)}
              options={STATUS_OPTIONS}
            />
          </div>

          {successMessage ? (
            <div className="mx-5 mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              {successMessage}
            </div>
          ) : null}

          {listError ? (
            <div className="mx-5 mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {listError}
            </div>
          ) : null}

          <div className="overflow-x-auto px-2 pb-3 sm:px-3">
            <table className="min-w-full divide-y divide-[var(--color-border)] text-sm">
              <thead className="bg-[var(--color-surface-muted)] text-left text-xs uppercase tracking-wide text-[var(--color-text-muted)]">
                <tr>
                  <th className="px-4 py-3">Tenant</th>
                  <th className="px-4 py-3">Room</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">Priority</th>
                  <th className="px-4 py-3">Description</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border)] bg-[var(--color-surface)]">
                {isLoading ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-[var(--color-text-muted)]">
                      Loading complaints...
                    </td>
                  </tr>
                ) : null}

                {!isLoading && complaints.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-[var(--color-text-muted)]">
                      No complaints found.
                    </td>
                  </tr>
                ) : null}

                {!isLoading &&
                  complaints.map((item) => {
                    const statusTone =
                      item.status === "resolved"
                        ? "bg-emerald-100 text-emerald-700"
                        : item.status === "in_progress"
                          ? "bg-amber-100 text-amber-700"
                          : "bg-rose-100 text-rose-700";

                    const priorityTone =
                      item.priority === "high"
                        ? "text-rose-700"
                        : item.priority === "medium"
                          ? "text-amber-700"
                          : "text-slate-700";

                    return (
                      <tr key={item.id} className="hover:bg-[var(--color-surface-soft)]">
                        <td className="px-4 py-3 font-semibold text-[var(--color-text-title)]">{item.tenant_name}</td>
                        <td className="px-4 py-3 text-[var(--color-text-secondary)]">{item.room_number}</td>
                        <td className="px-4 py-3 text-[var(--color-text-secondary)] capitalize">{item.category}</td>
                        <td className={`px-4 py-3 font-semibold capitalize ${priorityTone}`}>{item.priority}</td>
                        <td className="px-4 py-3 text-[var(--color-text-secondary)]">{item.description}</td>
                        <td className="px-4 py-3 text-[var(--color-text-secondary)]">{prettyDate(item.complaint_date)}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${statusTone}`}>
                            {item.status.replace("_", " ")}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-2">
                            {item.status === "open" ? (
                              <button
                                type="button"
                                onClick={() => onUpdateStatus(item, "in_progress")}
                                className="cursor-pointer rounded-md border border-[var(--color-border)] px-2.5 py-1 text-xs font-semibold text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-soft)]"
                              >
                                Start
                              </button>
                            ) : null}

                            {item.status !== "resolved" ? (
                              <button
                                type="button"
                                onClick={() => onUpdateStatus(item, "resolved")}
                                className="cursor-pointer rounded-md border border-emerald-300 px-2.5 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-50"
                              >
                                Resolve
                              </button>
                            ) : null}

                            <button
                              type="button"
                              onClick={() => onDeleteComplaint(item.id)}
                              className="cursor-pointer rounded-md border border-rose-300 px-2.5 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-50"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {isModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
          <div className="w-full max-w-2xl rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-xl font-semibold text-[var(--color-text-title)]">Create Complaint</h3>
                <p className="text-sm text-[var(--color-text-secondary)]">Add complaint details for tracking.</p>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="cursor-pointer rounded-md border border-[var(--color-border)] px-3 py-1 text-sm text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-soft)]"
              >
                Close
              </button>
            </div>

            <form onSubmit={onSubmit} className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="text-sm font-medium text-[var(--color-text-secondary)]">
                Tenant Name
                <input
                  type="text"
                  value={form.tenant_name}
                  onChange={(event) => setForm((prev) => ({ ...prev, tenant_name: event.target.value }))}
                  required
                  className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm outline-none focus:border-[var(--color-sky)] focus:ring-2 focus:ring-[var(--color-sky-soft)]"
                />
              </label>

              <label className="text-sm font-medium text-[var(--color-text-secondary)]">
                Room Number
                <input
                  type="text"
                  value={form.room_number}
                  onChange={(event) => setForm((prev) => ({ ...prev, room_number: event.target.value }))}
                  required
                  className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm outline-none focus:border-[var(--color-sky)] focus:ring-2 focus:ring-[var(--color-sky-soft)]"
                />
              </label>

              <SelectField
                label="Category"
                value={form.category}
                onChange={(value) => setForm((prev) => ({ ...prev, category: value as ComplaintCategory }))}
                options={CATEGORY_OPTIONS}
              />

              <SelectField
                label="Priority"
                value={form.priority}
                onChange={(value) => setForm((prev) => ({ ...prev, priority: value as ComplaintPriority }))}
                options={PRIORITY_OPTIONS}
              />

              <label className="text-sm font-medium text-[var(--color-text-secondary)] sm:col-span-2">
                Description
                <textarea
                  value={form.description}
                  onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
                  rows={3}
                  required
                  className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm outline-none focus:border-[var(--color-sky)] focus:ring-2 focus:ring-[var(--color-sky-soft)]"
                />
              </label>

              <label className="text-sm font-medium text-[var(--color-text-secondary)]">
                Complaint Date
                <input
                  type="date"
                  value={form.complaint_date}
                  onChange={(event) => setForm((prev) => ({ ...prev, complaint_date: event.target.value }))}
                  required
                  className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm outline-none focus:border-[var(--color-sky)] focus:ring-2 focus:ring-[var(--color-sky-soft)]"
                />
              </label>

              {formError ? (
                <p className="sm:col-span-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {formError}
                </p>
              ) : null}

              <div className="sm:col-span-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="cursor-pointer rounded-md border border-[var(--color-border)] px-3 py-1.5 text-sm text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-soft)]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="cursor-pointer rounded-md bg-[var(--color-emerald)] px-3 py-1.5 text-sm font-semibold text-[var(--color-text-inverse)] transition hover:bg-[var(--color-emerald-hover)] disabled:opacity-60"
                >
                  {isSubmitting ? "Saving..." : "Save Complaint"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </DashboardLayout>
  );
}

type StatCardProps = {
  label: string;
  value: number;
  tone: "default" | "open" | "progress" | "resolved";
};

function StatCard({ label, value, tone }: StatCardProps) {
  const toneClass =
    tone === "open"
      ? "bg-rose-50 text-rose-700 border-rose-200"
      : tone === "progress"
        ? "bg-amber-50 text-amber-700 border-amber-200"
        : tone === "resolved"
          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
          : "bg-slate-50 text-slate-800 border-slate-200";

  return (
    <div className={`rounded-xl border p-4 ${toneClass}`}>
      <p className="text-xs font-semibold uppercase tracking-wide">{label}</p>
      <p className="mt-2 text-2xl font-bold">{value}</p>
    </div>
  );
}
