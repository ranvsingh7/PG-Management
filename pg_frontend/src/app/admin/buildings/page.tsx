"use client";

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { DashboardLayout } from "@/components/home/dashboard-layout";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { ToastViewport, useToast } from "@/components/ui/toast";

type Building = {
  id: string;
  name: string;
  address: string;
  city: string;
  area: string;
  total_floors: number;
  total_rooms: number;
  caretaker_name: string;
  caretaker_phone: string;
  amenities: string[];
  security_deposit: number;
  electricity_rate: number;
  status: string;
  created_at: string;
};

type BuildingForm = {
  name: string;
  address: string;
  city: string;
  area: string;
  total_floors: string;
  total_rooms: string;
  caretaker_name: string;
  caretaker_phone: string;
  amenities: string;
  security_deposit: string;
  electricity_rate: string;
};

const initialForm: BuildingForm = {
  name: "",
  address: "",
  city: "",
  area: "",
  total_floors: "",
  total_rooms: "",
  caretaker_name: "",
  caretaker_phone: "",
  amenities: "",
  security_deposit: "",
  electricity_rate: "",
};

const onlyDigits = (value: string) => value.replace(/\D/g, "");
const normalizeAmenitiesInput = (value: string) => value.toUpperCase().replace(/\s+/g, "");

