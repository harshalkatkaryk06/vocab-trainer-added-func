import {
  listPlans,
  getPlanById,
  upsertPlan,
  getEffectiveEntitlement,
  grantManualAccess,
  revokeSubscription,
  getUserSubscriptions,
  getCurrentUsage,
  findActivePurchasedSubscription,
} from "../services/subscriptionService.js";
import { calculateRefund } from "../services/refundService.js";
import User from "../models/User.js";
import Subscription from "../models/Subscription.js";
import Transaction from "../models/Transaction.js";
import Plan from "../models/Plan.js";
import AIUsage from "../models/AIUsage.js";
import { ApiError } from "../utils/ApiError.js";
import asyncHandler from "../utils/asyncHandler.js";
import { logAudit, logSecurityEvent } from "../utils/auditLog.js";
import CancellationRequest from "../models/CancellationRequest.js";
import { createAlert } from "../services/alertService.js";
import {
  sendCancellationRequestAcknowledgment,
  sendCancellationRequestReviewNotice,
} from "../services/cancellationEmailService.js";
import logger from "../config/logger.js";

const reqMeta = (req) => ({
  ip: req.ip,
  userAgent: req.get("User-Agent") || undefined,
});

/** GET /api/v1/subscriptions/plans — list available plans */
export const listAvailablePlans = asyncHandler(async (req, res) => {
  const plans = await listPlans({ includeInactive: false });
  return res.status(200).json({ success: true, count: plans.length, data: plans });
});

/** GET /api/v1/subscriptions/me — current user's entitlement + usage */
export const getMyEntitlement = asyncHandler(async (req, res) => {
  const usage = await getCurrentUsage(req.user.userId);
  return res.status(200).json({ success: true, data: usage });
});

/** POST /api/v1/subscriptions/grant — grant manual paid access (admin/super_admin) */
export const grantAccess = asyncHandler(async (req, res) => {
  const { email, durationDays, planId } = req.body;

  if (!email || !durationDays) {
    throw new ApiError("Email and durationDays are required", 400);
  }

  const subscription = await grantManualAccess({
    email,
    durationDays: Number(durationDays),
    grantedById: req.user.userId,
    grantedByEmail: req.user.email,
    planId,
  });

  await logAudit({
    actorId: req.user.userId,
    actorEmail: req.user.email,
    actorRole: req.user.role,
    action: "subscription_granted",
    targetType: "Subscription",
    targetId: subscription._id,
    targetEmail: email,
    metadata: { durationDays, planId, type: "manual" },
    ...reqMeta(req),
  });

  await logSecurityEvent({
    type: "privilege_change",
    severity: "WARNING",
    userId: subscription.userId,
    userEmail: email,
    metadata: { action: "manual_access_granted", grantedBy: req.user.email, durationDays },
    ...reqMeta(req),
  });

  return res.status(200).json({
    success: true,
    message: "Paid access granted",
    data: subscription,
  });
});

/** POST /api/v1/subscriptions/revoke/:id — revoke a subscription (super_admin) */
export const revokeAccess = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { reason } = req.body;

  const subscription = await revokeSubscription(id, req.user.userId, reason);

  await logAudit({
    actorId: req.user.userId,
    actorEmail: req.user.email,
    actorRole: req.user.role,
    action: "subscription_revoked",
    targetType: "Subscription",
    targetId: subscription._id,
    targetEmail: subscription.userId,
    metadata: { reason, type: subscription.type },
    ...reqMeta(req),
  });

  await logSecurityEvent({
    type: "privilege_change",
    severity: "WARNING",
    userId: subscription.userId,
    metadata: { action: "subscription_revoked", revokedBy: req.user.email, reason },
    ...reqMeta(req),
  });

  return res.status(200).json({
    success: true,
    message: "Subscription revoked",
    data: subscription,
  });
});

/** GET /api/v1/subscriptions/history — user's subscription history */
export const getSubscriptionHistory = asyncHandler(async (req, res) => {
  const userId = req.user.userId;
  const history = await getUserSubscriptions(userId);
  return res.status(200).json({ success: true, count: history.length, data: history });
});

/** GET /api/v1/subscriptions/cancellation-requests — legacy admin payment view */
export const getCancellationRequests = asyncHandler(async (req, res) => {
  const requests = await CancellationRequest.find({})
    .sort({ createdAt: -1 })
    .lean();

  return res.status(200).json({
    success: true,
    count: requests.length,
    data: requests,
  });
});

