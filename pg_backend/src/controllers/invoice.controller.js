import { v4 as uuidv4 } from 'uuid';
import { getAllBuildings } from '../data/building.store.js';
import { getAllTenants } from '../data/tenant.store.js';
import {
  createManyInvoices,
  deleteInvoiceById,
  getInvoiceById,
  getInvoices,
  updateInvoiceById
} from '../data/invoice.store.js';
import { getOrCreateInvoiceSetting, updateInvoiceSetting } from '../data/invoice-setting.store.js';
import { getTenantById, updateTenant } from '../data/tenant.store.js';
import { getRoomsByBuildingId } from '../data/room.store.js';
import {
  getLatestReadingBeforeDate,
  getMonthEndReadingForRange,
  getReadingsForBuildingAndRange
} from '../data/electricity-reading.store.js';
import {
  createSecurityDeposit,
  getSecurityDeposits,
  updateSecurityDepositById
} from '../data/security-deposit.store.js';
import { getAdminById } from '../data/admin.store.js';
import { parseMonth, buildTenantIntervals, buildRoomSummary } from '../services/electricity-billing.js';

const VERIFICATION_CHARGE = 500;

const toMonthKey = (date = new Date()) => {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
};

const parsePeriod = (value) => {
  const period = value || toMonthKey();
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(period)) {
    return null;
  }

  const [yearStr, monthStr] = period.split('-');
  return {
    value: period,
    year: Number(yearStr),
    month: Number(monthStr)
  };
};

const toStartOfDayTs = (value) => {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 0, 0, 0, 0);
};

const isTenantActiveInPeriod = (tenant, periodFromTs, periodToTs) => {
  const checkInTs = toStartOfDayTs(tenant.check_in_date);
  if (checkInTs === null || checkInTs > periodToTs) {
    return false;
  }

  if (!tenant.check_out_date) {
    return true;
  }

  const checkOutTs = toStartOfDayTs(tenant.check_out_date);
  if (checkOutTs === null) {
    return true;
  }

  return checkOutTs > periodFromTs;
};

const effectiveStatus = (invoice) => {
  if (invoice.status === 'paid') {
    return 'paid';
  }

  if (invoice.status === 'partial') {
    if (Number(invoice.outstanding_amount || 0) <= 0) {
      return 'paid';
    }
  }

  const due = new Date(invoice.due_date);
  const now = new Date();

  if (Number(invoice.outstanding_amount || 0) > 0 && due.getTime() < now.getTime()) {
    return 'overdue';
  }

  if (invoice.status === 'partial') {
    return 'partial';
  }

  return 'pending';
};

const buildInvoiceNumber = (period, index) => {
  const compact = period.replace('-', '');
  return `INV-${compact}-${String(index + 1).padStart(4, '0')}`;
};

const normalizeInvoiceBreakup = (invoice) => {
  const rentAmount = Number.isFinite(Number(invoice.rent_amount)) ? Number(invoice.rent_amount) : 0;
  const electricityAmount = Number.isFinite(Number(invoice.electricity_amount))
    ? Number(invoice.electricity_amount)
    : 0;
  const verificationAmount = Number.isFinite(Number(invoice.verification_amount))
    ? Number(invoice.verification_amount)
    : 0;
  const verificationPaidAmount = Number.isFinite(Number(invoice.verification_paid_amount))
    ? Number(invoice.verification_paid_amount)
    : 0;
  const securityDepositAmount = Number.isFinite(Number(invoice.security_deposit_amount))
    ? Number(invoice.security_deposit_amount)
    : 0;
  const securityDepositPaidAmount = Number.isFinite(Number(invoice.security_deposit_paid_amount))
    ? Number(invoice.security_deposit_paid_amount)
    : 0;
  const computedTotal = Number((rentAmount + electricityAmount + verificationAmount + securityDepositAmount).toFixed(2));
  const amount = Number.isFinite(Number(invoice.amount)) && Number(invoice.amount) > 0
    ? Number(invoice.amount)
    : computedTotal;
  const paymentHistory = Array.isArray(invoice.payment_history)
    ? invoice.payment_history
        .map((entry) => ({
          id: String(entry?.id || uuidv4()),
          amount: Number(Number(entry?.amount || 0).toFixed(2)),
          paid_total: Number(Number(entry?.paid_total || 0).toFixed(2)),
          paid_at: entry?.paid_at || new Date(),
          method: String(entry?.method || 'cash'),
          note: String(entry?.note || ''),
          created_by_admin_id: String(entry?.created_by_admin_id || ''),
          created_by_name: String(entry?.created_by_name || '')
        }))
        .filter((entry) => Number.isFinite(entry.amount) && entry.amount > 0)
    : [];

  return {
    ...invoice,
    invoice_type: invoice.invoice_type || 'rent',
    rent_amount: Number(rentAmount.toFixed(2)),
    electricity_amount: Number(Math.max(electricityAmount, 0).toFixed(2)),
    verification_amount: Number(Math.max(verificationAmount, 0).toFixed(2)),
    verification_paid_amount: Number(Math.max(verificationPaidAmount, 0).toFixed(2)),
    security_deposit_amount: Number(securityDepositAmount.toFixed(2)),
    security_deposit_paid_amount: Number(securityDepositPaidAmount.toFixed(2)),
    payment_history: paymentHistory,
    amount: Number(amount.toFixed(2))
  };
};

