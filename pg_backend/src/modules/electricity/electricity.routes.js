import { Router } from 'express';
import { authenticateAdmin } from '../../middleware/auth.middleware.js';
import {
  createCheckInReadingHandler,
  createMonthEndReadingHandler,
  getElectricitySummaryHandler
} from './electricity.controller.js';

const router = Router();

router.use(authenticateAdmin);

router.get('/readings', getElectricitySummaryHandler);
router.post('/readings', createMonthEndReadingHandler);
router.post('/check-in', createCheckInReadingHandler);

export default router;

