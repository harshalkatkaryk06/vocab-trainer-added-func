/**
 * Role-based authorization middleware.
 *
 * These run AFTER authMiddleware so req.user is populated (contains
 * userId, email, role). Role information is never trusted from the
 * frontend — it is always read from the backend JWT / database.
 *
 * Role precedence: user < admin < super_admin.
 */

const ROLE_RANK = {
  user: 0,
  admin: 1,
  super_admin: 2,
};

/** Allow only the listed roles. Usage: requireRole("super_admin") or requireRole("admin", "super_admin") */
export const requireRole = (...allowedRoles) => {
  return (req, res, next) => {
    const userRole = req.user?.role;
    if (!userRole || !allowedRoles.includes(userRole)) {
      return res.status(403).json({
        success: false,
        message: "Insufficient role for this operation",
      });
    }
    next();
  };
};

/** Allow admin or super_admin. */
export const requireAdminOrAbove = (req, res, next) => {
  const userRole = req.user?.role;
  if (!userRole || ROLE_RANK[userRole] < ROLE_RANK.admin) {
    return res.status(403).json({
      success: false,
      message: "Admin access required",
    });
  }
  next();
};

/** Allow only super_admin. */
export const requireSuperAdmin = (req, res, next) => {
  const userRole = req.user?.role;
  if (userRole !== "super_admin") {
    return res.status(403).json({
      success: false,
      message: "Super Admin access required",
    });
  }
  next();
};

export default { requireRole, requireAdminOrAbove, requireSuperAdmin };
