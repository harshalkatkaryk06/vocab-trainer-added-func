/**
 * Refund configuration - all values in this one object so they are easy to edit.
 */
const REFUND_CONFIG = {
  /** Hours within which a full refund is given (48 hours = 2 days) */
  FULL_REFUND_WINDOW_HOURS: 48,

  /** Processing fee percentage deducted from the refund (0 = no fee) */
  PROCESSING_FEE_PERCENT: 0,
};

/**
 * Calculate refund for a cancelled subscription.
 * Pure function: no database or Razorpay calls.
 *
 * @param {Object} transaction - The user's Transaction document
 * @param {Object} subscription - The user's Subscription document
 * @param {Date} now - Current date/time (for testability)
 * @returns {Object} { amountPaid, refundAmount, usedDays, unusedDays, totalDays, isFullRefundWindow, breakdownText, currency }
 */
export const calculateRefund = ({ transaction, subscription, now }) => {
  // 1. Extract values from transaction and subscription
  const amountPaid = transaction.amount; // stored in smallest currency unit (paise)
  const currency = transaction.currency || "INR";
  const planSnapshot = transaction.planSnapshot || {};
  const durationDays = planSnapshot.durationDays || 0;

  // 2. Only subscriptions with type "purchase" can be cancelled
  if (subscription.type !== "purchase") {
    return {
      amountPaid: 0,
      refundAmount: 0,
      usedDays: 0,
      unusedDays: 0,
      totalDays: 0,
      isFullRefundWindow: false,
      breakdownText: "Only purchased subscriptions can be cancelled.",
      currency,
    };
  }

  // 3. Total days from planSnapshot.durationDays
  const totalDays = durationDays;

  // 4. Edge case: no duration defined
  if (totalDays === 0) {
    return {
      amountPaid,
      refundAmount: 0,
      usedDays: 0,
      unusedDays: 0,
      totalDays: 0,
      isFullRefundWindow: false,
      breakdownText: "No subscription duration defined.",
      currency,
    };
  }

  // 5. Calculate used days: ceil((now - subscription.startDate) / 86400000)
  //    A partly used day counts as a used day.
  const startDate = new Date(subscription.startDate);
  const nowDate = new Date(now);
  const diffMs = nowDate - startDate;
  const diffDays = diffMs / 86400000;
  let usedDays = Math.ceil(diffDays);

  // Clamp usedDays to at least 0
  if (usedDays < 0) {
    usedDays = 0;
  }

  // 6. Calculate unused days: max(0, totalDays - usedDays)
  const unusedDays = Math.max(0, totalDays - usedDays);

  // 7. Check if within full refund window (48 hours from start)
  const fullRefundWindowMs =
    REFUND_CONFIG.FULL_REFUND_WINDOW_HOURS * 60 * 60 * 1000;
  const isFullRefundWindow = diffMs >= 0 && diffMs <= fullRefundWindowMs;

  // 8. Calculate refund amount
  let refundAmount;

  if (isFullRefundWindow) {
    // Within 48 hours: full refund
    refundAmount = amountPaid;
  } else if (unusedDays === 0) {
    // No unused days: no refund
    refundAmount = 0;
  } else {
    // Pro-rata: floor(amountPaid * unusedDays / totalDays)
    const rawRefund = amountPaid * unusedDays / totalDays;
    refundAmount = Math.floor(rawRefund);
  }

  // 9. Apply processing fee percentage
  const processingFeePercent = REFUND_CONFIG.PROCESSING_FEE_PERCENT;
  const processingFee = Math.floor(refundAmount * processingFeePercent / 100);
  refundAmount = refundAmount - processingFee;

  // 10. Never refund a negative amount
  if (refundAmount < 0) {
    refundAmount = 0;
  }

  // 11. Never refund more than the amount paid
  if (refundAmount > amountPaid) {
    refundAmount = amountPaid;
  }

  // 12. Build human-readable breakdown text
  const refundAmountFormatted = (refundAmount / 100).toFixed(2);
  const amountPaidFormatted = (amountPaid / 100).toFixed(2);

  let breakdownText;
  if (isFullRefundWindow) {
    breakdownText = `Full refund within ${REFUND_CONFIG.FULL_REFUND_WINDOW_HOURS} hours of purchase: ${currency} ${refundAmountFormatted}`;
  } else if (unusedDays === 0) {
    breakdownText = `No unused days remaining: no refund`;
  } else {
    breakdownText = `Pro-rata refund: ${currency} ${amountPaidFormatted} × ${unusedDays} unused days ÷ ${totalDays} total days = ${currency} ${refundAmountFormatted}`;
  }

  return {
    amountPaid,
    refundAmount,
    usedDays,
    unusedDays,
    totalDays,
    isFullRefundWindow,
    breakdownText,
    currency,
  };
};

export default { calculateRefund };