const syncFirstInvoiceSettlement = async ({ ownerAccountId, actorId, invoice }) => {
  if (!invoice?.is_first_invoice) {
    return;
  }

  const tenant = await getTenantById(invoice.tenant_id, ownerAccountId);
  if (!tenant) {
    return;
  }

  const allInvoices = await getInvoices(ownerAccountId);
  const tenantFirstInvoices = allInvoices
    .filter((item) => item.tenant_id === tenant.id && item.is_first_invoice)
    .map(normalizeInvoiceBreakup);

  if (!tenantFirstInvoices.length) {
    return;
  }

  const totalOutstanding = tenantFirstInvoices.reduce(
    (sum, item) => sum + Number(item.outstanding_amount || 0),
    0
  );

  const isCheckInPaid = Number(totalOutstanding.toFixed(2)) <= 0;
  await updateTenant(tenant.id, ownerAccountId, {
    check_in_payment_status: isCheckInPaid ? 'paid' : 'pending'
  });

  const securityDepositInvoices = tenantFirstInvoices.filter((item) =>
    Number(item.security_deposit_amount || 0) > 0 || item.invoice_type === 'security_deposit'
  );

  const securityDepositAmount = securityDepositInvoices.reduce(
    (sum, item) => sum + Number(item.security_deposit_amount || 0),
    0
  );

  if (!Number.isFinite(securityDepositAmount) || securityDepositAmount <= 0) {
    return;
  }

  const securityDepositPaidAmount = securityDepositInvoices.reduce(
    (sum, item) => sum + Number(item.security_deposit_paid_amount || 0),
    0
  );
  const collectedAmount = Number(Math.max(securityDepositPaidAmount, 0).toFixed(2));
  const refundableAmount = Number(Math.max(collectedAmount, 0).toFixed(2));
  const collectedDate = String(tenant.check_in_date || new Date().toISOString().slice(0, 10));
  const tenantName = String(tenant.name || '').trim();
  const roomNumber = String(tenant.room_number || '').trim();

  const existingRecords = await getSecurityDeposits(ownerAccountId);
  const existingRecord = existingRecords.find(
    (record) =>
      String(record.tenant_name || '').trim().toLowerCase() === tenantName.toLowerCase() &&
      String(record.room_number || '').trim().toLowerCase() === roomNumber.toLowerCase()
  );

  const nextStatus = refundableAmount > 0 ? 'held' : 'refunded';

  if (existingRecord) {
    await updateSecurityDepositById(existingRecord.id, ownerAccountId, {
      tenant_name: tenantName,
      room_number: roomNumber,
      total_amount: Number(securityDepositAmount.toFixed(2)),
      collected_amount: collectedAmount,
      refundable_amount: refundableAmount,
      status: nextStatus,
      collected_date: collectedDate,
      refund_date: nextStatus === 'refunded' ? (existingRecord.refund_date || new Date().toISOString().slice(0, 10)) : null,
      updated_at: new Date()
    });
    return;
  }

  await createSecurityDeposit({
    id: uuidv4(),
    owner_account_id: ownerAccountId,
    tenant_name: tenantName,
    room_number: roomNumber,
    total_amount: Number(securityDepositAmount.toFixed(2)),
    collected_amount: collectedAmount,
    refundable_amount: refundableAmount,
    status: nextStatus,
    collected_date: collectedDate,
    refund_date: nextStatus === 'refunded' ? new Date().toISOString().slice(0, 10) : null,
    notes: '',
    created_by: actorId || 'admin',
    created_at: new Date(),
    updated_at: null
  });
};

