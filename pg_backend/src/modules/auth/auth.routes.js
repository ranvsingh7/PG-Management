import { Router } from 'express';
import {
  createAdminBySuperAdminHandler,
  googleAuthHandler,
  listAdminsByOwnerHandler,
  loginHandler,
  meHandler,
  signupHandler
} from './auth.controller.js';
import { authenticateAdmin } from '../../middleware/auth.middleware.js';

const router = Router();

router.post('/signup', signupHandler);
router.post('/login', loginHandler);
router.post('/google', googleAuthHandler);
router.get('/me', authenticateAdmin, meHandler);
router.post('/admins', authenticateAdmin, createAdminBySuperAdminHandler);
router.get('/admins', authenticateAdmin, listAdminsByOwnerHandler);

export default router;

