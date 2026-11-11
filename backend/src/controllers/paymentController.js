import crypto from "crypto";
import Razorpay from "razorpay";
import Transaction from "../models/Transaction.js";
import Subscription from "../models/Subscription.js";
import CancellationRequest from "../models/CancellationRequest.js";
import Plan from "../models/Plan.js";
import User from "../models/User.js";
import {
  activatePurchasedSubscription,
  findActivePurchasedSubscription,
  revokeSubscription,
  getEffectiveEntitlement,
} from "../services/subscriptionService.js";
import { calculateRefund } from "../services/refundService.js";
import { logAudit, logSecurityEvent } from "../utils/auditLog.js";
import { createAlert } from "../services/alertService.js";
import {
  sendSubscriptionWelcomeEmail,
  sendSubscriptionCancellationEmail,
} from "../services/subscriptionEmailService.js";
import { ApiError } from "../utils/ApiError.js";
import asyncHandler from "../utils/asyncHandler.js";
import logger from "../config/logger.js";

let razorpayClient = null;

const getRazorpay = () => {
  if (!razorpayClient) {
    razorpayClient = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });
  }
  return razorpayClient;
};
const reqMeta = (req) => ({
  ip: req.ip,
  userAgent: req.get("User-Agent") || undefined,
});

/**
 * POST /api/v1/payments/order
 * Create a Razorpay order for a plan. Amount computed entirely on backend.
 */
export const createOrder = asyncHandler(async (req, res) => {
  const { planId } = req.body;

  if (!planId) {
    throw new ApiError("Plan ID is required", 400);
  }

  const plan = await Plan.findById(planId);
  if (!plan || !plan.isActive || !plan.isPublic) {
    throw new ApiError("Invalid or inactive plan", 404);
  }

  if (plan.name === "free") {
    throw new ApiError("Free plan does not require payment", 400);
  }

  const amount = Math.round(plan.price * 100); // amount in smallest currency unit (paise)

  const order = await getRazorpay().orders.create({
    amount,
    currency: plan.currency || "INR",
    receipt: `vocab_${req.user.userId}_${Date.now()}`,
    notes: {
      userId: req.user.userId.toString(),
      planId: plan._id.toString(),
    },
  });

  const transaction = await Transaction.create({
    userId: req.user.userId,
    razorpayOrderId: order.id,
    amount,
    currency: plan.currency || "INR",
    status: "created",
    planId: plan._id,
    planSnapshot: {
      name: plan.name,
      displayName: plan.displayName,
      aiCalls: plan.aiCalls,
      durationDays: plan.durationDays,
      price: plan.price,
      currency: plan.currency,
    },
    description: `Subscription to ${plan.displayName}`,
  });

  logger.info(`Razorpay order created: ${order.id} for user ${req.user.userId}`);

  return res.status(200).json({
    success: true,
    data: {
      orderId: order.id,
      amount,
      currency: order.currency,
      keyId: process.env.RAZORPAY_KEY_ID,
      plan: {
        id: plan._id,
        displayName: plan.displayName,
        price: plan.price,
        durationDays: plan.durationDays,
      },
    },
  });
});

/**
 * POST /api/v1/payments/verify
 * Verify Razorpay payment signature and activate subscription.
 */
