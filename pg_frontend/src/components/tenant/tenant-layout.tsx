import type { ReactNode } from "react";
import { TenantNavbar } from "@/components/tenant/tenant-navbar";
import { TenantSidebar } from "@/components/tenant/tenant-sidebar";

type TenantLayoutProps = {
  children: ReactNode;
};

export function TenantLayout({ children }: TenantLayoutProps) {
  return (
    <div className="flex h-screen flex-col overflow-hidden [background:var(--color-page-gradient)] text-[var(--color-text-primary)]">
      <header className="mx-auto w-full max-w-[96rem] shrink-0 px-3 pt-6 sm:px-4 lg:px-6">
        <TenantNavbar />
      </header>

      <main className="mx-auto min-h-0 w-full max-w-[96rem] flex-1 overflow-hidden px-3 pb-2 pt-6 sm:px-4 lg:px-6">
        <div className="grid h-full min-h-0 gap-6 lg:grid-cols-[260px_1fr] xl:grid-cols-[280px_1fr]">
          <div className="hidden h-full min-h-0 lg:block">
            <TenantSidebar />
          </div>
          <div className="h-full min-h-0 overflow-y-auto pr-1">{children}</div>
        </div>
      </main>
    </div>
  );
}