/** GET /api/v1/subscriptions/cancel/preview — preview refund amount for cancellation */
export const getCancelPreview = asyncHandler(async (req, res) => {
  const userId = req.user.userId;

  // 1. Find the user's active purchase subscription
  const subscription = await findActivePurchasedSubscription(userId);

  if (!subscription) {
    throw new ApiError("No active paid subscription found", 404);
  }

  // 2. Find the associated paid transaction through subscriptionId (set at activation),
  //    not by userId + planId + latest — matches cancelSubscription lookup.
  const transaction = await Transaction.findOne({
    userId,
    subscriptionId: subscription._id,
    status: "paid",
  });

  if (!transaction) {
    throw new ApiError("No paid transaction found for this subscription", 404);
  }

  // 3. Calculate refund (pure function)
  const now = new Date();
  const refundCalc = calculateRefund({ transaction, subscription, now });
  const existingRequest = await CancellationRequest.findOne({
    userId,
    subscriptionId: subscription._id,
    isOpen: true,
  })
    .select("_id status isOpen createdAt")
    .lean();

  return res.status(200).json({
    success: true,
    data: {
      ...refundCalc,
      subscription: {
        startDate: subscription.startDate,
        expiryDate: subscription.expiryDate,
      },
      planSnapshot: transaction.planSnapshot || subscription.planSnapshot,
      existingRequest,
    },
  });
});

/** GET /api/v1/subscriptions/cancel/request — latest customer-owned request */
export const getMyCancellationRequest = asyncHandler(async (req, res) => {
  const request = await CancellationRequest.findOne({
    userId: req.user.userId,
  })
    .sort({ createdAt: -1 })
    .populate(
      "transactionId",
      "paidAt createdAt amount currency planSnapshot razorpayPaymentId refundId refundAmount refundStatus"
    )
    .populate("subscriptionId", "startDate expiryDate planSnapshot")
    .lean();
  const transaction =
    request?.transactionId && typeof request.transactionId === "object"
      ? request.transactionId
      : null;
  const purchasedAt =
    transaction?.paidAt ||
    request?.subscriptionId?.startDate ||
    transaction?.createdAt ||
    null;

  return res.status(200).json({
    success: true,
    data: request
      ? {
          _id: request._id,
          status: request.status,
          isOpen: request.isOpen,
          createdAt: request.createdAt,
          reviewedAt: request.reviewedAt,
          reason: request.reason,
          details: request.details,
          refundSnapshot: request.refundSnapshot,
          reviewerNote: request.reviewerNote,
          refundStatus: request.refundStatus,
          refundUpdatedAt: request.refundUpdatedAt,
          razorpayRefundId: request.razorpayRefundId,
          purchasedAt,
          planName:
            request.refundSnapshot?.planName ||
            transaction?.planSnapshot?.displayName ||
            request.subscriptionId?.planSnapshot?.displayName ||
            "Paid plan",
          amountPaid:
            request.refundSnapshot?.amountPaid ?? transaction?.amount ?? 0,
          expectedRefundAmount: request.refundSnapshot?.refundAmount ?? 0,
          refundAmount: transaction?.refundAmount ?? null,
          currency:
            request.refundSnapshot?.currency || transaction?.currency || "INR",
        }
      : null,
  });
});

