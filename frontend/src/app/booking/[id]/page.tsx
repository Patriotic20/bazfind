"use client";

import React, { use, useState, useEffect, Suspense, useCallback } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ChevronLeft,
  MapPin,
  CheckCircle,
  Phone,
  ChevronRight,
  Sparkles,
  Loader2,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import Navbar from "@/components/navbar";
import { useAuth } from "@/contexts/AuthContext";
import {
  venueService,
  bookingService,
  BazmlyApiError,
  VenueDetailRead,
  AvailableTableRead,
  BookingOwnerDetail,
  BookingItemCreate,
  MenuItemListItem,
} from "@/lib/api";
import { formatAddress, formatDate, formatMoney, formatTime, parseApiDate } from "@/lib/format";
import { addHours, slotsFor, upcomingDates, weekdayOf } from "@/lib/venue-hours";

interface Props {
  params: Promise<{ id: string }>;
}

function ProgressBar({ step }: { step: number }) {
  return (
    <div className="w-full flex items-center justify-between gap-1.5 py-3 select-none">
      {[1, 2, 3, 4, 5, 6].map((s) => {
        const isFilled = s <= step;
        return (
          <div
            key={s}
            className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
              isFilled ? "bg-[#FF6B00]" : "bg-zinc-200 dark:bg-zinc-800"
            }`}
          />
        );
      })}
    </div>
  );
}

const WEEKDAY_SHORT = ["Dush", "Sesh", "Chor", "Pay", "Jum", "Shan", "Yak"];

const STATUS_LABELS: Record<string, { label: string; tone: string }> = {
  pending: { label: "Tasdiqlash kutilmoqda", tone: "text-amber-600 dark:text-amber-400" },
  confirmed: { label: "Tasdiqlandi", tone: "text-emerald-600 dark:text-emerald-400" },
  checked_in: { label: "Kelgan", tone: "text-emerald-600 dark:text-emerald-400" },
  completed: { label: "Yakunlangan", tone: "text-zinc-500" },
  cancelled: { label: "Bekor qilingan", tone: "text-red-500" },
  no_show: { label: "Kelmagan", tone: "text-red-500" },
};

/** `{"12": 2}` from the venue page, as pre-order lines. Anything malformed is dropped. */
function parseItems(raw: string | null): BookingItemCreate[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as Record<string, number>;
    return Object.entries(parsed)
      .map(([id, quantity]) => ({ menu_item_id: Number(id), quantity: Number(quantity) }))
      .filter((line) => line.menu_item_id > 0 && line.quantity > 0);
  } catch {
    return [];
  }
}

function SummaryRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between items-center gap-3">
      <span className="text-zinc-500 dark:text-zinc-400 font-medium">{label}</span>
      <span className="font-extrabold text-zinc-900 dark:text-white text-right">{value}</span>
    </div>
  );
}

function BookingContent({ id }: { id: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isAuthenticated, loading: authLoading } = useAuth();

  const [venueDetail, setVenueDetail] = useState<VenueDetailRead | null>(null);
  const [menu, setMenu] = useState<MenuItemListItem[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [freeTables, setFreeTables] = useState<AvailableTableRead[]>([]);
  const [loadingTables, setLoadingTables] = useState(false);

  const [guests, setGuests] = useState(Math.max(1, Number(searchParams.get("guests")) || 2));
  const [pickedDate, setPickedDate] = useState(searchParams.get("date") ?? "");
  const [pickedTime, setPickedTime] = useState(searchParams.get("time") ?? "");
  const [selectedTableId, setSelectedTableId] = useState<number | null>(null);
  const [preOrder] = useState(() => parseItems(searchParams.get("items")));

  const [bookingStep, setBookingStep] = useState<"params" | "details" | "checkout" | "ticket" | "qr">("params");
  const [fullName, setFullName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [note, setNote] = useState("");

  const [created, setCreated] = useState<BookingOwnerDetail | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [toastMessage, setToastMessage] = useState("");

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(""), 3500);
  };

  useEffect(() => {
    Promise.all([venueService.getVenueDetail(id), venueService.getMenu(id).catch(() => [])])
      .then(([detail, items]) => {
        // A to'yxona is booked whole, by guest band, in its own flow.
        if (detail.venue.venue_type === "toyxona") {
          router.replace(`/toyxona/${id}`);
          return;
        }
        setVenueDetail(detail);
        setMenu(items);
      })
      .catch((err) => setLoadError(err instanceof BazmlyApiError ? err.message : "Muassasa topilmadi"));
  }, [id, router]);

  // Prefill from the account once, without overwriting what was typed.
  const [prefilled, setPrefilled] = useState(false);
  if (user && !prefilled) {
    setPrefilled(true);
    setFullName(`${user.first_name ?? ""} ${user.last_name ?? ""}`.trim());
    setPhoneNumber(user.phone ?? "");
  }

  const venue = venueDetail?.venue;
  const dates = venue ? upcomingDates(venue.min_advance_booking_days) : [];
  const selectedDate = dates.includes(pickedDate) ? pickedDate : (dates[0] ?? "");
  const times = venueDetail && selectedDate ? slotsFor(venueDetail.working_hours, weekdayOf(selectedDate)) : [];
  const selectedTime = times.includes(pickedTime) ? pickedTime : (times[0] ?? "");
  const endTime = selectedTime ? addHours(selectedTime, 2) : "";
  const selectedTable = freeTables.find((t) => t.id === selectedTableId) ?? null;

  const loadFreeTables = useCallback(async () => {
    if (!selectedDate || !selectedTime) {
      setFreeTables([]);
      return;
    }
    setLoadingTables(true);
    try {
      setFreeTables(await venueService.getFreeTables(id, selectedDate, selectedTime, endTime, guests));
    } catch {
      setFreeTables([]);
    } finally {
      setLoadingTables(false);
    }
  }, [id, selectedDate, selectedTime, endTime, guests]);

  useEffect(() => {
    loadFreeTables();
  }, [loadFreeTables]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [bookingStep]);

  // Pre-order lines priced as this branch prices them right now.
  const orderLines = preOrder
    .map((line) => {
      const item = menu.find((m) => m.id === line.menu_item_id && m.effective_price);
      return item ? { ...line, name: item.name, amount: Number(item.effective_price) * line.quantity } : null;
    })
    .filter((line): line is BookingItemCreate & { name: string; amount: number } => line !== null);
  const preOrderTotal = orderLines.reduce((sum, line) => sum + line.amount, 0);

  const handleSubmit = async () => {
    if (!isAuthenticated) {
      router.push("/login");
      return;
    }
    if (!selectedTable) {
      triggerToast("Stol tanlang");
      setBookingStep("params");
      return;
    }
    setSubmitting(true);
    try {
      const detail = await bookingService.bookTable({
        venue_id: Number(id),
        booking_date: selectedDate,
        start_time: `${selectedTime}:00`,
        end_time: `${endTime}:00`,
        table_id: selectedTable.id,
        guests_count: guests,
        contact_name: fullName.trim(),
        contact_phone: phoneNumber.trim(),
        note: note.trim() || null,
        items: orderLines.map(({ menu_item_id, quantity }) => ({ menu_item_id, quantity })),
      });
      setCreated(detail);
      setBookingStep("ticket");
    } catch (err) {
      triggerToast(err instanceof BazmlyApiError ? err.message : "Bron qilishda xatolik yuz berdi");
      // The table may have gone in the meantime; show the current picture.
      loadFreeTables();
    } finally {
      setSubmitting(false);
    }
  };

  if (loadError) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-24 px-6 text-center">
        <p className="text-sm font-bold">{loadError}</p>
        <Link href="/" className="px-5 py-2.5 rounded-xl bg-[#FF6B00] text-white text-xs font-bold">
          Bosh sahifaga qaytish
        </Link>
      </div>
    );
  }

  if (!venueDetail || !venue || authLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin h-8 w-8 text-[#FF6B00]" />
      </div>
    );
  }

  const venueName = venue.name;
  const venueLocation = formatAddress(venue.street, venue.house_number);
  const cover = venueDetail.photos[0]?.url;
  const detailsValid = fullName.trim().length > 0 && phoneNumber.trim().length > 0;
  const booking = created?.booking;
  const status = booking ? (STATUS_LABELS[booking.status] ?? { label: booking.status, tone: "" }) : null;
  const chip = "rounded-2xl border border-zinc-200/80 dark:border-white/5 bg-white dark:bg-[#2C2C2E]";
  const pill = (active: boolean) =>
    `rounded-2xl shrink-0 flex flex-col items-center justify-center gap-1 transition-all duration-200 active:scale-95 cursor-pointer border ${
      active
        ? "bg-[#FF6B00] border-[#FF6B00] text-white shadow-lg shadow-[#FF6B00]/25 scale-105"
        : "bg-zinc-100 hover:bg-zinc-200/70 dark:bg-[#2C2C2E] dark:hover:bg-zinc-700 border-zinc-200/80 dark:border-white/5 text-zinc-700 dark:text-zinc-300 shadow-2xs"
    }`;

  return (
    <div className="w-full max-w-md mx-auto min-h-screen bg-white dark:bg-[var(--background)] text-zinc-900 dark:text-white flex flex-col relative overflow-hidden pb-12 transition-colors duration-300">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-150 dark:border-white/5 select-none shrink-0 bg-white/80 dark:bg-[var(--background)]/80 backdrop-blur-md z-30 sticky top-0">
        <button
          type="button"
          onClick={() => {
            if (bookingStep === "details") setBookingStep("params");
            else if (bookingStep === "checkout") setBookingStep("details");
            else if (bookingStep === "qr") setBookingStep("ticket");
            else router.back();
          }}
          className="w-10 h-10 rounded-full bg-zinc-100 hover:bg-zinc-200/80 dark:bg-white/10 dark:hover:bg-white/15 text-zinc-700 dark:text-white flex items-center justify-center transition-all active:scale-90 border border-zinc-200/60 dark:border-white/5 cursor-pointer shadow-xs"
          aria-label="Orqaga"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>

        <h2 className="text-sm font-black tracking-wider uppercase text-zinc-800 dark:text-zinc-100">
          {bookingStep === "params" && "Bron qilish"}
          {bookingStep === "details" && "Ma'lumotlar"}
          {bookingStep === "checkout" && "Tasdiqlash"}
          {bookingStep === "ticket" && "Chipta"}
          {bookingStep === "qr" && "QR Chipta"}
        </h2>

        <div className="flex items-center gap-1.5 text-xs font-bold text-zinc-700 dark:text-zinc-300 bg-zinc-100 dark:bg-white/5 px-3.5 py-1.5 rounded-full border border-zinc-200/70 dark:border-white/5 shadow-2xs">
          <MapPin className="h-3.5 w-3.5 text-[#FF6B00]" />
          <span className="truncate max-w-[120px]">{venueName}</span>
        </div>
      </div>

      {toastMessage && (
        <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-[999] px-4 py-3 rounded-2xl bg-[#FF6B00] text-white text-xs font-bold shadow-2xl flex items-center gap-2 border border-white/20 animate-fade-in max-w-xs">
          <CheckCircle className="h-4.5 w-4.5 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* STEP 1: guests, date, time, table */}
      {bookingStep === "params" && (
        <div className="flex-1 flex flex-col gap-6 px-6 py-4 animate-fade-in select-none">
          <ProgressBar step={2} />

          <div className="flex justify-between items-center text-left py-2 px-1">
            <div>
              <h3 className="font-extrabold text-base tracking-tight">Necha kishi uchun</h3>
              <p className="text-xs font-semibold text-zinc-400 dark:text-zinc-500">Mehmonlar miqdori</p>
            </div>
            <div className="flex items-center gap-3 bg-zinc-100 dark:bg-[#2C2C2E] p-1.5 rounded-2xl border border-zinc-200/80 dark:border-white/5 shadow-2xs">
              <button
                type="button"
                onClick={() => setGuests((prev) => Math.max(1, prev - 1))}
                className="w-10 h-10 rounded-xl bg-white dark:bg-[#393939] flex items-center justify-center font-black text-lg active:scale-95 transition-all shadow-xs border border-zinc-200/50 dark:border-white/5 cursor-pointer"
              >
                —
              </button>
              <span className="text-lg font-black w-7 text-center">{guests}</span>
              <button
                type="button"
                onClick={() => setGuests((prev) => prev + 1)}
                className="w-10 h-10 rounded-xl bg-white dark:bg-[#393939] flex items-center justify-center font-black text-lg active:scale-95 transition-all shadow-xs border border-zinc-200/50 dark:border-white/5 cursor-pointer"
              >
                +
              </button>
            </div>
          </div>

          <div className="space-y-3.5 text-left py-2 px-1">
            <div>
              <h3 className="font-extrabold text-base tracking-tight">Sanani belgilash</h3>
              <p className="text-xs font-semibold text-zinc-400 dark:text-zinc-500">
                {venue.min_advance_booking_days > 0
                  ? `Kamida ${venue.min_advance_booking_days} kun oldin bron qilinadi`
                  : "Kerakli sanani tanlang"}
              </p>
            </div>
            <div className="flex gap-2.5 overflow-x-auto pb-1 pt-0.5 scrollbar-none -mx-1 px-1">
              {dates.map((date) => {
                const isSelected = selectedDate === date;
                return (
                  <button
                    key={date}
                    type="button"
                    onClick={() => setPickedDate(date)}
                    className={`w-[58px] py-3.5 ${pill(isSelected)}`}
                  >
                    <span className={`text-[10px] font-black uppercase tracking-wider leading-none ${isSelected ? "text-white/90" : "text-zinc-400 dark:text-zinc-500"}`}>
                      {WEEKDAY_SHORT[weekdayOf(date)]}
                    </span>
                    <span className={`text-base font-black leading-none ${isSelected ? "text-white" : "text-zinc-900 dark:text-white"}`}>
                      {parseApiDate(date).getDate()}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-3.5 text-left py-2 px-1">
            <div>
              <h3 className="font-extrabold text-base tracking-tight">Vaqtni belgilash</h3>
              <p className="text-xs font-semibold text-zinc-400 dark:text-zinc-500">Ikki soatlik bron</p>
            </div>
            {times.length === 0 ? (
              <p className="text-xs font-bold text-zinc-400">Bu kunda muassasa ishlamaydi</p>
            ) : (
              <div className="flex gap-2.5 overflow-x-auto pb-1 pt-0.5 scrollbar-none -mx-1 px-1">
                {times.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setPickedTime(t)}
                    className={`px-5 py-3 text-xs font-black ${pill(selectedTime === t)}`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-3.5 text-left py-2 px-1">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="font-extrabold text-base tracking-tight">Joyni belgilash (Stol)</h3>
                <p className="text-xs font-semibold text-zinc-400 dark:text-zinc-500">
                  {selectedTable ? `${selectedTable.number}-stol, ${selectedTable.seats} o'rin` : "Bo'sh stollardan birini tanlang"}
                </p>
              </div>
              {loadingTables && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
            </div>
            {!loadingTables && freeTables.length === 0 ? (
              <p className="text-xs font-bold text-zinc-400">
                {times.length === 0 ? "Avval ish kunini tanlang" : `${guests} kishilik bo'sh stol topilmadi`}
              </p>
            ) : (
              <div className="flex gap-2 overflow-x-auto pb-1 pt-0.5 scrollbar-none -mx-1 px-1">
                {freeTables.map((table) => {
                  const isSelected = selectedTableId === table.id;
                  return (
                    <button
                      key={table.id}
                      type="button"
                      onClick={() => setSelectedTableId(table.id)}
                      className={`min-w-[58px] h-[72px] ${pill(isSelected)}`}
                    >
                      <span className={`text-[10px] font-black uppercase tracking-wider leading-none ${isSelected ? "text-white/90" : "text-zinc-400 dark:text-zinc-500"}`}>
                        {table.seats} o&apos;rin
                      </span>
                      <span className={`text-xl font-black leading-none ${isSelected ? "text-white" : "text-zinc-900 dark:text-white"}`}>
                        {table.number}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="flex-1 min-h-[24px]" />

          <button
            type="button"
            disabled={!selectedTable}
            onClick={() => setBookingStep("details")}
            className="w-full py-4.5 rounded-2xl font-extrabold text-sm tracking-wide transition-all bg-[#FF6B00] hover:bg-[#E05000] text-white active:scale-[0.98] shadow-xl shadow-[#FF6B00]/25 cursor-pointer disabled:opacity-40 disabled:pointer-events-none"
          >
            Keyingisi
          </button>
        </div>
      )}

      {/* STEP 2: contact details */}
      {bookingStep === "details" && (
        <div className="flex-1 flex flex-col gap-6 px-6 py-4 animate-fade-in">
          <ProgressBar step={4} />
          <h1 className="text-2xl font-black tracking-tight text-left mt-2">Ma&apos;lumotlarni to&apos;ldiring</h1>

          <div className="space-y-6">
            {[
              { label: "Ism/Familiya", icon: "👤", value: fullName, set: setFullName, placeholder: "Ism/Familiya" },
              { label: "Telefon raqam", icon: "📞", value: phoneNumber, set: setPhoneNumber, placeholder: "+998 ** *** ** **" },
              { label: "Izoh (ixtiyoriy)", icon: "📝", value: note, set: setNote, placeholder: "Masalan: deraza yonidagi stol" },
            ].map((field) => (
              <div key={field.label} className="space-y-2.5 text-left">
                <label className="block text-sm font-bold tracking-wide">{field.label}</label>
                <div className="flex items-center gap-3 pb-2 border-b border-zinc-200 dark:border-zinc-800 focus-within:border-[#FF6B00] transition-colors">
                  <span className="text-zinc-500 text-base">{field.icon}</span>
                  <input
                    type="text"
                    value={field.value}
                    onChange={(e) => field.set(e.target.value)}
                    className="w-full bg-transparent border-0 p-0 text-base font-bold focus:ring-0 outline-none placeholder:text-zinc-400 dark:placeholder:text-zinc-600"
                    placeholder={field.placeholder}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="rounded-[20px] bg-zinc-100 dark:bg-[#2C2C2E] border border-zinc-200/80 dark:border-white/5 p-5 text-left">
            <p className="text-xs font-bold text-zinc-600 dark:text-zinc-300 leading-relaxed">
              Band qilingan vaqtgacha yetib kelishingizni so&apos;raymiz. Kechikish{" "}
              <span className="text-zinc-900 dark:text-white font-extrabold">{venue.late_grace_minutes} daqiqadan</span> oshsa,
              bron avtomatik bekor qilinadi.
            </p>
          </div>

          <div className="flex-1 min-h-[40px]" />

          <button
            disabled={!detailsValid}
            onClick={() => setBookingStep("checkout")}
            className="w-full py-4.5 rounded-[24px] font-extrabold text-sm tracking-wide transition-all bg-[#FF6B00] hover:bg-[#E05000] text-white active:scale-[0.98] shadow-xl shadow-[#FF6B00]/25 cursor-pointer disabled:opacity-40 disabled:pointer-events-none"
          >
            Davom etish
          </button>
        </div>
      )}

      {/* STEP 3: summary and submit */}
      {bookingStep === "checkout" && (
        <div className="flex-1 flex flex-col gap-4.5 px-5 py-4 animate-fade-in text-left">
          <div className={`${chip} rounded-[28px] p-6 shadow-[0_4px_20px_rgba(0,0,0,0.03)] dark:shadow-none space-y-4`}>
            <h3 className="font-black text-xs text-zinc-400 uppercase tracking-widest border-b border-zinc-100 dark:border-white/5 pb-3">
              Bron tafsilotlari
            </h3>
            <div className="space-y-3 text-xs">
              <SummaryRow label="Muassasa:" value={venueName} />
              <SummaryRow label="Sana va vaqt:" value={`${formatDate(selectedDate)} • ${selectedTime}–${endTime}`} />
              <SummaryRow label="Mehmonlar:" value={`${guests} kishi`} />
              <SummaryRow label="Stol:" value={selectedTable ? `${selectedTable.number}-stol` : "—"} />
              <SummaryRow label="Aloqa:" value={`${fullName} • ${phoneNumber}`} />
            </div>

            {orderLines.length > 0 && (
              <div className="space-y-2 text-xs border-t border-zinc-100 dark:border-white/5 pt-3">
                <p className="font-black text-[10px] text-zinc-400 uppercase tracking-widest">Oldindan buyurtma</p>
                {orderLines.map((line) => (
                  <SummaryRow key={line.menu_item_id} label={`${line.name} × ${line.quantity}`} value={formatMoney(line.amount)} />
                ))}
              </div>
            )}

            <div className="border-t border-dashed border-zinc-200 dark:border-white/10 pt-4 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-black text-zinc-400 uppercase tracking-wider block">Jami</span>
                <span className="text-[11px] text-zinc-400">To&apos;lov muassasada amalga oshiriladi</span>
              </div>
              <div className="text-2xl font-black text-[#FF6B00] tracking-tight">{formatMoney(preOrderTotal) ?? "0 so'm"}</div>
            </div>
            {venue.requires_deposit && venue.deposit_percent && (
              <p className="text-[11px] font-bold text-zinc-500">
                Muassasa {+Number(venue.deposit_percent).toFixed(0)}% depozit talab qiladi.
              </p>
            )}
          </div>

          <div className="flex-1 min-h-[30px]" />

          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting}
            className="w-full py-4.5 rounded-2xl bg-gradient-to-r from-[#FF6B00] to-[#FF7A1A] text-white font-black text-base tracking-wide transition-all active:scale-[0.98] shadow-xl shadow-[#FF6B00]/30 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {submitting ? (
              <>
                <Loader2 className="animate-spin h-5 w-5" />
                <span>Band qilinmoqda...</span>
              </>
            ) : (
              <span>{isAuthenticated ? "Bron qilish" : "Bron qilish uchun tizimga kiring"}</span>
            )}
          </button>
        </div>
      )}

      {/* STEP 4: the booking as the server recorded it */}
      {bookingStep === "ticket" && created && booking && status && (
        <div className="flex-1 flex flex-col gap-6 px-6 py-4 animate-fade-in">
          <div
            onClick={() => setBookingStep("qr")}
            className="rounded-[32px] border border-zinc-200/80 dark:border-white/5 bg-white dark:bg-[#393939] overflow-hidden shadow-lg dark:shadow-2xl relative flex flex-col cursor-pointer"
          >
            <div className="relative h-44 w-full bg-zinc-100 dark:bg-zinc-900">
              {cover && <img src={cover} alt={venueName} className="w-full h-full object-cover" />}
              <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/80" />
              <div className="absolute bottom-4 left-5 right-5 text-left">
                <h3 className="text-lg font-black text-white leading-tight">{created.venue_name || venueName}</h3>
              </div>
            </div>

            <div className="p-5.5 space-y-4">
              <div className="space-y-1.5 text-left border-b border-zinc-100 dark:border-white/5 pb-3">
                <div className="flex items-center gap-2 text-[11px] text-zinc-500 font-bold">
                  <Phone className="h-3.5 w-3.5 text-[#FF6B00]" />
                  <span>{venue.phone}</span>
                </div>
                {venueLocation && (
                  <div className="flex items-center gap-2 text-[11px] text-zinc-500 font-bold">
                    <MapPin className="h-3.5 w-3.5 text-[#FF6B00]" />
                    <span className="truncate">{venueLocation}</span>
                  </div>
                )}
              </div>

              <div className="space-y-3 text-xs text-left">
                <SummaryRow label="Holat:" value={<span className={status.tone}>{status.label}</span>} />
                <SummaryRow label="Chipta kodi:" value={<span className="font-mono">{booking.ticket_code}</span>} />
                <SummaryRow
                  label="Sana va vaqt:"
                  value={`${formatDate(booking.booking_date)} • ${formatTime(booking.start_time)}–${formatTime(booking.end_time)}`}
                />
                <SummaryRow label="Mehmonlar:" value={`${booking.guests_count} kishi`} />
                {selectedTable && <SummaryRow label="Stol raqami:" value={`${selectedTable.number}-stol`} />}
                {created.items.map((item) => (
                  <SummaryRow key={item.id} label={`${item.name_snapshot} × ${item.quantity}`} value={formatMoney(item.total_price)} />
                ))}
                <SummaryRow label="Jami:" value={formatMoney(booking.total_amount, booking.currency)} />
              </div>
            </div>

            <div className="p-5.5 pt-0 flex flex-col items-center gap-4">
              <button
                type="button"
                onClick={() => setBookingStep("qr")}
                className="px-4.5 py-3 rounded-full bg-[#FF6B00]/10 border border-[#FF6B00]/20 flex items-center gap-2.5 text-[#FF6B00] hover:bg-[#FF6B00]/20 active:scale-95 transition-all text-[11px] font-extrabold uppercase tracking-wide cursor-pointer"
              >
                <Sparkles className="h-4 w-4" />
                <span>QR kod orqali ko&apos;rish</span>
              </button>
            </div>
          </div>

          <div className="space-y-2.5">
            <Link
              href="/tickets"
              className="w-full py-4 rounded-2xl bg-[#FF6B00] hover:bg-[#E05000] text-white font-extrabold text-sm tracking-wide transition-all active:scale-[0.98] shadow-lg shadow-[#FF6B00]/20 flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Mening bronlarimga o&apos;tish</span>
              <ChevronRight className="h-4 w-4" />
            </Link>
            <Link
              href="/"
              className="w-full py-3.5 rounded-2xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200/80 dark:border-white/5 text-zinc-600 dark:text-zinc-400 font-bold text-xs tracking-wide transition-all active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer"
            >
              Bosh sahifaga qaytish
            </Link>
          </div>
        </div>
      )}

      {/* STEP 5: the ticket's own QR, for the venue's scanner */}
      {bookingStep === "qr" && created && (
        <div className="flex-1 flex flex-col gap-6 px-6 py-4 justify-between animate-fade-in text-center">
          <div className="w-1" />
          <div className="w-full max-w-[300px] bg-white rounded-[40px] p-7 shadow-2xl flex flex-col items-center gap-6 mx-auto animate-scale-up">
            <QRCodeSVG value={created.qr_token} size={208} />
            <div className="text-center">
              <p className="text-zinc-900 text-xs font-black tracking-tight leading-relaxed">
                Ushbu QR kodni muassasa xodimiga ko&apos;rsating
              </p>
              <p className="text-zinc-400 font-mono text-[10px] mt-1">{created.booking.ticket_code}</p>
            </div>
          </div>
          <div className="w-1" />
          <button
            onClick={() => setBookingStep("ticket")}
            className="w-full py-4.5 rounded-2xl bg-[#FF6B00] hover:bg-[#E05000] text-white font-extrabold text-sm tracking-wide transition-all active:scale-[0.98] shadow-xl shadow-[#FF6B00]/20 cursor-pointer"
          >
            Ortga
          </button>
        </div>
      )}
    </div>
  );
}

export default function BookingPage({ params }: Props) {
  const { id } = use(params);

  return (
    <div className="flex flex-col flex-1">
      <Navbar />
      <main className="flex-1 w-full bg-[var(--background)]">
        <Suspense
          fallback={
            <div className="flex items-center justify-center h-64 bg-[var(--background)] text-white">
              <Loader2 className="animate-spin h-8 w-8 text-[#FF6B00]" />
            </div>
          }
        >
          <BookingContent id={id} />
        </Suspense>
      </main>
    </div>
  );
}
