import Plan from "../models/Plan.js";
import Subscription from "../models/Subscription.js";
import Transaction from "../models/Transaction.js";
import AIUsage from "../models/AIUsage.js";
import User from "../models/User.js";
import logger from "../config/logger.js";

/**
 * Subscription service — centralized plan and entitlement logic.
 *
 * Precedence rules:
 *  1. An active subscription (manual grant or purchase) overrides the free plan.
 *  2. Manual grants do NOT overwrite purchase records (purchaseReference preserved).
 *  3. Expired/revoked subscriptions fall back to the free plan.
 *  4. Only one "active" subscription is considered at a time; if multiple exist,
 *     the one with the latest expiryDate wins.
 */

const FREE_PLAN_NAME = "free";

/** Create or retrieve the subscription linked to a verified payment. */
export const activatePurchasedSubscription = async ({
  userId,
  plan,
  paymentId,
}) => {
  const existing = await Subscription.findOne({
    userId,
    purchaseReference: paymentId,
  });
  if (existing) {
    if (existing.type !== "purchase") {
      existing.type = "purchase";
      await existing.save();
    }
    return existing;
  }

  const durationDays = plan.durationDays || 30;
  const startDate = new Date();
  const expiryDate = new Date(
    startDate.getTime() + durationDays * 24 * 60 * 60 * 1000
  );

  return Subscription.create({
    userId,
    planId: plan._id,
    planSnapshot: {
      name: plan.name,
      displayName: plan.displayName,
      aiCalls: plan.aiCalls,
      durationDays,
      price: plan.price,
      currency: plan.currency,
    },
    type: "purchase",
    status: "active",
    startDate,
    expiryDate,
    purchaseReference: paymentId,
  });
};

/** Find a paid active subscription, correcting legacy purchases recorded as manual. */
export const findActivePurchasedSubscription = async (userId) => {
  const purchase = await Subscription.findOne({
    userId,
    type: "purchase",
    status: "active",
  }).sort({ createdAt: -1 });
  if (purchase) return purchase;

  const legacyPurchases = await Subscription.find({
    userId,
    type: "manual",
    status: "active",
    purchaseReference: { $type: "string", $ne: "" },
  }).sort({ createdAt: -1 });

  for (const subscription of legacyPurchases) {
    const transaction = await Transaction.findOne({
      userId,
      subscriptionId: subscription._id,
      razorpayPaymentId: subscription.purchaseReference,
      status: "paid",
    });

    if (transaction) {
      subscription.type = "purchase";
      await subscription.save();
      return subscription;
    }
  }

  return null;
};

/** Get the free plan, seeding it if missing. */
export const getOrCreateFreePlan = async () => {
  let plan = await Plan.findOne({ name: FREE_PLAN_NAME, isActive: true });
  if (!plan) {
    plan = await Plan.create({
      name: "free",
      displayName: "Free",
      description: "Limited AI calls per day.",
      aiCalls: 2, // existing daily limit preserved
      durationDays: null,
      price: 0,
      currency: "USD",
      isActive: true,
      isPublic: true,
      sortOrder: 0,
    });
    logger.info("Seeded default Free plan");
  }
  return plan;
};

/** List all plans (public + inactive for admin). */
export const listPlans = async ({ includeInactive = false } = {}) => {
  const filter = includeInactive ? {} : { isActive: true };
  return Plan.find(filter).sort({ sortOrder: 1, createdAt: 1 }).lean();
};

/** Get a plan by id. */
export const getPlanById = async (planId) => {
  return Plan.findById(planId).lean();
};

/** Create/update a plan (admin). */
export const upsertPlan = async (planData) => {
  const { _id, ...rest } = planData;
  if (_id) {
    return Plan.findByIdAndUpdate(_id, rest, { new: true, runValidators: true });
  }
  return Plan.create(rest);
};

/**
 * Compute the effective entitlement for a user.
 * Returns { plan, subscription, isUnlimited, callsAllowed }.
 */
export const getEffectiveEntitlement = async (userId) => {
  const freePlan = await getOrCreateFreePlan();

  // Find the best active subscription for the user.
  const now = new Date();
  const activeSub = await Subscription.findOne({
    userId,
    status: "active",
    $or: [{ expiryDate: null }, { expiryDate: { $gt: now } }],
  }).sort({ expiryDate: -1, createdAt: -1 });

  if (!activeSub) {
    return {
      plan: freePlan,
      subscription: null,
      isUnlimited: false,
      callsAllowed: freePlan.aiCalls,
    };
  }

  const plan = await Plan.findById(activeSub.planId).lean() || freePlan;
  const isUnlimited =
    plan.aiCalls === "unlimited" || plan.aiCalls === null || plan.aiCalls === undefined;

  return {
    plan,
    subscription: activeSub.toObject ? activeSub.toObject() : activeSub,
    isUnlimited,
    callsAllowed: isUnlimited ? null : plan.aiCalls,
  };
};

/**
 * Grant manual paid access to a user by email (admin).
 * The email must belong to an existing, email-verified user.
 * Does NOT overwrite purchaseReference if one exists.
 */
