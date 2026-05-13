"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { DashboardLayout } from "@/components/home/dashboard-layout";
import { InvoiceDetailModal } from "@/components/ui/invoice-detail-modal";

type Building = {
  id: string;
  name: string;
};

type InvoiceStatus = "pending" | "paid" | "partial" | "overdue";

type InvoiceRow = {
  id: string;
  invoice_number: string;
  tenant_name: string;
  building_name: string;
  room_number: string;
  period: string;
  rent_amount: number;
  electricity_amount: number;
  verification_amount?: number;
  verification_paid_amount?: number;
  security_deposit_amount: number;
  security_deposit_paid_amount: number;
  amount: number;
  due_date: string;
  status: "pending" | "paid" | "partial";
  effective_status: InvoiceStatus;
  paid_amount: number;
  outstanding_amount: number;
  is_first_invoice?: boolean;
};

type InvoiceSummary = {
  total_invoice: number;
  pending: number;
  paid: number;
  overdue: number;
};

type InvoicePagination = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
};

type InvoiceResponse = {
  items: InvoiceRow[];
  summary: InvoiceSummary;
  pagination: InvoicePagination;
};

const DEFAULT_SUMMARY: InvoiceSummary = {
  total_invoice: 0,
  pending: 0,
  paid: 0,
  overdue: 0,
};

const getDefaultPeriod = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
};

