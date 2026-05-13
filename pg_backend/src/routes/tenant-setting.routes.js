import { Router } from 'express';
import { authenticateTenant } from '../middleware/tenant-auth.middleware.js';
import { getTenantSettingHandler } from '../controllers/tenant-setting.controller.js';

const router = Router();

router.use(authenticateTenant);
router.get('/', getTenantSettingHandler);

export default router;
