"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { DashboardLayout } from "@/components/home/dashboard-layout";
import { ToastViewport, useToast } from "@/components/ui/toast";

type Building = {
  id: string;
  name: string;
  city?: string;
  area?: string;
};

type Room = {
  id: string;
  building_id: string;
  room_number: string;
  capacity: number;
  occupied?: number;
  status?: string;
};

type TenantForm = {
  name: string;
  phone: string;
  email: string;
  building_id: string;
  room_number: string;
  check_in_date: string;
  check_out_date: string;
  rent: string;
  status: "active" | "inactive";
  security_deposit_amount: string;
  agreement: string;
  pg_id: string;
  current_reading: string;
};

type CreateTenantResponse = {
  id: string;
  login_id?: string;
  initial_password?: string;
  check_in_total_due?: number;
  message?: string;
};

const initialForm: TenantForm = {
  name: "",
  phone: "",
  email: "",
  building_id: "",
  room_number: "",
  check_in_date: "",
  check_out_date: "",
  rent: "",
  status: "active",
  security_deposit_amount: "",
  agreement: "",
  pg_id: "",
  current_reading: "",
};

const onlyDigits = (value: string) => value.replace(/\D/g, "");
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const formatIndianNumber = (value: number) => {
  const num = Number.isFinite(value) ? Math.trunc(value) : 0;
  const sign = num < 0 ? "-" : "";
  const digits = String(Math.abs(num));

  if (digits.length <= 3) {
    return `${sign}${digits}`;
  }

  const lastThree = digits.slice(-3);
  const rest = digits.slice(0, -3);
  const groupedRest = rest.replace(/\B(?=(\d{2})+(?!\d))/g, ",");
  return `${sign}${groupedRest},${lastThree}`;
};