/** POST /api/v1/subscriptions/cancel — submit a cancellation request for review */
export const submitCancellationRequest = asyncHandler(async (req, res) => {
  const userId = req.user.userId;
  const subscription = await findActivePurchasedSubscription(userId);
  if (!subscription) {
    throw new ApiError("No active paid subscription found", 404);
  }

  const transaction = await Transaction.findOne({
    userId,
    subscriptionId: subscription._id,
    status: "paid",
  });
  if (!transaction) {
    throw new ApiError("No paid transaction found for this subscription", 404);
  }

  const customer = await User.findById(userId).select("username email").lean();
  if (!customer) {
    throw new ApiError("Customer account not found", 404);
  }

  const refundSnapshot = calculateRefund({
    transaction,
    subscription,
    now: new Date(),
  });
  if (refundSnapshot.refundAmount !== req.body.expectedRefundAmount) {
    throw new ApiError(
      "The refund estimate has changed. Review the updated amount and submit again.",
      409
    );
  }

  let cancellationRequest;
  try {
    cancellationRequest = await CancellationRequest.create({
      userId,
      subscriptionId: subscription._id,
      transactionId: transaction._id,
      reason: req.body.reason,
      details: req.body.details || "",
      status: "pending_review",
      isOpen: true,
      refundSnapshot: {
        ...refundSnapshot,
        planName:
          transaction.planSnapshot?.displayName ||
          transaction.planSnapshot?.name ||
          subscription.planSnapshot?.displayName ||
          "Paid plan",
        calculatedAt: new Date(),
      },
      consent: {
        acceptedTerms: req.body.acceptedTerms,
        acceptedAt: new Date(),
        policyVersion: "2026-11-v2",
        ip: req.ip || "",
        userAgent: req.get("User-Agent") || "",
      },
    });
  } catch (error) {
    if (error.code === 11000) {
      throw new ApiError(
        "A cancellation request is already open for this subscription.",
        409
      );
    }
    throw error;
  }

  try {
    await logAudit({
      actorId: userId,
      actorEmail: customer.email,
      actorRole: req.user.role,
      action: "cancellation_requested",
      targetType: "CancellationRequest",
      targetId: cancellationRequest._id,
      targetEmail: customer.email,
      metadata: {
        subscriptionId: subscription._id,
        transactionId: transaction._id,
        reason: cancellationRequest.reason,
        expectedRefundAmount: refundSnapshot.refundAmount,
      },
      ...reqMeta(req),
    });
  } catch (error) {
    logger.error(`Cancellation request audit failed: ${error.message}`);
  }

  try {
    await createAlert({
      type: "cancellation_request_submitted",
      category: "payment",
      severity: "INFO",
      title: "Cancellation request submitted",
      description: `A cancellation and refund request was submitted by ${customer.email}.`,
      userId,
      userEmail: customer.email,
      ...reqMeta(req),
      metadata: {
        requestId: cancellationRequest._id.toString(),
        subscriptionId: subscription._id.toString(),
        expectedRefundAmount: refundSnapshot.refundAmount,
      },
      notify: false,
    });
  } catch (error) {
    logger.error(`Cancellation request alert failed: ${error.message}`);
  }

  let customerEmailSent = false;
  try {
    await sendCancellationRequestAcknowledgment({
      to: customer.email,
      userName: customer.username,
      request: cancellationRequest,
    });
    customerEmailSent = true;
  } catch (error) {
    logger.error(`Cancellation request customer email failed: ${error.message}`);
  }
  if (customerEmailSent) {
    try {
      cancellationRequest.customerEmailSentAt = new Date();
      await cancellationRequest.save();
    } catch (error) {
      logger.error(
        `Cancellation request customer email timestamp update failed: ${error.message}`
      );
    }
  }

  const superAdminEmail = process.env.SUPER_ADMIN_EMAIL;
  if (!superAdminEmail) {
    logger.error(
      `Cancellation request ${cancellationRequest._id} could not notify Super Admin: SUPER_ADMIN_EMAIL is not set`
    );
    try {
      await createAlert({
        type: "cancellation_admin_email_not_configured",
        category: "payment",
        severity: "WARNING",
        title: "Cancellation review notification is not configured",
        description:
          "SUPER_ADMIN_EMAIL is missing; a cancellation request requires manual review.",
        userId,
        userEmail: customer.email,
        ...reqMeta(req),
        metadata: { requestId: cancellationRequest._id.toString() },
        notify: false,
      });
    } catch (error) {
      logger.error(`Missing Super Admin email alert failed: ${error.message}`);
    }
  } else {
    let adminEmailSent = false;
    try {
      await sendCancellationRequestReviewNotice({
        to: superAdminEmail,
        request: cancellationRequest,
        customer,
        transaction,
      });
      adminEmailSent = true;
    } catch (error) {
      logger.error(`Cancellation request Super Admin email failed: ${error.message}`);
    }
    if (adminEmailSent) {
      try {
        cancellationRequest.adminEmailSentAt = new Date();
        await cancellationRequest.save();
      } catch (error) {
        logger.error(
          `Cancellation request Super Admin email timestamp update failed: ${error.message}`
        );
      }
    }
  }

  return res.status(201).json({
    success: true,
    message: "Your cancellation request was submitted for review.",
    data: {
      _id: cancellationRequest._id,
      status: cancellationRequest.status,
      isOpen: cancellationRequest.isOpen,
      createdAt: cancellationRequest.createdAt,
      reason: cancellationRequest.reason,
      details: cancellationRequest.details,
      refundSnapshot: cancellationRequest.refundSnapshot,
    },
  });
});

/** POST /api/v1/subscriptions/plans — create/update a plan (super_admin) */
export const savePlan = asyncHandler(async (req, res) => {
  const plan = await upsertPlan(req.body);
  return res.status(200).json({ success: true, message: "Plan saved", data: plan });
});

