"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { DashboardLayout } from "@/components/home/dashboard-layout";
import { SelectField } from "@/components/ui/select-field";

type ExpenseStatus = "paid" | "pending";

type ExpenseCategory =
  | "maintenance"
  | "salary"
  | "utilities"
  | "supplies"
  | "rent"
  | "marketing"
  | "other";

type ExpenseItem = {
  id: string;
  title: string;
  category: ExpenseCategory;
  amount: number;
  expense_date: string;
  paid_date: string | null;
  status: ExpenseStatus;
  notes: string;
  created_at: string;
};

type ExpenseForm = {
  title: string;
  category: ExpenseCategory;
  amount: string;
  expense_date: string;
  status: ExpenseStatus;
  paid_date: string;
  notes: string;
};

const defaultForm = (): ExpenseForm => {
  const today = new Date().toISOString().slice(0, 10);
  return {
    title: "",
    category: "maintenance",
    amount: "",
    expense_date: today,
    status: "paid",
    paid_date: today,
    notes: "",
  };
};

const CATEGORY_OPTIONS: Array<{ value: ExpenseCategory; label: string }> = [
  { value: "maintenance", label: "Maintenance" },
  { value: "salary", label: "Salary" },
  { value: "utilities", label: "Utilities" },
  { value: "supplies", label: "Supplies" },
  { value: "rent", label: "Office Rent" },
  { value: "marketing", label: "Marketing" },
  { value: "other", label: "Other" },
];

const STATUS_OPTIONS: Array<{ value: "all" | ExpenseStatus; label: string }> = [
  { value: "all", label: "All" },
  { value: "paid", label: "Paid" },
  { value: "pending", label: "Pending" },
];

const getMonthKey = (date = new Date()) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(Number.isFinite(value) ? value : 0);
};

const formatDate = (value: string | null) => {
  if (!value) {
    return "-";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return date.toLocaleDateString("en-IN", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  });
};

