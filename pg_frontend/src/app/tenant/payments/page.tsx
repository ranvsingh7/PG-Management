"use client";

import { useEffect, useMemo, useState } from "react";
import { TenantLayout } from "@/components/tenant/tenant-layout";
import { InvoiceDetailModal } from "@/components/ui/invoice-detail-modal";

type Invoice = {
  id: string;
  invoice_number: string;
  invoice_type?: string;
  amount: number;
  paid_amount: number;
  outstanding_amount: number;
  due_date: string;
  status?: string;
  tenant_name?: string;
  building_name?: string;
  room_number?: string;
  period?: string;
  rent_amount?: number;
  electricity_amount?: number;
  security_deposit_amount?: number;
  created_at?: string;
};

type AllocationSegment = {
  from: string;
  to: string;
  occupants: number;
  units: number;
};

type TenantAllocation = {
  tenant_id: string;
  tenant_name: string;
  units: number;
  amount: number;
  share_percent: number;
  segments: AllocationSegment[];
};

type TenantElectricity = {
  month: string;
  building: { id: string; name: string };
  room: { id: string; room_number: string; capacity: number };
  rate_per_unit: number;
  total_units: number;
  total_amount: number;
  tenant_allocation: TenantAllocation | null;
  status: "ok" | "missing_end" | "missing_start" | "invalid_reading";
  unallocated_units: number;
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(Number.isFinite(value) ? value : 0);

export default function TenantPaymentsPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [electricityMonth, setElectricityMonth] = useState<string>(new Date().toISOString().slice(0, 7));
  const [electricity, setElectricity] = useState<TenantElectricity | null>(null);
  const [electricityError, setElectricityError] = useState<string | null>(null);

  useEffect(() => {
    const loadInvoices = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch("/api/tenant/invoices", { cache: "no-store" });
        const data = (await response.json()) as Invoice[] | { message?: string };

        if (!response.ok) {
          const message = "message" in data ? data.message : "Failed to load invoices";
          setError(message || "Failed to load invoices");
          return;
        }

        setInvoices(Array.isArray(data) ? data : []);
      } catch {
        setError("Unable to load invoices right now.");
      } finally {
        setIsLoading(false);
      }
    };

    loadInvoices();
  }, []);

  useEffect(() => {
    const loadElectricity = async () => {
      setElectricityError(null);
      try {
        const response = await fetch(`/api/tenant/electricity?month=${encodeURIComponent(electricityMonth)}`, {
          cache: "no-store",
        });
        const data = (await response.json()) as TenantElectricity | { message?: string };
        if (!response.ok || !("month" in data)) {
          setElectricity(null);
          setElectricityError((data as { message?: string }).message || "Unable to load electricity bill.");
          return;
        }
        setElectricity(data as TenantElectricity);
      } catch {
        setElectricity(null);
        setElectricityError("Unable to load electricity bill.");
      }
    };

    loadElectricity();
  }, [electricityMonth]);

  const summary = useMemo(() => {
    const total = invoices.reduce((sum, row) => sum + Number(row.amount || 0), 0);
    const paid = invoices.reduce((sum, row) => sum + Number(row.paid_amount || 0), 0);
    const pending = invoices.reduce((sum, row) => sum + Number(row.outstanding_amount || 0), 0);
    return { total, paid, pending };
  }, [invoices]);

  return (
    <TenantLayout>
      <section className="rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-[var(--shadow-feature)] sm:p-8">
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--color-sky)]">Payments</p>
        <h1 className="mt-2 text-3xl font-black tracking-tight text-[var(--color-text-title)]">Your invoices</h1>
        <p className="mt-2 text-sm text-[var(--color-text-muted)]">View rent and deposit invoices and track payment status.</p>

        {error ? (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        {isLoading ? (
          <div className="mt-6 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-6 text-sm text-[var(--color-text-muted)]">
            Loading invoices...
          </div>
        ) : (
          <>
            <div className="mt-6 grid gap-4 sm:grid-cols-3">
              <article className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[var(--color-text-muted)]">Total billed</p>
                <p className="mt-2 text-2xl font-black text-[var(--color-text-title)]">{formatCurrency(summary.total)}</p>
              </article>
              <article className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[var(--color-text-muted)]">Paid</p>
                <p className="mt-2 text-2xl font-black text-emerald-700">{formatCurrency(summary.paid)}</p>
              </article>
              <article className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[var(--color-text-muted)]">Pending</p>
                <p className="mt-2 text-2xl font-black text-rose-600">{formatCurrency(summary.pending)}</p>
              </article>
            </div>

            <div className="mt-6 overflow-x-auto rounded-2xl border border-[var(--color-border)]">
              <table className="w-full text-sm">
                <thead className="bg-[var(--color-surface-muted)] text-[var(--color-text-muted)]">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-[0.08em]">Invoice</th>
                    <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-[0.08em]">Type</th>
                    <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-[0.08em]">Due Date</th>
                    <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-[0.08em]">Amount</th>
                    <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-[0.08em]">Paid</th>
                    <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-[0.08em]">Outstanding</th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map((invoice) => (
                    <tr key={invoice.id} className="border-t border-[var(--color-border)]">
                      <td className="px-4 py-3 font-semibold text-[var(--color-text-title)]">
                        <button
                          type="button"
                          onClick={() => setSelectedInvoice(invoice)}
                          className="cursor-pointer underline decoration-dotted underline-offset-4 transition hover:text-[var(--color-sky)]"
                        >
                          {invoice.invoice_number}
                        </button>
                      </td>
                      <td className="px-4 py-3 text-[var(--color-text-secondary)]">{invoice.invoice_type || "rent"}</td>
                      <td className="px-4 py-3 text-[var(--color-text-secondary)]">
                        {new Date(invoice.due_date).toLocaleDateString("en-IN")}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-[var(--color-text-title)]">{formatCurrency(invoice.amount)}</td>
                      <td className="px-4 py-3 text-right font-semibold text-emerald-700">{formatCurrency(invoice.paid_amount)}</td>
                      <td className="px-4 py-3 text-right font-semibold text-rose-600">{formatCurrency(invoice.outstanding_amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-6 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[var(--color-text-muted)]">Electricity bill</p>
                  <h2 className="mt-1 text-xl font-black text-[var(--color-text-title)]">Your share</h2>
                </div>
                <input
                  type="month"
                  value={electricityMonth}
                  onChange={(event) => setElectricityMonth(event.target.value)}
                  className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-muted)] px-3 py-2 text-sm"
                />
              </div>

              {electricityError ? (
                <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
                  {electricityError}
                </div>
              ) : null}

              {electricity ? (
                <div className="mt-4 grid gap-4 lg:grid-cols-3">
                  <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-4 text-sm">
                    <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[var(--color-text-muted)]">Total room bill</p>
                    <p className="mt-2 text-2xl font-black text-[var(--color-text-title)]">
                      {formatCurrency(electricity.total_amount)}
                    </p>
                    <p className="mt-1 text-xs text-[var(--color-text-muted)]">
                      {electricity.total_units.toFixed(2)} units @ {formatCurrency(electricity.rate_per_unit)}
                    </p>
                  </div>
                  <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-4 text-sm">
                    <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[var(--color-text-muted)]">Your share</p>
                    <p className="mt-2 text-2xl font-black text-[var(--color-text-title)]">
                      {formatCurrency(electricity.tenant_allocation?.amount || 0)}
                    </p>
                    <p className="mt-1 text-xs text-[var(--color-text-muted)]">
                      {electricity.tenant_allocation?.units.toFixed(2) || "0.00"} units
                    </p>
                  </div>
                  <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-4 text-sm">
                    <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[var(--color-text-muted)]">Room</p>
                    <p className="mt-2 text-2xl font-black text-[var(--color-text-title)]">Room {electricity.room.room_number}</p>
                    <p className="mt-1 text-xs text-[var(--color-text-muted)]">{electricity.building.name}</p>
                  </div>

                  <div className="lg:col-span-3 rounded-xl border border-[var(--color-border)] p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[var(--color-text-muted)]">Split details</p>
                    {electricity.tenant_allocation?.segments?.length ? (
                      <div className="mt-3 space-y-2 text-xs text-[var(--color-text-secondary)]">
                        {electricity.tenant_allocation.segments.map((segment, index) => (
                          <div key={`${segment.from}-${index}`} className="flex items-center justify-between">
                            <span>
                              {segment.from} to {segment.to} ({segment.occupants} occupants)
                            </span>
                            <span>{segment.units.toFixed(2)} units</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="mt-3 text-sm text-[var(--color-text-muted)]">
                        Split details are not available yet.
                      </p>
                    )}
                  </div>
                </div>
              ) : null}
            </div>
          </>
        )}
      </section>
      <InvoiceDetailModal
        isOpen={Boolean(selectedInvoice)}
        invoice={selectedInvoice}
        onClose={() => setSelectedInvoice(null)}
        settingsEndpoint="/api/tenant/settings"
      />
    </TenantLayout>
  );
}
