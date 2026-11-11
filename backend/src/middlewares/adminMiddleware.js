// Gate routes to admins and super admins. MUST run AFTER authMiddleware so req.user exists.
// Role precedence: user < admin < super_admin.
const adminMiddleware = (req, res, next) => {
  const role = req.user?.role;
  if (role !== "admin" && role !== "super_admin") {
    return res.status(403).json({ success: false, message: "Admin access required" });
  }
  next();
};

export default adminMiddleware;