const getCategoryLabel = (value: ExpenseCategory) => {
  return CATEGORY_OPTIONS.find((option) => option.value === value)?.label || "Other";
};

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<ExpenseItem[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState<ExpenseForm>(defaultForm());
  const [formError, setFormError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [listError, setListError] = useState<string | null>(null);

  const [selectedMonth, setSelectedMonth] = useState(getMonthKey());
  const [searchText, setSearchText] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | ExpenseStatus>("all");
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const loadExpenses = async () => {
    setIsLoading(true);
    setListError(null);

    try {
      const params = new URLSearchParams({ month: selectedMonth });
      const response = await fetch(`/api/admin/expenses?${params.toString()}`, { cache: "no-store" });
      const data = (await response.json()) as ExpenseItem[] | { message?: string };

      if (!response.ok) {
        const message = "message" in data ? data.message : "Failed to fetch expenses";
        setListError(message || "Failed to fetch expenses");
        setExpenses([]);
        return;
      }

      setExpenses(Array.isArray(data) ? data : []);
    } catch {
      setListError("Unable to load expenses right now.");
      setExpenses([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadExpenses();
  }, [selectedMonth]);

  const filteredExpenses = useMemo(() => {
    const query = searchText.trim().toLowerCase();

    return expenses
      .filter((expense) => (statusFilter === "all" ? true : expense.status === statusFilter))
      .filter((expense) => {
        if (!query) {
          return true;
        }

        return (
          expense.title.toLowerCase().includes(query) ||
          expense.notes.toLowerCase().includes(query) ||
          getCategoryLabel(expense.category).toLowerCase().includes(query)
        );
      })
      .sort((a, b) => new Date(b.expense_date).getTime() - new Date(a.expense_date).getTime());
  }, [expenses, searchText, statusFilter]);

  const summary = useMemo(() => {
    const total = expenses.reduce((sum, expense) => sum + expense.amount, 0);
    const paid = expenses.filter((expense) => expense.status === "paid").reduce((sum, expense) => sum + expense.amount, 0);
    const pending = expenses
      .filter((expense) => expense.status === "pending")
      .reduce((sum, expense) => sum + expense.amount, 0);

    return {
      total,
      paid,
      pending,
      count: expenses.length,
    };
  }, [expenses]);

  const onOpenAddModal = () => {
    setForm(defaultForm());
    setFormError(null);
    setIsModalOpen(true);
  };

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);

    const title = form.title.trim();
    const amount = Number(form.amount);

    if (!title || !form.expense_date || !form.amount) {
      setFormError("Please fill all required fields.");
      return;
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      setFormError("Amount must be a valid number greater than 0.");
      return;
    }

    if (form.status === "paid" && !form.paid_date) {
      setFormError("Paid date is required when status is paid.");
      return;
    }

    try {
      const response = await fetch("/api/admin/expenses", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title,
          category: form.category,
          amount: Number(amount.toFixed(2)),
          expense_date: form.expense_date,
          paid_date: form.status === "paid" ? form.paid_date : null,
          status: form.status,
          notes: form.notes.trim(),
        }),
      });

      const result = (await response.json()) as { message?: string; errors?: string[] };

      if (!response.ok) {
        setFormError(result.errors?.join(", ") || result.message || "Failed to add expense.");
        return;
      }

      setIsModalOpen(false);
      setSuccessMessage("Expense added successfully.");
      await loadExpenses();
    } catch {
      setFormError("Unable to save expense right now.");
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <section className="rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-[var(--shadow-feature)] sm:p-8">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--color-sky)]">Expense Management</p>
              <h1 className="mt-1 text-3xl font-black tracking-tight text-[var(--color-text-title)] sm:text-4xl">
                Track all expenses
              </h1>
              <p className="mt-2 text-sm text-[var(--color-text-muted)]">
                Add, monitor, and review your monthly operational expenses.
              </p>
            </div>

            <button
              type="button"
              onClick={onOpenAddModal}
              className="cursor-pointer inline-flex items-center justify-center rounded-xl bg-[var(--color-emerald)] px-4 py-2 text-sm font-bold text-[var(--color-text-inverse)] shadow-[var(--shadow-cta)] transition hover:bg-[var(--color-emerald-hover)]"
            >
              Add Expense
            </button>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryCard label="Total This Month" value={summary.total} tone="sky" />
          <SummaryCard label="Paid Expenses" value={summary.paid} tone="paid" />
          <SummaryCard label="Pending Expenses" value={summary.pending} tone="pending" />
          <SummaryCard label="Total Entries" value={summary.count} tone="default" asCount />
        </section>

        <section className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-feature)]">
          <div className="flex items-center justify-between border-b border-[var(--color-border)] px-5 py-4">
            <h2 className="text-base font-semibold text-[var(--color-text-title)]">Expense Records</h2>
            <p className="text-sm text-[var(--color-text-secondary)]">Month: {selectedMonth}</p>
          </div>

          <div className="grid grid-cols-1 gap-3 border-b border-[var(--color-border)] px-5 py-4 sm:grid-cols-3">
            <label className="text-sm font-medium text-[var(--color-text-secondary)]">
              Month
              <input
                type="month"
                value={selectedMonth}
                onChange={(event) => setSelectedMonth(event.target.value)}
                className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm outline-none focus:border-[var(--color-sky)] focus:ring-2 focus:ring-[var(--color-sky-soft)]"
              />
            </label>

            <label className="text-sm font-medium text-[var(--color-text-secondary)]">
              Search
              <input
                type="text"
                value={searchText}
                onChange={(event) => setSearchText(event.target.value)}
                placeholder="Search title, note, category"
                className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm outline-none focus:border-[var(--color-sky)] focus:ring-2 focus:ring-[var(--color-sky-soft)]"
              />
            </label>

            <SelectField
              label="Status"
              value={statusFilter}
              onChange={(value) => setStatusFilter(value as "all" | ExpenseStatus)}
              options={STATUS_OPTIONS}
            />
          </div>

          {successMessage ? (
            <div className="mx-5 mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              {successMessage}
            </div>
          ) : null}

          {listError ? (
            <div className="mx-5 mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {listError}
            </div>
          ) : null}

          <div className="overflow-x-auto px-2 pb-3 sm:px-3">
            <table className="min-w-full divide-y divide-[var(--color-border)] text-sm">
              <thead className="bg-[var(--color-surface-muted)] text-left text-xs uppercase tracking-wide text-[var(--color-text-muted)]">
                <tr>
                  <th className="px-4 py-3">Title</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">Expense Date</th>
                  <th className="px-4 py-3">Paid Date</th>
                  <th className="px-4 py-3 text-right">Amount</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Notes</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-[var(--color-border)] bg-[var(--color-surface)]">
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-[var(--color-text-muted)]">
                      Loading expenses...
                    </td>
                  </tr>
                ) : null}

                {!isLoading && filteredExpenses.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-[var(--color-text-muted)]">
                      No expenses found for selected filters.
                    </td>
                  </tr>
                ) : null}

                {!isLoading && filteredExpenses.length > 0
                  ? (
                  filteredExpenses.map((expense) => (
                    <tr key={expense.id} className="hover:bg-[var(--color-surface-soft)]">
                      <td className="px-4 py-3 font-semibold text-[var(--color-text-title)]">{expense.title}</td>
                      <td className="px-4 py-3 text-[var(--color-text-secondary)]">{getCategoryLabel(expense.category)}</td>
                      <td className="px-4 py-3 text-[var(--color-text-secondary)]">{formatDate(expense.expense_date)}</td>
                      <td className="px-4 py-3 text-[var(--color-text-secondary)]">{formatDate(expense.paid_date)}</td>
                      <td className="px-4 py-3 text-right font-semibold text-[var(--color-text-title)]">
                        {formatCurrency(expense.amount)}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${
                            expense.status === "paid"
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-amber-100 text-amber-700"
                          }`}
                        >
                          {expense.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-[var(--color-text-secondary)]">{expense.notes || "-"}</td>
                    </tr>
                  ))
                ) : null}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {isModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
          <div className="w-full max-w-2xl rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-xl font-semibold text-[var(--color-text-title)]">Add New Expense</h3>
                <p className="text-sm text-[var(--color-text-secondary)]">Capture a new operational expense.</p>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="cursor-pointer rounded-md border border-[var(--color-border)] px-3 py-1 text-sm text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-soft)]"
              >
                Close
              </button>
            </div>

            <form onSubmit={onSubmit} className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="text-sm font-medium text-[var(--color-text-secondary)] sm:col-span-2">
                Expense Title
                <input
                  type="text"
                  value={form.title}
                  onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
                  required
                  className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm outline-none focus:border-[var(--color-sky)] focus:ring-2 focus:ring-[var(--color-sky-soft)]"
                  placeholder="e.g. Lift maintenance"
                />
              </label>

              <SelectField
                label="Category"
                value={form.category}
                onChange={(value) => setForm((prev) => ({ ...prev, category: value as ExpenseCategory }))}
                options={CATEGORY_OPTIONS}
              />

              <label className="text-sm font-medium text-[var(--color-text-secondary)]">
                Amount
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={form.amount}
                  onChange={(event) => setForm((prev) => ({ ...prev, amount: event.target.value }))}
                  required
                  className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm outline-none focus:border-[var(--color-sky)] focus:ring-2 focus:ring-[var(--color-sky-soft)]"
                  placeholder="0.00"
                />
              </label>

              <label className="text-sm font-medium text-[var(--color-text-secondary)]">
                Expense Date
                <input
                  type="date"
                  value={form.expense_date}
                  onChange={(event) => setForm((prev) => ({ ...prev, expense_date: event.target.value }))}
                  required
                  className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm outline-none focus:border-[var(--color-sky)] focus:ring-2 focus:ring-[var(--color-sky-soft)]"
                />
              </label>

              <SelectField
                label="Status"
                value={form.status}
                onChange={(value) =>
                  setForm((prev) => ({
                    ...prev,
                    status: value as ExpenseStatus,
                    paid_date: value === "paid" ? prev.paid_date || prev.expense_date : "",
                  }))
                }
                options={[
                  { value: "paid", label: "Paid" },
                  { value: "pending", label: "Pending" },
                ]}
              />

              <label className="text-sm font-medium text-[var(--color-text-secondary)]">
                Paid Date
                <input
                  type="date"
                  value={form.paid_date}
                  onChange={(event) => setForm((prev) => ({ ...prev, paid_date: event.target.value }))}
                  disabled={form.status !== "paid"}
                  className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm outline-none focus:border-[var(--color-sky)] focus:ring-2 focus:ring-[var(--color-sky-soft)] disabled:opacity-60"
                />
              </label>

              <label className="text-sm font-medium text-[var(--color-text-secondary)] sm:col-span-2">
                Notes
                <textarea
                  value={form.notes}
                  onChange={(event) => setForm((prev) => ({ ...prev, notes: event.target.value }))}
                  rows={3}
                  className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm outline-none focus:border-[var(--color-sky)] focus:ring-2 focus:ring-[var(--color-sky-soft)]"
                  placeholder="Optional note"
                />
              </label>

              {formError ? (
                <p className="sm:col-span-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {formError}
                </p>
              ) : null}

              <div className="sm:col-span-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="cursor-pointer rounded-md border border-[var(--color-border)] px-3 py-1.5 text-sm text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-soft)]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="cursor-pointer rounded-md bg-[var(--color-emerald)] px-3 py-1.5 text-sm font-semibold text-[var(--color-text-inverse)] transition hover:bg-[var(--color-emerald-hover)]"
                >
                  Save Expense
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </DashboardLayout>
  );
}

type SummaryCardProps = {
  label: string;
  value: number;
  tone?: "default" | "pending" | "paid" | "sky";
  asCount?: boolean;
};

function SummaryCard({ label, value, tone = "default", asCount = false }: SummaryCardProps) {
  const toneClass =
    tone === "pending"
      ? "bg-amber-50 text-amber-700 border-amber-200"
      : tone === "paid"
        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
        : tone === "sky"
          ? "bg-sky-50 text-sky-700 border-sky-200"
          : "bg-slate-50 text-slate-800 border-slate-200";

  return (
    <div className={`rounded-xl border p-4 ${toneClass}`}>
      <p className="text-xs font-semibold uppercase tracking-wide">{label}</p>
      <p className="mt-2 text-2xl font-bold">{asCount ? Math.trunc(value) : formatCurrency(value)}</p>
    </div>
  );
}
