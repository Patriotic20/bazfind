"use client";

import React, { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTheme } from "@/components/theme-provider";
import { useSession } from "@/lib/hooks/use-session";
import { hasSession } from "@/lib/api/auth-tokens";
import {
  confirmBooking,
  getDashboard,
  getMyBranches,
  getStaffCounts,
  inviteStaff,
  listDayBookings,
  listStaff,
  listStaffRoles,
  partnerKeys,
  rejectBooking,
  setStaffActive,
  type StaffInvitationCreated,
} from "@/lib/api/endpoints/partner";
import { ApiError, type Booking, type StaffMember } from "@/lib/api/types";
import {
  LogOut,
  Plus,
  MapPin,
  Users,
  Calendar,
  Check,
  X,
  Building2,
  Clock,
  Bell,
  ChevronRight,
  ChevronLeft,
  Settings,
  Utensils,
  User,
  CheckCircle2,
  Copy,
  Moon,
  Sun,
} from "lucide-react";

/** date.weekday() on the backend: 0 = Monday. */
const WEEKDAY_LABELS = ["Dush", "Sesh", "Chor", "Pay", "Jum", "Shan", "Yak"];

const STATUS_LABELS: Record<string, { text: string; classes: string }> = {
  pending: { text: "Kutilmoqda", classes: "bg-amber-500/10 text-amber-500" },
  confirmed: { text: "Tasdiqlandi", classes: "bg-green-500/10 text-green-500" },
  checked_in: { text: "Keldi", classes: "bg-blue-500/10 text-blue-500" },
  completed: { text: "Yakunlandi", classes: "bg-zinc-500/10 text-zinc-500" },
  cancelled: { text: "Rad etildi", classes: "bg-red-500/10 text-red-500" },
  no_show: { text: "Kelmadi", classes: "bg-red-500/10 text-red-500" },
  expired: { text: "Muddati o'tdi", classes: "bg-zinc-500/10 text-zinc-400" },
};

