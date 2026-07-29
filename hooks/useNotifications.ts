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
    onMutate: async (id: string) => {
      await queryClient.cancelQueries({ queryKey: ["notifications"] });

      queryClient.setQueriesData({ queryKey: ["notifications"] }, (oldData: any) => {
        if (!oldData || !oldData.pages) return oldData;

        let wasUnread = false;
        const newPages = oldData.pages.map((page: PaginatedNotificationsResponse) => {
          const updatedList = page.data.map((n) => {
            if (n.id === id && !n.isRead) {
              wasUnread = true;
              return { ...n, isRead: true };
            }
            return n;
          });
          return { ...page, data: updatedList };
        });

        if (wasUnread) {
          newPages[0] = {
            ...newPages[0],
            unreadCount: Math.max(0, (newPages[0].unreadCount || 1) - 1),
          };
        }

        return { ...oldData, pages: newPages };
      });
    },
    onSettled: () => {
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
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ["notifications"] });

      queryClient.setQueriesData({ queryKey: ["notifications"] }, (oldData: any) => {
        if (!oldData || !oldData.pages) return oldData;

        const newPages = oldData.pages.map((page: PaginatedNotificationsResponse) => ({
          ...page,
          unreadCount: 0,
          data: page.data.map((n) => ({ ...n, isRead: true })),
        }));

        return { ...oldData, pages: newPages };
      });
    },
    onSettled: () => {
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