export const generateInvoicesHandler = async (req, res) => {
  try {
    const ownerAccountId = req.admin?.accountOwnerId || req.admin?.id || 'admin';
    const parsedPeriod = parsePeriod(req.body?.period);
    const parsedMonth = parsedPeriod ? parseMonth(parsedPeriod.value) : null;

    if (!parsedPeriod) {
      return res.status(400).json({ message: 'period must be in YYYY-MM format' });
    }

    const buildingId = req.body?.building_id || null;

    const [setting, buildings, tenants, existingInvoices] = await Promise.all([
      getOrCreateInvoiceSetting(ownerAccountId),
      getAllBuildings(ownerAccountId),
      getAllTenants(ownerAccountId),
      getInvoices(ownerAccountId, { period: parsedPeriod.value, building_id: buildingId || undefined })
    ]);

    const existingTenantIds = new Set(existingInvoices.map((invoice) => invoice.tenant_id));
    const buildingMap = new Map(buildings.map((building) => [building.id, building]));

    const dueDayDefault = Number(setting.due_day_of_month || 2);
    const daysInPeriodMonth = new Date(Date.UTC(parsedPeriod.year, parsedPeriod.month, 0)).getUTCDate();
    const periodFromTs = Date.UTC(parsedPeriod.year, parsedPeriod.month - 1, 1, 0, 0, 0, 0);
    const periodToTs = Date.UTC(parsedPeriod.year, parsedPeriod.month, 0, 23, 59, 59, 999);

    const eligibleTenants = tenants.filter((tenant) => {
      if (tenant.status !== 'active') {
        return false;
      }

      if (buildingId && tenant.building_id !== buildingId) {
        return false;
      }

      if (!isTenantActiveInPeriod(tenant, periodFromTs, periodToTs)) {
        return false;
      }

      return !existingTenantIds.has(tenant.id);
    });

    if (!eligibleTenants.length) {
      return res.status(200).json({
        message: 'No new invoices to generate',
        created_count: 0,
        invoices: []
      });
    }

    const electricityByTenant = new Map();

    if (parsedMonth) {
      const buildingIds = buildingId ? [buildingId] : buildings.map((item) => item.id);

      for (const id of buildingIds) {
        const building = buildingMap.get(id);
        if (!building) {
          continue;
        }

        const rooms = await getRoomsByBuildingId(id, ownerAccountId);
        if (!rooms.length) {
          continue;
        }

        const readingsInMonth = await getReadingsForBuildingAndRange(
          id,
          ownerAccountId,
          parsedMonth.start,
          parsedMonth.end
        );

        for (const room of rooms) {
          const roomReadings = readingsInMonth.filter((reading) => reading.room_number === room.room_number);
          const [baselineReading, monthEndReading] = await Promise.all([
            getLatestReadingBeforeDate(id, room.room_number, ownerAccountId, parsedMonth.start),
            getMonthEndReadingForRange(id, room.room_number, ownerAccountId, parsedMonth.start, parsedMonth.end)
          ]);

          const tenantIntervals = buildTenantIntervals(tenants, id, room.room_number);
          const summary = buildRoomSummary({
            room,
            buildingId: id,
            monthStart: parsedMonth.start,
            monthEnd: parsedMonth.end,
            rate: Number(building.electricity_rate || 0),
            roomReadings,
            baselineReading,
            monthEndReading,
            tenantIntervals
          });

          if (summary.status !== 'ok') {
            continue;
          }

          summary.allocations.forEach((allocation) => {
            if (!allocation || !allocation.tenant_id) {
              return;
            }
            const current = Number(electricityByTenant.get(allocation.tenant_id) || 0);
            electricityByTenant.set(
              allocation.tenant_id,
              Number((current + Number(allocation.amount || 0)).toFixed(2))
            );
          });
        }
      }
    }

    const records = eligibleTenants.map((tenant, index) => {
      const rentAmount = Number(tenant.rent || 0);
      const electricityAmount = Number(electricityByTenant.get(tenant.id) || 0);
      const amount = Number((rentAmount + electricityAmount).toFixed(2));
      const building = buildingMap.get(tenant.building_id);
      const checkInDate = new Date(tenant.check_in_date);
      const checkInDay = Number.isNaN(checkInDate.getTime()) ? dueDayDefault : checkInDate.getUTCDate();
      const dueDay = Math.min(Math.max(checkInDay, 1), daysInPeriodMonth);
      const dueDate = new Date(Date.UTC(parsedPeriod.year, parsedPeriod.month - 1, dueDay, 0, 0, 0, 0));

      return {
        id: uuidv4(),
        owner_account_id: ownerAccountId,
        invoice_number: buildInvoiceNumber(parsedPeriod.value, existingInvoices.length + index),
        tenant_id: tenant.id,
        tenant_name: tenant.name,
        building_id: tenant.building_id,
        building_name: building?.name || 'Unknown',
        room_number: tenant.room_number,
        invoice_type: 'rent',
        period: parsedPeriod.value,
        rent_amount: rentAmount,
        electricity_amount: electricityAmount,
        amount,
        paid_amount: 0,
        outstanding_amount: amount,
        due_date: dueDate,
        status: 'pending',
        created_at: new Date(),
        updated_at: null
      };
    });

    const created = (await createManyInvoices(records)).map(normalizeInvoiceBreakup);

    return res.status(201).json({
      message: 'Invoices generated successfully',
      created_count: created.length,
      invoices: created
    });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to generate invoices', error: error.message });
  }
};

