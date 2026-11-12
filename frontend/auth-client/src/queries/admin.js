import { useQuery } from "@tanstack/react-query";
import {
  getAdminUsers,
  getAdmins,
  getAuditLogs,
  getSecurityEvents,
} from "../api/admin";
import { getAllPayments, getCancellationRequests } from "../api/subscriptions";
import { fetchApiData } from "./apiData";

export const adminQueryKeys = {
  users: (userId) => ["adminUsers", userId],
  admins: (userId) => ["admins", userId],
  auditLogs: (userId, params) =>
    params === undefined ? ["auditLogs", userId] : ["auditLogs", userId, params],
  securityEvents: (userId, params) =>
    params === undefined ? ["securityEvents", userId] : ["securityEvents", userId, params],
  payments: (userId) => ["adminPayments", userId],
  cancellationRequests: (userId) => ["paymentCancellationRequests", userId],
};

export function useAdminUsers(userId) {
  return useQuery({
    queryKey: adminQueryKeys.users(userId),
    queryFn: () => fetchApiData(getAdminUsers),
    enabled: Boolean(userId),
  });
}

export function useAdmins(userId) {
  return useQuery({
    queryKey: adminQueryKeys.admins(userId),
    queryFn: () => fetchApiData(getAdmins),
    enabled: Boolean(userId),
  });
}

export function useAuditLogs(userId, params) {
  return useQuery({
    queryKey: adminQueryKeys.auditLogs(userId, params),
    queryFn: () => fetchApiData(() => getAuditLogs(params)),
    enabled: Boolean(userId),
  });
}

export function useSecurityEvents(userId, params) {
  return useQuery({
    queryKey: adminQueryKeys.securityEvents(userId, params),
    queryFn: () => fetchApiData(() => getSecurityEvents(params)),
    enabled: Boolean(userId),
  });
}

export function useAdminPayments(userId) {
  return useQuery({
    queryKey: adminQueryKeys.payments(userId),
    queryFn: () => fetchApiData(getAllPayments),
    enabled: Boolean(userId),
  });
}

export function usePaymentCancellationRequests(userId, enabled) {
  return useQuery({
    queryKey: adminQueryKeys.cancellationRequests(userId),
    queryFn: () => fetchApiData(getCancellationRequests),
    enabled: Boolean(userId) && enabled,
    staleTime: 15 * 1000,
  });
}
