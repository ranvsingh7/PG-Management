import { Router } from "express";
import { authenticateTenant } from "../middleware/tenant-auth.middleware.js";
import { getTenantElectricityHandler } from "../controllers/electricity.controller.js";

const router = Router();

router.use(authenticateTenant);
router.get("/", getTenantElectricityHandler);

export default router;
