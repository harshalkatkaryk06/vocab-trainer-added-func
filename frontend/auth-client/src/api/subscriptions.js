import api from "./axios";

export const getPlans = () => api.get("/subscriptions/plans");

export const getMyEntitlement = () => api.get("/subscriptions/me");

export const getSubscriptionHistory = () => api.get("/subscriptions/history");

export const grantAccess = (email, durationDays, planId) =>
  api.post("/subscriptions/grant", { email, durationDays, planId });

export const revokeAccess = (id, reason) =>
  api.post(`/subscriptions/revoke/${id}`, { reason });

export const savePlan = (planData) => api.post("/subscriptions/plans", planData);

export const createOrder = (planId) => api.post("/payments/order", { planId });

export const verifyPayment = (payload) =>
  api.post("/payments/verify", payload);

export const getPaymentHistory = () => api.get("/payments/history");

export const getAllPayments = () => api.get("/payments/admin/all");

export const getAllPlansAdmin = () => api.get("/admin/subscriptions/plans");

export const getAllSubscriptions = (params) =>
  api.get("/admin/subscriptions", { params });

export const getAIUsageStats = (params) =>
  api.get("/admin/ai-usage", { params });

export const getSystemHealth = () => api.get("/admin/system-health");

export const cancelPreview = () => api.get("/subscriptions/cancel/preview");

export const getMyCancelRequest = () =>
  api.get("/subscriptions/cancel/request");

export const submitCancelRequest = (payload) =>
  api.post("/subscriptions/cancel", payload);

export const getCancellationRequests = () =>
  api.get("/subscriptions/cancellation-requests");

export const getAdminCancellationRequests = (params) =>
  api.get("/admin/cancellation-requests", { params });

export const approveCancellationRequest = (id, reviewerNote) =>
  api.post(`/admin/cancellation-requests/${id}/approve`, { reviewerNote });

export const rejectCancellationRequest = (id, reviewerNote) =>
  api.post(`/admin/cancellation-requests/${id}/reject`, { reviewerNote });
