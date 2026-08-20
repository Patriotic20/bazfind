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
  getGroupWithBranches,
  getStaffCounts,
  inviteStaff,
  listDayBookings,
  listMenuCategories,
  listMenuItems,
  listStaff,
  listStaffRoles,
  partnerKeys,
  rejectBooking,
  setStaffActive,
  type StaffInvitationCreated,
} from "@/lib/api/endpoints/partner";
import { getVenue } from "@/lib/api/endpoints/venues";
import { ApiError, type Booking, type BookingStatus, type StaffMember } from "@/lib/api/types";
import {
  ArrowLeft,
  Bell,
  Briefcase,
  Calendar,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock,
  Copy,
  LogOut,
  MapPin,
  Moon,
  Phone,
  Plus,
  Settings,
  SlidersHorizontal,
  Store,
  Sun,
  ToggleRight,
  User,
  Users,
  Utensils,
  X,
} from "lucide-react";

/** date.weekday() on the backend: 0 = Monday. */
const WEEKDAY_SHORT = ["Dush", "Sesh", "Chor", "Pay", "Jum", "Shan", "Yak"];
const WEEKDAY_FULL = [
  "Dushanba",
  "Seshanba",
  "Chorshanba",
  "Payshanba",
  "Juma",
  "Shanba",
  "Yakshanba",
];
const UZ_MONTHS = [
  "Yanvar",
  "Fevral",
  "Mart",
  "Aprel",
  "May",
  "Iyun",
  "Iyul",
  "Avgust",
  "Sentyabr",
  "Oktyabr",
  "Noyabr",
  "Dekabr",
];

