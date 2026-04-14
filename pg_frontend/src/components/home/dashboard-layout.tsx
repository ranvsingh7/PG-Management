import type { ReactNode } from "react";
import { DashboardSidebar } from "@/components/home/dashboard-sidebar";

type DashboardLayoutProps = {
  children: ReactNode;
};

export function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <div className="min-h-screen [background:var(--color-page-gradient)] text-[var(--color-text-primary)]">
      <main className="mx-auto min-h-screen w-full max-w-[96rem] px-3 pb-6 pt-6 sm:px-4 lg:px-6">
        <div className="grid min-h-[calc(100vh-48px)] gap-6 lg:grid-cols-[280px_1fr] xl:grid-cols-[300px_1fr]">
          <div className="hidden h-full lg:block">
            <DashboardSidebar />
          </div>
          <div className="h-full">
            <div className="space-y-6">{children}</div>
          </div>
        </div>
      </main>
    </div>
  );
}
