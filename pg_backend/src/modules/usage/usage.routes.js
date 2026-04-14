import { Router } from 'express';
import { getUsageHandler } from './usage.controller.js';
import { authenticateAdmin } from '../../middleware/auth.middleware.js';

const router = Router();

router.get('/', authenticateAdmin, getUsageHandler);

export default router;