export const getInvoicesHandler = async (req, res) => {
  try {
    const ownerAccountId = req.admin?.accountOwnerId || req.admin?.id || 'admin';
    const period = req.query.period ? String(req.query.period) : undefined;
    const buildingId = req.query.building_id ? String(req.query.building_id) : undefined;
    const search = String(req.query.search || '').trim().toLowerCase();
    const statusFilter = String(req.query.status || 'all').toLowerCase();
    const page = Math.max(Number(req.query.page || 1), 1);
    const limit = Math.max(Number(req.query.limit || 10), 1);

    const invoices = await getInvoices(ownerAccountId, {
      period,
      building_id: buildingId
    });

    let filtered = invoices
      .map((invoice) => ({
        ...normalizeInvoiceBreakup(invoice),
        effective_status: effectiveStatus(invoice)
      }))
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    if (search) {
      filtered = filtered.filter((invoice) => {
        const invoiceNumber = String(invoice.invoice_number || '').toLowerCase();
        const tenantName = String(invoice.tenant_name || '').toLowerCase();
        return invoiceNumber.includes(search) || tenantName.includes(search);
      });
    }

    if (statusFilter && statusFilter !== 'all') {
      filtered = filtered.filter((invoice) => invoice.effective_status === statusFilter);
    }

    const total = filtered.length;
    const totalPages = Math.max(Math.ceil(total / limit), 1);
    const safePage = Math.min(page, totalPages);
    const start = (safePage - 1) * limit;
    const items = filtered.slice(start, start + limit);

    const summary = {
      total_invoice: filtered.length,
      pending: filtered.filter((invoice) => invoice.effective_status === 'pending').length,
      paid: filtered.filter((invoice) => invoice.effective_status === 'paid').length,
      overdue: filtered.filter((invoice) => invoice.effective_status === 'overdue').length
    };

    return res.status(200).json({
      items,
      summary,
      pagination: {
        page: safePage,
        limit,
        total,
        totalPages,
        hasNextPage: safePage < totalPages,
        hasPrevPage: safePage > 1
      }
    });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to fetch invoices', error: error.message });
  }
};

