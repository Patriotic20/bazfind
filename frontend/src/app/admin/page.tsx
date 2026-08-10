"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "@/components/theme-provider";
import {
  LogOut,
  Trash2,
  Plus,
  Star,
  MapPin,
  Users,
  DollarSign,
  Calendar,
  Check,
  X,
  TrendingUp,
  Building2,
  Clock,
  UserCheck,
  Bell,
  ChevronRight,
  ChevronLeft,
  Settings,
  Utensils,
  PlusCircle,
  Sparkles,
  User,
  Info,
  CheckCircle2,
  HelpCircle,
  Moon,
  Sun
} from "lucide-react";

interface Venue {
  id: string;
  name: string;
  location: string;
  capacity: string;
  capacityNum?: number;
  priceText: string;
  priceNum?: number;
  rating: number;
  category: "restoran" | "toyxona";
  emoji: string;
  tags?: string[];
}

interface BookingRequest {
  id: string;
  customerName: string;
  phone: string;
  venueName: string;
  date: string;
  time: string;
  tableOrZal: string;
  status: "pending" | "approved" | "rejected";
}

interface StaffMember {
  id: string;
  name: string;
  role: string;
  status: "active" | "resting";
  phone: string;
}

const DEFAULT_BOOKINGS: BookingRequest[] = [
  {
    id: "b1",
    customerName: "Shahzod Alimov",
    phone: "+998 90 999 88 77",
    venueName: "Tinchlik Plaza",
    date: "12/06/2026",
    time: "19:00",
    tableOrZal: "4-stol",
    status: "pending",
  },
  {
    id: "b2",
    customerName: "Kamola Karimova",
    phone: "+998 93 111 22 33",
    venueName: "Visol To'yxonasi",
    date: "18/06/2026",
    time: "18:00",
    tableOrZal: "Asosiy zal",
    status: "approved",
  },
  {
    id: "b3",
    customerName: "Doston Rustamov",
    phone: "+998 94 444 55 66",
    venueName: "Oqshom Restorani",
    date: "20/06/2026",
    time: "13:00",
    tableOrZal: "2-kabina",
    status: "pending",
  },
];

const DEFAULT_STAFF: StaffMember[] = [
  { id: "s1", name: "Jahongir Olimov", role: "Menejer", status: "active", phone: "+998 90 123 45 67" },
  { id: "s2", name: "Sardor Raimov", role: "Bosh oshpaz", status: "active", phone: "+998 93 765 43 21" },
  { id: "s3", name: "Zuhra Karimova", role: "Xostes", status: "active", phone: "+998 94 111 22 33" },
  { id: "s4", name: "Alisher Ubaydullaev", role: "Ofitsiant", status: "resting", phone: "+998 99 999 88 77" },
  { id: "s5", name: "Madina Tursunova", role: "Ofitsiant", status: "active", phone: "+998 95 555 44 33" },
];

