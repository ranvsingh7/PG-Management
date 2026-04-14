import { Router } from 'express';
import { authenticateAdmin } from '../middleware/auth.middleware.js';
import {
  createPendingApprovalHandler,
  deletePendingApprovalHandler,
  getPendingApprovalsHandler,
  updatePendingApprovalHandler
} from '../controllers/pending-approval.controller.js';

const router = Router();

router.use(authenticateAdmin);

router.get('/', getPendingApprovalsHandler);
router.post('/', createPendingApprovalHandler);
router.put('/:id', updatePendingApprovalHandler);
router.delete('/:id', deletePendingApprovalHandler);

export default router;