export const updateInvoiceStatusHandler = async (req, res) => {
  try {
    const ownerAccountId = req.admin?.accountOwnerId || req.admin?.id || 'admin';
    const invoiceId = req.params.id;
    const status = String(req.body?.status || '').toLowerCase();
    const rawPaidAmount = Number(req.body?.paid_amount || 0);

    if (!invoiceId) {
      return res.status(400).json({ message: 'Invoice id is required' });
    }

    if (!['pending', 'paid', 'partial'].includes(status)) {
      return res.status(400).json({ message: 'status must be one of pending, paid, partial' });
    }

    const invoice = await getInvoiceById(invoiceId, ownerAccountId);
    if (!invoice) {
      return res.status(404).json({ message: 'Invoice not found' });
    }

    const normalized = normalizeInvoiceBreakup(invoice);
    const amount = Number(normalized.amount || 0);
    const rentAmount = Number(normalized.rent_amount || 0);
    const electricityAmount = Number(normalized.electricity_amount || 0);
    const verificationAmount = Number(normalized.verification_amount || 0);
    const securityDepositAmount = Number(normalized.security_deposit_amount || 0);
    const currentPaidAmount = Number(normalized.paid_amount || 0);
    const currentHistory = Array.isArray(normalized.payment_history) ? normalized.payment_history : [];
    const paymentMethod = String(req.body?.payment_method || 'cash');
    const paymentNote = String(req.body?.payment_note || '');
    const paymentDateRaw = req.body?.payment_date;
    const parsedPaymentDate = paymentDateRaw ? new Date(paymentDateRaw) : new Date();
    const paymentDate = Number.isNaN(parsedPaymentDate.getTime()) ? new Date() : parsedPaymentDate;
    const actingAdmin = req.admin?.id ? await getAdminById(req.admin.id) : null;
    const createdByName = String(actingAdmin?.full_name || req.admin?.email || req.admin?.id || 'admin');
    const createdByAdminId = String(req.admin?.id || '');

    const appendPaymentHistory = (nextPaidAmount) => {
      const delta = Number((nextPaidAmount - currentPaidAmount).toFixed(2));
      if (!Number.isFinite(delta) || delta <= 0) {
        return currentHistory;
      }

      return [
        ...currentHistory,
        {
          id: uuidv4(),
          amount: delta,
          paid_total: Number(nextPaidAmount.toFixed(2)),
          paid_at: paymentDate,
          method: paymentMethod,
          note: paymentNote,
          created_by_admin_id: createdByAdminId,
          created_by_name: createdByName
        }
      ];
    };

    if (status === 'paid') {
      const nextPaidAmount = amount;
      const updated = await updateInvoiceById(invoiceId, ownerAccountId, {
        status: 'paid',
        paid_amount: nextPaidAmount,
        outstanding_amount: 0,
        verification_paid_amount: verificationAmount,
        security_deposit_paid_amount: securityDepositAmount,
        payment_history: appendPaymentHistory(nextPaidAmount)
      });

      await syncFirstInvoiceSettlement({
        ownerAccountId,
        actorId: req.admin?.id || 'admin',
        invoice: normalizeInvoiceBreakup(updated)
      });

      return res.status(200).json(updated);
    }

    if (status === 'partial') {
      if (!Number.isFinite(rawPaidAmount) || rawPaidAmount <= 0 || rawPaidAmount >= amount) {
        return res.status(400).json({ message: 'paid_amount must be greater than 0 and less than total amount' });
      }

      const nextPaidAmount = rawPaidAmount;
      const nonDepositAmount = Number((rentAmount + electricityAmount + verificationAmount).toFixed(2));
      const paidTowardsVerification = Math.max(nextPaidAmount - Number((rentAmount + electricityAmount).toFixed(2)), 0);
      const verificationPaid = Math.min(paidTowardsVerification, verificationAmount);
      const paidTowardsDeposit = Math.max(nextPaidAmount - nonDepositAmount, 0);
      const updated = await updateInvoiceById(invoiceId, ownerAccountId, {
        status: 'partial',
        paid_amount: nextPaidAmount,
        outstanding_amount: Number((amount - nextPaidAmount).toFixed(2)),
        verification_paid_amount: Number(verificationPaid.toFixed(2)),
        security_deposit_paid_amount: Number(Math.min(paidTowardsDeposit, securityDepositAmount).toFixed(2)),
        payment_history: appendPaymentHistory(nextPaidAmount)
      });

      await syncFirstInvoiceSettlement({
        ownerAccountId,
        actorId: req.admin?.id || 'admin',
        invoice: normalizeInvoiceBreakup(updated)
      });

      return res.status(200).json(updated);
    }

    const updated = await updateInvoiceById(invoiceId, ownerAccountId, {
      status: 'pending',
      paid_amount: 0,
      outstanding_amount: amount,
      verification_paid_amount: 0,
      security_deposit_paid_amount: 0
    });

    await syncFirstInvoiceSettlement({
      ownerAccountId,
      actorId: req.admin?.id || 'admin',
      invoice: normalizeInvoiceBreakup(updated)
    });

    return res.status(200).json(updated);
  } catch (error) {
    return res.status(500).json({ message: 'Failed to update invoice status', error: error.message });
  }
};

