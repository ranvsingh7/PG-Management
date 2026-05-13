"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { DashboardLayout } from "@/components/home/dashboard-layout";
import { SelectField } from "@/components/ui/select-field";
import { InvoiceDetailModal } from "@/components/ui/invoice-detail-modal";

type InvoiceStatus = "pending" | "paid" | "partial" | "overdue";

type InvoicePaymentHistoryEntry = {
  id: string;
  amount: number;
  paid_total: number;
  paid_at: string;
  method?: string;
  note?: string;
};

type PaymentInvoice = {
  id: string;
  invoice_number: string;
  tenant_name: string;
  building_name: string;
  room_number: string;
  period: string;
  amount: number;
  paid_amount: number;
  outstanding_amount: number;
  status: "pending" | "paid" | "partial";
  effective_status?: InvoiceStatus;
  due_date: string;
  payment_history?: InvoicePaymentHistoryEntry[];
  rent_amount?: number;
  electricity_amount?: number;
  security_deposit_amount?: number;
  created_at?: string;
};

type TenantPaymentHistoryRow = {
  id: string;
  paid_at: string;
  tenant_name: string;
  invoice_number: string;
  amount: number;
  paid_total: number;
  method: string;
  note: string;
};

type InvoiceResponse = {
  items: PaymentInvoice[];
  summary?: {
    total_invoice?: number;
    pending?: number;
    paid?: number;
    overdue?: number;
  };
  pagination?: {
    page: number;
    totalPages: number;
    total: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
};

const pageSize = 20;

const getMonthKey = (date = new Date()) => {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
};

const formatCurrency = (value: number) => {
  const amount = Number.isFinite(value) ? value : 0;
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(amount);
};

const toPrettyDate = (value: string) => {
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

export default function PaymentsPage() {
  const [month, setMonth] = useState(getMonthKey());
  const [searchText, setSearchText] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | InvoiceStatus>("all");
  const [invoices, setInvoices] = useState<PaymentInvoice[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [recordInvoice, setRecordInvoice] = useState<PaymentInvoice | null>(null);
  const [selectedInvoice, setSelectedInvoice] = useState<PaymentInvoice | null>(null);
  const [recordAmount, setRecordAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "online">("cash");
  const [paymentReference, setPaymentReference] = useState("");
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);

  const loadInvoices = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        period: month,
        page: "1",
        limit: String(pageSize),
      });

      if (searchText.trim()) {
        params.set("search", searchText.trim());
      }

      if (statusFilter !== "all") {
        params.set("status", statusFilter);
      }

      const response = await fetch(`/api/admin/invoices?${params.toString()}`, { cache: "no-store" });
      const data = (await response.json()) as InvoiceResponse | { message?: string };

      if (!response.ok) {
        const message = "message" in data ? data.message : "Failed to fetch payment records";
        setError(message || "Failed to fetch payment records");
        setInvoices([]);
        return;
      }

      setInvoices(Array.isArray((data as InvoiceResponse).items) ? (data as InvoiceResponse).items : []);
    } catch {
      setError("Unable to load payments right now.");
      setInvoices([]);
    } finally {
      setIsLoading(false);
    }
  }, [month, searchText, statusFilter]);

  useEffect(() => {
    loadInvoices();
  }, [loadInvoices]);

  const metrics = useMemo(() => {
    const totalCollectedThisMonth = invoices.reduce((sum, invoice) => sum + Number(invoice.paid_amount || 0), 0);
    const pendingInvoiceTotalPayment = invoices.reduce(
      (sum, invoice) => sum + Number(invoice.outstanding_amount || 0),
      0
    );
    const totalPayment = invoices.reduce((sum, invoice) => sum + Number(invoice.amount || 0), 0);

    return {
      totalCollectedThisMonth,
      pendingInvoiceTotalPayment,
      totalPayment,
    };
  }, [invoices]);

  const onOpenRecordPayment = (invoice: PaymentInvoice) => {
    setRecordInvoice(invoice);
    setRecordAmount("");
    setPaymentMethod("cash");
    setPaymentReference("");
    setPaymentError(null);
    setError(null);
    setSuccess(null);
  };

  const paymentHistoryRows = useMemo<TenantPaymentHistoryRow[]>(() => {
    const rows = invoices.flatMap((invoice) => {
      const entries = Array.isArray(invoice.payment_history) ? invoice.payment_history : [];
      return entries.map((entry) => ({
        id: String(entry.id || `${invoice.id}-${entry.paid_at}`),
        paid_at: entry.paid_at,
        tenant_name: invoice.tenant_name || "-",
        invoice_number: invoice.invoice_number || "-",
        amount: Number(entry.amount || 0),
        paid_total: Number(entry.paid_total || 0),
        method: String(entry.method || "cash"),
        note: String(entry.note || ""),
      }));
    });

    return rows
      .filter((row) => Number.isFinite(row.amount) && row.amount > 0)
      .sort((a, b) => new Date(b.paid_at || 0).getTime() - new Date(a.paid_at || 0).getTime());
  }, [invoices]);

  const onRecordPayment = async () => {
    if (!recordInvoice) {
      return;
    }

    const enteredAmount = Number(recordAmount);
    const currentPaid = Number(recordInvoice.paid_amount || 0);
    const totalAmount = Number(recordInvoice.amount || 0);
    const outstanding = Number(recordInvoice.outstanding_amount || 0);

    if (!Number.isFinite(enteredAmount) || enteredAmount <= 0) {
      setPaymentError("Enter a valid payment amount greater than 0.");
      return;
    }

    if (enteredAmount > outstanding) {
      setPaymentError("Payment amount cannot exceed outstanding amount.");
      return;
    }

    if (paymentMethod === "online" && !paymentReference.trim()) {
      setPaymentError("Please enter UTR/Ref No. for online payment.");
      return;
    }

    const nextPaidTotal = Number((currentPaid + enteredAmount).toFixed(2));
    const status: "partial" | "paid" = nextPaidTotal >= totalAmount ? "paid" : "partial";

    setIsRecording(true);
    setPaymentError(null);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(`/api/admin/invoices/${recordInvoice.id}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          paid_amount: status === "partial" ? nextPaidTotal : undefined,
          status,
          payment_method: paymentMethod,
          payment_note: paymentMethod === "online" ? paymentReference.trim() : "",
          payment_date: new Date().toISOString(),
        }),
      });

      const data = (await response.json()) as { message?: string };
      if (!response.ok) {
        setPaymentError(data.message || "Failed to record payment");
        return;
      }

      setSuccess("Payment recorded successfully.");
      setRecordInvoice(null);
      setRecordAmount("");
      setPaymentReference("");
      await loadInvoices();
    } catch {
      setPaymentError("Unable to record payment right now.");
    } finally {
      setIsRecording(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <section className="rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-[var(--shadow-feature)] sm:p-8">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--color-sky)]">
                Payment Tracking
              </p>
              <h1 className="mt-1 text-3xl font-black tracking-tight text-[var(--color-text-title)] sm:text-4xl">
                Manage payment records
              </h1>
              <p className="mt-2 text-sm text-[var(--color-text-muted)]">
                Record payments against invoices and monitor monthly cash flow.
              </p>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <MetricCard
            label="Total Collected This Month"
            value={formatCurrency(metrics.totalCollectedThisMonth)}
            tone="emerald"
          />
          <MetricCard
            label="Pending Invoice Total Payment"
            value={formatCurrency(metrics.pendingInvoiceTotalPayment)}
            tone="amber"
          />
          <MetricCard label="Total Payment" value={formatCurrency(metrics.totalPayment)} tone="sky" />
        </section>

        <section className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-feature)]">
          <div className="flex items-center justify-between border-b border-[var(--color-border)] px-5 py-4">
            <h2 className="text-base font-semibold text-[var(--color-text-title)]">Payment Record Table</h2>
            <p className="text-sm text-[var(--color-text-secondary)]">Month: {month}</p>
          </div>

          <div className="grid grid-cols-1 gap-3 border-b border-[var(--color-border)] px-5 py-4 sm:grid-cols-2 xl:grid-cols-3">
            <label className="text-sm font-medium text-[var(--color-text-secondary)]">
              Month
              <input
                type="month"
                value={month}
                onChange={(event) => setMonth(event.target.value)}
                className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm outline-none focus:border-[var(--color-sky)] focus:ring-2 focus:ring-[var(--color-sky-soft)]"
              />
            </label>

            <label className="text-sm font-medium text-[var(--color-text-secondary)]">
              Search
              <input
                type="text"
                value={searchText}
                onChange={(event) => setSearchText(event.target.value)}
                placeholder="Invoice no. or tenant"
                className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm outline-none focus:border-[var(--color-sky)] focus:ring-2 focus:ring-[var(--color-sky-soft)]"
              />
            </label>

            <SelectField
              label="Status"
              value={statusFilter}
              onChange={(value) => setStatusFilter(value as "all" | InvoiceStatus)}
              options={[
                { value: "all", label: "All" },
                { value: "pending", label: "Pending" },
                { value: "partial", label: "Partial" },
                { value: "paid", label: "Paid" },
                { value: "overdue", label: "Overdue" },
              ]}
            />
          </div>

          {error ? (
            <div className="mx-5 mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          ) : null}

          {success ? (
            <div className="mx-5 mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              {success}
            </div>
          ) : null}

          <div className="overflow-x-auto px-2 pb-3 sm:px-3">
            <table className="min-w-full divide-y divide-[var(--color-border)] text-sm">
              <thead className="bg-[var(--color-surface-muted)] text-left text-xs uppercase tracking-wide text-[var(--color-text-muted)]">
                <tr>
                  <th className="px-4 py-3">Invoice #</th>
                  <th className="px-4 py-3">Tenant</th>
                  <th className="px-4 py-3">Building / Room</th>
                  <th className="px-4 py-3 text-right">Total</th>
                  <th className="px-4 py-3 text-right">Paid</th>
                  <th className="px-4 py-3 text-right">Pending</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Action</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-[var(--color-border)] bg-[var(--color-surface)]">
                {isLoading ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-[var(--color-text-muted)]">
                      Loading payment records...
                    </td>
                  </tr>
                ) : null}

                {!isLoading && invoices.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-[var(--color-text-muted)]">
                      No payment records found for selected filters.
                    </td>
                  </tr>
                ) : null}

                {!isLoading &&
                  invoices.map((invoice) => {
                    const effectiveStatus = invoice.effective_status || invoice.status;
                    const statusTone =
                      effectiveStatus === "paid"
                        ? "bg-emerald-100 text-emerald-800"
                        : effectiveStatus === "partial"
                        ? "bg-amber-100 text-amber-800"
                        : effectiveStatus === "overdue"
                        ? "bg-rose-100 text-rose-800"
                        : "bg-slate-100 text-slate-700";

                    return (
                      <tr key={invoice.id} className="hover:bg-[var(--color-surface-soft)]">
                        <td className="px-4 py-3 font-semibold text-[var(--color-text-title)]">
                          <button
                            type="button"
                            onClick={() => setSelectedInvoice(invoice)}
                            className="cursor-pointer underline decoration-dotted underline-offset-4 transition hover:text-[var(--color-sky)]"
                          >
                            {invoice.invoice_number}
                          </button>
                        </td>
                        <td className="px-4 py-3 text-[var(--color-text-secondary)]">
                          <p className="font-medium text-[var(--color-text-title)]">{invoice.tenant_name}</p>
                          <p className="text-xs text-[var(--color-text-muted)]">Due: {toPrettyDate(invoice.due_date)}</p>
                        </td>
                        <td className="px-4 py-3 text-[var(--color-text-secondary)]">
                          <p>{invoice.building_name}</p>
                          <p className="text-xs text-[var(--color-text-muted)]">Room {invoice.room_number}</p>
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-[var(--color-text-title)]">
                          {formatCurrency(invoice.amount)}
                        </td>
                        <td className="px-4 py-3 text-right text-emerald-700">{formatCurrency(invoice.paid_amount)}</td>
                        <td className="px-4 py-3 text-right text-rose-700">
                          {formatCurrency(invoice.outstanding_amount)}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${statusTone}`}>
                            {effectiveStatus}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <button
                            type="button"
                            onClick={() => onOpenRecordPayment(invoice)}
                            className="cursor-pointer rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1.5 text-xs font-semibold text-[var(--color-text-secondary)] transition hover:bg-[var(--color-surface-soft)]"
                          >
                            Record Payment
                          </button>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </section>

        {paymentHistoryRows.length ? (
          <section className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-feature)]">
            <div className="flex items-center justify-between border-b border-[var(--color-border)] px-5 py-4">
              <h2 className="text-base font-semibold text-[var(--color-text-title)]">Tenant Payment History</h2>
              <span className="rounded-full border border-[var(--color-border)] bg-[var(--color-surface-muted)] px-2.5 py-1 text-xs font-semibold text-[var(--color-text-secondary)]">
                {paymentHistoryRows.length} entries
              </span>
            </div>

            <div className="overflow-x-auto px-2 pb-3 sm:px-3">
              <table className="min-w-full divide-y divide-[var(--color-border)] text-sm">
                <thead className="bg-[var(--color-surface-muted)] text-left text-xs uppercase tracking-wide text-[var(--color-text-muted)]">
                  <tr>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Tenant</th>
                    <th className="px-4 py-3">Invoice #</th>
                    <th className="px-4 py-3 text-right">Payment</th>
                    <th className="px-4 py-3 text-right">Paid Total</th>
                    <th className="px-4 py-3">Method</th>
                    <th className="px-4 py-3">UTR / Ref. No.</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-border)] bg-[var(--color-surface)]">
                  {paymentHistoryRows.map((row) => (
                    <tr key={row.id} className="hover:bg-[var(--color-surface-soft)]">
                      <td className="px-4 py-3 text-[var(--color-text-secondary)]">{toPrettyDate(row.paid_at)}</td>
                      <td className="px-4 py-3 font-medium text-[var(--color-text-title)]">{row.tenant_name}</td>
                      <td className="px-4 py-3 text-[var(--color-text-secondary)]">
                        <button
                          type="button"
                          onClick={() => {
                            const match = invoices.find((item) => item.invoice_number === row.invoice_number);
                            if (match) {
                              setSelectedInvoice(match);
                            }
                          }}
                          className="cursor-pointer underline decoration-dotted underline-offset-4 transition hover:text-[var(--color-sky)]"
                        >
                          {row.invoice_number}
                        </button>
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-emerald-700">{formatCurrency(row.amount)}</td>
                      <td className="px-4 py-3 text-right text-[var(--color-text-secondary)]">{formatCurrency(row.paid_total)}</td>
                      <td className="px-4 py-3 text-[var(--color-text-secondary)]">
                        {row.method.toLowerCase() === "online" ? "Online" : "Cash"}
                      </td>
                      <td className="px-4 py-3 text-[var(--color-text-secondary)]">{row.note.trim() || "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ) : null}

        {recordInvoice ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
            <div className="w-full max-w-md rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-[var(--shadow-card)]">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-xl font-black text-[var(--color-text-title)]">Record Payment</h3>
                  <p className="mt-1 text-sm text-[var(--color-text-muted)]">{recordInvoice.invoice_number || "Invoice"}</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setRecordInvoice(null);
                    setPaymentError(null);
                  }}
                  className="cursor-pointer rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-sm font-semibold text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-soft)]"
                >
                  Close
                </button>
              </div>

              <div className="mt-4 space-y-2 text-sm text-[var(--color-text-secondary)]">
                <p>Total: <span className="font-semibold text-[var(--color-text-title)]">{formatCurrency(Number(recordInvoice.amount || 0))}</span></p>
                <p>Already Paid: <span className="font-semibold text-emerald-700">{formatCurrency(Number(recordInvoice.paid_amount || 0))}</span></p>
                <p>Outstanding: <span className="font-semibold text-rose-700">{formatCurrency(Number(recordInvoice.outstanding_amount || 0))}</span></p>
              </div>

              <div className="mt-4">
                <label className="text-sm font-semibold text-[var(--color-text-secondary)]">
                  Payment Amount*
                  <input
                    type="number"
                    min={0}
                    value={recordAmount}
                    onChange={(event) => setRecordAmount(event.target.value)}
                    className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm outline-none focus:border-[var(--color-sky)] focus:ring-2 focus:ring-[var(--color-sky-soft)]"
                  />
                </label>
              </div>

              <div className="mt-4 grid gap-2">
                <p className="text-sm font-semibold text-[var(--color-text-secondary)]">Payment Method*</p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod("cash")}
                    className={`cursor-pointer rounded-lg px-3 py-2 text-sm font-semibold transition ${
                      paymentMethod === "cash"
                        ? "bg-[var(--color-sky)] text-[var(--color-text-inverse)]"
                        : "border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-soft)]"
                    }`}
                  >
                    Cash
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod("online")}
                    className={`cursor-pointer rounded-lg px-3 py-2 text-sm font-semibold transition ${
                      paymentMethod === "online"
                        ? "bg-[var(--color-sky)] text-[var(--color-text-inverse)]"
                        : "border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-soft)]"
                    }`}
                  >
                    Online
                  </button>
                </div>
              </div>

              {paymentMethod === "online" ? (
                <div className="mt-4">
                  <label className="text-sm font-semibold text-[var(--color-text-secondary)]">
                    UTR / Ref. No.*
                    <input
                      type="text"
                      value={paymentReference}
                      onChange={(event) => setPaymentReference(event.target.value)}
                      placeholder="Enter UTR or reference number"
                      className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm outline-none focus:border-[var(--color-sky)] focus:ring-2 focus:ring-[var(--color-sky-soft)]"
                    />
                  </label>
                </div>
              ) : null}

              {paymentError ? (
                <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                  {paymentError}
                </p>
              ) : null}

              <div className="mt-5 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setRecordInvoice(null);
                    setPaymentError(null);
                  }}
                  className="cursor-pointer inline-flex items-center justify-center rounded-xl border border-[var(--color-border)] px-4 py-2 text-sm font-semibold text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-soft)]"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={onRecordPayment}
                  disabled={isRecording}
                  className="cursor-pointer inline-flex items-center justify-center rounded-xl bg-[var(--color-emerald)] px-5 py-2 text-sm font-bold text-[var(--color-text-inverse)] shadow-[var(--shadow-cta)] transition hover:bg-[var(--color-emerald-hover)] disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {isRecording ? "Saving..." : "Save Payment"}
                </button>
              </div>
            </div>
          </div>
        ) : null}

        <InvoiceDetailModal
          isOpen={Boolean(selectedInvoice)}
          invoice={selectedInvoice}
          onClose={() => setSelectedInvoice(null)}
          settingsEndpoint="/api/admin/settings"
        />
      </div>
    </DashboardLayout>
  );
}

type MetricCardProps = {
  label: string;
  value: string;
  tone: "emerald" | "amber" | "sky";
};

function MetricCard({ label, value, tone }: MetricCardProps) {
  const toneClass =
    tone === "emerald"
      ? "bg-[var(--color-emerald-soft)] text-[var(--color-emerald-strong)]"
      : tone === "amber"
      ? "bg-[var(--color-amber-soft)] text-[var(--color-amber)]"
      : "bg-[var(--color-sky-soft)] text-[var(--color-sky)]";

  return (
    <article className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-[var(--shadow-feature)]">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--color-text-muted)]">{label}</p>
      <p className="mt-3 text-2xl font-black text-[var(--color-text-title)]">{value}</p>
      <span className={`mt-3 inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${toneClass}`}>Live</span>
    </article>
  );
}