export default function AdminPage() {
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";
  const [mounted, setMounted] = useState(false);
  const [authorized, setAuthorized] = useState(false);
  
  // Custom dashboard states
  const [partnerName, setPartnerName] = useState("Tinchlik Plaza");
  const [venueHours, setVenueHours] = useState("09:00 - 23:00");
  const [partnerLocation, setPartnerLocation] = useState("Samarqand, Pastdarg'om");
  const [venues, setVenues] = useState<Venue[]>([]);
  const [bookings, setBookings] = useState<BookingRequest[]>([]);
  const [staff, setStaff] = useState<StaffMember[]>(DEFAULT_STAFF);
  
  // Navigation tab state matching mobile mockup: "home" | "bookings" | "menu" | "staff" | "settings"
  const [activeTab, setActiveTab] = useState<"home" | "bookings" | "menu" | "staff" | "settings">("home");
  const [toastMessage, setToastMessage] = useState("");
  
  // Modal states
  const [showAddStaffModal, setShowAddStaffModal] = useState(false);
  const [newStaffName, setNewStaffName] = useState("");
  const [newStaffRole, setNewStaffRole] = useState("Ofitsiant");
  const [newStaffPhone, setNewStaffPhone] = useState("");
  
  useEffect(() => {
    setMounted(true);

    const isRegistered = localStorage.getItem("isRegistered") === "true";
    const userRole = localStorage.getItem("userRole");
    const name = localStorage.getItem("fullName");
    const hours = localStorage.getItem("venueHours");
    const loc = localStorage.getItem("location");

    if (!isRegistered || userRole !== "partner") {
      // Not logged in as partner, redirect to login wizard flow
      router.push("/login");
    } else {
      setAuthorized(true);
      if (name) setPartnerName(name);
      if (hours) setVenueHours(hours);
      if (loc) setPartnerLocation(loc);

      // Load venues
      const storedVenues = localStorage.getItem("partnerVenues");
      if (storedVenues) {
        try {
          setVenues(JSON.parse(storedVenues));
        } catch (e) {}
      } else {
        const defaultVenues: Venue[] = [
          {
            id: "d1",
            name: name || "Tinchlik Plaza",
            location: loc || "Samarqand, Pastdarg'om",
            capacity: "150 kishi",
            capacityNum: 150,
            priceText: "152,025,323 UZS dan",
            priceNum: 152025323,
            rating: 5.0,
            category: "restoran",
            emoji: "🍽️",
            tags: ["Premium", "Tavsiya etiladi"],
          },
          {
            id: "d2",
            name: "Visol To'yxonasi",
            location: "Toshkent sh., Chilonzor",
            capacity: "500 kishi",
            capacityNum: 500,
            priceText: "250 000 UZS dan",
            priceNum: 250000,
            rating: 4.9,
            category: "toyxona",
            emoji: "🏰",
            tags: ["Hashamatli", "Yevro"],
          },
        ];
        localStorage.setItem("partnerVenues", JSON.stringify(defaultVenues));
        setVenues(defaultVenues);
      }

      // Load bookings
      const storedBookings = localStorage.getItem("partnerBookings");
      if (storedBookings) {
        try {
          setBookings(JSON.parse(storedBookings));
        } catch (e) {}
      } else {
        localStorage.setItem("partnerBookings", JSON.stringify(DEFAULT_BOOKINGS));
        setBookings(DEFAULT_BOOKINGS);
      }
    }
  }, [router]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(""), 3000);
  };

  const handleLogout = () => {
    localStorage.removeItem("isRegistered");
    localStorage.removeItem("fullName");
    localStorage.removeItem("phone");
    localStorage.removeItem("location");
    localStorage.removeItem("userRole");
    
    // Notify bottom navigation about authentication state update
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("isRegisteredChange"));
    }
    
    showToast("Tizimdan chiqildi.");
    router.push("/login");
  };

  const handleDeleteVenue = (venueId: string) => {
    const updated = venues.filter((v) => v.id !== venueId);
    setVenues(updated);
    localStorage.setItem("partnerVenues", JSON.stringify(updated));
    showToast("Muassasa o'chirildi.");
  };

  const handleBookingAction = (bookingId: string, action: "approved" | "rejected") => {
    const updated = bookings.map((b) => {
      if (b.id === bookingId) {
        return { ...b, status: action };
      }
      return b;
    });
    setBookings(updated);
    localStorage.setItem("partnerBookings", JSON.stringify(updated));
    showToast(action === "approved" ? "Buyurtma tasdiqlandi!" : "Buyurtma rad etildi.");
  };

  const handleAddStaff = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStaffName.trim() || !newStaffPhone.trim()) {
      showToast("Barcha maydonlarni to'ldiring!");
      return;
    }
    const newMember: StaffMember = {
      id: "s-" + Date.now(),
      name: newStaffName.trim(),
      role: newStaffRole,
      status: "active",
      phone: newStaffPhone.trim()
    };
    setStaff([newMember, ...staff]);
    setNewStaffName("");
    setNewStaffPhone("");
    setShowAddStaffModal(false);
    showToast("Yangi xodim muvaffaqiyatli qo'shildi!");
  };

  if (!mounted || !authorized) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[var(--background)]">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-primary" />
        <p className="mt-4 text-xs font-semibold text-zinc-500">Yuklanmoqda...</p>
      </div>
    );
  }

  return (
    <div className={`flex flex-col flex-1 w-full min-h-screen bg-[var(--background)] ${isDark ? "text-white" : "text-zinc-900"} relative select-none`}>
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-[100] px-4 py-2.5 rounded-xl bg-primary text-white text-xs font-bold shadow-xl animate-fade-in flex items-center gap-2 border border-white/20">
          <CheckCircle2 className="h-4.5 w-4.5 shrink-0 text-white" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* ==================== SCREEN RENDERS BY TAB ==================== */}

      {/* TAB 1: ASOSIY (HOME VIEW) */}
      {activeTab === "home" && (
        <div className="flex flex-col flex-1 animate-fade-in pb-20">
          {/* Custom Header matching Mobile UI */}
          <header className="px-6 pt-6 pb-2.5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full overflow-hidden border border-zinc-200 dark:border-white/10 shadow-sm bg-zinc-100">
                <img src="/images/restaurant.png" alt="Venue Avatar" className="w-full h-full object-cover" />
              </div>
              <div className="text-left">
                <h2 className="font-extrabold text-sm tracking-tight">{partnerName}</h2>
                <span className="text-[10px] font-bold text-zinc-400 dark:text-zinc-550 uppercase tracking-wider">Hamkor paneli</span>
              </div>
            </div>
            <button className={`w-9 h-9 rounded-full flex items-center justify-center relative transition-all active:scale-95 ${
              isDark ? "bg-[#2C2C2E]/60 text-white hover:bg-[#3A3A3C]" : "bg-zinc-100 text-zinc-800 hover:bg-zinc-150"
            }`}>
              <Bell className="h-4.5 w-4.5" />
              <span className="absolute top-2.5 right-2.5 w-1.5 h-1.5 rounded-full bg-red-500" />
            </button>
          </header>

          {/* Time & State Badge */}
          <div className="px-6 py-2 flex items-center gap-2 text-xs font-semibold text-zinc-500 dark:text-zinc-400">
            <Clock className="h-4 w-4 text-zinc-450" />
            <span>Ish vaqti:</span>
            <span className={`px-2.5 py-1 rounded-xl font-bold ${isDark ? "bg-white/5 text-white" : "bg-zinc-100 text-zinc-800"}`}>
              {venueHours}
            </span>
            <span className="px-2.5 py-1 rounded-xl bg-emerald-500/10 text-emerald-500 font-extrabold">Ochiq</span>
          </div>

          {/* Hozirgi navbat Orange Card */}
          <div className="mx-6 mt-4 p-5 rounded-[24px] bg-[#FF5A00] text-white shadow-lg shadow-[#FF5A00]/25 relative overflow-hidden transition-all hover:scale-[1.01] cursor-pointer">
            <div className="flex justify-between items-center">
              <span className="text-xs font-extrabold tracking-wide uppercase opacity-90">Hozirgi navbat</span>
              <ChevronRight className="h-4 w-4 opacity-80" />
            </div>
            <div className="mt-2.5 flex items-baseline gap-2">
              <span className="text-3xl font-black tracking-tight">{bookings.filter(b => b.status === "pending").length * 5 + 5} ta</span>
              <span className="text-[10px] font-bold bg-white/15 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                -1%
              </span>
            </div>
            <p className="mt-1 text-[11px] font-semibold opacity-75">mijoz band qilgan</p>
          </div>

          {/* 1 haftalik band qilishlar Chart Card */}
          <div className={`mx-6 mt-4 p-5 rounded-[28px] border transition-all ${
            isDark ? "bg-[#2C2520] border-[#FF5A00]/10" : "bg-[#FAF5F0] border-[#FF5A00]/5"
          }`}>
            <div className="flex justify-between items-start">
              <div className="space-y-0.5 text-left">
                <span className="text-[11px] font-bold tracking-wide text-black/55 dark:text-white/60 uppercase">1 haftalik band qilishlar</span>
                <h3 className="text-xl font-black tracking-tight text-black dark:text-white">Jum/120 ta</h3>
              </div>
              
              <div className="flex items-center gap-1.5">
                <span className={`text-xs font-black ${isDark ? "text-white" : "text-zinc-800"}`}>+12%</span>
                <div className={`w-6 h-6 rounded-lg flex items-center justify-center ${
                  isDark ? "bg-emerald-500/10 text-emerald-500" : "bg-[#E2FBE9] text-[#10B981]"
                }`}>
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                    <rect x="4" y="10" width="3" height="10" rx="1" />
                    <rect x="10" y="5" width="3" height="15" rx="1" />
                    <rect x="16" y="14" width="3" height="6" rx="1" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Premium custom weekly bar chart */}
            <div className="mt-8 flex justify-between items-end h-[148px] px-0.5 gap-2">
              {[
                { label: "Dush", val: 13, h: "h-[40px]" },
                { label: "Sesh", val: 75, h: "h-[80px]" },
                { label: "Chor", val: 68, h: "h-[72px]" },
                { label: "Pay", val: 12, h: "h-[36px]" },
                { label: "Jum", val: 74, h: "h-[78px]" },
                { label: "Shan", val: 120, h: "h-[112px]" },
                { label: "Yak", val: 200, h: "h-[140px]", active: true }
              ].map((bar, i) => (
                <div key={i} className="flex flex-col items-center gap-2.5 flex-1">
                  <div className="w-full flex items-end justify-center">
                    <div className={`w-full ${bar.h} rounded-[14px] flex flex-col justify-start items-center pt-2 transition-all duration-300 relative ${
                      bar.active 
                        ? "bg-[#FF5A00] text-white shadow-md shadow-[#FF5A00]/25" 
                        : isDark ? "bg-[#3A3A3C] text-white/90" : "bg-white text-zinc-800 shadow-[0_2px_8px_rgba(0,0,0,0.02)]"
                    }`}>
                      <span className="text-[10px] font-bold tracking-tight">{bar.val}</span>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold opacity-60 leading-none">{bar.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Restoranlar & Xodimlar stats rows */}
          <div className="mx-6 mt-4 grid grid-cols-2 gap-4">
            {/* Restoranlar Card */}
            <div 
              onClick={() => setActiveTab("menu")}
              className={`p-4 rounded-[20px] border flex flex-col justify-between h-24 text-left transition-all active:scale-98 cursor-pointer ${
                isDark ? "bg-[#393939]/30 border-white/5 hover:border-white/10" : "bg-white border-zinc-200 shadow-sm hover:border-zinc-300"
              }`}
            >
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-extrabold opacity-60 uppercase tracking-wide">Restoranlar soni</span>
                <ChevronRight className="h-3.5 w-3.5 opacity-55" />
              </div>
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-500">
                  <Building2 className="h-4.5 w-4.5" />
                </div>
                <span className="text-lg font-black">{venues.length} ta</span>
              </div>
            </div>

            {/* Xodimlar Card */}
            <div 
              onClick={() => setActiveTab("staff")}
              className={`p-4 rounded-[20px] border flex flex-col justify-between h-24 text-left transition-all active:scale-98 cursor-pointer ${
                isDark ? "bg-[#393939]/30 border-white/5 hover:border-white/10" : "bg-white border-zinc-200 shadow-sm hover:border-zinc-300"
              }`}
            >
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-extrabold opacity-60 uppercase tracking-wide">Hodimlar soni</span>
                <ChevronRight className="h-3.5 w-3.5 opacity-55" />
              </div>
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-purple-500/10 text-purple-500">
                  <Users className="h-4.5 w-4.5" />
                </div>
                <span className="text-lg font-black">{staff.length} ta</span>
              </div>
            </div>
          </div>

          {/* 1 oylik band qilishlar bottom summary */}
          <div className={`mx-6 mt-4 p-5 rounded-[24px] border text-left transition-all ${
            isDark ? "bg-[#393939]/20 border-white/5" : "bg-white border-zinc-150 shadow-sm"
          }`}>
            <div className="flex justify-between items-center">
              <span className="text-xs font-extrabold tracking-wide opacity-50 dark:opacity-60 uppercase">1 oylik band qilishlar</span>
              <span className="text-xs font-bold text-zinc-500 dark:text-zinc-400 bg-zinc-100 dark:bg-white/5 px-2.5 py-1 rounded-xl">Yanvar</span>
            </div>
            <div className="mt-3 flex items-baseline justify-between">
              <div>
                <span className="text-2xl font-black tracking-tight">2000 ta</span>
                <p className="text-[11px] font-semibold opacity-60 mt-0.5">mijoz band qildi</p>
              </div>
              <span className="text-[10px] font-bold bg-emerald-500/10 text-emerald-500 px-2.5 py-1 rounded-full flex items-center gap-0.5">
                +12% ▲
              </span>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: BUYURTMALAR (ORDERS VIEW) */}
      {activeTab === "bookings" && (
        <div className="flex flex-col flex-1 animate-fade-in pb-20">
          <header className="px-6 py-5 border-b border-zinc-100 dark:border-white/5 flex items-center justify-between">
            <h1 className="text-xl font-black">Bron buyurtmalari</h1>
            <span className="text-xs font-bold px-3 py-1 rounded-full bg-[#FF5A00]/10 text-[#FF5A00]">
              {bookings.filter(b => b.status === "pending").length} yangi
            </span>
          </header>

          <main className="flex-1 overflow-y-auto px-6 py-4 space-y-4 text-left">
            {bookings.length === 0 ? (
              <div className="text-center py-12 opacity-50 space-y-2">
                <Calendar className="h-10 w-10 mx-auto" />
                <p className="text-xs font-bold">Buyurtmalar mavjud emas</p>
              </div>
            ) : (
              bookings.map((booking) => (
                <div
                  key={booking.id}
                  className={`p-5 rounded-2xl border flex flex-col gap-3.5 transition-all ${
                    isDark 
                      ? "bg-[#393939]/30 border-white/5" 
                      : "bg-white border-zinc-150 shadow-sm"
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div className="space-y-0.5">
                      <h3 className="font-extrabold text-sm">{booking.customerName}</h3>
                      <p className="text-[10px] font-mono text-zinc-400">{booking.phone}</p>
                    </div>
                    <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                      booking.status === "approved"
                        ? "bg-green-500/10 text-green-500"
                        : booking.status === "rejected"
                        ? "bg-red-500/10 text-red-500"
                        : "bg-amber-500/10 text-amber-500"
                    }`}>
                      {booking.status === "approved" && "Tasdiqlandi"}
                      {booking.status === "rejected" && "Rad etildi"}
                      {booking.status === "pending" && "Kutilmoqda"}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs font-medium border-t border-zinc-100 dark:border-white/5 pt-3">
                    <div>
                      <span className="text-[10px] opacity-40 block">Joylashuv:</span>
                      <span>{booking.tableOrZal}</span>
                    </div>
                    <div>
                      <span className="text-[10px] opacity-40 block">Muassasa:</span>
                      <span className="truncate block max-w-full">{booking.venueName}</span>
                    </div>
                    <div className="mt-1">
                      <span className="text-[10px] opacity-40 block">Sana:</span>
                      <span>{booking.date}</span>
                    </div>
                    <div className="mt-1">
                      <span className="text-[10px] opacity-40 block">Vaqt:</span>
                      <span>{booking.time}</span>
                    </div>
                  </div>

                  {booking.status === "pending" && (
                    <div className="flex gap-2 pt-1 border-t border-zinc-100 dark:border-white/5 mt-1">
                      <button
                        onClick={() => handleBookingAction(booking.id, "approved")}
                        className="flex-1 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors active:scale-98"
                      >
                        <Check className="h-4 w-4 stroke-[3px]" /> Tasdiqlash
                      </button>
                      <button
                        onClick={() => handleBookingAction(booking.id, "rejected")}
                        className="py-2 px-3 rounded-xl border border-red-500/20 hover:bg-red-500/5 text-red-500 font-bold text-xs flex items-center justify-center transition-colors active:scale-98"
                      >
                        <X className="h-4 w-4" /> Rad etish
                      </button>
                    </div>
                  )}
                </div>
              ))
            )}
          </main>
        </div>
      )}

      {/* TAB 3: MENYU (VENUE / DETAILS CATALOG VIEW) */}
      {activeTab === "menu" && (
        <div className="flex flex-col flex-1 animate-fade-in pb-20">
          <header className="px-6 py-5 border-b border-zinc-100 dark:border-white/5 flex items-center justify-between">
            <h1 className="text-xl font-black">Restoranlar & Zallar</h1>
            <button
              onClick={() => router.push("/login")}
              className="p-2 rounded-xl bg-[#FF5A00] text-white flex items-center justify-center active:scale-95 transition-all shadow-md shadow-[#FF5A00]/10"
              title="Yangi joy qo'shish"
            >
              <Plus className="h-4.5 w-4.5 stroke-[2.5px]" />
            </button>
          </header>

          <main className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
            {venues.length === 0 ? (
              <div className="border border-dashed border-zinc-300 dark:border-white/10 rounded-2xl p-10 text-center space-y-3 bg-white/10 dark:bg-zinc-900/10">
                <Building2 className="h-10 w-10 text-zinc-400 mx-auto" />
                <p className="text-xs font-semibold opacity-60">Sizda hali ro'yxatdan o'tgan joylar yo'q.</p>
                <button
                  onClick={() => router.push("/login")}
                  className="px-4 py-2 rounded-lg bg-[#FF5A00] text-white text-xs font-bold"
                >
                  Yaratish
                </button>
              </div>
            ) : (
              venues.map((venue) => (
                <div
                  key={venue.id}
                  className={`p-4 rounded-2xl border flex flex-col gap-3 transition-all ${
                    isDark
                      ? "bg-[#393939]/30 border-white/5"
                      : "bg-white border-zinc-150 shadow-sm"
                  }`}
                >
                  <div className="flex gap-4">
                    <div className="w-16 h-16 rounded-2xl bg-[#FF5A00]/10 flex items-center justify-center text-3xl shrink-0">
                      {venue.emoji || "🍽️"}
                    </div>

                    <div className="space-y-1 w-full min-w-0 text-left">
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold truncate text-sm">{venue.name}</h3>
                        <span className={`px-2 py-0.5 text-[8px] font-black uppercase rounded-full tracking-wider ${
                          venue.category === "restoran"
                            ? "bg-blue-500/10 text-blue-500"
                            : "bg-purple-500/10 text-purple-500"
                        }`}>
                          {venue.category}
                        </span>
                      </div>

                      <div className="flex items-center gap-1 text-[11px] opacity-60">
                        <MapPin className="h-3 w-3 text-zinc-400" />
                        <span className="truncate">{venue.location}</span>
                      </div>

                      <div className="flex flex-wrap gap-2 pt-1 text-[10px] font-bold">
                        <span className="px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-white/5 flex items-center gap-0.5 text-zinc-650 dark:text-zinc-350">
                          <Users className="h-3 w-3 text-[#FF5A00]" /> {venue.capacity}
                        </span>
                        <span className="px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-white/5 flex items-center gap-0.5 text-zinc-650 dark:text-zinc-350">
                          <DollarSign className="h-3 w-3 text-[#FF5A00]" /> {venue.priceText}
                        </span>
                        <span className="px-2 py-0.5 rounded-md bg-[#FF5A00]/10 text-[#FF5A00] flex items-center gap-0.5">
                          <Star className="h-3 w-3 fill-current" /> {venue.rating}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-between items-center border-t border-zinc-100 dark:border-white/5 pt-2.5 text-[10px] opacity-50">
                    <span>ID: {venue.id}</span>
                    <button
                      onClick={() => handleDeleteVenue(venue.id)}
                      className="p-1.5 rounded-lg text-[#E82C2C] hover:bg-[#E82C2C]/10 transition-colors cursor-pointer"
                      title="O'chirish"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </main>
        </div>
      )}

      {/* TAB 4: XODIMLAR (STAFF VIEW) */}
      {activeTab === "staff" && (
        <div className="flex flex-col flex-1 animate-fade-in pb-20">
          <header className="px-6 py-5 border-b border-zinc-100 dark:border-white/5 flex items-center justify-between">
            <h1 className="text-xl font-black">Xodimlar ro'yxati</h1>
            <button
              onClick={() => setShowAddStaffModal(true)}
              className="p-2 rounded-xl bg-[#FF5A00] text-white flex items-center justify-center active:scale-95 transition-all shadow-md shadow-[#FF5A00]/10"
              title="Yangi xodim qo'shish"
            >
              <Plus className="h-4.5 w-4.5 stroke-[2.5px]" />
            </button>
          </header>

          <main className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
            {staff.map((member) => (
              <div
                key={member.id}
                className={`p-4 rounded-2xl border flex items-center justify-between transition-all ${
                  isDark ? "bg-[#393939]/30 border-white/5" : "bg-white border-zinc-150 shadow-sm"
                }`}
              >
                <div className="flex items-center gap-3 text-left">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    isDark ? "bg-white/5 text-white" : "bg-zinc-100 text-zinc-700"
                  }`}>
                    <User className="w-5 h-5" />
                  </div>
                  <div className="space-y-0.5">
                    <h3 className="font-extrabold text-sm">{member.name}</h3>
                    <p className="text-[10px] text-zinc-400 font-medium">{member.role} • {member.phone}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className={`w-2.5 h-2.5 rounded-full ${
                    member.status === "active" ? "bg-emerald-500" : "bg-zinc-400"
                  }`} />
                  <span className="text-xs font-bold opacity-60">
                    {member.status === "active" ? "Ishda" : "Damda"}
                  </span>
                </div>
              </div>
            ))}
          </main>

          {/* Add Staff Simple Modal Drawer */}
          {showAddStaffModal && (
            <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end justify-center transition-opacity duration-300 animate-fade-in">
              <div className="absolute inset-0" onClick={() => setShowAddStaffModal(false)} />
              
              <div className={`w-full max-w-md rounded-t-[32px] px-6 pt-3 pb-8 flex flex-col items-stretch gap-4 z-10 animate-slide-up border-t relative text-left ${
                isDark ? "bg-[#393939] border-white/5" : "bg-white border-zinc-200"
              }`}>
                {/* Drag Handle */}
                <div className={`w-12 h-1 rounded-full mx-auto mb-2 ${isDark ? "bg-white/20" : "bg-zinc-250"}`} />
                
                <h3 className="font-black text-base">Yangi xodim qo'shish</h3>
                
                <form onSubmit={handleAddStaff} className="space-y-4">
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
                      value={newStaffRole}
                      onChange={(e) => setNewStaffRole(e.target.value)}
                      className={`w-full px-4 py-3 rounded-xl border text-sm font-bold outline-none transition-colors ${
                        isDark ? "border-white/10 bg-[#2C2C2E]" : "border-zinc-200 bg-zinc-50"
                      }`}
                    >
                      <option value="Ofitsiant">Ofitsiant</option>
                      <option value="Hostes">Xostes</option>
                      <option value="Menejer">Menejer</option>
                      <option value="Bosh oshpaz">Bosh oshpaz</option>
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
                    className="w-full py-4 bg-[#FF5A00] hover:bg-[#E05000] text-white font-extrabold text-xs rounded-2xl shadow-lg transition-all active:scale-98 mt-2"
                  >
                    Xodimni ro'yxatdan o'tkazish
                  </button>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 5: SOZLAMALAR (SETTINGS VIEW) */}
      {activeTab === "settings" && (
        <div className="flex flex-col flex-1 animate-fade-in pb-20">
          <header className="px-6 py-5 border-b border-zinc-100 dark:border-white/5 flex items-center justify-between">
            <h1 className="text-xl font-black">Profil sozlamalari</h1>
          </header>

          <main className="flex-1 overflow-y-auto px-6 py-6 space-y-6 text-left">
            {/* Partner Profile card */}
            <div className="flex items-center gap-4 border-b border-zinc-100 dark:border-white/5 pb-5">
              <div className="w-16 h-16 rounded-full overflow-hidden border bg-zinc-100 shadow-md">
                <img src="/images/restaurant.png" alt="Profile" className="w-full h-full object-cover" />
              </div>
              <div className="space-y-0.5">
                <h3 className="font-extrabold text-base">{partnerName}</h3>
                <p className="text-xs text-zinc-400 font-bold uppercase tracking-wider">{partnerLocation}</p>
              </div>
            </div>

            {/* Inputs edit panel */}
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold opacity-60">Muassasa nomi</label>
                <input
                  type="text"
                  value={partnerName}
                  onChange={(e) => {
                    setPartnerName(e.target.value);
                    localStorage.setItem("fullName", e.target.value);
                  }}
                  className={`w-full px-4 py-3.5 rounded-xl border text-sm font-bold outline-none focus:border-[#FF5A00] transition-colors ${
                    isDark ? "border-white/10 bg-[#393939]" : "border-zinc-200 bg-zinc-50"
                  }`}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold opacity-60">Ish soatlari</label>
                <input
                  type="text"
                  value={venueHours}
                  onChange={(e) => {
                    setVenueHours(e.target.value);
                    localStorage.setItem("venueHours", e.target.value);
                  }}
                  placeholder="09:00 - 23:00"
                  className={`w-full px-4 py-3.5 rounded-xl border text-sm font-bold outline-none focus:border-[#FF5A00] transition-colors ${
                    isDark ? "border-white/10 bg-[#393939]" : "border-zinc-200 bg-zinc-50"
                  }`}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold opacity-60">Mintaqa / Tuman</label>
                <input
                  type="text"
                  value={partnerLocation}
                  onChange={(e) => {
                    setPartnerLocation(e.target.value);
                    localStorage.setItem("location", e.target.value);
                  }}
                  className={`w-full px-4 py-3.5 rounded-xl border text-sm font-bold outline-none focus:border-[#FF5A00] transition-colors ${
                    isDark ? "border-white/10 bg-[#393939]" : "border-zinc-200 bg-zinc-50"
                  }`}
                />
              </div>

              {/* Theme toggle option */}
              <div className="pt-2">
                <label className="text-xs font-bold opacity-60 block mb-2">Ilova mavzusi</label>
                <button
                  type="button"
                  onClick={toggleTheme}
                  className={`w-full flex items-center justify-between p-4 rounded-xl border transition-all ${
                    isDark ? "bg-[#393939] border-white/10" : "bg-zinc-50 border-zinc-200 hover:bg-zinc-100"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {isDark ? <Moon className="h-4.5 w-4.5 text-[#FF5A00]" /> : <Sun className="h-4.5 w-4.5 text-[#FF5A00]" />}
                    <span className="text-xs font-extrabold">{isDark ? "Tungi rejim" : "Kunduzgi rejim"}</span>
                  </div>
                  <span className="text-[10px] font-black uppercase bg-[#FF5A00]/10 text-[#FF5A00] px-2 py-0.5 rounded">
                    O'zgartirish
                  </span>
                </button>
              </div>

              {/* Logout button */}
              <div className="pt-6">
                <button
                  onClick={handleLogout}
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

      {/* ==================== HIGH-FIDELITY PARTNER BOTTOM NAVIGATION BAR ==================== */}
      <div className={`fixed bottom-0 left-0 right-0 z-50 h-[72px] max-w-md mx-auto border-t flex justify-between items-center px-4 transition-all duration-300 ${
        isDark ? "bg-[#1E1E1E] border-white/10 shadow-[0_-4px_15px_rgba(0,0,0,0.5)]" : "bg-white border-zinc-200 shadow-[0_-4px_10px_rgba(0,0,0,0.04)]"
      }`}>
        {[
          { key: "home", label: "Asosiy", icon: "/logo-loading.png", isCustomIcon: true },
          { key: "bookings", label: "Buyurtmalar", icon: Calendar, isCustomIcon: false },
          { key: "menu", label: "Menyu", icon: Utensils, isCustomIcon: false },
          { key: "staff", label: "Xodimlar", icon: Users, isCustomIcon: false },
          { key: "settings", label: "Sozlamalar", icon: Settings, isCustomIcon: false }
        ].map((item) => {
          const isActive = activeTab === item.key;
          const IconComponent = item.icon as any;

          return (
            <button
              key={item.key}
              onClick={() => setActiveTab(item.key as any)}
              className="flex-1 flex flex-col items-center justify-center gap-1 h-full py-1 cursor-pointer group transition-all"
            >
              {item.isCustomIcon ? (
                <img
                  src={item.icon as string}
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
              <span className={`text-[10px] font-bold tracking-tight transition-colors duration-250 ${
                isActive 
                  ? "text-[#FF5A00]" 
                  : "text-[#8E8E93]"
              }`}>
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
