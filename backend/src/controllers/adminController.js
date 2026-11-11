import User from "../models/User.js";
import AuditLog from "../models/AuditLog.js";
import SecurityEvent from "../models/SecurityEvent.js";
import { logAudit, logSecurityEvent } from "../utils/auditLog.js";
import { ApiError } from "../utils/ApiError.js";
import asyncHandler from "../utils/asyncHandler.js";

/** Helper: extract request metadata for audit logging. */
const reqMeta = (req) => ({
  ip: req.ip,
  userAgent: req.get("User-Agent") || undefined,
});

/**
 * GET /api/v1/admin/users
 * List all users (admin or super_admin).
 */
export const listUsers = asyncHandler(async (req, res) => {
  const users = await User.find({})
    .select("-password -refreshTokens -resetTokenHash")
    .sort({ createdAt: -1 })
    .lean();

  await logAudit({
    actorId: req.user.userId,
    actorEmail: req.user.email,
    actorRole: req.user.role,
    action: "admin_list_users",
    targetType: "User",
    metadata: { count: users.length },
    ...reqMeta(req),
  });

  return res.status(200).json({ success: true, count: users.length, data: users });
});

/**
 * GET /api/v1/admin/admins
 * List all admin and super_admin accounts (super_admin only).
 */
export const listAdmins = asyncHandler(async (req, res) => {
  const admins = await User.find({
    role: { $in: ["admin", "super_admin"] },
  })
    .select("-password -refreshTokens -resetTokenHash")
    .sort({ role: -1, createdAt: -1 })
    .lean();

  await logAudit({
    actorId: req.user.userId,
    actorEmail: req.user.email,
    actorRole: req.user.role,
    action: "admin_list_admins",
    targetType: "User",
    metadata: { count: admins.length },
    ...reqMeta(req),
  });

  return res.status(200).json({ success: true, count: admins.length, data: admins });
});

/**
 * POST /api/v1/admin/admins
 * Create/promote a user to admin by email (super_admin only).
 * The target email must belong to an existing, email-verified user.
 */
export const createAdmin = asyncHandler(async (req, res) => {
  const { email } = req.body;

  if (!email || typeof email !== "string") {
    throw new ApiError("Email is required", 400);
  }

  const targetEmail = email.trim().toLowerCase();

  const targetUser = await User.findOne({ email: targetEmail });
  if (!targetUser) {
    throw new ApiError("No user found with that email", 404);
  }

  if (!targetUser.isEmailVerified) {
    throw new ApiError("Account email is not verified", 400);
  }

  if (targetUser.role === "super_admin") {
    throw new ApiError("User is already a Super Admin", 409);
  }

  if (targetUser.role === "admin") {
    throw new ApiError("User is already an admin", 409);
  }

  const previousRole = targetUser.role;
  targetUser.role = "admin";
  await targetUser.save();

  await logAudit({
    actorId: req.user.userId,
    actorEmail: req.user.email,
    actorRole: req.user.role,
    action: "admin_created",
    targetType: "User",
    targetId: targetUser._id,
    targetEmail: targetUser.email,
    metadata: { previousRole, newRole: "admin", grantedBy: req.user.email },
    ...reqMeta(req),
  });

  await logSecurityEvent({
    type: "privilege_change",
    severity: "WARNING",
    userId: targetUser._id,
    userEmail: targetUser.email,
    metadata: {
      action: "promoted_to_admin",
      grantedBy: req.user.email,
      previousRole,
    },
    ...reqMeta(req),
  });

  return res.status(200).json({
    success: true,
    message: "User promoted to admin",
    user: {
      id: targetUser._id,
      username: targetUser.username,
      email: targetUser.email,
      role: targetUser.role,
      isEmailVerified: targetUser.isEmailVerified,
    },
  });
});

/**
 * PATCH /api/v1/admin/users/:id/role
 * Change a user's role (super_admin only).
 * Protects the initial Super Admin from demotion/deletion.
 */
