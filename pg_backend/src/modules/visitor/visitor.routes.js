import { Router } from 'express';
import { authenticateAdmin } from '../../middleware/auth.middleware.js';
import {
  createVisitorHandler,
  deleteVisitorHandler,
  getVisitorsHandler,
  updateVisitorHandler
} from './visitor.controller.js';

const router = Router();

router.use(authenticateAdmin);

router.get('/', getVisitorsHandler);
router.post('/', createVisitorHandler);
router.put('/:id', updateVisitorHandler);
router.delete('/:id', deleteVisitorHandler);

export default router;

