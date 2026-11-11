import mongoose from "mongoose";

const aiUsageSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    periodStart: {
      type: Date,
      required: true,
      index: true,
    },

    periodEnd: {
      type: Date,
      required: true,
    },

    callsConsumed: {
      type: Number,
      default: 0,
      min: 0,
    },

    limit: {
      type: mongoose.Schema.Types.Mixed,
      required: true, // number or "unlimited"
    },

    resetAt: {
      type: Date,
    },
  },
  { timestamps: true }
);

aiUsageSchema.index({ userId: 1, periodStart: 1 }, { unique: true });

export default mongoose.model("AIUsage", aiUsageSchema);
