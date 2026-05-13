"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { DashboardLayout } from "@/components/home/dashboard-layout";
import { SelectField } from "@/components/ui/select-field";
import { InputField } from "@/components/ui/input-field";
import { DateField } from "@/components/ui/date-field";

type Visitor = {
  id: string;
  tenant_id: string;
  building_id: string;
  building_name: string;
  visitor_name: string;
  phone: string;
  purpose: string;
  tenant_name: string;
  room_number: string;
  check_in_at: string;
  check_out_at: string | null;
  status: "checked_in" | "checked_out";
  notes: string;
};

type Tenant = {
  id: string;
  name: string;
  phone: string;
  building_id: string;
  room_number: string;
  status: "active" | "inactive";
};

type Building = {
  id: string;
  name: string;
};

type VisitorForm = {
  tenant_id: string;
  visitor_name: string;
  phone: string;
  purpose: string;
  check_in_date: string;
  check_in_time: string;
  notes: string;
};

const pad2 = (value: number) => String(value).padStart(2, "0");

const nowLocalDate = () => {
  const now = new Date();
  return `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}`;
};

const nowLocalTime = () => {
  const now = new Date();
  return `${pad2(now.getHours())}:${pad2(now.getMinutes())}`;
};

const defaultForm: VisitorForm = {
  tenant_id: "",
  visitor_name: "",
  phone: "",
  purpose: "delivery",
  check_in_date: nowLocalDate(),
  check_in_time: nowLocalTime(),
  notes: "",
};

const purposeOptions = [
  { value: "delivery", label: "Delivery" },
  { value: "meeting", label: "Meeting" },
  { value: "guest", label: "Guest" },
  { value: "maintenance", label: "Maintenance" },
  { value: "interview", label: "Interview" },
  { value: "inspection", label: "Inspection" },
  { value: "documentation", label: "Documentation" },
  { value: "medical", label: "Medical" },
  { value: "family_visit", label: "Family Visit" },
  { value: "service", label: "Service" },
  { value: "other", label: "Other" },
];

const prettyDateTime = (value: string | null) => {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleString("en-IN", { year: "numeric", month: "short", day: "2-digit", hour: "2-digit", minute: "2-digit" });
};

