"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { ChevronRight, Check, Ticket, Calendar, MapPin, Loader2, QrCode, X } from "lucide-react";
import { useTheme } from "@/components/theme-provider";
import { useAuth } from "@/contexts/AuthContext";
import { bookingService, BookingListItem } from "@/lib/api";

interface Voucher {
  id: string;
  code: string;
  description: string;
  expirySeconds?: number;
  expiryDate?: string;
}

const MOCK_VOUCHERS: Voucher[] = [
  {
    id: "v1",
    code: "BAZMLY50E",
    description: "-80 000 so'm oldindan buyurtma uchun promokod",
    expirySeconds: 5 * 3600 + 35 * 60 + 49,
  },
  {
    id: "v2",
    code: "BAZMLYGOLD",
    description: "-80 000 so'm oldindan buyurtma uchun promokod",
    expiryDate: "09/19/2026",
  },
  {
    id: "v3",
    code: "BAZMLYVIP",
    description: "-80 000 so'm oldindan buyurtma uchun promokod",
    expirySeconds: 5 * 3600 + 35 * 60 + 49,
  },
  {
    id: "v4",
    code: "BAZMLY80K",
    description: "-80 000 so'm oldindan buyurtma uchun promokod",
    expirySeconds: 5 * 3600 + 35 * 60 + 49,
  },
];

