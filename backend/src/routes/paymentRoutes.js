import express from "express";
import authMiddleware from "../middlewares/authMiddleware.js";
import {
  requireAdminOrAbove,
  requireSuperAdmin,
} from "../middlewares/roleMiddleware.js";
import { validate, schemas } from "../validation/schemas.js";
import {
  createOrder,
  verifyPayment,
  razorpayWebhook,
  getPaymentHistory,
  getAllPayments,
} from "../controllers/paymentController.js";

const router = express.Router();

// Webhook — no auth (Razorpay calls it directly), signature verified inside controller.
router.post("/webhook", razorpayWebhook);

// All other payment routes require authentication.
router.use(authMiddleware);

router.post("/order", validate(schemas.createOrder), createOrder);
router.post("/verify", verifyPayment);
router.get("/history", getPaymentHistory);

/** Admin: view all payments (admin or super_admin) */
router.get("/admin/all", requireAdminOrAbove, getAllPayments);

export default router;
