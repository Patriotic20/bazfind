import { apiFetch } from "../config";
import {
  TableBoardRow,
  KitchenQueueItem,
  OrderListItem,
  OrderRead,
  OrderDetailRead,
  OrderOpen,
  OrderItemCreate,
  OrderItemRead,
  OrderPaymentCreate,
  OrderPaymentRead,
  OrderCancel,
  ReceiptRead,
  BookingListItem,
  BookingRead,
  CheckInRequest,
  SeatedSummary,
} from "../types";

export const orderService = {
  // --- Live Table Board & Orders ---
  async getTableBoard(venueId: number | string): Promise<TableBoardRow[]> {
    return apiFetch<TableBoardRow[]>("/api/v1/venue/orders/table-board", {
      params: { venue_id: venueId },
    });
  },

  async getKitchenQueue(venueId: number | string): Promise<KitchenQueueItem[]> {
    return apiFetch<KitchenQueueItem[]>("/api/v1/venue/orders/kitchen-queue", {
      params: { venue_id: venueId },
    });
  },

  async listOrders(
    venueId: number | string,
    status?: string | null,
    businessDate?: string | null
  ): Promise<OrderListItem[]> {
    return apiFetch<OrderListItem[]>("/api/v1/venue/orders", {
      params: {
        venue_id: venueId,
        status: status || undefined,
        business_date: businessDate || undefined,
      },
    });
  },

  async openOrder(venueId: number | string, data: OrderOpen): Promise<OrderRead> {
    return apiFetch<OrderRead>("/api/v1/venue/orders", {
      method: "POST",
      params: { venue_id: venueId },
      body: JSON.stringify(data),
    });
  },

  async getOrderDetail(orderId: number | string, venueId?: number | string): Promise<OrderDetailRead> {
    return apiFetch<OrderDetailRead>(`/api/v1/venue/orders/${orderId}`, {
      params: venueId ? { venue_id: venueId } : undefined,
    });
  },

  async addOrderItems(
    orderId: number | string,
    items: OrderItemCreate[],
    venueId?: number | string
  ): Promise<OrderItemRead[]> {
    return apiFetch<OrderItemRead[]>(`/api/v1/venue/orders/${orderId}/items`, {
      method: "POST",
      params: venueId ? { venue_id: venueId } : undefined,
      body: JSON.stringify(items),
    });
  },

  async addOrderPayment(
    orderId: number | string,
    payment: OrderPaymentCreate,
    venueId?: number | string
  ): Promise<OrderPaymentRead> {
    return apiFetch<OrderPaymentRead>(`/api/v1/venue/orders/${orderId}/payments`, {
      method: "POST",
      params: venueId ? { venue_id: venueId } : undefined,
      body: JSON.stringify(payment),
    });
  },

  async closeOrder(orderId: number | string, venueId?: number | string): Promise<ReceiptRead> {
    return apiFetch<ReceiptRead>(`/api/v1/venue/orders/${orderId}/close`, {
      method: "POST",
      params: venueId ? { venue_id: venueId } : undefined,
    });
  },

  async cancelOrder(
    orderId: number | string,
    reason?: string | null,
    venueId?: number | string
  ): Promise<OrderRead> {
    const payload: OrderCancel = reason ? { reason } : {};
    return apiFetch<OrderRead>(`/api/v1/venue/orders/${orderId}/cancel`, {
      method: "POST",
      params: venueId ? { venue_id: venueId } : undefined,
      body: JSON.stringify(payload),
    });
  },

  async getReceipt(orderId: number | string, venueId?: number | string): Promise<ReceiptRead> {
    return apiFetch<ReceiptRead>(`/api/v1/venue/orders/${orderId}/receipt`, {
      params: venueId ? { venue_id: venueId } : undefined,
    });
  },

  async reprintReceipt(orderId: number | string, venueId?: number | string): Promise<ReceiptRead> {
    return apiFetch<ReceiptRead>(`/api/v1/venue/orders/${orderId}/receipt/reprint`, {
      method: "POST",
      params: venueId ? { venue_id: venueId } : undefined,
    });
  },

  // --- Venue Bookings Management ---
  async getVenueBookings(
    venueId: number | string,
    day?: string | null,
    status?: string | null
  ): Promise<BookingListItem[]> {
    const targetDay = day || new Date().toISOString().split("T")[0];
    return apiFetch<BookingListItem[]>("/api/v1/venue/bookings", {
      params: {
        venue_id: venueId,
        day: targetDay,
        status: status || undefined,
      },
    });
  },

  async confirmBooking(bookingId: number | string, venueId?: number | string): Promise<BookingRead> {
    return apiFetch<BookingRead>(`/api/v1/venue/bookings/${bookingId}/confirm`, {
      method: "POST",
      params: venueId ? { venue_id: venueId } : undefined,
    });
  },

  async rejectBooking(
    bookingId: number | string,
    reason?: string | null,
    venueId?: number | string
  ): Promise<BookingRead> {
    return apiFetch<BookingRead>(`/api/v1/venue/bookings/${bookingId}/reject`, {
      method: "POST",
      params: venueId ? { venue_id: venueId } : undefined,
      body: JSON.stringify(reason ? { reason } : {}),
    });
  },

  async checkInBooking(data: CheckInRequest): Promise<BookingRead> {
    return apiFetch<BookingRead>("/api/v1/venue/bookings/check-in", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  async checkOutBooking(bookingId: number | string, venueId?: number | string): Promise<SeatedSummary> {
    return apiFetch<SeatedSummary>(`/api/v1/venue/bookings/${bookingId}/check-out`, {
      method: "POST",
      params: venueId ? { venue_id: venueId } : undefined,
    });
  },
};
