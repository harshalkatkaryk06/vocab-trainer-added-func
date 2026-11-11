import sendEmail from "../utils/sendEmail.js";
import logger from "../config/logger.js";

/**
 * Send a welcome email to a customer right after their paid subscription
 * is activated. Fire-and-safe: mail failures never break the caller.
 */
export const sendSubscriptionWelcomeEmail = async ({
  user,
  plan,
  transaction,
  subscription,
}) => {
  // 1. Extract values from the passed-in objects
  const userName = user.username || user.email;
  const userEmail = user.email;
  const planName = plan.displayName || "Unknown Plan";
  const transactionAmount = transaction.amount; // stored in smallest currency unit (paise)
  const currency = transaction.currency || "INR";
  const amountFormatted = `${currency} ${(transactionAmount / 100).toFixed(2)}`;
  const receiptId = transaction.razorpayPaymentId || transaction.razorpayOrderId;

  // 2. Format dates like "12 November 2026"
  const startDate = new Date(subscription.startDate);
  const expiryDate = new Date(subscription.expiryDate);
  const dateOptions = { day: "numeric", month: "long", year: "numeric" };
  const startDateFormatted = startDate.toLocaleDateString("en-GB", dateOptions);
  const expiryDateFormatted = expiryDate.toLocaleDateString("en-GB", dateOptions);

  // 3. Escape username and plan name before putting them in HTML
  const escapeHtml = (str) =>
    String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");

  const userNameEscaped = escapeHtml(userName);
  const planNameEscaped = escapeHtml(planName);
  const currencyEscaped = escapeHtml(currency);

  // 4. Build the frontend URL for the CTA button
  const clientUrl = process.env.CLIENT_URL || "http://localhost:5173";

  // 5. Build HTML email body
  const html = `<!DOCTYPE html>
<html>
  <body style="font-family:Georgia,serif;max-width:480px;margin:auto;color:#1a1a1a;line-height:1.6">
    <h2 style="color:#6c63ff;border-bottom:2px solid #6c63ff;padding-bottom:8px">
      Welcome to VocabTrainer ${planNameEscaped}, your subscription is active
    </h2>
    <p style="font-size:16px">Hello ${userNameEscaped},</p>
    <p style="font-size:16px">
      Thank you for subscribing to <strong>${planNameEscaped}</strong>. Your subscription is now active.
    </p>
    <table style="width:100%;border-collapse:collapse;margin-top:16px">
      <tr>
        <td style="padding:6px 0;border-bottom:1px solid #eee"><strong>Plan:</strong></td>
        <td style="padding:6px 0;border-bottom:1px solid #eee">${planNameEscaped}</td>
      </tr>
      <tr>
        <td style="padding:6px 0;border-bottom:1px solid #eee"><strong>Amount paid:</strong></td>
        <td style="padding:6px 0;border-bottom:1px solid #eee">${amountFormatted}</td>
      </tr>
      <tr>
        <td style="padding:6px 0;border-bottom:1px solid #eee"><strong>Currency:</strong></td>
        <td style="padding:6px 0;border-bottom:1px solid #eee">${currencyEscaped}</td>
      </tr>
      <tr>
        <td style="padding:6px 0;border-bottom:1px solid #eee"><strong>Start date:</strong></td>
        <td style="padding:6px 0;border-bottom:1px solid #eee">${startDateFormatted}</td>
      </tr>
      <tr>
        <td style="padding:6px 0"><strong>Expiry date:</strong></td>
        <td style="padding:6px 0">${expiryDateFormatted}</td>
      </tr>
      <tr>
        <td style="padding:6px 0"><strong>Receipt reference:</strong></td>
        <td style="padding:6px 0">${receiptId}</td>
      </tr>
    </table>
    <p style="margin:24px 0">
      <a href="${clientUrl}" style="background:#6c63ff;color:#fff;padding:12px 22px;border-radius:8px;text-decoration:none;font-weight:600">
        Go to VocabTrainer
      </a>
    </p>
    <p style="font-size:14px;color:#666">
      If you have any questions, just reply to this email — we're happy to help.
    </p>
  </body>
</html>`;

  // 6. Build plain-text email body
  const text = `Welcome to VocabTrainer ${planName}, your subscription is active

Hello ${userName},

Thank you for subscribing to ${planName}. Your subscription is now active.

Plan: ${planName}
Amount paid: ${amountFormatted}
Currency: ${currency}
Start date: ${startDateFormatted}
Expiry date: ${expiryDateFormatted}
Receipt reference: ${receiptId}

${clientUrl}

If you have any questions, just reply to this email — we're happy to help.
  `;

  // 7. Send the email via Brevo
  await sendEmail({
    to: userEmail,
    subject: `Welcome to VocabTrainer ${planName}, your subscription is active`,
    html,
    text,
  });
};

