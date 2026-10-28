"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { X, ChevronLeft, ChevronRight, CalendarDays, Check, CheckCircle, Loader2, Sparkles } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { useAuth } from "@/contexts/AuthContext";
import { PhoneInput } from "@/components/phone-input";
import { phoneDigits, toE164 } from "@/lib/phone";
import {
  bookingService,
  venueService,
  BazmlyApiError,
  BookingOwnerDetail,
  VenueDetailRead,
  VenueGuestTierRead,
  VenueServiceRead,
} from "@/lib/api";
import { formatDate, formatMoney, formatTime, parseApiDate, toApiDate } from "@/lib/format";
import { addHours, endTimes, minutesBetween, slotsFor, startTimes, upcomingDates, weekOf, weekdayOf } from "@/lib/venue-hours";
import { DateCalendar } from "@/components/date-calendar";

/** `YYYY-MM-DD` moved by `days`. */
function addDays(isoDate: string, days: number): string {
  const date = parseApiDate(isoDate);
  date.setDate(date.getDate() + days);
  return toApiDate(date);
}

interface ToyxonaFlowModalProps {
  isOpen: boolean;
  onClose: () => void;
  detail: VenueDetailRead;
  theme?: string;
}

/** The shortest event a hall takes, and the end offered first after a start. */
const MIN_EVENT_HOURS = 2;
const DEFAULT_EVENT_HOURS = 5;
/** Start times are offered every half hour. */
const SLOT_MINUTES = 30;
const WEEKDAY_SHORT = ["Dush", "Sesh", "Chor", "Pay", "Jum", "Shan", "Yak"];
/** A to'yxona is booked months ahead; a year is as far as the calendar goes. */
const BOOKABLE_DAYS = 365;

type Step = 1 | 2 | 3 | 4 | 5;

const STEPS = [
  { line1: "To'yxonani", line2: "belgilang" },
  { line1: "Kun va vaqtni", line2: "belgilang" },
  { line1: "Mehmonlar", line2: "soni" },
  { line1: "Chek va", line2: "tasdiq" },
];

function tierLabel(tier: VenueGuestTierRead): string {
  return tier.max_guests ? `${tier.min_guests} - ${tier.max_guests} kishi` : `${tier.min_guests}+ kishi`;
}

/** What a service adds for this many guests, priced the way the server will. */
function serviceQuantity(service: VenueServiceRead, guests: number): number {
  return service.price_unit === "per_guest" ? guests : 1;
}

