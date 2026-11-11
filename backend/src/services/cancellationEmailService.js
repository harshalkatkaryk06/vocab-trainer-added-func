import sendEmail from "../utils/sendEmail.js";

const escapeHtml = (value) =>
  String(value ?? "").replace(/[&<>"']/g, (character) => {
    const entities = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };
    return entities[character];
  });

const formatMoney = (amount, currency) =>
  `${escapeHtml(currency)} ${(Number(amount || 0) / 100).toFixed(2)}`;

const formatDate = (value) =>
  value ? new Date(value).toLocaleString("en-IN", { timeZone: "UTC" }) : "—";

const messageShell = (title, body) => `
  <div style="font-family:Arial,sans-serif;max-width:640px;margin:0 auto;color:#222;line-height:1.6">
    <h1 style="font-size:22px;color:#4338ca">${escapeHtml(title)}</h1>
    ${body}
    <p style="margin-top:28px;color:#666;font-size:13px">VocabTrainer Support</p>
  </div>`;

export const sendCancellationRequestAcknowledgment = async ({
  to,
  userName,
  request,
  subjectPrefix = "",
}) => {
  const { refundSnapshot } = request;
  const subject = `${subjectPrefix}We received your cancellation request`;
  const body = `
    <p>Hello ${escapeHtml(userName || "there")},</p>
    <p>Your cancellation and refund request has been submitted for review. Your paid access remains active while we review it. No refund has been issued yet.</p>
    <table style="border-collapse:collapse;width:100%">
      <tr><td style="padding:6px 0"><strong>Request reference</strong></td><td>${escapeHtml(request._id)}</td></tr>
      <tr><td style="padding:6px 0"><strong>Plan</strong></td><td>${escapeHtml(refundSnapshot.planName)}</td></tr>
      <tr><td style="padding:6px 0"><strong>Expected refund</strong></td><td>${formatMoney(refundSnapshot.refundAmount, refundSnapshot.currency)}</td></tr>
      <tr><td style="padding:6px 0"><strong>Submitted</strong></td><td>${escapeHtml(formatDate(request.createdAt))}</td></tr>
    </table>
    <p>We will email you when a decision is made.</p>`;
  const text = `Hello ${userName || "there"}, your cancellation and refund request ${request._id} has been submitted for review. Your paid access remains active. Expected refund: ${refundSnapshot.currency} ${(refundSnapshot.refundAmount / 100).toFixed(2)}.`;

  return sendEmail({
    to,
    subject,
    html: messageShell("Cancellation request received", body),
    text,
  });
};

export const sendCancellationRequestReviewNotice = async ({
  to,
  request,
  customer,
  transaction,
  subjectPrefix = "",
}) => {
  const { refundSnapshot } = request;
  const reviewUrl = `${process.env.CLIENT_URL || "http://localhost:5173"}/admin/cancellation-requests`;
  const subject = `${subjectPrefix}Cancellation request needs review: ${request._id}`;
  const body = `
    <p>A customer has submitted a cancellation and refund request.</p>
    <table style="border-collapse:collapse;width:100%">
      <tr><td style="padding:6px 0"><strong>Request reference</strong></td><td>${escapeHtml(request._id)}</td></tr>
      <tr><td style="padding:6px 0"><strong>Customer</strong></td><td>${escapeHtml(customer.username)} (${escapeHtml(customer.email)})</td></tr>
      <tr><td style="padding:6px 0"><strong>Plan</strong></td><td>${escapeHtml(refundSnapshot.planName)}</td></tr>
      <tr><td style="padding:6px 0"><strong>Purchase date</strong></td><td>${escapeHtml(formatDate(transaction.paidAt || transaction.createdAt))}</td></tr>
      <tr><td style="padding:6px 0"><strong>Amount paid</strong></td><td>${formatMoney(refundSnapshot.amountPaid, refundSnapshot.currency)}</td></tr>
      <tr><td style="padding:6px 0"><strong>Expected refund</strong></td><td>${formatMoney(refundSnapshot.refundAmount, refundSnapshot.currency)}</td></tr>
      <tr><td style="padding:6px 0"><strong>Refund calculation</strong></td><td>${escapeHtml(refundSnapshot.breakdownText)}</td></tr>
      <tr><td style="padding:6px 0"><strong>Reason</strong></td><td>${escapeHtml(request.reason)}</td></tr>
      <tr><td style="padding:6px 0"><strong>Details</strong></td><td>${escapeHtml(request.details || "—")}</td></tr>
      <tr><td style="padding:6px 0"><strong>Submitted</strong></td><td>${escapeHtml(formatDate(request.createdAt))}</td></tr>
    </table>
    <p><a href="${escapeHtml(reviewUrl)}">Review cancellation requests</a></p>`;
  const text = `Request ${request._id} from ${customer.username} (${customer.email}) for ${refundSnapshot.planName}. Amount paid: ${refundSnapshot.currency} ${(refundSnapshot.amountPaid / 100).toFixed(2)}. Expected refund: ${refundSnapshot.currency} ${(refundSnapshot.refundAmount / 100).toFixed(2)}. Calculation: ${refundSnapshot.breakdownText}. Reason: ${request.reason}. Review: ${reviewUrl}`;

  return sendEmail({
    to,
    subject,
    html: messageShell("Cancellation request for review", body),
    text,
  });
};

