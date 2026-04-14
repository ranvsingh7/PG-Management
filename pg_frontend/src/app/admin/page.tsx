"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { DashboardLayout } from "@/components/home/dashboard-layout";
import { DashboardPulse } from "@/components/home/dashboard-pulse";
import Link from "next/link";

type ActivityCategory = "All" | "Billing" | "Check-ins" | "Support";

type ActivityItem = {
  title: string;
  detail: string;
  category: ActivityCategory;
};

const metrics = [
  { label: "Buildings", value: "12", tone: "sky" as const },
  { label: "Occupied Beds", value: "416", tone: "emerald" as const },
  { label: "Pending Dues", value: "INR 1.2L", tone: "amber" as const },
  { label: "Complaints", value: "09", tone: "slate" as const },
];

const quickActions = [
  { label: "Add Building", href: "/admin/buildings" },
  { label: "Add Room", href: "/admin/rooms" },
  { label: "Add Tenant", href: "/admin/tenants" },
  { label: "New Invoice", href: "/admin/invoices" },
  { label: "Collect Payment", href: "/admin/payments" },
  { label: "New Complaint", href: "/admin/complaints" },
  { label: "Expenses", href: "/admin/expenses" },
  { label: "Settings", href: "/admin/settings" },
];

const recentActivity: ActivityItem[] = [
  { title: "Invoice generated", detail: "14 min", category: "Billing" },
  { title: "Pre-bookings", detail: "31 min", category: "Check-ins" },
  { title: "Billing updated", detail: "1 hr", category: "Billing" },
  { title: "Checkout approved", detail: "2 hr", category: "Check-ins" },
  { title: "Complaint resolved", detail: "2 hr", category: "Support" },
  { title: "Ticket assigned", detail: "3 hr", category: "Support" },
];

const activityFilters: ActivityCategory[] = ["All", "Billing", "Check-ins", "Support"];

function metricToneClasses(tone: "sky" | "emerald" | "amber" | "slate") {
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
}

export default function AdminPage() {
  const router = useRouter();
  const [activeFilter, setActiveFilter] = useState<ActivityCategory>("All");

  const filteredActivity = useMemo(() => {
    if (activeFilter === "All") {
      return recentActivity;
    }
    return recentActivity.filter((item) => item.category === activeFilter);
  }, [activeFilter]);

  const handleLogout = async () => {
    try {
      await fetch("/api/admin/auth/logout", {
        method: "POST",
      });
    } finally {
      router.replace("/admin/login");
      router.refresh();
      window.location.replace("/admin/login");
    }
  };

  return (
    <DashboardLayout>
      <section className="rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-[var(--shadow-feature)] sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h1 className="text-3xl font-black tracking-tight text-[var(--color-text-title)] sm:text-4xl">
            Dashboard
          </h1>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => router.push("/admin/invoices")}
              className="cursor-pointer rounded-2xl bg-[var(--color-emerald)] px-5 py-2 text-sm font-bold text-[var(--color-text-inverse)] shadow-[var(--shadow-cta)] transition hover:bg-[var(--color-emerald-hover)]"
            >
              New Invoice
            </button>
            <button
              type="button"
              onClick={() => router.push("/admin/tenants?new=1")}
              className="cursor-pointer rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] px-5 py-2 text-sm font-bold text-[var(--color-text-secondary)] transition hover:bg-[var(--color-surface-soft)]"
            >
              Add Tenant
            </button>
            <button
              type="button"
              onClick={handleLogout}
              className="cursor-pointer rounded-2xl border border-[rgba(198,0,61,0.35)] bg-[rgba(198,0,61,0.08)] px-5 py-2 text-sm font-bold text-[var(--color-brand)] transition hover:bg-[rgba(198,0,61,0.16)]"
            >
              Logout
            </button>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          {quickActions.map((action) => (
            <Link
              key={action.label}
              href={action.href}
              className="cursor-pointer rounded-full border border-[var(--color-border)] bg-[var(--color-surface-alt)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--color-text-secondary)] transition hover:bg-[var(--color-surface-soft)]"
            >
              {action.label}
            </Link>
          ))}
        </div>

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

      <section className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <article className="rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-[var(--shadow-feature)]">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <h2 className="text-xl font-black text-[var(--color-text-title)]">Activity</h2>
            <div className="flex flex-wrap gap-2 rounded-full border border-[var(--color-border)] bg-[var(--color-surface-alt)] p-1">
              {activityFilters.map((filter) => {
                const isActive = filter === activeFilter;
                return (
                  <button
                    key={filter}
                    type="button"
                    onClick={() => setActiveFilter(filter)}
                    className={`cursor-pointer rounded-full px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.14em] transition ${
                      isActive
                        ? "bg-[var(--color-brand)] text-[var(--color-text-inverse)] shadow-[var(--shadow-cta)]"
                        : "text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
                    }`}
                  >
                    {filter}
                  </button>
                );
              })}
            </div>
          </div>

          <ul className="mt-5 space-y-3">
            {filteredActivity.map((activity) => (
              <li
                key={`${activity.title}-${activity.detail}`}
                className="flex items-start justify-between gap-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3"
              >
                <p className="text-sm font-semibold text-[var(--color-text-secondary)]">
                  {activity.title}
                </p>
                <span className="shrink-0 text-xs font-medium text-[var(--color-text-muted)]">
                  {activity.detail}
                </span>
              </li>
            ))}
          </ul>
        </article>

        <DashboardPulse />
      </section>
    </DashboardLayout>
  );
}