export default function VisitorsPage() {
  const [rows, setRows] = useState<Visitor[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [buildingFilter, setBuildingFilter] = useState("all");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState<VisitorForm>(defaultForm);
  const [formError, setFormError] = useState<string | null>(null);

  const loadRows = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/visitors", { cache: "no-store" });
      const data = (await response.json()) as Visitor[] | { message?: string };
      if (!response.ok) {
        const message = "message" in data ? data.message : "Failed to fetch visitors";
        setError(message || "Failed to fetch visitors");
        setRows([]);
        return;
      }
      setRows(Array.isArray(data) ? data : []);
    } catch {
      setError("Unable to load visitors right now.");
      setRows([]);
    } finally {
      setIsLoading(false);
    }
  };

  const loadTenants = async () => {
    try {
      const response = await fetch("/api/admin/tenants", { cache: "no-store" });
      const data = (await response.json()) as Tenant[] | { message?: string };
      if (!response.ok) {
        return;
      }
      setTenants(Array.isArray(data) ? data.filter((tenant) => tenant.status === "active") : []);
    } catch {
      setTenants([]);
    }
  };

  const loadBuildings = async () => {
    try {
      const response = await fetch("/api/admin/buildings", { cache: "no-store" });
      const data = (await response.json()) as Building[] | { message?: string };
      if (!response.ok) {
        return;
      }
      setBuildings(Array.isArray(data) ? data : []);
    } catch {
      setBuildings([]);
    }
  };

  useEffect(() => {
    loadRows();
    loadTenants();
    loadBuildings();
  }, []);

  const selectedTenant = useMemo(() => tenants.find((tenant) => tenant.id === form.tenant_id), [tenants, form.tenant_id]);

  const selectedTenantBuilding = useMemo(() => {
    if (!selectedTenant?.building_id) {
      return null;
    }
    return buildings.find((building) => building.id === selectedTenant.building_id) || null;
  }, [buildings, selectedTenant]);

  const filteredRows = useMemo(() => {
    const query = search.trim().toLowerCase();
    return rows.filter((row) => {
      if (buildingFilter !== "all" && row.building_id !== buildingFilter) {
        return false;
      }

      if (!query) {
        return true;
      }

      const values = [
        row.visitor_name,
        row.phone,
        row.purpose,
        row.tenant_name,
        row.room_number,
        row.building_name,
      ]
        .join(" ")
        .toLowerCase();

      return values.includes(query);
    });
  }, [rows, search, buildingFilter]);

  const summary = useMemo(() => {
    const now = new Date();
    const todayKey = `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}`;
    const monthKey = `${now.getFullYear()}-${now.getMonth()}`;

    let checkedIn = 0;
    let today = 0;
    let thisMonth = 0;

    rows.forEach((row) => {
      if (row.status === "checked_in") {
        checkedIn += 1;
      }

      const checkInDate = new Date(row.check_in_at);
      if (Number.isNaN(checkInDate.getTime())) {
        return;
      }

      const rowTodayKey = `${checkInDate.getFullYear()}-${checkInDate.getMonth()}-${checkInDate.getDate()}`;
      if (rowTodayKey === todayKey) {
        today += 1;
      }

      const rowMonthKey = `${checkInDate.getFullYear()}-${checkInDate.getMonth()}`;
      if (rowMonthKey === monthKey) {
        thisMonth += 1;
      }
    });

    return {
      total: rows.length,
      checkedIn,
      today,
      thisMonth,
    };
  }, [rows]);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);

    const tenant = tenants.find((item) => item.id === form.tenant_id);
    const visitor_name = form.visitor_name.trim();
    const purpose = form.purpose;
    const checkInDateTime = new Date(`${form.check_in_date}T${form.check_in_time}:00`);

    if (!tenant) {
      setFormError("Please select a tenant.");
      return;
    }

    if (!visitor_name || !purpose || !form.check_in_date || !form.check_in_time) {
      setFormError("Tenant, visitor name, purpose, check-in date and time are required.");
      return;
    }

    if (Number.isNaN(checkInDateTime.getTime())) {
      setFormError("Please enter a valid check-in date and time.");
      return;
    }

    const selectedBuilding = buildings.find((building) => building.id === tenant.building_id);

    try {
      const response = await fetch("/api/admin/visitors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenant_id: tenant.id,
          tenant_name: tenant.name,
          room_number: tenant.room_number,
          building_id: tenant.building_id,
          building_name: selectedBuilding?.name || "",
          visitor_name,
          phone: form.phone.trim(),
          purpose,
          check_in_at: checkInDateTime.toISOString(),
          notes: form.notes.trim(),
        }),
      });

      const data = (await response.json()) as { message?: string };
      if (!response.ok) {
        setFormError(data.message || "Failed to add visitor");
        return;
      }

      setIsModalOpen(false);
      setForm({ ...defaultForm, check_in_date: nowLocalDate(), check_in_time: nowLocalTime() });
      setSuccess("Visitor check-in added.");
      await loadRows();
    } catch {
      setFormError("Unable to save visitor right now.");
    }
  };

  const onCheckOut = async (id: string) => {
    try {
      const response = await fetch(`/api/admin/visitors/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "checked_out" }),
      });
      if (!response.ok) {
        const data = (await response.json()) as { message?: string };
        setError(data.message || "Failed to check out visitor");
        return;
      }
      setSuccess("Visitor checked out.");
      await loadRows();
    } catch {
      setError("Unable to update visitor right now.");
    }
  };

  const onDelete = async (id: string) => {
    try {
      const response = await fetch(`/api/admin/visitors/${id}`, { method: "DELETE" });
      if (!response.ok && response.status !== 204) {
        const data = (await response.json()) as { message?: string };
        setError(data.message || "Failed to delete visitor");
        return;
      }
      setSuccess("Visitor deleted.");
      await loadRows();
    } catch {
      setError("Unable to delete visitor right now.");
    }
  };

  return (
    <DashboardLayout>
      <section className="rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-[var(--shadow-feature)] sm:p-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--color-sky)]">Visitor Management</p>
            <h1 className="mt-1 text-3xl font-black tracking-tight text-[var(--color-text-title)] sm:text-4xl">Track visitors</h1>
          </div>
          <button
            onClick={() => {
              setFormError(null);
              setForm({ ...defaultForm, check_in_date: nowLocalDate(), check_in_time: nowLocalTime() });
              setIsModalOpen(true);
            }}
            className="cursor-pointer inline-flex items-center gap-2 rounded-xl bg-[var(--color-emerald)] px-4 py-2 text-sm font-bold text-[var(--color-text-inverse)] shadow-[var(--shadow-cta)] transition hover:bg-[var(--color-emerald-hover)]"
          >
            <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" aria-hidden="true">
              <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
            </svg>
            Log Visitor
          </button>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-[var(--shadow-card)]">
            <div className="flex items-center gap-4">
              <span className="inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-[var(--color-surface-muted)] text-blue-600">
                <svg viewBox="0 0 24 24" fill="none" className="h-7 w-7" aria-hidden="true">
                  <path d="M15.5 14a3 3 0 1 0-2.9-3.7M8.5 14a3 3 0 1 1 2.9-3.7M4 19a4 4 0 0 1 8 0M12 19a4.5 4.5 0 0 1 8 0" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                </svg>
              </span>
              <div>
                <p className="text-lg leading-tight font-semibold text-[var(--color-text-secondary)] sm:text-xl">Total Visitors</p>
                <p className="mt-1.5 text-2xl leading-none font-black text-blue-600 sm:text-3xl">{summary.total}</p>
              </div>
            </div>
          </div>
          <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-[var(--shadow-card)]">
            <div className="flex items-center gap-4">
              <span className="inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-[var(--color-surface-muted)] text-emerald-600">
                <svg viewBox="0 0 24 24" fill="none" className="h-7 w-7" aria-hidden="true">
                  <circle cx="9" cy="8" r="3" stroke="currentColor" strokeWidth="1.8" />
                  <path d="M4 19a5 5 0 0 1 10 0M16 10l2 2 3-3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
              <div>
                <p className="text-lg leading-tight font-semibold text-[var(--color-text-secondary)] sm:text-xl">Checked In</p>
                <p className="mt-1.5 text-2xl leading-none font-black text-emerald-600 sm:text-3xl">{summary.checkedIn}</p>
              </div>
            </div>
          </div>
          <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-[var(--shadow-card)]">
            <div className="flex items-center gap-4">
              <span className="inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-[var(--color-surface-muted)] text-amber-600">
                <svg viewBox="0 0 24 24" fill="none" className="h-7 w-7" aria-hidden="true">
                  <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.8" />
                  <path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M19.1 4.9l-1.4 1.4M6.3 17.7l-1.4 1.4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                </svg>
              </span>
              <div>
                <p className="text-lg leading-tight font-semibold text-[var(--color-text-secondary)] sm:text-xl">Today</p>
                <p className="mt-1.5 text-2xl leading-none font-black text-amber-600 sm:text-3xl">{summary.today}</p>
              </div>
            </div>
          </div>
          <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-[var(--shadow-card)]">
            <div className="flex items-center gap-4">
              <span className="inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-[var(--color-surface-muted)] text-violet-600">
                <svg viewBox="0 0 24 24" fill="none" className="h-7 w-7" aria-hidden="true">
                  <rect x="3" y="5" width="18" height="16" rx="2" stroke="currentColor" strokeWidth="1.8" />
                  <path d="M8 3v4M16 3v4M3 10h18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                </svg>
              </span>
              <div>
                <p className="text-lg leading-tight font-semibold text-[var(--color-text-secondary)] sm:text-xl">This Month</p>
                <p className="mt-1.5 text-2xl leading-none font-black text-violet-600 sm:text-3xl">{summary.thisMonth}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <label className="grid gap-2">
            <span className="text-sm font-semibold text-[var(--color-text-secondary)]">Search</span>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by visitor, tenant, phone or purpose"
              className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text-secondary)] outline-none transition focus:border-[var(--color-sky)] focus:ring-2 focus:ring-[var(--color-sky-soft)]"
            />
          </label>
          <SelectField
            label="Building"
            value={buildingFilter}
            onChange={(value) => setBuildingFilter(value)}
            options={[
              { value: "all", label: "All Buildings" },
              ...buildings.map((building) => ({
                value: building.id,
                label: building.name,
              })),
            ]}
          />
        </div>

        {success ? <p className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-700">{success}</p> : null}
        {error ? <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">{error}</p> : null}

        <div className="mt-5 overflow-x-auto rounded-xl border border-[var(--color-border)]">
          <table className="w-full text-sm">
            <thead className="bg-[var(--color-surface-muted)]">
              <tr>
                <th className="px-3 py-2 text-left">Visitor</th>
                <th className="px-3 py-2 text-left">Purpose</th>
                <th className="px-3 py-2 text-left">Tenant/Room</th>
                <th className="px-3 py-2 text-left">Building</th>
                <th className="px-3 py-2 text-left">Check In</th>
                <th className="px-3 py-2 text-left">Check Out</th>
                <th className="px-3 py-2 text-left">Status</th>
                <th className="px-3 py-2 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? <tr><td colSpan={8} className="px-3 py-6 text-center">Loading...</td></tr> : null}
              {!isLoading && filteredRows.length === 0 ? <tr><td colSpan={8} className="px-3 py-6 text-center">No visitors found.</td></tr> : null}
              {!isLoading && filteredRows.map((row) => (
                <tr key={row.id} className="border-t border-[var(--color-border)]">
                  <td className="px-3 py-2"><p className="font-semibold">{row.visitor_name}</p><p className="text-xs text-[var(--color-text-muted)]">{row.phone || "-"}</p></td>
                  <td className="px-3 py-2">{row.purpose}</td>
                  <td className="px-3 py-2">{row.tenant_name || "-"} / {row.room_number || "-"}</td>
                  <td className="px-3 py-2">{row.building_name || "-"}</td>
                  <td className="px-3 py-2">{prettyDateTime(row.check_in_at)}</td>
                  <td className="px-3 py-2">{prettyDateTime(row.check_out_at)}</td>
                  <td className="px-3 py-2"><span className={`rounded-full px-2 py-1 text-xs ${row.status === "checked_out" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>{row.status.replace("_", " ")}</span></td>
                  <td className="px-3 py-2">
                    <div className="flex gap-2">
                      {row.status === "checked_in" ? <button onClick={() => onCheckOut(row.id)} className="cursor-pointer rounded-md border border-[var(--color-border)] px-2 py-1 text-xs">Check Out</button> : null}
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
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-[var(--shadow-card)] sm:p-7">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-2xl font-black text-[var(--color-text-title)]">Log Visitor</h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="cursor-pointer rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-sm font-semibold text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-soft)]"
              >
                Close
              </button>
            </div>

            <form onSubmit={onSubmit} className="mt-6 grid gap-5">
              <div className="grid gap-5 sm:grid-cols-2">
              <SelectField
                label="Select Tenant*"
                value={form.tenant_id}
                onChange={(value) => setForm((p) => ({ ...p, tenant_id: value }))}
                options={tenants.map((tenant) => ({
                  value: tenant.id,
                  label: `${tenant.name} (${tenant.room_number})`,
                }))}
                placeholder="Choose tenant"
                searchable
                searchPlaceholder="Search tenant by name or room"
                required
              />
              <Field
                label="Visitor Name*"
                value={form.visitor_name}
                onChange={(value) => setForm((p) => ({ ...p, visitor_name: value }))}
                placeholder="Visitor name"
                required
              />
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
              <Field
                label="Phone Number"
                value={form.phone}
                onChange={(value) => setForm((p) => ({ ...p, phone: value }))}
                placeholder="Phone number"
                type="tel"
              />
              <SelectField
                label="Purpose of Visit*"
                value={form.purpose}
                onChange={(value) => setForm((p) => ({ ...p, purpose: value }))}
                options={purposeOptions}
                placeholder="Select purpose"
                required
              />
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <Field
                  label="Check-in Date*"
                  value={form.check_in_date}
                  onChange={(value) => setForm((p) => ({ ...p, check_in_date: value }))}
                  type="date"
                  required
                />
                <Field
                  label="Check-in Time*"
                  value={form.check_in_time}
                  onChange={(value) => setForm((p) => ({ ...p, check_in_time: value }))}
                  type="time"
                  required
                />
              </div>

              <Field
                label="Notes"
                value={form.notes}
                onChange={(value) => setForm((p) => ({ ...p, notes: value }))}
                placeholder="Any additional notes"
              />

              <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--color-text-muted)]">
                  Tenant Info
                </p>
                <div className="mt-2 space-y-1 text-sm text-[var(--color-text-secondary)]">
                  <p>Room: {selectedTenant?.room_number || "-"}</p>
                  <p>Building: {selectedTenantBuilding?.name || "-"}</p>
                </div>
              </div>

              {formError ? <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{formError}</p> : null}
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="cursor-pointer inline-flex items-center justify-center rounded-xl border border-[var(--color-border)] px-4 py-2 text-sm font-semibold text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-soft)]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="cursor-pointer inline-flex items-center justify-center rounded-xl bg-[var(--color-emerald)] px-5 py-2 text-sm font-bold text-[var(--color-text-inverse)] shadow-[var(--shadow-cta)] transition hover:bg-[var(--color-emerald-hover)]"
                >
                  Save Visitor
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </DashboardLayout>
  );
}

type FieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  type?: "text" | "tel" | "date" | "time";
  placeholder?: string;
};

function Field({ label, value, onChange, required = false, type = "text", placeholder }: FieldProps) {
  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => onChange(event.target.value);

  if (type === "date") {
    return (
      <DateField
        label={label}
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
        required={required}
      />
    );
  }

  return (
    <InputField
      label={label}
      value={value}
      onChange={handleChange}
      required={required}
      type={type}
      placeholder={placeholder}
    />
  );
}
