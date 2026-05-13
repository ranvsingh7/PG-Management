"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { DashboardLayout } from "@/components/home/dashboard-layout";
import Link from "next/link";

type UsageResponse = {
  tenant_count?: number;
  building_count?: number;
};

type Room = {
  occupied?: number;
};

type Complaint = {
  id: string;
  tenant_name: string;
  room_number: string;
  status: "open" | "in_progress" | "resolved";
  complaint_date: string;
  created_at?: string;
};

type Invoice = {
  id: string;
  invoice_number?: string;
  tenant_name?: string;
  amount?: number;
  outstanding_amount?: number;
  effective_status?: "pending" | "paid" | "partial" | "overdue";
  created_at?: string;
  due_date?: string;
};

type InvoiceResponse = {
  items: Invoice[];
  pagination?: {
    hasNextPage?: boolean;
    page?: number;
    totalPages?: number;
  };
};

type Tenant = {
  id: string;
  name?: string;
  created_at?: string;
};

type AdminMeResponse = {
  admin?: {
    full_name?: string;
  };
};

type MetricTone = "sky" | "emerald" | "amber" | "slate";

type Metric = {
  label: string;
  value: string;
  tone: MetricTone;
};

type ActivityItem = {
  title: string;
  detail: string;
  timestamp: number;
};

const quickActions = [
  { label: "Add New Building", href: "/admin/buildings" },
  { label: "Manage Rooms", href: "/admin/rooms" },
  { label: "Manage Tenants", href: "/admin/tenants" },
  { label: "Create Invoice", href: "/admin/invoices" },
  { label: "Register Tenant", href: "/admin/tenants/new" },
  { label: "Review Complaints", href: "/admin/complaints" },
];

const formatCurrency = (value: number) => {
  const amount = Number.isFinite(value) ? value : 0;
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
};

