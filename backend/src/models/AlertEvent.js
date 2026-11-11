import mongoose from "mongoose";

const alertEventSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },

    category: {
      type: String,
      enum: ["authentication", "application", "security", "payment", "system"],
      required: true,
      index: true,
    },

    severity: {
      type: String,
      enum: ["INFO", "WARNING", "CRITICAL"],
      required: true,
      default: "INFO",
      index: true,
    },

    title: {
      type: String,
      required: true,
      trim: true,
    },

    description: {
      type: String,
      trim: true,
      default: "",
    },

    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false,
    },

    userEmail: {
      type: String,
      trim: true,
      lowercase: true,
    },

    ip: {
      type: String,
    },

    userAgent: {
      type: String,
    },

    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },

    notified: {
      type: Boolean,
      default: false,
    },

    notifiedAt: {
      type: Date,
      default: null,
    },

    resolved: {
      type: Boolean,
      default: false,
    },

    resolvedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

alertEventSchema.index({ createdAt: -1 });
alertEventSchema.index({ category: 1, createdAt: -1 });
alertEventSchema.index({ severity: 1, createdAt: -1 });
alertEventSchema.index({ notified: 1, createdAt: 1 });

export default mongoose.model("AlertEvent", alertEventSchema);