export const sendCancellationRequestApproved = async ({
  to,
  userName,
  request,
  subjectPrefix = "",
}) => {
  const { refundSnapshot } = request;
  const refundPending = request.status === "approved";
  const subject = `${subjectPrefix}Your cancellation request was approved`;
  const reviewerNote = request.reviewerNote?.trim();
  const statusMessage = refundPending
    ? "Your cancellation was approved and your refund has been initiated to your original payment method. Refund processing time depends on your bank or payment provider."
    : "Your cancellation was approved. No refund is due under the applicable refund calculation.";
  const body = `
    <p>Hello ${escapeHtml(userName || "there")},</p>
    <p>${statusMessage}</p>
    <table style="border-collapse:collapse;width:100%">
      <tr><td style="padding:6px 0"><strong>Request reference</strong></td><td>${escapeHtml(request._id)}</td></tr>
      <tr><td style="padding:6px 0"><strong>Plan</strong></td><td>${escapeHtml(refundSnapshot.planName)}</td></tr>
      <tr><td style="padding:6px 0"><strong>Refund amount</strong></td><td>${formatMoney(refundSnapshot.refundAmount, refundSnapshot.currency)}</td></tr>
      <tr><td style="padding:6px 0"><strong>Refund reference</strong></td><td>${escapeHtml(request.razorpayRefundId || "Not applicable")}</td></tr>
      ${reviewerNote ? `<tr><td style="padding:6px 0"><strong>Super Admin message</strong></td><td>${escapeHtml(reviewerNote)}</td></tr>` : ""}
    </table>
    <p>If a refund was initiated, it will be returned to your original payment method.</p>`;
  const text = `Hello ${userName || "there"}, your cancellation request ${request._id} was approved. ${statusMessage} Refund: ${refundSnapshot.currency} ${(refundSnapshot.refundAmount / 100).toFixed(2)}.${reviewerNote ? ` Super Admin message: ${reviewerNote}` : ""}`;

  return sendEmail({
    to,
    subject,
    html: messageShell("Cancellation request approved", body),
    text,
  });
};

export const sendCancellationRequestRejected = async ({
  to,
  userName,
  request,
  subjectPrefix = "",
}) => {
  const subject = `${subjectPrefix}Update on your cancellation request`;
  const note = request.reviewerNote || "Please contact support if you have questions.";
  const body = `
    <p>Hello ${escapeHtml(userName || "there")},</p>
    <p>After review, your cancellation and refund request was not approved. Your subscription remains active.</p>
    <table style="border-collapse:collapse;width:100%">
      <tr><td style="padding:6px 0"><strong>Request reference</strong></td><td>${escapeHtml(request._id)}</td></tr>
      <tr><td style="padding:6px 0"><strong>Plan</strong></td><td>${escapeHtml(request.refundSnapshot.planName)}</td></tr>
      <tr><td style="padding:6px 0"><strong>Review note</strong></td><td>${escapeHtml(note)}</td></tr>
    </table>
    <p>Your paid access remains active.</p>`;
  const text = `Hello ${userName || "there"}, your cancellation request ${request._id} was not approved. Your subscription remains active. Review note: ${note}`;

  return sendEmail({
    to,
    subject,
    html: messageShell("Cancellation request update", body),
    text,
  });
};