/**
 * Send a cancellation or refund status update to the customer.
 */
export const sendSubscriptionCancellationEmail = async ({
  user,
  plan,
  transaction,
  subscription,
  refundAmount,
  refundId,
  refundStatus = "pending",
}) => {
  const userName = user.username || user.email;
  const userEmail = user.email;
  const planName = plan.displayName || "Unknown Plan";
  const currency = transaction.currency || "INR";
  const amount = refundAmount ?? 0;
  const refundAmountFormatted = `${currency} ${(amount / 100).toFixed(2)}`;
  const refundIdVal = refundId || transaction.refundId || "—";
  const statusMessages = {
    pending: "Your cancellation is complete and your refund has been initiated. It is being processed to your original payment method.",
    processed: "Your cancellation is complete and your refund has been processed to your original payment method.",
    failed: "Your subscription cancellation is recorded, but the refund could not be processed. Please contact support for assistance.",
    completed_no_refund: "Your subscription cancellation is complete. No refund was due under the applicable refund calculation.",
  };
  const statusMessage =
    statusMessages[refundStatus] || statusMessages.pending;
  const subject =
    refundStatus === "pending" || refundStatus === "completed_no_refund"
      ? "Your VocabTrainer subscription cancellation"
      : `VocabTrainer refund update: ${refundStatus}`;

  const escapeHtml = (str) =>
    String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");

  const userNameEscaped = escapeHtml(userName);
  const planNameEscaped = escapeHtml(planName);
  const currencyEscaped = escapeHtml(currency);
  const refundStatusEscaped = escapeHtml(refundStatus);
  const refundIdEscaped = escapeHtml(refundIdVal);

  const html = `<!DOCTYPE html>
<html>
  <body style="font-family:Georgia,serif;max-width:480px;margin:auto;color:#1a1a1a;line-height:1.6">
    <h2 style="color:#6c63ff;border-bottom:2px solid #6c63ff;padding-bottom:8px">
      Your VocabTrainer cancellation update
    </h2>
    <p style="font-size:16px">Hello ${userNameEscaped},</p>
    <p style="font-size:16px">
      Your subscription to <strong>${planNameEscaped}</strong> has been cancelled.
      ${statusMessage}
    </p>
    <table style="width:100%;border-collapse:collapse;margin-top:16px">
      <tr>
        <td style="padding:6px 0;border-bottom:1px solid #eee"><strong>Plan:</strong></td>
        <td style="padding:6px 0;border-bottom:1px solid #eee">${planNameEscaped}</td>
      </tr>
      <tr>
        <td style="padding:6px 0;border-bottom:1px solid #eee"><strong>Refund amount:</strong></td>
        <td style="padding:6px 0;border-bottom:1px solid #eee">${refundAmountFormatted}</td>
      </tr>
      <tr>
        <td style="padding:6px 0;border-bottom:1px solid #eee"><strong>Currency:</strong></td>
        <td style="padding:6px 0;border-bottom:1px solid #eee">${currencyEscaped}</td>
      </tr>
      <tr>
        <td style="padding:6px 0;border-bottom:1px solid #eee"><strong>Refund status:</strong></td>
        <td style="padding:6px 0;border-bottom:1px solid #eee">${refundStatusEscaped}</td>
      </tr>
      <tr>
        <td style="padding:6px 0"><strong>Refund reference:</strong></td>
        <td style="padding:6px 0">${refundIdEscaped}</td>
      </tr>
    </table>
    <p style="font-size:14px;color:#666">
      If you have any questions, just reply to this email — we're happy to help.
    </p>
  </body>
</html>`;

  const text = `Your VocabTrainer cancellation update

Hello ${userName},

Your subscription to ${planName} has been cancelled.
${statusMessage}

Plan: ${planName}
Refund amount: ${refundAmountFormatted}
Currency: ${currency}
Refund status: ${refundStatus}
Refund reference: ${refundIdVal}

If you have any questions, just reply to this email — we're happy to help.
`;

  await sendEmail({
    to: userEmail,
    subject,
    html,
    text,
  });
};