export const verifyPayment = asyncHandler(async (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } =
    req.body;

  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    throw new ApiError("Missing payment verification fields", 400);
  }

  const transaction = await Transaction.findOne({
    razorpayOrderId: razorpay_order_id,
  });

  if (!transaction) {
    throw new ApiError("Transaction not found", 404);
  }

  // Idempotency: already processed
  if (transaction.status === "paid") {
    return res.status(200).json({
      success: true,
      message: "Payment already processed",
      data: transaction,
    });
  }

  // Verify signature
  const body = razorpay_order_id + "|" + razorpay_payment_id;
  const expectedSignature = crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
    .update(body)
    .digest("hex");

  if (expectedSignature !== razorpay_signature) {
    transaction.status = "failed";
    await transaction.save();

    await logSecurityEvent({
      type: "payment_verification_failure",
      severity: "WARNING",
      userId: transaction.userId,
      metadata: {
        orderId: razorpay_order_id,
        paymentId: razorpay_payment_id,
        reason: "signature_mismatch",
      },
      ...reqMeta(req),
    });

    throw new ApiError("Payment verification failed", 400);
  }

  const plan = await Plan.findById(transaction.planId);
  if (!plan) {
    throw new ApiError("Plan not found", 404);
  }

  // Update transaction
  transaction.razorpayPaymentId = razorpay_payment_id;
  transaction.razorpaySignature = razorpay_signature;
  transaction.status = "paid";
  transaction.paidAt = new Date();
  await transaction.save();

  const subscription = await activatePurchasedSubscription({
    userId: transaction.userId,
    plan,
    paymentId: razorpay_payment_id,
  });

  // Link transaction to subscription
  transaction.subscriptionId = subscription._id;
  await transaction.save();

  // Claim the welcome email atomically: only one of verifyPayment/webhook can send it
  const claimedTransaction = await Transaction.findOneAndUpdate(
    { _id: transaction._id, welcomeEmailSentAt: null },
    { $set: { welcomeEmailSentAt: new Date() } },
    { returnDocument: "after" }
  );

  if (claimedTransaction) {
    try {
      const user = await User.findById(transaction.userId);
      await sendSubscriptionWelcomeEmail({
        user,
        plan,
        transaction,
        subscription,
      });
      logger.info(
        `Welcome email sent for subscription ${subscription._id} to user ${user.email}`
      );
    } catch (error) {
      // Reset claim so a retry is possible
      claimedTransaction.welcomeEmailSentAt = null;
      await claimedTransaction.save();
      logger.error(
        `Welcome email failed for subscription ${subscription._id}: ${error.message}`
      );
      await logSecurityEvent({
        type: "welcome_email_failed",
        severity: "WARNING",
        category: "payment",
        title: "Welcome email failed",
        description: `Welcome email failed for subscription ${subscription._id}: ${error.message}`,
        userId: transaction.userId,
        userEmail: (await User.findById(transaction.userId)).email,
        metadata: {
          orderId: razorpay_order_id,
          paymentId: razorpay_payment_id,
          subscriptionId: subscription._id,
        },
        ...reqMeta(req),
        notify: false,
      });
    }
  }

  await logAudit({
    actorId: transaction.userId,
    actorEmail: (await User.findById(transaction.userId)).email,
    actorRole: (await User.findById(transaction.userId)).role,
    action: "payment_activated_subscription",
    targetType: "Subscription",
    targetId: subscription._id,
    targetEmail: (await User.findById(transaction.userId)).email,
    metadata: {
      orderId: razorpay_order_id,
      paymentId: razorpay_payment_id,
      planId: plan._id,
      amount: transaction.amount,
      type: "purchase",
    },
    ...reqMeta(req),
  });

  logger.info(
    `Payment verified and subscription activated: ${razorpay_payment_id} for user ${transaction.userId}`
  );

  return res.status(200).json({
    success: true,
    message: "Payment verified and subscription activated",
    data: {
      transaction,
      subscription,
      plan,
    },
  });
});

/**
 * POST /api/v1/subscriptions/cancel
 * Cancel a paid subscription and refund via Razorpay.
 * Auth required, rate limited like authLimiter.
 */