const getVisiblePages = (currentPage: number, totalPages: number) => {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const pages = new Set<number>([1, totalPages, currentPage - 1, currentPage, currentPage + 1]);
  return Array.from(pages)
    .filter((page) => page >= 1 && page <= totalPages)
    .sort((a, b) => a - b);
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

const statusBadgeClass: Record<InvoiceStatus, string> = {
  pending: "bg-amber-50 text-amber-700 ring-1 ring-amber-200",
  paid: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
  partial: "bg-sky-50 text-sky-700 ring-1 ring-sky-200",
  overdue: "bg-rose-50 text-rose-700 ring-1 ring-rose-200",
};

export default function InvoicesPage() {
  const [items, setItems] = useState<InvoiceRow[]>([]);
  const [summary, setSummary] = useState<InvoiceSummary>(DEFAULT_SUMMARY);
  const [pagination, setPagination] = useState<InvoicePagination>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
    hasNextPage: false,
    hasPrevPage: false,
  });

  const [buildings, setBuildings] = useState<Building[]>([]);

  const [tableMonth, setTableMonth] = useState(getDefaultPeriod());
  const [selectedBuilding, setSelectedBuilding] = useState("all");
  const [searchText, setSearchText] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | InvoiceStatus>("all");
  const [currentPage, setCurrentPage] = useState(1);

  const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false);
  const [generateMonth, setGenerateMonth] = useState(getDefaultPeriod());
  const [generateBuildingId, setGenerateBuildingId] = useState("all");

  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const [viewInvoice, setViewInvoice] = useState<InvoiceRow | null>(null);
  const [editInvoice, setEditInvoice] = useState<InvoiceRow | null>(null);
  const [deleteInvoiceId, setDeleteInvoiceId] = useState<string | null>(null);

  const [editRentAmount, setEditRentAmount] = useState("");
  const [editElectricityAmount, setEditElectricityAmount] = useState("");
  const [editSecurityDepositPaidAmount, setEditSecurityDepositPaidAmount] = useState("");
  const [editDueDate, setEditDueDate] = useState("");
  const [editStatus, setEditStatus] = useState<"pending" | "paid" | "partial">("pending");

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const pageSize = 10;

  const totalAmount = useMemo(
    () => items.reduce((sum, invoice) => sum + Number(invoice.amount || 0), 0),
    [items]
  );

  const fetchBuildings = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/buildings", { cache: "no-store" });
      const data = (await response.json()) as Building[] | { message?: string };

      if (!response.ok) {
        return;
      }

      setBuildings(Array.isArray(data) ? data : []);
    } catch {
      // no-op
    }
  }, []);

  const fetchInvoices = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const query = new URLSearchParams({
        period: tableMonth,
        page: String(currentPage),
        limit: String(pageSize),
      });

      if (searchText.trim()) {
        query.set("search", searchText.trim());
      }

      if (statusFilter !== "all") {
        query.set("status", statusFilter);
      }

      if (selectedBuilding !== "all") {
        query.set("building_id", selectedBuilding);
      }

      const response = await fetch(`/api/admin/invoices?${query.toString()}`, {
        cache: "no-store",
      });

      const data = (await response.json()) as InvoiceResponse | { message?: string };

      if (!response.ok) {
        const message = "message" in data ? data.message : "Failed to fetch invoices";
        setError(message || "Failed to fetch invoices");
        setItems([]);
        setSummary(DEFAULT_SUMMARY);
        return;
      }

      const payload = data as InvoiceResponse;
      setItems(Array.isArray(payload.items) ? payload.items : []);
      setSummary(payload.summary || DEFAULT_SUMMARY);
      setPagination(
        payload.pagination || {
          page: currentPage,
          limit: pageSize,
          total: 0,
          totalPages: 1,
          hasNextPage: false,
          hasPrevPage: false,
        }
      );
    } catch {
      setError("Unable to load invoices right now.");
      setItems([]);
      setSummary(DEFAULT_SUMMARY);
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, pageSize, searchText, selectedBuilding, statusFilter, tableMonth]);

  useEffect(() => {
    fetchBuildings();
  }, [fetchBuildings]);

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  useEffect(() => {
    setCurrentPage(1);
  }, [tableMonth, selectedBuilding, searchText, statusFilter]);

  const onGenerateInvoice = async () => {
    setIsGenerating(true);
    setError(null);
    setSuccess(null);

    try {
      const body: { period: string; building_id?: string } = { period: generateMonth };

      if (generateBuildingId !== "all") {
        body.building_id = generateBuildingId;
      }

      const response = await fetch("/api/admin/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = (await response.json()) as { message?: string; created_count?: number };

      if (!response.ok) {
        setError(data.message || "Failed to generate invoices");
        return;
      }

      const createdCount = Number(data.created_count || 0);
      setSuccess(data.message || `Generated ${createdCount} invoice(s)`);
      setCurrentPage(1);
      setIsGenerateModalOpen(false);
      setTableMonth(generateMonth);
      fetchInvoices();
    } catch {
      setError("Unable to generate invoices right now.");
    } finally {
      setIsGenerating(false);
    }
  };

  const loadInvoiceById = async (invoiceId: string) => {
    const response = await fetch(`/api/admin/invoices/${invoiceId}`, { cache: "no-store" });
    const data = (await response.json()) as InvoiceRow | { message?: string };

    if (!response.ok) {
      const message = "message" in data ? data.message : "Failed to fetch invoice";
      throw new Error(message || "Failed to fetch invoice");
    }

    return data as InvoiceRow;
  };

  const onViewInvoice = async (invoiceId: string) => {
    setActionLoadingId(invoiceId);
    setError(null);
    setSuccess(null);

    try {
      const invoice = await loadInvoiceById(invoiceId);
      setViewInvoice(invoice);
    } catch {
      setError("Unable to view invoice right now.");
    } finally {
      setActionLoadingId(null);
    }
  };

  const onEditInvoice = async (invoiceId: string) => {
    setActionLoadingId(invoiceId);
    setError(null);
    setSuccess(null);

    try {
      const invoice = await loadInvoiceById(invoiceId);
      setEditInvoice(invoice);
      setEditRentAmount(String(Number(invoice.rent_amount || 0)));
      setEditElectricityAmount(String(Number(invoice.electricity_amount || 0)));
      setEditSecurityDepositPaidAmount(String(Number(invoice.security_deposit_paid_amount || 0)));
      setEditDueDate(String(invoice.due_date || "").slice(0, 10));
      setEditStatus(invoice.status || "pending");
    } catch {
      setError("Unable to load invoice for edit right now.");
    } finally {
      setActionLoadingId(null);
    }
  };

  const onSaveInvoiceEdit = async () => {
    if (!editInvoice) {
      return;
    }

    const rent = Number(editRentAmount);
    const electricity = Number(editElectricityAmount);
    const securityDepositPaid = Number(editSecurityDepositPaidAmount);

    if (!Number.isFinite(rent) || rent < 0) {
      setError("Rent amount must be a non-negative number.");
      return;
    }

    if (!Number.isFinite(electricity) || electricity < 0) {
      setError("Electricity bill must be a non-negative number.");
      return;
    }

    if (!Number.isFinite(securityDepositPaid) || securityDepositPaid < 0) {
      setError("Security deposit paid amount must be a non-negative number.");
      return;
    }

    if (securityDepositPaid > Number(editInvoice.security_deposit_amount || 0)) {
      setError(`Security deposit paid cannot exceed ${editInvoice.security_deposit_amount}`);
      return;
    }

    setActionLoadingId(editInvoice.id);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(`/api/admin/invoices/${editInvoice.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rent_amount: rent,
          electricity_amount: electricity,
          security_deposit_paid_amount: securityDepositPaid,
          due_date: editDueDate,
          status: editStatus,
        }),
      });

      const data = (await response.json()) as { message?: string };
      if (!response.ok) {
        setError(data.message || "Failed to update invoice");
        return;
      }

      setSuccess("Invoice updated successfully.");
      setEditInvoice(null);
      fetchInvoices();
    } catch {
      setError("Unable to update invoice right now.");
    } finally {
      setActionLoadingId(null);
    }
  };

  const onDeleteInvoice = async () => {
    if (!deleteInvoiceId) {
      return;
    }

    setActionLoadingId(deleteInvoiceId);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(`/api/admin/invoices/${deleteInvoiceId}`, {
        method: "DELETE",
      });

      const data = (await response.json()) as { message?: string };
      if (!response.ok) {
        setError(data.message || "Failed to delete invoice");
        return;
      }

      setSuccess("Invoice deleted successfully.");
      setDeleteInvoiceId(null);
      fetchInvoices();
    } catch {
      setError("Unable to delete invoice right now.");
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
          <DashboardLayout>
            <div className="space-y-6">
              <section className="rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-[var(--shadow-feature)] sm:p-8">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--color-sky)]">
                      Billing and Invoicing
                    </p>
                    <h1 className="mt-1 text-3xl font-black tracking-tight text-[var(--color-text-title)] sm:text-4xl">
                      Manage invoices &amp; billing
                    </h1>
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsGenerateModalOpen(true)}
                    className="cursor-pointer inline-flex items-center justify-center rounded-xl bg-[var(--color-emerald)] px-4 py-2 text-sm font-bold text-[var(--color-text-inverse)] shadow-[var(--shadow-cta)] transition hover:bg-[var(--color-emerald-hover)]"
                  >
                    Generate Invoice
                  </button>
                </div>
              </section>

        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryCard label="Total Invoice" value={summary.total_invoice} />
          <SummaryCard label="Pending" value={summary.pending} tone="pending" />
          <SummaryCard label="Paid" value={summary.paid} tone="paid" />
          <SummaryCard label="Overdue" value={summary.overdue} tone="overdue" />
        </section>

        <section className="rounded-2xl border border-[var(--color-border)] bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
            <h2 className="text-base font-semibold text-[var(--color-text-title)]">Invoice Records</h2>
            <p className="mt-0.5 text-sm text-[var(--color-text-secondary)]">Page total: {formatCurrency(totalAmount)}</p>
          </div>

          <div className="grid grid-cols-1 gap-3 border-b border-slate-200 px-5 py-4 sm:grid-cols-2 xl:grid-cols-4">
            <label className="text-sm font-medium text-slate-700">
              Month
              <input
                type="month"
                value={tableMonth}
                onChange={(event) => setTableMonth(event.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-sky-200 focus:border-sky-400 focus:ring"
              />
            </label>

            <SelectField
              label="Building"
              value={selectedBuilding}
              onChange={setSelectedBuilding}
              options={[
                { value: "all", label: "All buildings" },
                ...buildings.map((building) => ({ value: building.id, label: building.name })),
              ]}
            />

            <label className="text-sm font-medium text-slate-700">
              Search
              <input
                type="text"
                value={searchText}
                onChange={(event) => setSearchText(event.target.value)}
                placeholder="Invoice no. or tenant"
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-sky-200 focus:border-sky-400 focus:ring"
              />
            </label>

            <SelectField
              label="Status"
              value={statusFilter}
              onChange={(value) => setStatusFilter(value as "all" | InvoiceStatus)}
              options={[
                { value: "all", label: "All" },
                { value: "pending", label: "Pending" },
                { value: "paid", label: "Paid" },
                { value: "partial", label: "Partial" },
                { value: "overdue", label: "Overdue" },
              ]}
            />
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">Invoice #</th>
                  <th className="px-4 py-3">Tenant</th>
                  <th className="px-4 py-3">Building</th>
                  <th className="px-4 py-3">Room</th>
                  <th className="px-4 py-3">Period</th>
                  <th className="px-4 py-3 text-right">Electricity Bill</th>
                  <th className="px-4 py-3 text-right">Amount</th>
                  <th className="px-4 py-3">Due Date</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100 bg-white text-slate-700">
                {isLoading ? (
                  <tr>
                    <td colSpan={10} className="px-4 py-10 text-center text-slate-500">
                      Loading invoices...
                    </td>
                  </tr>
                ) : items.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="px-4 py-10 text-center text-slate-500">
                      No invoices found for current filters.
                    </td>
                  </tr>
                ) : (
                  items.map((invoice) => (
                    <tr key={invoice.id}>
                      <td className="px-4 py-3 font-medium text-slate-900">
                        <button
                          type="button"
                          onClick={() => onViewInvoice(invoice.id)}
                          className="cursor-pointer underline decoration-dotted underline-offset-4 transition hover:text-sky-700"
                        >
                          {invoice.invoice_number}
                        </button>
                      </td>
                      <td className="px-4 py-3">{invoice.tenant_name}</td>
                      <td className="px-4 py-3">{invoice.building_name}</td>
                      <td className="px-4 py-3">{invoice.room_number}</td>
                      <td className="px-4 py-3">{invoice.period}</td>
                      <td className="px-4 py-3 text-right font-medium">
                        {formatCurrency(Number(invoice.electricity_amount || 0))}
                      </td>
                      <td className="px-4 py-3 text-right font-medium">{formatCurrency(Number(invoice.amount || 0))}</td>
                      <td className="px-4 py-3">{toPrettyDate(invoice.due_date)}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${statusBadgeClass[invoice.effective_status]}`}>
                          {invoice.effective_status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => onViewInvoice(invoice.id)}
                            disabled={actionLoadingId === invoice.id}
                            aria-label="View Invoice"
                            title="View Invoice"
                            className="cursor-pointer inline-flex h-8 w-8 items-center justify-center rounded-md text-sky-700 hover:bg-slate-100 hover:text-sky-900 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" aria-hidden="true">
                              <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                              <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.8" />
                            </svg>
                          </button>
                          <button
                            type="button"
                            onClick={() => onEditInvoice(invoice.id)}
                            disabled={actionLoadingId === invoice.id}
                            aria-label="Edit Invoice"
                            title="Edit Invoice"
                            className="cursor-pointer inline-flex h-8 w-8 items-center justify-center rounded-md text-amber-700 hover:bg-slate-100 hover:text-amber-900 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" aria-hidden="true">
                              <path d="M12 20h9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                              <path d="M16.5 3.5a2.1 2.1 0 1 1 3 3L7 19l-4 1 1-4 12.5-12.5z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteInvoiceId(invoice.id)}
                            disabled={actionLoadingId === invoice.id}
                            aria-label="Delete Invoice"
                            title="Delete Invoice"
                            className="cursor-pointer inline-flex h-8 w-8 items-center justify-center rounded-md text-rose-700 hover:bg-slate-100 hover:text-rose-800 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" aria-hidden="true">
                              <path d="M4 7h16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                              <path d="M10 11v6M14 11v6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                              <path d="M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 px-4 py-3 text-sm text-slate-600">
            <p>
              Showing page {pagination.page} of {Math.max(pagination.totalPages || 1, 1)} ({pagination.total} records)
            </p>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                disabled={!pagination.hasPrevPage}
                className="cursor-pointer rounded-md border border-slate-300 bg-white px-3 py-1.5 text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Previous
              </button>

              {getVisiblePages(pagination.page, Math.max(pagination.totalPages || 1, 1)).map((page) => (
                <button
                  key={page}
                  type="button"
                  onClick={() => setCurrentPage(page)}
                  className={`cursor-pointer rounded-md px-3 py-1.5 ${
                    page === pagination.page
                      ? "bg-sky-600 text-white"
                      : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  {page}
                </button>
              ))}

              <button
                type="button"
                onClick={() => setCurrentPage((prev) => prev + 1)}
                disabled={!pagination.hasNextPage}
                className="cursor-pointer rounded-md border border-slate-300 bg-white px-3 py-1.5 text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        </section>

        <InvoiceDetailModal
          isOpen={Boolean(viewInvoice)}
          invoice={viewInvoice}
          onClose={() => setViewInvoice(null)}
          title="Invoice Preview"
          settingsEndpoint="/api/admin/settings"
        />

        {editInvoice ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
            <div className="w-full max-w-2xl rounded-2xl border border-[var(--color-border)] bg-white p-6 shadow-xl">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-xl font-semibold text-slate-900">Edit Invoice</h3>
                  <p className="text-sm text-slate-600">{editInvoice.invoice_number}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setEditInvoice(null)}
                  className="cursor-pointer rounded-md border border-slate-300 px-3 py-1 text-sm text-slate-700 hover:bg-slate-100"
                >
                  Close
                </button>
              </div>

              <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label className="text-sm font-medium text-slate-700">
                  Rent Amount
                  <input
                    type="number"
                    min={0}
                    value={editRentAmount}
                    onChange={(event) => setEditRentAmount(event.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                </label>
                <label className="text-sm font-medium text-slate-700">
                  Electricity Bill
                  <input
                    type="number"
                    min={0}
                    value={editElectricityAmount}
                    onChange={(event) => setEditElectricityAmount(event.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                </label>
                {editInvoice && editInvoice.security_deposit_amount > 0 && (
                  <label className="text-sm font-medium text-slate-700">
                    Security Deposit Paid
                    <div className="mt-1 text-xs text-slate-600">
                      (Max: ₹{Number(editInvoice.security_deposit_amount || 0).toLocaleString("en-IN")})
                    </div>
                    <input
                      type="number"
                      min={0}
                      max={editInvoice.security_deposit_amount}
                      value={editSecurityDepositPaidAmount}
                      onChange={(event) => setEditSecurityDepositPaidAmount(event.target.value)}
                      className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    />
                  </label>
                )}
                <label className="text-sm font-medium text-slate-700">
                  Due Date
                  <input
                    type="date"
                    value={editDueDate}
                    onChange={(event) => setEditDueDate(event.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                </label>
                <SelectField
                  label="Status"
                  value={editStatus}
                  onChange={(value) => setEditStatus(value as "pending" | "paid" | "partial")}
                  options={[
                    { value: "pending", label: "Pending" },
                    { value: "partial", label: "Partial" },
                    { value: "paid", label: "Paid" },
                  ]}
                />
              </div>

              <div className="mt-5 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditInvoice(null)}
                  className="cursor-pointer rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={onSaveInvoiceEdit}
                  disabled={actionLoadingId === editInvoice.id}
                  className="cursor-pointer rounded-md bg-sky-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-sky-700 disabled:opacity-60"
                >
                  {actionLoadingId === editInvoice.id ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </div>
          </div>
        ) : null}

        {deleteInvoiceId ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
            <div className="w-full max-w-md rounded-2xl border border-[var(--color-border)] bg-white p-6 shadow-xl">
              <h3 className="text-lg font-semibold text-slate-900">Delete Invoice?</h3>
              <p className="mt-2 text-sm text-slate-600">This action cannot be undone.</p>
              <div className="mt-5 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setDeleteInvoiceId(null)}
                  className="cursor-pointer rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={onDeleteInvoice}
                  disabled={actionLoadingId === deleteInvoiceId}
                  className="cursor-pointer rounded-md bg-rose-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-rose-700 disabled:opacity-60"
                >
                  {actionLoadingId === deleteInvoiceId ? "Deleting..." : "Delete"}
                </button>
              </div>
            </div>
          </div>
        ) : null}

        {isGenerateModalOpen ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
            <div className="w-full max-w-lg rounded-2xl border border-[var(--color-border)] bg-white p-6 shadow-xl">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-xl font-semibold text-slate-900">Generate Invoice</h3>
                  <p className="text-sm text-slate-600">Select month and building for invoice generation.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsGenerateModalOpen(false)}
                  className="cursor-pointer rounded-md border border-slate-300 px-3 py-1 text-sm text-slate-700 hover:bg-slate-100"
                >
                  Close
                </button>
              </div>

              <div className="mt-5 grid grid-cols-1 gap-3">
                <label className="text-sm font-medium text-slate-700">
                  Invoice Month
                  <input
                    type="month"
                    value={generateMonth}
                    onChange={(event) => setGenerateMonth(event.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                </label>

                <SelectField
                  label="Building"
                  value={generateBuildingId}
                  onChange={setGenerateBuildingId}
                  options={[
                    { value: "all", label: "All buildings" },
                    ...buildings.map((building) => ({ value: building.id, label: building.name })),
                  ]}
                />
              </div>

              <div className="mt-5 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsGenerateModalOpen(false)}
                  className="cursor-pointer rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={onGenerateInvoice}
                  disabled={isGenerating || !generateMonth}
                  className="cursor-pointer rounded-md bg-sky-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-sky-700 disabled:opacity-60"
                >
                  {isGenerating ? "Generating..." : "Generate"}
                </button>
              </div>
            </div>
          </div>
        ) : null}

        {error ? <p className="text-sm text-rose-600">{error}</p> : null}
        {success ? <p className="text-sm text-emerald-600">{success}</p> : null}
      </div>
    </DashboardLayout>
  );
}

type SummaryCardProps = {
  label: string;
  value: number;
  tone?: "default" | "pending" | "paid" | "overdue";
};

function SummaryCard({ label, value, tone = "default" }: SummaryCardProps) {
  const toneClass =
    tone === "pending"
      ? "bg-amber-50 text-amber-700 border-amber-200"
      : tone === "paid"
        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
        : tone === "overdue"
          ? "bg-rose-50 text-rose-700 border-rose-200"
          : "bg-slate-50 text-slate-800 border-slate-200";

  return (
    <div className={`rounded-xl border p-4 ${toneClass}`}>
      <p className="text-xs font-semibold uppercase tracking-wide">{label}</p>
      <p className="mt-2 text-2xl font-bold">{value}</p>
    </div>
  );
}

type SelectFieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
  placeholder?: string;
  disabled?: boolean;
};

function SelectField({ label, value, onChange, options, placeholder, disabled = false }: SelectFieldProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const selectedOption = options.find((option) => option.value === value);

  const openAndHighlightCurrent = () => {
    setIsOpen(true);
    const selectedIndex = options.findIndex((option) => option.value === value);
    setHighlightedIndex(selectedIndex >= 0 ? selectedIndex : 0);
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      if (!isOpen) {
        openAndHighlightCurrent();
        return;
      }
      setHighlightedIndex((prev) => Math.min(Math.max(prev, 0) + 1, options.length - 1));
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      if (!isOpen) {
        openAndHighlightCurrent();
        return;
      }
      setHighlightedIndex((prev) => Math.max((prev < 0 ? 0 : prev) - 1, 0));
      return;
    }

    if (event.key === "Enter") {
      event.preventDefault();
      if (!isOpen) {
        openAndHighlightCurrent();
        return;
      }
      if (highlightedIndex >= 0 && highlightedIndex < options.length) {
        onChange(options[highlightedIndex].value);
        setIsOpen(false);
      }
      return;
    }

    if (event.key === "Escape") {
      setIsOpen(false);
      setHighlightedIndex(-1);
    }
  };

  useEffect(() => {
    if (!isOpen || highlightedIndex < 0) {
      return;
    }

    optionRefs.current[highlightedIndex]?.scrollIntoView({ block: "nearest" });
  }, [isOpen, highlightedIndex]);

  return (
    <div className="grid gap-2 relative">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      <div className="relative">
        <button
          type="button"
          disabled={disabled}
          onClick={() => {
            if (isOpen) {
              setIsOpen(false);
              setHighlightedIndex(-1);
            } else {
              openAndHighlightCurrent();
            }
          }}
          onKeyDown={handleKeyDown}
          className="cursor-pointer flex w-full items-center justify-between rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 outline-none ring-sky-200 transition hover:border-sky-400 focus:border-sky-400 focus:ring disabled:cursor-not-allowed disabled:opacity-70"
        >
          <span>{selectedOption?.label || placeholder || "Select an option"}</span>
          <svg viewBox="0 0 24 24" fill="none" className={`h-4 w-4 transition ${isOpen ? "rotate-180" : ""}`}>
            <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>

        {isOpen ? (
          <div className="absolute left-0 right-0 top-full z-50 mt-2 max-h-64 overflow-y-auto rounded-lg border border-slate-300 bg-white shadow-lg">
            {options.map((option, index) => (
              <button
                key={option.value}
                ref={(element) => {
                  optionRefs.current[index] = element;
                }}
                type="button"
                onClick={() => {
                  onChange(option.value);
                  setIsOpen(false);
                  setHighlightedIndex(-1);
                }}
                className={`cursor-pointer w-full px-3 py-2 text-left text-sm transition ${
                  option.value === value || index === highlightedIndex
                    ? "bg-sky-50 text-sky-700"
                    : "text-slate-700 hover:bg-slate-100"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        ) : null}
      </div>

      {isOpen ? <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} /> : null}
    </div>
  );
}
