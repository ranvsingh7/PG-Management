import { Router } from "express";
import { authenticateAdmin } from "../middleware/auth.middleware.js";
import { getElectricitySummaryHandler, upsertMonthEndReadingsHandler } from "../controllers/electricity.controller.js";

const router = Router();

router.use(authenticateAdmin);

router.get("/", getElectricitySummaryHandler);
router.post("/readings", upsertMonthEndReadingsHandler);

export default router;
