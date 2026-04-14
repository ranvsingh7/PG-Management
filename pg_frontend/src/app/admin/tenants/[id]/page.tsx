"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { DashboardLayout } from "@/components/home/dashboard-layout";
import { ToastViewport, useToast } from "@/components/ui/toast";

type Building = {
  id: string;
  name: string;
  city: string;
  area: string;
};

type Room = {
  id: string;
  building_id: string;
  room_number: string;
  capacity: number;
  occupied?: number;
};

type MoveHistoryEntry = {
  moved_at: string;
  move_date: string;
  from_building_id: string;
  from_building_name: string;
  from_room_number: string;
  to_building_id: string;
  to_building_name: string;
  to_room_number: string;
  previous_rent: number;
  new_rent: number;
};

type Tenant = {
  id: string;
  name: string;
  email: string;
  phone: string;
  building_id: string;
  room_number: string;
  check_in_date: string;
  check_out_date: string | null;
  rent: number;
  status: "active" | "inactive";
  agreement: string | null;
  approval_status: string;
  pg_id: string | null;
  created_by: string;
  created_by_name?: string | null;
  created_at: string;
  security_deposit_amount?: number;
  check_in_total_due?: number;
  check_in_payment_status?: "pending" | "paid";
  moving_history: MoveHistoryEntry[];
};

type InvoiceTransactionStatus = "pending" | "paid" | "partial" | "overdue";

type InvoicePaymentHistoryEntry = {
  id: string;
  amount: number;
  paid_total: number;
  paid_at: string;
  method?: string;
  note?: string;
  created_by_name?: string;
};

type InvoiceTransaction = {
  id: string;
  tenant_id?: string;
  tenant_name?: string;
  invoice_type?: "rent" | "security_deposit";
  invoice_number: string;
  period: string;
  rent_amount?: number;
  electricity_amount?: number;
  amount: number;
  paid_amount: number;
  outstanding_amount: number;
  due_date: string;
  security_deposit_amount?: number;
  security_deposit_paid_amount?: number;
  payment_history?: InvoicePaymentHistoryEntry[];
  created_at?: string;
  effective_status?: InvoiceTransactionStatus;
  status?: "pending" | "paid" | "partial";
  is_first_invoice?: boolean;
};

type PendingInvoice = InvoiceTransaction & {
  effective_status: InvoiceTransactionStatus;
};

