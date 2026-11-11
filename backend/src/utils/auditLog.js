import AuditLog from "../models/AuditLog.js";
import SecurityEvent from "../models/SecurityEvent.js";

/**
 * Audit logging service.
 *
 * Records administrative and security-significant actions for later
 * inspection in the admin panel. All methods are fire-and-safe: failures
 * to write an audit record must never break the request that triggered them.
 */

/** Log an administrative/audit action. */
export const logAudit = async ({
  actorId,
  actorEmail,
  actorRole,
  action,
  targetType,
  targetId,
  targetEmail,
  metadata = {},
  ip,
  userAgent,
}) => {
  try {
    await AuditLog.create({
      actorId,
      actorEmail,
      actorRole,
      action,
      targetType,
      targetId,
      targetEmail,
      metadata,
      ip,
      userAgent,
    });
  } catch (error) {
    console.error("Audit log write failed:", error.message);
  }
};

/** Log a security event. */
export const logSecurityEvent = async ({
  type,
  severity = "INFO",
  userId,
  userEmail,
  ip,
  userAgent,
  metadata = {},
}) => {
  try {
    await SecurityEvent.create({
      type,
      severity,
      userId,
      userEmail,
      ip,
      userAgent,
      metadata,
    });
  } catch (error) {
    console.error("Security event write failed:", error.message);
  }
};

export default { logAudit, logSecurityEvent };
