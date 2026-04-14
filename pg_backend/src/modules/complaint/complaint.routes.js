import { Router } from 'express';
import { authenticateAdmin } from '../../middleware/auth.middleware.js';
import {
  createComplaintHandler,
  deleteComplaintHandler,
  getComplaintsHandler,
  updateComplaintHandler
} from './complaint.controller.js';

const router = Router();

router.use(authenticateAdmin);

router.get('/', getComplaintsHandler);
router.post('/', createComplaintHandler);
router.put('/:id', updateComplaintHandler);
router.delete('/:id', deleteComplaintHandler);

export default router;

