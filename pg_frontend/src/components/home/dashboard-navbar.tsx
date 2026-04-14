"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

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

export function DashboardNavbar() {
  const router = useRouter();
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
  const buildingCount = usage?.building_count ?? 0;
  const currentTier = usage?.current_tier
    ? usage.current_tier.charAt(0).toUpperCase() + usage.current_tier.slice(1)
    : "Free";

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
    <nav className="rounded-[28px] border border-[color:var(--color-nav-border)] bg-[var(--color-surface-glass)] px-5 py-4 shadow-[var(--shadow-nav)] backdrop-blur">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            aria-label="Open menu"
            className="cursor-pointer inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-muted)] transition hover:bg-[var(--color-surface-soft)] hover:text-[var(--color-text-primary)] lg:hidden"
          >
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="h-5 w-5">
              <path
                d="M4 6h16M4 12h16M4 18h16"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </button>

          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]">
              <img src="/brand/pg-logo.svg" alt="EasyPG" className="h-7 w-7" />
            </div>
            <div>
              <h1 className="text-lg font-black text-[var(--color-text-primary)]">EasyPG Console</h1>
              <p className="text-xs text-[var(--color-text-muted)]">Operations & Billing</p>
            </div>
          </div>

          <div className="hidden items-center gap-2 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2 text-sm text-[var(--color-text-muted)] md:flex">
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="h-4 w-4">
              <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.6" />
              <path d="M20 20l-3.5-3.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
            <span>Search tenants, rooms, invoices...</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden items-center gap-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2 md:flex">
            <div className="text-xs text-[var(--color-text-muted)]">
              <p className="font-semibold text-[var(--color-text-primary)]">{tenantCount}/{tenantLimit} tenants</p>
              <p>{buildingCount} buildings</p>
            </div>
            <span className="rounded-full border border-[var(--color-sky-border)] bg-[var(--color-sky-soft)] px-2.5 py-1 text-xs font-semibold text-[var(--color-sky)]">
              {currentTier}
            </span>
          </div>

          <button
            type="button"
            className="hidden cursor-pointer items-center gap-2 rounded-xl bg-[var(--color-emerald)] px-4 py-2 text-xs font-bold uppercase tracking-[0.14em] text-[var(--color-text-inverse)] shadow-[var(--shadow-cta)] transition hover:bg-[var(--color-emerald-hover)] sm:inline-flex"
          >
            New Action
            <span className="text-base" aria-hidden="true">
              +
            </span>
          </button>

          <div className="hidden text-right sm:block">
            <p className="text-sm font-medium text-[var(--color-text-primary)]">{displayName}</p>
            <p className="text-xs text-[var(--color-text-muted)]">{displayRole}</p>
          </div>

          <button
            type="button"
            title="Logout"
            aria-label="Logout"
            onClick={handleLogout}
            className="cursor-pointer inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-muted)] transition hover:bg-[var(--color-surface-soft)] hover:text-[var(--color-text-primary)]"
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

