import { DashboardLayout } from "@/components/home/dashboard-layout";
import Link from "next/link";

const metrics = [
  { label: "Total Buildings", value: "12", tone: "sky" as const },
  { label: "Occupied Beds", value: "416", tone: "emerald" as const },
  { label: "Pending Dues", value: "INR 1.2L", tone: "amber" as const },
  { label: "Open Complaints", value: "09", tone: "slate" as const },
];

const quickActions = [
  { label: "Add New Building", href: "/admin/buildings" },
  { label: "Manage Rooms", href: "/admin/rooms" },
  { label: "Manage Tenants", href: "/admin/tenants" },
  { label: "Create Invoice", href: "/admin/invoices" },
  { label: "Register Tenant", href: "/admin/tenants/new" },
  { label: "Review Complaints", href: "#" },
];

const recentActivity = [
  {
    title: "Invoice generated for Block A",
    detail: "14 minutes ago",
  },
  {
    title: "2 new pre-bookings received",
    detail: "31 minutes ago",
  },
  {
    title: "Electricity billing updated for Wing C",
    detail: "1 hour ago",
  },
  {
    title: "Tenant checkout request approved",
    detail: "2 hours ago",
  },
];

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
  return (
    <DashboardLayout>
      <section className="rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-[var(--shadow-feature)] sm:p-8">
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--color-sky)]">
          Admin Overview
        </p>
        <h1 className="mt-2 text-3xl font-black tracking-tight text-[var(--color-text-title)] sm:text-4xl">
          Welcome back, Arjun
        </h1>
        <p className="mt-3 max-w-2xl text-sm text-[var(--color-text-muted)] sm:text-base">
          Track occupancy, payments, and operations from one central dashboard.
          This page is ready to plug into real backend data.
        </p>

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
            {recentActivity.map((activity) => (
              <li
                key={activity.title}
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
      </section>
    </DashboardLayout>
  );
}