export default function BuildingsPage() {
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [listError, setListError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [totalCount, setTotalCount] = useState(0);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBuildingId, setEditingBuildingId] = useState<string | null>(null);
  const [form, setForm] = useState<BuildingForm>(initialForm);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [searchText, setSearchText] = useState("");
  const { toast, showToast } = useToast({ defaultDurationMs: 3200 });
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const hasLoadedInitialRef = useRef(false);

  const pageSize = 9;

  const amenitiesPreview = useMemo(
    () =>
      form.amenities
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean),
    [form.amenities]
  );

  const loadBuildings = useCallback(async (options?: { reset?: boolean; pageToLoad?: number }) => {
    const reset = Boolean(options?.reset);

    if (reset) {
      setIsLoading(true);
      setListError(null);
    } else {
      setIsLoadingMore(true);
    }

    try {
      const nextPage = options?.pageToLoad || 1;
      const search = new URLSearchParams({
        page: String(nextPage),
        limit: String(pageSize),
      });

      const query = searchText.trim();
      if (query) {
        search.set("search", query);
      }

      const response = await fetch(`/api/admin/buildings?${search.toString()}`, { cache: "no-store" });
      const data = (await response.json()) as
        | { message?: string }
        | {
            items?: Building[];
            pagination?: {
              page: number;
              total: number;
              hasNextPage: boolean;
            };
          };

      if (!response.ok) {
        const message = "message" in data ? data.message : "Failed to fetch buildings";
        setListError(message || "Failed to fetch buildings");
        return;
      }

      const items = Array.isArray((data as { items?: Building[] }).items)
        ? (data as { items: Building[] }).items
        : Array.isArray(data)
        ? data
        : [];

      const pagination = (data as { pagination?: { page: number; total: number; hasNextPage: boolean } }).pagination;

      setBuildings((prev) => (reset ? items : [...prev, ...items]));
      setPage(pagination?.page || nextPage);
      setHasNextPage(Boolean(pagination?.hasNextPage));
      setTotalCount(Number(pagination?.total || items.length));
    } catch {
      setListError("Unable to load buildings right now.");
    } finally {
      if (reset) {
        setIsLoading(false);
      } else {
        setIsLoadingMore(false);
      }
    }
  }, [pageSize, searchText]);

  useEffect(() => {
    if (!hasLoadedInitialRef.current) {
      hasLoadedInitialRef.current = true;
      loadBuildings({ reset: true, pageToLoad: 1 });
      return;
    }

    const timeout = window.setTimeout(() => {
      loadBuildings({ reset: true, pageToLoad: 1 });
    }, 250);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [loadBuildings]);

  useEffect(() => {
    const node = loadMoreRef.current;
    if (!node) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const first = entries[0];
        if (!first.isIntersecting) {
          return;
        }

        if (!isLoading && !isLoadingMore && hasNextPage) {
          loadBuildings({ reset: false, pageToLoad: page + 1 });
        }
      },
      { threshold: 0.2 }
    );

    observer.observe(node);

    return () => {
      observer.disconnect();
    };
  }, [isLoading, isLoadingMore, hasNextPage, page, loadBuildings]);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);

    const trimmedName = form.name.trim();
    const trimmedAddress = form.address.trim();
    const trimmedCity = form.city.trim();
    const trimmedArea = form.area.trim();
    const trimmedCaretakerName = form.caretaker_name.trim();
    const normalizedCaretakerPhone = onlyDigits(form.caretaker_phone);
    const floors = Number(form.total_floors);
    const rooms = Number(form.total_rooms);
    const securityDeposit = form.security_deposit ? Number(form.security_deposit) : 0;
    const electricityRate = form.electricity_rate ? Number(form.electricity_rate) : 0;

    if (!trimmedName || !trimmedAddress || !trimmedCity || !trimmedArea) {
      const errorMessage = "Please fill all required fields.";
      setFormError(errorMessage);
      showToast(errorMessage, "error");
      return;
    }

    if (!Number.isInteger(floors) || floors <= 0) {
      const errorMessage = "Total floors must be a positive whole number.";
      setFormError(errorMessage);
      showToast(errorMessage, "error");
      return;
    }

    if (!Number.isInteger(rooms) || rooms <= 0) {
      const errorMessage = "Total rooms must be a positive whole number.";
      setFormError(errorMessage);
      showToast(errorMessage, "error");
      return;
    }

    if (normalizedCaretakerPhone && normalizedCaretakerPhone.length !== 10) {
      const errorMessage = "Caretaker phone must be exactly 10 digits.";
      setFormError(errorMessage);
      showToast(errorMessage, "error");
      return;
    }

    if (!Number.isFinite(securityDeposit) || securityDeposit < 0) {
      const errorMessage = "Security deposit cannot be negative.";
      setFormError(errorMessage);
      showToast(errorMessage, "error");
      return;
    }

    if (!Number.isFinite(electricityRate) || electricityRate < 0) {
      const errorMessage = "Electricity rate cannot be negative.";
      setFormError(errorMessage);
      showToast(errorMessage, "error");
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = {
        name: trimmedName,
        address: trimmedAddress,
        city: trimmedCity,
        area: trimmedArea,
        total_floors: floors,
        total_rooms: rooms,
        caretaker_name: trimmedCaretakerName,
        caretaker_phone: normalizedCaretakerPhone,
        amenities: amenitiesPreview,
        security_deposit: securityDeposit,
        electricity_rate: electricityRate,
      };

      const url = editingBuildingId
        ? `/api/admin/buildings/${editingBuildingId}`
        : "/api/admin/buildings";
      const method = editingBuildingId ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const result = (await response.json()) as { message?: string; errors?: string[] };

      if (!response.ok) {
        const details = result.errors?.join(", ");
        const errorMessage = details || result.message || "Failed to save building.";
        setFormError(errorMessage);
        showToast(errorMessage, "error");
        return;
      }

      setForm(initialForm);
      setEditingBuildingId(null);
      setIsModalOpen(false);
      showToast(editingBuildingId ? "Building updated successfully." : "Building created successfully.", "success");
      await loadBuildings({ reset: true, pageToLoad: 1 });
    } catch {
      const errorMessage = "Unable to submit form. Please try again.";
      setFormError(errorMessage);
      showToast(errorMessage, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const onEdit = (building: Building) => {
    setEditingBuildingId(building.id);
    setForm({
      name: building.name,
      address: building.address,
      city: building.city,
      area: building.area,
      total_floors: String(building.total_floors),
      total_rooms: String(building.total_rooms),
      caretaker_name: building.caretaker_name,
      caretaker_phone: onlyDigits(building.caretaker_phone),
      amenities: (building.amenities || []).join(","),
      security_deposit: String(building.security_deposit),
      electricity_rate: String(building.electricity_rate),
    });
    setFormError(null);
    setIsModalOpen(true);
  };

  const onDelete = async (id: string) => {
    setIsDeleting(true);

    try {
      const response = await fetch(`/api/admin/buildings/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        showToast("Failed to delete building. Please try again.", "error");
        return;
      }

      setDeleteConfirm(null);
      showToast("Building deleted successfully.", "success");
      await loadBuildings({ reset: true });
    } catch {
      showToast("Unable to delete building right now.", "error");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <DashboardLayout>
      <section className="rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-[var(--shadow-feature)] sm:p-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--color-sky)]">
              Building Management
            </p>
            <h1 className="mt-1 text-3xl font-black tracking-tight text-[var(--color-text-title)] sm:text-4xl">
              Manage all your PG buildings
            </h1>
          </div>

          <button
            type="button"
            onClick={() => {
              setFormError(null);
              setEditingBuildingId(null);
              setForm(initialForm);
              setIsModalOpen(true);
            }}
            className="cursor-pointer inline-flex items-center justify-center rounded-xl bg-[var(--color-emerald)] px-4 py-2 text-sm font-bold text-[var(--color-text-inverse)] shadow-[var(--shadow-cta)] transition hover:bg-[var(--color-emerald-hover)]"
          >
            Add New Building
          </button>
        </div>

        {!isLoading && buildings.length > 0 ? (
          <div className="mt-5">
            <label className="relative block">
              <span className="sr-only">Search building by name or address</span>
              <input
                type="text"
                value={searchText}
                onChange={(event) => setSearchText(event.target.value)}
                placeholder="Search by building name or address"
                className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 text-sm text-[var(--color-text-primary)] outline-none transition focus:border-[var(--color-sky)] focus:ring-2 focus:ring-[var(--color-sky-soft)]"
              />
            </label>
          </div>
        ) : null}

        {isLoading ? (
          <div className="mt-8 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-8 text-center text-sm text-[var(--color-text-muted)]">
            Loading buildings...
          </div>
        ) : null}

        {!isLoading && listError ? (
          <div className="mt-8 rounded-2xl border border-red-200 bg-red-50 p-5 text-sm font-medium text-red-700">
            {listError}
          </div>
        ) : null}

        {!isLoading && !listError && buildings.length === 0 ? (
          <div className="mt-8 rounded-2xl border border-dashed border-[var(--color-border-strong)] bg-[var(--color-surface-muted)] p-10 text-center">
            <h2 className="text-2xl font-black text-[var(--color-text-title)]">No Buildings Yet</h2>
            <p className="mt-2 text-sm text-[var(--color-text-muted)]">
              Get started by adding your first building.
            </p>
            <button
              type="button"
              onClick={() => {
                setFormError(null);
                setEditingBuildingId(null);
                setForm(initialForm);
                setIsModalOpen(true);
              }}
              className="cursor-pointer mt-6 inline-flex items-center justify-center rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-5 py-3 text-sm font-semibold text-[var(--color-text-secondary)] transition hover:bg-[var(--color-surface-soft)]"
            >
              Add Your First Building
            </button>
          </div>
        ) : null}

        {!isLoading && !listError && buildings.length === 0 && searchText.trim() ? (
          <div className="mt-8 rounded-2xl border border-dashed border-[var(--color-border-strong)] bg-[var(--color-surface-muted)] p-10 text-center">
            <h2 className="text-2xl font-black text-[var(--color-text-title)]">No Matching Buildings</h2>
            <p className="mt-2 text-sm text-[var(--color-text-muted)]">
              Try a different building name or address.
            </p>
          </div>
        ) : null}

        {!isLoading && !listError && buildings.length > 0 ? (
          <div className="mt-8 grid gap-5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {buildings.map((building) => (
              <div
                key={building.id}
                className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-[var(--shadow-feature)] hover:shadow-[var(--shadow-card)] transition"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-black text-[var(--color-text-title)] truncate">
                      {building.name}
                    </h3>
                    <p className="mt-1 text-sm text-[var(--color-text-muted)]">
                      {building.city}, {building.area}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      title="Edit building"
                      onClick={() => onEdit(building)}
                      className="cursor-pointer inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--color-sky)] bg-[var(--color-sky-soft)] text-[var(--color-sky)] transition hover:bg-[var(--color-sky)] hover:text-[var(--color-text-inverse)]"
                    >
                      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="h-5 w-5">
                        <path
                          d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"
                          stroke="currentColor"
                          strokeWidth="1.8"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </button>

                    <button
                      type="button"
                      title="Delete building"
                      onClick={() => setDeleteConfirm(building.id)}
                      className="cursor-pointer inline-flex h-9 w-9 items-center justify-center rounded-lg border border-red-300 bg-red-50 text-red-600 transition hover:bg-red-600 hover:border-red-600 hover:text-[var(--color-text-inverse)]"
                    >
                      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="h-5 w-5">
                        <path
                          d="M19 7l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 7m5 4v6m4-6v6M9 7V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v3m-5 0h8"
                          stroke="currentColor"
                          strokeWidth="1.8"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </button>
                  </div>
                </div>

                <div className="mt-4 space-y-2 border-t border-[var(--color-border)] pt-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--color-text-muted)]">Floors</span>
                    <span className="text-sm font-black text-[var(--color-text-secondary)]">{building.total_floors}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--color-text-muted)]">Rooms</span>
                    <span className="text-sm font-black text-[var(--color-text-secondary)]">{building.total_rooms}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--color-text-muted)]">Status</span>
                    <span className="inline-flex rounded-full bg-[var(--color-emerald-soft)] px-2 py-1 text-xs font-bold text-[var(--color-emerald-strong)]">
                      {building.status}
                    </span>
                  </div>
                </div>

                <div className="mt-4 space-y-2 border-t border-[var(--color-border)] pt-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--color-text-muted)]">Total Rooms Occupancy</span>
                    <span className="text-sm font-black text-[var(--color-text-muted)]">—</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--color-text-muted)]">Bed Occupied</span>
                    <span className="text-sm font-black text-[var(--color-text-muted)]">—</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--color-text-muted)]">Bed Available</span>
                    <span className="text-sm font-black text-[var(--color-text-muted)]">—</span>
                  </div>
                </div>

                {building.amenities.length > 0 ? (
                  <div className="mt-4 border-t border-[var(--color-border)] pt-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--color-text-muted)]">
                      Amenities
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {building.amenities.map((amenity) => (
                        <span
                          key={`${building.id}-${amenity}`}
                          className="inline-flex rounded-md border border-slate-300 bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.04em] text-slate-700"
                        >
                          {amenity}
                        </span>
                      ))}
                    </div>
                  </div>
                ) : null}

                {building.caretaker_name ? (
                  <div className="mt-4 border-t border-[var(--color-border)] pt-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--color-text-muted)]">
                      Caretaker
                    </p>
                    <p className="mt-1 text-sm text-[var(--color-text-secondary)]">{building.caretaker_name}</p>
                    {building.caretaker_phone ? (
                      <a
                        href={`tel:${building.caretaker_phone}`}
                        className="mt-2 cursor-pointer inline-flex items-center gap-2 rounded-lg bg-[var(--color-sky-soft)] px-3 py-1.5 text-xs font-semibold text-[var(--color-sky)] transition hover:bg-[var(--color-sky-soft)] hover:text-[var(--color-sky)]"
                      >
                        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="h-4 w-4">
                          <path
                            d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"
                            stroke="currentColor"
                            strokeWidth="1.8"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                        {building.caretaker_phone}
                      </a>
                    ) : null}
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        ) : null}

        {!isLoading && !listError && buildings.length > 0 ? (
          <div className="mt-6 flex flex-col items-center justify-center gap-3">
            {isLoadingMore ? (
              <div className="inline-flex items-center gap-2 text-sm text-[var(--color-text-muted)]">
                <span className="h-5 w-5 animate-spin rounded-full border-2 border-[var(--color-sky-soft)] border-t-[var(--color-sky)]" />
                Loading more buildings...
              </div>
            ) : null}

            <div ref={loadMoreRef} className="h-3 w-full" />

            {!hasNextPage ? (
              <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--color-text-muted)]">
                Showing all {totalCount} buildings
              </p>
            ) : null}
          </div>
        ) : null}
      </section>

      {isModalOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-[var(--shadow-card)] sm:p-7">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-2xl font-black text-[var(--color-text-title)]">{editingBuildingId ? "Edit Building" : "Add New Building"}</h3>
              <button
                type="button"
                onClick={() => {
                  setIsModalOpen(false);
                  setFormError(null);
                  setEditingBuildingId(null);
                  setForm(initialForm);
                }}
                className="cursor-pointer rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-sm font-semibold text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-soft)]"
              >
                Close
              </button>
            </div>

            <form onSubmit={onSubmit} className="mt-6 grid gap-5">
              <div className="grid gap-5 sm:grid-cols-2">
                <Field label="Building Name*" value={form.name} onChange={(value) => setForm((prev) => ({ ...prev, name: value }))} placeholder="eg. Sunshine Residency" required />
                <Field label="City*" value={form.city} onChange={(value) => setForm((prev) => ({ ...prev, city: value }))} placeholder="eg. Jaipur" required />
              </div>

              <Field label="Building Address*" value={form.address} onChange={(value) => setForm((prev) => ({ ...prev, address: value }))} placeholder="eg. 45, Vaishali Nagar Main Road" required />

              <div className="grid gap-5 sm:grid-cols-2">
                <Field label="Area*" value={form.area} onChange={(value) => setForm((prev) => ({ ...prev, area: value }))} placeholder="eg. Vaishali Nagar" required />
                <Field
                  label="Total Floors*"
                  value={form.total_floors}
                  onChange={(value) => setForm((prev) => ({ ...prev, total_floors: value }))}
                  type="number"
                  placeholder="eg. 5"
                  required
                  min={0}
                />
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <Field
                  label="Total Rooms*"
                  value={form.total_rooms}
                  onChange={(value) => setForm((prev) => ({ ...prev, total_rooms: value }))}
                  type="number"
                  placeholder="eg. 28"
                  required
                  min={0}
                />
                <Field
                  label="Caretaker Name"
                  value={form.caretaker_name}
                  onChange={(value) => setForm((prev) => ({ ...prev, caretaker_name: value }))}
                  placeholder="eg. Ramesh Kumar"
                />
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <Field
                  label="Caretaker Phone (10 digits)"
                  value={form.caretaker_phone}
                  onChange={(value) => setForm((prev) => ({ ...prev, caretaker_phone: onlyDigits(value).slice(0, 10) }))}
                  type="tel"
                  placeholder="eg. 9876543210"
                  inputMode="numeric"
                  pattern="[0-9]{10}"
                  maxLength={10}
                />
                <Field
                  label="Amenities"
                  value={form.amenities}
                  onChange={(value) => setForm((prev) => ({ ...prev, amenities: normalizeAmenitiesInput(value) }))}
                  placeholder="eg. AC,TV"
                />
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <Field
                  label="Electricity Rate (₹/kWh)"
                  value={form.electricity_rate}
                  onChange={(value) => setForm((prev) => ({ ...prev, electricity_rate: value }))}
                  type="number"
                  placeholder="eg. 9"
                  min={0}
                />
              </div>

              {amenitiesPreview.length > 0 ? (
                <p className="text-sm text-[var(--color-text-muted)]">
                  Amenities preview: {amenitiesPreview.join(" | ")}
                </p>
              ) : null}

              {formError ? (
                <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                  {formError}
                </p>
              ) : null}

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setIsModalOpen(false);
                    setFormError(null);
                    setEditingBuildingId(null);
                    setForm(initialForm);
                  }}
                  className="cursor-pointer inline-flex items-center justify-center rounded-xl border border-[var(--color-border)] px-4 py-2 text-sm font-semibold text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-soft)]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="cursor-pointer inline-flex items-center justify-center rounded-xl bg-[var(--color-emerald)] px-5 py-2 text-sm font-bold text-[var(--color-text-inverse)] shadow-[var(--shadow-cta)] transition hover:bg-[var(--color-emerald-hover)] disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {isSubmitting ? (editingBuildingId ? "Updating..." : "Creating...") : (editingBuildingId ? "Update Building" : "Create Building")}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      <ConfirmDialog
        isOpen={deleteConfirm !== null}
        title="Delete Building?"
        description={`Are you sure you want to delete "${
          buildings.find((b) => b.id === deleteConfirm)?.name || "this building"
        }"? This action cannot be undone.`}
        confirmText={isDeleting ? "Deleting..." : "Delete"}
        cancelText="Cancel"
        isConfirming={isDeleting}
        tone="danger"
        onCancel={() => setDeleteConfirm(null)}
        onConfirm={() => {
          if (deleteConfirm) {
            onDelete(deleteConfirm);
          }
        }}
      />

      <ToastViewport toast={toast} />
    </DashboardLayout>
  );
}

type FieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  type?: "text" | "number" | "tel";
  placeholder?: string;
  min?: number;
  pattern?: string;
  inputMode?: "text" | "numeric" | "decimal" | "tel" | "search" | "email" | "url";
  maxLength?: number;
};

function Field({
  label,
  value,
  onChange,
  required = false,
  type = "text",
  placeholder,
  min,
  pattern,
  inputMode,
  maxLength,
}: FieldProps) {
  return (
    <label className="grid gap-2">
      <span className="text-sm font-semibold text-[var(--color-text-secondary)]">{label}</span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        required={required}
        type={type}
        placeholder={placeholder}
        min={min}
        pattern={pattern}
        inputMode={inputMode}
        maxLength={maxLength}
        className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 text-sm text-[var(--color-text-primary)] outline-none transition focus:border-[var(--color-sky)] focus:ring-2 focus:ring-[var(--color-sky-soft)]"
      />
    </label>
  );
}
