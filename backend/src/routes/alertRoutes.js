import express from "express";
import authMiddleware from "../middlewares/authMiddleware.js";
import {
  requireAdminOrAbove,
  requireSuperAdmin,
} from "../middlewares/roleMiddleware.js";
import {
  listAlerts,
  createAlertManual,
  resolveAlert,
  getAlertStats,
} from "../controllers/alertController.js";

const router = express.Router();

// All alert routes require authentication.
router.use(authMiddleware);

/** List alert events (admin or super_admin) */
router.get("/", requireAdminOrAbove, listAlerts);

/** Alert statistics for dashboard (admin or super_admin) */
router.get("/stats", requireAdminOrAbove, getAlertStats);

/** Manually create an alert (admin or super_admin) */
router.post("/", requireAdminOrAbove, createAlertManual);

/** Resolve an alert (super_admin only) */
router.patch("/:id/resolve", requireSuperAdmin, resolveAlert);

export default router;
