import { Router } from 'express';
import { authenticateAdmin } from '../middleware/auth.middleware.js';
import { getSystemSettingHandler, updateSystemSettingHandler } from '../controllers/system-setting.controller.js';

const router = Router();

router.use(authenticateAdmin);

router.get('/', getSystemSettingHandler);
router.put('/', updateSystemSettingHandler);

export default router;
