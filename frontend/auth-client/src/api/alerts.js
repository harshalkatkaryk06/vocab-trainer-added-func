import api from "./axios";

export const getAlerts = (params) => api.get("/alerts", { params });

export const getAlertStats = () => api.get("/alerts/stats");

export const createAlert = (data) => api.post("/alerts", data);

export const resolveAlert = (id) => api.patch(`/alerts/${id}/resolve`);
