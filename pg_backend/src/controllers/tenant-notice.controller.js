import { v4 as uuidv4 } from 'uuid';
import { createTenantNotice, getTenantNotices } from '../data/tenant-notice.store.js';

const isValidDateString = (value) => /^\d{4}-\d{2}-\d{2}$/.test(String(value || ''));

export const getTenantNoticesHandler = async (req, res) => {
  try {
    const tenantId = req.tenant?.id;
    const ownerAccountId = req.tenant?.ownerAccountId;

    if (!tenantId || !ownerAccountId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const notices = await getTenantNotices(tenantId, ownerAccountId);
    return res.status(200).json(notices);
  } catch (error) {
    return res.status(500).json({ message: 'Failed to fetch notices', error: error.message });
  }
};

export const createTenantNoticeHandler = async (req, res) => {
  try {
    const tenantId = req.tenant?.id;
    const ownerAccountId = req.tenant?.ownerAccountId;

    if (!tenantId || !ownerAccountId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const noticeDate = String(req.body?.notice_date || '').trim();
    const vacateDate = String(req.body?.vacate_date || '').trim();
    const reason = String(req.body?.reason || '').trim();

    if (!noticeDate || !vacateDate || !isValidDateString(noticeDate) || !isValidDateString(vacateDate)) {
      return res.status(400).json({ message: 'notice_date and vacate_date must be valid YYYY-MM-DD strings' });
    }

    const created = await createTenantNotice({
      id: uuidv4(),
      tenant_id: tenantId,
      owner_account_id: ownerAccountId,
      notice_date: noticeDate,
      vacate_date: vacateDate,
      reason,
      status: 'pending',
      created_at: new Date(),
      updated_at: null
    });

    return res.status(201).json(created);
  } catch (error) {
    return res.status(500).json({ message: 'Failed to submit notice', error: error.message });
  }
};
