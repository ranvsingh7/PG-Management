const parseMonth = (value) => {
  if (typeof value !== "string" || !/^\d{4}-\d{2}$/.test(value)) {
    return null;
  }

  const [yearText, monthText] = value.split("-");
  const year = Number(yearText);
  const monthIndex = Number(monthText) - 1;
  if (!Number.isFinite(year) || !Number.isFinite(monthIndex) || monthIndex < 0 || monthIndex > 11) {
    return null;
  }

  const start = new Date(Date.UTC(year, monthIndex, 1, 0, 0, 0, 0));
  const end = new Date(Date.UTC(year, monthIndex + 1, 0, 23, 59, 59, 999));

  return { year, monthIndex, start, end, value: `${yearText}-${monthText}` };
};

const formatDay = (date) => date.toISOString().slice(0, 10);

const toDate = (value) => {
  if (!value) {
    return null;
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const buildTenantIntervals = (tenants, buildingId, roomNumber) =>
  tenants
    .filter((tenant) => tenant.building_id === buildingId && tenant.room_number === roomNumber)
    .map((tenant) => {
      const start = toDate(tenant.check_in_date);
      const checkOut = toDate(tenant.check_out_date);
      const end = checkOut || (tenant.status === "inactive" ? start : null);
      if (!start) {
        return null;
      }
      return {
        tenant_id: tenant.id,
        tenant_name: tenant.name,
        start,
        end
      };
    })
    .filter(Boolean);

const getActiveTenantsForSegment = (intervals, segmentStart, segmentEnd) =>
  intervals.filter((interval) => {
    const end = interval.end || new Date(8640000000000000);
    return interval.start < segmentEnd && end > segmentStart;
  });

const buildRoomSummary = ({
  room,
  buildingId,
  monthStart,
  monthEnd,
  rate,
  roomReadings,
  baselineReading,
  monthEndReading,
  tenantIntervals
}) => {
  const summary = {
    room_id: room.id,
    room_number: room.room_number,
    capacity: room.capacity,
    occupied: room.occupied,
    baseline_reading: baselineReading ? Number(baselineReading.reading) : null,
    month_end_reading: monthEndReading ? Number(monthEndReading.reading) : null,
    units: 0,
    total_amount: 0,
    status: "ok",
    unallocated_units: 0,
    allocations: []
  };

  if (!monthEndReading) {
    summary.status = "missing_end";
    return summary;
  }

  const sortedReadings = [...roomReadings]
    .filter((reading) => reading.reading_at >= monthStart && reading.reading_at <= monthEnd)
    .sort((a, b) => new Date(a.reading_at).getTime() - new Date(b.reading_at).getTime());

  const timeline = [];

  if (baselineReading) {
    timeline.push({
      reading: Number(baselineReading.reading),
      reading_at: monthStart,
      reading_type: "baseline"
    });
  } else if (sortedReadings.length > 0) {
    timeline.push(sortedReadings[0]);
    if (new Date(sortedReadings[0].reading_at).getTime() > monthStart.getTime()) {
      summary.status = "missing_start";
    }
  } else {
    summary.status = "missing_start";
    return summary;
  }

  sortedReadings.forEach((reading) => {
    if (new Date(reading.reading_at).getTime() > new Date(timeline[timeline.length - 1].reading_at).getTime()) {
      timeline.push(reading);
    }
  });

  if (
    new Date(monthEndReading.reading_at).getTime() >
    new Date(timeline[timeline.length - 1].reading_at).getTime()
  ) {
    timeline.push(monthEndReading);
  }

  const allocations = new Map();

  for (let i = 0; i < timeline.length - 1; i += 1) {
    const start = new Date(timeline[i].reading_at);
    const end = new Date(timeline[i + 1].reading_at);

    if (end <= start) {
      continue;
    }

    const units = Number(timeline[i + 1].reading) - Number(timeline[i].reading);
    if (!Number.isFinite(units) || units < 0) {
      summary.status = "invalid_reading";
      return summary;
    }

    const intervalDuration = end.getTime() - start.getTime();
    const boundaries = [start, end];

    tenantIntervals.forEach((interval) => {
      if (interval.start > start && interval.start < end) {
        boundaries.push(interval.start);
      }
      if (interval.end && interval.end > start && interval.end < end) {
        boundaries.push(interval.end);
      }
    });

    const sortedBoundaries = Array.from(new Set(boundaries.map((d) => d.getTime())))
      .sort((a, b) => a - b)
      .map((value) => new Date(value));

    for (let j = 0; j < sortedBoundaries.length - 1; j += 1) {
      const segmentStart = sortedBoundaries[j];
      const segmentEnd = sortedBoundaries[j + 1];
      const segmentDuration = segmentEnd.getTime() - segmentStart.getTime();

      if (segmentDuration <= 0) {
        continue;
      }

      const segmentUnits = Number(((units * segmentDuration) / intervalDuration).toFixed(4));
      const activeTenants = getActiveTenantsForSegment(tenantIntervals, segmentStart, segmentEnd);

      if (activeTenants.length === 0) {
        summary.unallocated_units = Number((summary.unallocated_units + segmentUnits).toFixed(4));
        continue;
      }

      const share = Number((segmentUnits / activeTenants.length).toFixed(4));

      activeTenants.forEach((tenant) => {
        const current = allocations.get(tenant.tenant_id) || {
          tenant_id: tenant.tenant_id,
          tenant_name: tenant.tenant_name,
          units: 0,
          amount: 0,
          segments: []
        };

        current.units = Number((current.units + share).toFixed(4));
        current.segments.push({
          from: formatDay(segmentStart),
          to: formatDay(segmentEnd),
          occupants: activeTenants.length,
          units: share
        });

        allocations.set(tenant.tenant_id, current);
      });
    }

    summary.units = Number((summary.units + units).toFixed(4));
  }

  summary.total_amount = Number((summary.units * rate).toFixed(2));
  summary.allocations = Array.from(allocations.values()).map((entry) => {
    const amount = Number((entry.units * rate).toFixed(2));
    const sharePercent = summary.units > 0 ? Number(((entry.units / summary.units) * 100).toFixed(2)) : 0;
    return {
      ...entry,
      units: Number(entry.units.toFixed(4)),
      amount,
      share_percent: sharePercent
    };
  });

  return summary;
};

export { parseMonth, buildTenantIntervals, buildRoomSummary };