function isoDate(d: Date): string {
  // Local date, not toISOString(): the queue is the venue's day, and after
  // 19:00 in Tashkent the UTC date is already tomorrow.
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${month}-${day}`;
}

function shiftDay(day: string, delta: number): string {
  const d = new Date(`${day}T00:00:00`);
  d.setDate(d.getDate() + delta);
  return isoDate(d);
}

function formatDay(day: string): string {
  const [y, m, d] = day.split("-");
  return `${d}/${m}/${y}`;
}

/** "18:30:00" -> "18:30" */
function formatTime(t: string): string {
  return t.slice(0, 5);
}

function formatMoney(amount: string, currency: string): string {
  const n = Number(amount);
  if (Number.isNaN(n)) return `${amount} ${currency}`;
  return `${n.toLocaleString("ru-RU", { maximumFractionDigits: 0 })} ${currency}`;
}

function describeError(err: unknown): string {
  return err instanceof ApiError ? err.message : "Xatolik yuz berdi. Qaytadan urinib ko'ring.";
}

export default function AdminPage() {
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";
  const queryClient = useQueryClient();
  const session = useSession();

  const [activeTab, setActiveTab] = useState<
    "home" | "bookings" | "menu" | "staff" | "settings"
  >("home");
  const [toastMessage, setToastMessage] = useState("");
  const [selectedVenueId, setSelectedVenueId] = useState<number | null>(null);
  const [bookingsDay, setBookingsDay] = useState(() => isoDate(new Date()));

  // Invite modal
  const [showAddStaffModal, setShowAddStaffModal] = useState(false);
  const [newStaffName, setNewStaffName] = useState("");
  const [newStaffRoleId, setNewStaffRoleId] = useState<number | null>(null);
  const [newStaffPhone, setNewStaffPhone] = useState("");
  // The login and temporary password exist only in the invite response; this is
  // the one screen that ever shows them.
  const [createdInvite, setCreatedInvite] = useState<StaffInvitationCreated | null>(null);

  // Being a partner means owning a chain, which is a question for the server.
  React.useEffect(() => {
    if (!session.isResolved) return;
    if (!session.signedIn || !session.isPartner) {
      // On a hard load the store still holds the prerendered "signed out"
      // snapshot when this first runs, while localStorage already has the
      // session — redirecting on that value bounced every reload to /login.
      if (!session.signedIn && hasSession()) return;
      router.push("/login");
    }
  }, [router, session.isResolved, session.signedIn, session.isPartner]);

  const group = session.group;

  const branchesQuery = useQuery({
    queryKey: partnerKeys.branches(),
    queryFn: ({ signal }) => getMyBranches(signal),
    enabled: session.isPartner,
    staleTime: 60_000,
  });
  const branches = useMemo(
    () => branchesQuery.data?.branches ?? [],
    [branchesQuery.data?.branches],
  );

  // The branch every venue-scoped query runs against. Defaults to the first one
  // without clobbering an explicit choice.
  const venueId = selectedVenueId ?? branches[0]?.id ?? null;

  const dashboardQuery = useQuery({
    queryKey: partnerKeys.dashboard(venueId ?? 0),
    queryFn: ({ signal }) => getDashboard(venueId as number, signal),
    enabled: venueId !== null,
    staleTime: 30_000,
  });
  const dashboard = dashboardQuery.data ?? null;

  const bookingsQuery = useQuery({
    queryKey: partnerKeys.dayBookings(venueId ?? 0, bookingsDay),
    queryFn: ({ signal }) => listDayBookings(venueId as number, bookingsDay, undefined, signal),
    enabled: venueId !== null,
  });
  const bookings = bookingsQuery.data ?? [];

  const staffQuery = useQuery({
    queryKey: partnerKeys.staff(),
    queryFn: ({ signal }) => listStaff(signal),
    enabled: session.isPartner,
  });
  const staff = staffQuery.data ?? [];

  const staffCountsQuery = useQuery({
    queryKey: partnerKeys.staffCounts(),
    queryFn: ({ signal }) => getStaffCounts(signal),
    enabled: session.isPartner,
  });

  const rolesQuery = useQuery({
    queryKey: partnerKeys.roles(),
    queryFn: ({ signal }) => listStaffRoles(signal),
    enabled: showAddStaffModal,
    staleTime: 5 * 60_000,
  });
  const roles = rolesQuery.data ?? [];

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(""), 3000);
  };

  const invalidateBookings = () => {
    void queryClient.invalidateQueries({ queryKey: ["partner", "bookings"] });
    void queryClient.invalidateQueries({ queryKey: ["partner", "dashboard"] });
  };

  const confirmMutation = useMutation({
    mutationFn: (booking: Booking) => confirmBooking(booking.id, booking.venue_id),
    onSuccess: () => {
      invalidateBookings();
      showToast("Bron tasdiqlandi!");
    },
    onError: (err) => showToast(describeError(err)),
  });

  const rejectMutation = useMutation({
    mutationFn: (booking: Booking) => rejectBooking(booking.id, booking.venue_id),
    onSuccess: () => {
      invalidateBookings();
      showToast("Bron rad etildi.");
    },
    onError: (err) => showToast(describeError(err)),
  });

  const inviteMutation = useMutation({
    mutationFn: () =>
      inviteStaff({
        full_name: newStaffName.trim(),
        phone: newStaffPhone.trim(),
        staff_role_id: newStaffRoleId as number,
        venue_id: venueId,
      }),
    onSuccess: (created) => {
      setCreatedInvite(created);
      setNewStaffName("");
      setNewStaffPhone("");
      void queryClient.invalidateQueries({ queryKey: ["partner", "staff"] });
      void queryClient.invalidateQueries({ queryKey: ["partner", "staff-counts"] });
    },
    onError: (err) => showToast(describeError(err)),
  });

  const toggleActiveMutation = useMutation({
    mutationFn: (member: StaffMember) =>
      setStaffActive(member.id, member.venue_id ?? (venueId as number), !member.is_active),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["partner", "staff"] });
      void queryClient.invalidateQueries({ queryKey: ["partner", "staff-counts"] });
    },
    onError: (err) => showToast(describeError(err)),
  });

  const handleInvite = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStaffName.trim() || !newStaffPhone.trim() || newStaffRoleId === null) {
      showToast("Barcha maydonlarni to'ldiring!");
      return;
    }
    inviteMutation.mutate();
  };

  const handleLogout = async () => {
    await session.signOut();
    router.push("/login");
  };

  const closeInviteModal = () => {
    setShowAddStaffModal(false);
    setCreatedInvite(null);
  };

  const pendingCount = bookings.filter((b) => b.status === "pending").length;
  const maxWeekBookings = Math.max(1, ...(dashboard?.week.map((w) => w.bookings_count) ?? [1]));
  // Null when there is no previous period to compare against (a brand-new venue).
  const bookingsDelta =
    dashboard?.comparison.bookings_delta_percent != null
      ? Number(dashboard.comparison.bookings_delta_percent)
      : null;

  if (!session.isResolved || !session.isPartner) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[var(--background)]">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-primary" />
        <p className="mt-4 text-xs font-semibold text-zinc-500">Yuklanmoqda...</p>
      </div>
    );
  }

  const branchPicker = branches.length > 1 && (
    <select
      value={venueId ?? undefined}
      onChange={(e) => setSelectedVenueId(Number(e.target.value))}
      className={`text-xs font-bold rounded-xl px-2.5 py-1.5 border outline-none ${
        isDark ? "bg-[#2C2C2E] border-white/10 text-white" : "bg-zinc-100 border-zinc-200"
      }`}
    >
      {branches.map((b) => (
        <option key={b.id} value={b.id}>
          {b.name}
        </option>
      ))}
    </select>
  );

  return (
    <div
      className={`flex flex-col flex-1 w-full min-h-screen bg-[var(--background)] ${isDark ? "text-white" : "text-zinc-900"} relative select-none`}
    >
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-[100] px-4 py-2.5 rounded-xl bg-primary text-white text-xs font-bold shadow-xl animate-fade-in flex items-center gap-2 border border-white/20">
          <CheckCircle2 className="h-4.5 w-4.5 shrink-0 text-white" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* TAB 1: ASOSIY (HOME) */}
      {activeTab === "home" && (
        <div className="flex flex-col flex-1 animate-fade-in pb-20">
          <header className="px-6 pt-6 pb-2.5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full overflow-hidden border border-zinc-200 dark:border-white/10 shadow-sm bg-zinc-100">
                <img
                  src={group?.logo_url ?? "/images/restaurant.png"}
                  alt="Venue Avatar"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="text-left">
                <h2 className="font-extrabold text-sm tracking-tight">{group?.name}</h2>
                <span className="text-[10px] font-bold text-zinc-400 dark:text-zinc-550 uppercase tracking-wider">
                  Hamkor paneli
                </span>
              </div>
            </div>
            {branchPicker || (
              <button
                className={`w-9 h-9 rounded-full flex items-center justify-center relative transition-all active:scale-95 ${
                  isDark
                    ? "bg-[#2C2C2E]/60 text-white hover:bg-[#3A3A3C]"
                    : "bg-zinc-100 text-zinc-800 hover:bg-zinc-150"
                }`}
              >
                <Bell className="h-4.5 w-4.5" />
              </button>
            )}
          </header>

          {/* Branch open/closed badge */}
          <div className="px-6 py-2 flex items-center gap-2 text-xs font-semibold text-zinc-500 dark:text-zinc-400">
            <Clock className="h-4 w-4 text-zinc-450" />
            <span>{dashboard?.venue_name ?? branches[0]?.name ?? ""}</span>
            {dashboard &&
              (dashboard.is_open_now ? (
                <span className="px-2.5 py-1 rounded-xl bg-emerald-500/10 text-emerald-500 font-extrabold">
                  Ochiq
                </span>
              ) : (
                <span className="px-2.5 py-1 rounded-xl bg-red-500/10 text-red-500 font-extrabold">
                  Yopiq
                </span>
              ))}
          </div>

          {/* Live queue card */}
          <div
            onClick={() => setActiveTab("bookings")}
            className="mx-6 mt-4 p-5 rounded-[24px] bg-[#FF5A00] text-white shadow-lg shadow-[#FF5A00]/25 relative overflow-hidden transition-all hover:scale-[1.01] cursor-pointer"
          >
            <div className="flex justify-between items-center">
              <span className="text-xs font-extrabold tracking-wide uppercase opacity-90">
                Hozirgi navbat
              </span>
              <ChevronRight className="h-4 w-4 opacity-80" />
            </div>
            <div className="mt-2.5 flex items-baseline gap-2">
              <span className="text-3xl font-black tracking-tight">
                {dashboard ? `${dashboard.queue_count} ta` : "…"}
              </span>
            </div>
            <p className="mt-1 text-[11px] font-semibold opacity-75">mijoz band qilgan</p>
          </div>

          {/* Weekly bookings chart */}
          <div
            className={`mx-6 mt-4 p-5 rounded-[28px] border transition-all ${
              isDark ? "bg-[#2C2520] border-[#FF5A00]/10" : "bg-[#FAF5F0] border-[#FF5A00]/5"
            }`}
          >
            <div className="flex justify-between items-start">
              <div className="space-y-0.5 text-left">
                <span className="text-[11px] font-bold tracking-wide text-black/55 dark:text-white/60 uppercase">
                  1 haftalik band qilishlar
                </span>
                <h3 className="text-xl font-black tracking-tight text-black dark:text-white">
                  {dashboard
                    ? `${dashboard.week.reduce((sum, w) => sum + w.bookings_count, 0)} ta`
                    : "…"}
                </h3>
              </div>
              {bookingsDelta !== null && (
                <span
                  className={`text-xs font-black ${
                    bookingsDelta >= 0 ? "text-emerald-500" : "text-red-500"
                  }`}
                >
                  {bookingsDelta >= 0 ? "+" : ""}
                  {bookingsDelta}%
                </span>
              )}
            </div>

            <div className="mt-8 flex justify-between items-end h-[148px] px-0.5 gap-2">
              {(dashboard?.week ?? []).map((bar, i, arr) => {
                const height = Math.max(28, Math.round((bar.bookings_count / maxWeekBookings) * 140));
                const active = i === arr.length - 1; // today is the last bar
                return (
                  <div key={i} className="flex flex-col items-center gap-2.5 flex-1">
                    <div className="w-full flex items-end justify-center">
                      <div
                        style={{ height: `${height}px` }}
                        className={`w-full rounded-[14px] flex flex-col justify-start items-center pt-2 transition-all duration-300 relative ${
                          active
                            ? "bg-[#FF5A00] text-white shadow-md shadow-[#FF5A00]/25"
                            : isDark
                              ? "bg-[#3A3A3C] text-white/90"
                              : "bg-white text-zinc-800 shadow-[0_2px_8px_rgba(0,0,0,0.02)]"
                        }`}
                      >
                        <span className="text-[10px] font-bold tracking-tight">
                          {bar.bookings_count}
                        </span>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold opacity-60 leading-none">
                      {WEEKDAY_LABELS[bar.weekday] ?? ""}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Branches & staff counters */}
          <div className="mx-6 mt-4 grid grid-cols-2 gap-4">
            <div
              onClick={() => setActiveTab("menu")}
              className={`p-4 rounded-[20px] border flex flex-col justify-between h-24 text-left transition-all active:scale-98 cursor-pointer ${
                isDark
                  ? "bg-[#393939]/30 border-white/5 hover:border-white/10"
                  : "bg-white border-zinc-200 shadow-sm hover:border-zinc-300"
              }`}
            >
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-extrabold opacity-60 uppercase tracking-wide">
                  Filiallar soni
                </span>
                <ChevronRight className="h-3.5 w-3.5 opacity-55" />
              </div>
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-500">
                  <Building2 className="h-4.5 w-4.5" />
                </div>
                <span className="text-lg font-black">
                  {dashboard?.branches_total ?? branches.length} ta
                </span>
              </div>
            </div>

            <div
              onClick={() => setActiveTab("staff")}
              className={`p-4 rounded-[20px] border flex flex-col justify-between h-24 text-left transition-all active:scale-98 cursor-pointer ${
                isDark
                  ? "bg-[#393939]/30 border-white/5 hover:border-white/10"
                  : "bg-white border-zinc-200 shadow-sm hover:border-zinc-300"
              }`}
            >
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-extrabold opacity-60 uppercase tracking-wide">
                  Hodimlar soni
                </span>
                <ChevronRight className="h-3.5 w-3.5 opacity-55" />
              </div>
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-purple-500/10 text-purple-500">
                  <Users className="h-4.5 w-4.5" />
                </div>
                <span className="text-lg font-black">
                  {dashboard?.staff_total ?? staffCountsQuery.data?.total ?? staff.length} ta
                </span>
              </div>
            </div>
          </div>

          {/* Monthly summary */}
          <div
            className={`mx-6 mt-4 p-5 rounded-[24px] border text-left transition-all ${
              isDark ? "bg-[#393939]/20 border-white/5" : "bg-white border-zinc-150 shadow-sm"
            }`}
          >
            <div className="flex justify-between items-center">
              <span className="text-xs font-extrabold tracking-wide opacity-50 dark:opacity-60 uppercase">
                1 oylik band qilishlar
              </span>
              {dashboard && (
                <span className="text-xs font-bold text-zinc-500 dark:text-zinc-400 bg-zinc-100 dark:bg-white/5 px-2.5 py-1 rounded-xl">
                  {formatMoney(dashboard.month_revenue, dashboard.currency)}
                </span>
              )}
            </div>
            <div className="mt-3 flex items-baseline justify-between">
              <div>
                <span className="text-2xl font-black tracking-tight">
                  {dashboard ? `${dashboard.month_bookings} ta` : "…"}
                </span>
                <p className="text-[11px] font-semibold opacity-60 mt-0.5">mijoz band qildi</p>
              </div>
              {bookingsDelta !== null && (
                <span
                  className={`text-[10px] font-bold px-2.5 py-1 rounded-full flex items-center gap-0.5 ${
                    bookingsDelta >= 0
                      ? "bg-emerald-500/10 text-emerald-500"
                      : "bg-red-500/10 text-red-500"
                  }`}
                >
                  {bookingsDelta >= 0 ? "+" : ""}
                  {bookingsDelta}% {bookingsDelta >= 0 ? "▲" : "▼"}
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: BUYURTMALAR (BOOKINGS) */}
      {activeTab === "bookings" && (
        <div className="flex flex-col flex-1 animate-fade-in pb-20">
          <header className="px-6 py-5 border-b border-zinc-100 dark:border-white/5 flex items-center justify-between">
            <h1 className="text-xl font-black">Bron buyurtmalari</h1>
            <span className="text-xs font-bold px-3 py-1 rounded-full bg-[#FF5A00]/10 text-[#FF5A00]">
              {pendingCount} yangi
            </span>
          </header>

          {/* Day switcher */}
          <div className="px-6 py-3 flex items-center justify-between gap-2">
            <button
              onClick={() => setBookingsDay((d) => shiftDay(d, -1))}
              className={`p-2 rounded-xl border active:scale-95 transition-all ${
                isDark ? "border-white/10" : "border-zinc-200"
              }`}
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={() => setBookingsDay(isoDate(new Date()))}
              className="text-sm font-black"
            >
              {formatDay(bookingsDay)}
              {bookingsDay === isoDate(new Date()) && (
                <span className="ml-2 text-[10px] font-bold text-[#FF5A00]">Bugun</span>
              )}
            </button>
            <div className="flex items-center gap-2">
              {branchPicker}
              <button
                onClick={() => setBookingsDay((d) => shiftDay(d, 1))}
                className={`p-2 rounded-xl border active:scale-95 transition-all ${
                  isDark ? "border-white/10" : "border-zinc-200"
                }`}
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          <main className="flex-1 overflow-y-auto px-6 py-2 space-y-4 text-left">
            {bookingsQuery.isPending ? (
              <div className="text-center py-12 opacity-50">
                <p className="text-xs font-bold">Yuklanmoqda...</p>
              </div>
            ) : bookings.length === 0 ? (
              <div className="text-center py-12 opacity-50 space-y-2">
                <Calendar className="h-10 w-10 mx-auto" />
                <p className="text-xs font-bold">{"Bu kunda bronlar yo'q"}</p>
              </div>
            ) : (
              bookings.map((booking) => {
                const status = STATUS_LABELS[booking.status] ?? {
                  text: booking.status,
                  classes: "bg-zinc-500/10 text-zinc-500",
                };
                return (
                  <div
                    key={booking.id}
                    className={`p-5 rounded-2xl border flex flex-col gap-3.5 transition-all ${
                      isDark ? "bg-[#393939]/30 border-white/5" : "bg-white border-zinc-150 shadow-sm"
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div className="space-y-0.5">
                        <h3 className="font-extrabold text-sm">{booking.contact_name}</h3>
                        <p className="text-[10px] font-mono text-zinc-400">
                          {booking.contact_phone}
                        </p>
                      </div>
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${status.classes}`}
                      >
                        {status.text}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs font-medium border-t border-zinc-100 dark:border-white/5 pt-3">
                      <div>
                        <span className="text-[10px] opacity-40 block">Joylashuv:</span>
                        <span>
                          {booking.kind === "hall_event"
                            ? "Zal (to'yxona)"
                            : booking.table_id
                              ? `${booking.table_id}-stol`
                              : "Stol"}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] opacity-40 block">Mehmonlar:</span>
                        <span>{booking.guests_count} kishi</span>
                      </div>
                      <div className="mt-1">
                        <span className="text-[10px] opacity-40 block">Vaqt:</span>
                        <span>
                          {formatTime(booking.start_time)} – {formatTime(booking.end_time)}
                        </span>
                      </div>
                      <div className="mt-1">
                        <span className="text-[10px] opacity-40 block">Summa:</span>
                        <span>{formatMoney(booking.total_amount, booking.currency)}</span>
                      </div>
                    </div>

                    {booking.status === "pending" && (
                      <div className="flex gap-2 pt-1 border-t border-zinc-100 dark:border-white/5 mt-1">
                        <button
                          onClick={() => confirmMutation.mutate(booking)}
                          disabled={confirmMutation.isPending}
                          className="flex-1 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors active:scale-98 disabled:opacity-50"
                        >
                          <Check className="h-4 w-4 stroke-[3px]" /> Tasdiqlash
                        </button>
                        <button
                          onClick={() => rejectMutation.mutate(booking)}
                          disabled={rejectMutation.isPending}
                          className="py-2 px-3 rounded-xl border border-red-500/20 hover:bg-red-500/5 text-red-500 font-bold text-xs flex items-center justify-center transition-colors active:scale-98 disabled:opacity-50"
                        >
                          <X className="h-4 w-4" /> Rad etish
                        </button>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </main>
        </div>
      )}

      {/* TAB 3: FILIALLAR (BRANCHES) */}
      {activeTab === "menu" && (
        <div className="flex flex-col flex-1 animate-fade-in pb-20">
          <header className="px-6 py-5 border-b border-zinc-100 dark:border-white/5 flex items-center justify-between">
            <h1 className="text-xl font-black">Filiallar</h1>
          </header>

          <main className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
            {branchesQuery.isPending ? (
              <div className="text-center py-12 opacity-50">
                <p className="text-xs font-bold">Yuklanmoqda...</p>
              </div>
            ) : branches.length === 0 ? (
              <div className="border border-dashed border-zinc-300 dark:border-white/10 rounded-2xl p-10 text-center space-y-3 bg-white/10 dark:bg-zinc-900/10">
                <Building2 className="h-10 w-10 text-zinc-400 mx-auto" />
                <p className="text-xs font-semibold opacity-60">
                  {"Sizda hali ro'yxatdan o'tgan filiallar yo'q."}
                </p>
              </div>
            ) : (
              branches.map((branch) => (
                <div
                  key={branch.id}
                  className={`p-4 rounded-2xl border flex flex-col gap-3 transition-all ${
                    isDark ? "bg-[#393939]/30 border-white/5" : "bg-white border-zinc-150 shadow-sm"
                  }`}
                >
                  <div className="flex gap-4">
                    <div className="w-16 h-16 rounded-2xl bg-[#FF5A00]/10 flex items-center justify-center text-3xl shrink-0">
                      {group?.primary_venue_type === "toyxona" ? "🏰" : "🍽️"}
                    </div>

                    <div className="space-y-1 w-full min-w-0 text-left">
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold truncate text-sm">{branch.name}</h3>
                        <span
                          className={`px-2 py-0.5 text-[8px] font-black uppercase rounded-full tracking-wider ${
                            branch.status === "active"
                              ? "bg-emerald-500/10 text-emerald-500"
                              : "bg-amber-500/10 text-amber-500"
                          }`}
                        >
                          {branch.status === "active" ? "Faol" : branch.status}
                        </span>
                      </div>

                      {branch.tagline && (
                        <div className="flex items-center gap-1 text-[11px] opacity-60">
                          <MapPin className="h-3 w-3 text-zinc-400" />
                          <span className="truncate">{branch.tagline}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex justify-between items-center border-t border-zinc-100 dark:border-white/5 pt-2.5 text-[10px] opacity-50">
                    <span>ID: {branch.id}</span>
                    {venueId === branch.id ? (
                      <span className="font-black text-[#FF5A00]">Tanlangan</span>
                    ) : (
                      <button
                        onClick={() => setSelectedVenueId(branch.id)}
                        className="font-bold px-2 py-1 rounded-lg hover:bg-[#FF5A00]/10 text-[#FF5A00] transition-colors"
                      >
                        Tanlash
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </main>
        </div>
      )}

      {/* TAB 4: XODIMLAR (STAFF) */}
      {activeTab === "staff" && (
        <div className="flex flex-col flex-1 animate-fade-in pb-20">
          <header className="px-6 py-5 border-b border-zinc-100 dark:border-white/5 flex items-center justify-between">
            <div className="flex items-baseline gap-2">
              <h1 className="text-xl font-black">Xodimlar</h1>
              {staffCountsQuery.data && (
                <span className="text-[10px] font-bold opacity-50">
                  {staffCountsQuery.data.active} faol / {staffCountsQuery.data.total} jami
                </span>
              )}
            </div>
            <button
              onClick={() => setShowAddStaffModal(true)}
              className="p-2 rounded-xl bg-[#FF5A00] text-white flex items-center justify-center active:scale-95 transition-all shadow-md shadow-[#FF5A00]/10"
              title="Yangi xodim qo'shish"
            >
              <Plus className="h-4.5 w-4.5 stroke-[2.5px]" />
            </button>
          </header>

          <main className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
            {staffQuery.isPending ? (
              <div className="text-center py-12 opacity-50">
                <p className="text-xs font-bold">Yuklanmoqda...</p>
              </div>
            ) : staff.length === 0 ? (
              <div className="text-center py-12 opacity-50 space-y-2">
                <Users className="h-10 w-10 mx-auto" />
                <p className="text-xs font-bold">{"Hodimlar hali qo'shilmagan"}</p>
              </div>
            ) : (
              staff.map((member) => (
                <div
                  key={member.id}
                  className={`p-4 rounded-2xl border flex items-center justify-between transition-all ${
                    isDark ? "bg-[#393939]/30 border-white/5" : "bg-white border-zinc-150 shadow-sm"
                  }`}
                >
                  <div className="flex items-center gap-3 text-left">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        isDark ? "bg-white/5 text-white" : "bg-zinc-100 text-zinc-700"
                      }`}
                    >
                      <User className="w-5 h-5" />
                    </div>
                    <div className="space-y-0.5">
                      <h3 className="font-extrabold text-sm">
                        {member.user.first_name} {member.user.last_name}
                      </h3>
                      <p className="text-[10px] text-zinc-400 font-medium">{member.role_name}</p>
                    </div>
                  </div>

                  <button
                    onClick={() => toggleActiveMutation.mutate(member)}
                    disabled={toggleActiveMutation.isPending}
                    className="flex items-center gap-2 active:scale-95 transition-all disabled:opacity-50"
                    title="Faollikni o'zgartirish"
                  >
                    <span
                      className={`w-2.5 h-2.5 rounded-full ${
                        member.is_active ? "bg-emerald-500" : "bg-zinc-400"
                      }`}
                    />
                    <span className="text-xs font-bold opacity-60">
                      {member.is_active ? "Ishda" : "Damda"}
                    </span>
                  </button>
                </div>
              ))
            )}
          </main>

        </div>
      )}

      {/* TAB 5: SOZLAMALAR (SETTINGS) */}
      {activeTab === "settings" && (
        <div className="flex flex-col flex-1 animate-fade-in pb-20">
          <header className="px-6 py-5 border-b border-zinc-100 dark:border-white/5 flex items-center justify-between">
            <h1 className="text-xl font-black">Profil sozlamalari</h1>
          </header>

          <main className="flex-1 overflow-y-auto px-6 py-6 space-y-6 text-left">
            <div className="flex items-center gap-4 border-b border-zinc-100 dark:border-white/5 pb-5">
              <div className="w-16 h-16 rounded-full overflow-hidden border bg-zinc-100 shadow-md">
                <img
                  src={group?.logo_url ?? "/images/restaurant.png"}
                  alt="Profile"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="space-y-0.5">
                <h3 className="font-extrabold text-base">{group?.name}</h3>
                <p className="text-xs text-zinc-400 font-bold uppercase tracking-wider">
                  {group?.primary_venue_type === "toyxona" ? "To'yxona tarmog'i" : "Restoran tarmog'i"}
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div
                className={`p-4 rounded-xl border text-xs font-semibold space-y-2 ${
                  isDark ? "border-white/10 bg-[#393939]/30" : "border-zinc-200 bg-zinc-50"
                }`}
              >
                <div className="flex justify-between">
                  <span className="opacity-50">Egasi</span>
                  <span className="font-bold">
                    {session.user?.first_name} {session.user?.last_name}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="opacity-50">Filiallar</span>
                  <span className="font-bold">{branches.length} ta</span>
                </div>
                <div className="flex justify-between">
                  <span className="opacity-50">Valyuta</span>
                  <span className="font-bold">{group?.default_currency}</span>
                </div>
                <div className="flex justify-between">
                  <span className="opacity-50">Holat</span>
                  <span className="font-bold">{group?.status === "active" ? "Faol" : group?.status}</span>
                </div>
              </div>

              {/* Theme toggle */}
              <div className="pt-2">
                <label className="text-xs font-bold opacity-60 block mb-2">Ilova mavzusi</label>
                <button
                  type="button"
                  onClick={toggleTheme}
                  className={`w-full flex items-center justify-between p-4 rounded-xl border transition-all ${
                    isDark
                      ? "bg-[#393939] border-white/10"
                      : "bg-zinc-50 border-zinc-200 hover:bg-zinc-100"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {isDark ? (
                      <Moon className="h-4.5 w-4.5 text-[#FF5A00]" />
                    ) : (
                      <Sun className="h-4.5 w-4.5 text-[#FF5A00]" />
                    )}
                    <span className="text-xs font-extrabold">
                      {isDark ? "Tungi rejim" : "Kunduzgi rejim"}
                    </span>
                  </div>
                  <span className="text-[10px] font-black uppercase bg-[#FF5A00]/10 text-[#FF5A00] px-2 py-0.5 rounded">
                    {"O'zgartirish"}
                  </span>
                </button>
              </div>

              {/* Logout */}
              <div className="pt-6">
                <button
                  onClick={() => void handleLogout()}
                  className="w-full py-4 border border-red-500/20 bg-red-500/10 hover:bg-red-500/20 text-red-500 font-black text-xs tracking-wider rounded-2xl flex items-center justify-center gap-2 transition-all active:scale-98"
                >
                  <LogOut className="w-4.5 h-4.5" />
                  <span>AKKAUNTDAN CHIQISH</span>
                </button>
              </div>
            </div>
          </main>
        </div>
      )}

      {/* Invite Modal */}
      {showAddStaffModal && (
        <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-end justify-center transition-opacity duration-300 animate-fade-in">
          <div className="absolute inset-0" onClick={closeInviteModal} />

          <div
            className={`w-full max-w-md rounded-t-[32px] px-6 pt-3 pb-8 flex flex-col items-stretch gap-4 z-10 animate-slide-up border-t relative text-left ${
              isDark ? "bg-[#393939] border-white/5" : "bg-white border-zinc-200"
            }`}
          >
            <div
              className={`w-12 h-1 rounded-full mx-auto mb-2 ${isDark ? "bg-white/20" : "bg-zinc-250"}`}
            />

            {createdInvite ? (
              /* The credentials appear exactly once — here. */
              <div className="space-y-4">
                <h3 className="font-black text-base">{"Xodim qo'shildi ✅"}</h3>
                <p className="text-xs font-semibold opacity-70">
                  {"Quyidagi login va vaqtinchalik parolni xodimga o'zingiz yetkazing. Ular "}
                  <b>faqat hozir</b>{" ko'rinadi — keyin qayta o'qib bo'lmaydi."}
                </p>
                <div
                  className={`p-4 rounded-xl border space-y-2 font-mono text-sm ${
                    isDark ? "border-white/10 bg-[#2C2C2E]" : "border-zinc-200 bg-zinc-50"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span>
                      <span className="opacity-50 text-xs">login:</span> {createdInvite.login}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>
                      <span className="opacity-50 text-xs">parol:</span>{" "}
                      {createdInvite.temporary_password}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => {
                    void navigator.clipboard.writeText(
                      `login: ${createdInvite.login}\nparol: ${createdInvite.temporary_password}`,
                    );
                    showToast("Nusxalandi!");
                  }}
                  className={`w-full py-3 rounded-xl border font-bold text-xs flex items-center justify-center gap-2 ${
                    isDark ? "border-white/10" : "border-zinc-200"
                  }`}
                >
                  <Copy className="h-4 w-4" /> Nusxalash
                </button>
                <button
                  onClick={closeInviteModal}
                  className="w-full py-4 bg-[#FF5A00] hover:bg-[#E05000] text-white font-extrabold text-xs rounded-2xl shadow-lg transition-all active:scale-98"
                >
                  Yopish
                </button>
              </div>
            ) : (
              <>
                <h3 className="font-black text-base">{"Yangi xodim qo'shish"}</h3>

                <form onSubmit={handleInvite} className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold opacity-60">F.I.O.</label>
                    <input
                      type="text"
                      required
                      value={newStaffName}
                      onChange={(e) => setNewStaffName(e.target.value)}
                      placeholder="Masalan: Sardor Raimov"
                      className={`w-full px-4 py-3 rounded-xl border text-sm font-bold outline-none focus:border-[#FF5A00] transition-colors ${
                        isDark ? "border-white/10 bg-[#2C2C2E]" : "border-zinc-200 bg-zinc-50"
                      }`}
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold opacity-60">Lavozimi</label>
                    <select
                      required
                      value={newStaffRoleId ?? ""}
                      onChange={(e) => setNewStaffRoleId(Number(e.target.value))}
                      className={`w-full px-4 py-3 rounded-xl border text-sm font-bold outline-none transition-colors ${
                        isDark ? "border-white/10 bg-[#2C2C2E]" : "border-zinc-200 bg-zinc-50"
                      }`}
                    >
                      <option value="" disabled>
                        {rolesQuery.isPending ? "Yuklanmoqda..." : "Lavozimni tanlang"}
                      </option>
                      {roles.map((role) => (
                        <option key={role.id} value={role.id}>
                          {role.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold opacity-60">Telefon raqami</label>
                    <input
                      type="tel"
                      required
                      value={newStaffPhone}
                      onChange={(e) => setNewStaffPhone(e.target.value)}
                      placeholder="+998 90 123 45 67"
                      className={`w-full px-4 py-3 rounded-xl border text-sm font-bold outline-none focus:border-[#FF5A00] transition-colors ${
                        isDark ? "border-white/10 bg-[#2C2C2E]" : "border-zinc-200 bg-zinc-50"
                      }`}
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={inviteMutation.isPending}
                    className="w-full py-4 bg-[#FF5A00] hover:bg-[#E05000] text-white font-extrabold text-xs rounded-2xl shadow-lg transition-all active:scale-98 mt-2 disabled:opacity-50"
                  >
                    {inviteMutation.isPending
                      ? "Yuborilmoqda..."
                      : "Xodimni ro'yxatdan o'tkazish"}
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      )}

      {/* BOTTOM NAVIGATION */}
      <div
        className={`fixed bottom-0 left-0 right-0 z-50 h-[72px] max-w-md mx-auto border-t flex justify-between items-center px-4 transition-all duration-300 ${
          isDark
            ? "bg-[#1E1E1E] border-white/10 shadow-[0_-4px_15px_rgba(0,0,0,0.5)]"
            : "bg-white border-zinc-200 shadow-[0_-4px_10px_rgba(0,0,0,0.04)]"
        }`}
      >
        {(
          [
            { key: "home", label: "Asosiy", icon: null },
            { key: "bookings", label: "Buyurtmalar", icon: Calendar },
            { key: "menu", label: "Filiallar", icon: Utensils },
            { key: "staff", label: "Xodimlar", icon: Users },
            { key: "settings", label: "Sozlamalar", icon: Settings },
          ] as const
        ).map((item) => {
          const isActive = activeTab === item.key;
          const IconComponent = item.icon;

          return (
            <button
              key={item.key}
              onClick={() => setActiveTab(item.key)}
              className="flex-1 flex flex-col items-center justify-center gap-1 h-full py-1 cursor-pointer group transition-all"
            >
              {IconComponent === null ? (
                <img
                  src="/logo-loading.png"
                  alt={item.label}
                  className={`h-5 w-5 object-contain transition-all duration-200 ${
                    isActive
                      ? "filter-primary opacity-100 scale-105"
                      : "brightness-0 opacity-40 group-hover:opacity-65"
                  }`}
                />
              ) : (
                <IconComponent
                  className={`h-5 w-5 transition-all duration-200 ${
                    isActive
                      ? "text-[#FF5A00] scale-105"
                      : "text-[#8E8E93] group-hover:text-zinc-500 dark:group-hover:text-white"
                  }`}
                />
              )}
              <span
                className={`text-[10px] font-bold tracking-tight transition-colors duration-250 ${
                  isActive ? "text-[#FF5A00]" : "text-[#8E8E93]"
                }`}
              >
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
