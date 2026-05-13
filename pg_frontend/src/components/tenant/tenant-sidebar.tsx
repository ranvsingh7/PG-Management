"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { label: "Dashboard", href: "/tenant" },
  { label: "Onboarding", href: "/tenant/onboarding" },
  { label: "Payments", href: "/tenant/payments" },
  { label: "Notices", href: "/tenant/notices" },
  { label: "Profile", href: "/tenant/profile" },
];

export function TenantSidebar() {
  const pathname = usePathname();

  return (
    <div className="rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-[var(--shadow-feature)]">
      <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--color-text-muted)]">Menu</p>
      <div className="mt-4 grid gap-2">
        {navItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== "/tenant" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`cursor-pointer rounded-xl border px-3 py-2 text-sm font-semibold transition ${
                isActive
                  ? "border-[var(--color-sky)] bg-[var(--color-sky-soft)] text-[var(--color-sky)]"
                  : "border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-soft)]"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
