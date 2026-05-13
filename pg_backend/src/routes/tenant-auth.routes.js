import { Router } from 'express';
import {
  tenantChangePasswordHandler,
  tenantLoginHandler,
  tenantMeHandler
} from '../controllers/tenant-auth.controller.js';
import { authenticateTenant } from '../middleware/tenant-auth.middleware.js';

const router = Router();

router.post('/login', tenantLoginHandler);
router.get('/me', authenticateTenant, tenantMeHandler);
router.post('/change-password', authenticateTenant, tenantChangePasswordHandler);

export default router;
