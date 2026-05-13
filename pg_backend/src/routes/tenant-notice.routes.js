import { Router } from 'express';
import { authenticateTenant } from '../middleware/tenant-auth.middleware.js';
import { createTenantNoticeHandler, getTenantNoticesHandler } from '../controllers/tenant-notice.controller.js';

const router = Router();

router.use(authenticateTenant);
router.get('/', getTenantNoticesHandler);
router.post('/', createTenantNoticeHandler);

export default router;
