export interface Notification {
  id: string;
  userId: string;
  title: string;
  body: string;
  type: "PROMO" | "ORDER" | "SYSTEM" | string;
  data: any | null;
  isRead: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedNotificationsResponse {
  data: Notification[];
  total: number;
  unreadCount: number;
  page: number;
  limit: number;
}