/** The status vocabulary the design uses on booking cards. */
const STATUS_LABELS: Record<string, { text: string; classes: string }> = {
  pending: { text: "Kutilmoqda", classes: "bg-amber-500/10 text-amber-500" },
  confirmed: { text: "Jarayonda", classes: "bg-[#FF5A00]/10 text-[#FF5A00]" },
  checked_in: { text: "Keldi", classes: "bg-emerald-500/10 text-emerald-500" },
  completed: { text: "Yakunlandi", classes: "bg-zinc-500/10 text-zinc-500" },
  cancelled: { text: "Bekor qilindi", classes: "bg-red-500/10 text-red-500" },
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

/** "2026-10-12" -> "12 Oktyabr, Seshanba" — the date line the design shows. */
function formatUzDate(day: string): string {
  const d = new Date(`${day}T00:00:00`);
  const weekday = WEEKDAY_FULL[(d.getDay() + 6) % 7];
  return `${d.getDate()} ${UZ_MONTHS[d.getMonth()]}, ${weekday}`;
}

/** "18:30:00" -> "18:30" */
function formatTime(t: string): string {
  return t.slice(0, 5);
}

/** "1200000.00" -> "1 mln 200 UZS", smaller sums as plain thousands. */
function formatMoneyUz(amount: string, currency: string): string {
  const n = Number(amount);
  if (Number.isNaN(n)) return `${amount} ${currency}`;
  if (n >= 1_000_000) {
    const mln = Math.floor(n / 1_000_000);
    const thousands = Math.round((n % 1_000_000) / 1000);
    return thousands > 0 ? `${mln} mln ${thousands} ${currency}` : `${mln} mln ${currency}`;
  }
  return `${n.toLocaleString("ru-RU", { maximumFractionDigits: 0 })} ${currency}`;
}

/** Minutes until the booking starts, when that is a useful chip to show. */
function minutesUntil(day: string, startTime: string): number | null {
  const start = new Date(`${day}T${startTime}`);
  const diff = Math.round((start.getTime() - Date.now()) / 60_000);
  return diff > 0 && diff <= 180 ? diff : null;
}

function describeError(err: unknown): string {
  return err instanceof ApiError ? err.message : "Xatolik yuz berdi. Qaytadan urinib ko'ring.";
}

type Tab = "home" | "bookings" | "menu" | "staff" | "settings";
type BookingsRange = "today" | "tomorrow" | "all";

export default function AdminPage() {
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";
  const queryClient = useQueryClient();
  const session = useSession();

  const [activeTab, setActiveTab] = useState<Tab>("home");
  const [toastMessage, setToastMessage] = useState("");
  const [selectedVenueId, setSelectedVenueId] = useState<number | null>(null);

  // Bookings screen: the design filters by day segment and status chip.
  const [bookingsRange, setBookingsRange] = useState<BookingsRange>("today");
  const [statusFilter, setStatusFilter] = useState<BookingStatus | "all">("all");
  const [showStatusChips, setShowStatusChips] = useState(true);

  // Menu screen
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);

  // Staff screen: the design gives "Xodim qo'shish" a whole screen, not a modal.
  const [staffView, setStaffView] = useState<"list" | "add">("list");
  const [newStaffName, setNewStaffName] = useState("");
  const [newStaffRoleId, setNewStaffRoleId] = useState<number | null>(null);
  const [newStaffPhone, setNewStaffPhone] = useState("");
  const [newStaffActive, setNewStaffActive] = useState(true);
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
  const groupId = group?.id ?? null;

  const branchesQuery = useQuery({
    queryKey: partnerKeys.branches(groupId ?? 0),
    queryFn: ({ signal }) => getGroupWithBranches(groupId as number, signal),
    enabled: groupId !== null,
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
    queryKey: partnerKeys.dashboard(groupId ?? 0, venueId ?? 0),
    queryFn: ({ signal }) => getDashboard(groupId as number, venueId as number, signal),
    enabled: groupId !== null && venueId !== null,
    staleTime: 30_000,
  });
  const dashboard = dashboardQuery.data ?? null;

  // The customer detail is the one read that carries working hours — the
  // "Ish vaqti: 9:00 23:00" chips come from there.
  const venueDetailQuery = useQuery({
    queryKey: ["partner", "venue-hours", venueId ?? 0],
    queryFn: ({ signal }) => getVenue(venueId as number, signal),
    enabled: venueId !== null,
    staleTime: 5 * 60_000,
  });
  const todayHours = useMemo(() => {
    const rows = venueDetailQuery.data?.working_hours ?? [];
    const weekday = (new Date().getDay() + 6) % 7;
    return rows.find((row) => row.weekday === weekday) ?? null;
  }, [venueDetailQuery.data?.working_hours]);

  const today = isoDate(new Date());
  const rangeStart = bookingsRange === "tomorrow" ? shiftDay(today, 1) : today;
  const rangeDays = bookingsRange === "all" ? 7 : 1;

  const bookingsQuery = useQuery({
    queryKey: partnerKeys.rangeBookings(venueId ?? 0, rangeStart, rangeDays),
    queryFn: async ({ signal }) => {
      const days = Array.from({ length: rangeDays }, (_, i) => shiftDay(rangeStart, i));
      const perDay = await Promise.all(
        days.map((day) => listDayBookings(venueId as number, day, undefined, signal)),
      );
      return perDay.flat();
    },
    enabled: venueId !== null,
  });
  const bookings = bookingsQuery.data ?? [];
  const visibleBookings =
    statusFilter === "all" ? bookings : bookings.filter((b) => b.status === statusFilter);
  const pendingCount = bookings.filter((b) => b.status === "pending").length;

  const staffQuery = useQuery({
    queryKey: partnerKeys.staff(groupId ?? 0),
    queryFn: ({ signal }) => listStaff(groupId as number, signal),
    enabled: groupId !== null,
  });
  const staff = staffQuery.data ?? [];

  const staffCountsQuery = useQuery({
    queryKey: partnerKeys.staffCounts(groupId ?? 0),
    queryFn: ({ signal }) => getStaffCounts(groupId as number, signal),
    enabled: groupId !== null,
  });
  const staffCounts = staffCountsQuery.data ?? null;

  const rolesQuery = useQuery({
    queryKey: partnerKeys.roles(),
    queryFn: ({ signal }) => listStaffRoles(signal),
    enabled: staffView === "add",
    staleTime: 5 * 60_000,
  });
  const roles = rolesQuery.data ?? [];

  const menuCategoriesQuery = useQuery({
    queryKey: partnerKeys.menuCategories(groupId ?? 0, venueId),
    queryFn: ({ signal }) => listMenuCategories(groupId as number, venueId, signal),
    enabled: groupId !== null && activeTab === "menu",
    staleTime: 60_000,
  });
  const menuCategories = menuCategoriesQuery.data ?? [];

  const menuItemsQuery = useQuery({
    queryKey: partnerKeys.menuItems(venueId ?? 0, selectedCategoryId),
    queryFn: ({ signal }) => listMenuItems(venueId as number, selectedCategoryId, signal),
    enabled: venueId !== null && activeTab === "menu",
  });
  const menuItems = menuItemsQuery.data ?? [];

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(""), 3000);
  };

  const invalidateBookings = () => {
    void queryClient.invalidateQueries({ queryKey: ["partner", "bookings"] });
    void queryClient.invalidateQueries({ queryKey: ["partner", "bookings-range"] });
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
      inviteStaff(groupId as number, venueId as number, {
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

  const closeStaffAdd = () => {
    setStaffView("list");
    setCreatedInvite(null);
  };

  const maxWeekBookings = Math.max(1, ...(dashboard?.week.map((w) => w.bookings_count) ?? [1]));
  // Null when there is no previous period to compare against (a brand-new venue).
  const bookingsDelta =
    dashboard?.comparison.bookings_delta_percent != null
      ? Number(dashboard.comparison.bookings_delta_percent)
      : null;
  const todayBar = dashboard?.week[dashboard.week.length - 1] ?? null;
  const venueLabel = dashboard?.venue_name ?? branches[0]?.name ?? group?.name ?? "";
  const branchesLabel =
    group?.primary_venue_type === "toyxona" ? "To'yxonalar soni" : "Restoranlar soni";

  if (!session.isResolved || !session.isPartner) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[var(--background)]">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-primary" />
        <p className="mt-4 text-xs font-semibold text-zinc-500">Yuklanmoqda...</p>
      </div>
    );
  }

  const deltaChip = (value: number | null, filled: boolean) =>
    value !== null && (
      <span
        className={`text-[10px] font-black px-1.5 py-0.5 rounded-md flex items-center gap-0.5 ${
          filled
            ? "bg-white/15 text-white"
            : value >= 0
              ? "bg-emerald-500/10 text-emerald-500"
              : "bg-red-500/10 text-red-500"
        }`}
      >
        {value >= 0 ? "+" : ""}
        {value}%
      </span>
    );

  /* The header the design repeats on the dashboard and bookings screens:
     avatar, branch name, bell — plus the branch picker when there is a choice. */
  const screenHeader = (
    <header className="px-6 pt-6 pb-2.5 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full overflow-hidden border border-zinc-200 dark:border-white/10 shadow-sm bg-zinc-100">
          <img
            src={group?.logo_url ?? "/images/restaurant.png"}
            alt="Venue Avatar"
            className="w-full h-full object-cover"
          />
        </div>
        <h2 className="font-extrabold text-base tracking-tight">{venueLabel}</h2>
      </div>
      <div className="flex items-center gap-2">
        {branches.length > 1 && (
          <select
            value={venueId ?? undefined}
            onChange={(e) => setSelectedVenueId(Number(e.target.value))}
            className={`text-xs font-bold rounded-xl px-2.5 py-1.5 border outline-none max-w-36 ${
              isDark ? "bg-[#2C2C2E] border-white/10 text-white" : "bg-zinc-100 border-zinc-200"
            }`}
          >
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        )}
        <button
          className={`w-9 h-9 rounded-full flex items-center justify-center relative transition-all active:scale-95 ${
            isDark
              ? "bg-[#2C2C2E]/60 text-white hover:bg-[#3A3A3C]"
              : "bg-zinc-100 text-zinc-800 hover:bg-zinc-150"
          }`}
        >
          <Bell className="h-4.5 w-4.5" />
          <span className="absolute top-2 right-2.5 w-1.5 h-1.5 rounded-full bg-[#FF5A00]" />
        </button>
      </div>
    </header>
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

      {/* TAB 1: ASOSIY */}
      {activeTab === "home" && (
        <div className="flex flex-col flex-1 animate-fade-in pb-20">
          {screenHeader}

          {/* Ish vaqti chips — straight off the design */}
          <div className="px-6 py-2 flex items-center gap-2 text-xs font-semibold text-zinc-500 dark:text-zinc-400">
            <Clock className="h-4 w-4 text-zinc-450" />
            <span>Ish vaqti:</span>
            {todayHours && !todayHours.is_closed && todayHours.opens_at && (
              <>
                <span
                  className={`px-2.5 py-1 rounded-xl font-bold ${isDark ? "bg-white/5 text-white" : "bg-zinc-100 text-zinc-800"}`}
                >
                  {formatTime(todayHours.opens_at)}
                </span>
                <span
                  className={`px-2.5 py-1 rounded-xl font-bold ${isDark ? "bg-white/5 text-white" : "bg-zinc-100 text-zinc-800"}`}
                >
                  {todayHours.closes_at ? formatTime(todayHours.closes_at) : "--"}
                </span>
              </>
            )}
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

          {/* Hozirgi navbat */}
          <div
            onClick={() => setActiveTab("bookings")}
            className="mx-6 mt-4 p-5 rounded-[24px] bg-[#FF5A00] text-white shadow-lg shadow-[#FF5A00]/25 relative overflow-hidden transition-all hover:scale-[1.01] cursor-pointer"
          >
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-extrabold tracking-tight">Hozirgi navbat</span>
              <ChevronRight className="h-4 w-4 opacity-80" />
            </div>
            <div className="mt-2 flex items-center gap-2">
              <span className="text-3xl font-black tracking-tight">
                {dashboard ? `${dashboard.queue_count} ta` : "…"}
              </span>
              {deltaChip(bookingsDelta, true)}
            </div>
            <p className="mt-1 text-[11px] font-semibold opacity-75">mijoz band qilgan</p>
          </div>

          {/* 1 haftalik band qilishlar */}
          <div
            className={`mx-6 mt-4 p-5 rounded-[28px] border transition-all ${
              isDark ? "bg-[#2C2520] border-[#FF5A00]/10" : "bg-[#FAF5F0] border-[#FF5A00]/5"
            }`}
          >
            <div className="flex justify-between items-start">
              <div className="space-y-1 text-left">
                <span className="text-[11px] font-bold tracking-wide text-black/55 dark:text-white/60">
                  1 haftalik band qilishlar
                </span>
                <h3 className="text-2xl font-black tracking-tight text-black dark:text-white">
                  {todayBar
                    ? `${WEEKDAY_SHORT[todayBar.weekday]}/${todayBar.bookings_count} ta`
                    : "…"}
                </h3>
              </div>
              {deltaChip(bookingsDelta, false)}
            </div>

            <div className="mt-6 flex justify-between items-end h-[148px] px-0.5 gap-2">
              {(dashboard?.week ?? []).map((bar, i, arr) => {
                const height = Math.max(
                  28,
                  Math.round((bar.bookings_count / maxWeekBookings) * 140),
                );
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
                      {WEEKDAY_SHORT[bar.weekday] ?? ""}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Restoranlar soni / Hodimlar soni */}
          <div className="mx-6 mt-4 grid grid-cols-2 gap-4">
            {[
              {
                label: branchesLabel,
                value: dashboard?.branches_total ?? branches.length,
                icon: Store,
                go: "settings" as Tab,
              },
              {
                label: "Hodimlar soni",
                value: dashboard?.staff_total ?? staffCounts?.total ?? staff.length,
                icon: Users,
                go: "staff" as Tab,
              },
            ].map((card) => (
              <div
                key={card.label}
                onClick={() => setActiveTab(card.go)}
                className={`p-4 rounded-[20px] flex flex-col justify-between h-24 text-left transition-all active:scale-98 cursor-pointer ${
                  isDark ? "bg-[#2C2C2E]/70" : "bg-zinc-100"
                }`}
              >
                <div className="flex justify-between items-center">
                  <span className="text-[11px] font-bold opacity-70">{card.label}</span>
                  <ChevronRight className="h-3.5 w-3.5 opacity-55" />
                </div>
                <div className="flex items-center gap-2.5">
                  <card.icon className="h-6 w-6" />
                  <span className="text-xl font-black">{card.value} ta</span>
                </div>
              </div>
            ))}
          </div>

          {/* 1 oylik band qilishlar */}
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
                  {formatMoneyUz(dashboard.month_revenue, dashboard.currency)}
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
              {deltaChip(bookingsDelta, false)}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: BUYURTMALAR */}
      {activeTab === "bookings" && (
        <div className="flex flex-col flex-1 animate-fade-in pb-20">
          {screenHeader}

          <div className="px-6 pt-2 flex items-center justify-between">
            <h1 className="text-2xl font-black tracking-tight">Buyurtmalar</h1>
            <button
              onClick={() => setShowStatusChips((v) => !v)}
              className="w-9 h-9 rounded-xl bg-[#FF5A00]/10 text-[#FF5A00] flex items-center justify-center active:scale-95 transition-all"
              title="Filtr"
            >
              <SlidersHorizontal className="h-4.5 w-4.5" />
            </button>
          </div>

          <p className="px-6 pt-1 text-xs font-semibold text-zinc-500 dark:text-zinc-400 text-left">
            {bookingsRange === "all" ? "Keyingi 7 kun" : formatUzDate(rangeStart)}
          </p>

          {/* Bugun / Ertaga / Barchasi */}
          <div
            className={`mx-6 mt-3 p-1 rounded-2xl border flex ${
              isDark ? "border-white/10" : "border-zinc-200"
            }`}
          >
            {(
              [
                { key: "today", label: "Bugun" },
                { key: "tomorrow", label: "Ertaga" },
                { key: "all", label: "Barchasi" },
              ] as const
            ).map((seg) => (
              <button
                key={seg.key}
                onClick={() => setBookingsRange(seg.key)}
                className={`flex-1 py-2 rounded-xl text-xs font-extrabold transition-all ${
                  bookingsRange === seg.key
                    ? "bg-[#FF5A00] text-white shadow-md shadow-[#FF5A00]/20"
                    : "opacity-60"
                }`}
              >
                {seg.label}
              </button>
            ))}
          </div>

          {/* Status chips */}
          {showStatusChips && (
            <div className="pl-6 mt-3 flex gap-2 overflow-x-auto pb-1 pr-6">
              {(
                [
                  { key: "all", label: "Barcha Buyurtmalar", count: bookings.length },
                  { key: "pending", label: "Kutilmoqda", count: pendingCount },
                  {
                    key: "confirmed",
                    label: "Jarayonda",
                    count: bookings.filter((b) => b.status === "confirmed").length,
                  },
                  {
                    key: "checked_in",
                    label: "Keldi",
                    count: bookings.filter((b) => b.status === "checked_in").length,
                  },
                ] as const
              ).map((chip) => (
                <button
                  key={chip.key}
                  onClick={() => setStatusFilter(chip.key as BookingStatus | "all")}
                  className={`shrink-0 px-3.5 py-2 rounded-full text-xs font-bold border flex items-center gap-1.5 transition-all ${
                    statusFilter === chip.key
                      ? "bg-[#FF5A00]/10 border-[#FF5A00]/30 text-[#FF5A00]"
                      : isDark
                        ? "border-white/10 text-white/70"
                        : "border-zinc-200 bg-white text-zinc-700"
                  }`}
                >
                  {chip.label}
                  {chip.count > 0 && (
                    <span
                      className={`min-w-5 h-5 px-1 rounded-full text-[10px] font-black flex items-center justify-center ${
                        statusFilter === chip.key
                          ? "bg-[#FF5A00] text-white"
                          : "bg-zinc-200 dark:bg-white/10"
                      }`}
                    >
                      {chip.count}
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}

          <main className="flex-1 overflow-y-auto px-6 py-4 space-y-4 text-left">
            {bookingsQuery.isPending ? (
              <div className="text-center py-12 opacity-50">
                <p className="text-xs font-bold">Yuklanmoqda...</p>
              </div>
            ) : visibleBookings.length === 0 ? (
              <div className="text-center py-12 opacity-50 space-y-2">
                <Calendar className="h-10 w-10 mx-auto" />
                <p className="text-xs font-bold">{"Bu kunda buyurtmalar yo'q"}</p>
              </div>
            ) : (
              visibleBookings.map((booking) => {
                const status = STATUS_LABELS[booking.status] ?? {
                  text: booking.status,
                  classes: "bg-zinc-500/10 text-zinc-500",
                };
                const soon = minutesUntil(booking.booking_date, booking.start_time);
                const isHall = booking.kind === "hall_event";
                return (
                  <div
                    key={booking.id}
                    className={`p-4 rounded-2xl border flex flex-col gap-3 transition-all ${
                      isDark
                        ? "bg-[#393939]/30 border-white/5"
                        : "bg-white border-zinc-150 shadow-sm"
                    }`}
                  >
                    {/* Table + soon chip */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 font-black flex items-center justify-center text-sm">
                          {isHall ? "Z" : (booking.table_id ?? "—")}
                        </div>
                        <div>
                          <p className="font-extrabold text-sm">
                            {isHall ? "Zal tadbiri" : `Stol ${booking.table_id ?? "—"}`}
                          </p>
                          <p className="text-[10px] font-semibold text-zinc-400">
                            #{booking.receipt_number}
                          </p>
                        </div>
                      </div>
                      {soon !== null && (
                        <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 text-[10px] font-black flex items-center gap-1">
                          <Clock className="h-3 w-3" /> {soon} min
                        </span>
                      )}
                    </div>

                    {/* Customer + status */}
                    <div className="flex items-center justify-between">
                      <h3 className="font-extrabold text-base">{booking.contact_name}</h3>
                      <span
                        className={`px-2.5 py-1 rounded-full text-[10px] font-black ${status.classes}`}
                      >
                        {status.text}
                      </span>
                    </div>

                    {/* Time / guests */}
                    <div className="flex items-center gap-4 text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                      <span className="flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5" />
                        {formatTime(booking.start_time)} – {formatTime(booking.end_time)}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Users className="h-3.5 w-3.5" />
                        {booking.guests_count} kishi
                      </span>
                      {bookingsRange === "all" && (
                        <span className="flex items-center gap-1.5">
                          <Calendar className="h-3.5 w-3.5" />
                          {booking.booking_date.slice(8, 10)}.{booking.booking_date.slice(5, 7)}
                        </span>
                      )}
                    </div>

                    {/* Total */}
                    <div className="flex items-center justify-between border-t border-zinc-100 dark:border-white/5 pt-3">
                      <span className="text-xs font-semibold text-zinc-400">Jami summa:</span>
                      <span className="text-base font-black tracking-tight">
                        {formatMoneyUz(booking.total_amount, booking.currency)}
                      </span>
                    </div>

                    {booking.status === "pending" && (
                      <div className="flex gap-2 pt-1">
                        <button
                          onClick={() => confirmMutation.mutate(booking)}
                          disabled={confirmMutation.isPending}
                          className="flex-1 py-2.5 rounded-xl bg-[#FF5A00] hover:bg-[#E05000] text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors active:scale-98 disabled:opacity-50"
                        >
                          <Check className="h-4 w-4 stroke-[3px]" /> Tasdiqlash
                        </button>
                        <button
                          onClick={() => rejectMutation.mutate(booking)}
                          disabled={rejectMutation.isPending}
                          className={`py-2.5 px-4 rounded-xl border font-bold text-xs flex items-center justify-center gap-1 transition-colors active:scale-98 disabled:opacity-50 ${
                            isDark
                              ? "border-white/10 text-white/80"
                              : "border-zinc-200 text-zinc-600"
                          }`}
                        >
                          <X className="h-4 w-4" /> Bekor qilish
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

      {/* TAB 3: MENYU */}
      {activeTab === "menu" && (
        <div className="flex flex-col flex-1 animate-fade-in pb-20">
          <header className="px-6 py-5 border-b border-zinc-100 dark:border-white/5 flex items-center justify-between">
            <h1 className="text-xl font-black">Menyu</h1>
            <button
              onClick={() => showToast("Menyu konstruktori tez orada qo'shiladi")}
              className="p-2 rounded-xl bg-[#FF5A00] text-white flex items-center justify-center active:scale-95 transition-all shadow-md shadow-[#FF5A00]/10"
              title="Taom qo'shish"
            >
              <Plus className="h-4.5 w-4.5 stroke-[2.5px]" />
            </button>
          </header>

          {menuCategories.length > 0 && (
            <div className="pl-6 pt-3 flex gap-2 overflow-x-auto pb-1 pr-6">
              <button
                onClick={() => setSelectedCategoryId(null)}
                className={`shrink-0 px-3.5 py-2 rounded-full text-xs font-bold border transition-all ${
                  selectedCategoryId === null
                    ? "bg-[#FF5A00]/10 border-[#FF5A00]/30 text-[#FF5A00]"
                    : isDark
                      ? "border-white/10 text-white/70"
                      : "border-zinc-200 bg-white text-zinc-700"
                }`}
              >
                Barchasi
              </button>
              {menuCategories.map((category) => (
                <button
                  key={category.id}
                  onClick={() => setSelectedCategoryId(category.id)}
                  className={`shrink-0 px-3.5 py-2 rounded-full text-xs font-bold border transition-all ${
                    selectedCategoryId === category.id
                      ? "bg-[#FF5A00]/10 border-[#FF5A00]/30 text-[#FF5A00]"
                      : isDark
                        ? "border-white/10 text-white/70"
                        : "border-zinc-200 bg-white text-zinc-700"
                  }`}
                >
                  {category.name} ({category.item_count})
                </button>
              ))}
            </div>
          )}

          <main className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
            {menuItemsQuery.isPending ? (
              <div className="text-center py-12 opacity-50">
                <p className="text-xs font-bold">Yuklanmoqda...</p>
              </div>
            ) : menuItems.length === 0 ? (
              /* The empty state straight off the design */
              <div className="flex flex-col items-center justify-center py-16 space-y-4 text-center">
                <div
                  className={`w-20 h-20 rounded-full flex items-center justify-center ${
                    isDark ? "bg-white/5" : "bg-zinc-100"
                  }`}
                >
                  <Utensils className="h-9 w-9 opacity-40" />
                </div>
                <h3 className="font-black text-base">{"Hozircha menyu yo'q"}</h3>
                <p className="text-xs font-semibold opacity-50 max-w-60">
                  Buyurtmalarni qabul qilishni boshlash uchun menyuni kiriting
                </p>
                <button
                  onClick={() => showToast("Menyu konstruktori tez orada qo'shiladi")}
                  className="mt-2 px-6 py-3 rounded-2xl bg-[#FF5A00] hover:bg-[#E05000] text-white font-extrabold text-xs flex items-center gap-2 transition-all active:scale-98 shadow-lg shadow-[#FF5A00]/20"
                >
                  Menyuni kiritish <Plus className="h-4 w-4 stroke-[3px]" />
                </button>
              </div>
            ) : (
              menuItems.map((item) => (
                <div
                  key={item.id}
                  className={`p-3 rounded-2xl border flex items-center gap-3 transition-all ${
                    isDark ? "bg-[#393939]/30 border-white/5" : "bg-white border-zinc-150 shadow-sm"
                  }`}
                >
                  <div className="w-14 h-14 rounded-xl bg-[#FF5A00]/10 flex items-center justify-center overflow-hidden shrink-0">
                    {item.photo_url ? (
                      <img
                        src={item.photo_url}
                        alt={item.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Utensils className="h-5 w-5 text-[#FF5A00]" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0 text-left">
                    <h3 className="font-bold text-sm truncate">{item.name}</h3>
                    {item.effective_price != null && (
                      <p className="text-xs font-black text-[#FF5A00] mt-0.5">
                        {formatMoneyUz(item.effective_price, item.currency ?? "UZS")}
                      </p>
                    )}
                  </div>
                </div>
              ))
            )}
          </main>
        </div>
      )}

      {/* TAB 4: HODIMLAR — list, or the add screen the design dedicates to it */}
      {activeTab === "staff" && staffView === "list" && (
        <div className="flex flex-col flex-1 animate-fade-in pb-20">
          <header className="px-6 py-5 border-b border-zinc-100 dark:border-white/5 flex items-center justify-between">
            <h1 className="text-xl font-black">Hodimlar</h1>
            <button
              onClick={() => setStaffView("add")}
              className="p-2 rounded-xl bg-[#FF5A00] text-white flex items-center justify-center active:scale-95 transition-all shadow-md shadow-[#FF5A00]/10"
              title="Yangi xodim qo'shish"
            >
              <Plus className="h-4.5 w-4.5 stroke-[2.5px]" />
            </button>
          </header>

          {staffCounts && (
            <div className="px-6 pt-3 flex gap-2">
              {[
                { label: "Jami", value: staffCounts.total },
                { label: "Aktiv", value: staffCounts.active },
                { label: "Noaktiv", value: staffCounts.inactive },
              ].map((chip) => (
                <span
                  key={chip.label}
                  className={`px-3 py-1.5 rounded-full text-[11px] font-bold border ${
                    isDark ? "border-white/10 text-white/70" : "border-zinc-200 text-zinc-600"
                  }`}
                >
                  {chip.label}: <b>{chip.value}</b>
                </span>
              ))}
            </div>
          )}

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
                      className={`w-10 h-10 rounded-full flex items-center justify-center overflow-hidden ${
                        isDark ? "bg-white/5 text-white" : "bg-zinc-100 text-zinc-700"
                      }`}
                    >
                      {member.user.avatar_url ? (
                        <img
                          src={member.user.avatar_url}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <User className="w-5 h-5" />
                      )}
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

      {activeTab === "staff" && staffView === "add" && (
        <div className="flex flex-col flex-1 animate-fade-in pb-20">
          {/* Back arrow + centred title, exactly as drawn */}
          <header className="px-6 py-5 border-b border-zinc-100 dark:border-white/5 relative flex items-center justify-center">
            <button
              onClick={closeStaffAdd}
              className="absolute left-6 p-1.5 rounded-lg text-[#FF5A00] active:scale-95 transition-all"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <h1 className="text-base font-black">{"Xodim qo'shish"}</h1>
          </header>

          <main className="flex-1 overflow-y-auto px-6 py-5 text-left">
            {createdInvite ? (
              /* The credentials appear exactly once — here. */
              <div className="space-y-4">
                <h3 className="font-black text-base">{"Xodim qo'shildi ✅"}</h3>
                <p className="text-xs font-semibold opacity-70">
                  {"Quyidagi login va vaqtinchalik parolni xodimga o'zingiz yetkazing. Ular "}
                  <b>faqat hozir</b>
                  {" ko'rinadi — keyin qayta o'qib bo'lmaydi."}
                </p>
                <div
                  className={`p-4 rounded-xl border space-y-2 font-mono text-sm ${
                    isDark ? "border-white/10 bg-[#2C2C2E]" : "border-zinc-200 bg-zinc-50"
                  }`}
                >
                  <div>
                    <span className="opacity-50 text-xs">login:</span> {createdInvite.login}
                  </div>
                  <div>
                    <span className="opacity-50 text-xs">parol:</span>{" "}
                    {createdInvite.temporary_password}
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
                  onClick={closeStaffAdd}
                  className="w-full py-4 bg-[#FF5A00] hover:bg-[#E05000] text-white font-extrabold text-xs rounded-2xl shadow-lg transition-all active:scale-98"
                >
                  Yopish
                </button>
              </div>
            ) : (
              <>
                <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                  {"Yangi xodim ma'lumotlarini kiriting. Login va vaqtinchalik parol keyingi ekranda bir marta ko'rsatiladi."}
                </p>

                <form onSubmit={handleInvite} className="mt-5 space-y-5">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold">Ism</label>
                    <div className="relative">
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 h-4.5 w-4.5 text-zinc-400" />
                      <input
                        type="text"
                        required
                        value={newStaffName}
                        onChange={(e) => setNewStaffName(e.target.value)}
                        placeholder="Xodimning to'liq ismi"
                        className={`w-full pl-11 pr-4 py-3.5 rounded-xl border text-sm font-semibold outline-none focus:border-[#FF5A00] transition-colors ${
                          isDark ? "border-white/10 bg-[#2C2C2E]" : "border-zinc-200 bg-white"
                        }`}
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold">Telefon raqami</label>
                    <div className="relative">
                      <Phone className="absolute left-4 top-1/2 -translate-y-1/2 h-4.5 w-4.5 text-zinc-400" />
                      <input
                        type="tel"
                        required
                        value={newStaffPhone}
                        onChange={(e) => setNewStaffPhone(e.target.value)}
                        placeholder="+998 90 123 45 67"
                        className={`w-full pl-11 pr-4 py-3.5 rounded-xl border text-sm font-semibold outline-none focus:border-[#FF5A00] transition-colors ${
                          isDark ? "border-white/10 bg-[#2C2C2E]" : "border-zinc-200 bg-white"
                        }`}
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold">Lavozim</label>
                    <div className="relative">
                      <Briefcase className="absolute left-4 top-1/2 -translate-y-1/2 h-4.5 w-4.5 text-zinc-400 pointer-events-none" />
                      <select
                        required
                        value={newStaffRoleId ?? ""}
                        onChange={(e) => setNewStaffRoleId(Number(e.target.value))}
                        className={`w-full pl-11 pr-4 py-3.5 rounded-xl border text-sm font-semibold outline-none transition-colors appearance-none ${
                          isDark ? "border-white/10 bg-[#2C2C2E]" : "border-zinc-200 bg-white"
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
                  </div>

                  {/* Active Status card */}
                  <div
                    className={`p-4 rounded-2xl border flex items-center justify-between ${
                      isDark ? "border-white/10 bg-[#2C2C2E]" : "border-zinc-200 bg-white"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-[#FF5A00]/10 text-[#FF5A00] flex items-center justify-center">
                        <ToggleRight className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-sm font-extrabold">Active Status</p>
                        <p className="text-[10px] font-semibold text-zinc-400">
                          Xodim tizimga kira oladi
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setNewStaffActive((v) => !v)}
                      className={`w-11 h-6 rounded-full transition-all relative ${
                        newStaffActive ? "bg-[#FF5A00]" : isDark ? "bg-white/10" : "bg-zinc-300"
                      }`}
                    >
                      <span
                        className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${
                          newStaffActive ? "left-[22px]" : "left-0.5"
                        }`}
                      />
                    </button>
                  </div>

                  {/* Info note */}
                  <div className="p-4 rounded-2xl bg-[#FF5A00] text-white text-xs font-semibold flex gap-2.5 items-start">
                    <CheckCircle2 className="h-4.5 w-4.5 shrink-0 mt-0.5" />
                    <span>
                      {"Login va vaqtinchalik parol faqat bir marta — keyingi ekranda ko'rsatiladi. Ularni xodimga o'zingiz yetkazing."}
                    </span>
                  </div>

                  <button
                    type="submit"
                    disabled={inviteMutation.isPending}
                    className="w-full py-4 bg-[#FF5A00] hover:bg-[#E05000] text-white font-extrabold text-xs rounded-2xl shadow-lg transition-all active:scale-98 disabled:opacity-50"
                  >
                    {inviteMutation.isPending ? "Yuborilmoqda..." : "Xodimni ro'yxatdan o'tkazish"}
                  </button>
                </form>
              </>
            )}
          </main>
        </div>
      )}

      {/* TAB 5: SOZLAMALAR */}
      {activeTab === "settings" && (
        <div className="flex flex-col flex-1 animate-fade-in pb-20">
          <header className="px-6 py-5 border-b border-zinc-100 dark:border-white/5 flex items-center justify-between">
            <h1 className="text-xl font-black">Sozlamalar</h1>
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
                  {group?.primary_venue_type === "toyxona"
                    ? "To'yxona tarmog'i"
                    : "Restoran tarmog'i"}
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
                  <span className="opacity-50">Valyuta</span>
                  <span className="font-bold">{group?.default_currency}</span>
                </div>
                <div className="flex justify-between">
                  <span className="opacity-50">Holat</span>
                  <span className="font-bold">
                    {group?.status === "active" ? "Faol" : group?.status}
                  </span>
                </div>
              </div>

              {/* Filiallar */}
              <div className="space-y-2">
                <label className="text-xs font-bold opacity-60 block">Filiallar</label>
                {branches.map((branch) => (
                  <div
                    key={branch.id}
                    className={`p-3.5 rounded-xl border flex items-center justify-between ${
                      isDark ? "border-white/10 bg-[#393939]/30" : "border-zinc-200 bg-white"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <MapPin className="h-4 w-4 text-[#FF5A00] shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm font-bold truncate">{branch.name}</p>
                        {branch.tagline && (
                          <p className="text-[10px] text-zinc-400 truncate">{branch.tagline}</p>
                        )}
                      </div>
                    </div>
                    {venueId === branch.id ? (
                      <span className="text-[10px] font-black text-[#FF5A00] shrink-0">
                        Tanlangan
                      </span>
                    ) : (
                      <button
                        onClick={() => setSelectedVenueId(branch.id)}
                        className="text-[10px] font-bold px-2 py-1 rounded-lg hover:bg-[#FF5A00]/10 text-[#FF5A00] transition-colors shrink-0"
                      >
                        Tanlash
                      </button>
                    )}
                  </div>
                ))}
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

      {/* BOTTOM NAVIGATION — Asosiy / Buyurtmalar / Menyu / Hodimlar / Sozlamalar */}
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
            { key: "menu", label: "Menyu", icon: Utensils },
            { key: "staff", label: "Hodimlar", icon: User },
            { key: "settings", label: "Sozlamalar", icon: Settings },
          ] as const
        ).map((item) => {
          const isActive = activeTab === item.key;
          const IconComponent = item.icon;

          return (
            <button
              key={item.key}
              onClick={() => {
                setActiveTab(item.key);
                if (item.key !== "staff") setStaffView("list");
              }}
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
