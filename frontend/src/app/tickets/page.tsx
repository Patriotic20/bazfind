"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Check, Ticket, Calendar, Loader2, QrCode, X, TicketPercent } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { useTheme } from "@/components/theme-provider";
import { useAuth } from "@/contexts/AuthContext";
import { bookingService, BazmlyApiError, BookingListItem, BookingOwnerDetail } from "@/lib/api";
import { formatDate, formatMoney, formatTime } from "@/lib/format";

const STATUS_LABELS: Record<string, { label: string; tone: string }> = {
  pending: { label: "Kutilmoqda", tone: "bg-amber-500/10 text-amber-500" },
  confirmed: { label: "Tasdiqlangan", tone: "bg-emerald-500/10 text-emerald-500" },
  checked_in: { label: "Kelgan", tone: "bg-emerald-500/10 text-emerald-500" },
  completed: { label: "Yakunlangan", tone: "bg-zinc-500/10 text-zinc-400" },
  cancelled: { label: "Bekor qilingan", tone: "bg-red-500/10 text-red-400" },
  no_show: { label: "Kelmagan", tone: "bg-red-500/10 text-red-400" },
};

/** Only a booking that still holds its place can be cancelled or shown at the door. */
const ACTIVE = new Set(["pending", "confirmed"]);

