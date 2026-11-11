import User from "../models/User.js";
import AuditLog from "../models/AuditLog.js";
import logger from "../config/logger.js";

/**
 * Provisions the initial Super Admin account on startup.
 *
 * Rules:
 *  - Only provisions when NO super_admin exists in the database (idempotent,
 *    safe to run on every startup; never overwrites an existing super admin).
 *  - The email comes from SUPER_ADMIN_EMAIL env var (never from frontend).
 *  - The account's email is marked verified before the super_admin role is
 *    granted.
 *  - If no user with that email exists, a new account is created (password
 *    unset — must be set via reset flow; provider marked "system").
 *
 * Returns the provisioned (or existing) super admin user, or null if
 * SUPER_ADMIN_EMAIL is not configured.
 */
export const provisionSuperAdmin = async () => {
  const superAdminEmail =
    (process.env.SUPER_ADMIN_EMAIL || "").trim().toLowerCase();

  if (!superAdminEmail) {
    logger.warn(
      "SUPER_ADMIN_EMAIL is not set — skipping initial Super Admin provisioning"
    );
    return null;
  }

  // Never overwrite an existing super admin.
  const existingSuperAdmin = await User.findOne({ role: "super_admin" });
  if (existingSuperAdmin) {
    logger.info(
      `Super Admin already exists: ${existingSuperAdmin.email} (id ${existingSuperAdmin._id})`
    );
    return existingSuperAdmin;
  }

  // Look for an existing account with the configured email.
  let user = await User.findOne({ email: superAdminEmail });

  if (!user) {
    // Create the account. No password set; the admin must set one via the
    // password-reset flow before first login.
    user = await User.create({
      username: superAdminEmail.split("@")[0].toLowerCase(),
      email: superAdminEmail,
      password: null,
      provider: "local",
      role: "super_admin",
      isEmailVerified: true,
      emailVerifiedAt: new Date(),
    });

    await AuditLog.create({
      actorId: user._id,
      actorEmail: user.email,
      actorRole: "super_admin",
      action: "super_admin_provisioned",
      targetType: "User",
      targetId: user._id,
      targetEmail: user.email,
      metadata: { source: "startup", email: superAdminEmail },
    });

    logger.info(
      `Initial Super Admin provisioned: ${user.email} (id ${user._id})`
    );
  } else {
    // Promote existing account only when no super_admin exists.
    user.role = "super_admin";
    user.isEmailVerified = true;
    user.emailVerifiedAt = new Date();
    await user.save();

    await AuditLog.create({
      actorId: user._id,
      actorEmail: user.email,
      actorRole: "super_admin",
      action: "super_admin_promoted",
      targetType: "User",
      targetId: user._id,
      targetEmail: user.email,
      metadata: { source: "startup", previousRole: user.role },
    });

    logger.info(
      `Existing account promoted to Super Admin: ${user.email} (id ${user._id})`
    );
  }

  return user;
};

export default { provisionSuperAdmin };
