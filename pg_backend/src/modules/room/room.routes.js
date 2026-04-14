import { Router } from 'express';
import {
  createRoomHandler,
  deleteRoomHandler,
  getAllRoomsHandler,
  getRoomByIdHandler,
  updateRoomHandler
} from './room.controller.js';
import { authenticateAdmin } from '../../middleware/auth.middleware.js';

const router = Router();

router.use(authenticateAdmin);

router.post('/', createRoomHandler);
router.get('/', getAllRoomsHandler);
router.get('/:id', getRoomByIdHandler);
router.put('/:id', updateRoomHandler);
router.delete('/:id', deleteRoomHandler);

export default router;

