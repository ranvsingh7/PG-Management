import { Router } from 'express';
import { authenticateAdmin } from '../middleware/auth.middleware.js';
import { getSettingHandler, updateSettingHandler } from '../controllers/setting.controller.js';

const router = Router();

router.use(authenticateAdmin);

router.get('/', getSettingHandler);
router.put('/', updateSettingHandler);

export default router;
