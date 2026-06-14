import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import apiClient from "@/lib/axios";
import { PaginatedNotificationsResponse, Notification } from "../types/notification";

// ── Notifications Queries ──────────────────────────────────────────────────

/** Fetch notifications with standard pagination */
export const useNotifications = (page = 1, limit = 20) => {
  return useQuery<PaginatedNotificationsResponse>({
    queryKey: ["notifications", "paginated", page, limit],
    queryFn: async (): Promise<PaginatedNotificationsResponse> => {
      const { data } = await apiClient.get("/api/notifications", {
        params: { page, limit },
      });
      return data;
    },
  });
};

const NOTIFICATIONS_PAGE_LIMIT = 20;

/** Fetch notifications with infinite scroll */
export const useInfiniteNotifications = (limit = NOTIFICATIONS_PAGE_LIMIT) => {
  return useInfiniteQuery<PaginatedNotificationsResponse>({
    queryKey: ["notifications", "infinite", limit],
    queryFn: async ({ pageParam }) => {
      const { data } = await apiClient.get("/api/notifications", {
        params: { page: pageParam, limit },
      });
      return data;
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      const { page, total, limit: pageLimit } = lastPage;
      const totalPages = Math.ceil(total / pageLimit);
      return page < totalPages ? page + 1 : undefined;
    },
  });
};

// ── Notifications Mutations ────────────────────────────────────────────────

/** Mark a single notification as read */
export const useMarkNotificationAsRead = () => {
  const queryClient = useQueryClient();
  return useMutation<any, Error, string>({
    mutationFn: async (id: string) => {
      const { data } = await apiClient.patch(`/api/notifications/${id}/read`);
      return data;
    },
    onSuccess: () => {
      // Invalidate queries to refresh notifications list & unread counts
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
};

/** Mark all notifications as read */
export const useMarkAllNotificationsAsRead = () => {
  const queryClient = useQueryClient();
  return useMutation<any, Error, void>({
    mutationFn: async () => {
      const { data } = await apiClient.patch("/api/notifications/read-all");
      return data;
    },
    onSuccess: () => {
      // Invalidate queries to refresh notifications list & unread counts
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
};

/** Register an Expo push token for the current session */
export const useRegisterPushToken = () => {
  return useMutation<any, Error, string>({
    mutationFn: async (token: string) => {
      const { data } = await apiClient.post("/api/notifications/register-push-token", { token });
      return data;
    },
  });
};

/** Update or clear the push token for the current session */
export const useUpdatePushToken = () => {
  return useMutation<any, Error, string | null>({
    mutationFn: async (token: string | null) => {
      const { data } = await apiClient.patch("/api/notifications/push-token", { token });
      return data;
    },
  });
};
