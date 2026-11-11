import Razorpay from "razorpay";
import CancellationRequest from "../models/CancellationRequest.js";
import Subscription from "../models/Subscription.js";
import Transaction from "../models/Transaction.js";
import User from "../models/User.js";
import { logAudit } from "../utils/auditLog.js";
import { createAlert } from "../services/alertService.js";
import {
  sendCancellationRequestApproved,
  sendCancellationRequestRejected,
} from "../services/cancellationEmailService.js";
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

const getRequestContext = async (request) => {
  const [customer, transaction, subscription] = await Promise.all([
    User.findById(request.userId).select("username email").lean(),
    Transaction.findById(request.transactionId),
    Subscription.findById(request.subscriptionId),
  ]);
  if (!customer || !transaction || !subscription) {
    throw new ApiError(
      "Cancellation request is missing its customer, transaction, or subscription.",
      409
    );
  }
  if (
    transaction.userId.toString() !== request.userId.toString() ||
    subscription.userId.toString() !== request.userId.toString() ||
    transaction.subscriptionId?.toString() !== request.subscriptionId.toString()
  ) {
    throw new ApiError("Cancellation request ownership data is inconsistent.", 409);
  }
  return { customer, transaction, subscription };
};

const logDecision = async ({ request, req, action, customer, metadata }) => {
  try {
    await logAudit({
      actorId: req.user.userId,
      actorEmail: req.user.email,
      actorRole: req.user.role,
      action,
      targetType: "CancellationRequest",
      targetId: request._id,
      targetEmail: customer.email,
      metadata,
      ip: req.ip,
      userAgent: req.get("User-Agent") || undefined,
    });
  } catch (error) {
    logger.error(`Cancellation decision audit failed: ${error.message}`);
  }

  try {
    await createAlert({
      type: action,
      category: "payment",
      severity: "INFO",
      title:
        action === "cancellation_request_approved"
          ? "Cancellation request approved"
          : "Cancellation request rejected",
      description: `Super Admin ${req.user.email} ${action.endsWith("approved") ? "approved" : "rejected"} cancellation request ${request._id}.`,
      userId: request.userId,
      userEmail: customer.email,
      ip: req.ip,
      userAgent: req.get("User-Agent") || undefined,
      metadata: {
        requestId: request._id.toString(),
        ...metadata,
      },
      notify: false,
    });
  } catch (error) {
    logger.error(`Cancellation decision alert failed: ${error.message}`);
  }
};

const sendDecisionEmail = async ({ request, customer }) => {
  try {
    if (request.status === "rejected") {
      await sendCancellationRequestRejected({
        to: customer.email,
        userName: customer.username,
        request,
      });
    } else {
      await sendCancellationRequestApproved({
        to: customer.email,
        userName: customer.username,
        request,
      });
    }
  } catch (error) {
    logger.error(`Cancellation decision email failed: ${error.message}`);
    try {
      await createAlert({
        type: "cancellation_decision_email_failed",
        category: "payment",
        severity: "WARNING",
        title: "Cancellation decision email failed",
        description: `Could not notify ${customer.email} about cancellation request ${request._id}.`,
        userId: request.userId,
        userEmail: customer.email,
        metadata: { requestId: request._id.toString(), status: request.status },
        notify: false,
      });
    } catch (alertError) {
      logger.error(
        `Cancellation decision email failure alert failed: ${alertError.message}`
      );
    }
    return;
  }

  try {
    request.decisionEmailSentAt = new Date();
    await request.save();
  } catch (error) {
    logger.error(
      `Cancellation decision email timestamp update failed: ${error.message}`
    );
  }
};

export const listCancellationRequestsForReview = asyncHandler(
  async (req, res) => {
    const page = Math.max(Number.parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(Number.parseInt(req.query.limit, 10) || 25, 1), 100);
    const filter = {};
    if (req.query.status) {
      if (
        !["pending_review", "approved", "rejected", "completed"].includes(
          req.query.status
        )
      ) {
        throw new ApiError("Invalid cancellation request status filter.", 400);
      }
      filter.status = req.query.status;
    }

    const [requests, total] = await Promise.all([
      CancellationRequest.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate("userId", "username email")
        .populate("subscriptionId", "status startDate expiryDate planSnapshot")
        .populate(
          "transactionId",
          "amount currency status razorpayPaymentId refundAmount refundStatus refundId paidAt planSnapshot"
        )
        .lean(),
      CancellationRequest.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      count: requests.length,
      total,
      page,
      limit,
      data: requests,
    });
  }
);

