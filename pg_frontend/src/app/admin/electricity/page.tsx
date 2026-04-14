"use client";

import { useEffect, useMemo, useState } from "react";
import { DashboardLayout } from "@/components/home/dashboard-layout";

type Building = {
  id: string;
  name: string;
  city: string;
  area: string;
};

type ElectricityItem = {
  room_number: string;
  room_id: string;
  tenant_names: string[];
  tenant_ids: string[];
  previous_reading: number;
  current_reading: number | null;
  reading_id: string | null;
  reading_date: string | null;
  units_consumed: number | null;
  rate_per_unit: number;
  amount: number;
  status: "pending" | "recorded";
  allocations: Allocation[];
};

type Allocation = {
  tenant_id: string;
  tenant_name: string;
  check_in_date: string;
  check_out_date: string | null;
  occupancy_days: number;
  check_in_reading: number | null;
  units_consumed: number;
  amount: number;
};

type ElectricitySummary = {
  total_units: number;
  total_amount: number;
  rooms_recorded: number;
  rooms_pending: number;
};

type ElectricityResponse = {
  period: string;
  unit_label: string;
  rate_per_unit: number;
  items: ElectricityItem[];
  summary: ElectricitySummary;
};

type Setting = {
  electricity_rate_per_unit: number;
  electricity_unit_label: string;
};

const getDefaultPeriod = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
};

const formatNumber = (value: number) => {
  const amount = Number.isFinite(value) ? value : 0;
  return amount.toLocaleString("en-IN", { maximumFractionDigits: 2 });
};