export default function AdminTenantCreatePage() {
  const router = useRouter();
  const { toast, showToast } = useToast({ defaultDurationMs: 3200 });

  const [form, setForm] = useState<TenantForm>(initialForm);
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [createdTenantId, setCreatedTenantId] = useState<string | null>(null);
  const [createdLoginId, setCreatedLoginId] = useState<string | null>(null);
  const [createdPassword, setCreatedPassword] = useState<string | null>(null);
  const [createdCheckInDue, setCreatedCheckInDue] = useState<number>(0);
  const [isGeneratingFirstInvoice, setIsGeneratingFirstInvoice] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      setLoadError(null);

      try {
        const [buildingsResponse, roomsResponse] = await Promise.all([
          fetch("/api/admin/buildings", { cache: "no-store" }),
          fetch("/api/admin/rooms", { cache: "no-store" }),
        ]);

        const buildingsData = (await buildingsResponse.json()) as Building[] | { message?: string };
        const roomsData = (await roomsResponse.json()) as Room[] | { message?: string };

        if (!buildingsResponse.ok) {
          const message = "message" in buildingsData ? buildingsData.message : "Failed to load buildings.";
          setLoadError(message || "Failed to load buildings.");
          return;
        }

        if (!roomsResponse.ok) {
          const message = "message" in roomsData ? roomsData.message : "Failed to load rooms.";
          setLoadError(message || "Failed to load rooms.");
          return;
        }

        setBuildings(Array.isArray(buildingsData) ? buildingsData : []);
        setRooms(Array.isArray(roomsData) ? roomsData : []);
      } catch {
        setLoadError("Unable to load tenant resources right now.");
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  const roomOptions = useMemo(() => {
    if (!form.building_id) {
      return [];
    }

    return rooms.filter((room) => room.building_id === form.building_id);
  }, [rooms, form.building_id]);

  const checkInPreview = useMemo(() => {
    const rent = Number(form.rent || 0);
    const securityDeposit = Number(form.security_deposit_amount || 0);

    if (!Number.isFinite(rent) || rent < 0 || !form.check_in_date) {
      return null;
    }

    const checkInDate = new Date(form.check_in_date);
    if (Number.isNaN(checkInDate.getTime())) {
      return null;
    }

    return {
      rent: Number(rent.toFixed(2)),
      deposit: Number(securityDeposit.toFixed(2)),
      total: Number((rent + securityDeposit).toFixed(2)),
    };
  }, [form.rent, form.check_in_date, form.security_deposit_amount]);

  const resetCredentials = () => {
    setCreatedTenantId(null);
    setCreatedLoginId(null);
    setCreatedPassword(null);
    setCreatedCheckInDue(0);
  };

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    setFormError(null);

    const name = form.name.trim();
    const phone = onlyDigits(form.phone);
    const email = form.email.trim().toLowerCase();
    const buildingId = form.building_id.trim();
    const roomNumber = form.room_number.trim();
    const checkInDate = form.check_in_date;
    const checkOutDate = form.check_out_date || null;
    const rent = Number(form.rent);
    const securityDepositAmount = form.security_deposit_amount ? Number(form.security_deposit_amount) : 0;
    const currentReading = form.current_reading ? Number(form.current_reading) : 0;

    if (!name || !phone || !email || !buildingId || !roomNumber || !checkInDate || !form.rent) {
      const message = "Please fill all required fields.";
      setFormError(message);
      showToast(message, "error");
      return;
    }

    if (phone.length !== 10) {
      const message = "Phone number must be exactly 10 digits.";
      setFormError(message);
      showToast(message, "error");
      return;
    }

    if (!emailRegex.test(email)) {
      const message = "Please enter a valid email address.";
      setFormError(message);
      showToast(message, "error");
      return;
    }

    if (!Number.isFinite(rent) || rent < 0) {
      const message = "Monthly rent must be a valid non-negative number.";
      setFormError(message);
      showToast(message, "error");
      return;
    }

    if (!Number.isFinite(securityDepositAmount) || securityDepositAmount < 0) {
      const message = "Security deposit must be a valid non-negative number.";
      setFormError(message);
      showToast(message, "error");
      return;
    }

    if (!Number.isFinite(currentReading) || currentReading < 0) {
      const message = "Current reading must be a valid non-negative number.";
      setFormError(message);
      showToast(message, "error");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/admin/tenants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          phone,
          email,
          building_id: buildingId,
          room_number: roomNumber,
          check_in_date: checkInDate,
          check_out_date: checkOutDate,
          rent,
          status: form.status,
          security_deposit_amount: securityDepositAmount,
          agreement: form.agreement.trim() || null,
          pg_id: form.pg_id.trim() || null,
          current_reading: currentReading,
        }),
      });

      const result = (await response.json()) as CreateTenantResponse & { errors?: string[] };

      if (!response.ok) {
        const message = result.errors?.join(", ") || result.message || "Failed to create tenant.";
        setFormError(message);
        showToast(message, "error");
        return;
      }

      setCreatedTenantId(result.id);
      setCreatedLoginId(String(result.login_id || phone));
      setCreatedPassword(String(result.initial_password || ""));
      setCreatedCheckInDue(Number(result.check_in_total_due || 0));
      showToast("Tenant created successfully.", "success");
      setForm(initialForm);
    } catch {
      const message = "Unable to create tenant right now.";
      setFormError(message);
      showToast(message, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const onGenerateFirstInvoice = async () => {
    if (!createdTenantId) {
      return;
    }

    setIsGeneratingFirstInvoice(true);

    try {
      const response = await fetch("/api/admin/invoices/first-invoice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tenant_id: createdTenantId }),
      });

      const result = (await response.json()) as { message?: string };

      if (!response.ok) {
        showToast(result.message || "Failed to generate first invoice.", "error");
        return;
      }

      showToast("First invoice generated successfully.", "success");
      resetCredentials();
      router.push(`/admin/tenants/${createdTenantId}`);
    } catch {
      showToast("Unable to generate first invoice right now.", "error");
    } finally {
      setIsGeneratingFirstInvoice(false);
    }
  };

  return (
    <DashboardLayout>
      <section className="relative overflow-hidden rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-[var(--shadow-feature)] sm:p-8">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -left-20 -top-16 h-40 w-40 rounded-full bg-[var(--color-sky-soft)] blur-3xl" />
          <div className="absolute -right-10 top-20 h-40 w-40 rounded-full bg-[var(--color-emerald-soft)] blur-3xl" />
        </div>

        <div className="relative flex flex-wrap items-start justify-between gap-3">
          <div>
            <Link
              href="/admin/tenants"
              className="inline-flex items-center gap-1 text-xs font-bold uppercase tracking-[0.14em] text-[var(--color-sky)] hover:underline"
            >
              Back to Tenants
            </Link>
            <h1 className="mt-2 text-3xl font-black tracking-tight text-[var(--color-text-title)] sm:text-4xl">
              Register Tenant
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-[var(--color-text-muted)]">
              Capture complete tenant information and generate login credentials instantly.
            </p>
          </div>
        </div>

        {isLoading ? (
          <div className="mt-6 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-6 text-center text-sm text-[var(--color-text-muted)]">
            Loading tenant resources...
          </div>
        ) : null}

        {loadError ? (
          <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-5 text-sm font-medium text-red-700">
            {loadError}
          </div>
        ) : null}

        {!isLoading && !loadError ? (
          <form onSubmit={onSubmit} className="relative mt-6 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-5">
              <h2 className="text-lg font-bold text-[var(--color-text-title)]">Tenant Details</h2>
              <p className="mt-1 text-sm text-[var(--color-text-muted)]">
                All fields marked with * are required.
              </p>

              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <label className="text-sm font-semibold text-[var(--color-text-secondary)]">
                  Full Name*
                  <input
                    type="text"
                    value={form.name}
                    onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
                    required
                    className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm outline-none focus:border-[var(--color-sky)] focus:ring-2 focus:ring-[var(--color-sky-soft)]"
                  />
                </label>

                <label className="text-sm font-semibold text-[var(--color-text-secondary)]">
                  Phone*
                  <input
                    type="tel"
                    value={form.phone}
                    onChange={(event) => setForm((prev) => ({ ...prev, phone: event.target.value }))}
                    required
                    className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm outline-none focus:border-[var(--color-sky)] focus:ring-2 focus:ring-[var(--color-sky-soft)]"
                  />
                </label>

                <label className="text-sm font-semibold text-[var(--color-text-secondary)] sm:col-span-2">
                  Email*
                  <input
                    type="email"
                    value={form.email}
                    onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
                    required
                    className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm outline-none focus:border-[var(--color-sky)] focus:ring-2 focus:ring-[var(--color-sky-soft)]"
                  />
                </label>
              </div>

              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <label className="text-sm font-semibold text-[var(--color-text-secondary)]">
                  Building*
                  <select
                    value={form.building_id}
                    onChange={(event) => setForm((prev) => ({ ...prev, building_id: event.target.value, room_number: "" }))}
                    required
                    className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm outline-none focus:border-[var(--color-sky)] focus:ring-2 focus:ring-[var(--color-sky-soft)]"
                  >
                    <option value="">Select building</option>
                    {buildings.map((building) => (
                      <option key={building.id} value={building.id}>
                        {building.name}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="text-sm font-semibold text-[var(--color-text-secondary)]">
                  Room*
                  <select
                    value={form.room_number}
                    onChange={(event) => setForm((prev) => ({ ...prev, room_number: event.target.value }))}
                    required
                    className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm outline-none focus:border-[var(--color-sky)] focus:ring-2 focus:ring-[var(--color-sky-soft)]"
                  >
                    <option value="">Select room</option>
                    {roomOptions.map((room) => (
                      <option key={room.id} value={room.room_number}>
                        Room {room.room_number} (Cap {room.capacity || 0})
                      </option>
                    ))}
                  </select>
                </label>

                <label className="text-sm font-semibold text-[var(--color-text-secondary)]">
                  Check-in Date*
                  <input
                    type="date"
                    value={form.check_in_date}
                    onChange={(event) => setForm((prev) => ({ ...prev, check_in_date: event.target.value }))}
                    required
                    className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm outline-none focus:border-[var(--color-sky)] focus:ring-2 focus:ring-[var(--color-sky-soft)]"
                  />
                </label>

                <label className="text-sm font-semibold text-[var(--color-text-secondary)]">
                  Check-out Date
                  <input
                    type="date"
                    value={form.check_out_date}
                    onChange={(event) => setForm((prev) => ({ ...prev, check_out_date: event.target.value }))}
                    className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm outline-none focus:border-[var(--color-sky)] focus:ring-2 focus:ring-[var(--color-sky-soft)]"
                  />
                </label>
              </div>

              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <label className="text-sm font-semibold text-[var(--color-text-secondary)]">
                  Monthly Rent (INR)*
                  <input
                    type="number"
                    value={form.rent}
                    onChange={(event) => setForm((prev) => ({ ...prev, rent: event.target.value }))}
                    required
                    min={0}
                    className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm outline-none focus:border-[var(--color-sky)] focus:ring-2 focus:ring-[var(--color-sky-soft)]"
                  />
                </label>

                <label className="text-sm font-semibold text-[var(--color-text-secondary)]">
                  Security Deposit (INR)
                  <input
                    type="number"
                    value={form.security_deposit_amount}
                    onChange={(event) => setForm((prev) => ({ ...prev, security_deposit_amount: event.target.value }))}
                    min={0}
                    className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm outline-none focus:border-[var(--color-sky)] focus:ring-2 focus:ring-[var(--color-sky-soft)]"
                  />
                </label>

                <label className="text-sm font-semibold text-[var(--color-text-secondary)]">
                  Current Meter Reading
                  <input
                    type="number"
                    value={form.current_reading}
                    onChange={(event) => setForm((prev) => ({ ...prev, current_reading: event.target.value }))}
                    min={0}
                    className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm outline-none focus:border-[var(--color-sky)] focus:ring-2 focus:ring-[var(--color-sky-soft)]"
                  />
                </label>

                <label className="text-sm font-semibold text-[var(--color-text-secondary)]">
                  Status*
                  <select
                    value={form.status}
                    onChange={(event) => setForm((prev) => ({ ...prev, status: event.target.value as TenantForm["status"] }))}
                    required
                    className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm outline-none focus:border-[var(--color-sky)] focus:ring-2 focus:ring-[var(--color-sky-soft)]"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </label>

                <label className="text-sm font-semibold text-[var(--color-text-secondary)] sm:col-span-2">
                  Agreement Reference / Link
                  <input
                    type="text"
                    value={form.agreement}
                    onChange={(event) => setForm((prev) => ({ ...prev, agreement: event.target.value }))}
                    className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm outline-none focus:border-[var(--color-sky)] focus:ring-2 focus:ring-[var(--color-sky-soft)]"
                  />
                </label>

                <label className="text-sm font-semibold text-[var(--color-text-secondary)] sm:col-span-2">
                  PG ID (Optional)
                  <input
                    type="text"
                    value={form.pg_id}
                    onChange={(event) => setForm((prev) => ({ ...prev, pg_id: event.target.value }))}
                    className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm outline-none focus:border-[var(--color-sky)] focus:ring-2 focus:ring-[var(--color-sky-soft)]"
                  />
                </label>
              </div>

              {formError ? (
                <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                  {formError}
                </p>
              ) : null}

              <div className="mt-5 flex flex-wrap items-center justify-end gap-2">
                <Link
                  href="/admin/tenants"
                  className="cursor-pointer rounded-lg border border-[var(--color-border)] px-4 py-2 text-sm font-semibold text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-soft)]"
                >
                  Cancel
                </Link>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="cursor-pointer rounded-lg bg-[var(--color-emerald)] px-4 py-2 text-sm font-semibold text-[var(--color-text-inverse)] transition hover:bg-[var(--color-emerald-hover)] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSubmitting ? "Saving..." : "Create Tenant"}
                </button>
              </div>
            </div>

            <aside className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-5">
              <h3 className="text-lg font-bold text-[var(--color-text-title)]">Check-in Preview</h3>
              <p className="mt-1 text-sm text-[var(--color-text-muted)]">
                Rent + deposit summary for check-in.
              </p>

              {checkInPreview ? (
                <div className="mt-4 space-y-3 text-sm">
                  <div className="flex items-center justify-between rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2">
                    <span className="text-[var(--color-text-secondary)]">Rent</span>
                    <span className="font-semibold text-[var(--color-text-title)]">Rs. {formatIndianNumber(checkInPreview.rent)}</span>
                  </div>
                  <div className="flex items-center justify-between rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2">
                    <span className="text-[var(--color-text-secondary)]">Security Deposit</span>
                    <span className="font-semibold text-[var(--color-text-title)]">Rs. {formatIndianNumber(checkInPreview.deposit)}</span>
                  </div>
                  <div className="flex items-center justify-between rounded-lg border border-[var(--color-emerald)] bg-[var(--color-emerald-soft)] px-3 py-2">
                    <span className="text-[var(--color-emerald)]">Total Due</span>
                    <span className="font-black text-[var(--color-emerald)]">Rs. {formatIndianNumber(checkInPreview.total)}</span>
                  </div>
                </div>
              ) : (
                <div className="mt-4 rounded-xl border border-dashed border-[var(--color-border-strong)] bg-[var(--color-surface)] p-4 text-sm text-[var(--color-text-muted)]">
                  Select check-in date and rent to preview total due.
                </div>
              )}
            </aside>
          </form>
        ) : null}
      </section>

      {createdTenantId ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-lg rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-[var(--shadow-card)]">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-xl font-black text-[var(--color-text-title)]">Tenant Created</h3>
                <p className="mt-1 text-sm text-[var(--color-text-muted)]">
                  Share these credentials with the tenant for onboarding.
                </p>
              </div>
              <button
                type="button"
                onClick={resetCredentials}
                className="cursor-pointer rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-sm font-semibold text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-soft)]"
              >
                Close
              </button>
            </div>

            <div className="mt-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-4 text-sm">
              <p className="text-[var(--color-text-secondary)]">
                Login ID: <span className="font-semibold text-[var(--color-text-title)]">{createdLoginId || "-"}</span>
              </p>
              <p className="mt-2 text-[var(--color-text-secondary)]">
                Temporary Password: <span className="font-semibold text-[var(--color-text-title)]">{createdPassword || "-"}</span>
              </p>
              <p className="mt-2 text-xs text-[var(--color-text-muted)]">
                Tenant can update the password after their first login.
              </p>
            </div>

            <div className="mt-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-4">
              <p className="text-sm text-[var(--color-text-secondary)]">
                Check-in due: <span className="font-semibold text-[var(--color-text-title)]">Rs. {formatIndianNumber(createdCheckInDue)}</span>
              </p>
              <p className="mt-2 text-xs text-[var(--color-text-muted)]">
                Generate the first invoice to include rent + security deposit in one invoice.
              </p>
            </div>

            <div className="mt-5 flex flex-wrap items-center justify-end gap-2">
              <Link
                href={`/admin/tenants/${createdTenantId}`}
                className="cursor-pointer rounded-lg border border-[var(--color-border)] px-4 py-2 text-sm font-semibold text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-soft)]"
              >
                View Tenant
              </Link>
              <button
                type="button"
                onClick={resetCredentials}
                className="cursor-pointer rounded-lg border border-[var(--color-border)] px-4 py-2 text-sm font-semibold text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-soft)]"
              >
                Skip for Now
              </button>
              <button
                type="button"
                onClick={onGenerateFirstInvoice}
                disabled={isGeneratingFirstInvoice}
                className="cursor-pointer rounded-lg bg-[var(--color-emerald)] px-4 py-2 text-sm font-semibold text-[var(--color-text-inverse)] transition hover:bg-[var(--color-emerald-hover)] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isGeneratingFirstInvoice ? "Generating..." : "Generate Invoice"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <ToastViewport toast={toast} />
    </DashboardLayout>
  );
}
