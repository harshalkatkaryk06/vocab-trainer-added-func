import { useQuery } from "@tanstack/react-query";
import {
  getPlans,
  getMyEntitlement,
  getPaymentHistory,
  getMyCancelRequest,
  cancelPreview,
  getAllPlansAdmin,
  getAllSubscriptions,
  getSystemHealth,
  getAdminCancellationRequests,
} from "../api/subscriptions";
import { getQuizAttempts } from "../api/quiz";
import { fetchApiData } from "./apiData";

export const subscriptionQueryKeys = {
  plans: ["subscriptionPlans"],
  entitlement: (userId) => ["subscriptionEntitlement", userId],
  paymentHistory: (userId) => ["paymentHistory", userId],
  cancelRequest: (userId) => ["myCancelRequest", userId],
  cancelPreview: (userId) => ["cancelPreview", userId],
  quizAttempts: (userId) => ["quizAttempts", userId],
  adminPlans: (userId) => ["adminPlans", userId],
  adminSubscriptions: (userId, params) =>
    params === undefined
      ? ["adminSubscriptions", userId]
      : ["adminSubscriptions", userId, params],
  systemHealth: (userId) => ["adminSystemHealth", userId],
  adminCancellationRequests: (userId, params) =>
    params === undefined
      ? ["adminCancellationRequests", userId]
      : ["adminCancellationRequests", userId, params],
};

export function usePlanCatalog() {
  return useQuery({
    queryKey: subscriptionQueryKeys.plans,
    queryFn: () => fetchApiData(getPlans),
    staleTime: 10 * 60 * 1000,
  });
}

export function useMyEntitlement(userId) {
  return useQuery({
    queryKey: subscriptionQueryKeys.entitlement(userId),
    queryFn: () => fetchApiData(getMyEntitlement),
    enabled: Boolean(userId),
    staleTime: 30 * 1000,
  });
}

export function usePaymentHistory(userId) {
  return useQuery({
    queryKey: subscriptionQueryKeys.paymentHistory(userId),
    queryFn: () => fetchApiData(getPaymentHistory),
    enabled: Boolean(userId),
    staleTime: 2 * 60 * 1000,
  });
}

export function useMyCancelRequest(userId) {
  return useQuery({
    queryKey: subscriptionQueryKeys.cancelRequest(userId),
    queryFn: () => fetchApiData(getMyCancelRequest),
    enabled: Boolean(userId),
    staleTime: 15 * 1000,
  });
}

export function useCancelPreview(userId) {
  return useQuery({
    queryKey: subscriptionQueryKeys.cancelPreview(userId),
    queryFn: () => fetchApiData(cancelPreview),
    enabled: Boolean(userId),
    staleTime: 15 * 1000,
  });
}

export function useQuizAttempts(userId) {
  return useQuery({
    queryKey: subscriptionQueryKeys.quizAttempts(userId),
    queryFn: () => fetchApiData(getQuizAttempts),
    enabled: Boolean(userId),
    staleTime: 2 * 60 * 1000,
  });
}

export function useAdminPlans(userId) {
  return useQuery({
    queryKey: subscriptionQueryKeys.adminPlans(userId),
    queryFn: () => fetchApiData(getAllPlansAdmin),
    enabled: Boolean(userId),
    staleTime: 5 * 60 * 1000,
  });
}

export function useAdminSubscriptions(userId, params = {}) {
  return useQuery({
    queryKey: subscriptionQueryKeys.adminSubscriptions(userId, params),
    queryFn: () => fetchApiData(() => getAllSubscriptions(params)),
    enabled: Boolean(userId),
  });
}

export function useAdminSystemHealth(userId) {
  return useQuery({
    queryKey: subscriptionQueryKeys.systemHealth(userId),
    queryFn: () => fetchApiData(getSystemHealth),
    enabled: Boolean(userId),
    staleTime: 15 * 1000,
  });
}

export function useAdminCancellationRequests(userId, params) {
  return useQuery({
    queryKey: subscriptionQueryKeys.adminCancellationRequests(userId, params),
    queryFn: () => fetchApiData(() => getAdminCancellationRequests(params)),
    enabled: Boolean(userId),
    staleTime: 15 * 1000,
  });
}
