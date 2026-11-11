import mongoose from "mongoose";

const auditLogSchema = new mongoose.Schema(
  {
    actorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    actorEmail: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },

    actorRole: {
      type: String,
      enum: ["user", "admin", "super_admin"],
      required: true,
    },

    action: {
      type: String,
      required: true,
      trim: true,
    },

    targetType: {
      type: String,
      required: true,
      trim: true,
    },

    targetId: {
      type: mongoose.Schema.Types.ObjectId,
      required: false,
    },

    targetEmail: {
      type: String,
      trim: true,
      lowercase: true,
    },

    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },

    ip: {
      type: String,
    },

    userAgent: {
      type: String,
    },
  },
  { timestamps: true }
);

auditLogSchema.index({ createdAt: -1 });
auditLogSchema.index({ actorId: 1, createdAt: -1 });
auditLogSchema.index({ targetType: 1, targetId: 1 });

export default mongoose.model("AuditLog", auditLogSchema);