export const approveCancellationRequest = asyncHandler(async (req, res) => {
  const pendingRequest = await CancellationRequest.findById(req.params.id);
  if (!pendingRequest) throw new ApiError("Cancellation request not found", 404);
  if (pendingRequest.status !== "pending_review" || !pendingRequest.isOpen) {
    throw new ApiError("Only open requests pending review can be approved.", 409);
  }

  const { customer, transaction, subscription } =
    await getRequestContext(pendingRequest);
  const refundAmount = pendingRequest.refundSnapshot?.refundAmount;
  if (
    !Number.isSafeInteger(refundAmount) ||
    refundAmount < 0 ||
    refundAmount > transaction.amount
  ) {
    throw new ApiError("The saved refund amount is invalid.", 409);
  }
  if (subscription.status !== "active") {
    throw new ApiError("The subscription is no longer active.", 409);
  }
  if (transaction.status !== "paid") {
    throw new ApiError("The payment is no longer eligible for cancellation.", 409);
  }
  if (transaction.refundId || transaction.refundStatus) {
    throw new ApiError(
      "A refund has already been initiated or processed for this payment.",
      409
    );
  }
  if (refundAmount > 0 && !transaction.razorpayPaymentId) {
    throw new ApiError("The payment has no Razorpay payment reference.", 409);
  }

  const request = await CancellationRequest.findOneAndUpdate(
    {
      _id: req.params.id,
      status: "pending_review",
      isOpen: true,
    },
    {
      $set: {
        status: "approved",
        reviewedBy: req.user.userId,
        reviewedAt: new Date(),
        reviewerNote: req.body.reviewerNote || "",
      },
    },
    { new: true, runValidators: true }
  );
  if (!request) {
    const existing = await CancellationRequest.findById(req.params.id)
      .select("status")
      .lean();
    if (!existing) throw new ApiError("Cancellation request not found", 404);
    throw new ApiError("Only open requests pending review can be approved.", 409);
  }

  if (refundAmount > 0) {
    let refund;
    try {
      refund = await getRazorpay().payments.refund(transaction.razorpayPaymentId, {
        amount: refundAmount,
        speed: "normal",
        receipt: `cancel_${request._id}`,
        notes: {
          cancellationRequestId: request._id.toString(),
          subscriptionId: subscription._id.toString(),
          userId: request.userId.toString(),
        },
      });
      if (!refund?.id) {
        throw new Error("Razorpay did not return a refund reference.");
      }
    } catch (error) {
      request.status = "pending_review";
      request.reviewedBy = null;
      request.reviewedAt = null;
      await request.save();
      logger.error(
        `Razorpay refund initiation failed for cancellation request ${request._id}: ${error.message}`
      );
      try {
        await createAlert({
          type: "cancellation_refund_initiation_failed",
          category: "payment",
          severity: "WARNING",
          title: "Cancellation refund initiation failed",
          description: `Refund initiation failed for request ${request._id}; the request remains pending review.`,
          userId: request.userId,
          userEmail: customer.email,
          metadata: {
            requestId: request._id.toString(),
            error: error.message,
          },
          notify: false,
        });
      } catch (alertError) {
        logger.error(
          `Refund initiation failure alert failed: ${alertError.message}`
        );
      }
      throw new ApiError(
        "Refund initiation failed. The request remains pending review.",
        502
      );
    }

    request.razorpayRefundId = refund.id;
    request.refundStatus = "pending";
    request.refundUpdatedAt = new Date();
    request.isOpen = false;
    transaction.refundId = refund.id;
    transaction.refundAmount = refundAmount;
    transaction.refundStatus = "pending";
    transaction.refundReason = `Cancellation request ${request._id} approved`;
    if (refundAmount >= transaction.amount) {
      transaction.status = "refunded";
    }
    subscription.status = "cancelled";
    subscription.cancelledAt = new Date();
    subscription.cancellationReason = `Cancellation request approved: ${request.reason}`;

    await request.save();
    await transaction.save();
    await subscription.save();
  } else {
    request.status = "completed";
    request.isOpen = false;
    transaction.refundAmount = 0;
    transaction.refundReason = `Cancellation request ${request._id} approved with no refund`;
    subscription.status = "cancelled";
    subscription.cancelledAt = new Date();
    subscription.cancellationReason = `Cancellation request approved: ${request.reason}`;

    await request.save();
    await transaction.save();
    await subscription.save();
  }

  const metadata = {
    subscriptionId: subscription._id.toString(),
    transactionId: transaction._id.toString(),
    refundId: request.razorpayRefundId,
    refundAmount,
  };
  await logDecision({
    request,
    req,
    action: "cancellation_request_approved",
    customer,
    metadata,
  });
  await sendDecisionEmail({ request, customer });

  return res.status(200).json({
    success: true,
    message:
      refundAmount > 0
        ? "Cancellation approved and refund initiated."
        : "Cancellation approved with no refund due.",
    data: request,
  });
});

export const rejectCancellationRequest = asyncHandler(async (req, res) => {
  const pendingRequest = await CancellationRequest.findById(req.params.id);
  if (!pendingRequest) throw new ApiError("Cancellation request not found", 404);
  if (pendingRequest.status !== "pending_review" || !pendingRequest.isOpen) {
    throw new ApiError("Only open requests pending review can be rejected.", 409);
  }
  const { customer, subscription } = await getRequestContext(pendingRequest);
  if (subscription.status !== "active") {
    throw new ApiError("The subscription is no longer active.", 409);
  }

  const request = await CancellationRequest.findOneAndUpdate(
    {
      _id: req.params.id,
      status: "pending_review",
      isOpen: true,
    },
    {
      $set: {
        status: "rejected",
        isOpen: false,
        reviewedBy: req.user.userId,
        reviewedAt: new Date(),
        reviewerNote: req.body.reviewerNote || "",
      },
    },
    { new: true, runValidators: true }
  );
  if (!request) {
    const existing = await CancellationRequest.findById(req.params.id)
      .select("status")
      .lean();
    if (!existing) throw new ApiError("Cancellation request not found", 404);
    throw new ApiError("Only open requests pending review can be rejected.", 409);
  }

  await logDecision({
    request,
    req,
    action: "cancellation_request_rejected",
    customer,
    metadata: {
      subscriptionId: subscription._id.toString(),
      reviewerNote: request.reviewerNote,
    },
  });
  await sendDecisionEmail({ request, customer });

  return res.status(200).json({
    success: true,
    message: "Cancellation request rejected. The subscription remains active.",
    data: request,
  });
});
