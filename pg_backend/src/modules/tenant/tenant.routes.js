import { Router } from 'express';
import {
  createTenantHandler,
  deleteTenantHandler,
  getAllTenantsHandler,
  getTenantByIdHandler,
  updateTenantHandler
} from './tenant.controller.js';
import { authenticateAdmin } from '../../middleware/auth.middleware.js';

const router = Router();

router.use(authenticateAdmin);

router.post('/', createTenantHandler);
router.get('/', getAllTenantsHandler);
router.get('/:id', getTenantByIdHandler);
router.put('/:id', updateTenantHandler);
router.delete('/:id', deleteTenantHandler);

export default router;

