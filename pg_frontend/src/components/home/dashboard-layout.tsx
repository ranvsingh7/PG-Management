"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import { DashboardNavbar } from "@/components/home/dashboard-navbar";
import { DashboardSidebar } from "@/components/home/dashboard-sidebar";

type DashboardLayoutProps = {
  children: ReactNode;
};

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <div className="flex h-screen flex-col overflow-hidden [background:var(--color-page-gradient)] text-[var(--color-text-primary)]">
      <header className="mx-auto w-full max-w-[96rem] shrink-0 px-3 pt-6 sm:px-4 lg:px-6">
        <div className="mb-4 inline-flex rounded-full border border-[color:var(--color-amber-soft)] bg-[var(--color-amber-soft)] px-4 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-amber)]">
          Now live: smart PG operations
        </div>
        <DashboardNavbar
          onMenuToggle={() => setIsMobileMenuOpen((prev) => !prev)}
          isMenuOpen={isMobileMenuOpen}
        />
      </header>

      <main className="mx-auto min-h-0 w-full max-w-[96rem] flex-1 overflow-hidden px-3 pb-2 pt-6 sm:px-4 lg:px-6">
        <div className="grid h-full min-h-0 gap-6 lg:grid-cols-[280px_1fr] xl:grid-cols-[300px_1fr]">
          <div className="hidden h-full min-h-0 lg:block">
            <DashboardSidebar />
          </div>
          <div className="h-full min-h-0 overflow-y-auto pr-1">{children}</div>
        </div>
      </main>

      <div
        className={`fixed inset-0 z-40 bg-black/40 transition-opacity lg:hidden ${
          isMobileMenuOpen ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={() => setIsMobileMenuOpen(false)}
        aria-hidden={!isMobileMenuOpen}
      />

      <aside
        id="dashboard-mobile-sidebar"
        aria-hidden={!isMobileMenuOpen}
        className={`fixed inset-y-0 left-0 z-50 w-[82%] max-w-[320px] transform transition-transform lg:hidden ${
          isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-full flex-col bg-[var(--color-surface)] p-4 shadow-[var(--shadow-feature)]">
          <div className="mb-4 flex items-center justify-between shrink-0">
            <p className="text-sm font-semibold text-[var(--color-text-primary)]">Menu</p>
            <button
              type="button"
              aria-label="Close menu"
              onClick={() => setIsMobileMenuOpen(false)}
              className="inline-flex h-9 w-9 items-center justify-center rounded-md text-[var(--color-text-muted)] transition hover:bg-[var(--color-surface-soft)] hover:text-[var(--color-text-primary)]"
            >
              <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="h-5 w-5">
                <path
                  d="M6 6l12 12M18 6l-12 12"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          </div>
          <div className="min-h-0 flex-1 overflow-hidden">
            <DashboardSidebar onNavigate={() => setIsMobileMenuOpen(false)} />
          </div>
        </div>
      </aside>
    </div>
  );
}
