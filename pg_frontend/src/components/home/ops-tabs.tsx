"use client";

import { useMemo, useState } from "react";

type TabId = "checkin" | "notifications" | "payments" | "issues";

type TabContent = {
  id: TabId;
  label: string;
  stats: { label: string; value: string }[];
};

const tabs: TabContent[] = [
  {
    id: "checkin",
    label: "Check-in",
    stats: [
      { label: "Check-ins", value: "42" },
      { label: "Approvals", value: "06" },
      { label: "Vacancies", value: "08" },
      { label: "Move-ins", value: "92%" },
    ],
  },
  {
    id: "notifications",
    label: "Notifications",
    stats: [
      { label: "Alerts", value: "240" },
      { label: "Read rate", value: "96%" },
      { label: "Overdues", value: "12" },
      { label: "Receipts", value: "98%" },
    ],
  },
  {
    id: "payments",
    label: "Rent Payment",
    stats: [
      { label: "Collected", value: "INR 6.8L" },
      { label: "Pending", value: "INR 74K" },
      { label: "Receipts", value: "96%" },
      { label: "Refunds", value: "2" },
    ],
  },
  {
    id: "issues",
    label: "Issues",
    stats: [
      { label: "Open", value: "07" },
      { label: "Resolved", value: "84%" },
      { label: "Avg SLA", value: "3h" },
      { label: "Escalations", value: "02" },
    ],
  },
];

export function OpsTabs() {
  const [activeId, setActiveId] = useState<TabId>("checkin");

  const activeTab = useMemo(
    () => tabs.find((tab) => tab.id === activeId) || tabs[0],
    [activeId]
  );

  return (
    <div className="rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-[var(--shadow-feature)]">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-text-muted)]">PG Cloud</p>
        <div className="flex flex-wrap gap-2 rounded-full border border-[var(--color-border)] bg-[var(--color-surface-alt)] p-1">
          {tabs.map((tab) => {
            const isActive = tab.id === activeId;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveId(tab.id)}
                aria-selected={isActive}
                className={`cursor-pointer rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] transition ${
                  isActive
                    ? "bg-[var(--color-brand)] text-[var(--color-text-inverse)] shadow-[var(--shadow-cta)]"
                    : "text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        {activeTab.stats.map((stat) => (
          <div
            key={stat.label}
            className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4"
          >
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-text-muted)]">
              {stat.label}
            </p>
            <p className="mt-2 text-xl font-black text-[var(--color-text-title)]">{stat.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
