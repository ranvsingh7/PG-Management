import {
  getElectricitySummary,
  recordCheckInReading,
  recordMonthEndReading,
  resolveTenantForCheckInReading
} from './electricity.service.js';

export const getElectricitySummaryHandler = async (req, res) => {
  try {
    const ownerAccountId = req.admin?.accountOwnerId || req.admin?.id || 'admin';
    const buildingId = req.query.building_id ? String(req.query.building_id) : '';
    const period = req.query.period ? String(req.query.period) : '';

    const result = await getElectricitySummary({ ownerAccountId, buildingId, period });

    if (result?.error) {
      return res.status(400).json({ message: result.error });
    }

    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).json({ message: 'Failed to fetch electricity summary', error: error.message });
  }
};

export const createMonthEndReadingHandler = async (req, res) => {
  try {
    const ownerAccountId = req.admin?.accountOwnerId || req.admin?.id || 'admin';
    const buildingId = String(req.body?.building_id || '').trim();
    const roomNumber = String(req.body?.room_number || '').trim();
    const period = String(req.body?.period || '').trim();
    const readingValue = Number(req.body?.reading_value);
    const readingDate = req.body?.reading_date;
    const tenantId = req.body?.tenant_id ? String(req.body.tenant_id) : null;

    if (!buildingId || !roomNumber || !period) {
      return res.status(400).json({ message: 'building_id, room_number, and period are required' });
    }

    const result = await recordMonthEndReading({
      ownerAccountId,
      buildingId,
      roomNumber,
      tenantId,
      period,
      readingValue,
      readingDate,
      createdBy: req.admin?.id || 'admin'
    });

    if (result?.error) {
      return res.status(400).json({ message: result.error });
    }

    return res.status(201).json({ message: 'Reading recorded', record: result.record });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to record reading', error: error.message });
  }
};

export const createCheckInReadingHandler = async (req, res) => {
  try {
    const ownerAccountId = req.admin?.accountOwnerId || req.admin?.id || 'admin';
    const tenantId = String(req.body?.tenant_id || '').trim();
    const readingValue = Number(req.body?.reading_value);
    const readingDate = req.body?.reading_date;

    if (!tenantId) {
      return res.status(400).json({ message: 'tenant_id is required' });
    }

    if (!Number.isFinite(readingValue) || readingValue < 0) {
      return res.status(400).json({ message: 'reading_value must be a non-negative number' });
    }

    const tenant = await resolveTenantForCheckInReading({ ownerAccountId, tenantId });
    if (!tenant) {
      return res.status(404).json({ message: 'Tenant not found' });
    }

    const record = await recordCheckInReading({
      ownerAccountId,
      tenant,
      readingValue,
      readingDate,
      createdBy: req.admin?.id || 'admin'
    });

    return res.status(201).json({ message: 'Check-in reading recorded', record });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to record check-in reading', error: error.message });
  }
};