export const grantManualAccess = async ({
  email,
  durationDays,
  grantedById,
  grantedByEmail,
  planId = null,
}) => {
  const targetUser = await User.findOne({ email: email.trim().toLowerCase() });
  if (!targetUser) {
    throw new Error("No user found with that email");
  }

  // Google-auth accounts are already email-verified by Google; skip the check.
  if (!targetUser.isEmailVerified && targetUser.provider !== "google") {
    throw new Error("Account email is not verified");
  }

  const plan =
    planId || (await Plan.findOne({ name: "paid", isActive: true }) || (await getOrCreateFreePlan()));
  const planDoc =
    typeof plan === "object" && plan._id
      ? plan
      : await Plan.findById(plan);
  if (!planDoc) throw new Error("Plan not found");

  const startDate = new Date();
  const expiryDate = durationDays
    ? new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000)
    : null;

  // Revoke any existing active manual subscription for this user (keep purchases intact).
  await Subscription.updateMany(
    { userId: targetUser._id, type: "manual", status: "active" },
    { status: "revoked", revokedAt: new Date(), revocationReason: "superseded_by_new_grant" }
  );

  const subscription = await Subscription.create({
    userId: targetUser._id,
    planId: planDoc._id,
    planSnapshot: {
      name: planDoc.name,
      displayName: planDoc.displayName,
      aiCalls: planDoc.aiCalls,
      durationDays: planDoc.durationDays,
    },
    type: "manual",
    status: "active",
    startDate,
    expiryDate,
    grantedBy: grantedById,
    grantedByEmail,
  });

  logger.info(
    `Manual access granted: ${email} -> ${planDoc.name} (${durationDays} days) by ${grantedByEmail}`
  );

  return subscription;
};

/** Revoke a subscription (admin). */
export const revokeSubscription = async (subscriptionId, revokedById, reason) => {
  const subscription = await Subscription.findById(subscriptionId);
  if (!subscription) throw new Error("Subscription not found");

  subscription.status = "revoked";
  subscription.revokedAt = new Date();
  subscription.revokedBy = revokedById;
  subscription.revocationReason = reason || "revoked_by_admin";
  await subscription.save();

  logger.info(
    `Subscription revoked: user ${subscription.userId} by ${revokedById}`
  );

  return subscription;
};

/** Get subscription history for a user. */
export const getUserSubscriptions = async (userId) => {
  return Subscription.find({ userId })
    .sort({ createdAt: -1 })
    .lean();
};

/** Consume AI quota atomically. Returns { allowed, callsConsumed, limit, isUnlimited }. */
export const consumeAIQuota = async (userId) => {
  const entitlement = await getEffectiveEntitlement(userId);

  if (entitlement.isUnlimited) {
    // Still track usage for monitoring, but never block.
    await recordUsage(userId, entitlement.plan.aiCalls);
    return {
      allowed: true,
      callsConsumed: null,
      limit: null,
      isUnlimited: true,
      remaining: null,
    };
  }

  const now = new Date();
  const periodStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const periodEnd = new Date(periodStart);
  periodEnd.setDate(periodEnd.getDate() + 1);

  const limit = entitlement.callsAllowed;

  // Atomic increment: find or create today's usage record, increment callsConsumed.
  const usage = await AIUsage.findOneAndUpdate(
    { userId, periodStart },
    {
      $setOnInsert: { userId, periodStart, periodEnd, limit },
      $inc: { callsConsumed: 1 },
    },
    {
      upsert: true,
      new: true,
    }
  ).lean();

  const callsConsumed = usage.callsConsumed;
  const allowed = callsConsumed <= limit;
  const remaining = Math.max(0, limit - callsConsumed);

  return {
    allowed,
    callsConsumed,
    limit,
    isUnlimited: false,
    remaining,
  };
};

/** Record usage without blocking (for unlimited users / monitoring). */
const recordUsage = async (userId, limit) => {
  const now = new Date();
  const periodStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  await AIUsage.findOneAndUpdate(
    { userId, periodStart },
    {
      $setOnInsert: { userId, periodStart, periodEnd: null, limit },
      $inc: { callsConsumed: 1 },
    },
    { upsert: true, new: true }
  );
};

/** Get current usage for a user (for display). */
export const getCurrentUsage = async (userId) => {
  const now = new Date();
  const periodStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const usage = await AIUsage.findOne({ userId, periodStart }).lean();
  const entitlement = await getEffectiveEntitlement(userId);

  return {
    callsConsumed: usage ? usage.callsConsumed : 0,
    limit: entitlement.isUnlimited ? null : entitlement.callsAllowed,
    remaining:
      entitlement.isUnlimited
        ? null
        : Math.max(0, entitlement.callsAllowed - (usage ? usage.callsConsumed : 0)),
    isUnlimited: entitlement.isUnlimited,
    plan: entitlement.plan,
    subscription: entitlement.subscription,
  };
};

export default {
  getOrCreateFreePlan,
  listPlans,
  getPlanById,
  upsertPlan,
  getEffectiveEntitlement,
  grantManualAccess,
  revokeSubscription,
  getUserSubscriptions,
  consumeAIQuota,
  getCurrentUsage,
};
