import mongoose from "mongoose";

const refreshTokenSchema = new mongoose.Schema(
  {
    tokenHash: {
      type: String,
      required: true,
    },

    sessionId: {
      type: String,
      required: true,
    },

    createdAt: {
      type: Date,
      default: Date.now,
    },

    expiresAt: {
      type: Date,
      required: true,
    },
  },
  { _id: false }
);

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      minlength: 3,
      maxlength: 30,
      unique: true,
    },

    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      unique: true,
    },

    password: {
      type: String,
      default: null,
    },

    provider: {
      type: String,
      enum: ["local", "google"],
      default: "local",
      required: true,
    },
    role: {
      type: String,
      enum: ["user", "admin", "super_admin"],
      default: "user",
    },

    isEmailVerified: {
      type: Boolean,
      default: false,
    },

    emailVerifiedAt: {
      type: Date,
      default: null,
    },

    googleId: {
      type: String,
      sparse: true,
      unique: true,
    },

    refreshTokens: {
      type: [refreshTokenSchema],
      default: [],
    },

    resetTokenHash: {
      type: String,
      default: null,
    },

    resetTokenExpiresAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model("User", userSchema);