export default function ElectricityBillingPage() {
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [selectedBuilding, setSelectedBuilding] = useState<string>("");
  const [period, setPeriod] = useState(getDefaultPeriod());
  const [items, setItems] = useState<ElectricityItem[]>([]);
  const [summary, setSummary] = useState<ElectricitySummary>({
    total_units: 0,
    total_amount: 0,
    rooms_recorded: 0,
    rooms_pending: 0,
  });
  const [settings, setSettings] = useState<Setting>({
    electricity_rate_per_unit: 0,
    electricity_unit_label: "kWh",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [actionRoom, setActionRoom] = useState<string | null>(null);
  const [detailRoom, setDetailRoom] = useState<ElectricityItem | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [readingsInput, setReadingsInput] = useState<Record<string, string>>({});

  const unitLabel = settings.electricity_unit_label || "kWh";

  const loadBuildings = async () => {
    try {
      const response = await fetch("/api/admin/buildings", { cache: "no-store" });
      const data = (await response.json()) as Building[] | { message?: string };

      if (response.ok && Array.isArray(data)) {
        setBuildings(data);
        if (!selectedBuilding && data.length > 0) {
          setSelectedBuilding(data[0].id);
        }
      }
    } catch {
      // no-op
    }
  };

  const loadSettings = async () => {
    try {
      const response = await fetch("/api/admin/settings", { cache: "no-store" });
      const data = (await response.json()) as Partial<Setting> & { message?: string };
      if (response.ok) {
        setSettings({
          electricity_rate_per_unit: Number(data.electricity_rate_per_unit || 0),
          electricity_unit_label: String(data.electricity_unit_label || "kWh"),
        });
      }
    } catch {
      // no-op
    }
  };

  const loadReadings = async () => {
    if (!selectedBuilding) {
      setItems([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const query = new URLSearchParams({
        building_id: selectedBuilding,
        period,
      });

      const response = await fetch(`/api/admin/electricity/readings?${query.toString()}`, {
        cache: "no-store",
      });
      const data = (await response.json()) as ElectricityResponse | { message?: string };

      if (!response.ok) {
        setError("message" in data ? data.message || "Failed to load readings" : "Failed to load readings");
        setItems([]);
        return;
      }

      const payload = data as ElectricityResponse;
      setItems(Array.isArray(payload.items) ? payload.items : []);
      setSummary(payload.summary || { total_units: 0, total_amount: 0, rooms_recorded: 0, rooms_pending: 0 });

      const nextInputs: Record<string, string> = {};
      (payload.items || []).forEach((item) => {
        nextInputs[item.room_number] = item.current_reading === null ? "" : String(item.current_reading);
      });
      setReadingsInput(nextInputs);
    } catch {
      setError("Unable to load electricity readings right now.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadBuildings();
    loadSettings();
  }, []);

  useEffect(() => {
    loadReadings();
  }, [selectedBuilding, period]);

  const onSaveSettings = async () => {
    setIsSavingSettings(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          electricity_rate_per_unit: settings.electricity_rate_per_unit,
          electricity_unit_label: settings.electricity_unit_label,
        }),
      });
      const data = (await response.json()) as { message?: string };

      if (!response.ok) {
        setError(data.message || "Failed to update rate.");
        return;
      }

      setSuccess("Electricity rate updated.");
      loadReadings();
    } catch {
      setError("Unable to update settings right now.");
    } finally {
      setIsSavingSettings(false);
    }
  };

  const onSaveReading = async (roomNumber: string) => {
    if (!selectedBuilding) {
      return;
    }

    const readingValue = Number(readingsInput[roomNumber]);
    if (!Number.isFinite(readingValue) || readingValue < 0) {
      setError("Please enter a valid non-negative reading.");
      return;
    }

    setActionRoom(roomNumber);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch("/api/admin/electricity/readings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          building_id: selectedBuilding,
          room_number: roomNumber,
          period,
          reading_value: readingValue,
        }),
      });

      const data = (await response.json()) as { message?: string };
      if (!response.ok) {
        setError(data.message || "Failed to save reading.");
        return;
      }

      setSuccess("Reading saved successfully.");
      loadReadings();
    } catch {
      setError("Unable to save reading right now.");
    } finally {
      setActionRoom(null);
    }
  };

  const totalRooms = items.length;
  const selectedBuildingLabel =
    buildings.find((building) => building.id === selectedBuilding)?.name || "Select building";

  const occupancyTag = useMemo(() => {
    if (!totalRooms) {
      return "No rooms";
    }

    return `${summary.rooms_recorded}/${totalRooms} rooms recorded`;
  }, [summary.rooms_recorded, totalRooms]);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <section className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-[var(--shadow-feature)] sm:p-8">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--color-accent)]">
              Electricity Monitoring
            </p>
            <h1 className="mt-2 text-3xl font-black tracking-tight text-[var(--color-text-title)] sm:text-4xl">
              Month-end meter readings
            </h1>
            <p className="mt-3 max-w-xl text-sm text-[var(--color-text-muted)] sm:text-base">
              Track check-in readings, record month-end values, and auto-calculate
              electricity charges for each room.
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <span className="rounded-full bg-[var(--color-surface-soft)] px-3 py-1 text-xs font-semibold text-[var(--color-text-secondary)]">
                {occupancyTag}
              </span>
              <span className="rounded-full bg-[var(--color-emerald-soft)] px-3 py-1 text-xs font-semibold text-[var(--color-emerald-strong)]">
                Rate: {formatNumber(settings.electricity_rate_per_unit)} / {unitLabel}
              </span>
            </div>
          </div>

          <div className="rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-[var(--shadow-feature)]">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--color-text-muted)]">
              Billing Snapshot
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl bg-[var(--color-surface-muted)] p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--color-text-muted)]">
                  Units Consumed
                </p>
                <p className="mt-3 text-2xl font-black text-[var(--color-text-title)]">
                  {formatNumber(summary.total_units)} {unitLabel}
                </p>
              </div>
              <div className="rounded-2xl bg-[var(--color-surface-muted)] p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--color-text-muted)]">
                  Estimated Amount
                </p>
                <p className="mt-3 text-2xl font-black text-[var(--color-text-title)]">
                  INR {formatNumber(summary.total_amount)}
                </p>
              </div>
              <div className="rounded-2xl bg-[var(--color-surface-muted)] p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--color-text-muted)]">
                  Rooms Recorded
                </p>
                <p className="mt-3 text-2xl font-black text-[var(--color-text-title)]">
                  {summary.rooms_recorded}
                </p>
              </div>
              <div className="rounded-2xl bg-[var(--color-surface-muted)] p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--color-text-muted)]">
                  Pending Readings
                </p>
                <p className="mt-3 text-2xl font-black text-[var(--color-text-title)]">
                  {summary.rooms_pending}
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-[var(--shadow-feature)]">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-bold text-[var(--color-text-title)]">Filters</h2>
                <p className="text-sm text-[var(--color-text-muted)]">Choose building and billing month.</p>
              </div>
            </div>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <label className="text-sm font-semibold text-[var(--color-text-secondary)]">
                Building
                <select
                  value={selectedBuilding}
                  onChange={(event) => setSelectedBuilding(event.target.value)}
                  className="mt-2 w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 text-sm text-[var(--color-text-primary)]"
                >
                  {buildings.length === 0 ? (
                    <option value="">No buildings</option>
                  ) : (
                    buildings.map((building) => (
                      <option key={building.id} value={building.id}>
                        {building.name}
                      </option>
                    ))
                  )}
                </select>
              </label>
              <label className="text-sm font-semibold text-[var(--color-text-secondary)]">
                Billing Month
                <input
                  type="month"
                  value={period}
                  onChange={(event) => setPeriod(event.target.value)}
                  className="mt-2 w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 text-sm text-[var(--color-text-primary)]"
                />
              </label>
            </div>
          </div>

          <div className="rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-[var(--shadow-feature)]">
            <h2 className="text-lg font-bold text-[var(--color-text-title)]">Electricity Rate</h2>
            <p className="text-sm text-[var(--color-text-muted)]">
              Set the per-unit charge for {selectedBuildingLabel}.
            </p>
            <div className="mt-4 grid gap-3">
              <label className="text-sm font-semibold text-[var(--color-text-secondary)]">
                Rate per {unitLabel}
                <input
                  type="number"
                  min={0}
                  value={settings.electricity_rate_per_unit}
                  onChange={(event) =>
                    setSettings((prev) => ({
                      ...prev,
                      electricity_rate_per_unit: Number(event.target.value),
                    }))
                  }
                  className="mt-2 w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 text-sm text-[var(--color-text-primary)]"
                />
              </label>
              <label className="text-sm font-semibold text-[var(--color-text-secondary)]">
                Unit Label
                <input
                  value={settings.electricity_unit_label}
                  onChange={(event) =>
                    setSettings((prev) => ({
                      ...prev,
                      electricity_unit_label: event.target.value,
                    }))
                  }
                  className="mt-2 w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 text-sm text-[var(--color-text-primary)]"
                />
              </label>
              <button
                type="button"
                onClick={onSaveSettings}
                disabled={isSavingSettings}
                className="cursor-pointer rounded-xl bg-[var(--color-emerald)] px-4 py-2 text-sm font-bold text-[var(--color-text-inverse)] shadow-[var(--shadow-cta)] transition hover:bg-[var(--color-emerald-hover)] disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isSavingSettings ? "Saving..." : "Save Rate"}
              </button>
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-[var(--shadow-feature)]">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-bold text-[var(--color-text-title)]">Room Readings</h2>
              <p className="text-sm text-[var(--color-text-muted)]">
                Capture month-end readings for each room and auto-calculate the bill.
              </p>
            </div>
            <div className="rounded-full border border-[var(--color-border)] bg-[var(--color-surface-muted)] px-3 py-1 text-xs font-semibold text-[var(--color-text-secondary)]">
              {period}
            </div>
          </div>

          {error ? (
            <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
              {error}
            </p>
          ) : null}
          {success ? (
            <p className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-700">
              {success}
            </p>
          ) : null}

          <div className="mt-4 overflow-x-auto rounded-2xl border border-[var(--color-border)]">
            <table className="min-w-full text-sm">
              <thead className="bg-[var(--color-surface-muted)] text-left text-xs uppercase tracking-[0.1em] text-[var(--color-text-muted)]">
                <tr>
                  <th className="px-4 py-3">Room</th>
                  <th className="px-4 py-3">Tenants</th>
                  <th className="px-4 py-3 text-right">Prev Reading</th>
                  <th className="px-4 py-3 text-right">Month-End</th>
                  <th className="px-4 py-3 text-right">Units</th>
                  <th className="px-4 py-3 text-right">Amount</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border)]">
                {isLoading ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-6 text-center text-[var(--color-text-muted)]">
                      Loading readings...
                    </td>
                  </tr>
                ) : items.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-6 text-center text-[var(--color-text-muted)]">
                      No rooms found for the selected building.
                    </td>
                  </tr>
                ) : (
                  items.map((item) => (
                    <tr key={item.room_id}>
                      <td className="px-4 py-4 font-semibold text-[var(--color-text-title)]">
                        Room {item.room_number}
                      </td>
                      <td className="px-4 py-4 text-[var(--color-text-secondary)]">
                        {item.tenant_names.length ? item.tenant_names.join(", ") : "-"}
                      </td>
                      <td className="px-4 py-4 text-right text-[var(--color-text-secondary)]">
                        {formatNumber(item.previous_reading)}
                      </td>
                      <td className="px-4 py-4 text-right">
                        <input
                          value={readingsInput[item.room_number] || ""}
                          onChange={(event) =>
                            setReadingsInput((prev) => ({
                              ...prev,
                              [item.room_number]: event.target.value,
                            }))
                          }
                          type="number"
                          min={0}
                          className="w-28 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-1 text-right text-sm"
                        />
                      </td>
                      <td className="px-4 py-4 text-right text-[var(--color-text-secondary)]">
                        {item.units_consumed === null ? "-" : formatNumber(item.units_consumed)}
                      </td>
                      <td className="px-4 py-4 text-right font-semibold text-[var(--color-text-title)]">
                        INR {formatNumber(item.amount)}
                      </td>
                      <td className="px-4 py-4">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${
                            item.status === "recorded"
                              ? "bg-[var(--color-emerald-soft)] text-[var(--color-emerald-strong)]"
                              : "bg-[var(--color-amber-soft)] text-[var(--color-amber)]"
                          }`}
                        >
                          {item.status === "recorded" ? "Recorded" : "Pending"}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex flex-col gap-2">
                          <button
                            type="button"
                            onClick={() => onSaveReading(item.room_number)}
                            disabled={actionRoom === item.room_number}
                            className="cursor-pointer rounded-lg bg-[var(--color-sky)] px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-[var(--color-sky-dark)] disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {actionRoom === item.room_number ? "Saving..." : "Save"}
                          </button>
                          <button
                            type="button"
                            onClick={() => setDetailRoom(item)}
                            className="cursor-pointer rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-xs font-semibold text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-muted)]"
                          >
                            View Split
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        {detailRoom ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-3xl rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-2xl">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--color-text-muted)]">
                    Room {detailRoom.room_number} · {period}
                  </p>
                  <h3 className="text-2xl font-black text-[var(--color-text-title)]">
                    Electricity Bill Split
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setDetailRoom(null)}
                  className="cursor-pointer rounded-xl border border-[var(--color-border)] px-4 py-2 text-sm font-semibold text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-muted)]"
                >
                  Close
                </button>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl bg-[var(--color-surface-muted)] p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--color-text-muted)]">
                    Previous Reading
                  </p>
                  <p className="mt-2 text-xl font-black text-[var(--color-text-title)]">
                    {formatNumber(detailRoom.previous_reading)}
                  </p>
                </div>
                <div className="rounded-2xl bg-[var(--color-surface-muted)] p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--color-text-muted)]">
                    Month-End Reading
                  </p>
                  <p className="mt-2 text-xl font-black text-[var(--color-text-title)]">
                    {detailRoom.current_reading === null ? "-" : formatNumber(detailRoom.current_reading)}
                  </p>
                </div>
                <div className="rounded-2xl bg-[var(--color-surface-muted)] p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--color-text-muted)]">
                    Total Units
                  </p>
                  <p className="mt-2 text-xl font-black text-[var(--color-text-title)]">
                    {detailRoom.units_consumed === null ? "-" : formatNumber(detailRoom.units_consumed)} {unitLabel}
                  </p>
                </div>
              </div>

              <div className="mt-5 rounded-2xl border border-[var(--color-border)]">
                <div className="flex items-center justify-between border-b border-[var(--color-border)] px-4 py-3">
                  <p className="text-sm font-semibold text-[var(--color-text-secondary)]">Tenant Allocation</p>
                  <p className="text-sm font-semibold text-[var(--color-text-title)]">
                    Total: INR {formatNumber(detailRoom.amount)}
                  </p>
                </div>
                <div className="divide-y divide-[var(--color-border)]">
                  {detailRoom.allocations.length === 0 ? (
                    <div className="px-4 py-4 text-sm text-[var(--color-text-muted)]">
                      No active tenants found for this period.
                    </div>
                  ) : (
                    detailRoom.allocations.map((allocation) => (
                      <div key={allocation.tenant_id} className="grid gap-3 px-4 py-4 sm:grid-cols-4">
                        <div>
                          <p className="text-sm font-semibold text-[var(--color-text-title)]">
                            {allocation.tenant_name}
                          </p>
                          <p className="text-xs text-[var(--color-text-muted)]">
                            Check-in: {allocation.check_in_date || "-"}
                          </p>
                          <p className="text-xs text-[var(--color-text-muted)]">
                            Check-out: {allocation.check_out_date || "Active"}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--color-text-muted)]">
                            Days Stayed
                          </p>
                          <p className="mt-2 text-lg font-bold text-[var(--color-text-title)]">
                            {allocation.occupancy_days}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--color-text-muted)]">
                            Units
                          </p>
                          <p className="mt-2 text-lg font-bold text-[var(--color-text-title)]">
                            {formatNumber(allocation.units_consumed)} {unitLabel}
                          </p>
                          <p className="text-xs text-[var(--color-text-muted)]">
                            Check-in reading: {allocation.check_in_reading ?? "-"}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--color-text-muted)]">
                            Amount
                          </p>
                          <p className="mt-2 text-lg font-bold text-[var(--color-text-title)]">
                            INR {formatNumber(allocation.amount)}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <p className="mt-4 text-xs text-[var(--color-text-muted)]">
                Allocation is calculated by occupancy days between check-in and check-out dates within the selected month.
              </p>
            </div>
          </div>
        ) : null}
      </div>
    </DashboardLayout>
  );
}