/** GET /api/v1/admin/subscriptions/plans — list all plans including inactive (admin) */
export const listAllPlansAdmin = asyncHandler(async (req, res) => {
  const plans = await listPlans({ includeInactive: true });
  return res.status(200).json({ success: true, count: plans.length, data: plans });
});

/** GET /api/v1/admin/subscriptions — list all subscriptions across users (admin) */
export const listAllSubscriptionsAdmin = asyncHandler(async (req, res) => {
  const { page = 1, limit = 50, status, type } = req.query;
  const pageNum = Math.max(parseInt(String(page), 10) || 1, 1);
  const limitNum = Math.min(Math.max(parseInt(String(limit), 10) || 50, 1), 100);

  const filter = {};
  if (status) filter.status = status;
  if (type) filter.type = type;

  const [subs, total] = await Promise.all([
    Subscription.find(filter)
      .sort({ createdAt: -1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum)
      .lean(),
    Subscription.countDocuments(filter),
  ]);

  const userIds = [...new Set(subs.map((s) => s.userId.toString()))];
  const users = await User.find({ _id: { $in: userIds } }).select("username email role").lean();
  const userMap = new Map(users.map((u) => [u._id.toString(), u]));

  const enriched = subs.map((s) => ({
    ...s,
    user: userMap.get(s.userId.toString()) || null,
  }));

  return res.status(200).json({
    success: true,
    count: enriched.length,
    total,
    page: pageNum,
    limit: limitNum,
    data: enriched,
  });
});

/** GET /api/v1/admin/ai-usage — AI usage stats across users (admin) */
export const listAIUsageStats = asyncHandler(async (req, res) => {
  const { page = 1, limit = 50 } = req.query;
  const pageNum = Math.max(parseInt(String(page), 10) || 1, 1);
  const limitNum = Math.min(Math.max(parseInt(String(limit), 10) || 50, 1), 100);

  const [usage, total] = await Promise.all([
    AIUsage.find({})
      .sort({ periodStart: -1, callsConsumed: -1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum)
      .lean(),
    AIUsage.countDocuments({}),
  ]);

  const userIds = [...new Set(usage.map((u) => u.userId.toString()))];
  const users = await User.find({ _id: { $in: userIds } }).select("username email role").lean();
  const userMap = new Map(users.map((u) => [u._id.toString(), u]));

  const enriched = usage.map((u) => ({
    ...u,
    user: userMap.get(u.userId.toString()) || null,
  }));

  return res.status(200).json({
    success: true,
    count: enriched.length,
    total,
    page: pageNum,
    limit: limitNum,
    data: enriched,
  });
});

/** GET /api/v1/admin/system-health — system health stats (admin) */
export const getSystemHealth = asyncHandler(async (req, res) => {
  const now = new Date();
  const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const [totalUsers, totalAdmins, totalSuperAdmins, totalSubscriptions, activeSubscriptions, expiredSubscriptions, totalAIUsage, recentAlerts] =
    await Promise.all([
      User.countDocuments({}),
      User.countDocuments({ role: "admin" }),
      User.countDocuments({ role: "super_admin" }),
      Subscription.countDocuments({}),
      Subscription.countDocuments({ status: "active" }),
      Subscription.countDocuments({ status: "expired" }),
      AIUsage.aggregate([{ $group: { _id: null, total: { $sum: "$callsConsumed" } } }]).then(
        (r) => (r[0] ? r[0].total : 0)
      ),
      (async () => {
        try {
          const SecurityEvent = (await import("../models/SecurityEvent.js")).default;
          return SecurityEvent.countDocuments({ createdAt: { $gt: last24h } });
        } catch {
          return 0;
        }
      })(),
    ]);

  return res.status(200).json({
    success: true,
    data: {
      users: {
        total: totalUsers,
        admins: totalAdmins,
        superAdmins: totalSuperAdmins,
      },
      subscriptions: {
        total: totalSubscriptions,
        active: activeSubscriptions,
        expired: expiredSubscriptions,
      },
      aiUsage: {
        totalCalls: totalAIUsage,
      },
      alerts: {
        last24h: recentAlerts,
      },
      status: "healthy",
      timestamp: now.toISOString(),
    },
  });
});

export const cancelPreview = getCancelPreview;

export default {
  listAvailablePlans,
  getMyEntitlement,
  grantAccess,
  revokeAccess,
  getSubscriptionHistory,
  cancelPreview: getCancelPreview,
  savePlan,
  listAllPlansAdmin,
  listAllSubscriptionsAdmin,
  listAIUsageStats,
  getSystemHealth,
  getCancellationRequests,
  getCancelPreview,
  getMyCancellationRequest,
  submitCancellationRequest,
};
