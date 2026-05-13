"use client";

import { useEffect, useState } from "react";

type AdminProfile = {
  full_name?: string;
  role?: string;
};

type Usage = {
  tenant_count: number;
  building_count: number;
  current_tier: string;
  limits: {
    max_tenants: number;
    max_buildings: number;
    max_admins: number;
    support: string;
  };
  approaching_limit: boolean;
  exceeds_soft_limit: boolean;
  exceeds_hard_limit: boolean;
  should_upgrade: boolean;
  is_whitelisted: boolean;
  subscription: unknown;
};

type DashboardNavbarProps = {
  onMenuToggle: () => void;
  isMenuOpen: boolean;
};

export function DashboardNavbar({ onMenuToggle, isMenuOpen }: DashboardNavbarProps) {
  const [adminProfile, setAdminProfile] = useState<AdminProfile | null>(null);
  const [usage, setUsage] = useState<Usage | null>(null);

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const response = await fetch("/api/admin/auth/me", { cache: "no-store" });
        if (!response.ok) {
          return;
        }

        const payload = (await response.json()) as { admin?: AdminProfile };
        setAdminProfile(payload.admin || null);
      } catch {
        // Profile is optional for rendering the navbar.
      }
    };

    loadProfile();
  }, []);

  useEffect(() => {
    const loadUsage = async () => {
      try {
        const response = await fetch("/api/admin/usage", { cache: "no-store" });
        if (!response.ok) {
          return;
        }

        const payload = (await response.json()) as Usage;
        setUsage(payload);
      } catch {
        // Usage is optional for rendering the navbar.
      }
    };

    loadUsage();
  }, []);

  const displayName = adminProfile?.full_name?.trim() || "Admin";
  const displayRole =
    adminProfile?.role
      ?.split("_")
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ") || "Admin";

  const tenantCount = usage?.tenant_count ?? 0;
  const tenantLimit = usage?.limits?.max_tenants ?? 50;
  const currentTier = usage?.current_tier
    ? usage.current_tier.charAt(0).toUpperCase() + usage.current_tier.slice(1)
    : "Free";

  const handleLogout = async () => {
    try {
      await fetch("/api/admin/auth/logout", {
        method: "POST",
      });
    } finally {
      window.location.replace("/admin/login");
    }
  };

  return (
    <nav className="rounded-2xl border border-[color:var(--color-nav-border)] bg-[color:rgba(255,255,255,0.75)] px-4 py-3 shadow-[var(--shadow-nav)] backdrop-blur">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            aria-label="Open menu"
            aria-expanded={isMenuOpen}
            aria-controls="dashboard-mobile-sidebar"
            onClick={onMenuToggle}
            className="cursor-pointer inline-flex h-9 w-9 items-center justify-center rounded-md text-[var(--color-text-muted)] transition hover:bg-[var(--color-surface-soft)] hover:text-[var(--color-text-primary)] lg:hidden"
          >
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="h-5 w-5">
              <path
                d="M4 5h16M4 12h16M4 19h16"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </button>

          <div className="flex items-center gap-2">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden="true"
              className="h-7 w-7 text-[var(--color-sky)]"
            >
              <path
                d="M10 12h4M10 8h4M14 21v-3a2 2 0 0 0-4 0v3M6 10H4a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-2M6 21V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v16"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <div>
              <h1 className="text-xl font-bold text-[var(--color-text-primary)]">
                PG Management System
              </h1>
              <p className="text-xs text-[var(--color-text-muted)]">Admin Dashboard</p>
            </div>
          </div>

        </div>

        <div className="flex items-center gap-3">
          <div
            className="hidden items-center gap-2 cursor-pointer rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-muted)] px-3 py-1.5 transition hover:bg-[var(--color-surface-soft)] md:flex"
            title="View subscription details"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden="true"
              className="h-4 w-4 text-[var(--color-text-secondary)]"
            >
              <path
                d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M16 3.128a4 4 0 0 1 0 7.744M22 21v-2a4 4 0 0 0-3-3.87"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="1.8" />
            </svg>
            <div className="flex items-center gap-1">
              <span className="text-sm font-semibold text-[var(--color-text-primary)]">{tenantCount}</span>
              <span className="text-sm text-[var(--color-text-muted)]">/</span>
              <span className="text-sm text-[var(--color-text-secondary)]">{tenantLimit}</span>
            </div>
            <div className="rounded-md border border-[var(--color-sky-border)] bg-[var(--color-sky-soft)] px-2.5 py-0.5 text-xs font-semibold text-[var(--color-sky)]">
              {currentTier}
            </div>
          </div>

          <div className="hidden text-right sm:block">
            <p className="text-sm font-medium text-[var(--color-text-primary)]">{displayName}</p>
            <p className="text-xs text-[var(--color-text-muted)]">{displayRole}</p>
          </div>

          <button
            type="button"
            title="Logout"
            aria-label="Logout"
            onClick={handleLogout}
            className="cursor-pointer inline-flex h-9 w-9 items-center justify-center rounded-md text-[var(--color-text-muted)] transition hover:bg-[var(--color-surface-soft)] hover:text-[var(--color-text-primary)]"
          >
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="h-5 w-5">
              <path
                d="m16 17 5-5-5-5M21 12H9M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>
      </div>
    </nav>
  );
}