export default function VouchersAndTicketsPage() {
  const { theme } = useTheme();
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<"vouchers" | "tickets">("tickets");
  const [toast, setToast] = useState<string | null>(null);

  const [bookings, setBookings] = useState<BookingListItem[]>([]);
  const [loadingBookings, setLoadingBookings] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  // The QR lives on the booking detail — lists never carry the token.
  const [qrBooking, setQrBooking] = useState<BookingListItem | null>(null);
  const [qrDetail, setQrDetail] = useState<BookingOwnerDetail | null>(null);

  const showToast = (message: string) => {
    setToast(message);
    setTimeout(() => setToast(null), 2500);
  };

  const loadBookings = useCallback(async () => {
    if (!isAuthenticated) {
      setBookings([]);
      return;
    }
    setLoadingBookings(true);
    setLoadError(null);
    try {
      setBookings(await bookingService.getMyBookings());
    } catch (err) {
      setLoadError(err instanceof BazmlyApiError ? err.message : "Bronlarni yuklab bo'lmadi");
    } finally {
      setLoadingBookings(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (activeTab === "tickets" && !authLoading) {
      loadBookings();
    }
  }, [activeTab, authLoading, loadBookings]);

  const handleCancelBooking = async (bookingId: number) => {
    if (!confirm("Ushbu bronni bekor qilishni xohlaysizmi?")) return;
    try {
      const updated = await bookingService.cancelBooking(bookingId, "Mijoz talabiga binoan");
      setBookings((prev) => prev.map((b) => (b.id === bookingId ? { ...b, status: updated.status } : b)));
      showToast("Bron bekor qilindi");
    } catch (err) {
      showToast(err instanceof BazmlyApiError ? err.message : "Bekor qilishda xatolik yuz berdi");
    }
  };

  const openQr = async (booking: BookingListItem) => {
    setQrBooking(booking);
    setQrDetail(null);
    try {
      setQrDetail(await bookingService.getBookingDetail(booking.id));
    } catch (err) {
      setQrBooking(null);
      showToast(err instanceof BazmlyApiError ? err.message : "Chiptani ochib bo'lmadi");
    }
  };

  const isDark = theme === "dark";

  return (
    <div
      className={`absolute inset-0 pb-16 overflow-y-auto bg-[var(--background)] flex flex-col font-sans select-none transition-all duration-300 ${
        qrBooking ? "z-[80]" : "z-40"
      }`}
    >
      <div className="py-4 px-6 pt-6 flex flex-col gap-4">
        <h1 className={`text-[22px] font-extrabold tracking-wide text-center ${isDark ? "text-white" : "text-zinc-900"}`}>
          Chiptalar va Promokodlar
        </h1>

        <div className={`flex p-1 rounded-2xl border ${isDark ? "bg-[#393939] border-white/5" : "bg-zinc-100 border-zinc-200"}`}>
          {(
            [
              ["vouchers", "Promokodlar"],
              ["tickets", "Mening Chiptalarim"],
            ] as const
          ).map(([tab, label]) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === tab
                  ? "bg-[#FF6B00] text-white shadow-md"
                  : isDark
                    ? "text-zinc-400 hover:text-white"
                    : "text-zinc-600 hover:text-zinc-900"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {activeTab === "vouchers" && (
        <div className="text-center py-16 px-6 space-y-3">
          <TicketPercent className="h-12 w-12 text-zinc-500 mx-auto" />
          <p className={`text-sm font-bold ${isDark ? "text-white" : "text-zinc-800"}`}>Hozircha promokodlar yo&apos;q</p>
          <p className="text-xs text-zinc-400 max-w-xs mx-auto">
            Muassasalar promokod e&apos;lon qilganda, ular shu yerda paydo bo&apos;ladi.
          </p>
        </div>
      )}

      {activeTab === "tickets" && (
        <div className="flex-1 px-4 py-3 space-y-4 text-left">
          {!authLoading && !isAuthenticated ? (
            <div className="text-center py-16 space-y-3">
              <Ticket className="h-12 w-12 text-zinc-500 mx-auto" />
              <p className={`text-sm font-bold ${isDark ? "text-white" : "text-zinc-800"}`}>
                Chiptalaringizni ko&apos;rish uchun tizimga kiring
              </p>
              <Link href="/login" className="inline-block mt-2 px-5 py-2.5 bg-[#FF6B00] text-white rounded-xl text-xs font-bold shadow-lg">
                Kirish
              </Link>
            </div>
          ) : loadingBookings || authLoading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-[#FF6B00]" />
            </div>
          ) : loadError ? (
            <p className="text-center py-16 text-xs font-bold text-red-500">{loadError}</p>
          ) : bookings.length > 0 ? (
            bookings.map((b) => {
              const status = STATUS_LABELS[b.status] ?? { label: b.status, tone: "bg-zinc-500/10 text-zinc-400" };
              const active = ACTIVE.has(b.status);
              return (
                <div
                  key={b.id}
                  className={`p-5 rounded-3xl border flex flex-col gap-4 shadow-md transition-all ${
                    isDark ? "bg-[#393939] border-white/5" : "bg-white border-zinc-200"
                  }`}
                >
                  <div className="flex justify-between items-start gap-3">
                    <div>
                      <h3 className={`text-base font-extrabold ${isDark ? "text-white" : "text-zinc-900"}`}>{b.venue_name}</h3>
                      <div className="flex items-center gap-2 text-xs text-zinc-400 mt-1">
                        <Calendar className="h-3.5 w-3.5 text-primary" />
                        <span>
                          {formatDate(b.booking_date)} • {formatTime(b.start_time)}–{formatTime(b.end_time)}
                        </span>
                      </div>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-1 rounded-lg uppercase shrink-0 ${status.tone}`}>
                      {status.label}
                    </span>
                  </div>

                  <div className={`flex justify-between items-center pt-2 border-t text-xs font-semibold ${isDark ? "border-white/5" : "border-zinc-100"}`}>
                    <div>
                      <span className="text-zinc-400">Mehmonlar: </span>
                      <span className={isDark ? "text-white" : "text-zinc-800"}>{b.guests_count} kishi</span>
                      {b.table_number && <span className="text-zinc-400"> ({b.table_number}-stol)</span>}
                      {Number(b.total_amount) > 0 && (
                        <span className="block text-zinc-400 mt-0.5">{formatMoney(b.total_amount, b.currency)}</span>
                      )}
                    </div>
                    {active && (
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleCancelBooking(b.id)}
                          className="px-2.5 py-1.5 rounded-xl border border-red-500/20 text-red-400 hover:bg-red-500/10 text-[11px] font-bold transition-all cursor-pointer"
                        >
                          Bekor qilish
                        </button>
                        <button
                          type="button"
                          onClick={() => openQr(b)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#FF6B00] text-white text-xs font-bold active:scale-95 transition-all cursor-pointer"
                        >
                          <QrCode className="h-4 w-4" />
                          <span>QR Chipta</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="text-center py-16 space-y-3">
              <Ticket className="h-12 w-12 text-zinc-500 mx-auto" />
              <p className={`text-sm font-bold ${isDark ? "text-white" : "text-zinc-800"}`}>Sizda hali bronlar yo&apos;q</p>
              <p className="text-xs text-zinc-400 max-w-xs mx-auto">
                Joy yoki tadbir zalini band qilganingizda, chiptalaringiz shu yerda ko&apos;rinadi.
              </p>
              <Link href="/feed" className="inline-block mt-2 px-5 py-2.5 bg-[#FF6B00] text-white rounded-xl text-xs font-bold shadow-lg">
                Joy tanlash
              </Link>
            </div>
          )}
        </div>
      )}

      {toast && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[160] bg-emerald-500 text-white font-extrabold text-[11px] tracking-wider px-4 py-2.5 rounded-full shadow-lg flex items-center gap-2 animate-scale-up">
          <Check className="w-4 h-4" />
          <span>{toast}</span>
        </div>
      )}

      {qrBooking && (
        <>
          <div
            onClick={() => setQrBooking(null)}
            className={`fixed inset-0 z-[140] backdrop-blur-[2px] max-w-md mx-auto ${isDark ? "bg-black/75" : "bg-black/40"}`}
          />
          <div className="fixed inset-0 z-[160] flex items-center justify-center p-6 animate-fade-in max-w-md mx-auto pointer-events-none">
            <div className="w-full max-w-[320px] bg-white text-zinc-900 rounded-[36px] p-6 shadow-2xl flex flex-col items-center gap-4 relative pointer-events-auto">
              <button
                onClick={() => setQrBooking(null)}
                className="absolute top-4 right-4 p-2 rounded-full bg-zinc-100 hover:bg-zinc-200 text-zinc-600 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>

              <h3 className="font-extrabold text-base text-zinc-900">{qrBooking.venue_name}</h3>
              <p className="text-xs text-zinc-500 font-bold">
                {formatDate(qrBooking.booking_date)} • {formatTime(qrBooking.start_time)}
              </p>

              <div className="p-3 bg-white rounded-2xl border border-zinc-200 w-[200px] h-[200px] flex items-center justify-center">
                {qrDetail ? <QRCodeSVG value={qrDetail.qr_token} size={176} /> : <Loader2 className="h-6 w-6 animate-spin text-[#FF6B00]" />}
              </div>

              <div className="text-center space-y-1">
                <p className="text-[11px] font-bold text-zinc-500">Muassasa xodimiga ushbu QR kodni ko&apos;rsating</p>
                {qrDetail && <p className="text-[10px] font-mono font-bold text-[#FF6B00]">{qrDetail.booking.ticket_code}</p>}
              </div>

              <button
                onClick={() => setQrBooking(null)}
                className="w-full py-3.5 rounded-2xl bg-[#FF6B00] text-white font-bold text-xs shadow-lg cursor-pointer"
              >
                Yopish
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
