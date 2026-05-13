"use client";

import { useEffect, useState } from "react";

type TenantProfile = {
  name?: string;
  login_id?: string;
};

export function TenantNavbar() {
  const [tenant, setTenant] = useState<TenantProfile | null>(null);

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const response = await fetch("/api/tenant/auth/me", { cache: "no-store" });
        if (!response.ok) {
          return;
        }

        const payload = (await response.json()) as { tenant?: TenantProfile };
        setTenant(payload.tenant || null);
      } catch {
        // Optional rendering
      }
    };

    loadProfile();
  }, []);

  const displayName = tenant?.name?.trim() || "Tenant";
  const displayLogin = tenant?.login_id?.trim() || "";

  const handleLogout = async () => {
    try {
      await fetch("/api/tenant/auth/logout", { method: "POST" });
    } finally {
      window.location.replace("/tenant/login");
    }
  };

  return (
    <nav className="flex items-center justify-between gap-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 shadow-[var(--shadow-feature)]">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--color-sky)]">Tenant Portal</p>
        <p className="text-lg font-black text-[var(--color-text-title)]">Welcome, {displayName}</p>
        {displayLogin ? (
          <p className="text-xs text-[var(--color-text-muted)]">Login ID: {displayLogin}</p>
        ) : null}
      </div>
      <button
        type="button"
        onClick={handleLogout}
        className="cursor-pointer rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-sm font-semibold text-[var(--color-text-secondary)] transition hover:bg-[var(--color-surface-soft)]"
      >
        Logout
      </button>
    </nav>
  );
}
