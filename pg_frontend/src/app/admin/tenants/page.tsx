"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { DashboardLayout } from "@/components/home/dashboard-layout";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { ToastViewport, useToast } from "@/components/ui/toast";

type Building = {
  id: string;
  name: string;
  city: string;
  area: string;
  security_deposit?: number;
};

type Room = {
  id: string;
  building_id: string;
  room_number: string;
  capacity: number;
  occupied?: number;
  status?: string;
};

type Tenant = {
  id: string;
  name: string;
  email: string;
  phone: string;
  building_id: string;
  room_number: string;
  check_in_date: string;
  check_out_date: string | null;
  rent: number;
  status: "active" | "inactive";
  agreement: string | null;
  approval_status: string;
  pg_id: string | null;
  password_hash: string | null;
  created_by: string;
  created_at: string;
  security_deposit_amount?: number;
  check_in_total_due?: number;
  check_in_payment_status?: "pending" | "paid";
  moving_history: MoveHistoryEntry[];
};

type MoveHistoryEntry = {
  moved_at: string;
  move_date: string;
  from_building_id: string;
  from_building_name: string;
  from_room_number: string;
  to_building_id: string;
  to_building_name: string;
  to_room_number: string;
  previous_rent: number;
  new_rent: number;
};

type MoveForm = {
  building_id: string;
  room_number: string;
  rent: string;
  move_date: string;
};

type TenantForm = {
  name: string;
  phone: string;
  email: string;
  building_id: string;
  room_number: string;
  check_in_date: string;
  current_reading: string;
  check_out_date: string;
  rent: string;
  status: "active" | "inactive";
  security_deposit_amount: string;
};

const initialForm: TenantForm = {
  name: "",
  phone: "",
  email: "",
  building_id: "",
  room_number: "",
  check_in_date: "",
  current_reading: "",
  check_out_date: "",
  rent: "",
  status: "active",
  security_deposit_amount: "",
};

const onlyDigits = (value: string) => value.replace(/\D/g, "");
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const getVisiblePages = (currentPage: number, totalPages: number) => {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const pages = new Set<number>([1, totalPages, currentPage - 1, currentPage, currentPage + 1]);
  return Array.from(pages)
    .filter((page) => page >= 1 && page <= totalPages)
    .sort((a, b) => a - b);
};

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

