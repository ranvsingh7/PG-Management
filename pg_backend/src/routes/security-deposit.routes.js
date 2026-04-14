import { Router } from 'express';
import { authenticateAdmin } from '../middleware/auth.middleware.js';
import {
  createSecurityDepositHandler,
  deleteSecurityDepositHandler,
  getSecurityDepositsHandler,
  updateSecurityDepositHandler
} from '../controllers/security-deposit.controller.js';

const router = Router();

router.use(authenticateAdmin);

router.get('/', getSecurityDepositsHandler);
router.post('/', createSecurityDepositHandler);
router.put('/:id', updateSecurityDepositHandler);
router.delete('/:id', deleteSecurityDepositHandler);

export default router;