export const cancelSubscription = asyncHandler(async (req, res) => {
  const { reason, expectedRefundAmount, acceptedTerms } = req.body;
  const userId = req.user.userId;

  // a) acceptedTerms must be true (validated by schema, but double-check here)
  if (acceptedTerms !== true) {
    throw new ApiError("You must accept the terms to cancel", 400);
  }

  // b) Load the active purchase subscription
  const subscription = await findActivePurchasedSubscription(userId);

  if (!subscription) {
    throw new ApiError("No active paid subscription found", 404);
  }

  // b) Look up the transaction through subscriptionId (set at activation), not by userId + planId + latest.
  //    Refuse if that transaction already has a refundId (already refunded).
  const transaction = await Transaction.findOne({
    userId,
    subscriptionId: subscription._id,
    status: "paid",
  });

  if (!transaction) {
    throw new ApiError("No paid transaction found for this subscription", 404);
  }

  if (transaction.refundId) {
    throw new ApiError("This subscription has already been refunded", 409);
  }

  // c) Recompute the refund on the server (never trust client amount)
  const now = new Date();
  const refundCalc = calculateRefund({ transaction, subscription, now });
  const expectedAmount = refundCalc.refundAmount;

  // c) If frontend amount differs from recomputed, return 409 with new preview
  if (
    expectedRefundAmount !== undefined &&
    expectedRefundAmount !== expectedAmount
  ) {
    return res.status(409).json({
      success: false,
      error: "Refund amount has changed. Please review and confirm again.",
      data: refundCalc,
    });
  }

  // d) Create the CancellationRequest (status "requested") with the snapshot
  //    and consent details before claiming the subscription.
  const cancellationRequest = await CancellationRequest.create({
    userId,
    subscriptionId: subscription._id,
    transactionId: transaction._id,
    status: "requested",
    reason: reason || null,
    refundSnapshot: {
      amountPaid: refundCalc.amountPaid,
      refundAmount: refundCalc.refundAmount,
      usedDays: refundCalc.usedDays,
      unusedDays: refundCalc.unusedDays,
      totalDays: refundCalc.totalDays,
      isFullRefundWindow: refundCalc.isFullRefundWindow,
      breakdownText: refundCalc.breakdownText,
      currency: refundCalc.currency,
    },
    policyVersion: "2026-11-v1",
    acceptedTerms: true,
    acceptedAt: new Date(),
    ip: req.ip,
    userAgent: req.get("User-Agent") || undefined,
  });

  // e) Atomically claim the subscription: active -> cancelled
  //    (409 "already cancelled" if findOneAndUpdate returns null)
  const claimedSubscription = await Subscription.findOneAndUpdate(
    {
      _id: subscription._id,
      userId,
      status: "active",
    },
    {
      $set: {
        status: "cancelled",
        cancelledAt: new Date(),
        cancellationReason: reason || "",
      },
    },
    { returnDocument: "after" }
  );

  if (!claimedSubscription) {
    return res.status(409).json({
      success: false,
      message: "Already cancelled",
    });
  }

  const refundAmount = refundCalc.refundAmount;
  let refundResult = null;

  // f) If refund > 0: call Razorpay inside its own try/catch
  if (refundAmount > 0) {
    try {
      const razorpay = getRazorpay();

      // 9. Send only documented Razorpay refund fields (amount in paise, speed, receipt, notes).
      //    No `currency` field — it is not a Razorpay refund parameter.
      const refund = await razorpay.payments.refund(
        transaction.razorpayPaymentId,
        {
          amount: refundAmount,
          speed: "normal",
          receipt: `cancel_${subscription._id}`,
          notes: {
            reason: reason || "",
            subscriptionId: subscription._id.toString(),
            userId: transaction.userId.toString(),
          },
        }
      );

      refundResult = {
        refundId: refund.id,
        amountPaise: refundAmount,
        currency: transaction.currency || "INR",
        status: "pending",
      };

      // Store refund info on transaction
      transaction.refundId = refund.id;
      transaction.refundAmount = refundAmount;
      transaction.refundStatus = "pending";
      transaction.refundedAt = new Date();
      transaction.refundReason = reason || "";

      // Set transaction status based on refund amount
      if (refundAmount >= transaction.amount) {
        transaction.status = "refunded";
      } else {
        // Partial refund - keep as "paid" but mark refund status
        transaction.status = "paid";
      }
      await transaction.save();

      // Update cancellation request to refund_initiated with the Razorpay refund id
      await CancellationRequest.findByIdAndUpdate(cancellationRequest._id, {
        status: "refund_initiated",
        razorpayRefundId: refund.id,
      });

      logger.info(
        `Razorpay refund created: ${refund.id} for subscription ${subscription._id}, amount ${refundAmount} paise`
      );
    } catch (razorpayError) {
      // 5. Roll back with a conditional update: only if still "cancelled"
      const rollbackResult = await Subscription.findOneAndUpdate(
        { _id: subscription._id, status: "cancelled" },
        {
          $set: {
            status: "active",
            cancelledAt: null,
            cancellationReason: null,
          },
        }
      );

      // Mark the cancellation request as rolled_back with the error message
      await CancellationRequest.findByIdAndUpdate(cancellationRequest._id, {
        status: "rolled_back",
        errorMessage: razorpayError.message,
      });

      logger.error(
        `Razorpay refund failed for subscription ${subscription._id}: ${razorpayError.message}. Rolled back: ${Boolean(rollbackResult)}`
      );

      return res.status(500).json({
        success: false,
        message: "Refund failed. Your plan is still active. Please try again later.",
      });
    }
  } else {
    // g) Refund is 0: no Razorpay call, mark as completed_no_refund
    refundResult = {
      refundId: null,
      amountPaise: 0,
      currency: transaction.currency || "INR",
      status: "completed_no_refund",
    };

    transaction.refundAmount = 0;
    transaction.refundStatus = "failed";
    transaction.refundedAt = new Date();
    transaction.refundReason = reason || "No refund (outside eligible window or no unused days)";
    await transaction.save();

    // Mark the cancellation request as completed_no_refund
    await CancellationRequest.findByIdAndUpdate(cancellationRequest._id, {
      status: "completed_no_refund",
    });

    logger.info(
      `Subscription cancelled with no refund (amount 0): ${subscription._id} for user ${userId}`
    );
  }

  // h) After money is settled: audit log, admin alert, customer email — each fire-and-safe.
  //    Never roll back and never return an error for these later steps.

  // h.1) Audit log (fire-and-safe)
  try {
    const user = await User.findById(transaction.userId);
    await logAudit({
      actorId: transaction.userId,
      actorEmail: user ? user.email : "",
      actorRole: user ? user.role : "",
      action: "subscription_cancelled_by_user",
      targetType: "Subscription",
      targetId: subscription._id,
      targetEmail: user ? user.email : "",
      metadata: {
        orderId: transaction.razorpayOrderId,
        paymentId: transaction.razorpayPaymentId,
        refundId: refundResult.refundId,
        refundAmount,
        planId: transaction.planId,
        type: "purchase",
      },
      ...reqMeta(req),
    });
  } catch (auditError) {
    logger.error(`Audit log failed for subscription cancellation: ${auditError.message}`);
  }

  // h.2) Admin alert via real createAlert (notify:true) — fire-and-safe
  try {
    const user = await User.findById(transaction.userId);
    const planDisplayName =
      transaction.planSnapshot && transaction.planSnapshot.displayName
        ? transaction.planSnapshot.displayName
        : "Unknown Plan";
    await createAlert({
      type: "subscription_cancelled",
      category: "payment",
      severity: refundAmount > 0 ? "WARNING" : "INFO",
      title: "Subscription cancelled",
      description:
        refundAmount > 0
          ? `Subscription cancelled and refund of ${refundAmount} ${transaction.currency} initiated for ${planDisplayName}`
          : `Subscription cancelled with no refund due for ${planDisplayName}`,
      userId: transaction.userId,
      userEmail: user ? user.email : "",
      ip: req.ip,
      userAgent: req.get("User-Agent") || undefined,
      metadata: {
        orderId: transaction.razorpayOrderId,
        paymentId: transaction.razorpayPaymentId,
        refundId: refundResult.refundId,
        refundAmount,
        refundStatus: refundResult.status,
        reason,
        planDisplayName,
      },
      notify: true,
    });
  } catch (alertError) {
    logger.error(`Admin alert failed for subscription cancellation: ${alertError.message}`);
  }

  // h.3) Customer cancellation email — fire-and-safe
  try {
    const user = await User.findById(transaction.userId);
    if (user) {
      const planDisplayName =
        transaction.planSnapshot && transaction.planSnapshot.displayName
          ? transaction.planSnapshot.displayName
          : "Unknown Plan";
      const plan = { displayName: planDisplayName };
      await sendSubscriptionCancellationEmail({
        user,
        plan,
        transaction,
        subscription: claimedSubscription,
        refundAmount,
        refundId: refundResult.refundId,
        refundStatus: refundResult.status,
      });
      logger.info(
        `Cancellation email sent for subscription ${subscription._id} to user ${user.email}`
      );
    }
  } catch (emailError) {
    logger.error(
      `Cancellation email failed for subscription ${subscription._id}: ${emailError.message}`
    );
  }

  // i) Return consistent response shape. All money values in PAISE (integers).
  return res.status(200).json({
    success: true,
    message:
      refundAmount > 0
        ? "Subscription cancelled and refund initiated"
        : "Subscription cancelled with no refund due",
    data: {
      subscription: claimedSubscription,
      accessEndedAt: claimedSubscription.cancelledAt,
      refund: refundResult,
    },
  });
});