export const getInvoiceByIdHandler = async (req, res) => {
  try {
    const ownerAccountId = req.admin?.accountOwnerId || req.admin?.id || 'admin';
    const invoiceId = req.params.id;

    if (!invoiceId) {
      return res.status(400).json({ message: 'Invoice id is required' });
    }

    const invoice = await getInvoiceById(invoiceId, ownerAccountId);
    if (!invoice) {
      return res.status(404).json({ message: 'Invoice not found' });
    }

    return res.status(200).json({
      ...normalizeInvoiceBreakup(invoice),
      effective_status: effectiveStatus(invoice)
    });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to fetch invoice', error: error.message });
  }
};

export const updateInvoiceHandler = async (req, res) => {
  try {
    const ownerAccountId = req.admin?.accountOwnerId || req.admin?.id || 'admin';
    const invoiceId = req.params.id;

    if (!invoiceId) {
      return res.status(400).json({ message: 'Invoice id is required' });
    }

    const invoice = await getInvoiceById(invoiceId, ownerAccountId);
    if (!invoice) {
      return res.status(404).json({ message: 'Invoice not found' });
    }

    const currentInvoice = normalizeInvoiceBreakup(invoice);

    const nextRent =
      req.body?.rent_amount !== undefined ? Number(req.body.rent_amount) : Number(currentInvoice.rent_amount || 0);
    const nextElectricity =
      req.body?.electricity_amount !== undefined
        ? Number(req.body.electricity_amount)
        : Number(currentInvoice.electricity_amount || 0);

    if (!Number.isFinite(nextRent) || nextRent < 0) {
      return res.status(400).json({ message: 'rent_amount must be a valid non-negative number' });
    }

    if (!Number.isFinite(nextElectricity) || nextElectricity < 0) {
      return res.status(400).json({ message: 'electricity_amount must be a valid non-negative number' });
    }

    const nextVerification = Number(currentInvoice.verification_amount || 0);
    let nextVerificationPaid = Number(currentInvoice.verification_paid_amount || 0);
    const nextSecurityDeposit = Number(currentInvoice.security_deposit_amount || 0);
    let nextSecurityDepositPaid = Number(currentInvoice.security_deposit_paid_amount || 0);

    if (req.body?.verification_paid_amount !== undefined) {
      const verificationPaid = Number(req.body.verification_paid_amount);
      if (!Number.isFinite(verificationPaid) || verificationPaid < 0 || verificationPaid > nextVerification) {
        return res.status(400).json({ message: 'verification_paid_amount must be between 0 and verification_amount' });
      }
      nextVerificationPaid = verificationPaid;
    }

    if (req.body?.security_deposit_paid_amount !== undefined) {
      const depositPaid = Number(req.body.security_deposit_paid_amount);
      if (!Number.isFinite(depositPaid) || depositPaid < 0 || depositPaid > nextSecurityDeposit) {
        return res.status(400).json({ message: 'security_deposit_paid_amount must be between 0 and security_deposit_amount' });
      }
      nextSecurityDepositPaid = depositPaid;
    }

    const nextAmount = Number((nextRent + nextElectricity + nextVerification + nextSecurityDeposit).toFixed(2));
    let nextPaid = Number(currentInvoice.paid_amount || 0);

    if (req.body?.paid_amount !== undefined) {
      const paid = Number(req.body.paid_amount);
      if (!Number.isFinite(paid) || paid < 0 || paid > nextAmount) {
        return res.status(400).json({ message: 'paid_amount must be between 0 and total amount' });
      }
      nextPaid = paid;
    } else if (req.body?.security_deposit_paid_amount !== undefined || req.body?.verification_paid_amount !== undefined) {
      // If only paid breakup changed, adjust total paid accordingly.
      const oldSecurityDepositPaid = Number(currentInvoice.security_deposit_paid_amount || 0);
      const oldVerificationPaid = Number(currentInvoice.verification_paid_amount || 0);
      const difference = (nextSecurityDepositPaid - oldSecurityDepositPaid) + (nextVerificationPaid - oldVerificationPaid);
      nextPaid = Number(Math.max(0, nextPaid + difference).toFixed(2));
    }

    const requestedStatus = req.body?.status ? String(req.body.status).toLowerCase() : undefined;
    let nextStatus = requestedStatus || String(currentInvoice.status || 'pending');

    if (requestedStatus && !['pending', 'paid', 'partial'].includes(requestedStatus)) {
      return res.status(400).json({ message: 'status must be one of pending, paid, partial' });
    }

    if (nextStatus === 'paid') {
      nextPaid = nextAmount;
    }

    if (nextStatus === 'pending') {
      nextPaid = 0;
    }

    if (nextStatus === 'partial' && (nextPaid <= 0 || nextPaid >= nextAmount)) {
      return res.status(400).json({ message: 'For partial status, paid_amount must be greater than 0 and less than total amount' });
    }

    if (!requestedStatus) {
      if (nextPaid <= 0) {
        nextStatus = 'pending';
      } else if (nextPaid >= nextAmount) {
        nextStatus = 'paid';
      } else {
        nextStatus = 'partial';
      }
    }

    const hasExplicitSecurityDepositPaid = req.body?.security_deposit_paid_amount !== undefined;
    const hasExplicitVerificationPaid = req.body?.verification_paid_amount !== undefined;

    if (!hasExplicitSecurityDepositPaid || !hasExplicitVerificationPaid) {
      if (nextStatus === 'pending') {
        if (!hasExplicitVerificationPaid) {
          nextVerificationPaid = 0;
        }
        nextSecurityDepositPaid = 0;
      } else if (nextStatus === 'paid') {
        if (!hasExplicitVerificationPaid) {
          nextVerificationPaid = nextVerification;
        }
        nextSecurityDepositPaid = nextSecurityDeposit;
      } else {
        // For partial payments, treat rent + electricity first, then verification, then deposit.
        const nonVerificationAmount = Number((nextRent + nextElectricity).toFixed(2));
        if (!hasExplicitVerificationPaid) {
          const paidTowardsVerification = Math.max(nextPaid - nonVerificationAmount, 0);
          nextVerificationPaid = Math.min(paidTowardsVerification, nextVerification);
        }
        if (!hasExplicitSecurityDepositPaid) {
          const nonDepositAmount = Number((nextRent + nextElectricity + nextVerification).toFixed(2));
          const paidTowardsDeposit = Math.max(nextPaid - nonDepositAmount, 0);
          nextSecurityDepositPaid = Math.min(paidTowardsDeposit, nextSecurityDeposit);
        }
      }
    }

    const nextOutstanding = Number(Math.max(nextAmount - nextPaid, 0).toFixed(2));
    const dueDateRaw = req.body?.due_date;
    const updates = {
      rent_amount: Number(nextRent.toFixed(2)),
      electricity_amount: Number(nextElectricity.toFixed(2)),
      verification_paid_amount: Number(nextVerificationPaid.toFixed(2)),
      security_deposit_paid_amount: Number(nextSecurityDepositPaid.toFixed(2)),
      amount: nextAmount,
      paid_amount: Number(nextPaid.toFixed(2)),
      outstanding_amount: nextOutstanding,
      status: nextStatus
    };

    if (dueDateRaw !== undefined) {
      const dueDate = new Date(dueDateRaw);
      if (Number.isNaN(dueDate.getTime())) {
        return res.status(400).json({ message: 'due_date must be a valid date' });
      }
      updates.due_date = dueDate;
    }

    const updated = await updateInvoiceById(invoiceId, ownerAccountId, updates);
    const normalizedUpdated = normalizeInvoiceBreakup(updated);

    await syncFirstInvoiceSettlement({
      ownerAccountId,
      actorId: req.admin?.id || 'admin',
      invoice: normalizedUpdated
    });

    return res.status(200).json(normalizedUpdated);
  } catch (error) {
    return res.status(500).json({ message: 'Failed to update invoice', error: error.message });
  }
};