export default function TenantsPage() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTenantId, setEditingTenantId] = useState<string | null>(null);
  const [form, setForm] = useState<TenantForm>(initialForm);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [isMoveModalOpen, setIsMoveModalOpen] = useState(false);
  const [movingTenantId, setMovingTenantId] = useState<string | null>(null);
  const [moveForm, setMoveForm] = useState<MoveForm>({
    building_id: "",
    room_number: "",
    rent: "",
    move_date: "",
  });
  const [moveError, setMoveError] = useState<string | null>(null);
  const [isMoving, setIsMoving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [successTenantId, setSuccessTenantId] = useState<string | null>(null);
  const [successTenantCheckInTotal, setSuccessTenantCheckInTotal] = useState<number>(0);
  const [isGeneratingFirstInvoice, setIsGeneratingFirstInvoice] = useState(false);
  const { toast, showToast } = useToast({ defaultDurationMs: 3200 });

  const pageSize = 10;

  const movingTenant = useMemo(
    () => tenants.find((tenant) => tenant.id === movingTenantId) || null,
    [tenants, movingTenantId]
  );

  const summary = useMemo(() => {
    const active = tenants.filter((tenant) => tenant.status === "active").length;
    const inactive = tenants.filter((tenant) => tenant.status === "inactive").length;
    return {
      total: tenants.length,
      active,
      inactive,
    };
  }, [tenants]);

  const roomOptions = useMemo(() => {
    if (!form.building_id) {
      return [];
    }

    return rooms.filter((room) => room.building_id === form.building_id);
  }, [rooms, form.building_id]);

  const selectedBuilding = useMemo(
    () => buildings.find((building) => building.id === form.building_id),
    [buildings, form.building_id]
  );

  const selectedRoom = useMemo(() => {
    if (!form.building_id || !form.room_number) {
      return null;
    }
    return rooms.find(
      (room) => room.building_id === form.building_id && room.room_number === form.room_number
    );
  }, [rooms, form.building_id, form.room_number]);

  const activeCountForRoom = useMemo(() => {
    if (!form.building_id || !form.room_number) {
      return 0;
    }
    const key = `${form.building_id}::${form.room_number}`;
    return activeTenantCountByRoom.get(key) || 0;
  }, [activeTenantCountByRoom, form.building_id, form.room_number]);

  const roomCapacity = Number(selectedRoom?.capacity || 0);
  const isRoomFull = roomCapacity > 0 && activeCountForRoom >= roomCapacity && form.status === "active";

  const checkInPayablePreview = useMemo(() => {
    const rent = Number(form.rent || 0);
    const securityDeposit = Number(form.security_deposit_amount || 0);

    if (!Number.isFinite(rent) || rent < 0 || !form.check_in_date) {
      return null;
    }

    // Calculate prorated rent based on remaining days in the month
    const checkInDate = new Date(form.check_in_date);
    const year = checkInDate.getFullYear();
    const month = checkInDate.getMonth();
    
    // Get last day of the month
    const lastDayOfMonth = new Date(year, month + 1, 0);
    const daysInMonth = lastDayOfMonth.getDate();
    
    // Calculate days remaining (including check-in day)
    const checkInDay = checkInDate.getDate();
    const daysRemaining = daysInMonth - checkInDay + 1;
    
    // Calculate prorated rent
    const proratedRent = Number(((rent / daysInMonth) * daysRemaining).toFixed(2));

    return {
      advanceRent: proratedRent,
      securityDeposit,
      totalDue: Number((proratedRent + securityDeposit).toFixed(2)),
    };
  }, [form.rent, form.check_in_date, form.security_deposit_amount]);

  const moveRoomOptions = useMemo(() => {
    if (!moveForm.building_id) {
      return [];
    }

    return rooms.filter((room) => room.building_id === moveForm.building_id);
  }, [rooms, moveForm.building_id]);

  const currentBuildingName = useMemo(() => {
    if (!movingTenant) {
      return "";
    }

    return buildings.find((building) => building.id === movingTenant.building_id)?.name || "Unknown";
  }, [movingTenant, buildings]);

  const currentRoomLabel = useMemo(() => {
    if (!movingTenant) {
      return "";
    }

    return `Room ${movingTenant.room_number}`;
  }, [movingTenant]);

  const activeTenantCountByRoom = useMemo(() => {
    const counts = new Map<string, number>();
    const excludedTenantId = editingTenantId || movingTenantId;

    tenants
      .filter((tenant) => tenant.status === "active")
      .forEach((tenant) => {
        if (excludedTenantId && tenant.id === excludedTenantId) {
          return;
        }

        const key = `${tenant.building_id}::${tenant.room_number}`;
        counts.set(key, (counts.get(key) || 0) + 1);
      });

    return counts;
  }, [tenants, editingTenantId, movingTenantId]);

  const filteredTenants = useMemo(() => {
    const query = searchText.trim().toLowerCase();

    if (!query) {
      return tenants;
    }

    return tenants.filter((tenant) => {
      const buildingName = buildings.find((b) => b.id === tenant.building_id)?.name.toLowerCase() || "";

      return (
        tenant.name.toLowerCase().includes(query) ||
        tenant.phone.toLowerCase().includes(query) ||
        tenant.email.toLowerCase().includes(query) ||
        tenant.room_number.toLowerCase().includes(query) ||
        buildingName.includes(query) ||
        tenant.status.toLowerCase().includes(query)
      );
    });
  }, [tenants, buildings, searchText]);

  const totalPages = useMemo(
    () => Math.max(Math.ceil(filteredTenants.length / pageSize), 1),
    [filteredTenants.length]
  );

  const paginatedTenants = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredTenants.slice(start, start + pageSize);
  }, [filteredTenants, currentPage]);

  const loadTenants = async () => {
    setIsLoading(true);
    setListError(null);

    try {
      const response = await fetch("/api/admin/tenants", { cache: "no-store" });
      const data = (await response.json()) as { message?: string } | Tenant[];

      if (!response.ok) {
        const message = "message" in data ? data.message : "Failed to fetch tenants";
        setListError(message || "Failed to fetch tenants");
        return;
      }

      setTenants(Array.isArray(data) ? data : []);
    } catch {
      setListError("Unable to load tenants right now.");
    } finally {
      setIsLoading(false);
    }
  };

  const loadBuildings = async () => {
    try {
      const response = await fetch("/api/admin/buildings", { cache: "no-store" });
      const data = (await response.json()) as Building[] | { message?: string };

      if (response.ok) {
        setBuildings(Array.isArray(data) ? data : []);
      }
    } catch {
      // silently handled
    }
  };

  const loadRooms = async () => {
    try {
      const response = await fetch("/api/admin/rooms", { cache: "no-store" });
      const data = (await response.json()) as Room[] | { message?: string };

      if (response.ok) {
        setRooms(Array.isArray(data) ? data : []);
      }
    } catch {
      // silently handled
    }
  };

  useEffect(() => {
    setMoveForm((prev) => ({
      ...prev,
      move_date: prev.move_date || new Date().toISOString().slice(0, 10),
    }));
  }, []);

  useEffect(() => {
    loadTenants();
    loadBuildings();
    loadRooms();
  }, []);

  useEffect(() => {
    if (!form.building_id) {
      return;
    }

    const hasRoom = roomOptions.some((room) => room.room_number === form.room_number);
    if (!hasRoom) {
      setForm((prev) => ({ ...prev, room_number: "" }));
    }
  }, [form.building_id, form.room_number, roomOptions]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchText]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);

    const fullName = form.name.trim();
    const phone = onlyDigits(form.phone);
    const email = form.email.trim().toLowerCase();
    const buildingId = form.building_id.trim();
    const roomNumber = form.room_number.trim();
    const checkInDate = form.check_in_date;
    const readingRaw = form.current_reading.trim();
    const currentReading = readingRaw === "" ? null : Number(readingRaw);
    const checkOutDate = form.check_out_date || null;
    const rent = Number(form.rent);
    const status = form.status;
    const securityDepositAmount = form.security_deposit_amount ? Number(form.security_deposit_amount) : 0;

    if (!fullName || !phone || !email || !buildingId || !roomNumber || !checkInDate || !form.rent) {
      const errorMessage = "Please fill all required fields.";
      setFormError(errorMessage);
      showToast(errorMessage, "error");
      return;
    }

    if (currentReading !== null && (!Number.isFinite(currentReading) || currentReading < 0)) {
      const errorMessage = "Current reading must be a valid non-negative number.";
      setFormError(errorMessage);
      showToast(errorMessage, "error");
      return;
    }

    if (phone.length !== 10) {
      const errorMessage = "Phone number must be exactly 10 digits.";
      setFormError(errorMessage);
      showToast(errorMessage, "error");
      return;
    }

    if (!emailRegex.test(email)) {
      const errorMessage = "Please enter a valid email address.";
      setFormError(errorMessage);
      showToast(errorMessage, "error");
      return;
    }

    if (!Number.isFinite(rent) || rent < 0) {
      const errorMessage = "Monthly rent must be a valid non-negative number.";
      setFormError(errorMessage);
      showToast(errorMessage, "error");
      return;
    }

    if (!Number.isFinite(securityDepositAmount) || securityDepositAmount < 0) {
      const errorMessage = "Security deposit must be a valid non-negative number.";
      setFormError(errorMessage);
      showToast(errorMessage, "error");
      return;
    }

    if (status !== "active" && status !== "inactive") {
      const errorMessage = "Status must be Active or Inactive.";
      setFormError(errorMessage);
      showToast(errorMessage, "error");
      return;
    }

    if (isRoomFull) {
      const errorMessage =
        "Selected room is full. Choose another room or set status to Inactive.";
      setFormError(errorMessage);
      showToast(errorMessage, "error");
      return;
    }

    setIsSubmitting(true);

    try {
    const payload = {
      name: fullName,
      phone,
      email,
      building_id: buildingId,
      room_number: roomNumber,
      check_in_date: checkInDate,
      check_out_date: checkOutDate,
      rent,
      status,
      security_deposit_amount: securityDepositAmount,
    };

    if (currentReading !== null) {
      payload.current_reading = currentReading;
    }

      const url = editingTenantId ? `/api/admin/tenants/${editingTenantId}` : "/api/admin/tenants";
      const method = editingTenantId ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const result = (await response.json()) as Partial<Tenant> & { message?: string; errors?: string[] };

      if (!response.ok) {
        const errorMessage = result.errors?.join(", ") || result.message || "Failed to save tenant.";
        setFormError(errorMessage);
        showToast(errorMessage, "error");
        return;
      }

      setForm(initialForm);
      setEditingTenantId(null);
      setIsModalOpen(false);

      if (editingTenantId) {
        showToast("Tenant updated successfully.", "success");
        await loadTenants();
      } else {
        // For new tenant, show success modal with first invoice generation option
        const totalDue = Number(result.check_in_total_due || 0);
        const newTenantId = (result as Tenant).id;
        setSuccessTenantId(newTenantId);
        setSuccessTenantCheckInTotal(totalDue);
        await loadTenants();
      }
    } catch {
      const errorMessage = "Unable to submit form. Please try again.";
      setFormError(errorMessage);
      showToast(errorMessage, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const onEdit = (tenant: Tenant) => {
    setEditingTenantId(tenant.id);
    setForm({
      name: tenant.name,
      phone: tenant.phone,
      email: tenant.email,
      building_id: tenant.building_id,
      room_number: tenant.room_number,
      check_in_date: tenant.check_in_date,
      current_reading: "",
      check_out_date: tenant.check_out_date || "",
      rent: String(tenant.rent),
      status: tenant.status,
      security_deposit_amount: String(tenant.security_deposit_amount || ""),
    });
    setFormError(null);
    setIsModalOpen(true);
  };

  const onDelete = async (id: string) => {
    setIsDeleting(true);

    try {
      const response = await fetch(`/api/admin/tenants/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        showToast("Failed to delete tenant. Please try again.", "error");
        return;
      }

      setDeleteConfirm(null);
      showToast("Tenant deleted successfully.", "success");
      await loadTenants();
    } catch {
      showToast("Unable to delete tenant right now.", "error");
    } finally {
      setIsDeleting(false);
    }
  };

  const onGenerateFirstInvoice = async () => {
    if (!successTenantId) {
      return;
    }

    setIsGeneratingFirstInvoice(true);

    try {
      const response = await fetch("/api/admin/invoices/first-invoice", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          tenant_id: successTenantId,
        }),
      });

      const result = (await response.json()) as { message?: string; invoice?: unknown };

      if (!response.ok) {
        const errorMessage = result.message || "Failed to generate first invoice";
        showToast(errorMessage, "error");
        return;
      }

      showToast("First invoice generated successfully!", "success");
      setSuccessTenantId(null);
      setSuccessTenantCheckInTotal(0);
    } catch {
      showToast("Unable to generate first invoice right now.", "error");
    } finally {
      setIsGeneratingFirstInvoice(false);
    }
  };

  const onOpenMoveModal = (tenant: Tenant) => {
    setMovingTenantId(tenant.id);
    setMoveForm({
      building_id: tenant.building_id,
      room_number: tenant.room_number,
      rent: String(tenant.rent),
      move_date: new Date().toISOString().slice(0, 10),
    });
    setMoveError(null);
    setIsMoveModalOpen(true);
  };

  const onMoveTenant = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!movingTenant) {
      return;
    }

    setMoveError(null);

    const buildingId = moveForm.building_id.trim();
    const roomNumber = moveForm.room_number.trim();
    const newRent = Number(moveForm.rent);
    const moveDate = moveForm.move_date;

    if (!buildingId || !roomNumber || !moveForm.rent || !moveDate) {
      const message = "Please fill all move details.";
      setMoveError(message);
      showToast(message, "error");
      return;
    }

    if (!Number.isFinite(newRent) || newRent < 0) {
      const message = "New rent must be a valid non-negative number.";
      setMoveError(message);
      showToast(message, "error");
      return;
    }

    if (buildingId === movingTenant.building_id && roomNumber === movingTenant.room_number) {
      const message = "Please select a different room to move tenant.";
      setMoveError(message);
      showToast(message, "error");
      return;
    }

    setIsMoving(true);

    try {
      const fromBuildingName = buildings.find((b) => b.id === movingTenant.building_id)?.name || "Unknown";
      const toBuildingName = buildings.find((b) => b.id === buildingId)?.name || "Unknown";

      const nextHistory: MoveHistoryEntry[] = [
        ...(movingTenant.moving_history || []),
        {
          moved_at: new Date().toISOString(),
          move_date: moveDate,
          from_building_id: movingTenant.building_id,
          from_building_name: fromBuildingName,
          from_room_number: movingTenant.room_number,
          to_building_id: buildingId,
          to_building_name: toBuildingName,
          to_room_number: roomNumber,
          previous_rent: movingTenant.rent,
          new_rent: newRent,
        },
      ];

      const response = await fetch(`/api/admin/tenants/${movingTenant.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          building_id: buildingId,
          room_number: roomNumber,
          rent: newRent,
          check_in_date: moveDate,
          moving_history: nextHistory,
          status: movingTenant.status,
        }),
      });

      const result = (await response.json()) as { message?: string; errors?: string[] };

      if (!response.ok) {
        const message = result.errors?.join(", ") || result.message || "Failed to move tenant.";
        setMoveError(message);
        showToast(message, "error");
        return;
      }

      setIsMoveModalOpen(false);
      setMovingTenantId(null);
      setMoveForm({
        building_id: "",
        room_number: "",
        rent: "",
        move_date: new Date().toISOString().slice(0, 10),
      });
      showToast("Tenant moved successfully.", "success");
      await loadTenants();
    } catch {
      const message = "Unable to move tenant right now.";
      setMoveError(message);
      showToast(message, "error");
    } finally {
      setIsMoving(false);
    }
  };

  return (
    <DashboardLayout>
      <section className="rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-[var(--shadow-feature)] sm:p-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--color-sky)]">
              Tenant Management
            </p>
            <h1 className="mt-1 text-3xl font-black tracking-tight text-[var(--color-text-title)] sm:text-4xl">
              Manage all tenants
            </h1>
          </div>

          <button
            type="button"
            onClick={() => {
              setFormError(null);
              setEditingTenantId(null);
              setForm(initialForm);
              setIsModalOpen(true);
            }}
            className="cursor-pointer inline-flex items-center justify-center rounded-xl bg-[var(--color-emerald)] px-4 py-2 text-sm font-bold text-[var(--color-text-inverse)] shadow-[var(--shadow-cta)] transition hover:bg-[var(--color-emerald-hover)]"
          >
            Add New Tenant
          </button>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          <article className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--color-text-muted)]">
              Total Tenants
            </p>
            <p className="mt-2 text-2xl font-black text-[var(--color-text-title)]">{summary.total}</p>
          </article>

          <article className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--color-text-muted)]">
              Total Active Tenants
            </p>
            <p className="mt-2 text-2xl font-black text-[var(--color-emerald-strong)]">{summary.active}</p>
          </article>

          <article className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--color-text-muted)]">
              Total Inactive Tenants
            </p>
            <p className="mt-2 text-2xl font-black text-[var(--color-amber)]">{summary.inactive}</p>
          </article>
        </div>

        {!isLoading && tenants.length > 0 ? (
          <div className="mt-5">
            <label className="relative block">
              <span className="sr-only">Search tenants</span>
              <input
                type="text"
                value={searchText}
                onChange={(event) => setSearchText(event.target.value)}
                placeholder="Search by name, phone, email, room, building, or status"
                className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 text-sm text-[var(--color-text-primary)] outline-none transition focus:border-[var(--color-sky)] focus:ring-2 focus:ring-[var(--color-sky-soft)]"
              />
            </label>
          </div>
        ) : null}

        {isLoading ? (
          <div className="mt-8 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-8 text-center text-sm text-[var(--color-text-muted)]">
            Loading tenants...
          </div>
        ) : null}

        {!isLoading && listError ? (
          <div className="mt-8 rounded-2xl border border-red-200 bg-red-50 p-5 text-sm font-medium text-red-700">
            {listError}
          </div>
        ) : null}

        {!isLoading && !listError && tenants.length === 0 ? (
          <div className="mt-8 rounded-2xl border border-dashed border-[var(--color-border-strong)] bg-[var(--color-surface-muted)] p-10 text-center">
            <h2 className="text-2xl font-black text-[var(--color-text-title)]">No Tenants Yet</h2>
            <p className="mt-2 text-sm text-[var(--color-text-muted)]">
              Get started by adding your first tenant.
            </p>
            <button
              type="button"
              onClick={() => {
                setFormError(null);
                setEditingTenantId(null);
                setForm(initialForm);
                setIsModalOpen(true);
              }}
              className="cursor-pointer mt-6 inline-flex items-center justify-center rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-5 py-3 text-sm font-semibold text-[var(--color-text-secondary)] transition hover:bg-[var(--color-surface-soft)]"
            >
              Add Your First Tenant
            </button>
          </div>
        ) : null}

        {!isLoading && !listError && tenants.length > 0 && filteredTenants.length === 0 ? (
          <div className="mt-8 rounded-2xl border border-dashed border-[var(--color-border-strong)] bg-[var(--color-surface-muted)] p-10 text-center">
            <h2 className="text-2xl font-black text-[var(--color-text-title)]">No Matching Tenants</h2>
            <p className="mt-2 text-sm text-[var(--color-text-muted)]">
              Try a different search term.
            </p>
          </div>
        ) : null}

        {!isLoading && !listError && filteredTenants.length > 0 ? (
          <div className="mt-8 overflow-x-auto rounded-2xl border border-[var(--color-border)]">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[var(--color-border)] bg-[var(--color-surface-muted)]">
                  <th className="min-w-[140px] px-4 py-3 text-left text-xs font-bold uppercase tracking-[0.08em] text-[var(--color-text-muted)]">Name</th>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-[0.08em] text-[var(--color-text-muted)]">Phone</th>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-[0.08em] text-[var(--color-text-muted)]">Email</th>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-[0.08em] text-[var(--color-text-muted)]">Building</th>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-[0.08em] text-[var(--color-text-muted)]">Room</th>
                  <th className="min-w-[130px] px-4 py-3 text-left text-xs font-bold uppercase tracking-[0.08em] text-[var(--color-text-muted)]">Check-in</th>
                  <th className="min-w-[130px] px-4 py-3 text-left text-xs font-bold uppercase tracking-[0.08em] text-[var(--color-text-muted)]">Check-out</th>
                  <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-[0.08em] text-[var(--color-text-muted)]">Rent</th>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-[0.08em] text-[var(--color-text-muted)]">Status</th>
                  <th className="px-4 py-3 text-center text-xs font-bold uppercase tracking-[0.08em] text-[var(--color-text-muted)]">Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedTenants.map((tenant, index) => {
                  const buildingName = buildings.find((b) => b.id === tenant.building_id)?.name || "Unknown";

                  return (
                    <tr
                      key={tenant.id}
                      className={`border-b border-[var(--color-border)] transition ${
                        index % 2 === 0 ? "bg-[var(--color-surface)]" : "bg-[var(--color-surface-muted)]"
                      } hover:bg-[var(--color-surface-soft)]`}
                    >
                      <td className="min-w-[140px] px-4 py-3 text-sm font-bold text-[var(--color-text-title)]">
                        <Link
                          href={`/admin/tenants/${tenant.id}`}
                          className="cursor-pointer text-left underline decoration-dotted underline-offset-4 transition hover:text-[var(--color-sky)]"
                        >
                          {tenant.name}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-sm text-[var(--color-text-secondary)]">{tenant.phone}</td>
                      <td className="px-4 py-3 text-sm text-[var(--color-text-secondary)]">{tenant.email}</td>
                      <td className="px-4 py-3 text-sm text-[var(--color-text-secondary)]">{buildingName}</td>
                      <td className="px-4 py-3 text-sm text-[var(--color-text-secondary)]">{tenant.room_number}</td>
                      <td className="min-w-[130px] px-4 py-3 text-sm text-[var(--color-text-secondary)]">{tenant.check_in_date}</td>
                      <td className="min-w-[130px] px-4 py-3 text-sm text-[var(--color-text-secondary)]">{tenant.check_out_date || "-"}</td>
                      <td className="px-4 py-3 text-right text-sm font-bold text-[var(--color-text-secondary)]">
                        ₹{formatIndianNumber(tenant.rent)}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex rounded-full px-2 py-1 text-xs font-bold ${
                            tenant.status === "active"
                              ? "bg-[var(--color-emerald-soft)] text-[var(--color-emerald-strong)]"
                              : "bg-[var(--color-amber-soft)] text-[var(--color-amber)]"
                          }`}
                        >
                          {tenant.status === "active" ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            type="button"
                            title="Edit tenant"
                            onClick={() => onEdit(tenant)}
                            className="cursor-pointer inline-flex h-6 w-6 items-center justify-center rounded-lg border border-[var(--color-sky)] bg-[var(--color-sky-soft)] text-[var(--color-sky)] transition hover:bg-[var(--color-sky)] hover:text-[var(--color-text-inverse)]"
                          >
                            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="h-3 w-3">
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
                            title="Move tenant"
                            onClick={() => onOpenMoveModal(tenant)}
                            className="cursor-pointer inline-flex h-6 w-6 items-center justify-center rounded-lg border border-[var(--color-amber)] bg-[var(--color-amber-soft)] text-[var(--color-amber)] transition hover:bg-[var(--color-amber)] hover:text-[var(--color-text-inverse)]"
                          >
                            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="h-3 w-3">
                              <path
                                d="M7 17 3 13m0 0 4-4m-4 4h14M17 7l4 4m0 0-4 4m4-4H7"
                                stroke="currentColor"
                                strokeWidth="1.8"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            </svg>
                          </button>

                          <button
                            type="button"
                            title="Delete tenant"
                            onClick={() => setDeleteConfirm(tenant.id)}
                            className="cursor-pointer inline-flex h-6 w-6 items-center justify-center rounded-lg border border-red-300 bg-red-50 text-red-600 transition hover:bg-red-600 hover:border-red-600 hover:text-[var(--color-text-inverse)]"
                          >
                            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="h-3 w-3">
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
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : null}

        {!isLoading && !listError && filteredTenants.length > 0 ? (
          <div className="mt-4 flex items-center justify-between gap-3">
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--color-text-muted)]">
              Page {currentPage} of {totalPages}
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="cursor-pointer rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-xs font-semibold text-[var(--color-text-secondary)] disabled:cursor-not-allowed disabled:opacity-50"
              >
                Previous
              </button>
              {getVisiblePages(currentPage, totalPages).map((pageNumber) => (
                <button
                  key={`tenant-page-${pageNumber}`}
                  type="button"
                  onClick={() => setCurrentPage(pageNumber)}
                  className={`cursor-pointer rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${
                    currentPage === pageNumber
                      ? "border-[var(--color-sky)] bg-[var(--color-sky-soft)] text-[var(--color-sky)]"
                      : "border-[var(--color-border)] text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-soft)]"
                  }`}
                >
                  {pageNumber}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                disabled={currentPage >= totalPages}
                className="cursor-pointer rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-xs font-semibold text-[var(--color-text-secondary)] disabled:cursor-not-allowed disabled:opacity-50"
              >
                Next
              </button>
            </div>
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
              <h3 className="text-2xl font-black text-[var(--color-text-title)]">
                {editingTenantId ? "Edit Tenant" : "Add New Tenant"}
              </h3>
              <button
                type="button"
                onClick={() => {
                  setIsModalOpen(false);
                  setFormError(null);
                  setEditingTenantId(null);
                  setForm(initialForm);
                }}
                className="cursor-pointer rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-sm font-semibold text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-soft)]"
              >
                Close
              </button>
            </div>

            <form onSubmit={onSubmit} className="mt-6 grid gap-5">
              <div className="grid gap-5 sm:grid-cols-2">
                <Field
                  label="Full Name*"
                  value={form.name}
                  onChange={(value) => setForm((prev) => ({ ...prev, name: value }))}
                  placeholder="eg. Rahul Sharma"
                  required
                />
                <Field
                  label="Phone Number*"
                  value={form.phone}
                  onChange={(value) => setForm((prev) => ({ ...prev, phone: onlyDigits(value).slice(0, 10) }))}
                  type="tel"
                  placeholder="eg. 9876543210"
                  required
                  inputMode="numeric"
                  maxLength={10}
                />
              </div>

              <Field
                label="Email Address*"
                value={form.email}
                onChange={(value) => setForm((prev) => ({ ...prev, email: value }))}
                type="email"
                placeholder="eg. user@example.com"
                required
              />

              <div className="grid gap-5 sm:grid-cols-2">
                <SelectField
                  label="Building*"
                  value={form.building_id}
                  onChange={(value) => setForm((prev) => ({ ...prev, building_id: value, room_number: "" }))}
                  required
                  searchable
                  options={buildings.map((building) => ({
                    value: building.id,
                    label: `${building.name} (${building.city}, ${building.area})`,
                  }))}
                  placeholder="Select building"
                />
                <SelectField
                  label="Room Number*"
                  value={form.room_number}
                  onChange={(value) => setForm((prev) => ({ ...prev, room_number: value }))}
                  required
                  searchable
                  options={roomOptions.map((room) => ({
                    value: room.room_number,
                    label: (() => {
                      const key = `${room.building_id}::${room.room_number}`;
                      const totalBeds = Number(room.capacity || 0);
                      const occupiedBeds = activeTenantCountByRoom.get(key) || 0;
                      const availableBeds = Math.max(totalBeds - occupiedBeds, 0);
                      return `Room ${room.room_number} (Total:${totalBeds}, Available:${availableBeds})`;
                    })(),
                    disabled: (() => {
                      const key = `${room.building_id}::${room.room_number}`;
                      const totalBeds = Number(room.capacity || 0);
                      const occupiedBeds = activeTenantCountByRoom.get(key) || 0;
                      const isCurrentSelection = room.room_number === form.room_number;
                      return occupiedBeds >= totalBeds && !isCurrentSelection;
                    })(),
                  }))}
                  placeholder={form.building_id ? "Select room" : "Select building first"}
                  disabled={!form.building_id}
                />
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <Field
                  label="Check-in Date*"
                  value={form.check_in_date}
                  onChange={(value) => setForm((prev) => ({ ...prev, check_in_date: value }))}
                  type="date"
                  required
                />
                <Field
                  label="Current Reading (optional)"
                  value={form.current_reading}
                  onChange={(value) => setForm((prev) => ({ ...prev, current_reading: value }))}
                  type="number"
                  min={0}
                  placeholder="eg. 120"
                />
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <Field
                  label="Check-out Date"
                  value={form.check_out_date}
                  onChange={(value) => setForm((prev) => ({ ...prev, check_out_date: value }))}
                  type="date"
                />
                <Field
                  label="Monthly Rent*"
                  value={form.rent}
                  onChange={(value) => setForm((prev) => ({ ...prev, rent: value }))}
                  type="number"
                  placeholder="eg. 8000"
                  required
                  min={0}
                />
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <SelectField
                  label="Status*"
                  value={form.status}
                  onChange={(value) => setForm((prev) => ({ ...prev, status: value as "active" | "inactive" }))}
                  required
                  options={[
                    { value: "active", label: "Active" },
                    { value: "inactive", label: "Inactive" },
                  ]}
                />
                <Field
                  label="Security Deposit Amount (Leave empty for no security deposit)"
                  value={form.security_deposit_amount}
                  onChange={(value) => setForm((prev) => ({ ...prev, security_deposit_amount: value }))}
                  type="number"
                  placeholder="eg. 5000"
                  min={0}
                />
              </div>

              {!editingTenantId && checkInPayablePreview ? (
                <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--color-text-muted)]">
                    Check-in Payment (Prorated)
                  </p>
                  <div className="mt-2 space-y-1 text-sm text-[var(--color-text-secondary)]">
                    <p>Prorated Rent (Remaining Days): ₹{formatIndianNumber(checkInPayablePreview.advanceRent)}</p>
                    <p>Security Deposit: ₹{formatIndianNumber(checkInPayablePreview.securityDeposit)}</p>
                    <p className="font-bold text-[var(--color-text-title)]">
                      Total Payable at Check-in: ₹{formatIndianNumber(checkInPayablePreview.totalDue)}
                    </p>
                  </div>
                </div>
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
                    setEditingTenantId(null);
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
                  {isSubmitting ? (editingTenantId ? "Updating..." : "Creating...") : (editingTenantId ? "Update Tenant" : "Create Tenant")}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {isMoveModalOpen && movingTenant ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4" role="dialog" aria-modal="true">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-[var(--shadow-card)] sm:p-7">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-2xl font-black text-[var(--color-text-title)]">Move Tenant</h3>
              <button
                type="button"
                onClick={() => {
                  setIsMoveModalOpen(false);
                  setMovingTenantId(null);
                  setMoveError(null);
                }}
                className="cursor-pointer rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-sm font-semibold text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-soft)]"
              >
                Close
              </button>
            </div>

            <div className="mt-5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-4">
              <p className="text-xs font-bold uppercase tracking-[0.08em] text-[var(--color-text-muted)]">Moving History</p>
              {movingTenant.moving_history?.length ? (
                <div className="mt-3 space-y-2">
                  {[...movingTenant.moving_history].reverse().map((entry, index) => (
                    <div key={`${entry.moved_at}-${index}`} className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text-secondary)]">
                      <p className="font-semibold">
                        {entry.from_building_name} / Room {entry.from_room_number} to {entry.to_building_name} / Room {entry.to_room_number}
                      </p>
                      <p className="text-xs text-[var(--color-text-muted)]">
                        Move Date: {entry.move_date} | Rent: ₹{formatIndianNumber(entry.previous_rent)} to ₹{formatIndianNumber(entry.new_rent)}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-2 text-sm text-[var(--color-text-muted)]">No previous moves found.</p>
              )}
            </div>

            <div className="mt-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-4">
              <p className="text-xs font-bold uppercase tracking-[0.08em] text-[var(--color-text-muted)]">Current Location</p>
              <p className="mt-2 text-sm font-semibold text-[var(--color-text-title)]">
                {currentBuildingName} / {currentRoomLabel}
              </p>
              <p className="text-xs text-[var(--color-text-muted)]">Current Rent: ₹{formatIndianNumber(movingTenant.rent)}</p>
            </div>

            <form onSubmit={onMoveTenant} className="mt-5 grid gap-5">
              <p className="text-xs font-bold uppercase tracking-[0.08em] text-[var(--color-text-muted)]">New Room Details</p>

              <div className="grid gap-5 sm:grid-cols-2">
                <SelectField
                  label="Building*"
                  value={moveForm.building_id}
                  onChange={(value) => setMoveForm((prev) => ({ ...prev, building_id: value, room_number: "" }))}
                  required
                  searchable
                  options={buildings.map((building) => ({
                    value: building.id,
                    label: `${building.name} (${building.city}, ${building.area})`,
                  }))}
                  placeholder="Select building"
                />
                <SelectField
                  label="Room Number*"
                  value={moveForm.room_number}
                  onChange={(value) => setMoveForm((prev) => ({ ...prev, room_number: value }))}
                  required
                  searchable
                  options={moveRoomOptions.map((room) => ({
                    value: room.room_number,
                    label: (() => {
                      const key = `${room.building_id}::${room.room_number}`;
                      const totalBeds = Number(room.capacity || 0);
                      const occupiedBeds = activeTenantCountByRoom.get(key) || 0;
                      const availableBeds = Math.max(totalBeds - occupiedBeds, 0);
                      return `Room ${room.room_number} (Total:${totalBeds}, Available:${availableBeds})`;
                    })(),
                    disabled: (() => {
                      const key = `${room.building_id}::${room.room_number}`;
                      const totalBeds = Number(room.capacity || 0);
                      const occupiedBeds = activeTenantCountByRoom.get(key) || 0;
                      const isCurrentSelection = room.room_number === moveForm.room_number;
                      return occupiedBeds >= totalBeds && !isCurrentSelection;
                    })(),
                  }))}
                  placeholder={moveForm.building_id ? "Select room" : "Select building first"}
                  disabled={!moveForm.building_id}
                />
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <Field
                  label="New Rent*"
                  value={moveForm.rent}
                  onChange={(value) => setMoveForm((prev) => ({ ...prev, rent: value }))}
                  type="number"
                  placeholder="eg. 9000"
                  required
                  min={0}
                />
                <Field
                  label="Move Date*"
                  value={moveForm.move_date}
                  onChange={(value) => setMoveForm((prev) => ({ ...prev, move_date: value }))}
                  type="date"
                  required
                />
              </div>

              {moveError ? (
                <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                  {moveError}
                </p>
              ) : null}

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setIsMoveModalOpen(false);
                    setMovingTenantId(null);
                    setMoveError(null);
                  }}
                  className="cursor-pointer inline-flex items-center justify-center rounded-xl border border-[var(--color-border)] px-4 py-2 text-sm font-semibold text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-soft)]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isMoving}
                  className="cursor-pointer inline-flex items-center justify-center rounded-xl bg-[var(--color-emerald)] px-5 py-2 text-sm font-bold text-[var(--color-text-inverse)] shadow-[var(--shadow-cta)] transition hover:bg-[var(--color-emerald-hover)] disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {isMoving ? "Moving..." : "Move Tenant"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      <ConfirmDialog
        isOpen={deleteConfirm !== null}
        title="Delete Tenant?"
        description={`Are you sure you want to delete "${
          tenants.find((tenant) => tenant.id === deleteConfirm)?.name || "this tenant"
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

      {/* Tenant Creation Success Modal */}
      {successTenantId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-lg">
            <div className="border-b border-[var(--color-border)] px-6 py-4">
              <h2 className="text-lg font-bold text-[var(--color-text-title)]">Tenant Added Successfully!</h2>
            </div>

            <div className="px-6 py-4">
              <p className="mb-4 text-sm text-[var(--color-text-secondary)]">
                The tenant has been successfully added to your property.
              </p>

              {successTenantCheckInTotal > 0 && (
                <div className="mb-4 rounded-lg bg-[var(--color-surface-alt)] p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--color-sky)]">
                    Check-in Payable (Prorated)
                  </p>
                  <p className="mt-2 text-2xl font-bold text-[var(--color-text-title)]">
                    ₹{formatIndianNumber(successTenantCheckInTotal)}
                  </p>
                  <p className="mt-1 text-xs text-[var(--color-text-secondary)]">
                    (Prorated rent + Security deposit)
                  </p>
                </div>
              )}

              <p className="mb-4 text-sm text-[var(--color-text-secondary)]">
                Would you like to generate the first invoice now? This will create a prorated invoice for the remaining days of this month.
              </p>
            </div>

            <div className="border-t border-[var(--color-border)] flex gap-3 px-6 py-4">
              <button
                type="button"
                onClick={() => {
                  setSuccessTenantId(null);
                  setSuccessTenantCheckInTotal(0);
                }}
                disabled={isGeneratingFirstInvoice}
                className="cursor-pointer flex-1 rounded-lg border border-[var(--color-border)] px-4 py-2 text-sm font-semibold text-[var(--color-text-secondary)] transition hover:bg-[var(--color-surface-alt)] disabled:cursor-not-allowed disabled:opacity-60"
              >
                Skip for Now
              </button>
              <button
                type="button"
                onClick={onGenerateFirstInvoice}
                disabled={isGeneratingFirstInvoice}
                className="cursor-pointer flex-1 rounded-lg bg-[var(--color-emerald)] px-4 py-2 text-sm font-semibold text-[var(--color-text-inverse)] transition hover:bg-[var(--color-emerald-hover)] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isGeneratingFirstInvoice ? "Generating..." : "Generate Invoice"}
              </button>
            </div>
          </div>
        </div>
      )}

      <ToastViewport toast={toast} />
    </DashboardLayout>
  );
}

type FieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: "text" | "number" | "tel" | "date" | "email";
  placeholder?: string;
  required?: boolean;
  min?: number;
  inputMode?: "text" | "numeric" | "decimal" | "tel" | "search" | "email" | "url";
  maxLength?: number;
};

function Field({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  required = false,
  min,
  inputMode,
  maxLength,
}: FieldProps) {
  return (
    <label className="grid gap-2">
      <span className="text-sm font-semibold text-[var(--color-text-secondary)]">{label}</span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        type={type}
        placeholder={placeholder}
        required={required}
        min={min}
        inputMode={inputMode}
        maxLength={maxLength}
        className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 text-sm text-[var(--color-text-primary)] outline-none transition focus:border-[var(--color-sky)] focus:ring-2 focus:ring-[var(--color-sky-soft)]"
      />
    </label>
  );
}

type SelectFieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string; disabled?: boolean }>;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  searchable?: boolean;
};

