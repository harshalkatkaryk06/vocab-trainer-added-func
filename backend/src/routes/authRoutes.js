import express from "express";
import rateLimit from "express-rate-limit";
import authMiddleware from "../middlewares/authMiddleware.js";
import { validate, schemas } from "../validation/schemas.js";
import {
  registerUser,
  loginUser,
  getCurrentUser,
  refreshToken,
  logoutUser,
  googleLogin,
  updateCurrentUser,
  forgotPassword,
  resetPassword,
} from "../controllers/authController.js";

const router = express.Router();

// Auth-specific rate limiter (tighter than global 300/15min for auth endpoints).
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many attempts. Please try again later.",
  },
});

// Slightly more generous limit for refresh (called silently by frontend).
const refreshLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many requests. Please try again later.",
  },
});

router.post("/register", authLimiter, validate(schemas.register), registerUser);
router.post("/login", authLimiter, validate(schemas.login), loginUser);
router.post("/google", authLimiter, validate(schemas.google), googleLogin);
router.post("/refresh", refreshLimiter, refreshToken);
router.post("/logout", logoutUser);
router.get("/me", authMiddleware, getCurrentUser);
router.patch("/me", authMiddleware, validate(schemas.updateProfile), updateCurrentUser);
router.post(
  "/forgot-password",
  authLimiter,
  validate(schemas.forgotPassword),
  forgotPassword
);
router.post(
  "/reset-password",
  authLimiter,
  validate(schemas.resetPassword),
  resetPassword
);

export default router;
