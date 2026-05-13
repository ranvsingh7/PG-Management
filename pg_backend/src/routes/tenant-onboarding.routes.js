import { Router } from 'express';
import { authenticateTenant } from '../middleware/tenant-auth.middleware.js';
import { completeTenantOnboardingHandler, getTenantOnboardingHandler } from '../controllers/tenant-onboarding.controller.js';

const router = Router();

router.use(authenticateTenant);
router.get('/', getTenantOnboardingHandler);
router.post('/complete', completeTenantOnboardingHandler);

export default router;
