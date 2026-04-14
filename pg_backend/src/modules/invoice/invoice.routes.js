import { Router } from 'express';
import { authenticateAdmin } from '../../middleware/auth.middleware.js';
import {
  deleteInvoiceHandler,
  generateFirstInvoiceHandler,
  generateInvoicesHandler,
  getInvoiceByIdHandler,
  getInvoicesHandler,
  getInvoiceSettingsHandler,
  updateInvoiceHandler,
  updateInvoiceSettingsHandler,
  updateInvoiceStatusHandler
} from './invoice.controller.js';

const router = Router();

router.use(authenticateAdmin);

router.get('/', getInvoicesHandler);
router.post('/generate', generateInvoicesHandler);
router.post('/first-invoice', generateFirstInvoiceHandler);
router.patch('/:id/status', updateInvoiceStatusHandler);
router.get('/settings', getInvoiceSettingsHandler);
router.put('/settings', updateInvoiceSettingsHandler);
router.get('/:id', getInvoiceByIdHandler);
router.put('/:id', updateInvoiceHandler);
router.delete('/:id', deleteInvoiceHandler);

export default router;

