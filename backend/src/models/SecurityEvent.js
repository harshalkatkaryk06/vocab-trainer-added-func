import mongoose from "mongoose";

const securityEventSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },

    severity: {
      type: String,
      enum: ["INFO", "WARNING", "CRITICAL"],
      default: "INFO",
      index: true,
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

securityEventSchema.index({ createdAt: -1 });
securityEventSchema.index({ severity: 1, createdAt: -1 });
securityEventSchema.index({ type: 1, createdAt: -1 });

export default mongoose.model("SecurityEvent", securityEventSchema);
