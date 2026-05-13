"use client";

import { useEffect, useMemo, useState } from "react";
import { DashboardLayout } from "@/components/home/dashboard-layout";

type Building = {
  id: string;
  name: string;
  electricity_rate?: number;
};

type AllocationSegment = {
  from: string;
  to: string;
  occupants: number;
  units: number;
};

type TenantAllocation = {
  tenant_id: string;
  tenant_name: string;
  units: number;
  amount: number;
  share_percent: number;
  segments: AllocationSegment[];
};

type RoomSummary = {
  room_id: string;
  room_number: string;
  capacity: number;
  occupied: number;
  baseline_reading: number | null;
  month_end_reading: number | null;
  units: number;
  total_amount: number;
  status: "ok" | "missing_end" | "missing_start" | "invalid_reading";
  unallocated_units: number;
  allocations: TenantAllocation[];
};

type ElectricitySummary = {
  building: { id: string; name: string; electricity_rate: number };
  month: string;
  rooms: RoomSummary[];
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(Number.isFinite(value) ? value : 0);

const formatUnits = (value: number) => (Number.isFinite(value) ? value.toFixed(2) : "0.00");

const statusLabels: Record<RoomSummary["status"], string> = {
  ok: "Ready",
  missing_end: "Reading needed",
  missing_start: "Missing start reading",
  invalid_reading: "Invalid readings",
};

export default function ElectricityBillingPage() {
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [selectedBuildingId, setSelectedBuildingId] = useState<string>("");
  const [selectedMonth, setSelectedMonth] = useState<string>(new Date().toISOString().slice(0, 7));
  const [summary, setSummary] = useState<ElectricitySummary | null>(null);
  const [roomInputs, setRoomInputs] = useState<Record<string, string>>({});
  const [selectedRoom, setSelectedRoom] = useState<RoomSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isGeneratingBill, setIsGeneratingBill] = useState(false);
  const [billGenerationMessage, setBillGenerationMessage] = useState<string | null>(null);

  useEffect(() => {
    const loadBuildings = async () => {
      try {
        const response = await fetch("/api/admin/buildings", { cache: "no-store" });
        const data = (await response.json()) as Building[] | { message?: string };
        if (!response.ok) {
          setError("Unable to load buildings.");
          return;
        }
        const list = Array.isArray(data) ? data : [];
        setBuildings(list);
        if (!selectedBuildingId && list.length) {
          setSelectedBuildingId(list[0].id);
        }
      } catch {
        setError("Unable to load buildings.");
      }
    };

    loadBuildings();
  }, [selectedBuildingId]);

  useEffect(() => {
    if (!selectedBuildingId || !selectedMonth) {
      return;
    }

    const loadSummary = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(
          `/api/admin/electricity?building_id=${encodeURIComponent(selectedBuildingId)}&month=${encodeURIComponent(selectedMonth)}`,
          { cache: "no-store" }
        );
        const data = (await response.json()) as ElectricitySummary | { message?: string };
        if (!response.ok || !("rooms" in data)) {
          setError((data as { message?: string }).message || "Failed to load summary.");
          return;
        }

        setSummary(data as ElectricitySummary);
        const nextInputs: Record<string, string> = {};
        (data as ElectricitySummary).rooms.forEach((room) => {
          nextInputs[room.room_number] = room.month_end_reading !== null ? String(room.month_end_reading) : "";
        });
        setRoomInputs(nextInputs);
      } catch {
        setError("Failed to load summary.");
      } finally {
        setIsLoading(false);
      }
    };

    loadSummary();
  }, [selectedBuildingId, selectedMonth]);

  const ratePerUnit = summary?.building.electricity_rate ?? 0;

  const dirtyRooms = useMemo(() => {
    if (!summary) {
      return [] as RoomSummary[];
    }

    return summary.rooms.filter((room) => {
      const inputValue = roomInputs[room.room_number];
      if (inputValue === undefined) {
        return false;
      }
      const numeric = inputValue === "" ? null : Number(inputValue);
      return Number.isFinite(numeric as number) && numeric !== room.month_end_reading;
    });
  }, [roomInputs, summary]);

  const saveReadings = async () => {
    if (!summary || !dirtyRooms.length) {
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const payload = {
        building_id: summary.building.id,
        month: summary.month,
        readings: dirtyRooms.map((room) => ({
          room_number: room.room_number,
          reading: Number(roomInputs[room.room_number]),
        })),
      };

      const response = await fetch("/api/admin/electricity", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = (await response.json()) as { message?: string };
      if (!response.ok) {
        setError(data.message || "Failed to save readings.");
        return;
      }

      const reload = await fetch(
        `/api/admin/electricity?building_id=${encodeURIComponent(selectedBuildingId)}&month=${encodeURIComponent(selectedMonth)}`,
        { cache: "no-store" }
      );
      const nextData = (await reload.json()) as ElectricitySummary;
      if (reload.ok) {
        setSummary(nextData);
        const nextInputs: Record<string, string> = {};
        nextData.rooms.forEach((room) => {
          nextInputs[room.room_number] = room.month_end_reading !== null ? String(room.month_end_reading) : "";
        });
        setRoomInputs(nextInputs);
      }
    } catch {
      setError("Failed to save readings.");
    } finally {
      setIsSaving(false);
    }
  };

  const generateBill = async () => {
    if (!summary) {
      return;
    }

    setIsGeneratingBill(true);
    setBillGenerationMessage(null);
    setError(null);

    try {
      const response = await fetch("/api/admin/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          period: summary.month,
          building_id: summary.building.id,
        }),
      });

      const data = (await response.json()) as { message?: string; created_count?: number };
      if (!response.ok) {
        setError(data.message || "Failed to generate invoices.");
        return;
      }

      setBillGenerationMessage(`✓ ${data.created_count || 0} invoices generated successfully`);
      setTimeout(() => setBillGenerationMessage(null), 4000);
    } catch (err) {
      setError("Failed to generate invoices.");
    } finally {
      setIsGeneratingBill(false);
    }
  };


  return (
    <DashboardLayout>
      <div className="space-y-6">
        <section className="rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-[var(--shadow-feature)] sm:p-8">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--color-sky)]">
            Electricity Billing
          </p>
          <h1 className="mt-1 text-3xl font-black tracking-tight text-[var(--color-text-title)] sm:text-4xl">
            Monthly meter readings
          </h1>
          <p className="mt-2 text-sm text-[var(--color-text-muted)]">
            Record month-end meter readings and review split calculations across active tenants.
          </p>
          <p className="mt-2 text-xs text-[var(--color-text-muted)]">
            Electricity charges are added to the monthly rent invoice.
          </p>
        </section>

        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <article className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-[var(--shadow-feature)]">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--color-text-muted)]">Building</p>
            <select
              value={selectedBuildingId}
              onChange={(event) => setSelectedBuildingId(event.target.value)}
              className="mt-2 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-muted)] px-3 py-2 text-sm"
            >
              {buildings.map((building) => (
                <option key={building.id} value={building.id}>
                  {building.name}
                </option>
              ))}
            </select>
          </article>
          <article className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-[var(--shadow-feature)]">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--color-text-muted)]">Billing Month</p>
            <input
              type="month"
              value={selectedMonth}
              onChange={(event) => setSelectedMonth(event.target.value)}
              className="mt-2 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-muted)] px-3 py-2 text-sm"
            />
          </article>
          <article className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-[var(--shadow-feature)]">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--color-text-muted)]">Rate / Unit</p>
            <p className="mt-2 text-2xl font-black text-[var(--color-text-title)]">{formatCurrency(ratePerUnit)}</p>
            <p className="mt-1 text-xs text-[var(--color-text-muted)]">Set on building settings</p>
          </article>
        </section>

        {error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        {billGenerationMessage ? (
          <div className="rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
            {billGenerationMessage}
          </div>
        ) : null}


        {isLoading ? (
          <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-6 text-sm text-[var(--color-text-muted)]">
            Loading electricity summary...
          </div>
        ) : summary ? (
          <section className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-[var(--shadow-feature)]">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-[var(--color-text-title)]">Room-wise readings</h2>
                <p className="mt-1 text-sm text-[var(--color-text-muted)]">
                  Save month-end readings to generate tenant splits.
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={generateBill}
                  disabled={isGeneratingBill}
                  className="cursor-pointer rounded-xl bg-[var(--color-sky)] px-4 py-2 text-sm font-semibold text-[var(--color-text-inverse)] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isGeneratingBill ? "Generating..." : "Generate Bill"}
                </button>
                <button
                  type="button"
                  onClick={saveReadings}
                  disabled={!dirtyRooms.length || isSaving}
                  className="cursor-pointer rounded-xl bg-[var(--color-emerald)] px-4 py-2 text-sm font-semibold text-[var(--color-text-inverse)] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSaving ? "Saving..." : "Save Readings"}
                </button>
              </div>
            </div>

            <div className="mt-4 overflow-x-auto rounded-xl border border-[var(--color-border)]">
              <table className="w-full text-sm">
                <thead className="bg-[var(--color-surface-muted)] text-[var(--color-text-muted)]">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-[0.08em]">Room</th>
                    <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-[0.08em]">Prev Reading</th>
                    <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-[0.08em]">Month-End</th>
                    <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-[0.08em]">Units</th>
                    <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-[0.08em]">Amount</th>
                    <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-[0.08em]">Status</th>
                    <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-[0.08em]">Split</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.rooms.map((room) => (
                    <tr key={room.room_id} className="border-t border-[var(--color-border)]">
                      <td className="px-4 py-3 font-semibold text-[var(--color-text-title)]">Room {room.room_number}</td>
                      <td className="px-4 py-3 text-[var(--color-text-secondary)]">
                        {room.baseline_reading !== null ? formatUnits(room.baseline_reading) : "-"}
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="number"
                          min={0}
                          value={roomInputs[room.room_number] ?? ""}
                          onChange={(event) =>
                            setRoomInputs((prev) => ({ ...prev, [room.room_number]: event.target.value }))
                          }
                          className="w-28 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-muted)] px-2 py-1 text-sm"
                        />
                      </td>
                      <td className="px-4 py-3 text-[var(--color-text-secondary)]">{formatUnits(room.units)}</td>
                      <td className="px-4 py-3 text-[var(--color-text-secondary)]">{formatCurrency(room.total_amount)}</td>
                      <td className="px-4 py-3 text-xs font-semibold text-[var(--color-text-muted)]">
                        {statusLabels[room.status]}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => setSelectedRoom(room)}
                          className="cursor-pointer text-xs font-semibold text-[var(--color-sky)] underline decoration-dotted underline-offset-4"
                        >
                          View split
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ) : null}
      </div>

      {selectedRoom ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-2xl rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-card)]">
            <div className="flex items-center justify-between border-b border-[var(--color-border)] px-5 py-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--color-sky)]">Room {selectedRoom.room_number}</p>
                <h3 className="text-lg font-bold text-[var(--color-text-title)]">Electricity split</h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedRoom(null)}
                className="cursor-pointer rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-sm font-semibold text-[var(--color-text-secondary)]"
              >
                Close
              </button>
            </div>
            <div className="p-5">
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-3 text-sm">
                  <p className="text-xs font-bold uppercase tracking-[0.08em] text-[var(--color-text-muted)]">Total units</p>
                  <p className="mt-2 text-lg font-black text-[var(--color-text-title)]">{formatUnits(selectedRoom.units)}</p>
                </div>
                <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-3 text-sm">
                  <p className="text-xs font-bold uppercase tracking-[0.08em] text-[var(--color-text-muted)]">Amount</p>
                  <p className="mt-2 text-lg font-black text-[var(--color-text-title)]">{formatCurrency(selectedRoom.total_amount)}</p>
                </div>
                <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-3 text-sm">
                  <p className="text-xs font-bold uppercase tracking-[0.08em] text-[var(--color-text-muted)]">Unallocated</p>
                  <p className="mt-2 text-lg font-black text-[var(--color-text-title)]">{formatUnits(selectedRoom.unallocated_units)}</p>
                </div>
              </div>

              <div className="mt-4 space-y-4">
                {selectedRoom.allocations.length ? (
                  selectedRoom.allocations.map((allocation) => (
                    <div key={allocation.tenant_id} className="rounded-xl border border-[var(--color-border)] p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-bold text-[var(--color-text-title)]">{allocation.tenant_name}</p>
                          <p className="text-xs text-[var(--color-text-muted)]">{allocation.share_percent}% share</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold text-[var(--color-text-secondary)]">{formatUnits(allocation.units)} units</p>
                          <p className="text-sm font-bold text-[var(--color-text-title)]">{formatCurrency(allocation.amount)}</p>
                        </div>
                      </div>
                      <div className="mt-3 space-y-2 text-xs text-[var(--color-text-secondary)]">
                        {allocation.segments.map((segment, index) => (
                          <div key={`${allocation.tenant_id}-${index}`} className="flex items-center justify-between">
                            <span>
                              {segment.from} to {segment.to} ({segment.occupants} occupants)
                            </span>
                            <span>{formatUnits(segment.units)} units</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-4 text-sm text-[var(--color-text-muted)]">
                    No allocations available yet. Add month-end readings first.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </DashboardLayout>
  );
}
