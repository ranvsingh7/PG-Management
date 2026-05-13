"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { TenantLayout } from "@/components/tenant/tenant-layout";

type Invoice = {
  id: string;
  invoice_number: string;
  invoice_type?: string;
  amount: number;
  paid_amount: number;
  outstanding_amount: number;
  due_date: string;
  status?: string;
};

type OnboardingStatus = {
  status: "pending" | "completed";
  completed_at?: string | null;
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(Number.isFinite(value) ? value : 0);

export default function TenantDashboardPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [onboarding, setOnboarding] = useState<OnboardingStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const [invoiceRes, onboardingRes] = await Promise.all([
          fetch("/api/tenant/invoices", { cache: "no-store" }),
          fetch("/api/tenant/onboarding", { cache: "no-store" }),
        ]);

        const invoiceData = (await invoiceRes.json()) as Invoice[] | { message?: string };
        const onboardingData = (await onboardingRes.json()) as OnboardingStatus | { message?: string };

        if (!invoiceRes.ok) {
          const message = "message" in invoiceData ? invoiceData.message : "Failed to load invoices";
          setError(message || "Failed to load invoices");
        } else {
          setInvoices(Array.isArray(invoiceData) ? invoiceData : []);
        }

        if (onboardingRes.ok && "status" in onboardingData) {
          setOnboarding(onboardingData as OnboardingStatus);
        }
      } catch {
        setError("Unable to load dashboard right now.");
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  const summary = useMemo(() => {
    const totalOutstanding = invoices.reduce((sum, invoice) => sum + Number(invoice.outstanding_amount || 0), 0);
    const totalPaid = invoices.reduce((sum, invoice) => sum + Number(invoice.paid_amount || 0), 0);
    const pendingInvoices = invoices.filter((invoice) => Number(invoice.outstanding_amount || 0) > 0);
    return { totalOutstanding, totalPaid, pendingCount: pendingInvoices.length };
  }, [invoices]);

  const nextDueInvoice = useMemo(() => {
    return invoices
      .filter((invoice) => Number(invoice.outstanding_amount || 0) > 0)
      .sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime())[0];
  }, [invoices]);

  return (
    <TenantLayout>
      <section className="rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-[var(--shadow-feature)] sm:p-8">
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--color-sky)]">Dashboard</p>
        <h1 className="mt-2 text-3xl font-black tracking-tight text-[var(--color-text-title)]">Your stay overview</h1>
        <p className="mt-2 text-sm text-[var(--color-text-muted)]">Track your invoices, onboarding status, and notices in one place.</p>

        {error ? (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        {isLoading ? (
          <div className="mt-6 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-6 text-sm text-[var(--color-text-muted)]">
            Loading dashboard...
          </div>
        ) : (
          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            <article className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[var(--color-text-muted)]">Outstanding</p>
              <p className="mt-2 text-2xl font-black text-[var(--color-text-title)]">{formatCurrency(summary.totalOutstanding)}</p>
            </article>
            <article className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[var(--color-text-muted)]">Paid so far</p>
              <p className="mt-2 text-2xl font-black text-emerald-700">{formatCurrency(summary.totalPaid)}</p>
            </article>
            <article className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[var(--color-text-muted)]">Pending invoices</p>
              <p className="mt-2 text-2xl font-black text-amber-600">{summary.pendingCount}</p>
            </article>
          </div>
        )}
      </section>

      {onboarding?.status !== "completed" ? (
        <section className="mt-6 rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-[var(--shadow-feature)]">
          <h2 className="text-xl font-black text-[var(--color-text-title)]">Complete your onboarding</h2>
          <p className="mt-2 text-sm text-[var(--color-text-muted)]">
            Finish your profile and upload your documents to unlock all features.
          </p>
          <Link
            href="/tenant/onboarding"
            className="mt-4 inline-flex items-center justify-center rounded-xl bg-[var(--color-emerald)] px-4 py-2 text-sm font-semibold text-[var(--color-text-inverse)]"
          >
            Start onboarding
          </Link>
        </section>
      ) : null}

      {nextDueInvoice ? (
        <section className="mt-6 rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-[var(--shadow-feature)]">
          <h2 className="text-xl font-black text-[var(--color-text-title)]">Next payment due</h2>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-sm text-[var(--color-text-muted)]">Invoice</p>
              <p className="text-lg font-bold text-[var(--color-text-title)]">{nextDueInvoice.invoice_number}</p>
            </div>
            <div>
              <p className="text-sm text-[var(--color-text-muted)]">Amount</p>
              <p className="text-lg font-bold text-rose-600">{formatCurrency(nextDueInvoice.outstanding_amount)}</p>
            </div>
            <div>
              <p className="text-sm text-[var(--color-text-muted)]">Due date</p>
              <p className="text-lg font-bold text-[var(--color-text-title)]">{new Date(nextDueInvoice.due_date).toLocaleDateString("en-IN")}</p>
            </div>
          </div>
        </section>
      ) : null}
    </TenantLayout>
  );
}
