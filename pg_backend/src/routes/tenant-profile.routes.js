import { Router } from 'express';
import { authenticateTenant } from '../middleware/tenant-auth.middleware.js';
import { getTenantProfileHandler, updateTenantProfileHandler } from '../controllers/tenant-profile.controller.js';

const router = Router();

router.use(authenticateTenant);
router.get('/', getTenantProfileHandler);
router.put('/', updateTenantProfileHandler);

export default router;
