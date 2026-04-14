"use client";

import { DashboardLayout } from "@/components/home/dashboard-layout";

export default function ElectricityBillingPage() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <section className="rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-[var(--shadow-feature)] sm:p-8">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--color-sky)]">
            Electricity Billing
          </p>
          <h1 className="mt-1 text-3xl font-black tracking-tight text-[var(--color-text-title)] sm:text-4xl">
            Electricity module design
          </h1>
          <p className="mt-2 text-sm text-[var(--color-text-muted)]">
            Billing implementation has been removed from this module. This page now keeps only the UI shell.
          </p>
        </section>

        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <article className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-[var(--shadow-feature)]">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--color-text-muted)]">Building</p>
            <div className="mt-2 h-10 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-muted)]" />
          </article>
          <article className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-[var(--shadow-feature)]">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--color-text-muted)]">Billing Month</p>
            <div className="mt-2 h-10 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-muted)]" />
          </article>
          <article className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-[var(--shadow-feature)]">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--color-text-muted)]">Rate / Unit</p>
            <div className="mt-2 h-10 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-muted)]" />
          </article>
        </section>

        <section className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-[var(--shadow-feature)]">
          <h2 className="text-lg font-bold text-[var(--color-text-title)]">Month-End Reading Form</h2>
          <p className="mt-2 text-sm text-[var(--color-text-muted)]">
            Implementation removed. This table is a preserved design placeholder.
          </p>
          <div className="mt-4 overflow-x-auto rounded-xl border border-[var(--color-border)]">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[var(--color-border)] bg-[var(--color-surface-muted)]">
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-[0.08em] text-[var(--color-text-muted)]">Room</th>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-[0.08em] text-[var(--color-text-muted)]">Previous Reading</th>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-[0.08em] text-[var(--color-text-muted)]">Month-End Reading</th>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-[0.08em] text-[var(--color-text-muted)]">Bill Status</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="px-4 py-6 text-sm text-[var(--color-text-secondary)]" colSpan={4}>
                    Electricity billing backend and API integration removed.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </DashboardLayout>
  );
}
