import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getAlerts, getAlertStats, resolveAlert } from "../api/alerts";
import { fetchApiData } from "./apiData";

export const alertQueryKeys = {
  alerts: (userId, params) => ["alerts", userId, params],
  stats: (userId) => ["alertStats", userId],
};

export function useAlerts(userId, params) {
  return useQuery({
    queryKey: alertQueryKeys.alerts(userId, params),
    queryFn: () => fetchApiData(() => getAlerts(params)),
    enabled: Boolean(userId),
    staleTime: 15 * 1000,
  });
}

export function useAlertStats(userId) {
  return useQuery({
    queryKey: alertQueryKeys.stats(userId),
    queryFn: () => fetchApiData(getAlertStats),
    enabled: Boolean(userId),
    staleTime: 15 * 1000,
  });
}

export function useResolveAlert(userId) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: resolveAlert,
    onSuccess: async (_, alertId) => {
      queryClient.setQueriesData({ queryKey: ["alerts", userId] }, (current) =>
        current
          ? {
              ...current,
              data: current.data.filter((alert) => alert._id !== alertId),
            }
          : current
      );
      await queryClient.invalidateQueries({
        queryKey: alertQueryKeys.stats(userId),
      });
      await queryClient.invalidateQueries({
        queryKey: ["adminSystemHealth", userId],
      });
    },
  });
}
