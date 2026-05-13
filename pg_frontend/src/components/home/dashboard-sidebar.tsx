"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

type SidebarItem = {
  label: string;
  href?: string;
  icon: ReactNode;
  match: (pathname: string) => boolean;
  inactive?: boolean;
};

const items: SidebarItem[] = [
  {
    label: "Dashboard",
    href: "/admin",
    match: (pathname) => pathname === "/admin",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="h-5 w-5">
        <path
          d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8M3 10a2 2 0 0 1 .709-1.528l7-6a2 2 0 0 1 2.582 0l7 6A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
  {
    label: "Buildings",
    href: "/admin/buildings",
    match: (pathname) => pathname.startsWith("/admin/buildings"),
    icon: <BuildingIcon />,
  },
  {
    label: "Room Management",
    href: "/admin/rooms",
    match: (pathname) => pathname.startsWith("/admin/rooms"),
    icon: <BuildingIcon />,
  },
  {
    label: "Tenant Management",
    href: "/admin/tenants",
    match: (pathname) => pathname.startsWith("/admin/tenants"),
    icon: <UsersIcon />,
  },
  {
    label: "Pre-Bookings",
    match: () => false,
    inactive: true,
    icon: (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="h-5 w-5">
        <path d="M8 2v4M16 2v4M3 10h18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        <rect x="3" y="4" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="1.8" />
      </svg>
    ),
  },
  {
    label: "Electricity Billing",
    href: "/admin/electricity",
    match: (pathname) => pathname.startsWith("/admin/electricity"),
    icon: (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="h-5 w-5">
        <path
          d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
  {
    label: "Invoices & Billing",
    href: "/admin/invoices",
    match: (pathname) => pathname.startsWith("/admin/invoices"),
    icon: (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="h-5 w-5">
        <path
          d="M6 22a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.704.706l3.588 3.588A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2zM14 2v5a1 1 0 0 0 1 1h5M10 9H8M16 13H8M16 17H8"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
  {
    label: "Payment Tracking",
    href: "/admin/payments",
    match: (pathname) => pathname.startsWith("/admin/payments"),
    icon: (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="h-5 w-5">
        <path d="M12 2v20" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        <path
          d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
  {
    label: "Expenses",
    href: "/admin/expenses",
    match: (pathname) => pathname.startsWith("/admin/expenses"),
    icon: <TrendingIcon className="h-5 w-5" />,
  },
  {
    label: "Complaints",
    href: "/admin/complaints",
    match: (pathname) => pathname.startsWith("/admin/complaints"),
    icon: (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="h-5 w-5">
        <path
          d="M22 17a2 2 0 0 1-2 2H6.828a2 2 0 0 0-1.414.586l-2.202 2.202A.71.71 0 0 1 2 21.286V5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2z"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
  {
    label: "Visitor Management",
    href: "/admin/visitors",
    match: (pathname) => pathname.startsWith("/admin/visitors"),
    icon: <UserCheckIcon />,
  },
  {
    label: "Security Deposits",
    href: "/admin/security-deposits",
    match: (pathname) => pathname.startsWith("/admin/security-deposits"),
    icon: (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="h-5 w-5">
        <path
          d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
  {
    label: "Pending Approvals",
    href: "/admin/pending-approvals",
    match: (pathname) => pathname.startsWith("/admin/pending-approvals"),
    icon: <UserCheckIcon />,
  },
  {
    label: "Settings",
    href: "/admin/settings",
    match: (pathname) => pathname.startsWith("/admin/settings"),
    icon: (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="h-5 w-5">
        <path
          d="M9.671 4.136a2.34 2.34 0 0 1 4.659 0 2.34 2.34 0 0 0 3.319 1.915 2.34 2.34 0 0 1 2.33 4.033 2.34 2.34 0 0 0 0 3.831 2.34 2.34 0 0 1-2.33 4.033 2.34 2.34 0 0 0-3.319 1.915 2.34 2.34 0 0 1-4.659 0 2.34 2.34 0 0 0-3.32-1.915 2.34 2.34 0 0 1-2.33-4.033 2.34 2.34 0 0 0 0-3.831A2.34 2.34 0 0 1 6.35 6.051a2.34 2.34 0 0 0 3.319-1.915"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.8" />
      </svg>
    ),
  },
];

export function DashboardSidebar() {
  const pathname = usePathname();

  return (
    <aside className="h-full min-h-0 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-feature)]">
      <nav className="h-full min-h-0 space-y-1 overflow-y-auto p-4">
        {items.map((item) => (
          item.inactive ? (
            <div
              key={item.label}
              className="flex items-center justify-between gap-2 rounded-lg px-4 py-3 text-[var(--color-text-muted)] opacity-70"
              title="Coming soon"
            >
              <div className="flex min-w-0 items-center gap-2">
                {item.icon}
                <span className="whitespace-nowrap">{item.label}</span>
              </div>
              <span className="shrink-0 whitespace-nowrap rounded-full border border-[var(--color-border)] bg-[var(--color-surface-muted)] px-1 py-0 text-[8px] font-medium uppercase tracking-[0.04em] text-[var(--color-text-muted)] opacity-80">
                    Coming Soon
                  </span>
            </div>
          ) : (
            <Link
              key={item.label}
              href={item.href || "/admin"}
              aria-current={item.match(pathname) ? "page" : undefined}
              className={`cursor-pointer flex items-center justify-between gap-3 rounded-lg px-4 py-3 transition-colors ${
                item.match(pathname)
                  ? "bg-[var(--color-sky-soft)] text-[var(--color-sky)] font-medium"
                  : "text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-soft)]"
              }`}
            >
              <div className="flex items-center gap-3">
                {item.icon}
                <span>{item.label}</span>
              </div>
            </Link>
          )
        ))}

        <a
          href="#"
          className="cursor-default mt-2 flex items-center justify-between gap-3 rounded-lg border border-[var(--color-upgrade-border)] bg-[linear-gradient(to_right,var(--color-upgrade-from),var(--color-upgrade-to))] px-4 py-3 text-[var(--color-upgrade-text)]"
        >
          <div className="flex items-center gap-3">
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="h-5 w-5">
              <path
                d="M11.562 3.266a.5.5 0 0 1 .876 0L15.39 8.87a1 1 0 0 0 1.516.294L21.183 5.5a.5.5 0 0 1 .798.519l-2.834 10.246a1 1 0 0 1-.956.734H5.81a1 1 0 0 1-.957-.734L2.02 6.02a.5.5 0 0 1 .798-.519l4.276 3.664a1 1 0 0 0 1.516-.294zM5 21h14"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <span className="font-semibold">Upgrade</span>
          </div>
          <TrendingIcon className="h-4 w-4 text-[var(--color-upgrade-arrow)]" />
        </a>
      </nav>
    </aside>
  );
}

function BuildingIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="h-5 w-5">
      <path
        d="M10 12h4M10 8h4M14 21v-3a2 2 0 0 0-4 0v3M6 10H4a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-2M6 21V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v16"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function UsersIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="h-5 w-5">
      <path
        d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M16 3.128a4 4 0 0 1 0 7.744M22 21v-2a4 4 0 0 0-3-3.87"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

function UserCheckIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="h-5 w-5">
      <path
        d="m16 11 2 2 4-4M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

function TrendingIcon({ className }: { className: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className={className}>
      <path d="M16 7h6v6m0-6-8.5 8.5-5-5L2 17" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