const formatRelativeTime = (timestamp: number) => {
  if (!Number.isFinite(timestamp)) {
    return "";
  }

  const deltaSeconds = Math.max(Math.floor((Date.now() - timestamp) / 1000), 0);
  if (deltaSeconds < 60) {
    return `${deltaSeconds}s ago`;
  }

  const minutes = Math.floor(deltaSeconds / 60);
  if (minutes < 60) {
    return `${minutes}m ago`;
  }

  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${hours}h ago`;
  }

  const days = Math.floor(hours / 24);
  return `${days}d ago`;
};

const getCurrentPeriod = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
};

const toTimestamp = (value?: string) => {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  const ts = date.getTime();
  return Number.isNaN(ts) ? null : ts;
};

const metricToneClasses = (tone: MetricTone) => {
  if (tone === "sky") {
    return "bg-[var(--color-sky-soft)] text-[var(--color-sky)]";
  }
  if (tone === "emerald") {
    return "bg-[var(--color-emerald-soft)] text-[var(--color-emerald-strong)]";
  }
  if (tone === "amber") {
    return "bg-[var(--color-amber-soft)] text-[var(--color-amber)]";
  }
  return "bg-[var(--color-surface-soft)] text-[var(--color-text-secondary)]";
};

export default function AdminPage() {
  const [adminName, setAdminName] = useState("Admin");
  const [metrics, setMetrics] = useState<Metric[]>([
    { label: "Total Buildings", value: "-", tone: "sky" },
    { label: "Occupied Beds", value: "-", tone: "emerald" },
    { label: "Pending Dues", value: "-", tone: "amber" },
    { label: "Open Complaints", value: "-", tone: "slate" },
  ]);
  const [recentActivity, setRecentActivity] = useState<ActivityItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchJson = useCallback(async <T,>(url: string) => {
    const response = await fetch(url, { cache: "no-store" });
    const data = (await response.json().catch(() => null)) as T | null;
    return { ok: response.ok, data };
  }, []);

  const fetchAllInvoices = useCallback(async (period: string) => {
    const items: Invoice[] = [];
    let page = 1;
    const limit = 200;

    while (page <= 10) {
      const query = new URLSearchParams({ period, page: String(page), limit: String(limit) });
      const result = await fetchJson<InvoiceResponse>(`/api/admin/invoices?${query.toString()}`);
      if (!result.ok || !result.data) {
        break;
      }

      const nextItems = Array.isArray(result.data.items) ? result.data.items : [];
      items.push(...nextItems);

      if (!result.data.pagination?.hasNextPage) {
        break;
      }

      page += 1;
    }

    return items;
  }, [fetchJson]);

  const loadDashboard = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const period = getCurrentPeriod();
      const [meRes, usageRes, roomsRes, complaintsRes, tenantsRes, invoices] = await Promise.all([
        fetchJson<AdminMeResponse>("/api/admin/auth/me"),
        fetchJson<UsageResponse>("/api/admin/usage"),
        fetchJson<Room[]>("/api/admin/rooms"),
        fetchJson<Complaint[]>("/api/admin/complaints?status=open"),
        fetchJson<Tenant[]>("/api/admin/tenants"),
        fetchAllInvoices(period),
      ]);

      if (meRes.ok && meRes.data?.admin?.full_name) {
        setAdminName(meRes.data.admin.full_name);
      }

      const buildingCount = Number(usageRes.data?.building_count || 0);
      const roomList = Array.isArray(roomsRes.data) ? roomsRes.data : [];
      const occupiedBeds = roomList.reduce((sum, room) => sum + Number(room.occupied || 0), 0);
      const openComplaints = Array.isArray(complaintsRes.data) ? complaintsRes.data.length : 0;

      const pendingDues = invoices.reduce((sum, invoice) => {
        const outstanding = Number(invoice.outstanding_amount || 0);
        const status = invoice.effective_status || "pending";
        if (status === "paid") {
          return sum;
        }
        return sum + outstanding;
      }, 0);

      setMetrics([
        { label: "Total Buildings", value: String(buildingCount), tone: "sky" },
        { label: "Occupied Beds", value: String(occupiedBeds), tone: "emerald" },
        { label: "Pending Dues", value: formatCurrency(pendingDues), tone: "amber" },
        { label: "Open Complaints", value: String(openComplaints), tone: "slate" },
      ]);

      const complaintItems = (Array.isArray(complaintsRes.data) ? complaintsRes.data : []).map((item) => {
        const timestamp = toTimestamp(item.created_at || item.complaint_date) ?? 0;
        return {
          title: `Complaint from ${item.tenant_name || "Tenant"} (${item.room_number || "Room"})`,
          detail: formatRelativeTime(timestamp),
          timestamp,
        };
      });

      const invoiceItems = invoices.map((invoice) => {
        const timestamp = toTimestamp(invoice.created_at || invoice.due_date) ?? 0;
        const label = invoice.invoice_number || "Invoice";
        return {
          title: `${label} created for ${invoice.tenant_name || "tenant"}`,
          detail: formatRelativeTime(timestamp),
          timestamp,
        };
      });

      const tenants = Array.isArray(tenantsRes.data) ? tenantsRes.data : [];
      const tenantItems = tenants.map((tenant) => {
        const timestamp = toTimestamp(tenant.created_at) ?? 0;
        return {
          title: `Tenant ${tenant.name || "New"} added`,
          detail: formatRelativeTime(timestamp),
          timestamp,
        };
      });

      const activity = [...complaintItems, ...invoiceItems, ...tenantItems]
        .filter((item) => item.timestamp > 0)
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(0, 4);

      setRecentActivity(activity);
    } catch {
      setError("Unable to load dashboard data right now.");
    } finally {
      setIsLoading(false);
    }
  }, [fetchAllInvoices, fetchJson]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const statusMessage = useMemo(() => {
    if (error) {
      return error;
    }
    if (isLoading) {
      return "Loading dashboard data...";
    }
    return null;
  }, [error, isLoading]);

  return (
    <DashboardLayout>
      <section className="rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-[var(--shadow-feature)] sm:p-8">
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--color-sky)]">
          Admin Overview
        </p>
        <h1 className="mt-2 text-3xl font-black tracking-tight text-[var(--color-text-title)] sm:text-4xl">
          Welcome back, {adminName}
        </h1>
        <p className="mt-3 max-w-2xl text-sm text-[var(--color-text-muted)] sm:text-base">
          Track occupancy, payments, and operations from one central dashboard.
          Everything here updates automatically from your live data.
        </p>

        {statusMessage ? (
          <p className="mt-5 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] px-4 py-3 text-sm text-[var(--color-text-secondary)]">
            {statusMessage}
          </p>
        ) : null}

        <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {metrics.map((metric) => (
            <article
              key={metric.label}
              className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4"
            >
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--color-text-muted)]">
                {metric.label}
              </p>
              <p className="mt-3 text-3xl font-black text-[var(--color-text-title)]">
                {metric.value}
              </p>
              <span
                className={`mt-3 inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${metricToneClasses(metric.tone)}`}
              >
                Live
              </span>
            </article>
          ))}
        </div>
      </section>

      <section className="mt-8 grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
        <article className="rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-[var(--shadow-feature)]">
          <h2 className="text-xl font-black text-[var(--color-text-title)]">
            Quick Actions
          </h2>
          <p className="mt-2 text-sm text-[var(--color-text-muted)]">
            Common admin tasks to speed up day-to-day operations.
          </p>

          <div className="mt-5 grid gap-3">
            {quickActions.map((action) => (
              <Link
                key={action.label}
                href={action.href}
                className="cursor-pointer flex items-center justify-between rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 text-sm font-semibold text-[var(--color-text-secondary)] transition hover:bg-[var(--color-surface-soft)] hover:text-[var(--color-text-primary)]"
              >
                <span>{action.label}</span>
                <span className="text-base" aria-hidden="true">
                  +
                </span>
              </Link>
            ))}
          </div>
        </article>

        <article className="rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-[var(--shadow-feature)]">
          <h2 className="text-xl font-black text-[var(--color-text-title)]">
            Recent Activity
          </h2>
          <p className="mt-2 text-sm text-[var(--color-text-muted)]">
            Latest events in your PG management workflow.
          </p>

          <ul className="mt-5 space-y-3">
            {recentActivity.length ? (
              recentActivity.map((activity) => (
                <li
                  key={`${activity.title}-${activity.timestamp}`}
                  className="flex items-start justify-between gap-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3"
                >
                  <p className="text-sm font-semibold text-[var(--color-text-secondary)]">
                    {activity.title}
                  </p>
                  <span className="shrink-0 text-xs font-medium text-[var(--color-text-muted)]">
                    {activity.detail || "Just now"}
                  </span>
                </li>
              ))
            ) : (
              <li className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 text-sm text-[var(--color-text-muted)]">
                No recent activity yet.
              </li>
            )}
          </ul>
        </article>
      </section>
    </DashboardLayout>
  );
}
