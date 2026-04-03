import express from "express";
import * as analyticsController from "../controllers/analytics.controller.js";
import { protect } from "../middlewares/auth.middleware.js";
import { restrictTo } from "../middlewares/role.middleware.js";
import { ROLES } from "../utils/constants.util.js";

const router = express.Router();

router.use(protect);

/**
 * @route   GET /api/v1/analytics/summary
 * @desc    Fetch total net balance and accumulated income/expenses
 * @access  Private (Admin, Analyst) - Viewer explicitly disallowed
 */
router.get(
  "/summary",
  restrictTo(ROLES.ADMIN, ROLES.ANALYST),
  analyticsController.getSummary
);

/**
 * @route   GET /api/v1/analytics/stats
 * @desc    Fetch category-wise sums and historical monthly trends
 * @access  Private (Admin Only) - Restricted exclusively due to data sensitivity 
 */
router.get(
  "/stats",
  restrictTo(ROLES.ADMIN),
  analyticsController.getStats
);

export default router;
