"use client";

import { useEffect, useMemo, useState } from "react";
import { DashboardLayout } from "@/components/home/dashboard-layout";

type Row = {
  id: string;
  tenant_id: string;
  tenant_name: string;
  room_number: string;
  total_amount: number;
  paid_amount: number;
  pending_amount: number;
  submitted_date: string;
  return_date: string | null;
  deduction_amount: number;
  deduction_reason: string;
  status: "pending" | "returned" | "deducted";
  deposit_status: "pending" | "partial submitted" | "submitted" | "return";
  notes: string;
  hasRecord: boolean;
};

type Tenant = {
  id: string;
  name: string;
  room_number: string;
  security_deposit_amount?: number;
  security_deposit?: number;
  created_at?: string;
};

type BackendSecurityDeposit = {
  id: string;
  tenant_name: string;
  room_number: string;
  total_amount?: number;
  collected_amount?: number;
  refundable_amount?: number;
  status?: "held" | "partially_refunded" | "refunded";
  collected_date?: string;
  refund_date?: string | null;
  notes?: string;
  created_at?: string;
};

const mapBackendStatusToRowStatus = (
  status: BackendSecurityDeposit["status"]
): Row["status"] => {
  if (status === "refunded") {
    return "returned";
  }

  if (status === "partially_refunded") {
    return "deducted";
  }

  return "pending";
};

const formatCurrency = (n: number) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(n || 0);

