import type { ReactNode } from "react";
import { DashboardNavbar } from "@/components/home/dashboard-navbar";
import { DashboardSidebar } from "@/components/home/dashboard-sidebar";

type DashboardLayoutProps = {
  children: ReactNode;
};

export function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <div className="flex h-screen flex-col overflow-hidden [background:var(--color-page-gradient)] text-[var(--color-text-primary)]">
      <header className="mx-auto w-full max-w-[96rem] shrink-0 px-3 pt-6 sm:px-4 lg:px-6">
        <div className="mb-4 inline-flex rounded-full border border-[color:var(--color-amber-soft)] bg-[var(--color-amber-soft)] px-4 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-amber)]">
          Now live: smart PG operations
        </div>
        <DashboardNavbar />
      </header>

      <main className="mx-auto min-h-0 w-full max-w-[96rem] flex-1 overflow-hidden px-3 pb-2 pt-6 sm:px-4 lg:px-6">
        <div className="grid h-full min-h-0 gap-6 lg:grid-cols-[280px_1fr] xl:grid-cols-[300px_1fr]">
          <div className="hidden h-full min-h-0 lg:block">
            <DashboardSidebar />
          </div>
          <div className="h-full min-h-0 overflow-y-auto pr-1">{children}</div>
        </div>
      </main>
    </div>
  );
}
