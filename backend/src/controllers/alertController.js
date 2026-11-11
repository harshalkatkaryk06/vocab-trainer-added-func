import AlertEvent from "../models/AlertEvent.js";
import { createAlert, isDuplicateAlert } from "../services/alertService.js";
import { ApiError } from "../utils/ApiError.js";
import asyncHandler from "../utils/asyncHandler.js";

const reqMeta = (req) => ({
  ip: req.ip,
  userAgent: req.get("User-Agent") || undefined,
});

/**
 * GET /api/v1/alerts — list alert events (admin/super_admin)
 * Query: category, severity, resolved, page, limit
 */
export const listAlerts = asyncHandler(async (req, res) => {
  const { page = 1, limit = 50, category, severity, resolved } = req.query;
  const pageNum = Math.max(parseInt(String(page), 10) || 1, 1);
  const limitNum = Math.min(Math.max(parseInt(String(limit), 10) || 50, 1), 100);

  const filter = {};
  if (category) filter.category = category;
  if (severity) filter.severity = severity;
  if (resolved !== undefined) filter.resolved = resolved === "true";

  const [alerts, total] = await Promise.all([
    AlertEvent.find(filter)
      .select("-__v")
      .sort({ createdAt: -1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum)
      .lean(),
    AlertEvent.countDocuments(filter),
  ]);

  return res.status(200).json({
    success: true,
    count: alerts.length,
    total,
    page: pageNum,
    limit: limitNum,
    data: alerts,
  });
});

/**
 * POST /api/v1/alerts — manually create an alert (admin/super_admin)
 */
export const createAlertManual = asyncHandler(async (req, res) => {
  const { type, category, severity, title, description, notify } = req.body;

  if (!type || !category || !title) {
    throw new ApiError("type, category, and title are required", 400);
  }

  const alert = await createAlert({
    type,
    category,
    severity,
    title,
    description,
    userId: req.user.userId,
    userEmail: req.user.email,
    ...reqMeta(req),
    notify: notify === true,
  });

  if (!alert) {
    throw new ApiError("Failed to create alert", 500);
  }

  return res.status(201).json({ success: true, data: alert });
});

/**
 * PATCH /api/v1/alerts/:id/resolve — mark an alert as resolved
 */
export const resolveAlert = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const alert = await AlertEvent.findByIdAndUpdate(
    id,
    { resolved: true, resolvedAt: new Date() },
    { new: true }
  );

  if (!alert) {
    throw new ApiError("Alert not found", 404);
  }

  return res.status(200).json({ success: true, data: alert });
});

/**
 * GET /api/v1/alerts/stats — alert statistics for dashboard
 */
export const getAlertStats = asyncHandler(async (req, res) => {
  const now = new Date();
  const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const last7d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const [total24h, critical24h, byCategory, bySeverity] = await Promise.all([
    AlertEvent.countDocuments({ createdAt: { $gt: last24h } }),
    AlertEvent.countDocuments({
      createdAt: { $gt: last24h },
      severity: "CRITICAL",
    }),
    AlertEvent.aggregate([
      { $match: { createdAt: { $gt: last7d } } },
      { $group: { _id: "$category", count: { $sum: 1 } } },
    ]),
    AlertEvent.aggregate([
      { $match: { createdAt: { $gt: last7d } } },
      { $group: { _id: "$severity", count: { $sum: 1 } } },
    ]),
  ]);

  return res.status(200).json({
    success: true,
    data: {
      total24h,
      critical24h,
      byCategory,
      bySeverity,
    },
  });
});

export default { listAlerts, createAlertManual, resolveAlert, getAlertStats };