const formatDate = (value: string | null | undefined) => {
  if (!value) {
    return "-";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return date.toISOString().slice(0, 10);
};

const getDepositStatusClasses = (status: Row["deposit_status"]) => {
  if (status === "return") {
    return "bg-[var(--color-emerald-soft)] text-[var(--color-emerald-strong)]";
  }

  if (status === "submitted") {
    return "bg-[var(--color-sky-soft)] text-[var(--color-sky-strong)]";
  }

  if (status === "partial submitted") {
    return "bg-[var(--color-amber-soft)] text-[var(--color-amber-strong)]";
  }

  return "bg-slate-200 text-slate-700";
};

export default function SecurityDepositsPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [isReturningModal, setIsReturningModal] = useState(false);
  const [editingRow, setEditingRow] = useState<Row | null>(null);
  const [returnForm, setReturnForm] = useState({ deduction_amount: "", deduction_reason: "", return_date: "" });
  const [formError, setFormError] = useState<string | null>(null);

  const summary = useMemo(() => {
    const totalDeposit = rows.reduce((sum, row) => sum + row.total_amount, 0);
    const pending = rows.reduce((sum, row) => sum + row.pending_amount, 0);
    const toReturn = rows
      .filter((row) => row.status === "pending")
      .reduce((sum, row) => sum + Math.max(row.paid_amount - row.deduction_amount, 0), 0);
    return { totalDeposit, pending, toReturn };
  }, [rows]);

  const filteredRows = useMemo(() => {
    return rows.filter((row) => {
      const matchSearch = search.toLowerCase() === "" || 
        row.tenant_name.toLowerCase().includes(search.toLowerCase()) || 
        row.room_number.toLowerCase().includes(search.toLowerCase());
      return matchSearch;
    });
  }, [rows, search]);

  const loadRows = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [depositsResponse, tenantsResponse] = await Promise.all([
        fetch("/api/admin/security-deposits", { cache: "no-store" }),
        fetch("/api/admin/tenants", { cache: "no-store" }),
      ]);

      const depositsData = (await depositsResponse.json()) as BackendSecurityDeposit[] | { message?: string };
      const tenantsData = (await tenantsResponse.json()) as Tenant[] | { message?: string };

      if (!depositsResponse.ok) {
        const message = "message" in depositsData ? depositsData.message : "Failed to fetch security deposits";
        setError(message || "Failed to fetch security deposits");
        setRows([]);
        return;
      }

      if (!tenantsResponse.ok) {
        const message = "message" in tenantsData ? tenantsData.message : "Failed to fetch tenants";
        setError(message || "Failed to fetch tenants");
        setRows([]);
        return;
      }

      const records = Array.isArray(depositsData) ? depositsData : [];
      const tenants = Array.isArray(tenantsData) ? tenantsData : [];
      const recordByTenantKey = new Map<string, BackendSecurityDeposit>();

      records.forEach((record) => {
        const key = `${String(record.tenant_name || "").toLowerCase()}::${String(record.room_number || "").toLowerCase()}`;
        const existing = recordByTenantKey.get(key);

        if (!existing) {
          recordByTenantKey.set(key, record);
          return;
        }

        const existingTime = new Date(existing.created_at || 0).getTime();
        const nextTime = new Date(record.created_at || 0).getTime();
        if (nextTime >= existingTime) {
          recordByTenantKey.set(key, record);
        }
      });

      const rowsData = tenants
        .map((tenant) => {
          const key = `${String(tenant.name || "").toLowerCase()}::${String(tenant.room_number || "").toLowerCase()}`;
          const record = recordByTenantKey.get(key);

          const fallbackAmount = Number(tenant.security_deposit_amount ?? tenant.security_deposit ?? 0);
          const totalAmountRaw = Number(record?.total_amount ?? fallbackAmount);
          const totalAmount = Number.isFinite(totalAmountRaw) ? totalAmountRaw : 0;
          const paidAmountRaw = Number(record?.collected_amount ?? 0);
          const paidAmount = Number.isFinite(paidAmountRaw)
            ? Math.max(Math.min(paidAmountRaw, totalAmount), 0)
            : 0;
          const pendingAmount = Math.max(Number((totalAmount - paidAmount).toFixed(2)), 0);

          const refundableAmountRaw = Number(record?.refundable_amount ?? paidAmount);
          const refundableAmount = Number.isFinite(refundableAmountRaw) ? refundableAmountRaw : paidAmount;
          const deductionAmount = Math.max(paidAmount - refundableAmount, 0);

          let depositStatus: Row["deposit_status"] = "pending";
          if (record?.status === "refunded" || record?.status === "partially_refunded") {
            depositStatus = "return";
          } else if (record) {
            if (paidAmount <= 0) {
              depositStatus = "pending";
            } else if (paidAmount < totalAmount) {
              depositStatus = "partial submitted";
            } else {
              depositStatus = "submitted";
            }
          }

          return {
            id: record?.id || `tenant:${tenant.id}`,
            tenant_id: tenant.id,
            tenant_name: tenant.name,
            room_number: tenant.room_number,
            total_amount: totalAmount,
            paid_amount: paidAmount,
            pending_amount: pendingAmount,
            submitted_date:
              record?.collected_date || record?.created_at || tenant.created_at || new Date().toISOString(),
            return_date: record?.refund_date || null,
            deduction_amount: Number.isFinite(deductionAmount) ? deductionAmount : 0,
            deduction_reason: deductionAmount > 0 ? String(record?.notes || "") : "",
            status: record ? mapBackendStatusToRowStatus(record.status) : ("pending" as const),
            deposit_status: depositStatus,
            notes: String(record?.notes || ""),
            hasRecord: Boolean(record),
          };
        })
        .filter((row) => row.total_amount > 0);

      setRows(rowsData);
    } catch {
      setError("Unable to load security deposits right now.");
      setRows([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { 
    loadRows();
  }, []);



  const onReturn = async () => {
    if (!editingRow) return;
    setFormError(null);

    const deductionAmount = Number(returnForm.deduction_amount || 0);
    if (!returnForm.return_date || !Number.isFinite(deductionAmount) || deductionAmount < 0 || deductionAmount > editingRow.paid_amount) {
      setFormError("Please fill all fields and ensure deduction is valid.");
      return;
    }

    const refundableAmount =
      deductionAmount === 0 ? 0 : Number((editingRow.paid_amount - deductionAmount).toFixed(2));

    try {
      let targetId = editingRow.id;

      if (!editingRow.hasRecord) {
        const createResponse = await fetch("/api/admin/security-deposits", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            tenant_name: editingRow.tenant_name,
            room_number: editingRow.room_number,
            total_amount: editingRow.total_amount,
            collected_amount: editingRow.paid_amount,
            collected_date: editingRow.submitted_date || new Date().toISOString().slice(0, 10),
            notes: "",
          }),
        });

        if (!createResponse.ok) {
          const createError = (await createResponse.json()) as { message?: string };
          setFormError(createError.message || "Failed to create security deposit record");
          return;
        }

        const created = (await createResponse.json()) as { id?: string };
        if (!created.id) {
          setFormError("Created deposit record missing id");
          return;
        }

        targetId = created.id;
      }

      const response = await fetch(`/api/admin/security-deposits/${targetId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          refund_date: returnForm.return_date,
          refundable_amount: refundableAmount,
          status: deductionAmount === 0 ? "refunded" : "partially_refunded",
          notes: returnForm.deduction_reason,
        }),
      });
      if (!response.ok) {
        const data = (await response.json()) as { message?: string };
        setFormError(data.message || "Failed to update record");
        return;
      }
      setIsReturningModal(false);
      setEditingRow(null);
      setReturnForm({ deduction_amount: "", deduction_reason: "", return_date: "" });
      setSuccess("Deposit returned successfully.");
      await loadRows();
    } catch {
      setFormError("Unable to process return right now.");
    }
  };

  const onDelete = async (id: string, hasRecord: boolean) => {
    if (!hasRecord) {
      setError("No security deposit record exists to delete for this tenant.");
      return;
    }

    try {
      const response = await fetch(`/api/admin/security-deposits/${id}`, { method: "DELETE" });
      if (!response.ok && response.status !== 204) {
        const data = (await response.json()) as { message?: string };
        setError(data.message || "Failed to delete record");
        return;
      }
      setSuccess("Record deleted.");
      await loadRows();
    } catch {
      setError("Unable to delete record right now.");
    }
  };

  return (
    <DashboardLayout>
      <section className="rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-[var(--shadow-feature)] sm:p-8">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--color-sky)]">Security Deposits</p>
          <h1 className="mt-1 text-3xl font-black tracking-tight text-[var(--color-text-title)] sm:text-4xl">Manage deposits</h1>
        </div>

        {/* Summary Cards */}
        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-[var(--shadow-card)]">
            <div className="flex items-center gap-4">
              <span className="inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-[var(--color-surface-muted)] text-blue-600">
                <svg viewBox="0 0 24 24" fill="none" className="h-7 w-7" aria-hidden="true">
                  <circle cx="12" cy="12" r="1" fill="currentColor" />
                  <path d="M12 2v6m0 4v6M2 12h6m4 0h6M6.22 6.22l4.24 4.24m2.08-2.08l4.24-4.24M6.22 17.78l4.24-4.24m2.08 2.08l4.24 4.24" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </span>
              <div>
                <p className="text-lg leading-tight font-semibold text-[var(--color-text-secondary)] sm:text-xl">Total Deposit</p>
                <p className="mt-1.5 text-2xl leading-none font-black text-blue-600 sm:text-3xl">{formatCurrency(summary.totalDeposit)}</p>
              </div>
            </div>
          </div>
          <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-[var(--shadow-card)]">
            <div className="flex items-center gap-4">
              <span className="inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-[var(--color-surface-muted)] text-amber-600">
                <svg viewBox="0 0 24 24" fill="none" className="h-7 w-7" aria-hidden="true">
                  <path d="M12 2a10 10 0 110 20 10 10 0 010-20zm0 2a8 8 0 100 16 8 8 0 000-16zm.5 2a1.5 1.5 0 110 3 1.5 1.5 0 010-3zm0 7h-1v5h4v-3h-2v-2z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
              <div>
                <p className="text-lg leading-tight font-semibold text-[var(--color-text-secondary)] sm:text-xl">Pending</p>
                <p className="mt-1.5 text-2xl leading-none font-black text-amber-600 sm:text-3xl">{formatCurrency(summary.pending)}</p>
              </div>
            </div>
          </div>
          <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-[var(--shadow-card)]">
            <div className="flex items-center gap-4">
              <span className="inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-[var(--color-surface-muted)] text-emerald-600">
                <svg viewBox="0 0 24 24" fill="none" className="h-7 w-7" aria-hidden="true">
                  <path d="M9 12l2 2 4-4m6 0H7a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2V6a2 2 0 00-2-2z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
              <div>
                <p className="text-lg leading-tight font-semibold text-[var(--color-text-secondary)] sm:text-xl">To Return</p>
                <p className="mt-1.5 text-2xl leading-none font-black text-emerald-600 sm:text-3xl">{formatCurrency(summary.toReturn)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Search Bar */}
        <div className="mt-5">
          <label className="grid gap-2">
            <span className="text-sm font-semibold text-[var(--color-text-secondary)]">Search</span>
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by tenant name or room number" className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 text-sm text-[var(--color-text-primary)] outline-none transition focus:border-[var(--color-sky)] focus:ring-2 focus:ring-[var(--color-sky-soft)]" />
          </label>
        </div>

        {success ? <p className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">{success}</p> : null}
        {error ? <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{error}</p> : null}

        {/* Table */}
        <div className="mt-5 overflow-x-auto rounded-2xl border border-[var(--color-border)]">
          <table className="w-full text-sm">
            <thead className="bg-[var(--color-surface-muted)]">
              <tr className="border-b border-[var(--color-border)]">
                <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-[0.08em] text-[var(--color-text-muted)]">Tenant</th>
                <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-[0.08em] text-[var(--color-text-muted)]">Room</th>
                <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-[0.08em] text-[var(--color-text-muted)]">Total</th>
                <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-[0.08em] text-[var(--color-text-muted)]">Paid</th>
                <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-[0.08em] text-[var(--color-text-muted)]">Pending</th>
                <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-[0.08em] text-[var(--color-text-muted)]">Status</th>
                <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-[0.08em] text-[var(--color-text-muted)]">Submitted Date</th>
                <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-[0.08em] text-[var(--color-text-muted)]">Returned</th>
                <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-[0.08em] text-[var(--color-text-muted)]">Deduction</th>
                <th className="px-4 py-3 text-center text-xs font-bold uppercase tracking-[0.08em] text-[var(--color-text-muted)]">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? <tr><td colSpan={10} className="px-4 py-6 text-center text-sm text-[var(--color-text-muted)]">Loading...</td></tr> : null}
              {!isLoading && filteredRows.length === 0 ? <tr><td colSpan={10} className="px-4 py-6 text-center text-sm text-[var(--color-text-muted)]">No records found.</td></tr> : null}
              {!isLoading && filteredRows.map((row) => (
                <tr key={row.id} className="border-b border-[var(--color-border)] transition hover:bg-[var(--color-surface-soft)]">
                  <td className="px-4 py-3">
                    <p className="font-semibold text-[var(--color-text-title)]">{row.tenant_name}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-[var(--color-sky-soft)] px-2 py-1 text-xs font-bold text-[var(--color-sky-strong)]">
                      {row.room_number}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-bold text-[var(--color-text-secondary)]">{formatCurrency(row.total_amount)}</td>
                  <td className="px-4 py-3 text-right font-bold text-emerald-700">{formatCurrency(row.paid_amount)}</td>
                  <td className="px-4 py-3 text-right font-bold text-amber-700">{formatCurrency(row.pending_amount)}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex rounded-full px-2 py-1 text-xs font-bold capitalize ${getDepositStatusClasses(row.deposit_status)}`}>
                      {row.deposit_status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-[var(--color-text-secondary)]">{formatDate(row.submitted_date)}</td>
                  <td className="px-4 py-3 text-sm text-[var(--color-text-secondary)]">{formatDate(row.return_date)}</td>
                  <td className="px-4 py-3 text-right">
                    <div>
                      <p className="font-bold text-[var(--color-text-secondary)]">{formatCurrency(row.deduction_amount)}</p>
                      {row.deduction_reason && <p className="text-xs text-[var(--color-text-muted)]">{row.deduction_reason}</p>}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-2">
                      {row.status === "pending" && row.paid_amount > 0 && (
                        <button
                          type="button"
                          title="Return deposit"
                          onClick={() => {
                            setEditingRow(row);
                            setReturnForm({ deduction_amount: "0", deduction_reason: "", return_date: new Date().toISOString().slice(0, 10) });
                            setFormError(null);
                            setIsReturningModal(true);
                          }}
                          className="cursor-pointer inline-flex h-6 w-6 items-center justify-center rounded-lg border border-emerald-300 bg-emerald-50 text-emerald-600 transition hover:bg-emerald-600 hover:border-emerald-600 hover:text-white"
                        >
                          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="h-3 w-3">
                            <path d="M4 12a8 8 0 0 0 15.5 3m-18-6a8 8 0 0 1 15.5-3M9 6h6v6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </button>
                      )}
                      {row.hasRecord && (
                        <button
                          type="button"
                          title="Delete record"
                          onClick={() => onDelete(row.id, row.hasRecord)}
                          className="cursor-pointer inline-flex h-6 w-6 items-center justify-center rounded-lg border border-red-300 bg-red-50 text-red-600 transition hover:bg-red-600 hover:border-red-600 hover:text-white"
                        >
                          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="h-3 w-3">
                            <path d="M19 7l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 7m5 4v6m4-6v6M9 7V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v3m-5 0h8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>



      {isReturningModal && editingRow ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4" role="dialog" aria-modal="true">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-[var(--shadow-card)] sm:p-7">
            <h3 className="text-2xl font-black text-[var(--color-text-title)]">Return Deposit</h3>

            <div className="mt-4 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--color-text-muted)]">Deposit Details</p>
              <div className="mt-3 space-y-1 text-sm text-[var(--color-text-secondary)]">
                <p><span className="font-semibold">Tenant:</span> {editingRow.tenant_name}</p>
                <p><span className="font-semibold">Room:</span> {editingRow.room_number}</p>
                <p><span className="font-semibold">Total Amount:</span> {formatCurrency(editingRow.total_amount)}</p>
                <p><span className="font-semibold">Paid Amount:</span> {formatCurrency(editingRow.paid_amount)}</p>
              </div>
            </div>

            <form onSubmit={(e) => { e.preventDefault(); onReturn(); }} className="mt-6 grid gap-5">
              <div className="grid gap-5 sm:grid-cols-2">
                <Field label="Return Date*" value={returnForm.return_date} onChange={(value) => setReturnForm((p) => ({ ...p, return_date: value }))} type="date" required />
                <Field label="Deduction Amount" value={returnForm.deduction_amount} onChange={(value) => setReturnForm((p) => ({ ...p, deduction_amount: value }))} type="number" placeholder="eg. 500" min={0} max={editingRow.paid_amount} />
              </div>

              <Field label="Deduction Reason" value={returnForm.deduction_reason} onChange={(value) => setReturnForm((p) => ({ ...p, deduction_reason: value }))} placeholder="eg. Damages, Maintenance costs" />

              {returnForm.deduction_amount && Number(returnForm.deduction_amount) > 0 && (
                <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--color-text-muted)]">Return Summary</p>
                  <div className="mt-3 space-y-1 text-sm text-[var(--color-text-secondary)]">
                    <p><span className="font-semibold">Paid Amount:</span> {formatCurrency(editingRow.paid_amount)}</p>
                    <p><span className="font-semibold">Deduction:</span> {formatCurrency(Number(returnForm.deduction_amount))}</p>
                    <p className="border-t border-[var(--color-border)] pt-1 font-bold text-[var(--color-text-title)]"><span className="font-semibold">Amount to Return:</span> {formatCurrency(editingRow.paid_amount - Number(returnForm.deduction_amount))}</p>
                  </div>
                </div>
              )}

              {formError ? <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{formError}</p> : null}

              <div className="flex justify-end gap-3">
                <button type="button" onClick={() => { setIsReturningModal(false); setEditingRow(null); setFormError(null); }} className="cursor-pointer inline-flex items-center justify-center rounded-xl border border-[var(--color-border)] px-4 py-2 text-sm font-semibold text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-soft)]">Cancel</button>
                <button type="submit" className="cursor-pointer inline-flex items-center justify-center rounded-xl bg-[var(--color-emerald)] px-5 py-2 text-sm font-bold text-[var(--color-text-inverse)] shadow-[var(--shadow-cta)] transition hover:bg-[var(--color-emerald-hover)]">Confirm Return</button>
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
  onChange?: (value: string) => void;
  required?: boolean;
  type?: "text" | "number" | "tel" | "date";
  placeholder?: string;
  min?: number;
  max?: number;
  disabled?: boolean;
};

function Field({ label, value, onChange, required = false, type = "text", placeholder, min, max, disabled = false }: FieldProps) {
  return (
    <label className="grid gap-2">
      <span className="text-sm font-semibold text-[var(--color-text-secondary)]">{label}</span>
      <input
        value={value}
        onChange={(event) => onChange?.(event.target.value)}
        required={required}
        type={type}
        placeholder={placeholder}
        min={min}
        max={max}
        disabled={disabled}
        className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 text-sm text-[var(--color-text-primary)] outline-none transition focus:border-[var(--color-sky)] focus:ring-2 focus:ring-[var(--color-sky-soft)] disabled:bg-[var(--color-surface-muted)] disabled:text-[var(--color-text-muted)]"
      />
    </label>
  );
}
