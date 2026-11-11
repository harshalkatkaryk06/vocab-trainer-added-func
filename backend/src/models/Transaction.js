import mongoose from "mongoose";

const transactionSchema = new mongoose.Schema(
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
      default: null,
    },

    razorpayOrderId: {
      type: String,
      default: null,
      index: true,
    },

    razorpayPaymentId: {
      type: String,
      default: null,
      sparse: true,
    },

    razorpaySignature: {
      type: String,
      default: null,
    },

    amount: {
      type: Number,
      required: true,
      min: 0,
    },

    currency: {
      type: String,
      default: "INR",
    },

    status: {
      type: String,
      enum: ["created", "paid", "failed", "cancelled", "refunded"],
      default: "created",
      index: true,
    },

    planId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Plan",
      default: null,
    },

    planSnapshot: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },

    description: {
      type: String,
      default: "",
    },

    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },

    paidAt: {
      type: Date,
      default: null,
    },

    welcomeEmailSentAt: {
      type: Date,
      default: null,
    },

    refundId: {
      type: String,
      default: null,
    },

    refundAmount: {
      type: Number,
      default: null,
      min: 0,
    },

    refundStatus: {
      type: String,
      enum: ["pending", "processed", "failed"],
      default: null,
    },

    refundedAt: {
      type: Date,
      default: null,
    },

    refundReason: {
      type: String,
      trim: true,
      default: null,
    },
  },
  { timestamps: true }
);

transactionSchema.index({ userId: 1, status: 1 });
transactionSchema.index({ createdAt: -1 });

export default mongoose.model("Transaction", transactionSchema);