export default function ToyxonaFlowModal({ isOpen, onClose, detail, theme = "light" }: ToyxonaFlowModalProps) {
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
  const isDark = theme === "dark";
  const venue = detail.venue;
  const tiers = [...detail.guest_tiers].sort((a, b) => a.min_guests - b.min_guests);

  const [step, setStep] = useState<Step>(1);
  const [blocked, setBlocked] = useState<Set<string>>(new Set());
  const [services, setServices] = useState<VenueServiceRead[]>([]);

  const [firstDate] = upcomingDates(venue.min_advance_booking_days, 1);
  const [lastDate] = upcomingDates(venue.min_advance_booking_days + BOOKABLE_DAYS - 1, 1);
  const isUnavailable = (date: string) =>
    date < firstDate ||
    date > lastDate ||
    blocked.has(date) ||
    slotsFor(detail.working_hours, weekdayOf(date), MIN_EVENT_HOURS, SLOT_MINUTES).length === 0;
  const [pickedDate, setPickedDate] = useState("");
  const [pickedTime, setPickedTime] = useState("");
  const selectedDate = pickedDate && !isUnavailable(pickedDate) ? pickedDate : "";
  const times = selectedDate ? slotsFor(detail.working_hours, weekdayOf(selectedDate), MIN_EVENT_HOURS, SLOT_MINUTES) : [];
  const selectedTime = times.includes(pickedTime) ? pickedTime : "";
  const endsFor = (start: string) =>
    selectedDate ? endTimes(detail.working_hours, weekdayOf(selectedDate), start, MIN_EVENT_HOURS, SLOT_MINUTES) : [];
  const ends = selectedTime ? endsFor(selectedTime) : [];
  const [pickedEnd, setPickedEnd] = useState("");
  const selectedEnd = ends.includes(pickedEnd) ? pickedEnd : "";
  const durationText = (start: string, end: string) => {
    const hours = minutesBetween(start, end) / 60;
    return `${Number.isInteger(hours) ? hours : hours.toFixed(1).replace(".", ",")} soat`;
  };
  const chooseStart = (start: string) => {
    setPickedTime(start);
    // A typical wedding length is offered straight away; the end stays editable.
    const options = endsFor(start);
    const usual = addHours(start, DEFAULT_EVENT_HOURS);
    setPickedEnd(options.includes(usual) ? usual : (options[options.length - 1] ?? ""));
  };
  // The strip shows one week — this one until another is picked from the calendar.
  const [weekAnchor, setWeekAnchor] = useState(() => toApiDate(new Date()));
  const week = weekOf(weekAnchor);
  const [showCalendar, setShowCalendar] = useState(false);
  // Before a day is picked the times are shown greyed, from the week's first open day.
  const timesDay = selectedDate || week.find((d) => !isUnavailable(d)) || "";
  const timeStrip = timesDay ? startTimes(detail.working_hours, weekdayOf(timesDay), MIN_EVENT_HOURS, SLOT_MINUTES) : [];

  const [tierId, setTierId] = useState<number | null>(tiers[0]?.id ?? null);
  const tier = tiers.find((t) => t.id === tierId) ?? null;
  const [guests, setGuests] = useState(tiers[0]?.min_guests ?? 0);

  const [chosenServices, setChosenServices] = useState<Set<number>>(new Set());
  const [fullName, setFullName] = useState(user ? `${user.first_name} ${user.last_name}`.trim() : "");
  const [phone, setPhone] = useState(phoneDigits(user?.phone));
  const [note, setNote] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [created, setCreated] = useState<BookingOwnerDetail | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  // Booked days are asked for a month at a time, as the calendar shows them.
  const loadBlocked = (first: string, last: string) => {
    venueService
      .getAvailability(venue.id, first, last)
      .then((res) => setBlocked((prev) => new Set([...prev, ...res.dates])))
      .catch(() => {});
  };

  useEffect(() => {
    if (!isOpen) return;
    const days = weekOf(weekAnchor);
    venueService
      .getAvailability(venue.id, days[0], days[6])
      .then((res) => setBlocked((prev) => new Set([...prev, ...res.dates])))
      .catch(() => {});
  }, [isOpen, venue.id, weekAnchor]);

  useEffect(() => {
    if (!isOpen) return;
    venueService
      .getServices(venue.id, venue.venue_group_id)
      .then((list) => setServices(list.filter((s) => s.is_active)))
      .catch(() => setServices([]));
  }, [isOpen, venue.id, venue.venue_group_id]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(timer);
  }, [toast]);

  if (!isOpen) return null;

  const chooseTier = (next: VenueGuestTierRead) => {
    setTierId(next.id);
    setGuests(next.min_guests);
  };
  const maxGuests = tier?.max_guests ?? venue.capacity_max ?? (tier ? tier.min_guests + 500 : 0);

  const pickedServices = services.filter((s) => chosenServices.has(s.id));
  const hallPrice = tier ? Number(tier.base_price) : 0;
  const servicesTotal = pickedServices.reduce((sum, s) => sum + Number(s.price) * serviceQuantity(s, guests), 0);
  const estimate = hallPrice + servicesTotal;
  const depositPercent = venue.requires_deposit && venue.deposit_percent ? Number(venue.deposit_percent) : 0;

  const back = () => {
    if (step === 1 || step === 5) onClose();
    else setStep((step - 1) as Step);
  };

  const submit = async () => {
    if (!isAuthenticated) {
      router.push("/login");
      return;
    }
    if (!tier || !selectedDate || !selectedTime || !selectedEnd) return;
    setSubmitting(true);
    try {
      const result = await bookingService.bookHall({
        venue_id: venue.id,
        booking_date: selectedDate,
        start_time: `${selectedTime}:00`,
        end_time: `${selectedEnd}:00`,
        guests_count: guests,
        contact_name: fullName.trim(),
        contact_phone: toE164(phone) ?? "",
        note: note.trim() || null,
        services: pickedServices.map((s) => ({ venue_service_id: s.id, quantity: serviceQuantity(s, guests) })),
      });
      setCreated(result);
      setStep(5);
    } catch (err) {
      setToast(err instanceof BazmlyApiError ? err.message : "Bron qilishda xatolik yuz berdi");
    } finally {
      setSubmitting(false);
    }
  };

  const surface = isDark ? "bg-[#2A2A2A] text-zinc-300 hover:bg-[#333333]" : "bg-[#F5F5F7] text-zinc-800 hover:bg-[#EBECEF]";
  const card = (active: boolean) =>
    `p-4 rounded-2xl border flex items-center justify-between cursor-pointer transition-all ${
      active
        ? "border-[#FF5A00] bg-[#FFF9F6] dark:bg-[#FF5A00]/10"
        : isDark
          ? "border-white/10 bg-[#252528] hover:border-white/20"
          : "border-zinc-200 bg-white hover:border-zinc-300"
    }`;
  const radio = (active: boolean) =>
    `w-5 h-5 rounded-full flex items-center justify-center shrink-0 transition-all ${
      active ? "bg-[#FF5A00] text-white shadow-sm" : "border border-zinc-300 dark:border-white/20"
    }`;
  const primary = (enabled: boolean) =>
    `w-full py-3.5 sm:py-4 rounded-full font-bold text-sm sm:text-base text-center transition-all ${
      enabled
        ? "bg-[#FF5A00] hover:bg-[#E05000] text-white shadow-lg shadow-[#FF5A00]/25 active:scale-[0.99] cursor-pointer"
        : isDark
          ? "bg-[#382218] text-white/40 cursor-not-allowed"
          : "bg-[#FFD6BF] text-white cursor-not-allowed"
    }`;
  const timeChip = (selected: boolean, enabled: boolean) =>
    `py-2.5 px-4 rounded-xl flex items-center justify-center gap-1 shrink-0 transition-all text-sm font-bold ${
      selected
        ? "bg-[#FF5A00] text-white shadow-md shadow-[#FF5A00]/25 cursor-pointer"
        : enabled
          ? `${surface} text-[#FF5A00] cursor-pointer`
          : `${isDark ? "bg-[#2A2A2A]/50" : "bg-[#F5F5F7]/60"} text-zinc-400/50 cursor-not-allowed`
    }`;
  const footer = `p-4 border-t shrink-0 z-20 ${isDark ? "bg-[#1E1E1E] border-white/5" : "bg-white border-zinc-100"}`;
  const row = (label: string, value: React.ReactNode, key?: string | number) => (
    <div key={key ?? label} className="flex justify-between items-center gap-3 text-xs">
      <span className="text-zinc-500 dark:text-zinc-400">{label}</span>
      <span className="font-bold text-zinc-900 dark:text-white text-right">{value}</span>
    </div>
  );

  // Stepper: step 1 of the design ("choose the hall") is already done by being here.
  const stepperIndex = step === 1 ? 1 : step === 2 || step === 3 ? 2 : 3;

  return (
    <div className="fixed inset-0 z-[70] flex justify-center bg-black/50 backdrop-blur-xs animate-fade-in">
      {toast && (
        <div className="fixed top-6 left-1/2 transform -translate-x-1/2 z-[80] px-4 py-2 rounded-xl bg-zinc-900/90 text-white text-xs font-semibold shadow-xl flex items-center gap-2 border border-white/10 max-w-xs">
          <CheckCircle className="w-4 h-4 text-[#FF5A00] shrink-0" />
          <span>{toast}</span>
        </div>
      )}

      {showCalendar && (
        <div className="fixed inset-0 z-[80] bg-black/50 flex items-end justify-center animate-fade-in">
          <div className="absolute inset-0" onClick={() => setShowCalendar(false)} />
          <div className={`w-full max-w-md rounded-t-[28px] p-4 pb-8 z-10 relative ${isDark ? "bg-[#1E1E1E] text-white" : "bg-white text-zinc-900"}`}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-bold">To&apos;y sanasini tanlang</h3>
              <button type="button" onClick={() => setShowCalendar(false)} className="p-1 text-zinc-400 cursor-pointer" aria-label="Yopish">
                <X className="w-5 h-5" />
              </button>
            </div>
            <DateCalendar
              isDark={isDark}
              value={selectedDate}
              onChange={(date) => {
                setPickedDate(date);
                setWeekAnchor(date);
                setShowCalendar(false);
              }}
              minDate={firstDate}
              maxDate={lastDate}
              isDisabled={isUnavailable}
              onMonthChange={loadBlocked}
            />
          </div>
        </div>
      )}

      <div
        className={`w-full max-w-md h-full overflow-hidden flex flex-col shadow-2xl relative transition-colors duration-300 ${
          isDark ? "bg-[#1E1E1E] text-white" : "bg-white text-zinc-900"
        }`}
      >
        <div className="shrink-0 border-b border-zinc-100 dark:border-white/5 z-10 bg-inherit">
          <div className="flex items-center justify-between px-4 pt-3.5 pb-1">
            <button onClick={back} className="p-1 -ml-1 hover:opacity-75 active:scale-95 transition-all cursor-pointer" aria-label="Orqaga">
              <ChevronLeft className="w-6 h-6 stroke-[2]" />
            </button>
            <h3 className="font-bold text-base tracking-tight text-center flex-1 truncate">{venue.name}</h3>
            <button onClick={onClose} className="p-1 -mr-1 hover:opacity-75 active:scale-95 transition-all cursor-pointer" aria-label="Yopish">
              <X className="w-5 h-5 stroke-[2]" />
            </button>
          </div>

          {step !== 5 && (
            <div className="px-3 pt-2 pb-2.5">
              <div className="flex items-start justify-between">
                {STEPS.map((item, idx) => {
                  const isCompleted = idx < stepperIndex;
                  const isActive = idx === stepperIndex;
                  return (
                    <React.Fragment key={idx}>
                      <div className="flex flex-col items-center flex-1 max-w-[84px]">
                        <div
                          className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                            isCompleted || isActive
                              ? "bg-[#FF5A00] text-white"
                              : isDark
                                ? "bg-zinc-800 text-zinc-400"
                                : "bg-zinc-200 text-zinc-500"
                          }`}
                        >
                          {isCompleted ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : idx + 1}
                        </div>
                        <div className="text-center mt-1 min-h-[26px]">
                          {[item.line1, item.line2].map((line) => (
                            <span
                              key={line}
                              className={`block text-[10px] leading-tight ${
                                isActive || isCompleted ? "font-semibold" : "text-zinc-400 dark:text-zinc-500 font-medium"
                              }`}
                            >
                              {line}
                            </span>
                          ))}
                        </div>
                      </div>
                      {idx < STEPS.length - 1 && (
                        <div
                          className={`flex-1 h-[2px] mt-3 mx-1 transition-colors ${
                            idx < stepperIndex ? "bg-[#FF5A00]" : isDark ? "bg-zinc-800" : "bg-zinc-200"
                          }`}
                        />
                      )}
                    </React.Fragment>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* STEP 1: date and start time */}
        {step === 1 && (
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="flex-1 overflow-y-auto px-4 sm:px-5 py-4 space-y-6 scrollbar-none">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold">Sanani belgilash</h3>
                  <div className="flex items-center gap-1">
                    {(() => {
                      const prevWeek = addDays(week[0], -7);
                      const canGoBack = week[0] > firstDate;
                      return (
                        <button
                          type="button"
                          disabled={!canGoBack}
                          onClick={() => setWeekAnchor(prevWeek)}
                          className={`p-1.5 rounded-lg ${canGoBack ? "text-[#FF5A00] cursor-pointer" : "text-zinc-400/40 cursor-not-allowed"}`}
                          aria-label="Oldingi hafta"
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </button>
                      );
                    })()}
                    <button
                      type="button"
                      onClick={() => setWeekAnchor(addDays(week[0], 7))}
                      disabled={week[6] >= lastDate}
                      className="p-1.5 rounded-lg text-[#FF5A00] cursor-pointer disabled:text-zinc-400/40"
                      aria-label="Keyingi hafta"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowCalendar(true)}
                      className="ml-1 px-2.5 py-1.5 rounded-lg bg-[#FF5A00]/10 text-[#FF5A00] text-xs font-bold flex items-center gap-1 cursor-pointer"
                      aria-label="Kalendarni ochish"
                    >
                      <CalendarDays className="w-4 h-4" />
                      Kalendar
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-7 gap-1.5">
                  {week.map((date) => {
                    const isSelected = selectedDate === date;
                    const disabled = isUnavailable(date);
                    return (
                      <button
                        key={date}
                        type="button"
                        disabled={disabled}
                        onClick={() => setPickedDate(date)}
                        className={`h-[78px] rounded-[16px] flex flex-col items-center justify-center transition-all ${
                          isSelected
                            ? "bg-[#FF5A00] text-white shadow-md shadow-[#FF5A00]/25 cursor-pointer"
                            : disabled
                              ? `${isDark ? "bg-[#2A2A2A]/50" : "bg-[#F5F5F7]/60"} text-zinc-400/50 cursor-not-allowed`
                              : `${surface} cursor-pointer`
                        }`}
                      >
                        {isSelected ? <Check className="w-3.5 h-3.5 stroke-[3] mb-0.5" /> : <div className="w-3.5 h-3.5 mb-0.5" />}
                        <span className={`text-[11px] font-medium leading-none mb-1.5 ${isSelected ? "" : disabled ? "" : "text-[#FF5A00]"}`}>
                          {WEEKDAY_SHORT[weekdayOf(date)]}
                        </span>
                        <span className="text-xl font-bold leading-none">{Number(date.slice(8, 10))}</span>
                      </button>
                    );
                  })}
                </div>
                <p className="text-[11px] text-zinc-400">
                  Kulrang kunlar band yoki dam olish kuni.
                  {venue.min_advance_booking_days > 0 && ` Kamida ${venue.min_advance_booking_days} kun oldin bron qilinadi.`}
                </p>
              </div>

              <div className="space-y-3 pt-1">
                <h3 className="text-base font-bold">Vaqtni belgilash</h3>
                {timeStrip.length === 0 ? (
                  <p className="text-xs font-semibold text-zinc-400">Bu haftada bo&apos;sh kun yo&apos;q — kalendardan boshqa sanani tanlang.</p>
                ) : (
                  <>
                    <span className="text-xs font-bold text-zinc-400 block">Boshlanishi</span>
                    <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
                      {timeStrip.map(({ time, fits }) => {
                        const enabled = Boolean(selectedDate) && fits;
                        return (
                          <button key={time} type="button" disabled={!enabled} onClick={() => chooseStart(time)} className={timeChip(selectedTime === time, enabled)}>
                            {selectedTime === time && <Check className="w-3.5 h-3.5 stroke-[3] shrink-0" />}
                            <span>{time}</span>
                          </button>
                        );
                      })}
                    </div>

                    <span className="text-xs font-bold text-zinc-400 block pt-1">Tugashi</span>
                    {ends.length === 0 ? (
                      <p className="text-xs text-zinc-400">{selectedDate ? "Avval boshlanish vaqtini tanlang." : "Avval sanani tanlang."}</p>
                    ) : (
                      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
                        {ends.map((time) => (
                          <button key={time} type="button" onClick={() => setPickedEnd(time)} className={timeChip(selectedEnd === time, true)}>
                            {selectedEnd === time && <Check className="w-3.5 h-3.5 stroke-[3] shrink-0" />}
                            <span>{time}</span>
                          </button>
                        ))}
                      </div>
                    )}

                    <p className="text-[11px] text-zinc-400">
                      {selectedTime && selectedEnd
                        ? `To'y ${selectedTime} – ${selectedEnd} (${durationText(selectedTime, selectedEnd)}).`
                        : `Kamida ${MIN_EVENT_HOURS} soat.`}
                    </p>
                  </>
                )}
              </div>
            </div>
            <div className={footer}>
              <button
                disabled={!selectedDate || !selectedTime || !selectedEnd}
                onClick={() => setStep(2)}
                className={primary(Boolean(selectedDate && selectedTime && selectedEnd))}
              >
                Keyingisi
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: guest band and count */}
        {step === 2 && (
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="flex-1 overflow-y-auto px-4 sm:px-5 py-4 space-y-4 scrollbar-none">
              <div>
                <h2 className="text-base font-bold tracking-tight">Mehmonlar sonini tanlang</h2>
                <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-1 leading-relaxed">
                  Zal narxi mehmonlar soniga qarab belgilanadi.
                </p>
              </div>

              {tiers.length === 0 ? (
                <p className="text-xs font-semibold text-zinc-400">Bu zal hali narxlarni kiritmagan.</p>
              ) : (
                <div className="space-y-3 pt-1">
                  {tiers.map((t) => (
                    <div key={t.id} onClick={() => chooseTier(t)} className={card(tierId === t.id)}>
                      <div>
                        <span className="text-sm font-bold block">{tierLabel(t)}</span>
                        <span className="text-xs text-zinc-400 dark:text-zinc-500 mt-0.5 block">
                          Zal narxi: {formatMoney(t.base_price, venue.currency)}
                        </span>
                      </div>
                      <div className={radio(tierId === t.id)}>{tierId === t.id && <Check className="w-3 h-3 stroke-[3]" />}</div>
                    </div>
                  ))}
                </div>
              )}

              {tier && (
                <div className="flex justify-between items-center pt-2">
                  <span className="text-sm font-bold">Aniq mehmonlar soni</span>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setGuests((g) => Math.max(tier.min_guests, g - 10))}
                      className={`w-9 h-9 rounded-xl font-black ${surface}`}
                    >
                      —
                    </button>
                    <span className="text-base font-black w-12 text-center">{guests}</span>
                    <button
                      type="button"
                      onClick={() => setGuests((g) => Math.min(maxGuests, g + 10))}
                      className={`w-9 h-9 rounded-xl font-black ${surface}`}
                    >
                      +
                    </button>
                  </div>
                </div>
              )}
            </div>
            <div className={footer}>
              <button disabled={!tier} onClick={() => setStep(3)} className={primary(Boolean(tier))}>
                Keyingisi
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: the chain's services */}
        {step === 3 && (
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="flex-1 overflow-y-auto px-4 sm:px-5 py-4 space-y-4 scrollbar-none">
              <div>
                <h2 className="text-base font-bold tracking-tight">Qo&apos;shimcha xizmatlar</h2>
                <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-1">Ixtiyoriy — keraklisini belgilang.</p>
              </div>
              {services.length === 0 ? (
                <p className="text-xs font-semibold text-zinc-400">Bu zal qo&apos;shimcha xizmat taklif qilmaydi.</p>
              ) : (
                <div className="space-y-3">
                  {services.map((s) => {
                    const active = chosenServices.has(s.id);
                    return (
                      <div
                        key={s.id}
                        onClick={() =>
                          setChosenServices((prev) => {
                            const next = new Set(prev);
                            if (next.has(s.id)) {
                              next.delete(s.id);
                            } else {
                              // Standart or premium, not both: picking one table
                              // spread replaces the other.
                              if (s.slug?.startsWith("dasturxon")) {
                                for (const other of services) {
                                  if (other.id !== s.id && other.slug?.startsWith("dasturxon")) next.delete(other.id);
                                }
                              }
                              next.add(s.id);
                            }
                            return next;
                          })
                        }
                        className={card(active)}
                      >
                        <div className="min-w-0">
                          <span className="text-sm font-bold block">{s.name}</span>
                          <span className="text-xs text-zinc-400 dark:text-zinc-500 mt-0.5 block">
                            {formatMoney(s.price, s.currency)}
                            {s.price_unit === "per_guest" ? " / mehmon" : s.price_unit === "per_hour" ? " / soat" : ""}
                          </span>
                          {s.items && s.items.length > 0 && (
                            <span className="text-[11px] text-zinc-400 mt-1 block truncate">
                              {s.items.map((i) => i.name).join(", ")}
                            </span>
                          )}
                        </div>
                        <div className={radio(active)}>{active && <Check className="w-3 h-3 stroke-[3]" />}</div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            <div className={footer}>
              <button onClick={() => setStep(4)} className={primary(true)}>
                Keyingisi
              </button>
            </div>
          </div>
        )}

        {/* STEP 4: contact and the estimate */}
        {step === 4 && tier && (
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="flex-1 overflow-y-auto px-4 sm:px-5 py-4 space-y-5 scrollbar-none">
              <div className="space-y-4">
                {[
                  { label: "Ism/Familiya", value: fullName, set: setFullName, placeholder: "Ism/Familiya" },
                  { label: "Telefon raqam", value: phone, set: setPhone, placeholder: "", phone: true },
                  { label: "Izoh (ixtiyoriy)", value: note, set: setNote, placeholder: "Masalan: nikoh to'yi" },
                ].map((field) => (
                  <label key={field.label} className="block space-y-1.5">
                    <span className="text-xs font-bold">{field.label}</span>
                    {"phone" in field ? (
                      <PhoneInput
                        value={field.value}
                        onChange={field.set}
                        className={`w-full px-4 py-3 rounded-2xl text-sm font-semibold outline-none border border-transparent focus-within:border-[#FF5A00] ${
                          isDark ? "bg-[#2A2A2A]" : "bg-[#F5F5F7]"
                        }`}
                      />
                    ) : (
                      <input
                        value={field.value}
                        onChange={(e) => field.set(e.target.value)}
                        placeholder={field.placeholder}
                        className={`w-full px-4 py-3 rounded-2xl text-sm font-semibold outline-none border border-transparent focus:border-[#FF5A00] ${
                          isDark ? "bg-[#2A2A2A]" : "bg-[#F5F5F7]"
                        }`}
                      />
                    )}
                  </label>
                ))}
              </div>

              <div className={`rounded-2xl border p-4 space-y-2.5 ${isDark ? "border-white/10" : "border-zinc-200"}`}>
                {row("Sana:", `${formatDate(selectedDate)} • ${selectedTime}–${selectedEnd}`)}
                {row("Mehmonlar:", `${guests} kishi`)}
                {row(`Zal ijarasi (${tierLabel(tier)}):`, formatMoney(hallPrice, venue.currency))}
                {pickedServices.map((s) =>
                  row(
                    `${s.name}${s.price_unit === "per_guest" ? ` × ${guests}` : ""}:`,
                    formatMoney(Number(s.price) * serviceQuantity(s, guests), s.currency),
                    s.id,
                  ),
                )}
                <div className="border-t border-dashed border-zinc-200 dark:border-white/10 pt-2.5">
                  {row("Taxminiy jami:", <span className="text-[#FF5A00] text-sm">{formatMoney(estimate, venue.currency)}</span>)}
                  {depositPercent > 0 &&
                    row(`Depozit (${depositPercent}%):`, formatMoney((estimate * depositPercent) / 100, venue.currency))}
                </div>
                <p className="text-[11px] text-zinc-400">Yakuniy hisobni muassasa tasdiqlaydi; to&apos;lov muassasada amalga oshiriladi.</p>
              </div>
            </div>
            <div className={footer}>
              <button
                disabled={submitting || !fullName.trim() || !toE164(phone)}
                onClick={submit}
                className={`${primary(!submitting && Boolean(fullName.trim() && toE164(phone)))} flex items-center justify-center gap-2`}
              >
                {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : isAuthenticated ? "Bron qilish" : "Bron qilish uchun tizimga kiring"}
              </button>
            </div>
          </div>
        )}

        {/* STEP 5: the booking as the server recorded and priced it */}
        {step === 5 && created && (
          <div className="flex-1 overflow-y-auto px-5 py-6 space-y-5 scrollbar-none">
            <div className="flex flex-col items-center text-center gap-2">
              <div className="w-14 h-14 rounded-full bg-[#FF5A00]/10 text-[#FF5A00] flex items-center justify-center">
                <Sparkles className="w-7 h-7" />
              </div>
              <h2 className="text-lg font-black">So&apos;rovingiz yuborildi</h2>
              <p className="text-xs text-zinc-400 max-w-xs">
                {created.booking.status === "pending"
                  ? "Muassasa tasdiqlagach, chiptangiz faollashadi."
                  : "Bron tasdiqlandi."}
              </p>
            </div>

            <div className={`rounded-2xl border p-4 space-y-2.5 ${isDark ? "border-white/10" : "border-zinc-200"}`}>
              {row("Chipta kodi:", <span className="font-mono">{created.booking.ticket_code}</span>)}
              {row(
                "Sana:",
                `${formatDate(created.booking.booking_date)} • ${formatTime(created.booking.start_time)}–${formatTime(created.booking.end_time)}`,
              )}
              {row("Mehmonlar:", `${created.booking.guests_count} kishi`)}
              {/* The deposit is its own line below, not a charge on top. */}
              {created.price_lines
                .filter((line) => line.line_type !== "deposit")
                .map((line) => row(`${line.label_snapshot}:`, formatMoney(line.amount, created.booking.currency), line.id))}
              <div className="border-t border-dashed border-zinc-200 dark:border-white/10 pt-2.5 space-y-2">
                {row("Jami:", <span className="text-[#FF5A00] text-sm">{formatMoney(created.booking.total_amount, created.booking.currency)}</span>)}
                {Number(created.booking.deposit_amount) > 0 &&
                  row("Depozit:", formatMoney(created.booking.deposit_amount, created.booking.currency))}
              </div>
            </div>

            <div className="flex flex-col items-center gap-2">
              <div className="bg-white p-3 rounded-2xl">
                <QRCodeSVG value={created.qr_token} size={168} />
              </div>
              <p className="text-[11px] text-zinc-400">Tadbir kuni ushbu QR kodni ko&apos;rsating</p>
            </div>

            <button onClick={() => router.push("/tickets")} className={primary(true)}>
              Mening bronlarim
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
