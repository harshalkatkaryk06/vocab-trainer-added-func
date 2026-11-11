import api from "./axios";

export const getAdminUsers = () => api.get("/admin/users");

export const getAdmins = () => api.get("/admin/admins");

export const createAdmin = (email) => api.post("/admin/admins", { email });

export const changeUserRole = (id, role) =>
  api.patch(`/admin/users/${id}/role`, { role });

export const revokeAdmin = (id) => api.delete(`/admin/admins/${id}`);

export const getAuditLogs = (params) =>
  api.get("/admin/audit-logs", { params });

export const getSecurityEvents = (params) =>
  api.get("/admin/security-events", { params });
