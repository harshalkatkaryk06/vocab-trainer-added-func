import { consumeAIQuota } from "../services/subscriptionService.js";
import { ApiError } from "../utils/ApiError.js";

/**
 * AI usage enforcement middleware.
 *
 * Replaces the express-rate-limit daily cap with backend-enforced,
 * entitlement-aware quota consumption using atomic database operations.
 *
 * - Free plan: limited daily calls (existing limit preserved — 2/day).
 * - Paid/active subscription: unlimited calls (still tracked for monitoring).
 * - Expired/revoked subscriptions fall back to free plan limits.
 * - Concurrent requests are safe: atomic $inc via findOneAndUpdate.
 * - Frontend cannot manipulate the quota (entirely backend-enforced).
 *
 * Must be mounted AFTER authMiddleware so req.user exists.
 */
const aiUsageEnforcer = async (req, res, next) => {
  try {
    const result = await consumeAIQuota(req.user.userId);

    // Attach usage info to the response headers for the frontend.
    if (!result.isUnlimited) {
      res.set(
        "X-AI-Limit",
        String(result.limit)
      );
      res.set("X-AI-Remaining", String(result.remaining));
      res.set("X-AI-Consumed", String(result.callsConsumed));
    } else {
      res.set("X-AI-Plan", "unlimited");
    }

    if (!result.allowed) {
      return res.status(429).json({
        success: false,
        message: "Daily AI limit reached. Please try again tomorrow or upgrade your plan.",
        limit: result.limit,
        consumed: result.callsConsumed,
        remaining: 0,
        plan: "free",
      });
    }

    next();
  } catch (error) {
    // Never block AI usage due to an internal enforcement error — log and pass through.
    console.error("AI usage enforcement error:", error.message);
    next();
  }
};

export default aiUsageEnforcer;
