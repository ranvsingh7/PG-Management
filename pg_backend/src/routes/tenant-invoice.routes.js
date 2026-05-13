import { Router } from 'express';
import { authenticateTenant } from '../middleware/tenant-auth.middleware.js';
import { getTenantInvoicesHandler } from '../controllers/tenant-invoice.controller.js';

const router = Router();

router.use(authenticateTenant);
router.get('/', getTenantInvoicesHandler);

export default router;
