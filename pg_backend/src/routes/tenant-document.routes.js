import { Router } from 'express';
import { authenticateTenant } from '../middleware/tenant-auth.middleware.js';
import { createTenantDocumentHandler, getTenantDocumentsHandler } from '../controllers/tenant-document.controller.js';

const router = Router();

router.use(authenticateTenant);
router.get('/', getTenantDocumentsHandler);
router.post('/', createTenantDocumentHandler);

export default router;
