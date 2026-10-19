import { apiFetch } from "../config";
import {
  FavoriteRead,
  FavoriteToggled,
  ConversationListItem,
  ConversationRead,
  MessageRead,
  MessageCreate,
  NotificationRead,
  UnreadCountRead,
  Page,
} from "../types";

export const engagementService = {
  // --- Favorites ---
  async getFavorites(): Promise<FavoriteRead[]> {
    return apiFetch<FavoriteRead[]>("/api/v1/favorites");
  },

  async toggleFavorite(venueId: number): Promise<FavoriteToggled> {
    return apiFetch<FavoriteToggled>("/api/v1/favorites", {
      method: "POST",
      body: JSON.stringify({ venue_id: venueId }),
    });
  },

  async removeFavorite(venueId: number): Promise<void> {
    return apiFetch<void>(`/api/v1/favorites/${venueId}`, {
      method: "DELETE",
    });
  },

  // --- Conversations & Messages ---
  async getConversations(): Promise<ConversationListItem[]> {
    return apiFetch<ConversationListItem[]>("/api/v1/conversations");
  },

  async createConversation(venueId: number, bookingId?: number | null): Promise<ConversationRead> {
    return apiFetch<ConversationRead>("/api/v1/conversations", {
      method: "POST",
      body: JSON.stringify({
        venue_id: venueId,
        booking_id: bookingId || undefined,
      }),
    });
  },

  async getMessages(conversationId: number | string): Promise<MessageRead[]> {
    return apiFetch<MessageRead[]>(`/api/v1/conversations/${conversationId}/messages`);
  },

  async sendMessage(conversationId: number | string, body: string): Promise<MessageRead> {
    const payload: MessageCreate = { body };
    return apiFetch<MessageRead>(`/api/v1/conversations/${conversationId}/messages`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async markConversationRead(conversationId: number | string): Promise<void> {
    return apiFetch<void>(`/api/v1/conversations/${conversationId}/read`, {
      method: "POST",
    });
  },

  // --- Notifications ---
  async getNotifications(limit: number = 20, offset: number = 0): Promise<Page<NotificationRead>> {
    return apiFetch<Page<NotificationRead>>("/api/v1/notifications", {
      params: { limit, offset },
    });
  },

  async getUnreadNotificationsCount(): Promise<number> {
    const res = await apiFetch<UnreadCountRead>("/api/v1/notifications/unread-count");
    return res.unread;
  },

  async markNotificationRead(notificationId: number | string): Promise<void> {
    return apiFetch<void>(`/api/v1/notifications/${notificationId}/read`, {
      method: "POST",
    });
  },

  async markAllNotificationsRead(): Promise<void> {
    return apiFetch<void>("/api/v1/notifications/read-all", {
      method: "POST",
    });
  },
};
