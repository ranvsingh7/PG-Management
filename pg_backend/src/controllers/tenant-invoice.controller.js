import { getInvoicesByTenant } from '../data/invoice.store.js';

export const getTenantInvoicesHandler = async (req, res) => {
  try {
    const tenantId = req.tenant?.id;
    const ownerAccountId = req.tenant?.ownerAccountId;

    if (!tenantId || !ownerAccountId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const invoices = await getInvoicesByTenant(ownerAccountId, tenantId);
    return res.status(200).json(invoices);
  } catch (error) {
    return res.status(500).json({ message: 'Failed to fetch invoices', error: error.message });
  }
};
