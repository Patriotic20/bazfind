import { apiFetch } from "../config";
import {
  BookingRead,
  BookingListItem,
  BookingOwnerDetail,
  TableReservationCreate,
  HallEventCreate,
  BookingCancel,
} from "../types";

export const bookingService = {
  // Book a restaurant table
  async bookTable(data: TableReservationCreate): Promise<BookingOwnerDetail> {
    return apiFetch<BookingOwnerDetail>("/api/v1/bookings/table", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  // Book a wedding hall / large event
  async bookHall(data: HallEventCreate): Promise<BookingOwnerDetail> {
    return apiFetch<BookingOwnerDetail>("/api/v1/bookings/hall", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  // List user's bookings (active & past)
  async getMyBookings(): Promise<BookingListItem[]> {
    return apiFetch<BookingListItem[]>("/api/v1/bookings");
  },

  // Get specific booking details & QR token
  async getBookingDetail(bookingId: number | string): Promise<BookingOwnerDetail> {
    return apiFetch<BookingOwnerDetail>(`/api/v1/bookings/${bookingId}`);
  },

  // Cancel a booking
  async cancelBooking(bookingId: number | string, reason?: string): Promise<BookingRead> {
    const payload: BookingCancel = reason ? { reason } : {};
    return apiFetch<BookingRead>(`/api/v1/bookings/${bookingId}/cancel`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
};