export const changeUserRole = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { role } = req.body;

  if (!role || !["user", "admin", "super_admin"].includes(role)) {
    throw new ApiError("Valid role is required (user, admin, super_admin)", 400);
  }

  const targetUser = await User.findById(id);
  if (!targetUser) {
    throw new ApiError("User not found", 404);
  }

  // Protect the initial Super Admin from demotion.
  if (targetUser.role === "super_admin" && role !== "super_admin") {
    throw new ApiError("Cannot demote the initial Super Admin", 403);
  }

  // Prevent non-super_admin (shouldn't reach here due to middleware, but defense in depth).
  if (req.user.role !== "super_admin") {
    throw new ApiError("Only Super Admin can change roles", 403);
  }

  const previousRole = targetUser.role;
  if (previousRole === role) {
    throw new ApiError(`User already has the ${role} role`, 409);
  }

  targetUser.role = role;
  await targetUser.save();

  await logAudit({
    actorId: req.user.userId,
    actorEmail: req.user.email,
    actorRole: req.user.role,
    action: "admin_role_changed",
    targetType: "User",
    targetId: targetUser._id,
    targetEmail: targetUser.email,
    metadata: { previousRole, newRole: role, changedBy: req.user.email },
    ...reqMeta(req),
  });

  await logSecurityEvent({
    type: "privilege_change",
    severity: previousRole === "super_admin" || role === "super_admin" ? "CRITICAL" : "WARNING",
    userId: targetUser._id,
    userEmail: targetUser.email,
    metadata: {
      action: `role_changed_${previousRole}_to_${role}`,
      changedBy: req.user.email,
      previousRole,
      newRole: role,
    },
    ...reqMeta(req),
  });

  return res.status(200).json({
    success: true,
    message: `User role changed to ${role}`,
    user: {
      id: targetUser._id,
      username: targetUser.username,
      email: targetUser.email,
      role: targetUser.role,
    },
  });
});

/**
 * DELETE /api/v1/admin/admins/:id
 * Revoke admin privileges (demote to user) (super_admin only).
 * Protects the initial Super Admin.
 */
export const revokeAdmin = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const targetUser = await User.findById(id);
  if (!targetUser) {
    throw new ApiError("User not found", 404);
  }

  if (targetUser.role === "super_admin") {
    throw new ApiError("Cannot revoke the initial Super Admin", 403);
  }

  if (targetUser.role === "user") {
    throw new ApiError("User is not an admin", 409);
  }

  const previousRole = targetUser.role;
  targetUser.role = "user";
  await targetUser.save();

  await logAudit({
    actorId: req.user.userId,
    actorEmail: req.user.email,
    actorRole: req.user.role,
    action: "admin_revoked",
    targetType: "User",
    targetId: targetUser._id,
    targetEmail: targetUser.email,
    metadata: { previousRole, newRole: "user", revokedBy: req.user.email },
    ...reqMeta(req),
  });

  await logSecurityEvent({
    type: "privilege_change",
    severity: "WARNING",
    userId: targetUser._id,
    userEmail: targetUser.email,
    metadata: {
      action: "admin_revoked",
      revokedBy: req.user.email,
      previousRole,
      newRole: "user",
    },
    ...reqMeta(req),
  });

  return res.status(200).json({
    success: true,
    message: "Admin privileges revoked",
    user: {
      id: targetUser._id,
      username: targetUser.username,
      email: targetUser.email,
      role: targetUser.role,
    },
  });
});

/**
 * GET /api/v1/admin/audit-logs
 * View audit logs (admin or super_admin).
 */
export const getAuditLogs = asyncHandler(async (req, res) => {
  const { page = 1, limit = 50 } = req.query;
  const pageNum = Math.max(parseInt(String(page), 10) || 1, 1);
  const limitNum = Math.min(Math.max(parseInt(String(limit), 10) || 50, 1), 100);

  const [logs, total] = await Promise.all([
    AuditLog.find({})
      .select("-__v")
      .sort({ createdAt: -1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum)
      .lean(),
    AuditLog.countDocuments({}),
  ]);

  await logAudit({
    actorId: req.user.userId,
    actorEmail: req.user.email,
    actorRole: req.user.role,
    action: "admin_view_audit_logs",
    targetType: "AuditLog",
    metadata: { page: pageNum, limit: limitNum, total },
    ...reqMeta(req),
  });

  return res.status(200).json({
    success: true,
    count: logs.length,
    total,
    page: pageNum,
    limit: limitNum,
    data: logs,
  });
});

/**
 * GET /api/v1/admin/security-events
 * View security events (admin or super_admin).
 */
export const getSecurityEvents = asyncHandler(async (req, res) => {
  const { page = 1, limit = 50, severity } = req.query;
  const pageNum = Math.max(parseInt(String(page), 10) || 1, 1);
  const limitNum = Math.min(Math.max(parseInt(String(limit), 10) || 50, 1), 100);

  const filter = {};
  if (severity) filter.severity = severity;

  const [events, total] = await Promise.all([
    SecurityEvent.find(filter)
      .select("-__v")
      .sort({ createdAt: -1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum)
      .lean(),
    SecurityEvent.countDocuments(filter),
  ]);

  await logAudit({
    actorId: req.user.userId,
    actorEmail: req.user.email,
    actorRole: req.user.role,
    action: "admin_view_security_events",
    targetType: "SecurityEvent",
    metadata: { page: pageNum, limit: limitNum, total, filter },
    ...reqMeta(req),
  });

  return res.status(200).json({
    success: true,
    count: events.length,
    total,
    page: pageNum,
    limit: limitNum,
    data: events,
  });
});
