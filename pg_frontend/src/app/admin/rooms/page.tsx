"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
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

type Room = {
  id: string;
  building_id: string;
  room_number: string;
  floor: number;
  type: string;
  capacity: number;
  occupied: number;
  pre_booked: number;
  rent: number;
  status: string;
  created_at: string;
  created_by: string;
  pre_bookings: string[];
  pre_bookings_count: number;
  electricity_reading?: number;
};

type RoomForm = {
  building_id: string;
  room_number: string;
  floor: string;
  type: string;
  capacity: string;
  status: string;
  electricity_reading: string;
};

const initialForm: RoomForm = {
  building_id: "",
  room_number: "",
  floor: "",
  type: "single",
  capacity: "",
  status: "vacant",
  electricity_reading: "",
};

const ROOM_TYPES = ["single", "double", "triple"];
const ROOM_STATUSES = ["vacant", "occupied", "partially_occupied", "pre_booked"];

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

export default function RoomsPage() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRoomId, setEditingRoomId] = useState<string | null>(null);
  const [form, setForm] = useState<RoomForm>(initialForm);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const { toast, showToast } = useToast({ defaultDurationMs: 3200 });

  const pageSize = 10;

  const selectedBuilding = useMemo(
    () => buildings.find((b) => b.id === form.building_id),
    [buildings, form.building_id]
  );

  const filteredRooms = useMemo(() => {
    const query = searchText.trim().toLowerCase();

    if (!query) {
      return rooms;
    }

    return rooms.filter((room) => {
      const roomNumber = room.room_number.toLowerCase();
      const building = buildings.find((b) => b.id === room.building_id);
      const buildingName = building?.name.toLowerCase() || "";
      const status = room.status.toLowerCase();
      const type = room.type.toLowerCase();

      return (
        roomNumber.includes(query) ||
        buildingName.includes(query) ||
        status.includes(query) ||
        type.includes(query)
      );
    });
  }, [rooms, buildings, searchText]);

  const totalPages = useMemo(
    () => Math.max(Math.ceil(filteredRooms.length / pageSize), 1),
    [filteredRooms.length]
  );

  const paginatedRooms = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredRooms.slice(start, start + pageSize);
  }, [filteredRooms, currentPage]);

  const loadRooms = async () => {
    setIsLoading(true);
    setListError(null);

    try {
      const response = await fetch("/api/admin/rooms", { cache: "no-store" });
      const data = (await response.json()) as { message?: string } | Room[];

      if (!response.ok) {
        const message = "message" in data ? data.message : "Failed to fetch rooms";
        setListError(message || "Failed to fetch rooms");
        return;
      }

      setRooms(Array.isArray(data) ? data : []);
    } catch {
      setListError("Unable to load rooms right now.");
    } finally {
      setIsLoading(false);
    }
  };

  const loadBuildings = async () => {
    try {
      const response = await fetch("/api/admin/buildings", { cache: "no-store" });
      const data = (await response.json()) as { message?: string } | Building[];

      if (response.ok) {
        setBuildings(Array.isArray(data) ? data : []);
      }
    } catch {
      // Building load error silently handled
    }
  };

  useEffect(() => {
    loadRooms();
    loadBuildings();
  }, []);

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

    const trimmedRoomNumber = form.room_number.trim();
    const buildingId = form.building_id.trim();
    const floor = Number(form.floor);
    const capacity = Number(form.capacity);
    const electricityReading = form.electricity_reading === "" ? null : Number(form.electricity_reading);
    const type = form.type.trim();
    const status = form.status.trim();

    // Validations
    if (!buildingId) {
      const errorMessage = "Please select a building.";
      setFormError(errorMessage);
      showToast(errorMessage, "error");
      return;
    }

    if (!trimmedRoomNumber) {
      const errorMessage = "Please enter a room number.";
      setFormError(errorMessage);
      showToast(errorMessage, "error");
      return;
    }

    if (!Number.isInteger(floor) || floor < 1) {
      const errorMessage = "Floor must be at least 1.";
      setFormError(errorMessage);
      showToast(errorMessage, "error");
      return;
    }

    if (!ROOM_TYPES.includes(type)) {
      const errorMessage = "Please select a valid room type.";
      setFormError(errorMessage);
      showToast(errorMessage, "error");
      return;
    }

    if (!Number.isInteger(capacity) || capacity < 1) {
      const errorMessage = "Capacity must be at least 1.";
      setFormError(errorMessage);
      showToast(errorMessage, "error");
      return;
    }

    if (!ROOM_STATUSES.includes(status)) {
      const errorMessage = "Please select a valid status.";
      setFormError(errorMessage);
      showToast(errorMessage, "error");
      return;
    }

    if (
      electricityReading !== null &&
      (!Number.isFinite(electricityReading) || electricityReading < 0)
    ) {
      const errorMessage = "Electricity reading must be a non-negative number.";
      setFormError(errorMessage);
      showToast(errorMessage, "error");
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = {
        building_id: buildingId,
        room_number: trimmedRoomNumber,
        floor,
        type,
        capacity,
        status,
        ...(electricityReading !== null ? { electricity_reading: Number(electricityReading.toFixed(2)) } : {}),
      };

      const url = editingRoomId ? `/api/admin/rooms/${editingRoomId}` : "/api/admin/rooms";
      const method = editingRoomId ? "PUT" : "POST";

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
        const errorMessage = details || result.message || "Failed to save room.";
        setFormError(errorMessage);
        showToast(errorMessage, "error");
        return;
      }

      setForm(initialForm);
      setEditingRoomId(null);
      setIsModalOpen(false);
      showToast(editingRoomId ? "Room updated successfully." : "Room created successfully.", "success");
      await loadRooms();
    } catch {
      const errorMessage = "Unable to submit form. Please try again.";
      setFormError(errorMessage);
      showToast(errorMessage, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const onEdit = (room: Room) => {
    setEditingRoomId(room.id);
    setForm({
      building_id: room.building_id,
      room_number: room.room_number,
      floor: String(room.floor),
      type: room.type,
      capacity: String(room.capacity),
      status: room.status,
      electricity_reading: room.electricity_reading !== undefined ? String(room.electricity_reading) : "",
    });
    setFormError(null);
    setIsModalOpen(true);
  };

  const onDelete = async (id: string) => {
    setIsDeleting(true);

    try {
      const response = await fetch(`/api/admin/rooms/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        showToast("Failed to delete room. Please try again.", "error");
        return;
      }

      setDeleteConfirm(null);
      showToast("Room deleted successfully.", "success");
      await loadRooms();
    } catch {
      showToast("Unable to delete room right now.", "error");
    } finally {
      setIsDeleting(false);
    }
  };

  const formatStatus = (status: string) => {
    return status
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  return (
    <DashboardLayout>
      <section className="rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-[var(--shadow-feature)] sm:p-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--color-sky)]">
              Room Management
            </p>
            <h1 className="mt-1 text-3xl font-black tracking-tight text-[var(--color-text-title)] sm:text-4xl">
              Manage all rooms
            </h1>
          </div>

          <button
            type="button"
            onClick={() => {
              setFormError(null);
              setEditingRoomId(null);
              setForm(initialForm);
              setIsModalOpen(true);
            }}
            className="cursor-pointer inline-flex items-center justify-center rounded-xl bg-[var(--color-emerald)] px-4 py-2 text-sm font-bold text-[var(--color-text-inverse)] shadow-[var(--shadow-cta)] transition hover:bg-[var(--color-emerald-hover)]"
          >
            Add New Room
          </button>
        </div>

        {!isLoading && rooms.length > 0 ? (
          <div className="mt-5">
            <label className="relative block">
              <span className="sr-only">Search room by number, building, type, or status</span>
              <input
                type="text"
                value={searchText}
                onChange={(event) => setSearchText(event.target.value)}
                placeholder="Search by room number, building, type, or status"
                className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 text-sm text-[var(--color-text-primary)] outline-none transition focus:border-[var(--color-sky)] focus:ring-2 focus:ring-[var(--color-sky-soft)]"
              />
            </label>
          </div>
        ) : null}

        {isLoading ? (
          <div className="mt-8 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-8 text-center text-sm text-[var(--color-text-muted)]">
            Loading rooms...
          </div>
        ) : null}

        {!isLoading && listError ? (
          <div className="mt-8 rounded-2xl border border-red-200 bg-red-50 p-5 text-sm font-medium text-red-700">
            {listError}
          </div>
        ) : null}

        {!isLoading && !listError && rooms.length === 0 ? (
          <div className="mt-8 rounded-2xl border border-dashed border-[var(--color-border-strong)] bg-[var(--color-surface-muted)] p-10 text-center">
            <h2 className="text-2xl font-black text-[var(--color-text-title)]">No Rooms Yet</h2>
            <p className="mt-2 text-sm text-[var(--color-text-muted)]">
              Get started by adding your first room.
            </p>
            <button
              type="button"
              onClick={() => {
                setFormError(null);
                setEditingRoomId(null);
                setForm(initialForm);
                setIsModalOpen(true);
              }}
              className="cursor-pointer mt-6 inline-flex items-center justify-center rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-5 py-3 text-sm font-semibold text-[var(--color-text-secondary)] transition hover:bg-[var(--color-surface-soft)]"
            >
              Add Your First Room
            </button>
          </div>
        ) : null}

        {!isLoading && !listError && rooms.length > 0 && filteredRooms.length === 0 ? (
          <div className="mt-8 rounded-2xl border border-dashed border-[var(--color-border-strong)] bg-[var(--color-surface-muted)] p-10 text-center">
            <h2 className="text-2xl font-black text-[var(--color-text-title)]">No Matching Rooms</h2>
            <p className="mt-2 text-sm text-[var(--color-text-muted)]">
              Try a different room number, building, type, or status.
            </p>
          </div>
        ) : null}

        {!isLoading && !listError && filteredRooms.length > 0 ? (
          <div className="mt-8 overflow-x-auto rounded-2xl border border-[var(--color-border)]">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[var(--color-border)] bg-[var(--color-surface-muted)]">
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-[0.08em] text-[var(--color-text-muted)]">Room</th>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-[0.08em] text-[var(--color-text-muted)]">Building</th>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-[0.08em] text-[var(--color-text-muted)]">Floor</th>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-[0.08em] text-[var(--color-text-muted)]">Type</th>
                  <th className="px-4 py-3 text-center text-xs font-bold uppercase tracking-[0.08em] text-[var(--color-text-muted)]">Capacity</th>
                  <th className="px-4 py-3 text-center text-xs font-bold uppercase tracking-[0.08em] text-[var(--color-text-muted)]">Occupied</th>
                  <th className="px-4 py-3 text-center text-xs font-bold uppercase tracking-[0.08em] text-[var(--color-text-muted)]">Pre-Booked</th>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-[0.08em] text-[var(--color-text-muted)]">Status</th>
                  <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-[0.08em] text-[var(--color-text-muted)]">Rent</th>
                  <th className="px-4 py-3 text-center text-xs font-bold uppercase tracking-[0.08em] text-[var(--color-text-muted)]">Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedRooms.map((room, index) => {
                  const building = buildings.find((b) => b.id === room.building_id);

                  return (
                    <tr
                      key={room.id}
                      className={`border-b border-[var(--color-border)] transition ${
                        index % 2 === 0
                          ? "bg-[var(--color-surface)]"
                          : "bg-[var(--color-surface-muted)]"
                      } hover:bg-[var(--color-surface-soft)]`}
                    >
                      <td className="px-4 py-3 text-sm font-bold text-[var(--color-text-title)]">{room.room_number}</td>
                      <td className="px-4 py-3 text-sm text-[var(--color-text-secondary)]">{building?.name || "Unknown"}</td>
                      <td className="px-4 py-3 text-sm text-[var(--color-text-secondary)]">{room.floor}</td>
                      <td className="px-4 py-3">
                        <span className="inline-flex rounded-full bg-[var(--color-sky-soft)] px-2 py-1 text-xs font-bold text-[var(--color-sky-strong)]">
                          {room.type.charAt(0).toUpperCase() + room.type.slice(1)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center text-sm font-bold text-[var(--color-text-secondary)]">{room.capacity}</td>
                      <td className="px-4 py-3 text-center text-sm font-bold text-[var(--color-text-secondary)]">{room.occupied}</td>
                      <td className="px-4 py-3 text-center text-sm font-bold text-[var(--color-text-secondary)]">{room.pre_booked}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex rounded-full px-2 py-1 text-xs font-bold ${
                            room.status === "vacant"
                              ? "bg-[var(--color-emerald-soft)] text-[var(--color-emerald-strong)]"
                              : "bg-[var(--color-amber-soft)] text-[var(--color-amber-strong)]"
                          }`}
                        >
                          {formatStatus(room.status)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div>
                          <p className="text-sm font-bold text-[var(--color-text-secondary)]">
                            ₹{formatIndianNumber(room.rent)}
                          </p>
                          <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                            {room.occupied === 0 ? "No tenants" : "Auto-calculated"}
                          </p>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            type="button"
                            title="Edit room"
                            onClick={() => onEdit(room)}
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
                            title="Delete room"
                            onClick={() => setDeleteConfirm(room.id)}
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

        {!isLoading && !listError && filteredRooms.length > 0 ? (
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
                  key={`room-page-${pageNumber}`}
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
                {editingRoomId ? "Edit Room" : "Add New Room"}
              </h3>
              <button
                type="button"
                onClick={() => {
                  setIsModalOpen(false);
                  setFormError(null);
                  setEditingRoomId(null);
                  setForm(initialForm);
                }}
                className="cursor-pointer rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-sm font-semibold text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-soft)]"
              >
                Close
              </button>
            </div>

            <form onSubmit={onSubmit} className="mt-6 grid gap-5">
              <SelectField
                label="Building*"
                value={form.building_id}
                onChange={(value) => setForm((prev) => ({ ...prev, building_id: value }))}
                options={buildings.map((b) => ({
                  value: b.id,
                  label: `${b.name} (${b.city}, ${b.area})`,
                }))}
                placeholder="Select a building"
                required
              searchable
              />

              <div className="grid gap-5 sm:grid-cols-2">
                <Field
                  label="Room Number*"
                  value={form.room_number}
                  onChange={(value) => setForm((prev) => ({ ...prev, room_number: value }))}
                  placeholder="eg. 101"
                  required
                />
                <Field
                  label="Floor*"
                  value={form.floor}
                  onChange={(value) => setForm((prev) => ({ ...prev, floor: value }))}
                  type="number"
                  placeholder="eg. 1"
                  min={0}
                  required
                />
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <SelectField
                  label="Room Type*"
                  value={form.type}
                  onChange={(value) => setForm((prev) => ({ ...prev, type: value }))}
                  options={ROOM_TYPES.map((t) => ({
                    value: t,
                    label: t.charAt(0).toUpperCase() + t.slice(1),
                  }))}
                  required
                />
                <Field
                  label="Capacity*"
                  value={form.capacity}
                  onChange={(value) => setForm((prev) => ({ ...prev, capacity: value }))}
                  type="number"
                  placeholder="eg. 2"
                  min={0}
                  required
                />
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <SelectField
                  label="Status*"
                  value={form.status}
                  onChange={(value) => setForm((prev) => ({ ...prev, status: value }))}
                  options={ROOM_STATUSES.map((s) => ({
                    value: s,
                    label: formatStatus(s),
                  }))}
                  required
                />

                <Field
                  label="Electricity Reading"
                  value={form.electricity_reading}
                  onChange={(value) => setForm((prev) => ({ ...prev, electricity_reading: value }))}
                  type="number"
                  placeholder="eg. 1250"
                  min={0}
                />
              </div>

              <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--color-text-muted)]">
                  Note
                </p>
                <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
                  Room rent is automatically calculated based on the total rent of all tenants assigned to this room.
                </p>
              </div>

              {selectedBuilding && (
                <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--color-text-muted)]">
                    Building Info
                  </p>
                  <div className="mt-2 space-y-1 text-sm text-[var(--color-text-secondary)]">
                    <p>Name: {selectedBuilding.name}</p>
                    <p>
                      Location: {selectedBuilding.city}, {selectedBuilding.area}
                    </p>
                  </div>
                </div>
              )}

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
                    setEditingRoomId(null);
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
                  {isSubmitting ? (editingRoomId ? "Updating..." : "Creating...") : (editingRoomId ? "Update Room" : "Create Room")}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      <ConfirmDialog
        isOpen={deleteConfirm !== null}
        title="Delete Room?"
        description={`Are you sure you want to delete "${
          rooms.find((r) => r.id === deleteConfirm)?.room_number || "this room"
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
};

function Field({ label, value, onChange, required = false, type = "text", placeholder, min }: FieldProps) {
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
        className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 text-sm text-[var(--color-text-primary)] outline-none transition focus:border-[var(--color-sky)] focus:ring-2 focus:ring-[var(--color-sky-soft)]"
      />
    </label>
  );
}

type SelectFieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
  placeholder?: string;
  required?: boolean;
  searchable?: boolean;
};

function SelectField({ label, value, onChange, options, placeholder, required = false, searchable = false }: SelectFieldProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const selectedOption = options.find((opt) => opt.value === value);
  const filteredOptions = searchable
    ? options.filter((opt) =>
        opt.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
        opt.value.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : options;

  const handleSelect = (optionValue: string) => {
    onChange(optionValue);
    setIsOpen(false);
    setSearchQuery("");
    setHighlightedIndex(-1);
  };

  const openAndHighlightCurrent = () => {
    setIsOpen(true);
    const selectedIndex = filteredOptions.findIndex((opt) => opt.value === value);
    setHighlightedIndex(selectedIndex >= 0 ? selectedIndex : 0);
  };

  const handleArrowNavigation = (direction: 1 | -1) => {
    if (!filteredOptions.length) {
      return;
    }

    if (!isOpen) {
      openAndHighlightCurrent();
      return;
    }

    const nextIndex = Math.min(
      Math.max((highlightedIndex < 0 ? 0 : highlightedIndex) + direction, 0),
      filteredOptions.length - 1
    );
    setHighlightedIndex(nextIndex);
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

      if (highlightedIndex >= 0 && highlightedIndex < filteredOptions.length) {
        handleSelect(filteredOptions[highlightedIndex].value);
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
      const selectedIndex = filteredOptions.findIndex((opt) => opt.value === value);
      setHighlightedIndex(selectedIndex >= 0 ? selectedIndex : 0);
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
        className="absolute h-0 w-0 opacity-0 pointer-events-none"
        aria-hidden="true"
      />

      <div className="relative">
        <button
          type="button"
          onClick={() => {
            if (isOpen) {
              setIsOpen(false);
              setHighlightedIndex(-1);
            } else {
              openAndHighlightCurrent();
            }
          }}
          onKeyDown={handleKeyDown}
          className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 text-sm text-[var(--color-text-primary)] outline-none transition focus:border-[var(--color-sky)] focus:ring-2 focus:ring-[var(--color-sky-soft)] flex items-center justify-between cursor-pointer hover:border-[var(--color-sky)]"
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

        {isOpen && (
          <div className="absolute top-full left-0 right-0 mt-2 z-50 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-lg overflow-hidden">
            {searchable && (
              <div className="border-b border-[var(--color-border)] p-2">
                <input
                  type="text"
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-muted)] px-3 py-2 text-sm text-[var(--color-text-primary)] outline-none transition focus:border-[var(--color-sky)] focus:ring-2 focus:ring-[var(--color-sky-soft)]"
                  autoFocus
                />
              </div>
            )}

            <div className="max-h-64 overflow-y-auto">
              {filteredOptions.length === 0 ? (
                <div className="px-4 py-3 text-sm text-[var(--color-text-muted)] text-center">
                  No options found
                </div>
              ) : (
                filteredOptions.map((option) => (
                  <button
                    key={option.value}
                    ref={(element) => {
                      optionRefs.current[filteredOptions.indexOf(option)] = element;
                    }}
                    type="button"
                    onClick={() => handleSelect(option.value)}
                    className={`w-full text-left px-4 py-2.5 text-sm transition ${
                      option.value === value || filteredOptions[highlightedIndex]?.value === option.value
                        ? "bg-[var(--color-sky-soft)] text-[var(--color-sky-strong)] font-semibold"
                        : "text-[var(--color-text-primary)] hover:bg-[var(--color-surface-muted)]"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span>{option.label}</span>
                      {option.value === value && (
                        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
                        </svg>
                      )}
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {isOpen && <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />}
    </div>
  );
}