export const deleteInvoiceHandler = async (req, res) => {
  try {
    const ownerAccountId = req.admin?.accountOwnerId || req.admin?.id || 'admin';
    const invoiceId = req.params.id;

    if (!invoiceId) {
      return res.status(400).json({ message: 'Invoice id is required' });
    }

    const deleted = await deleteInvoiceById(invoiceId, ownerAccountId);
    if (!deleted) {
      return res.status(404).json({ message: 'Invoice not found' });
    }

    return res.status(200).json({ message: 'Invoice deleted successfully' });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to delete invoice', error: error.message });
  }
};

export const generateFirstInvoiceHandler = async (req, res) => {
  try {
    const ownerAccountId = req.admin?.accountOwnerId || req.admin?.id || 'admin';
    const tenantId = req.body?.tenant_id;

    if (!tenantId) {
      return res.status(400).json({ message: 'tenant_id is required' });
    }

    const [tenants, buildings, setting] = await Promise.all([
      getAllTenants(ownerAccountId),
      getAllBuildings(ownerAccountId),
      getOrCreateInvoiceSetting(ownerAccountId)
    ]);

    const tenant = tenants.find((t) => t.id === tenantId);
    if (!tenant) {
      return res.status(404).json({ message: 'Tenant not found' });
    }

    const building = buildings.find((b) => b.id === tenant.building_id);
    if (!building) {
      return res.status(404).json({ message: 'Building not found' });
    }

    // Use full monthly rent for the first invoice (no proration).
    const checkInDate = new Date(tenant.check_in_date);
    const currentYear = checkInDate.getUTCFullYear();
    const currentMonth = checkInDate.getUTCMonth();
    const fullMonthlyRent = Number(tenant.rent || 0);
    const verificationAmount = VERIFICATION_CHARGE;
    const securityDeposit = Number.isFinite(tenant.security_deposit_amount) ? Number(tenant.security_deposit_amount) : 0;
    
    // Create period string for current month
    const periodMonth = String(currentMonth + 1).padStart(2, '0');
    const period = `${currentYear}-${periodMonth}`;
    
    // Set due date
    const checkInDay = Number.isNaN(checkInDate.getTime())
      ? Number(setting.due_day_of_month || 2)
      : checkInDate.getUTCDate();
    const dueDate = new Date(Date.UTC(currentYear, currentMonth, checkInDay, 0, 0, 0, 0));
    
    // Get existing invoices for invoice number and duplicate checks
    const existingInvoices = await getInvoices(ownerAccountId, { period });
    const existingFirstInvoices = existingInvoices.filter(
      (item) => item.tenant_id === tenant.id && item.is_first_invoice
    );

    if (existingFirstInvoices.length > 0) {
      return res.status(400).json({
        message: 'First invoice already generated for this tenant in the selected period'
      });
    }

    const totalAmount = Number((fullMonthlyRent + verificationAmount + securityDeposit).toFixed(2));

    if (totalAmount <= 0) {
      return res.status(400).json({
        message: 'Unable to generate first invoice because both rent and security deposit are zero'
      });
    }

    const record = {
      id: uuidv4(),
      owner_account_id: ownerAccountId,
      invoice_number: buildInvoiceNumber(period, existingInvoices.length),
      tenant_id: tenant.id,
      tenant_name: tenant.name,
      building_id: tenant.building_id,
      building_name: building.name,
      room_number: tenant.room_number,
      invoice_type: 'rent',
      period,
      rent_amount: Number(fullMonthlyRent.toFixed(2)),
      electricity_amount: 0,
      verification_amount: Number(verificationAmount.toFixed(2)),
      verification_paid_amount: 0,
      security_deposit_amount: Number(securityDeposit.toFixed(2)),
      security_deposit_paid_amount: 0,
      amount: totalAmount,
      paid_amount: 0,
      outstanding_amount: totalAmount,
      due_date: dueDate,
      status: 'pending',
      is_first_invoice: true,
      created_at: new Date(),
      updated_at: null
    };

    const created = await createManyInvoices([record]);
    const normalized = created.map(normalizeInvoiceBreakup);

    return res.status(201).json({
      message: 'First invoice generated successfully',
      invoice: normalized[0],
      invoices: normalized
    });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to generate first invoice', error: error.message });
  }
};

export const getInvoiceSettingsHandler = async (req, res) => {
  try {
    const ownerAccountId = req.admin?.accountOwnerId || req.admin?.id || 'admin';
    const setting = await getOrCreateInvoiceSetting(ownerAccountId);
    return res.status(200).json(setting);
  } catch (error) {
    return res.status(500).json({ message: 'Failed to fetch invoice settings', error: error.message });
  }
};

export const updateInvoiceSettingsHandler = async (req, res) => {
  try {
    const ownerAccountId = req.admin?.accountOwnerId || req.admin?.id || 'admin';
    const dueDay = Number(req.body?.due_day_of_month);

    if (!Number.isInteger(dueDay) || dueDay < 1 || dueDay > 28) {
      return res.status(400).json({ message: 'due_day_of_month must be an integer between 1 and 28' });
    }

    const updated = await updateInvoiceSetting(ownerAccountId, dueDay);
    return res.status(200).json(updated);
  } catch (error) {
    return res.status(500).json({ message: 'Failed to update invoice settings', error: error.message });
  }
};