/**
 * POST /api/v1/payments/webhook
 */
export const razorpayWebhook = asyncHandler(async (req, res) => {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  const shasum = crypto.createHmac("sha256", secret);
  shasum.update(JSON.stringify(req.body));
  const digest = shasum.digest("hex");

  if (digest !== req.headers["x-razorpay-signature"]) {
    await logSecurityEvent({
      type: "webhook_verification_failure",
      severity: "CRITICAL",
      metadata: {
        reason: "invalid_webhook_signature",
        path: req.originalUrl,
      },
      ...reqMeta(req),
    });
    throw new ApiError("Invalid webhook signature", 401);
  }

  const { event, payload } = req.body;
  const paymentEntity = payload?.payment?.entity;
  const orderEntity = payload?.order?.entity;

  logger.info(`Razorpay webhook: ${event}`);

  // Idempotency: respond 200 for all events; process only relevant ones.
  if (event === "payment.captured" || event === "order.paid") {
    const orderId = orderEntity?.id || paymentEntity?.order_id;
    const paymentId = paymentEntity?.id;

    if (!orderId) {
      return res.status(200).json({ success: true, received: true });
    }

    const transaction = await Transaction.findOne({
      razorpayOrderId: orderId,
    });

    if (!transaction) {
      return res.status(200).json({ success: true, received: true });
    }

    // Idempotency: skip if already paid
    if (transaction.status === "paid") {
      return res.status(200).json({ success: true, received: true });
    }

    // Update transaction with payment details if available
    if (paymentId) {
      transaction.razorpayPaymentId = paymentId;
      transaction.status = "paid";
      transaction.paidAt = new Date();
      if (paymentEntity?.signature) {
        transaction.razorpaySignature = paymentEntity.signature;
      }
      await transaction.save();

      const plan = await Plan.findById(transaction.planId);
      if (plan) {
        const user = await User.findById(transaction.userId);
        const subscription = await activatePurchasedSubscription({
          userId: transaction.userId,
          plan,
          paymentId,
        });
        transaction.subscriptionId = subscription._id;
        await transaction.save();

        // Claim the welcome email atomically (webhook-only activations also send it)
        const claimedTransaction = await Transaction.findOneAndUpdate(
          { _id: transaction._id, welcomeEmailSentAt: null },
          { $set: { welcomeEmailSentAt: new Date() } },
          { returnDocument: "after" }
        );

        if (claimedTransaction) {
          try {
            await sendSubscriptionWelcomeEmail({
              user,
              plan,
              transaction,
              subscription,
            });
            logger.info(
              `Welcome email sent via webhook for subscription ${subscription._id} to user ${user.email}`
            );
          } catch (emailError) {
            claimedTransaction.welcomeEmailSentAt = null;
            await claimedTransaction.save();
            logger.error(
              `Welcome email failed via webhook for subscription ${subscription._id}: ${emailError.message}`
            );
          }
        }

        await logAudit({
          actorId: transaction.userId,
          actorEmail: user.email,
          actorRole: user.role,
          action: "webhook_subscription_activated",
          targetType: "Subscription",
          targetId: subscription._id,
          targetEmail: user.email,
          metadata: {
            event,
            orderId,
            paymentId,
            planId: plan._id,
            amount: transaction.amount,
            type: "purchase",
          },
          ...reqMeta(req),
        });
      }
    }
  } else if (event === "payment.failed") {
    const orderId = orderEntity?.id || paymentEntity?.order_id;
    const transaction = await Transaction.findOne({
      razorpayOrderId: orderId,
    });

    if (transaction) {
      transaction.status = "failed";
      await transaction.save();

      await logSecurityEvent({
        type: "payment_failure",
        severity: "WARNING",
        userId: transaction.userId,
        metadata: { event, orderId, paymentId: paymentEntity?.id },
        ...reqMeta(req),
      });
    }
  } else if (event === "refund.processed" || event === "refund.failed") {
    const refundEntity = payload?.refund?.entity;
    if (!refundEntity) {
      return res.status(200).json({ success: true, received: true });
    }

    const refundId = refundEntity.id;
    const paymentId = refundEntity.payment_id;
    const refundStatus = event === "refund.processed" ? "processed" : "failed";
    const refundAmount = refundEntity.amount;

    let transaction = refundId
      ? await Transaction.findOne({ refundId })
      : null;
    if (!transaction && paymentId) {
      transaction = await Transaction.findOne({
        razorpayPaymentId: paymentId,
      });
    }

    if (!transaction) {
      return res.status(200).json({ success: true, received: true });
    }

    const previousRefundStatus = transaction.refundStatus;
    const effectiveRefundStatus =
      previousRefundStatus === "processed" ? "processed" : refundStatus;
    const stateChanged = previousRefundStatus !== effectiveRefundStatus;
    if (stateChanged) {
      transaction.refundStatus = effectiveRefundStatus;
      if (refundId) transaction.refundId = refundId;
      if (refundAmount !== undefined && refundAmount !== null) {
        transaction.refundAmount = refundAmount;
      }
      transaction.refundedAt = new Date();
      await transaction.save();
    }

    const cancellationRequest = await CancellationRequest.findOne({
      transactionId: transaction._id,
      status: { $in: ["approved", "completed"] },
      ...(refundId
        ? {
            $or: [
              { razorpayRefundId: refundId },
              { razorpayRefundId: null },
            ],
          }
        : {}),
    }).sort({ createdAt: -1 });

    if (cancellationRequest) {
      cancellationRequest.refundStatus = effectiveRefundStatus;
      cancellationRequest.refundUpdatedAt = new Date();
      if (refundId) cancellationRequest.razorpayRefundId = refundId;
      if (effectiveRefundStatus === "processed") {
        cancellationRequest.status = "completed";
        cancellationRequest.isOpen = false;
      } else if (cancellationRequest.status !== "completed") {
        cancellationRequest.isOpen = false;
      }
      await cancellationRequest.save();
    }

    const user = await User.findById(transaction.userId);
    const planDisplayName =
      transaction.planSnapshot && transaction.planSnapshot.displayName
        ? transaction.planSnapshot.displayName
        : "Unknown Plan";

    const shouldNotifyCustomer = cancellationRequest
      ? cancellationRequest.refundNotificationStatus !== effectiveRefundStatus
      : stateChanged;

    if (shouldNotifyCustomer && user) {
      try {
        const plan = { displayName: planDisplayName };
        const subscription = await Subscription.findById(
          transaction.subscriptionId
        );
        await sendSubscriptionCancellationEmail({
          user,
          plan,
          transaction,
          subscription,
          refundAmount: transaction.refundAmount || 0,
          refundId,
          refundStatus: effectiveRefundStatus,
        });
        if (cancellationRequest) {
          cancellationRequest.refundNotificationStatus = effectiveRefundStatus;
          cancellationRequest.refundNotificationSentAt = new Date();
          await cancellationRequest.save();
        }
        logger.info(
          `Refund ${effectiveRefundStatus} email sent for transaction ${transaction._id} to user ${user.email}`
        );
      } catch (emailError) {
        logger.error(
          `Refund ${effectiveRefundStatus} email failed for transaction ${transaction._id}: ${emailError.message}`
        );
      }
    }

    if (stateChanged) {
      await logAudit({
        actorId: transaction.userId,
        actorEmail: user ? user.email : "",
        actorRole: user ? user.role : "",
        action:
          effectiveRefundStatus === "processed"
            ? "webhook_refund_processed"
            : "webhook_refund_failed",
        targetType: cancellationRequest
          ? "CancellationRequest"
          : "Transaction",
        targetId: cancellationRequest?._id || transaction._id,
        targetEmail: user ? user.email : "",
        metadata: {
          event,
          orderId: transaction.razorpayOrderId,
          paymentId,
          refundId,
          refundAmount: transaction.refundAmount,
          cancellationRequestId: cancellationRequest?._id,
          type: "refund",
        },
        ...reqMeta(req),
      });
    }

    if (stateChanged && effectiveRefundStatus === "failed") {
      await logSecurityEvent({
        type: "refund_failed",
        severity: "WARNING",
        userId: transaction.userId,
        userEmail: user ? user.email : "",
        metadata: {
          event,
          orderId: transaction.razorpayOrderId,
          paymentId,
          refundId,
          refundAmount: transaction.refundAmount,
          cancellationRequestId: cancellationRequest?._id,
          type: "refund",
        },
        ...reqMeta(req),
      });
      await createAlert({
        type: "cancellation_refund_failed",
        category: "payment",
        severity: "WARNING",
        title: "Subscription refund failed",
        description: `Refund ${refundId || ""} for transaction ${transaction._id} failed.`,
        userId: transaction.userId,
        userEmail: user ? user.email : "",
        ...reqMeta(req),
        metadata: {
          transactionId: transaction._id.toString(),
          cancellationRequestId: cancellationRequest?._id?.toString(),
          refundId,
          refundAmount: transaction.refundAmount,
        },
        notify: false,
      });
    }
  }

  return res.status(200).json({ success: true, received: true });
});

/**
 * GET /api/v1/payments/history — user's payment history
 */
export const getPaymentHistory = asyncHandler(async (req, res) => {
  const transactions = await Transaction.find({ userId: req.user.userId })
    .sort({ createdAt: -1 })
    .lean();

  return res.status(200).json({
    success: true,
    count: transactions.length,
    data: transactions,
  });
});

/**
 * GET /api/v1/admin/payments — all payments (admin/super_admin)
 */
export const getAllPayments = asyncHandler(async (req, res) => {
  const transactions = await Transaction.find({})
    .sort({ createdAt: -1 })
    .lean();

  return res.status(200).json({
    success: true,
    count: transactions.length,
    data: transactions,
  });
});

export default { createOrder, verifyPayment, razorpayWebhook, getPaymentHistory, getAllPayments };