export default function VouchersAndTicketsPage() {
  const { theme } = useTheme();
  const { isAuthenticated } = useAuth();
  const [activeTab, setActiveTab] = useState<"vouchers" | "tickets">("vouchers");
  const [selectedVoucher, setSelectedVoucher] = useState<Voucher | null>(null);
  const [selectedBookingQr, setSelectedBookingQr] = useState<BookingListItem | null>(null);
  const [copied, setCopied] = useState(false);
  const [timers, setTimers] = useState<Record<string, number>>({});

  // Real Bookings State
  const [bookings, setBookings] = useState<BookingListItem[]>([]);
  const [loadingBookings, setLoadingBookings] = useState(false);

  // Load Bookings
  const loadBookings = useCallback(async () => {
    setLoadingBookings(true);
    try {
      let serverList: BookingListItem[] = [];
      if (isAuthenticated) {
        serverList = await bookingService.getMyBookings().catch(() => []);
      }
      const localRaw = typeof window !== "undefined" ? localStorage.getItem("my_local_bookings") : null;
      const localList: BookingListItem[] = localRaw ? JSON.parse(localRaw) : [];

      const seen = new Set<number>();
      const combined: BookingListItem[] = [];
      for (const item of [...localList, ...serverList]) {
        if (!seen.has(item.id)) {
          seen.add(item.id);
          combined.push(item);
        }
      }
      setBookings(combined);
    } catch {
      setBookings([]);
    } finally {
      setLoadingBookings(false);
    }
  }, [isAuthenticated]);

  const handleCancelBooking = async (bookingId: number) => {
    if (!confirm("Ushbu band qilishni bekor qilishni xohlaysizmi?")) return;
    try {
      if (isAuthenticated) {
        await bookingService.cancelBooking(bookingId, "Mijoz talabiga binoan").catch(() => {});
      }
      const localRaw = localStorage.getItem("my_local_bookings");
      if (localRaw) {
        const localList: BookingListItem[] = JSON.parse(localRaw);
        const updated = localList.map((b) => (b.id === bookingId ? { ...b, status: "cancelled" as any } : b));
        localStorage.setItem("my_local_bookings", JSON.stringify(updated));
      }
      setBookings((prev) => prev.map((b) => (b.id === bookingId ? { ...b, status: "cancelled" as any } : b)));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      alert("Bekor qilishda xatolik yuz berdi");
    }
  };

  useEffect(() => {
    if (activeTab === "tickets") {
      loadBookings();
    }
  }, [activeTab, loadBookings]);

  // Real-time countdown timer tick effect
  useEffect(() => {
    const initialTimers: Record<string, number> = {};
    MOCK_VOUCHERS.forEach((v) => {
      if (v.expirySeconds !== undefined) {
        initialTimers[v.id] = v.expirySeconds;
      }
    });
    setTimers(initialTimers);

    const interval = setInterval(() => {
      setTimers((prev) => {
        const next = { ...prev };
        let updated = false;
        Object.keys(next).forEach((key) => {
          if (next[key] > 0) {
            next[key] -= 1;
            updated = true;
          }
        });
        return updated ? next : prev;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const formatCountdown = (totalSeconds: number) => {
    if (totalSeconds <= 0) return "00:00:00";
    const hrs = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    return [hrs, mins, secs].map((v) => v.toString().padStart(2, "0")).join(":");
  };

  const handleCopy = (code: string) => {
    navigator.clipboard
      .writeText(code)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      })
      .catch(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      });
  };

  const isDark = theme === "dark";

  return (
    <div
      className={`absolute inset-0 pb-16 overflow-y-auto bg-[var(--background)] flex flex-col font-sans select-none transition-all duration-300 ${
        selectedVoucher || selectedBookingQr ? "z-[80]" : "z-40"
      }`}
    >
      {/* Header with Switcher */}
      <div className="py-4 px-6 pt-6 flex flex-col gap-4">
        <h1 className={`text-[22px] font-extrabold tracking-wide text-center ${isDark ? "text-white" : "text-zinc-900"}`}>
          Chiptalar va Promokodlar
        </h1>

        {/* Tab switcher */}
        <div className={`flex p-1 rounded-2xl border ${isDark ? "bg-[#393939] border-white/5" : "bg-zinc-100 border-zinc-200"}`}>
          <button
            onClick={() => setActiveTab("vouchers")}
            className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === "vouchers"
                ? "bg-[#FF6B00] text-white shadow-md"
                : isDark
                ? "text-zinc-400 hover:text-white"
                : "text-zinc-600 hover:text-zinc-900"
            }`}
          >
            Promokodlar
          </button>
          <button
            onClick={() => setActiveTab("tickets")}
            className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === "tickets"
                ? "bg-[#FF6B00] text-white shadow-md"
                : isDark
                ? "text-zinc-400 hover:text-white"
                : "text-zinc-600 hover:text-zinc-900"
            }`}
          >
            Mening Chiptalarim
          </button>
        </div>
      </div>

      {/* Tab 1: Vouchers List */}
      {activeTab === "vouchers" && (
        <div className="flex-1 px-4 py-3 space-y-4">
          {MOCK_VOUCHERS.map((voucher) => {
            const timerVal = timers[voucher.id];
            const isTimerActive = timerVal !== undefined;

            return (
              <div
                key={voucher.id}
                onClick={() => setSelectedVoucher(voucher)}
                className={`group p-4 flex items-center justify-between gap-4 border cursor-pointer transition-all duration-300 shadow-sm transform active:scale-[0.98] ${
                  isDark
                    ? "border-[#2A2A2A]/40 bg-[#393939] hover:bg-[#252528] rounded-[22px]"
                    : "border-transparent bg-zinc-100 hover:bg-zinc-200/80 rounded-[22px]"
                }`}
              >
                <div
                  className={`w-[50px] h-[50px] shrink-0 rounded-[14px] bg-[#FF6B00] flex flex-col items-center justify-center font-black text-white text-[10px] tracking-tighter leading-none ${
                    isDark ? "shadow-[0_4px_12px_rgba(255,90,0,0.3)]" : "shadow-md shadow-[#FF6B00]/10"
                  }`}
                >
                  <span className="scale-x-95">Bazmly</span>
                </div>

                <div className="flex-1 min-w-0 text-left">
                  <h3
                    className={`text-xs font-bold leading-normal break-words pr-2 ${
                      isDark ? "text-white" : "text-zinc-900"
                    }`}
                  >
                    {voucher.description}
                  </h3>
                  <div className="mt-1 flex items-center">
                    {isTimerActive ? (
                      <span className="text-[#FF6B00] text-xs font-bold font-mono tracking-wider animate-pulse">
                        {formatCountdown(timerVal)}
                      </span>
                    ) : (
                      <span className="text-[#8E8E93] text-xs font-semibold">
                        {voucher.expiryDate}
                      </span>
                    )}
                  </div>
                </div>

                <div className="shrink-0">
                  <ChevronRight
                    className={`w-5 h-5 transition-colors ${
                      isDark ? "text-white/30 group-hover:text-white" : "text-zinc-400 group-hover:text-zinc-600"
                    }`}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Tab 2: My Tickets List */}
      {activeTab === "tickets" && (
        <div className="flex-1 px-4 py-3 space-y-4 text-left">
          {loadingBookings ? (
            <div className="space-y-4 animate-pulse">
              {[1, 2].map((i) => (
                <div
                  key={i}
                  className={`p-5 rounded-3xl border flex flex-col gap-4 shadow-sm ${
                    isDark ? "bg-[#393939] border-white/5" : "bg-white border-zinc-200"
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div className="space-y-2">
                      <div className="h-5 w-40 rounded-lg bg-zinc-200 dark:bg-white/10" />
                      <div className="h-3.5 w-28 rounded-md bg-zinc-200/80 dark:bg-white/10" />
                    </div>
                    <div className="h-6 w-20 rounded-full bg-zinc-200 dark:bg-white/10" />
                  </div>
                  <div className="h-10 w-full rounded-2xl bg-zinc-100 dark:bg-white/5" />
                  <div className="h-12 w-full rounded-2xl bg-zinc-200 dark:bg-white/10" />
                </div>
              ))}
            </div>
          ) : bookings.length > 0 ? (
            bookings.map((b) => (
              <div
                key={b.id}
                className={`p-5 rounded-3xl border flex flex-col gap-4 shadow-md transition-all ${
                  isDark ? "bg-[#393939] border-white/5" : "bg-white border-zinc-200"
                }`}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className={`text-base font-extrabold ${isDark ? "text-white" : "text-zinc-900"}`}>
                      {b.venue_name}
                    </h3>
                    <div className="flex items-center gap-2 text-xs text-zinc-400 mt-1">
                      <Calendar className="h-3.5 w-3.5 text-primary" />
                      <span>{b.booking_date} • {b.start_time}</span>
                    </div>
                  </div>
                  <span
                    className={`text-[10px] font-bold px-2 py-1 rounded-lg uppercase ${
                      b.status === "confirmed" || b.status === "checked_in"
                        ? "bg-emerald-500/10 text-emerald-500"
                        : "bg-amber-500/10 text-amber-500"
                    }`}
                  >
                    {b.status}
                  </span>
                </div>

                <div className="flex justify-between items-center pt-2 border-t border-white/5 text-xs font-semibold">
                  <div>
                    <span className="text-zinc-400">Mehmonlar: </span>
                    <span className={isDark ? "text-white" : "text-zinc-800"}>{b.guests_count} kishi</span>
                    {b.table_number && <span> ({b.table_number}-stol)</span>}
                  </div>
                  <div className="flex items-center gap-2">
                    {b.status !== "cancelled" && (
                      <button
                        type="button"
                        onClick={() => handleCancelBooking(b.id)}
                        className="px-2.5 py-1.5 rounded-xl border border-red-500/20 text-red-400 hover:bg-red-500/10 text-[11px] font-bold transition-all cursor-pointer"
                      >
                        Bekor qilish
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setSelectedBookingQr(b)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#FF6B00] text-white text-xs font-bold active:scale-95 transition-all cursor-pointer"
                    >
                      <QrCode className="h-4 w-4" />
                      <span>QR Chipta</span>
                    </button>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-16 space-y-3">
              <Ticket className="h-12 w-12 text-zinc-500 mx-auto" />
              <p className={`text-sm font-bold ${isDark ? "text-white" : "text-zinc-800"}`}>
                Sizda hali faol chiptalar yo'q
              </p>
              <p className="text-xs text-zinc-400 max-w-xs mx-auto">
                Joy yoki tadbir zallarini band qilganingizda, chiptalaringiz bu yerda ko'rinadi.
              </p>
              <Link
                href="/feed"
                className="inline-block mt-2 px-5 py-2.5 bg-[#FF6B00] text-white rounded-xl text-xs font-bold shadow-lg"
              >
                Joy tanlash
              </Link>
            </div>
          )}
        </div>
      )}

      {/* Copy Successful Toast */}
      {copied && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[160] bg-emerald-500 text-white font-extrabold text-[11px] tracking-wider uppercase px-4 py-2.5 rounded-full shadow-lg flex items-center gap-2 animate-scale-up">
          <Check className="w-4 h-4" />
          <span>Muvaffaqiyatli nusxalandi!</span>
        </div>
      )}

      {/* Dimming Backdrop */}
      {(selectedVoucher || selectedBookingQr) && (
        <div
          onClick={() => {
            setSelectedVoucher(null);
            setSelectedBookingQr(null);
          }}
          className={`fixed inset-0 z-[140] backdrop-blur-[2px] transition-opacity duration-300 max-w-md mx-auto ${
            isDark ? "bg-black/75" : "bg-black/40"
          }`}
        />
      )}

      {/* Slide-Up Voucher Drawer */}
      <div
        className={`fixed inset-x-0 bottom-0 z-[150] max-w-md mx-auto border-t rounded-t-[32px] px-6 pb-8 pt-4 shadow-2xl transition-transform duration-300 flex flex-col items-stretch transform ${
          isDark ? "bg-[#393939] border-[#2A2A2A]/40" : "bg-white border-zinc-100"
        } ${selectedVoucher ? "translate-y-0" : "translate-y-full"}`}
      >
        <div className={`w-9 h-1 rounded-full mx-auto mb-6 ${isDark ? "bg-white/20" : "bg-zinc-200"}`} />

        {selectedVoucher && (
          <div className="space-y-6">
            <div className="space-y-2 text-left">
              <h2 className={`text-xl font-bold tracking-tight ${isDark ? "text-white" : "text-zinc-900"}`}>
                Promokod {selectedVoucher.code}
              </h2>
              <p className={`text-xs font-semibold leading-relaxed ${isDark ? "text-white/70" : "text-zinc-500"}`}>
                {selectedVoucher.description}
              </p>
            </div>

            <div className="space-y-3.5 pt-2">
              <button
                onClick={() => handleCopy(selectedVoucher.code)}
                className="w-full py-4 bg-[#FF6B00] hover:bg-[#E05000] text-white font-extrabold text-sm rounded-[24px] shadow-lg shadow-[#FF6B00]/20 hover:scale-[1.01] active:scale-[0.99] transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer"
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4 animate-scale-up" />
                    <span>Nusxa olindi!</span>
                  </>
                ) : (
                  <span>Nusxa olish</span>
                )}
              </button>

              <button
                onClick={() => setSelectedVoucher(null)}
                className={`w-full py-3 bg-transparent font-bold text-sm tracking-wide transition-colors cursor-pointer ${
                  isDark ? "text-white/90 hover:text-white" : "text-zinc-500 hover:text-zinc-800"
                }`}
              >
                Ortga
              </button>
            </div>
          </div>
        )}
      </div>

      {/* QR Code Modal for Booking */}
      {selectedBookingQr && (
        <div className="fixed inset-0 z-[160] flex items-center justify-center p-6 animate-fade-in max-w-md mx-auto">
          <div className="w-full max-w-[320px] bg-white text-zinc-900 rounded-[36px] p-6 shadow-2xl flex flex-col items-center gap-4 relative">
            <button
              onClick={() => setSelectedBookingQr(null)}
              className="absolute top-4 right-4 p-2 rounded-full bg-zinc-100 hover:bg-zinc-200 text-zinc-600"
            >
              <X className="h-4 w-4" />
            </button>

            <h3 className="font-extrabold text-base text-zinc-900">{selectedBookingQr.venue_name}</h3>
            <p className="text-xs text-zinc-500 font-bold">
              {selectedBookingQr.booking_date} • {selectedBookingQr.start_time}
            </p>

            <div className="p-3 bg-zinc-50 rounded-2xl border border-zinc-200">
              <QrCode className="h-44 w-44 text-zinc-900" />
            </div>

            <div className="text-center space-y-1">
              <p className="text-[11px] font-bold text-zinc-500">
                Restoran administratoriga ushbu QR kodni ko'rsating
              </p>
              <p className="text-[10px] font-mono font-bold text-[#FF6B00] break-all">
                {typeof window !== "undefined" && localStorage.getItem("my_booking_tokens")
                  ? JSON.parse(localStorage.getItem("my_booking_tokens") || "{}")[selectedBookingQr.id] || `BZMLY-TICKET-${selectedBookingQr.id}`
                  : `BZMLY-TICKET-${selectedBookingQr.id}`}
              </p>
            </div>

            <button
              onClick={() => setSelectedBookingQr(null)}
              className="w-full py-3.5 rounded-2xl bg-[#FF6B00] text-white font-bold text-xs shadow-lg"
            >
              Yopish
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
