import { Router } from 'express';
import { authenticateAdmin } from '../middleware/auth.middleware.js';
import {
  createExpenseHandler,
  deleteExpenseHandler,
  getExpensesHandler,
  updateExpenseHandler
} from '../controllers/expense.controller.js';

const router = Router();

router.use(authenticateAdmin);

router.get('/', getExpensesHandler);
router.post('/', createExpenseHandler);
router.put('/:id', updateExpenseHandler);
router.delete('/:id', deleteExpenseHandler);

export default router;
