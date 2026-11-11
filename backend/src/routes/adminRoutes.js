import express from "express";
import authMiddleware from "../middlewares/authMiddleware.js";
import {
  requireAdminOrAbove,
  requireSuperAdmin,
} from "../middlewares/roleMiddleware.js";
import { validate, schemas } from "../validation/schemas.js";
import {
  listUsers,
  listAdmins,
  createAdmin,
  changeUserRole,
  revokeAdmin,
  getAuditLogs,
  getSecurityEvents,
} from "../controllers/adminController.js";
import {
  listAllPlansAdmin,
  listAllSubscriptionsAdmin,
  listAIUsageStats,
  getSystemHealth,
} from "../controllers/subscriptionController.js";
import {
  approveCancellationRequest,
  listCancellationRequestsForReview,
  rejectCancellationRequest,
} from "../controllers/cancellationRequestController.js";

const router = express.Router();

// All admin routes require authentication.
router.use(authMiddleware);

/**
 * User management (admin or super_admin).
 */
router.get("/users", requireAdminOrAbove, listUsers);

/**
 * Admin management (super_admin only).
 */
router.get("/admins", requireSuperAdmin, listAdmins);
router.post(
  "/admins",
  requireSuperAdmin,
  validate(schemas.createAdmin),
  createAdmin
);

/**
 * Role change (super_admin only).
 */
router.patch(
  "/users/:id/role",
  requireSuperAdmin,
  validate(schemas.changeUserRole),
  changeUserRole
);

/**
 * Revoke admin (super_admin only).
 */
router.delete("/admins/:id", requireSuperAdmin, revokeAdmin);

/**
 * Audit logs (admin or super_admin).
 */
router.get("/audit-logs", requireAdminOrAbove, getAuditLogs);

/**
 * Security events (admin or super_admin).
 */
router.get("/security-events", requireAdminOrAbove, getSecurityEvents);

/**
 * Subscription plans management (admin or super_admin).
 */
router.get("/subscriptions/plans", requireAdminOrAbove, listAllPlansAdmin);

/**
 * All subscriptions across users (admin or super_admin).
 */
router.get("/subscriptions", requireAdminOrAbove, listAllSubscriptionsAdmin);

/**
 * AI usage stats across users (admin or super_admin).
 */
router.get("/ai-usage", requireAdminOrAbove, listAIUsageStats);

/**
 * System health stats (admin or super_admin).
 */
router.get("/system-health", requireAdminOrAbove, getSystemHealth);

/**
 * Cancellation requests and refund decisions (Super Admin only).
 */
router.get(
  "/cancellation-requests",
  requireSuperAdmin,
  listCancellationRequestsForReview
);
router.post(
  "/cancellation-requests/:id/approve",
  requireSuperAdmin,
  validate(schemas.reviewCancellationRequest),
  approveCancellationRequest
);
router.post(
  "/cancellation-requests/:id/reject",
  requireSuperAdmin,
  validate(schemas.reviewCancellationRequest),
  rejectCancellationRequest
);

export default router;
