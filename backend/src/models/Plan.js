import mongoose from "mongoose";

const planSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      enum: ["free", "paid"],
    },

    displayName: {
      type: String,
      required: true,
      trim: true,
    },

    description: {
      type: String,
      trim: true,
      default: "",
    },

    aiCalls: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
      // number (finite limit) or "unlimited"
    },

    durationDays: {
      type: Number,
      default: null, // null = no expiration (free plan)
    },

    price: {
      type: Number,
      default: 0,
      min: 0,
    },

    currency: {
      type: String,
      default: "USD",
    },

    isActive: {
      type: Boolean,
      default: true,
    },

    isPublic: {
      type: Boolean,
      default: true, // whether users can see/subscribe to this plan
    },

    sortOrder: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

planSchema.index({ name: 1 });
planSchema.index({ isActive: 1, isPublic: 1 });

export default mongoose.model("Plan", planSchema);
