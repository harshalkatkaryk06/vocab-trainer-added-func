import mongoose from "mongoose";

const cancellationRequestSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    subscriptionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Subscription",
      required: true,
    },
    transactionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Transaction",
      required: true,
    },
    reason: {
      type: String,
      required: true,
      trim: true,
    },
    details: {
      type: String,
      trim: true,
      default: "",
      maxlength: 1000,
    },
    status: {
      type: String,
      enum: ["pending_review", "approved", "rejected", "completed"],
      default: "pending_review",
      required: true,
    },
    isOpen: {
      type: Boolean,
      default: true,
      required: true,
    },
    refundSnapshot: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
    consent: {
      acceptedTerms: { type: Boolean, required: true },
      acceptedAt: { type: Date, required: true },
      policyVersion: { type: String, required: true },
      ip: { type: String, default: "" },
      userAgent: { type: String, default: "" },
    },
    customerEmailSentAt: {
      type: Date,
      default: null,
    },
    adminEmailSentAt: {
      type: Date,
      default: null,
    },
    decisionEmailSentAt: {
      type: Date,
      default: null,
    },
    razorpayRefundId: {
      type: String,
      trim: true,
      default: null,
    },
    refundStatus: {
      type: String,
      enum: ["pending", "processed", "failed"],
      default: null,
    },
    refundUpdatedAt: {
      type: Date,
      default: null,
    },
    refundNotificationStatus: {
      type: String,
      enum: ["processed", "failed"],
      default: null,
    },
    refundNotificationSentAt: {
      type: Date,
      default: null,
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    reviewedAt: {
      type: Date,
      default: null,
    },
    reviewerNote: {
      type: String,
      trim: true,
      default: "",
      maxlength: 1000,
    },
  },
  { timestamps: true }
);

cancellationRequestSchema.index(
  { subscriptionId: 1 },
  {
    unique: true,
    partialFilterExpression: { isOpen: true },
  }
);

export default mongoose.model("CancellationRequest", cancellationRequestSchema);
