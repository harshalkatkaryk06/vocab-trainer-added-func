import mongoose from "mongoose";

const subscriptionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    planId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Plan",
      required: true,
    },

    planSnapshot: {
      type: mongoose.Schema.Types.Mixed,
      default: null, // store plan details at time of grant/purchase
    },

    type: {
      type: String,
      enum: ["manual", "purchase"],
      required: true,
      default: "manual",
    },

    status: {
      type: String,
      enum: ["active", "expired", "revoked", "cancelled"],
      default: "active",
      index: true,
    },

    startDate: {
      type: Date,
      required: true,
      default: Date.now,
    },

    expiryDate: {
      type: Date,
      default: null,
      index: true,
    },

    grantedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null, // admin who granted (null for purchases)
    },

    grantedByEmail: {
      type: String,
      trim: true,
      default: null,
    },

    revokedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    revokedAt: {
      type: Date,
      default: null,
    },

    revocationReason: {
      type: String,
      trim: true,
      default: null,
    },

    cancelledAt: {
      type: Date,
      default: null,
    },

    cancellationReason: {
      type: String,
      trim: true,
      default: null,
    },

    // Purchase reference (Razorpay order/payment id) — never overwritten by manual grants
    purchaseReference: {
      type: String,
      trim: true,
      default: null,
    },
  },
  { timestamps: true }
);

subscriptionSchema.index({ userId: 1, status: 1 });
subscriptionSchema.index({ expiryDate: 1, status: 1 });

export default mongoose.model("Subscription", subscriptionSchema);
