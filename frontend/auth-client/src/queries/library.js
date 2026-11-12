import { useQuery } from "@tanstack/react-query";
import { getLibrary } from "../api/words";

export const libraryQueryKey = (userId) => ["library", userId];

export function useLibrary(userId) {
  return useQuery({
    queryKey: libraryQueryKey(userId),
    queryFn: async ({ signal }) => {
      const response = await getLibrary({ signal });
      if (!response.data.success) {
        throw new Error(response.data.message || "Could not load your library.");
      }
      return response.data.data;
    },
    enabled: Boolean(userId),
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
}
