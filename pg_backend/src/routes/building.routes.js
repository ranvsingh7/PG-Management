import { Router } from 'express';
import {
  createBuildingHandler,
  deleteBuildingHandler,
  getAllBuildingsHandler,
  getBuildingByIdHandler,
  updateBuildingHandler
} from '../controllers/building.controller.js';
import { authenticateAdmin } from '../middleware/auth.middleware.js';

const router = Router();

router.use(authenticateAdmin);

router.post('/', createBuildingHandler);
router.get('/', getAllBuildingsHandler);
router.get('/:id', getBuildingByIdHandler);
router.put('/:id', updateBuildingHandler);
router.delete('/:id', deleteBuildingHandler);

export default router;
