import express from "express";
import rateLimit from "express-rate-limit";
import authMiddleware from "../middlewares/authMiddleware.js";
import {
  requireAdminOrAbove,
  requireSuperAdmin,
} from "../middlewares/roleMiddleware.js";
import { validate, schemas } from "../validation/schemas.js";
import {
  listAvailablePlans,
  getMyEntitlement,
  grantAccess,
  revokeAccess,
  getSubscriptionHistory,
  getCancelPreview,
  getMyCancellationRequest,
  submitCancellationRequest,
  savePlan,
  getCancellationRequests,
} from "../controllers/subscriptionController.js";

const router = express.Router();

// Auth-specific rate limiter (tighter than global 300/15min for auth endpoints).
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many attempts. Please try again later.",
  },
});

/** Public plan catalog — no auth required */
router.get("/plans", listAvailablePlans);

// All remaining subscription routes require authentication.
router.use(authMiddleware);

/** Current user's entitlement + usage */
router.get("/me", getMyEntitlement);

/** User's subscription history */
router.get("/history", getSubscriptionHistory);

/** Cancel preview — refund calculation (auth required) */
router.get("/cancel/preview", getCancelPreview);

/** Latest cancellation request belonging to the authenticated customer */
router.get("/cancel/request", getMyCancellationRequest);

/** Submit a cancellation request for Super Admin review */
router.post(
  "/cancel",
  authLimiter,
  validate(schemas.cancelSubscription),
  submitCancellationRequest
);

/** Existing payment history view; cancellation data is restricted to Super Admin. */
router.get(
  "/cancellation-requests",
  requireSuperAdmin,
  getCancellationRequests
);

/** Grant manual paid access (admin or super_admin) */
router.post(
  "/grant",
  requireAdminOrAbove,
  validate(schemas.grantAccess),
  grantAccess
);

/** Revoke a subscription (super_admin only) */
router.post(
  "/revoke/:id",
  requireSuperAdmin,
  validate(schemas.revokeAccess),
  revokeAccess
);

/** Create/update a plan (super_admin only) */
router.post(
  "/plans",
  requireSuperAdmin,
  validate(schemas.savePlan),
  savePlan
);

export default router;