function SelectField({
  label,
  value,
  onChange,
  options,
  placeholder,
  required = false,
  disabled = false,
  searchable = false,
}: SelectFieldProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const selectedOption = options.find((option) => option.value === value);
  const filteredOptions = searchable
    ? options.filter((option) => {
        const query = searchQuery.toLowerCase();
        return option.label.toLowerCase().includes(query) || option.value.toLowerCase().includes(query);
      })
    : options;

  const selectOption = (optionValue: string) => {
    onChange(optionValue);
    setIsOpen(false);
    setSearchQuery("");
    setHighlightedIndex(-1);
  };

  const isOptionDisabled = (index: number) => Boolean(filteredOptions[index]?.disabled);

  const getNextEnabledIndex = (start: number, direction: 1 | -1) => {
    if (!filteredOptions.length) {
      return -1;
    }

    let index = start;
    while (index >= 0 && index < filteredOptions.length) {
      if (!isOptionDisabled(index)) {
        return index;
      }
      index += direction;
    }

    return -1;
  };

  const openAndHighlightCurrent = () => {
    setIsOpen(true);

    const selectedIndex = filteredOptions.findIndex((option) => option.value === value && !option.disabled);
    if (selectedIndex >= 0) {
      setHighlightedIndex(selectedIndex);
      return;
    }

    setHighlightedIndex(getNextEnabledIndex(0, 1));
  };

  const handleArrowNavigation = (direction: 1 | -1) => {
    if (!filteredOptions.length) {
      return;
    }

    if (!isOpen) {
      openAndHighlightCurrent();
      return;
    }

    const from = highlightedIndex < 0 ? (direction === 1 ? 0 : filteredOptions.length - 1) : highlightedIndex + direction;
    const next = getNextEnabledIndex(from, direction);
    if (next >= 0) {
      setHighlightedIndex(next);
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      handleArrowNavigation(1);
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      handleArrowNavigation(-1);
      return;
    }

    if (event.key === "Enter") {
      event.preventDefault();

      if (!isOpen) {
        openAndHighlightCurrent();
        return;
      }

      if (highlightedIndex >= 0 && highlightedIndex < filteredOptions.length && !isOptionDisabled(highlightedIndex)) {
        selectOption(filteredOptions[highlightedIndex].value);
      }
      return;
    }

    if (event.key === "Escape") {
      setIsOpen(false);
      setHighlightedIndex(-1);
    }
  };

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    if (highlightedIndex < 0) {
      const selectedIndex = filteredOptions.findIndex((option) => option.value === value && !option.disabled);
      if (selectedIndex >= 0) {
        setHighlightedIndex(selectedIndex);
      } else {
        setHighlightedIndex(getNextEnabledIndex(0, 1));
      }
      return;
    }

    const target = optionRefs.current[highlightedIndex];
    target?.scrollIntoView({ block: "nearest" });
  }, [isOpen, highlightedIndex, filteredOptions, value]);

  return (
    <div className="grid gap-2 relative">
      <span className="text-sm font-semibold text-[var(--color-text-secondary)]">{label}</span>

      <input
        value={value}
        onChange={() => undefined}
        required={required}
        tabIndex={-1}
        className="absolute h-0 w-0 pointer-events-none opacity-0"
        aria-hidden="true"
      />

      <div className="relative">
        <button
          type="button"
          disabled={disabled}
          onClick={() => {
            if (isOpen) {
              setIsOpen(false);
              setHighlightedIndex(-1);
            } else {
              openAndHighlightCurrent();
            }
          }}
          onKeyDown={handleKeyDown}
          className="flex w-full items-center justify-between rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 text-left text-sm text-[var(--color-text-primary)] outline-none transition focus:border-[var(--color-sky)] focus:ring-2 focus:ring-[var(--color-sky-soft)] hover:border-[var(--color-sky)] disabled:cursor-not-allowed disabled:bg-[var(--color-surface-muted)] disabled:text-[var(--color-text-muted)]"
        >
          <span className={selectedOption ? "text-[var(--color-text-primary)]" : "text-[var(--color-text-muted)]"}>
            {selectedOption?.label || placeholder || "Select an option"}
          </span>
          <svg
            className={`h-4 w-4 transition ${isOpen ? "rotate-180" : ""}`}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M6 9l6 6 6-6" />
          </svg>
        </button>

        {isOpen && !disabled ? (
          <div className="absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-card)]">
            {searchable ? (
              <div className="border-b border-[var(--color-border)] p-2">
                <input
                  autoFocus
                  type="text"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Search..."
                  className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-muted)] px-3 py-2 text-sm text-[var(--color-text-primary)] outline-none transition focus:border-[var(--color-sky)] focus:ring-2 focus:ring-[var(--color-sky-soft)]"
                />
              </div>
            ) : null}

            <div className="max-h-64 overflow-y-auto">
              {filteredOptions.length === 0 ? (
                <div className="px-4 py-3 text-center text-sm text-[var(--color-text-muted)]">No options found</div>
              ) : (
                filteredOptions.map((option) => (
                  <button
                    key={option.value}
                    ref={(element) => {
                      optionRefs.current[filteredOptions.indexOf(option)] = element;
                    }}
                    type="button"
                    disabled={option.disabled}
                    onClick={() => selectOption(option.value)}
                    className={`w-full px-4 py-2.5 text-left text-sm transition ${
                      option.value === value || filteredOptions[highlightedIndex]?.value === option.value
                        ? "bg-[var(--color-sky-soft)] font-semibold text-[var(--color-sky-strong)]"
                        : option.disabled
                          ? "cursor-not-allowed text-[var(--color-text-muted)] opacity-60"
                          : "text-[var(--color-text-primary)] hover:bg-[var(--color-surface-muted)]"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span>{option.label}</span>
                      {option.value === value ? (
                        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
                        </svg>
                      ) : null}
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        ) : null}
      </div>

      {isOpen && !disabled ? <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} /> : null}
    </div>
  );
}