type InvoiceTransactionResponse = {
  items?: InvoiceTransaction[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
  message?: string;
};

type EditForm = {
  name: string;
  phone: string;
  email: string;
  building_id: string;
  room_number: string;
  check_in_date: string;
  check_out_date: string;
  rent: string;
  status: "active" | "inactive";
  security_deposit_amount: string;
};

const initialEditForm: EditForm = {
  name: "",
  phone: "",
  email: "",
  building_id: "",
  room_number: "",
  check_in_date: "",
  check_out_date: "",
  rent: "",
  status: "active",
  security_deposit_amount: "",
};

const onlyDigits = (value: string) => value.replace(/\D/g, "");
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const formatIndianNumber = (value: number) => {
  const num = Number.isFinite(value) ? Math.trunc(value) : 0;
  const sign = num < 0 ? "-" : "";
  const digits = String(Math.abs(num));

  if (digits.length <= 3) {
    return `${sign}${digits}`;
  }

  const lastThree = digits.slice(-3);
  const rest = digits.slice(0, -3);
  const groupedRest = rest.replace(/\B(?=(\d{2})+(?!\d))/g, ",");
  return `${sign}${groupedRest},${lastThree}`;
};

const formatCurrencyInr = (value: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(Number.isFinite(value) ? value : 0);

const formatDisplayDate = (value: string | null | undefined) => {
  if (!value) {
    return "-";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(parsed);
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

export default function TenantDetailsPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const tenantId = String(params?.id || "");

  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [pageError, setPageError] = useState<string | null>(null);
  const [transactions, setTransactions] = useState<InvoiceTransaction[]>([]);
  const [transactionsError, setTransactionsError] = useState<string | null>(null);

  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editForm, setEditForm] = useState<EditForm>(initialEditForm);
  const [editError, setEditError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const [isRentModalOpen, setIsRentModalOpen] = useState(false);
  const [rentValue, setRentValue] = useState("");
  const [rentError, setRentError] = useState<string | null>(null);
  const [isUpdatingRent, setIsUpdatingRent] = useState(false);
  const [isTransactionsModalOpen, setIsTransactionsModalOpen] = useState(false);
  const [transactionsPage, setTransactionsPage] = useState(1);
  const [paymentInvoice, setPaymentInvoice] = useState<PendingInvoice | null>(null);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "online">("cash");
  const [paymentReference, setPaymentReference] = useState("");
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [isRecordingPayment, setIsRecordingPayment] = useState(false);
  const [paymentHistoryPage, setPaymentHistoryPage] = useState(1);

  const { toast, showToast } = useToast({ defaultDurationMs: 3200 });

  const roomOptions = useMemo(() => {
    if (!editForm.building_id) {
      return [];
    }
    return rooms.filter((room) => room.building_id === editForm.building_id);
  }, [rooms, editForm.building_id]);

  const buildingName = useMemo(() => {
    if (!tenant) {
      return "Unknown";
    }
    return buildings.find((b) => b.id === tenant.building_id)?.name || "Unknown";
  }, [tenant, buildings]);

  const loadPage = async () => {
    if (!tenantId) {
      setPageError("Invalid tenant id.");
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setPageError(null);

    try {
      const [tenantRes, buildingsRes, roomsRes] = await Promise.all([
        fetch(`/api/admin/tenants/${tenantId}`, { cache: "no-store" }),
        fetch("/api/admin/buildings", { cache: "no-store" }),
        fetch("/api/admin/rooms", { cache: "no-store" }),
      ]);

      const tenantData = (await tenantRes.json()) as Tenant | { message?: string };
      const buildingsData = (await buildingsRes.json()) as Building[] | { message?: string };
      const roomsData = (await roomsRes.json()) as Room[] | { message?: string };

      if (!tenantRes.ok) {
        const message = "message" in tenantData ? tenantData.message : "Failed to load tenant details.";
        setPageError(message || "Failed to load tenant details.");
        return;
      }

      const tenantPayload = tenantData as Tenant;
      setTenant(tenantPayload);
      setBuildings(Array.isArray(buildingsData) ? buildingsData : []);
      setRooms(Array.isArray(roomsData) ? roomsData : []);

      try {
        setTransactionsError(null);
        const query = new URLSearchParams({
          search: String(tenantPayload.name || ""),
          limit: "200",
          page: "1",
          status: "all",
        });

        const txResponse = await fetch(`/api/admin/invoices?${query.toString()}`, { cache: "no-store" });
        const txData = (await txResponse.json()) as InvoiceTransactionResponse;

        if (!txResponse.ok) {
          const message = txData.message || "Failed to load payment transactions.";
          setTransactionsError(message);
          setTransactions([]);
        } else {
          const rows = Array.isArray(txData.items) ? txData.items : [];
          const normalizedTenantName = String(tenantPayload.name || "").trim().toLowerCase();
          const filteredRows = rows.filter((row) => {
            const byId = row.tenant_id ? String(row.tenant_id) === tenantPayload.id : false;
            const byNameFallback =
              !row.tenant_id &&
              normalizedTenantName &&
              String(row.tenant_name || "").trim().toLowerCase() === normalizedTenantName;
            return byId || byNameFallback;
          });

          const sortedRows = filteredRows.sort((a, b) => {
            const aTime = new Date(a.created_at || a.due_date || 0).getTime();
            const bTime = new Date(b.created_at || b.due_date || 0).getTime();
            return bTime - aTime;
          });

          setTransactions(sortedRows);
        }
      } catch {
        setTransactionsError("Unable to load payment transactions right now.");
        setTransactions([]);
      }
    } catch {
      setPageError("Unable to load tenant details right now.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadPage();
  }, [tenantId]);

  const openEditModal = () => {
    if (!tenant) {
      return;
    }

    setEditForm({
      name: tenant.name,
      phone: tenant.phone,
      email: tenant.email,
      building_id: tenant.building_id,
      room_number: tenant.room_number,
      check_in_date: tenant.check_in_date,
      check_out_date: tenant.check_out_date || "",
      rent: String(tenant.rent || ""),
      status: tenant.status,
      security_deposit_amount: String(tenant.security_deposit_amount || ""),
    });
    setEditError(null);
    setIsEditOpen(true);
  };

  const onSaveEdit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!tenant) {
      return;
    }

    const fullName = editForm.name.trim();
    const phone = onlyDigits(editForm.phone);
    const email = editForm.email.trim().toLowerCase();
    const buildingId = editForm.building_id.trim();
    const roomNumber = editForm.room_number.trim();
    const checkInDate = editForm.check_in_date;
    const checkOutDate = editForm.check_out_date || null;
    const rent = Number(editForm.rent);
    const securityDepositAmount = editForm.security_deposit_amount ? Number(editForm.security_deposit_amount) : 0;
    const status = editForm.status;

    if (!fullName || !phone || !email || !buildingId || !roomNumber || !checkInDate || !editForm.rent) {
      const message = "Please fill all required fields.";
      setEditError(message);
      showToast(message, "error");
      return;
    }

    if (phone.length !== 10) {
      const message = "Phone number must be exactly 10 digits.";
      setEditError(message);
      showToast(message, "error");
      return;
    }

    if (!emailRegex.test(email)) {
      const message = "Please enter a valid email address.";
      setEditError(message);
      showToast(message, "error");
      return;
    }

    if (!Number.isFinite(rent) || rent < 0) {
      const message = "Monthly rent must be a valid non-negative number.";
      setEditError(message);
      showToast(message, "error");
      return;
    }

    if (!Number.isFinite(securityDepositAmount) || securityDepositAmount < 0) {
      const message = "Security deposit must be a valid non-negative number.";
      setEditError(message);
      showToast(message, "error");
      return;
    }

    setIsSaving(true);

    try {
      const response = await fetch(`/api/admin/tenants/${tenant.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: fullName,
          phone,
          email,
          building_id: buildingId,
          room_number: roomNumber,
          check_in_date: checkInDate,
          check_out_date: checkOutDate,
          rent,
          status,
          security_deposit_amount: securityDepositAmount,
          moving_history: tenant.moving_history || [],
        }),
      });

      const result = (await response.json()) as { message?: string; errors?: string[] };

      if (!response.ok) {
        const message = result.errors?.join(", ") || result.message || "Failed to update tenant.";
        setEditError(message);
        showToast(message, "error");
        return;
      }

      setIsEditOpen(false);
      showToast("Tenant updated successfully.", "success");
      await loadPage();
    } catch {
      const message = "Unable to update tenant right now.";
      setEditError(message);
      showToast(message, "error");
    } finally {
      setIsSaving(false);
    }
  };

  const onUpdateRent = async () => {
    if (!tenant) {
      return;
    }

    setRentError(null);
    const nextRent = Number(rentValue);

    if (!Number.isFinite(nextRent) || nextRent < 0) {
      const message = "New rent must be a valid non-negative number.";
      setRentError(message);
      showToast(message, "error");
      return;
    }

    setIsUpdatingRent(true);

    try {
      const response = await fetch(`/api/admin/tenants/${tenant.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          rent: nextRent,
          building_id: tenant.building_id,
          room_number: tenant.room_number,
          check_in_date: tenant.check_in_date,
          status: tenant.status,
          moving_history: tenant.moving_history || [],
        }),
      });

      const result = (await response.json()) as { message?: string; errors?: string[] };

      if (!response.ok) {
        const message = result.errors?.join(", ") || result.message || "Failed to update rent.";
        setRentError(message);
        showToast(message, "error");
        return;
      }

      setIsRentModalOpen(false);
      showToast("Rent updated successfully.", "success");
      await loadPage();
    } catch {
      const message = "Unable to update rent right now.";
      setRentError(message);
      showToast(message, "error");
    } finally {
      setIsUpdatingRent(false);
    }
  };

  const openRentModal = () => {
    if (!tenant) {
      return;
    }
    setRentValue(String(tenant.rent || ""));
    setRentError(null);
    setIsRentModalOpen(true);
  };

  const statusClasses =
    tenant?.status === "active"
      ? "border-emerald-300 bg-emerald-50 text-emerald-700"
      : "border-slate-300 bg-slate-100 text-slate-700";

  const paymentStatusClasses =
    tenant?.check_in_payment_status === "paid"
      ? "border-emerald-300 bg-emerald-50 text-emerald-700"
      : "border-amber-300 bg-amber-50 text-amber-700";

  const isCheckInPaid = tenant?.check_in_payment_status === "paid";
  const checkInAmountLabel = isCheckInPaid ? "Check-in Paid" : "Check-in Due";
  const checkInAmountClasses = isCheckInPaid ? "text-emerald-700" : "text-red-600";

  const transactionStatusClasses: Record<InvoiceTransactionStatus, string> = {
    pending: "border-amber-200 bg-amber-50 text-amber-700",
    paid: "border-emerald-200 bg-emerald-50 text-emerald-700",
    partial: "border-sky-200 bg-sky-50 text-sky-700",
    overdue: "border-rose-200 bg-rose-50 text-rose-700",
  };

  const transactionPageSize = 8;
  const transactionsTotalPages = Math.max(Math.ceil(transactions.length / transactionPageSize), 1);

  const securityDepositTotal = Number(tenant?.security_deposit_amount || 0);
  const securityDepositPaid = Math.min(
    securityDepositTotal,
    Number(
      transactions
        .reduce((sum, row) => sum + Number(row.security_deposit_paid_amount || 0), 0)
        .toFixed(2)
    )
  );
  const securityDepositRemaining = Math.max(Number((securityDepositTotal - securityDepositPaid).toFixed(2)), 0);
  const isSecurityDepositPaid = securityDepositTotal > 0 && securityDepositRemaining <= 0;

  const rentInvoices = transactions.filter((row) => (row.invoice_type || "rent") === "rent");
  const currentRentAmount = Number(tenant?.rent || 0);
  const currentRentPending = Number(
    rentInvoices
      .reduce((sum, row) => sum + Number(row.outstanding_amount || 0), 0)
      .toFixed(2)
  );
  const isRentFullyPaid = currentRentPending <= 0;

  const checkInDueTotal = Number((currentRentPending + securityDepositRemaining).toFixed(2));

  const checkInPendingBreakdown = [
    {
      label: "Security Deposit",
      amount: securityDepositRemaining,
      paidAmount: securityDepositPaid,
      isPaid: securityDepositRemaining <= 0,
    },
    {
      label: "Rent",
      amount: currentRentPending,
      paidAmount: Number((currentRentAmount - currentRentPending).toFixed(2)),
      isPaid: currentRentPending <= 0,
    },
  ];

  const paginatedTransactions = useMemo(() => {
    const safePage = Math.min(transactionsPage, transactionsTotalPages);
    const start = (safePage - 1) * transactionPageSize;
    return transactions.slice(start, start + transactionPageSize);
  }, [transactions, transactionsPage, transactionsTotalPages]);

  useEffect(() => {
    setTransactionsPage(1);
  }, [transactions.length]);

  const pendingInvoices = useMemo(() => {
    return transactions
      .map((invoice) => ({
        ...invoice,
        effective_status: (invoice.effective_status || invoice.status || "pending") as InvoiceTransactionStatus,
      }))
      .filter((invoice) => Number(invoice.outstanding_amount || 0) > 0)
      .filter((invoice) => ["pending", "partial", "overdue"].includes(invoice.effective_status))
      .sort((a, b) => new Date(a.due_date || 0).getTime() - new Date(b.due_date || 0).getTime());
  }, [transactions]);

  const allPaymentHistory = useMemo(() => {
    const rows = transactions.flatMap((invoice) => {
      const entries = Array.isArray(invoice.payment_history) ? invoice.payment_history : [];
      return entries.map((entry) => ({
        id: String(entry.id || `${invoice.id}-${entry.paid_at}`),
        invoice_number: invoice.invoice_number || "-",
        amount: Number(entry.amount || 0),
        paid_total: Number(entry.paid_total || 0),
        paid_at: entry.paid_at,
        method: entry.method || "cash",
        note: entry.note || "",
      }));
    });

    return rows
      .filter((row) => Number.isFinite(row.amount) && row.amount > 0)
      .sort((a, b) => new Date(b.paid_at || 0).getTime() - new Date(a.paid_at || 0).getTime());
  }, [transactions]);

  const paymentHistoryPageSize = 8;
  const paymentHistoryTotalPages = Math.max(Math.ceil(allPaymentHistory.length / paymentHistoryPageSize), 1);

  const paginatedPaymentHistory = useMemo(() => {
    const safePage = Math.min(paymentHistoryPage, paymentHistoryTotalPages);
    const start = (safePage - 1) * paymentHistoryPageSize;
    return allPaymentHistory.slice(start, start + paymentHistoryPageSize);
  }, [allPaymentHistory, paymentHistoryPage, paymentHistoryTotalPages]);

  useEffect(() => {
    setPaymentHistoryPage(1);
  }, [allPaymentHistory.length]);

  const openPaymentModal = (invoice: PendingInvoice) => {
    setPaymentInvoice(invoice);
    setPaymentAmount("");
    setPaymentMethod("cash");
    setPaymentReference("");
    setPaymentError(null);
  };

  const onRecordPayment = async () => {
    if (!paymentInvoice) {
      return;
    }

    const entered = Number(paymentAmount);
    const currentPaid = Number(paymentInvoice.paid_amount || 0);
    const totalAmount = Number(paymentInvoice.amount || 0);
    const outstanding = Number(paymentInvoice.outstanding_amount || 0);

    if (!Number.isFinite(entered) || entered <= 0) {
      setPaymentError("Enter a valid payment amount greater than 0.");
      return;
    }

    if (entered > outstanding) {
      setPaymentError("Payment amount cannot exceed outstanding amount.");
      return;
    }

    if (paymentMethod === "online" && !paymentReference.trim()) {
      setPaymentError("Please enter UTR/Ref No. for online payment.");
      return;
    }

    const nextPaidTotal = Number((currentPaid + entered).toFixed(2));
    const nextStatus = nextPaidTotal >= totalAmount ? "paid" : "partial";

    setIsRecordingPayment(true);
    setPaymentError(null);

    try {
      const response = await fetch(`/api/admin/invoices/${paymentInvoice.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: nextStatus,
          paid_amount: nextStatus === "partial" ? nextPaidTotal : undefined,
          payment_method: paymentMethod,
          payment_note: paymentMethod === "online" ? paymentReference.trim() : "",
          payment_date: new Date().toISOString(),
        }),
      });

      const data = (await response.json()) as { message?: string };
      if (!response.ok) {
        setPaymentError(data.message || "Failed to record payment.");
        return;
      }

      setPaymentInvoice(null);
      setPaymentAmount("");
      setPaymentReference("");
      showToast("Payment recorded successfully.", "success");
      await loadPage();
    } catch {
      setPaymentError("Unable to record payment right now.");
    } finally {
      setIsRecordingPayment(false);
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-8 text-center text-sm text-[var(--color-text-muted)]">
          Loading tenant details...
        </div>
      </DashboardLayout>
    );
  }

  if (pageError || !tenant) {
    return (
      <DashboardLayout>
        <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm font-medium text-red-700">
          {pageError || "Tenant not found."}
        </div>
        <div className="mt-4">
          <Link
            href="/admin/tenants"
            className="inline-flex items-center justify-center rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2 text-sm font-semibold text-[var(--color-text-secondary)]"
          >
            Back to Tenants
          </Link>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <section className="relative overflow-hidden rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-[var(--shadow-feature)] sm:p-8">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -left-16 -top-16 h-40 w-40 rounded-full bg-[var(--color-sky-soft)] blur-3xl" />
          <div className="absolute -right-10 top-20 h-36 w-36 rounded-full bg-[var(--color-emerald-soft)] blur-3xl" />
        </div>

        <div className="relative rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-muted)]/80 p-5 sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
            <Link
              href="/admin/tenants"
              className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.14em] text-[var(--color-sky)] hover:underline"
            >
              Back To Tenant List
            </Link>
              <h1 className="mt-1 text-3xl font-black tracking-tight text-[var(--color-text-title)] sm:text-4xl">
                {tenant.name}
              </h1>
              <p className="mt-2 text-sm text-[var(--color-text-muted)]">
                {buildingName} / Room {tenant.room_number}
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.08em] ${statusClasses}`}>
                  {tenant.status === "active" ? "Active" : "Inactive"}
                </span>
                <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.08em] ${paymentStatusClasses}`}>
                  {tenant.check_in_payment_status === "paid" ? (
                    <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" aria-hidden="true">
                      <path d="M6.6 11.2 3.7 8.3l-1 1 3.9 3.9 6.8-6.8-1-1z" fill="currentColor" />
                    </svg>
                  ) : null}
                  Check-in {tenant.check_in_payment_status === "paid" ? "Paid" : "Pending"}
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={openRentModal}
                className="cursor-pointer inline-flex items-center justify-center rounded-xl border border-[var(--color-amber)] bg-[var(--color-amber-soft)] px-4 py-2 text-sm font-semibold text-[var(--color-amber)] transition hover:bg-[var(--color-amber)] hover:text-[var(--color-text-inverse)]"
              >
                Change Rent
              </button>
              <button
                type="button"
                onClick={openEditModal}
                className="cursor-pointer inline-flex items-center justify-center rounded-xl border border-[var(--color-sky)] bg-[var(--color-sky-soft)] px-4 py-2 text-sm font-semibold text-[var(--color-sky)] transition hover:bg-[var(--color-sky)] hover:text-[var(--color-text-inverse)]"
              >
                Edit Tenant
              </button>
            </div>
          </div>
        </div>

        <div className="relative mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[var(--color-text-muted)]">Monthly Rent</p>
            {isRentFullyPaid ? (
              <p className="mt-2 inline-flex items-center gap-2 text-2xl font-black text-emerald-700">
                <svg viewBox="0 0 16 16" className="h-5 w-5" aria-hidden="true">
                  <path d="M6.6 11.2 3.7 8.3l-1 1 3.9 3.9 6.8-6.8-1-1z" fill="currentColor" />
                </svg>
                {formatCurrencyInr(currentRentAmount)} Paid
              </p>
            ) : (
              <div className="mt-2 space-y-1">
                <p className="text-2xl font-black text-[var(--color-text-title)]">{formatCurrencyInr(currentRentAmount)}</p>
                <p className="inline-flex items-center gap-2 text-sm font-bold text-rose-700">
                  <svg viewBox="0 0 16 16" className="h-4 w-4" aria-hidden="true">
                    <path d="M8 1.5a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13Zm.75 3.25v4.5h-1.5v-4.5h1.5Zm0 5.5v1.5h-1.5v-1.5h1.5Z" fill="currentColor" />
                  </svg>
                  Pending: {formatCurrencyInr(currentRentPending)}
                </p>
              </div>
            )}
          </div>
          <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[var(--color-text-muted)]">Security Deposit</p>
            {isSecurityDepositPaid ? (
              <p className="mt-2 inline-flex items-center gap-2 text-2xl font-black text-emerald-700">
                <svg viewBox="0 0 16 16" className="h-5 w-5" aria-hidden="true">
                  <path d="M6.6 11.2 3.7 8.3l-1 1 3.9 3.9 6.8-6.8-1-1z" fill="currentColor" />
                </svg>
                {formatCurrencyInr(securityDepositTotal)} Paid
              </p>
            ) : (
              <p className="mt-2 inline-flex items-center gap-2 text-sm font-bold">
                <svg viewBox="0 0 16 16" className="h-4 w-4 text-amber-600" aria-hidden="true">
                  <path d="M8 1.5a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13Zm.75 3.25v4.5h-1.5v-4.5h1.5Zm0 5.5v1.5h-1.5v-1.5h1.5Z" fill="currentColor" />
                </svg>
                <span className="text-emerald-700">{formatCurrencyInr(securityDepositPaid)} paid</span>
                <span className="text-[var(--color-text-muted)]">/</span>
                <span className="text-rose-700">{formatCurrencyInr(securityDepositRemaining)} remaining</span>
              </p>
            )}
          </div>
          <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[var(--color-text-muted)]">{checkInAmountLabel}</p>
            {isCheckInPaid ? (
              <p className={`mt-2 inline-flex items-center gap-2 text-2xl font-black ${checkInAmountClasses}`}>
                <svg viewBox="0 0 16 16" className="h-5 w-5" aria-hidden="true">
                  <path d="M6.6 11.2 3.7 8.3l-1 1 3.9 3.9 6.8-6.8-1-1z" fill="currentColor" />
                </svg>
                Rs. {formatIndianNumber(tenant.check_in_total_due || 0)}
              </p>
            ) : (
              <div className="mt-2 space-y-2">
                <p className={`text-2xl font-black ${checkInAmountClasses}`}>Rs. {formatIndianNumber(checkInDueTotal)}</p>
                {checkInPendingBreakdown.length ? (
                  <div className="space-y-1 text-xs font-semibold">
                    {checkInPendingBreakdown.map((entry) => (
                      <p key={entry.label} className="flex items-center justify-between text-[var(--color-text-secondary)]">
                        <span>{entry.label} {entry.isPaid ? "Paid" : "Pending"}</span>
                        <span className={entry.isPaid ? "text-emerald-700" : "text-rose-700"}>
                          {formatCurrencyInr(entry.isPaid ? entry.paidAmount : entry.amount)}
                        </span>
                      </p>
                    ))}
                  </div>
                ) : null}
              </div>
            )}
          </div>
        </div>

        <div className="relative mt-4 grid gap-4 xl:grid-cols-2">
          <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-5">
            <p className="text-xs font-bold uppercase tracking-[0.08em] text-[var(--color-text-muted)]">Basic Info</p>
            <div className="mt-3 grid gap-3 text-sm text-[var(--color-text-secondary)] sm:grid-cols-2">
              <InfoRow label="Name" value={tenant.name} />
              <InfoRow label="Phone" value={tenant.phone} />
              <InfoRow label="Email" value={tenant.email} />
              <InfoRow label="Tenant ID" value={tenant.id} />
              <InfoRow label="Approval" value={tenant.approval_status || "-"} />
              <InfoRow label="PG ID" value={tenant.pg_id || "-"} />
            </div>
          </div>

          <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-5">
            <p className="text-xs font-bold uppercase tracking-[0.08em] text-[var(--color-text-muted)]">Stay Details</p>
            <div className="mt-3 grid gap-3 text-sm text-[var(--color-text-secondary)] sm:grid-cols-2">
              <InfoRow label="Building" value={buildingName} />
              <InfoRow label="Room" value={`Room ${tenant.room_number}`} />
              <InfoRow label="Check-in" value={formatDisplayDate(tenant.check_in_date)} />
              <InfoRow label="Check-out" value={formatDisplayDate(tenant.check_out_date)} />
              <InfoRow label="Agreement" value={tenant.agreement || "-"} />
              <InfoRow label="Created By" value={tenant.created_by_name || "-"} />
              <InfoRow label="Created At" value={formatDisplayDate(tenant.created_at)} />
            </div>
          </div>
        </div>

        {pendingInvoices.length ? (
          <div className="mt-5 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs font-bold uppercase tracking-[0.08em] text-[var(--color-text-muted)]">Pending Payment Invoices</p>
              <span className="rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-2.5 py-1 text-xs font-semibold text-[var(--color-text-secondary)]">
                {pendingInvoices.length} pending
              </span>
            </div>

            <div className="mt-4 overflow-x-auto rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]">
              <table className="min-w-full text-sm">
                <thead className="bg-[var(--color-surface-muted)] text-[var(--color-text-muted)]">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-[0.08em]">Invoice</th>
                    <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-[0.08em]">Due Date</th>
                    <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-[0.08em]">Amount</th>
                    <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-[0.08em]">Paid</th>
                    <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-[0.08em]">Outstanding</th>
                    <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-[0.08em]">Status</th>
                    <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-[0.08em]">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingInvoices.map((invoice) => (
                    <tr key={invoice.id} className="border-t border-[var(--color-border)]">
                      <td className="px-4 py-3 font-semibold text-[var(--color-text-title)]">{invoice.invoice_number || "-"}</td>
                      <td className="px-4 py-3 text-[var(--color-text-secondary)]">{formatDisplayDate(invoice.due_date)}</td>
                      <td className="px-4 py-3 text-right font-semibold text-[var(--color-text-title)]">{formatCurrencyInr(Number(invoice.amount || 0))}</td>
                      <td className="px-4 py-3 text-right font-semibold text-emerald-700">{formatCurrencyInr(Number(invoice.paid_amount || 0))}</td>
                      <td className="px-4 py-3 text-right font-semibold text-rose-700">{formatCurrencyInr(Number(invoice.outstanding_amount || 0))}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.06em] ${transactionStatusClasses[invoice.effective_status]}`}>
                          {invoice.effective_status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => openPaymentModal(invoice)}
                          className="cursor-pointer inline-flex items-center justify-center rounded-lg border border-[var(--color-emerald)] bg-[var(--color-emerald-soft)] px-3 py-1.5 text-xs font-bold uppercase tracking-[0.06em] text-[var(--color-emerald)] transition hover:bg-[var(--color-emerald)] hover:text-[var(--color-text-inverse)]"
                        >
                          Record Payment
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}

        {tenant.moving_history?.length ? (
          <div className="mt-5 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-5">
            <p className="text-xs font-bold uppercase tracking-[0.08em] text-[var(--color-text-muted)]">Moving History</p>
            <div className="mt-4 space-y-3">
              {[...tenant.moving_history].reverse().map((entry, index) => (
                <div
                  key={`${entry.moved_at}-${index}`}
                  className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 text-sm text-[var(--color-text-secondary)]"
                >
                  <p className="font-semibold text-[var(--color-text-title)]">
                    {entry.from_building_name} / Room {entry.from_room_number}
                    <span className="mx-2 text-[var(--color-text-muted)]">to</span>
                    {entry.to_building_name} / Room {entry.to_room_number}
                  </p>
                  <div className="mt-2 grid gap-2 text-xs text-[var(--color-text-muted)] sm:grid-cols-3">
                    <p>Move Date: {formatDisplayDate(entry.move_date)}</p>
                    <p>Old Rent: Rs. {formatIndianNumber(entry.previous_rent)}</p>
                    <p>New Rent: Rs. {formatIndianNumber(entry.new_rent)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {transactions.length ? (
          <div className="mt-5 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-5">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-bold uppercase tracking-[0.08em] text-[var(--color-text-muted)]">All Invoices</p>
              <span className="rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-2.5 py-1 text-xs font-semibold text-[var(--color-text-secondary)]">
                {transactions.length} records
              </span>
            </div>

            {transactionsError ? (
              <p className="mt-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                {transactionsError}
              </p>
            ) : (
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
                <p className="text-sm text-[var(--color-text-secondary)]">
                  View all tenant invoices in a full-screen modal table.
                </p>
                <button
                  type="button"
                  onClick={() => setIsTransactionsModalOpen(true)}
                  className="cursor-pointer inline-flex items-center justify-center rounded-xl border border-[var(--color-sky)] bg-[var(--color-sky-soft)] px-4 py-2 text-sm font-semibold text-[var(--color-sky)] transition hover:bg-[var(--color-sky)] hover:text-[var(--color-text-inverse)]"
                >
                  Show Invoices
                </button>
              </div>
            )}
          </div>
        ) : null}

        {allPaymentHistory.length ? (
          <div className="mt-5 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-5">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-bold uppercase tracking-[0.08em] text-[var(--color-text-muted)]">Payment History</p>
              <span className="rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-2.5 py-1 text-xs font-semibold text-[var(--color-text-secondary)]">
                {allPaymentHistory.length} entries
              </span>
            </div>

            <>
              <div className="mt-4 overflow-x-auto rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]">
                <table className="min-w-full text-sm">
                  <thead className="bg-[var(--color-surface-muted)] text-[var(--color-text-muted)]">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-[0.08em]">Date</th>
                      <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-[0.08em]">Invoice</th>
                      <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-[0.08em]">Payment</th>
                      <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-[0.08em]">Method</th>
                      <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-[0.08em]">UTR / Ref. No.</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedPaymentHistory.map((entry) => (
                      <tr key={entry.id} className="border-t border-[var(--color-border)]">
                        <td className="px-4 py-3 text-[var(--color-text-secondary)]">{formatDisplayDate(entry.paid_at)}</td>
                        <td className="px-4 py-3 font-semibold text-[var(--color-text-title)]">{entry.invoice_number}</td>
                        <td className="px-4 py-3 text-right font-semibold text-emerald-700">{formatCurrencyInr(entry.amount)}</td>
                        <td className="px-4 py-3 text-[var(--color-text-secondary)]">{String(entry.method || "cash").toLowerCase() === "online" ? "Online" : "Cash"}</td>
                        <td className="px-4 py-3 text-[var(--color-text-secondary)]">{entry.note?.trim() || "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm text-[var(--color-text-muted)]">
                  Page {Math.min(paymentHistoryPage, paymentHistoryTotalPages)} of {paymentHistoryTotalPages}
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setPaymentHistoryPage((prev) => Math.max(prev - 1, 1))}
                    disabled={paymentHistoryPage <= 1}
                    className="cursor-pointer rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-sm font-semibold text-[var(--color-text-secondary)] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Previous
                  </button>
                  {getVisiblePages(Math.min(paymentHistoryPage, paymentHistoryTotalPages), paymentHistoryTotalPages).map((page) => (
                    <button
                      key={page}
                      type="button"
                      onClick={() => setPaymentHistoryPage(page)}
                      className={`cursor-pointer rounded-lg px-3 py-1.5 text-sm font-semibold transition ${
                        Math.min(paymentHistoryPage, paymentHistoryTotalPages) === page
                          ? "bg-[var(--color-sky)] text-[var(--color-text-inverse)]"
                          : "border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-soft)]"
                      }`}
                    >
                      {page}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setPaymentHistoryPage((prev) => Math.min(prev + 1, paymentHistoryTotalPages))}
                    disabled={paymentHistoryPage >= paymentHistoryTotalPages}
                    className="cursor-pointer rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-sm font-semibold text-[var(--color-text-secondary)] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
              </div>
            </>
          </div>
        ) : null}
      </section>

      {isTransactionsModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4" role="dialog" aria-modal="true">
          <div className="max-h-[90vh] w-full max-w-6xl overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-card)]">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--color-border)] px-5 py-4">
              <div>
                <h3 className="text-xl font-black text-[var(--color-text-title)]">All Invoices</h3>
                <p className="mt-1 text-sm text-[var(--color-text-muted)]">{tenant.name} • {transactions.length} records</p>
              </div>
              <button
                type="button"
                onClick={() => setIsTransactionsModalOpen(false)}
                className="cursor-pointer rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-sm font-semibold text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-soft)]"
              >
                Close
              </button>
            </div>

            <div className="max-h-[calc(90vh-160px)] overflow-auto p-4 sm:p-5">
              {transactionsError ? (
                <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                  {transactionsError}
                </p>
              ) : null}

              {!transactionsError && !transactions.length ? (
                <p className="text-sm text-[var(--color-text-muted)]">No invoices found for this tenant.</p>
              ) : null}

              {!transactionsError && transactions.length ? (
                <div className="overflow-x-auto rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]">
                  <table className="min-w-full text-sm">
                    <thead className="bg-[var(--color-surface-muted)] text-[var(--color-text-muted)]">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-[0.08em]">Date</th>
                        <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-[0.08em]">Invoice</th>
                        <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-[0.08em]">Period</th>
                        <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-[0.08em]">Amount</th>
                        <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-[0.08em]">Paid</th>
                        <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-[0.08em]">Outstanding</th>
                        <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-[0.08em]">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedTransactions.map((row) => {
                        const status = (row.effective_status || row.status || "pending") as InvoiceTransactionStatus;
                        return (
                          <tr key={row.id} className="border-t border-[var(--color-border)]">
                            <td className="px-4 py-3 text-[var(--color-text-secondary)]">
                              {formatDisplayDate(row.created_at || row.due_date)}
                            </td>
                            <td className="px-4 py-3">
                              <p className="font-semibold text-[var(--color-text-title)]">{row.invoice_number || "-"}</p>
                              {row.is_first_invoice ? (
                                <span className="mt-1 inline-flex rounded-full border border-sky-200 bg-sky-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em] text-sky-700">
                                  First Invoice
                                </span>
                              ) : null}
                            </td>
                            <td className="px-4 py-3 text-[var(--color-text-secondary)]">{row.period || "-"}</td>
                            <td className="px-4 py-3 text-right font-semibold text-[var(--color-text-title)]">{formatCurrencyInr(Number(row.amount || 0))}</td>
                            <td className="px-4 py-3 text-right font-semibold text-emerald-700">{formatCurrencyInr(Number(row.paid_amount || 0))}</td>
                            <td className="px-4 py-3 text-right font-semibold text-rose-700">{formatCurrencyInr(Number(row.outstanding_amount || 0))}</td>
                            <td className="px-4 py-3">
                              <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.06em] ${transactionStatusClasses[status]}`}>
                                {status}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : null}
            </div>

            {!transactionsError && transactions.length ? (
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--color-border)] px-5 py-4">
                <p className="text-sm text-[var(--color-text-muted)]">
                  Page {Math.min(transactionsPage, transactionsTotalPages)} of {transactionsTotalPages}
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setTransactionsPage((prev) => Math.max(prev - 1, 1))}
                    disabled={transactionsPage <= 1}
                    className="cursor-pointer rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-sm font-semibold text-[var(--color-text-secondary)] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Previous
                  </button>
                  {getVisiblePages(Math.min(transactionsPage, transactionsTotalPages), transactionsTotalPages).map((page) => (
                    <button
                      key={page}
                      type="button"
                      onClick={() => setTransactionsPage(page)}
                      className={`cursor-pointer rounded-lg px-3 py-1.5 text-sm font-semibold transition ${
                        Math.min(transactionsPage, transactionsTotalPages) === page
                          ? "bg-[var(--color-sky)] text-[var(--color-text-inverse)]"
                          : "border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-soft)]"
                      }`}
                    >
                      {page}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setTransactionsPage((prev) => Math.min(prev + 1, transactionsTotalPages))}
                    disabled={transactionsPage >= transactionsTotalPages}
                    className="cursor-pointer rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-sm font-semibold text-[var(--color-text-secondary)] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      {paymentInvoice ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-md rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-[var(--shadow-card)]">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-xl font-black text-[var(--color-text-title)]">Record Payment</h3>
                <p className="mt-1 text-sm text-[var(--color-text-muted)]">{paymentInvoice.invoice_number || "Invoice"}</p>
              </div>
              <button
                type="button"
                onClick={() => setPaymentInvoice(null)}
                className="cursor-pointer rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-sm font-semibold text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-soft)]"
              >
                Close
              </button>
            </div>

            <div className="mt-4 space-y-2 text-sm text-[var(--color-text-secondary)]">
              <p>Total: <span className="font-semibold text-[var(--color-text-title)]">{formatCurrencyInr(Number(paymentInvoice.amount || 0))}</span></p>
              <p>Already Paid: <span className="font-semibold text-emerald-700">{formatCurrencyInr(Number(paymentInvoice.paid_amount || 0))}</span></p>
              <p>Outstanding: <span className="font-semibold text-rose-700">{formatCurrencyInr(Number(paymentInvoice.outstanding_amount || 0))}</span></p>
            </div>

            <div className="mt-4">
              <Field
                label="Payment Amount*"
                value={paymentAmount}
                onChange={setPaymentAmount}
                type="number"
                min={0}
                required
              />
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
                <Field
                  label="UTR / Ref. No.*"
                  value={paymentReference}
                  onChange={setPaymentReference}
                  placeholder="Enter UTR or reference number"
                  required
                />
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
                onClick={() => setPaymentInvoice(null)}
                className="cursor-pointer inline-flex items-center justify-center rounded-xl border border-[var(--color-border)] px-4 py-2 text-sm font-semibold text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-soft)]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={onRecordPayment}
                disabled={isRecordingPayment}
                className="cursor-pointer inline-flex items-center justify-center rounded-xl bg-[var(--color-emerald)] px-5 py-2 text-sm font-bold text-[var(--color-text-inverse)] shadow-[var(--shadow-cta)] transition hover:bg-[var(--color-emerald-hover)] disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isRecordingPayment ? "Saving..." : "Save Payment"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {isEditOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4" role="dialog" aria-modal="true">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-[var(--shadow-card)] sm:p-7">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-2xl font-black text-[var(--color-text-title)]">Edit Tenant</h3>
              <button
                type="button"
                onClick={() => setIsEditOpen(false)}
                className="cursor-pointer rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-sm font-semibold text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-soft)]"
              >
                Close
              </button>
            </div>

            <form onSubmit={onSaveEdit} className="mt-6 grid gap-5">
              <div className="grid gap-5 sm:grid-cols-2">
                <Field
                  label="Full Name*"
                  value={editForm.name}
                  onChange={(value) => setEditForm((prev) => ({ ...prev, name: value }))}
                  placeholder="eg. Rahul Sharma"
                  required
                />
                <Field
                  label="Phone Number*"
                  value={editForm.phone}
                  onChange={(value) => setEditForm((prev) => ({ ...prev, phone: onlyDigits(value).slice(0, 10) }))}
                  type="tel"
                  placeholder="eg. 9876543210"
                  required
                  inputMode="numeric"
                  maxLength={10}
                />
              </div>

              <Field
                label="Email Address*"
                value={editForm.email}
                onChange={(value) => setEditForm((prev) => ({ ...prev, email: value }))}
                type="email"
                placeholder="eg. user@example.com"
                required
              />

              <div className="grid gap-5 sm:grid-cols-2">
                <SelectField
                  label="Building*"
                  value={editForm.building_id}
                  onChange={(value) => setEditForm((prev) => ({ ...prev, building_id: value, room_number: "" }))}
                  required
                  options={buildings.map((building) => ({
                    value: building.id,
                    label: `${building.name} (${building.city}, ${building.area})`,
                  }))}
                />
                <SelectField
                  label="Room Number*"
                  value={editForm.room_number}
                  onChange={(value) => setEditForm((prev) => ({ ...prev, room_number: value }))}
                  required
                  options={roomOptions.map((room) => ({
                    value: room.room_number,
                    label: `Room ${room.room_number}`,
                  }))}
                  disabled={!editForm.building_id}
                />
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <Field
                  label="Check-in Date*"
                  value={editForm.check_in_date}
                  onChange={(value) => setEditForm((prev) => ({ ...prev, check_in_date: value }))}
                  type="date"
                  required
                />
                <Field
                  label="Check-out Date"
                  value={editForm.check_out_date}
                  onChange={(value) => setEditForm((prev) => ({ ...prev, check_out_date: value }))}
                  type="date"
                />
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <Field
                  label="Monthly Rent*"
                  value={editForm.rent}
                  onChange={(value) => setEditForm((prev) => ({ ...prev, rent: value }))}
                  type="number"
                  required
                  min={0}
                />
                <Field
                  label="Security Deposit Amount"
                  value={editForm.security_deposit_amount}
                  onChange={(value) => setEditForm((prev) => ({ ...prev, security_deposit_amount: value }))}
                  type="number"
                  min={0}
                />
              </div>

              <SelectField
                label="Status*"
                value={editForm.status}
                onChange={(value) => setEditForm((prev) => ({ ...prev, status: value as "active" | "inactive" }))}
                required
                options={[
                  { value: "active", label: "Active" },
                  { value: "inactive", label: "Inactive" },
                ]}
              />

              {editError ? (
                <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                  {editError}
                </p>
              ) : null}

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsEditOpen(false)}
                  className="cursor-pointer inline-flex items-center justify-center rounded-xl border border-[var(--color-border)] px-4 py-2 text-sm font-semibold text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-soft)]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="cursor-pointer inline-flex items-center justify-center rounded-xl bg-[var(--color-emerald)] px-5 py-2 text-sm font-bold text-[var(--color-text-inverse)] shadow-[var(--shadow-cta)] transition hover:bg-[var(--color-emerald-hover)] disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {isSaving ? "Updating..." : "Update Tenant"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {isRentModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-md rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-[var(--shadow-card)]">
            <h3 className="text-xl font-black text-[var(--color-text-title)]">Change Rent</h3>
            <p className="mt-2 text-sm text-[var(--color-text-muted)]">Update monthly rent for this tenant.</p>

            <div className="mt-4">
              <Field
                label="New Rent*"
                value={rentValue}
                onChange={setRentValue}
                type="number"
                min={0}
                required
              />
            </div>

            {rentError ? (
              <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                {rentError}
              </p>
            ) : null}

            <div className="mt-5 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsRentModalOpen(false)}
                className="cursor-pointer inline-flex items-center justify-center rounded-xl border border-[var(--color-border)] px-4 py-2 text-sm font-semibold text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-soft)]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={onUpdateRent}
                disabled={isUpdatingRent}
                className="cursor-pointer inline-flex items-center justify-center rounded-xl bg-[var(--color-emerald)] px-5 py-2 text-sm font-bold text-[var(--color-text-inverse)] shadow-[var(--shadow-cta)] transition hover:bg-[var(--color-emerald-hover)] disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isUpdatingRent ? "Updating..." : "Update Rent"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <ToastViewport toast={toast} />
    </DashboardLayout>
  );
}

type FieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: "text" | "number" | "tel" | "date" | "email";
  placeholder?: string;
  required?: boolean;
  min?: number;
  inputMode?: "text" | "numeric" | "decimal" | "tel" | "search" | "email" | "url";
  maxLength?: number;
};

type InfoRowProps = {
  label: string;
  value: string;
};

function InfoRow({ label, value }: InfoRowProps) {
  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2.5">
      <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--color-text-muted)]">{label}</p>
      <p className="mt-1 text-sm font-semibold text-[var(--color-text-secondary)]">{value}</p>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  required = false,
  min,
  inputMode,
  maxLength,
}: FieldProps) {
  return (
    <label className="grid gap-2">
      <span className="text-sm font-semibold text-[var(--color-text-secondary)]">{label}</span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        type={type}
        placeholder={placeholder}
        required={required}
        min={min}
        inputMode={inputMode}
        maxLength={maxLength}
        className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 text-sm text-[var(--color-text-primary)] outline-none transition focus:border-[var(--color-sky)] focus:ring-2 focus:ring-[var(--color-sky-soft)]"
      />
    </label>
  );
}

type SelectFieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
  required?: boolean;
  disabled?: boolean;
};

function SelectField({ label, value, onChange, options, required = false, disabled = false }: SelectFieldProps) {
  return (
    <label className="grid gap-2">
      <span className="text-sm font-semibold text-[var(--color-text-secondary)]">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        required={required}
        disabled={disabled}
        className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 text-sm text-[var(--color-text-primary)] outline-none transition focus:border-[var(--color-sky)] focus:ring-2 focus:ring-[var(--color-sky-soft)] disabled:cursor-not-allowed disabled:opacity-60"
      >
        <option value="">Select an option</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
