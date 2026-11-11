import { Resend } from "resend";
import AlertEvent from "../models/AlertEvent.js";
import logger from "../config/logger.js";

// 1. FIX: the old code used require("resend") inside this file. The backend is an
//    ES module ("type": "module" in package.json), so `require` does not exist and
//    every email attempt crashed with "require is not defined". That error was caught
//    and logged, which is why alerts were saved in the DB but no email was ever sent.
//    We now use a normal ES import at the top of the file instead.
let resend = null;

const getResend = () => {
  // 2. Create the Resend client once and reuse it, only if an API key exists
  if (!resend && process.env.RESEND_API_KEY) {
    resend = new Resend(process.env.RESEND_API_KEY);
  }
  return resend;
};

/**
 * Alert severity levels: INFO, WARNING, CRITICAL
 * Categories: authentication, application, security, payment, system
 */

/**
 * Creates and stores an alert event. Optionally sends an email notification
 * via Resend if configured and the alert meets notification criteria.
 *
 * Fire-and-safe: failures never break the request that triggered them.
 */
export const createAlert = async ({
  type,
  category,
  severity = "INFO",
  title,
  description = "",
  userId,
  userEmail,
  ip,
  userAgent,
  metadata = {},
  notify = false,
}) => {
  try {
    // 3. Always store the alert in MongoDB first (this is what the admin
    //    dashboard Alert pages read from, even if the email fails)
    const alert = await AlertEvent.create({
      type,
      category,
      severity,
      title,
      description,
      userId,
      userEmail,
      ip,
      userAgent,
      metadata,
      notified: false,
    });

    // 3b. TEMPORARY DEBUG LOG: shows on every alert why an email is or is not sent.
    //     Remove this once emails work.
    logger.info(
      `createAlert: type=${type}, notify=${notify}, hasApiKey=${Boolean(process.env.RESEND_API_KEY)}, alertEmail=${process.env.ALERT_EMAIL}`
    );

    // 4. Send the email only if requested and both env values are present
    if (notify && process.env.RESEND_API_KEY && process.env.ALERT_EMAIL) {
      try {
        await sendAlertEmail({
          to: process.env.ALERT_EMAIL,
          subject: `[${severity}] VocabTrainer Alert: ${title}`,
          severity,
          type,
          description,
          userEmail,
          ip,
          metadata,
        });

        // 5. Mark as notified only after Resend really accepted the email
        alert.notified = true;
        alert.notifiedAt = new Date();
        await alert.save();
      } catch (mailErr) {
        logger.error(`Alert email send failed: ${mailErr.message}`);
      }
    }

    return alert;
  } catch (error) {
    logger.error(`Alert event creation failed: ${error.message}`);
    return null;
  }
};

/**
 * Send an alert email via Resend.
 */
const sendAlertEmail = async ({
  to,
  subject,
  severity,
  type,
  description,
  userEmail,
  ip,
  metadata,
}) => {
  const resendClient = getResend();
  if (!resendClient) {
    // Resend not configured — skip silently (test doubles cover this in tests)
    return;
  }

  const severityColors = {
    INFO: "#7c6cff",
    WARNING: "#f59e0b",
    CRITICAL: "#fb7185",
  };
  const severityColor = severityColors[severity] || "#7c6cff";

  const html = `
    <div style="font-family:Georgia,serif;max-width:600px;margin:auto;color:#1a1a1a">
      <h2 style="color:${severityColor};border-bottom:2px solid ${severityColor};padding-bottom:8px">
        VocabTrainer Alert — ${severity}
      </h2>
      <table style="width:100%;border-collapse:collapse;margin-top:16px">
        <tr><td style="padding:6px 0;border-bottom:1px solid #eee"><strong>Type:</strong></td><td style="padding:6px 0;border-bottom:1px solid #eee">${type}</td></tr>
        <tr><td style="padding:6px 0;border-bottom:1px solid #eee"><strong>Category:</strong></td><td style="padding:6px 0;border-bottom:1px solid #eee">${metadata.category || ""}</td></tr>
        <tr><td style="padding:6px 0;border-bottom:1px solid #eee"><strong>Description:</strong></td><td style="padding:6px 0;border-bottom:1px solid #eee">${description}</td></tr>
        <tr><td style="padding:6px 0;border-bottom:1px solid #eee"><strong>User:</strong></td><td style="padding:6px 0;border-bottom:1px solid #eee">${userEmail || "—"}</td></tr>
        <tr><td style="padding:6px 0;border-bottom:1px solid #eee"><strong>IP:</strong></td><td style="padding:6px 0;border-bottom:1px solid #eee">${ip || "—"}</td></tr>
        <tr><td style="padding:6px 0"><strong>Time:</strong></td><td style="padding:6px 0">${new Date().toISOString()}</td></tr>
      </table>
      ${Object.keys(metadata || {}).length > 0 ? `
        <div style="margin-top:16px">
          <strong>Details:</strong>
          <pre style="background:#f5f5f5;padding:12px;border-radius:6px;font-size:13px">${JSON.stringify(metadata, null, 2)}</pre>
        </div>` : ""
      }
      <p style="margin-top:24px;font-size:12px;color:#666">VocabTrainer Security Monitoring</p>
    </div>`;

  const senderName = process.env.RESEND_SENDER_NAME || "VocabTrainer";
  const senderEmail = process.env.RESEND_SENDER_EMAIL || "onboarding@resend.dev";
  const fromAddress = `${senderName} <${senderEmail}>`;

  // 6. Send the email and keep the whole result
  const result = await resendClient.emails.send({
    from: fromAddress,
    to,
    subject,
    html,
  });

  // 7. FIX: the Resend SDK does NOT throw on failure, it returns { data, error }.
  //    Before, a rejected email (bad recipient, bad key, unverified sender) looked
  //    like a success. Now we throw so the caller logs it and notified stays false.
  if (result.error) {
    throw new Error(`${result.error.name || "ResendError"}: ${result.error.message}`);
  }

  // 8. Log the Resend email id so you can find this exact email in the dashboard
  logger.info(`Alert email accepted by Resend, id=${result.data.id}, to=${to}`);
};

/**
 * Deduplication check: returns true if a similar alert was already created
 * within the throttle window (default 10 minutes).
 */
export const isDuplicateAlert = async (type, userEmail, windowMinutes = 10) => {
  try {
    const windowStart = new Date(Date.now() - windowMinutes * 60 * 1000);
    const existing = await AlertEvent.findOne({
      type,
      userEmail,
      createdAt: { $gt: windowStart },
    });
    return !!existing;
  } catch (error) {
    logger.error(`Duplicate alert check failed: ${error.message}`);
    return false;
  }
};

export default { createAlert, isDuplicateAlert, sendAlertEmail };