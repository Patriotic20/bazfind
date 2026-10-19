"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import {
  Search,
  SlidersHorizontal,
  Star,
  MapPin,
  Map,
  Compass,
  Wallet,
  ArrowRight,
  Ticket,
  ChevronRight,
  ChevronLeft,
  CheckCircle,
  X,
  ChevronDown,
  Sun,
  Moon,
  Bookmark,
  Loader2,
  Check,
  Globe,
  Bell,
  Sparkles,
  Users,
} from "lucide-react";
import Navbar from "@/components/navbar";
import { useTheme } from "@/components/theme-provider";
import { useAuth } from "@/contexts/AuthContext";
import ToyxonaFlowModal, { ToyxonaVenueData } from "@/components/toyxona-flow-modal";
import {
  venueService,
  geoService,
  userService,
  engagementService,
  VenueListItem,
  UserAddressRead,
  VenueTypeSlug,
  RegionRead,
  DistrictRead,
  NotificationRead,
} from "@/lib/api";

const FALLBACK_IMAGES = [
  "/images/home/top.png",
  "/images/home/tuyxona1.png",
  "/images/home/tuyxona2.png",
  "/images/home/tuyxona3.png",
  "/images/home/tuyxona4.png",
];

export default function WelcomePage() {
  const [mounted, setMounted] = useState(false);
  const { user, isAuthenticated } = useAuth();
  const [isRegistered, setIsRegistered] = useState(true);
  const [activeTab, setActiveTab] = useState<"Umumiy" | "Restoranlar" | "To'yxonalar">("Umumiy");
  const [currentSlide, setCurrentSlide] = useState(0);
  const [showBookingSuccessToast, setShowBookingSuccessToast] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const { theme, toggleTheme } = useTheme();

  // Toyxona Booking Flow Modal State
  const [showToyxonaModal, setShowToyxonaModal] = useState(false);
  const [selectedToyxonaVenue, setSelectedToyxonaVenue] = useState<ToyxonaVenueData | null>(null);
  const [toyxonaModalStep, setToyxonaModalStep] = useState<"detail" | "step1">("detail");

  const handleOpenToyxonaBooking = (venueData?: ToyxonaVenueData, step: "detail" | "step1" = "detail") => {
    setSelectedToyxonaVenue(venueData || null);
    setToyxonaModalStep(step);
    setShowToyxonaModal(true);
  };

  // Notifications Modal States
  const [showNotificationsModal, setShowNotificationsModal] = useState(false);
  const [notifications, setNotifications] = useState<NotificationRead[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  // API dynamic states
  const [venues, setVenues] = useState<VenueListItem[]>([]);
  const [loadingVenues, setLoadingVenues] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [guestCountFilter, setGuestCountFilter] = useState<number | null>(null);
  const [favoriteVenueIds, setFavoriteVenueIds] = useState<Set<number>>(new Set());
  const [recentLocations, setRecentLocations] = useState<UserAddressRead[]>([]);
  const [selectedDistrictId, setSelectedDistrictId] = useState<number | null>(null);
  const [selectedDistrictName, setSelectedDistrictName] = useState<string>("");
  const [geoDetecting, setGeoDetecting] = useState(false);

  // Geo Regions & Districts
  const [geoRegions, setGeoRegions] = useState<RegionRead[]>([]);
  const [activeRegionId, setActiveRegionId] = useState<number | null>(null);
  const [regionDistrictsMap, setRegionDistrictsMap] = useState<Record<number, DistrictRead[]>>({});
  const [loadingDistrictsFor, setLoadingDistrictsFor] = useState<number | null>(null);
  const [locationSearchInput, setLocationSearchInput] = useState("");

  // Interactive party/time picker state
  const [showPartySheet, setShowPartySheet] = useState(false);
  const [showLocationSearch, setShowLocationSearch] = useState(false);
  const [partySize, setPartySize] = useState(5);
  const [selectedDay, setSelectedDay] = useState("Jum");
  const [selectedTime, setSelectedTime] = useState("23:30");

  // Drag to Scroll Spinner Picker Logic
  const dayScrollRef = useRef<HTMLDivElement>(null);
  const [dayDragState, setDayDragState] = useState({ isDown: false, startY: 0, scrollTop: 0 });

  const handleDayMouseDown = (e: React.MouseEvent) => {
    const el = dayScrollRef.current;
    if (!el) return;
    setDayDragState({
      isDown: true,
      startY: e.pageY - el.offsetTop,
      scrollTop: el.scrollTop,
    });
  };

  const handleDayMouseMove = (e: React.MouseEvent) => {
    if (!dayDragState.isDown) return;
    e.preventDefault();
    const el = dayScrollRef.current;
    if (!el) return;
    const y = e.pageY - el.offsetTop;
    const walk = (y - dayDragState.startY) * 1.5;
    el.scrollTop = dayDragState.scrollTop - walk;
  };

  const handleDayMouseUpOrLeave = () => {
    setDayDragState((prev) => ({ ...prev, isDown: false }));
  };

  const handleDayScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    const index = Math.round(el.scrollTop / 40);
    const days = ["Chor", "Pay", "Jum", "Shan", "Yak"];
    if (index >= 0 && index < days.length) {
      setSelectedDay(days[index]);
    }
  };

  const timeScrollRef = useRef<HTMLDivElement>(null);
  const [timeDragState, setTimeDragState] = useState({ isDown: false, startY: 0, scrollTop: 0 });

  const handleTimeMouseDown = (e: React.MouseEvent) => {
    const el = timeScrollRef.current;
    if (!el) return;
    setTimeDragState({
      isDown: true,
      startY: e.pageY - el.offsetTop,
      scrollTop: el.scrollTop,
    });
  };

  const handleTimeMouseMove = (e: React.MouseEvent) => {
    if (!timeDragState.isDown) return;
    e.preventDefault();
    const el = timeScrollRef.current;
    if (!el) return;
    const y = e.pageY - el.offsetTop;
    const walk = (y - timeDragState.startY) * 1.5;
    el.scrollTop = timeDragState.scrollTop - walk;
  };

  const handleTimeMouseUpOrLeave = () => {
    setTimeDragState((prev) => ({ ...prev, isDown: false }));
  };

  const handleTimeScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    const index = Math.round(el.scrollTop / 40);
    const times = ["22:30", "23:00", "23:30", "00:00"];
    if (index >= 0 && index < times.length) {
      setSelectedTime(times[index]);
    }
  };

  // Center alignment effect on mount
  useEffect(() => {
    if (showPartySheet) {
      setTimeout(() => {
        const days = ["Chor", "Pay", "Jum", "Shan", "Yak"];
        const dayIdx = days.indexOf(selectedDay);
        if (dayIdx !== -1 && dayScrollRef.current) {
          dayScrollRef.current.scrollTop = dayIdx * 40;
        }

        const times = ["22:30", "23:00", "23:30", "00:00"];
        const timeIdx = times.indexOf(selectedTime);
        if (timeIdx !== -1 && timeScrollRef.current) {
          timeScrollRef.current.scrollTop = timeIdx * 40;
        }
      }, 50);
    }
  }, [showPartySheet, selectedDay, selectedTime]);

  const BANNERS = [
    "/images/home/adv1.png",
    "/images/home/top.png",
    "/images/home/tuyxona2.png",
    "/images/home/tuyxona3.png",
  ];

  // Fetch Venues from Backend
  const loadVenues = useCallback(async () => {
    setLoadingVenues(true);
    try {
      let vType: VenueTypeSlug | undefined;
      if (activeTab === "Restoranlar") vType = "restoran";
      if (activeTab === "To'yxonalar") vType = "toyxona";

      const res = await venueService.searchVenues({
        query: searchQuery.trim() || undefined,
        venue_type: vType,
        district_id: selectedDistrictId || undefined,
        guest_count: guestCountFilter || undefined,
        limit: 20,
      });
      setVenues(res.items || []);
    } catch (err) {
      console.warn("Venues fetch fallback:", err);
      setVenues([]);
    } finally {
      setLoadingVenues(false);
    }
  }, [activeTab, searchQuery, selectedDistrictId, guestCountFilter]);

  useEffect(() => {
    setMounted(true);
    const registered = localStorage.getItem("isRegistered");
    if (registered === "false") {
      setIsRegistered(false);
    } else {
      setIsRegistered(true);
    }

    // Check URL parameters client-side
    const params = new URLSearchParams(window.location.search);
    if (params.get("bookingSuccess") === "true") {
      setShowBookingSuccessToast(true);
      const timer = setTimeout(() => {
        setShowBookingSuccessToast(false);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, []);

  // Fetch recent locations & favorites if user is logged in
  useEffect(() => {
    if (isAuthenticated && user) {
      userService.listRecentLocations()
        .then((locs) => setRecentLocations(locs || []))
        .catch(() => {});
      engagementService.getFavorites()
        .then((favs) => {
          setFavoriteVenueIds(new Set((favs || []).map((f) => (f as any).venue_id || f.venue?.id).filter(Boolean)));
        })
        .catch(() => {});
    }
  }, [isAuthenticated, user]);

  // Notifications fetch
  useEffect(() => {
    if (isAuthenticated && user) {
      engagementService.getUnreadNotificationsCount()
        .then((cnt) => setUnreadCount(cnt || 0))
        .catch(() => {});
      engagementService.getNotifications(10)
        .then((res) => setNotifications(res.items || []))
        .catch(() => {});
    }
  }, [isAuthenticated, user]);

  // Hide global bottom bar when Notifications or Sheets are open
  useEffect(() => {
    const bottomNav = document.getElementById("global-bottom-nav");
    if (bottomNav) {
      if (showNotificationsModal || showPartySheet || showLocationSearch) {
        bottomNav.style.transform = "translateY(150%)";
        bottomNav.style.opacity = "0";
        bottomNav.style.pointerEvents = "none";
      } else {
        bottomNav.style.transform = "translateY(0)";
        bottomNav.style.opacity = "1";
        bottomNav.style.pointerEvents = "auto";
      }
    }
    return () => {
      if (bottomNav) {
        bottomNav.style.transform = "translateY(0)";
        bottomNav.style.opacity = "1";
        bottomNav.style.pointerEvents = "auto";
      }
    };
  }, [showNotificationsModal, showPartySheet, showLocationSearch]);

  // Load venues on filter changes
  useEffect(() => {
    const timer = setTimeout(() => {
      loadVenues();
    }, 300);
    return () => clearTimeout(timer);
  }, [loadVenues]);

  // Automatic slide interval for best offers carousel
  useEffect(() => {
    if (!isRegistered) return;
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % BANNERS.length);
    }, 3500);
    return () => clearInterval(interval);
  }, [isRegistered, BANNERS.length]);

  // Fetch regions on mount
  useEffect(() => {
    geoService.getRegions()
      .then((res) => setGeoRegions(res || []))
      .catch(() => {});

    const savedId = localStorage.getItem("selectedDistrictId");
    const savedName = localStorage.getItem("selectedDistrictName");
    if (savedId) {
      setSelectedDistrictId(Number(savedId));
    }
    if (savedName) {
      setSelectedDistrictName(savedName);
    } else {
      setSelectedDistrictName("Toshkent shahri (Barcha tumanlar)");
      setSelectedDistrictId(null);
    }
  }, []);

  const handleToggleRegion = async (regionId: number) => {
    if (activeRegionId === regionId) {
      setActiveRegionId(null);
      return;
    }
    setActiveRegionId(regionId);
    if (!regionDistrictsMap[regionId]) {
      setLoadingDistrictsFor(regionId);
      try {
        const d = await geoService.getDistricts(regionId);
        setRegionDistrictsMap((prev) => ({ ...prev, [regionId]: d || [] }));
      } finally {
        setLoadingDistrictsFor(null);
      }
    }
  };

  const handleSelectDistrict = async (districtId: number | null, label: string) => {
    setSelectedDistrictId(districtId);
    setSelectedDistrictName(label);
    if (districtId) {
      localStorage.setItem("selectedDistrictId", String(districtId));
    } else {
      localStorage.removeItem("selectedDistrictId");
    }
    localStorage.setItem("selectedDistrictName", label);
    setShowLocationSearch(false);
    setLocationSearchInput("");
    setToastMessage(`Manzil tanlandi: ${label}`);

    if (isAuthenticated && districtId) {
      await userService.saveRecentLocation({
        district_id: districtId,
        label,
        latitude: 41.2995,
        longitude: 69.2401,
      }).catch(() => {});
      userService.listRecentLocations().then((locs) => setRecentLocations(locs || [])).catch(() => {});
    }
  };

  // Auto GPS Location Handler
  const handleAutoLocation = async () => {
    if (!navigator.geolocation) {
      setToastMessage("Geolokatsiya qo'llab-quvvatlanmaydi");
      return;
    }

    setGeoDetecting(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude, longitude } = pos.coords;
          const nearest = await geoService.getNearestDistrict(latitude, longitude);
          const fullLabel = `${nearest.region_name}, ${nearest.district_name}`;
          setSelectedDistrictId(nearest.district_id);
          setSelectedDistrictName(fullLabel);
          localStorage.setItem("selectedDistrictId", String(nearest.district_id));
          localStorage.setItem("selectedDistrictName", fullLabel);
          
          if (isAuthenticated) {
            await userService.saveRecentLocation({
              district_id: nearest.district_id,
              label: fullLabel,
              latitude,
              longitude,
            }).catch(() => {});
            userService.listRecentLocations().then((locs) => setRecentLocations(locs || [])).catch(() => {});
          }

          setShowLocationSearch(false);
          setLocationSearchInput("");
          setToastMessage(`Manzil aniqlandi: ${nearest.district_name}`);
        } catch {
          setToastMessage("Eng yaqin tuman topilmadi");
        } finally {
          setGeoDetecting(false);
        }
      },
      () => {
        setGeoDetecting(false);
        setToastMessage("Geolokatsiyaga ruxsat berilmadi");
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  const handleToggleFavorite = async (e: React.MouseEvent, venueId: number) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isAuthenticated) {
      setToastMessage("Sevimliga qo'shish uchun tizimga kiring");
      return;
    }
    try {
      const res = await engagementService.toggleFavorite(venueId);
      setFavoriteVenueIds((prev) => {
        const next = new Set(prev);
        if (res.is_favorite) {
          next.add(venueId);
        } else {
          next.delete(venueId);
        }
        return next;
      });
      setToastMessage(res.is_favorite ? "Sevimliga qo'shildi ❤️" : "Sevimlilardan olib tashlandi");
    } catch {
      setToastMessage("Xatolik yuz berdi");
    }
  };

  if (!mounted) {
    return <div className="flex flex-col flex-1 bg-[var(--background)] animate-pulse" />;
  }

  const welcomeCategories = [
    {
      title: "To'yxonalar",
      desc: "Eng hashamatli marosim zallari",
      icon: "🏰",
      count: "120+ zallar",
    },
    {
      title: "Restoranlar",
      desc: "Kichik va shinam tadbirlar uchun",
      icon: "🍽️",
      count: "85+ joylar",
    },
    {
      title: "Katering",
      desc: "Professional taomlar xizmati",
      icon: "🍢",
      count: "40+ xizmatlar",
    },
    {
      title: "Bezaklar",
      desc: "Zallarni bezatish va dizayn",
      icon: "🎈",
      count: "60+ jamoalar",
    },
  ];

  const horizontalTabs: ("Umumiy" | "Restoranlar" | "To'yxonalar")[] = [
    "Umumiy",
    "Restoranlar",
    "To'yxonalar",
  ];

  const displayName = user?.first_name ? `${user.first_name}` : (localStorage.getItem("fullName") || "Shahzod");


  return (
    <div className="flex flex-col flex-1 bg-[var(--background)] text-foreground transition-colors duration-300 relative">
      {isRegistered ? (
        /* ==================== HIGH-FIDELITY REGISTERED ASOSIY (HOME) VIEW ==================== */
        <div className="flex flex-col flex-1 min-h-screen bg-white dark:bg-[var(--background)]">
          {/* Header Row */}
          <div
            className={`flex items-center justify-between px-6 transition-all duration-200 ${
              theme === "dark" ? "py-5 border-b border-brand-dark-border" : "pt-6 pb-2"
            }`}
          >
            <div>
              <h1
                className={`text-xl font-extrabold tracking-tight ${
                  theme === "dark" ? "text-white" : "text-zinc-900"
                }`}
              >
                Hayrli kun! {displayName}
              </h1>
            </div>

            <div className="flex items-center gap-2">
              {/* Notifications Button */}
              <button
                type="button"
                onClick={() => setShowNotificationsModal(true)}
                className={`p-2.5 rounded-2xl border transition-all active:scale-95 flex items-center justify-center cursor-pointer shadow-sm relative ${
                  theme === "dark"
                    ? "bg-[#393939] border-white/5 text-white/80 hover:text-white"
                    : "bg-white border-zinc-200 text-zinc-800 hover:text-primary"
                }`}
                aria-label="Notifications"
              >
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-[var(--background)] animate-pulse" />
                )}
              </button>

              {/* Theme Toggle Button */}
              <button
                type="button"
                onClick={toggleTheme}
                className={`p-2.5 rounded-2xl transition-all active:scale-95 flex items-center justify-center cursor-pointer shadow-sm ${
                  theme === "dark"
                    ? "bg-[#393939] border border-white/5 text-white/80"
                    : "bg-white border border-zinc-200 text-zinc-800"
                }`}
                aria-label="Toggle theme"
              >
                {theme === "dark" ? <Sun className="h-5 w-5 text-orange-400" /> : <Moon className="h-5 w-5 text-zinc-600" />}
              </button>

              {/* Vouchers Link */}
              <Link
                href="/tickets"
                className={`p-2.5 rounded-2xl border transition-all active:scale-95 flex items-center justify-center shadow-sm ${
                  theme === "dark"
                    ? "bg-[#393939] border-white/5 text-white/80 hover:text-white"
                    : "bg-white border-zinc-200 text-zinc-800 hover:text-primary"
                }`}
                aria-label="Vouchers"
              >
                <Ticket className="h-5 w-5" />
              </Link>
            </div>
          </div>

          {/* Main Scrollable Area */}
          <main
            className={`flex-1 overflow-y-auto px-6 pb-8 flex flex-col gap-6 max-w-md mx-auto w-full text-left ${
              theme === "dark" ? "py-6" : "py-4"
            }`}
          >
            {/* Search Input and Filter Button */}
            <div className="flex items-center gap-3">
              {/* Search Field */}
              <div
                className={`flex-1 h-[52px] relative flex items-center rounded-full overflow-hidden transition-all duration-300 ${
                  theme === "dark"
                    ? "bg-[#252525] border border-white/5 focus-within:border-[#EA530E]/50"
                    : "bg-[#F2F4F7] border border-transparent focus-within:ring-2 focus-within:ring-[#EA530E]/20"
                }`}
              >
                <span className="pl-4 text-[#EA530E] flex items-center justify-center">
                  <Search className="w-5 h-5 stroke-[2.2]" />
                </span>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Qidirish"
                  className={`w-full pl-3 pr-4 h-full bg-transparent text-[15px] sm:text-base font-normal outline-none ${
                    theme === "dark"
                      ? "text-white placeholder:text-zinc-500"
                      : "text-zinc-900 placeholder:text-[#717680]"
                  }`}
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="pr-4 text-xs font-bold text-zinc-400 hover:text-zinc-600 cursor-pointer"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              {/* Orange Slider/Filter Button */}
              <button
                type="button"
                onClick={() => setShowPartySheet(true)}
                className={`w-[52px] h-[52px] rounded-[18px] bg-[#EA530E] hover:bg-[#D44607] text-white shadow-sm shadow-[#EA530E]/20 transition-all active:scale-95 flex items-center justify-center cursor-pointer shrink-0 ${
                  guestCountFilter ? "ring-2 ring-white ring-offset-1" : ""
                }`}
                aria-label="Filter"
              >
                <svg
                  className="w-6 h-6"
                  viewBox="0 0 24 24"
                  fill="none"
                >
                  <line x1="4.5" y1="8.5" x2="19.5" y2="8.5" stroke="white" strokeWidth="2.4" strokeLinecap="round" />
                  <circle cx="9.5" cy="8.5" r="3.2" fill="white" />
                  <line x1="4.5" y1="15.5" x2="19.5" y2="15.5" stroke="white" strokeWidth="2.4" strokeLinecap="round" />
                  <circle cx="14.5" cy="15.5" r="3.2" fill="white" />
                </svg>
              </button>
            </div>

            {/* Active Filter Chips */}
            {(guestCountFilter || (selectedDistrictId !== null && selectedDistrictName) || searchQuery) && (
              <div className="flex flex-wrap items-center gap-2 pt-0.5 animate-fade-in">
                {selectedDistrictId !== null && (
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FF6B00]/10 border border-[#FF6B00]/20 text-[#FF6B00] text-xs font-bold">
                    <MapPin className="h-3 w-3" />
                    <span className="truncate max-w-[140px]">{selectedDistrictName.split(", ").pop() || "Tuman"}</span>
                    <button
                      type="button"
                      onClick={() => handleSelectDistrict(null, "Toshkent shahri (Barcha tumanlar)")}
                      className="hover:opacity-70 p-0.5 cursor-pointer"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                )}
                {guestCountFilter && (
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FF6B00]/10 border border-[#FF6B00]/20 text-[#FF6B00] text-xs font-bold">
                    <span>{guestCountFilter} kishi</span>
                    <button
                      type="button"
                      onClick={() => setGuestCountFilter(null)}
                      className="hover:opacity-70 p-0.5 cursor-pointer"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                )}
                {searchQuery && (
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FF6B00]/10 border border-[#FF6B00]/20 text-[#FF6B00] text-xs font-bold">
                    <span>"{searchQuery}"</span>
                    <button
                      type="button"
                      onClick={() => setSearchQuery("")}
                      className="hover:opacity-70 p-0.5 cursor-pointer"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                )}
              </div>
            )}


            {/* Horizontal Tabs / Pills */}
            <div className="flex w-full gap-2.5 pb-1 overflow-x-auto scrollbar-none">
              {horizontalTabs.map((tab) => {
                const isActive = activeTab === tab;
                return (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setActiveTab(tab)}
                    className={`flex-1 text-center py-2.5 px-5 rounded-full text-sm font-bold whitespace-nowrap transition-all duration-200 border ${
                      isActive
                        ? theme === "dark"
                          ? "bg-primary text-white border-primary shadow-lg shadow-primary/10"
                          : "bg-primary text-white border-primary shadow-md"
                        : theme === "dark"
                        ? "bg-[#393939] border-white/5 text-white/60 hover:text-white"
                        : "bg-white border-zinc-200 text-zinc-800 hover:text-zinc-900"
                    }`}
                  >
                    {tab}
                  </button>
                );
              })}
            </div>

            {/* Section: Eng yaxshi takliflar */}
            <div className="space-y-4">
              <div className="flex justify-between items-center pr-1">
                <h2
                  className={`text-base font-extrabold tracking-tight ${
                    theme === "dark" ? "text-white" : "text-zinc-900"
                  }`}
                >
                  Eng yaxshi takliflar
                </h2>
                <Link
                  href="/tickets"
                  className={`text-xs font-bold hover:underline transition-colors ${
                    theme === "dark" ? "text-white/40" : "text-[#FF6B00]"
                  }`}
                >
                  Barchasini ko'rish
                </Link>
              </div>

              {/* Banner Card Carousel */}
              <div className="relative group">
                <div
                  className={`w-full aspect-[2.1/1] rounded-[28px] overflow-hidden border shadow-lg relative ${
                    theme === "dark" ? "bg-[#393939] border-white/5" : "bg-white border-zinc-100"
                  }`}
                >
                  {(activeTab === "To'yxonalar"
                    ? [
                        "/images/home/tuyxona2.png",
                        "/images/home/tuyxona3.png",
                        "/images/home/tuyxona1.png",
                      ]
                    : BANNERS
                  ).map((banner, index) => {
                    const isActive = currentSlide === index;
                    return (
                      <img
                        key={banner}
                        src={banner}
                        alt={`Offer Banner ${index + 1}`}
                        className={`absolute inset-0 w-full h-full object-cover transition-all duration-700 ease-in-out transform ${
                          isActive ? "opacity-100 scale-100 z-10" : "opacity-0 scale-105 z-0 pointer-events-none"
                        }`}
                      />
                    );
                  })}
                </div>

                {/* Indicator Dots */}
                <div className="flex justify-center items-center gap-1.5 pt-3">
                  {(activeTab === "To'yxonalar"
                    ? ["/images/home/tuyxona2.png", "/images/home/tuyxona3.png", "/images/home/tuyxona1.png"]
                    : BANNERS
                  ).map((_, index) => {
                    const isActive = currentSlide === index;
                    return (
                      <button
                        key={index}
                        type="button"
                        onClick={() => setCurrentSlide(index)}
                        className={`h-1.5 rounded-full transition-all duration-300 cursor-pointer ${
                          isActive
                            ? "w-4 bg-primary"
                            : theme === "dark"
                            ? "w-1.5 bg-white/20 hover:bg-white/40"
                            : "w-1.5 bg-zinc-300 hover:bg-zinc-400"
                        }`}
                      />
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Section: Top Restoranlar & Zallar / Top to'yxonalar */}
            <div className="space-y-4">
              <div className="flex justify-between items-center pr-1">
                <h2
                  className={`text-base font-extrabold tracking-tight flex items-center gap-2 ${
                    theme === "dark" ? "text-white" : "text-zinc-900"
                  }`}
                >
                  <span>{activeTab === "To'yxonalar" ? "Top to'yxonalar" : "Top Restoranlar & Zallar"}</span>
                  {loadingVenues && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
                </h2>
                <Link
                  href="/feed"
                  className={`text-xs font-bold hover:underline transition-colors ${
                    theme === "dark" ? "text-white/40" : "text-[#FF6B00]"
                  }`}
                >
                  Barchasini ko'rish
                </Link>
              </div>

              {/* Venues Content */}
              {(() => {
                const displayedVenues = venues;

                if (loadingVenues) {
                  return (
                    /* Skeleton Loader */
                    <div className="space-y-4 animate-pulse">
                      <div className={`w-full h-72 rounded-3xl border ${theme === "dark" ? "bg-[#393939]/60 border-white/5" : "bg-zinc-100 border-zinc-200"}`} />
                      <div className="grid grid-cols-2 gap-4">
                        <div className={`h-56 rounded-3xl border ${theme === "dark" ? "bg-[#393939]/60 border-white/5" : "bg-zinc-100 border-zinc-200"}`} />
                        <div className={`h-56 rounded-3xl border ${theme === "dark" ? "bg-[#393939]/60 border-white/5" : "bg-zinc-100 border-zinc-200"}`} />
                      </div>
                    </div>
                  );
                }

                if (displayedVenues.length === 0) {
                  return (
                    /* Empty State */
                    <div className={`py-12 px-6 text-center space-y-3 rounded-3xl border border-dashed ${
                      theme === "dark" ? "border-white/10 bg-white/[0.02]" : "border-zinc-200 bg-zinc-50"
                    }`}>
                      <div className="w-12 h-12 rounded-2xl bg-[#FF6B00]/10 flex items-center justify-center text-[#FF6B00] mx-auto">
                        <Search className="h-6 w-6" />
                      </div>
                      <h3 className="text-sm font-bold text-foreground dark:text-white">
                        Mos keluvchi muassasa topilmadi
                      </h3>
                      <p className="text-xs text-zinc-400 max-w-xs mx-auto leading-relaxed">
                        {selectedDistrictId !== null
                          ? "Tanlangan tumanda hali muassasalar mavjud emas. Barcha tumanlar bo'yicha ko'rishni xohlaysizmi?"
                          : searchQuery
                          ? `"${searchQuery}" so'rovi bo'yicha hech qanday natija topilmadi.`
                          : "Ushbu toifada hozircha muassasalar mavjud emas."}
                      </p>
                      {(selectedDistrictId !== null || searchQuery || guestCountFilter) && (
                        <button
                          type="button"
                          onClick={() => {
                            setActiveTab("Umumiy");
                            setSelectedDistrictId(null);
                            setSelectedDistrictName("Toshkent shahri (Barcha tumanlar)");
                            setSearchQuery("");
                            setGuestCountFilter(null);
                          }}
                          className="px-4 py-2.5 rounded-xl bg-[#FF6B00] hover:bg-[#E05000] text-white text-xs font-bold shadow-md shadow-[#FF6B00]/20 transition-all cursor-pointer"
                        >
                          Barcha muassasalarni ko'rish
                        </button>
                      )}
                    </div>
                  );
                }

                return (
                  <div className="space-y-4">
                    {/* Large Featured Card (First Venue) */}
                    {(() => {
                      const isToyxona = activeTab === "To'yxonalar";
                      const topVenue = displayedVenues[0] || {
                        id: 1,
                        name: "Bahor Chilonzor",
                        rating_avg: "4.8",
                        reviews_count: 356,
                        status: "active",
                        distance_m: 1000,
                      };
                      const bannerImg = "/images/home/top.png";
                      const venueTitle = isToyxona ? "The Royal Grand" : topVenue.name;

                      const toyxonaData: ToyxonaVenueData = {
                        id: topVenue.id || 99,
                        name: venueTitle,
                        price: "25,000,000 so'm",
                        capacity: "500 - 1,200 gacha odam",
                        img: bannerImg,
                        rating: "4.8",
                        reviewsCount: "356 ta sharh",
                        distance: "1 km uzoqda",
                        address: "Navoiy, O‘zbekiston ko‘chasi 27 - uy",
                        discount: "10% chegirma",
                        description:
                          "Hasidona Koshona - bu sizning unutilmas tadbirlaringiz uchun mo'ljallangan hashamatli majmua. Modern klassika uslubidagi dizayn, keng va yorug' zal hamda professional xizmat ko'rsatish jamoasi sizning to'y, korporativ tadbir yoki yubileyingizni yuqori saviyada o'tkazishni ta'minlaydi.",
                      };

                      if (isToyxona) {
                        return (
                          <Link
                            key={topVenue.id || 99}
                            href={`/toyxona/${topVenue.id || 99}`}
                            className={`w-full border rounded-[28px] p-4 flex flex-col gap-3.5 shadow-[0_4px_20px_rgba(0,0,0,0.04)] transition-all block text-left group cursor-pointer ${
                              theme === "dark"
                                ? "bg-[#252525] border-white/5 hover:border-white/10"
                                : "bg-white border-zinc-100 hover:border-zinc-200"
                            }`}
                          >
                            {/* Visual Image Display */}
                            <div className="w-full h-52 sm:h-56 rounded-2xl overflow-hidden relative">
                              <img
                                src={bannerImg}
                                alt={venueTitle}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                              />
                              <div className="absolute top-3 left-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#16A34A] text-white text-xs font-bold shadow-md">
                                <span className="w-3.5 h-3.5 rounded border border-white flex items-center justify-center text-[9px] font-black">
                                  %
                                </span>
                                <span>10% chegirma</span>
                              </div>
                            </div>

                            {/* To'yxona Details */}
                            <div className="space-y-2.5">
                              {/* Row 1: Title & Rating */}
                              <div className="flex items-center justify-between gap-2">
                                <h3
                                  className={`text-[18px] font-bold tracking-tight truncate ${
                                    theme === "dark" ? "text-white" : "text-zinc-900"
                                  }`}
                                >
                                  {venueTitle}
                                </h3>

                                <div className="flex items-center gap-1.5 text-sm shrink-0">
                                  <Star className="h-4 w-4 fill-[#F59E0B] text-[#F59E0B]" />
                                  <span className={`font-semibold ${theme === "dark" ? "text-white" : "text-zinc-900"}`}>
                                    4.8
                                  </span>
                                  <span className={theme === "dark" ? "text-zinc-400" : "text-zinc-500"}>
                                    (356 ta sharh)
                                  </span>
                                </div>
                              </div>

                              {/* Row 2: Status & Capacity */}
                              <div className="flex items-center justify-between text-sm">
                                <div className="flex items-center gap-1.5 font-semibold text-[#16A34A] dark:text-[#22C55E]">
                                  <span className="w-2 h-2 rounded-full bg-[#16A34A] dark:bg-[#22C55E]" />
                                  <span>Ochiq</span>
                                </div>
                                <div className="flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400 font-medium">
                                  <Users className="w-3.5 h-3.5 text-[#FF6B00]" />
                                  <span>500 - 1,200 gacha odam</span>
                                </div>
                              </div>

                              {/* Row 3: Distance & Deposit */}
                              <div className="flex items-center gap-2.5 flex-wrap">
                                <div
                                  className={`flex items-center gap-1.5 text-sm font-normal ${
                                    theme === "dark" ? "text-zinc-300" : "text-zinc-600"
                                  }`}
                                >
                                  <Map className="h-4 w-4 text-zinc-500 dark:text-zinc-400 shrink-0" />
                                  <span>1 km uzoqda</span>
                                </div>

                                <span className="text-zinc-300 dark:text-zinc-600 select-none">|</span>

                                <div className="inline-flex items-center gap-1.5 bg-[#22C55E] text-white px-2.5 py-0.5 rounded-full text-xs font-semibold shadow-xs">
                                  <div className="w-3.5 h-3.5 rounded-[4px] border-[1.2px] border-white flex items-center justify-center text-[9px] font-bold leading-none shrink-0">
                                    %
                                  </div>
                                  <span>Depozitlik</span>
                                </div>
                              </div>

                              {/* Row 4: Address */}
                              <div
                                className={`flex items-center gap-1.5 text-sm font-normal truncate ${
                                  theme === "dark" ? "text-zinc-400" : "text-zinc-500"
                                }`}
                              >
                                <MapPin className="h-4 w-4 text-zinc-400 dark:text-zinc-500 shrink-0" />
                                <span className="truncate">Navoiy, O‘zbekiston ko‘chasi 27 - uy</span>
                              </div>

                              {/* Row 5: Price & Band Qilish Action */}
                              <div className="pt-2 border-t border-zinc-100 dark:border-white/5 flex items-center justify-between gap-3">
                                <div>
                                  <span className="text-[11px] text-zinc-400 block font-medium">Zal narxi:</span>
                                  <span className="text-base font-extrabold text-[#FF6B00]">25,000,000 so‘m</span>
                                </div>
                                <div
                                  className="py-2.5 px-5 rounded-full bg-[#FF6B00] hover:bg-[#E05000] text-white font-bold text-xs flex items-center justify-center gap-1.5 active:scale-95 transition-all shadow-md shadow-[#FF6B00]/25"
                                >
                                  <span>Band qilish</span>
                                  <ChevronRight className="w-3.5 h-3.5 stroke-[3]" />
                                </div>
                              </div>
                            </div>
                          </Link>
                        );
                      }

                      return (
                        <Link
                          href={`/venue/${topVenue.id}`}
                          className={`w-full border rounded-[28px] p-4 flex flex-col gap-3.5 shadow-[0_4px_20px_rgba(0,0,0,0.04)] transition-all block text-left group ${
                            theme === "dark"
                              ? "bg-[#252525] border-white/5 hover:border-white/10"
                              : "bg-white border-zinc-100 hover:border-zinc-200"
                          }`}
                        >
                          {/* Visual Image Display */}
                          <div className="w-full h-48 sm:h-52 rounded-2xl overflow-hidden relative">
                            <img
                              src={bannerImg}
                              alt={topVenue.name}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                            />
                          </div>

                          {/* Restaurant details */}
                          <div className="space-y-2">
                            {/* Row 1: Title & Rating */}
                            <div className="flex items-center justify-between gap-2">
                              <h3
                                className={`text-[17px] sm:text-lg font-bold tracking-tight truncate ${
                                  theme === "dark" ? "text-white" : "text-zinc-900"
                                }`}
                              >
                                {topVenue.name}
                              </h3>

                              {/* Star Rating & Review count */}
                              <div className="flex items-center gap-1.5 text-sm shrink-0">
                                <Star className="h-4 w-4 fill-[#F59E0B] text-[#F59E0B]" />
                                <span
                                  className={`font-semibold ${
                                    theme === "dark" ? "text-white" : "text-zinc-900"
                                  }`}
                                >
                                  {topVenue.rating_avg && Number(topVenue.rating_avg) > 0
                                    ? Number(topVenue.rating_avg).toFixed(1)
                                    : "4.8"}
                                </span>
                                <span
                                  className={`${
                                    theme === "dark" ? "text-zinc-400" : "text-zinc-500"
                                  }`}
                                >
                                  ({topVenue.reviews_count && topVenue.reviews_count > 0
                                    ? `${topVenue.reviews_count} ta sharh`
                                    : "356 ta sharh"})
                                </span>
                              </div>
                            </div>

                            {/* Row 2: Status */}
                            <div className="flex items-center gap-1.5 text-sm font-semibold text-[#16A34A] dark:text-[#22C55E]">
                              <span className="w-2 h-2 rounded-full bg-[#16A34A] dark:bg-[#22C55E]" />
                              <span>
                                {topVenue.status === "closed"
                                  ? "Yopiq"
                                  : "Ochiq"}
                              </span>
                            </div>

                            {/* Row 3: Distance & Deposit */}
                            <div className="flex items-center gap-2.5 flex-wrap">
                              <div
                                className={`flex items-center gap-1.5 text-sm font-normal ${
                                  theme === "dark" ? "text-zinc-300" : "text-zinc-600"
                                }`}
                              >
                                <Map className="h-4 w-4 text-zinc-500 dark:text-zinc-400 shrink-0" />
                                <span>
                                  {topVenue.distance_m
                                    ? `${(topVenue.distance_m / 1000).toFixed(0)} km uzoqda`
                                    : "1 km uzoqda"}
                                </span>
                              </div>

                              <span className="text-zinc-300 dark:text-zinc-600 select-none">|</span>

                              <div className="inline-flex items-center gap-1.5 bg-[#22C55E] text-white px-2.5 py-0.5 rounded-full text-xs font-semibold shadow-xs">
                                <div className="w-3.5 h-3.5 rounded-[4px] border-[1.2px] border-white flex items-center justify-center text-[9px] font-bold leading-none shrink-0">
                                  %
                                </div>
                                <span>Depozitlik</span>
                              </div>
                            </div>

                            {/* Row 4: Address */}
                            <div
                              className={`flex items-center gap-1.5 text-sm font-normal truncate ${
                                theme === "dark" ? "text-zinc-400" : "text-zinc-500"
                              }`}
                            >
                              <MapPin className="h-4 w-4 text-zinc-400 dark:text-zinc-500 shrink-0" />
                              <span className="truncate">
                                {(topVenue as any).street
                                  ? `${(topVenue as any).street}${(topVenue as any).house_number ? ' ' + (topVenue as any).house_number + ' - uy' : ''}`
                                  : "O‘zbekiston ko‘chasi 27 - uy"}
                              </span>
                            </div>
                          </div>
                        </Link>
                      );
                    })()}

                    {/* 2x2 Grid for Other Venues */}
                    {displayedVenues.length > 1 && (
                      <div className="grid grid-cols-2 gap-4">
                        {(() => {
                          const isToyxona = activeTab === "To'yxonalar";

                          const FIGMA_CARDS = isToyxona
                            ? [
                                {
                                  name: "Yakkasaroy To'yxonasi",
                                  img: "/images/home/tuyxona1.png",
                                  capacity: "300 - 800 kishi",
                                  price: "20,000,000 so'm",
                                },
                                {
                                  name: "Mumtoz Saroyi",
                                  img: "/images/home/tuyxona2.png",
                                  capacity: "400 - 1000 kishi",
                                  price: "22,000,000 so'm",
                                },
                                {
                                  name: "Osiyo Grand",
                                  img: "/images/home/tuyxona3.png",
                                  capacity: "250 - 600 kishi",
                                  price: "18,000,000 so'm",
                                },
                                {
                                  name: "Versal To'yxonasi",
                                  img: "/images/home/tuyxona4.png",
                                  capacity: "500 - 1200 kishi",
                                  price: "28,000,000 so'm",
                                },
                              ]
                            : [
                                { name: "Sayqal", img: "/images/home/tuyxona1.png" },
                                { name: "Tinchlik", img: "/images/home/tuyxona2.png" },
                                { name: "Panorama", img: "/images/home/tuyxona3.png" },
                                { name: "Sharqona", img: "/images/home/tuyxona4.png" },
                              ];

                          return displayedVenues.slice(1, 5).map((card, idx) => {
                            const figmaItem = FIGMA_CARDS[idx % FIGMA_CARDS.length];
                            const cardTitle = searchQuery ? card.name : (figmaItem?.name || card.name);
                            const cardImg = card.cover_url || figmaItem?.img || FALLBACK_IMAGES[(idx + 1) % FALLBACK_IMAGES.length];

                            const toyxonaCardData: ToyxonaVenueData = {
                              id: card.id,
                              name: cardTitle,
                              price: (figmaItem as any)?.price || "20,000,000 so'm",
                              capacity: (figmaItem as any)?.capacity || "300 - 800 kishi",
                                  img: cardImg,
                                  rating: "4.8",
                                  reviewsCount: "356 ta sharh",
                                  distance: "2 km uzoqda",
                                  address: "Umid qo‘rg‘oni",
                                  discount: "10% chegirma",
                                };

                                if (isToyxona) {
                                  return (
                                    <Link
                                      key={card.id}
                                      href={`/toyxona/${card.id}`}
                                      className={`border rounded-[24px] p-3 flex flex-col gap-2.5 shadow-[0_4px_20px_rgba(0,0,0,0.04)] text-left relative group transition-all cursor-pointer ${
                                        theme === "dark" ? "bg-[#252525] border-white/5 shadow-lg" : "bg-white border-zinc-100"
                                      }`}
                                    >
                                      {/* Image Viewport */}
                                      <div className="w-full aspect-square rounded-[18px] overflow-hidden relative">
                                        <img
                                          src={cardImg}
                                          alt={cardTitle}
                                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                        />
                                      </div>

                                      {/* Info details */}
                                      <div className="space-y-1.5 pr-0.5">
                                        {/* Row 1: Title & Rating */}
                                        <div className="flex items-center justify-between gap-1">
                                          <h4
                                            className={`text-sm sm:text-[15px] font-bold tracking-tight truncate ${
                                              theme === "dark" ? "text-white" : "text-zinc-900"
                                            }`}
                                          >
                                            {cardTitle}
                                          </h4>
                                          <div className="flex items-center gap-1 text-xs sm:text-sm font-bold shrink-0">
                                            <Star className="h-3.5 w-3.5 fill-[#F59E0B] text-[#F59E0B]" />
                                            <span className={theme === "dark" ? "text-white" : "text-zinc-900"}>
                                              4.8
                                            </span>
                                          </div>
                                        </div>

                                        {/* Row 2: Status */}
                                        <div className="flex items-center gap-1.5 text-xs font-semibold text-[#16A34A] dark:text-[#22C55E]">
                                          <span className="w-1.5 h-1.5 rounded-full bg-[#16A34A] dark:bg-[#22C55E]" />
                                          <span>Ochiq</span>
                                        </div>

                                        {/* Row 3: Distance & Deposit */}
                                        <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400 font-medium">
                                          <div className="flex items-center gap-1 truncate">
                                            <Map className="h-3 w-3 shrink-0" />
                                            <span>2 km</span>
                                          </div>
                                          <span className="font-bold text-xs text-zinc-900 dark:text-white shrink-0 ml-1">
                                            {(figmaItem as any)?.price || "20M so‘m"}
                                          </span>
                                        </div>

                                        {/* Row 4: Action Button */}
                                        <div
                                          className="w-full py-2 text-xs font-bold rounded-full flex items-center justify-center gap-1.5 bg-[#FF6B00] hover:bg-[#E05000] text-white active:scale-95 transition-all shadow-sm shadow-[#FF6B00]/20 mt-1"
                                        >
                                          <span>Band qilish</span>
                                          <ArrowRight className="h-3.5 w-3.5 stroke-[2.5] text-white" />
                                        </div>
                                      </div>
                                    </Link>
                                  );
                                }

                                return (
                                  <div
                                    key={card.id}
                                    className={`border rounded-[24px] p-3 flex flex-col gap-2.5 shadow-[0_4px_20px_rgba(0,0,0,0.04)] text-left relative group transition-all ${
                                      theme === "dark" ? "bg-[#252525] border-white/5 shadow-lg" : "bg-white border-zinc-100"
                                    }`}
                                  >
                                    {/* Image Viewport */}
                                    <div className="w-full aspect-square rounded-[18px] overflow-hidden relative">
                                      <img
                                        src={cardImg}
                                        alt={cardTitle}
                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                      />
                                    </div>

                                    {/* Info details */}
                                    <div className="space-y-1.5 pr-0.5">
                                      {/* Row 1: Title & Rating */}
                                      <div className="flex items-center justify-between gap-1">
                                        <h4
                                          className={`text-sm sm:text-[15px] font-bold tracking-tight truncate ${
                                            theme === "dark" ? "text-white" : "text-zinc-900"
                                          }`}
                                        >
                                          {cardTitle}
                                        </h4>
                                        <div className="flex items-center gap-1 text-xs sm:text-sm font-bold shrink-0">
                                          <Star className="h-3.5 w-3.5 fill-[#F59E0B] text-[#F59E0B]" />
                                          <span className={theme === "dark" ? "text-white" : "text-zinc-900"}>
                                            {card.rating_avg && Number(card.rating_avg) > 0
                                              ? Number(card.rating_avg).toFixed(1)
                                              : "4.8"}
                                          </span>
                                        </div>
                                      </div>

                                      {/* Row 2: Status */}
                                      <div className="flex items-center gap-1.5 text-xs font-semibold text-[#16A34A] dark:text-[#22C55E]">
                                        <span className="w-1.5 h-1.5 rounded-full bg-[#16A34A] dark:bg-[#22C55E]" />
                                        <span>{card.status === "closed" ? "Yopiq" : "Ochiq"}</span>
                                      </div>

                                      {/* Row 3: Distance & Deposit */}
                                      <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400 font-medium">
                                        <div className="flex items-center gap-1 truncate">
                                          <Map className="h-3 w-3 shrink-0" />
                                          <span>
                                            {card.distance_m
                                              ? `${(card.distance_m / 1000).toFixed(0)} km`
                                              : "1.2 km"}
                                          </span>
                                        </div>
                                        <div className="inline-flex items-center gap-1 bg-[#22C55E] text-white px-2 py-0.5 rounded-full text-[10px] font-semibold">
                                          <span>%</span>
                                          <span>Depozit</span>
                                        </div>
                                      </div>

                                      {/* Row 4: Action Button */}
                                      <Link
                                        href={`/venue/${card.id}`}
                                        className="w-full py-2 text-xs font-bold rounded-full flex items-center justify-center gap-1.5 bg-[#FF6B00] hover:bg-[#E05000] text-white active:scale-95 transition-all shadow-sm shadow-[#FF6B00]/20 mt-1"
                                      >
                                        <span>Ko'rish</span>
                                        <ArrowRight className="h-3.5 w-3.5 stroke-[2.5] text-white" />
                                      </Link>
                                    </div>
                                  </div>
                                );
                              });
                            })()}
                          </div>
                        )}
                      </div>
                    );
                  })()}
              </div>
          </main>
        </div>
      ) : (
        /* ==================== WELCOME ONBOARDING VIEW ==================== */
        <div className={`flex flex-col flex-1 relative transition-colors duration-300 ${
          theme === "dark" ? "bg-[#1E1E1E]" : "bg-white"
        }`}>
          <div className="absolute top-5 right-5 z-50">
            <button
              type="button"
              onClick={toggleTheme}
              className={`p-2.5 rounded-2xl border backdrop-blur-md transition-all active:scale-95 flex items-center justify-center cursor-pointer shadow-md ${
                theme === "dark"
                  ? "bg-white/10 border-white/20 text-white hover:bg-white/20"
                  : "bg-white border-zinc-200 text-zinc-800 hover:bg-zinc-50 shadow-sm"
              }`}
              aria-label="Toggle theme"
            >
              {theme === "dark" ? (
                <Sun className="h-5 w-5 text-orange-400 animate-scale-up" />
              ) : (
                <Moon className="h-5 w-5 text-zinc-800 animate-scale-up" />
              )}
            </button>
          </div>

          <Navbar />

          <main className="flex-1">
            <section
              className={`relative overflow-hidden py-10 sm:py-12 px-5 transition-colors duration-300 ${
                theme === "dark" ? "text-white" : "text-zinc-900 bg-gradient-to-b from-orange-50/80 via-white to-white"
              }`}
            >
              {theme === "dark" && (
                <>
                  <div
                    className="absolute inset-0 bg-cover bg-center"
                    style={{ backgroundImage: "url('/images/onboarding_bg.jpg')" }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-b from-black/85 via-black/90 to-black backdrop-blur-[2px]" />
                </>
              )}

              {/* Ambient Warm Glow */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-[#FF6B00]/15 rounded-full blur-3xl pointer-events-none" />

              <div className="relative z-10 text-center flex flex-col items-center">
                {/* Modern Pill Badge */}
                <div
                  className={`inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-[11px] font-bold mb-4 backdrop-blur-md shadow-sm border transition-colors ${
                    theme === "dark"
                      ? "bg-white/[0.07] border-white/10 text-white/90"
                      : "bg-orange-500/10 border-orange-500/20 text-[#FF6B00]"
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5 text-[#FF6B00]" />
                  <span>Marosimlar & Restoranlar platformasi</span>
                </div>

                {/* Compact & Punchy Hero Title */}
                <h1 className={`text-[28px] sm:text-[32px] font-black tracking-tight leading-[1.18] max-w-[320px] transition-colors ${
                  theme === "dark" ? "text-white" : "text-zinc-950"
                }`}>
                  Bazmlarni oson{" "}
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#FF6B00] via-[#FF8533] to-[#FFA04D]">
                    rejalashtiring!
                  </span>
                </h1>

                {/* Refined Concise Subtitle */}
                <p className={`mt-3 text-xs sm:text-[13px] max-w-[290px] leading-relaxed font-medium transition-colors ${
                  theme === "dark" ? "text-white/70" : "text-zinc-600"
                }`}>
                  To'yxonalar, shinam restoranlar va katering xizmatlarini birgina ilovada toping va band qiling.
                </p>

                {/* Mini Stats Bar for Credibility & Polish */}
                <div
                  className={`mt-5 py-2.5 px-4 rounded-2xl border backdrop-blur-md flex items-center justify-around w-full max-w-[330px] shadow-sm transition-colors ${
                    theme === "dark"
                      ? "bg-white/[0.05] border-white/10"
                      : "bg-white/80 border-zinc-200/80 shadow-sm"
                  }`}
                >
                  <div className="text-center">
                    <span className={`block text-xs font-black ${theme === "dark" ? "text-white" : "text-zinc-900"}`}>120+</span>
                    <span className={`text-[9px] font-semibold ${theme === "dark" ? "text-zinc-400" : "text-zinc-500"}`}>Zallar</span>
                  </div>
                  <span className={`w-px h-5 ${theme === "dark" ? "bg-white/10" : "bg-zinc-200"}`} />
                  <div className="text-center">
                    <span className="block text-xs font-black text-[#FFB800] flex items-center justify-center gap-0.5">
                      <Star className="w-3 h-3 fill-[#FFB800]" />
                      <span>4.9</span>
                    </span>
                    <span className={`text-[9px] font-semibold ${theme === "dark" ? "text-zinc-400" : "text-zinc-500"}`}>Reyting</span>
                  </div>
                  <span className={`w-px h-5 ${theme === "dark" ? "bg-white/10" : "bg-zinc-200"}`} />
                  <div className="text-center">
                    <span className={`block text-xs font-black ${theme === "dark" ? "text-emerald-400" : "text-emerald-600"}`}>10k+</span>
                    <span className={`text-[9px] font-semibold ${theme === "dark" ? "text-zinc-400" : "text-zinc-500"}`}>Mijozlar</span>
                  </div>
                </div>

                {/* Compact Action Buttons */}
                <div className="mt-5 flex items-center gap-2.5 w-full max-w-[330px]">
                  <Link
                    href="/login"
                    className="flex-1 h-12 rounded-2xl bg-gradient-to-r from-[#FF6B00] to-[#FF8533] text-white font-extrabold text-xs shadow-lg shadow-[#FF6B00]/25 flex items-center justify-center gap-1.5 active:scale-95 transition-all hover:brightness-110 cursor-pointer"
                  >
                    <span>Ro'yxatdan o'tish</span>
                    <ArrowRight className="w-3.5 h-3.5 stroke-[2.5]" />
                  </Link>
                  <Link
                    href="/feed"
                    className={`flex-1 h-12 rounded-2xl border font-extrabold text-xs flex items-center justify-center gap-1.5 active:scale-95 transition-all cursor-pointer ${
                      theme === "dark"
                        ? "bg-white/[0.08] hover:bg-white/[0.12] border-white/10 text-white backdrop-blur-md"
                        : "bg-white hover:bg-zinc-50 border-zinc-200 text-zinc-900 shadow-sm"
                    }`}
                  >
                    <Compass className="w-3.5 h-3.5 text-primary" />
                    <span>Zallarni ko'rish</span>
                  </Link>
                </div>
              </div>
            </section>

            <section className={`py-10 px-4 transition-colors ${
              theme === "dark" ? "bg-[#1C1C1E]/50" : "bg-zinc-50/70"
            }`}>
              <div className="text-center mb-6">
                <h2 className={`text-2xl font-black tracking-tight ${
                  theme === "dark" ? "text-white" : "text-zinc-900"
                }`}>
                  Biz nimalarni taklif qilamiz?
                </h2>
                <p className={`mt-2 text-xs max-w-xs mx-auto leading-relaxed ${
                  theme === "dark" ? "text-zinc-400" : "text-zinc-500"
                }`}>
                  Sizning barcha shodiyonalaringiz va bayramlaringiz uchun mukammal yechimlar.
                </p>
              </div>

              {/* 2x2 Clean Responsive Grid */}
              <div className="grid grid-cols-2 gap-3">
                {welcomeCategories.map((cat, idx) => (
                  <Link
                    key={idx}
                    href="/feed"
                    className={`group relative rounded-[24px] border p-4 transition-all duration-300 active:scale-[0.98] flex flex-col justify-between text-left ${
                      theme === "dark"
                        ? "bg-[#2C2C2E] border-white/10 hover:border-primary/40 shadow-sm"
                        : "bg-white border-zinc-200/90 shadow-[0_4px_16px_rgba(0,0,0,0.04)] hover:shadow-md hover:border-primary/40"
                    }`}
                  >
                    <div>
                      <div className={`flex h-12 w-12 items-center justify-center rounded-2xl text-2xl mb-3 group-hover:scale-110 transition-transform duration-300 border ${
                        theme === "dark"
                          ? "bg-white/5 border-white/5"
                          : "bg-orange-50/70 border-orange-100/60"
                      }`}>
                        {cat.icon}
                      </div>
                      <h3 className={`text-sm font-extrabold group-hover:text-primary transition-colors duration-200 leading-tight mb-1 ${
                        theme === "dark" ? "text-white" : "text-zinc-900"
                      }`}>
                        {cat.title}
                      </h3>
                      <p className={`text-[11px] leading-snug mb-3 ${
                        theme === "dark" ? "text-zinc-400" : "text-zinc-500"
                      }`}>
                        {cat.desc}
                      </p>
                    </div>
                    <div>
                      <span className={`inline-flex items-center rounded-lg px-2.5 py-1 text-[10px] font-black border ${
                        theme === "dark"
                          ? "bg-primary/10 border-primary/20 text-primary"
                          : "bg-orange-50 border-orange-200/60 text-[#FF6B00]"
                      }`}>
                        {cat.count}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          </main>

          <footer className={`border-t py-4 text-center text-xs transition-colors ${
            theme === "dark" ? "border-white/10 text-zinc-500" : "border-zinc-200 text-zinc-400"
          }`}>
            <p>© 2026 BAZMLY. Barcha huquqlar himoyalangan.</p>
          </footer>
        </div>
      )}

      {/* Booking Success Toast */}
      {showBookingSuccessToast && (
        <div className="fixed bottom-24 left-1/2 transform -translate-x-1/2 z-[100] px-5 py-3 rounded-2xl bg-[#FF6B00] text-white text-xs font-black shadow-2xl flex items-center gap-2 border border-white/20 animate-bounce select-none">
          <CheckCircle className="h-4.5 w-4.5 shrink-0" />
          <span>Joyingiz band qilindi</span>
        </div>
      )}

      {/* General Toast */}
      {toastMessage && (
        <div className="fixed top-6 left-1/2 transform -translate-x-1/2 z-[120] px-5 py-3 rounded-2xl bg-zinc-900 text-white text-xs font-bold shadow-2xl border border-white/10 animate-fade-in flex items-center gap-2">
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Partiya Soni & Kun va Vaqt Bottom Sheet Overlay */}
      {showPartySheet && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end max-w-md mx-auto bg-black/60 backdrop-blur-sm transition-all duration-300">
          <div className="absolute inset-0 z-0" onClick={() => setShowPartySheet(false)} />

          <div className="w-full bg-brand-light-card dark:bg-[#393939] border-t border-brand-light-border dark:border-white/5 rounded-t-[36px] px-6 pb-9 pt-4 shadow-2xl relative z-10 flex flex-col gap-6 animate-slide-up select-none">
            <div className="w-10 h-1.5 bg-foreground/10 dark:bg-white/10 rounded-full mx-auto" />

            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-foreground/50 dark:text-zinc-500 uppercase tracking-widest">
                Partiya sozlamalari
              </span>
              <button
                onClick={() => setShowPartySheet(false)}
                className="w-8 h-8 rounded-full bg-foreground/5 dark:bg-white/5 flex items-center justify-center text-foreground/60 dark:text-zinc-400 hover:text-[#FF6B00] dark:hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3.5 text-left">
              <h3 className="font-extrabold text-sm text-foreground dark:text-white">Partiya soni (mehmonlar)</h3>
              <div className="flex justify-between items-center gap-3">
                {[1, 2, 3, 4, 5, 8].map((num) => {
                  const isSelected = partySize === num;
                  return (
                    <button
                      key={num}
                      onClick={() => setPartySize(num)}
                      className={`flex-1 py-3 text-base font-extrabold rounded-2xl transition-all cursor-pointer ${
                        isSelected
                          ? "border border-[#FF6B00] bg-[#FF6B00]/5 text-[#FF6B00] scale-105"
                          : "border border-brand-light-border dark:border-white/5 bg-foreground/5 dark:bg-zinc-900 text-foreground dark:text-white"
                      }`}
                    >
                      {num}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-3.5 text-left">
              <h3 className="font-extrabold text-sm text-foreground dark:text-white">Kun va vaqt</h3>

              <div className="grid grid-cols-2 gap-6 py-4 bg-foreground/5 dark:bg-zinc-900/60 rounded-2xl relative border border-brand-light-border dark:border-white/5 overflow-hidden h-[120px] select-none">
                <div className="absolute top-1/2 -translate-y-1/2 left-4 right-4 h-10 border-y border-brand-light-border/40 dark:border-zinc-800 pointer-events-none z-20" />

                {/* Left Column (Days) */}
                <div
                  ref={dayScrollRef}
                  onMouseDown={handleDayMouseDown}
                  onMouseMove={handleDayMouseMove}
                  onMouseUp={handleDayMouseUpOrLeave}
                  onMouseLeave={handleDayMouseUpOrLeave}
                  onScroll={handleDayScroll}
                  style={{ paddingTop: "40px", paddingBottom: "40px" }}
                  className="h-full overflow-y-auto scrollbar-none flex flex-col snap-y snap-mandatory cursor-grab active:cursor-grabbing text-center z-10"
                >
                  {["Chor", "Pay", "Jum", "Shan", "Yak"].map((day) => {
                    const isActive = selectedDay === day;
                    return (
                      <div
                        key={day}
                        style={{ height: "40px", lineHeight: "40px" }}
                        className={`snap-center shrink-0 flex items-center justify-center text-sm font-black transition-all duration-200 ${
                          isActive ? "text-foreground dark:text-white scale-110" : "text-foreground/40 dark:text-zinc-600"
                        }`}
                      >
                        {day}
                      </div>
                    );
                  })}
                </div>

                {/* Right Column (Times) */}
                <div
                  ref={timeScrollRef}
                  onMouseDown={handleTimeMouseDown}
                  onMouseMove={handleTimeMouseMove}
                  onMouseUp={handleTimeMouseUpOrLeave}
                  onMouseLeave={handleTimeMouseUpOrLeave}
                  onScroll={handleTimeScroll}
                  style={{ paddingTop: "40px", paddingBottom: "40px" }}
                  className="h-full overflow-y-auto scrollbar-none flex flex-col snap-y snap-mandatory cursor-grab active:cursor-grabbing text-center z-10"
                >
                  {["22:30", "23:00", "23:30", "00:00"].map((time) => {
                    const isActive = selectedTime === time;
                    return (
                      <div
                        key={time}
                        style={{ height: "40px", lineHeight: "40px" }}
                        className={`snap-center shrink-0 flex items-center justify-center text-sm font-black transition-all duration-200 ${
                          isActive ? "text-foreground dark:text-white scale-110" : "text-foreground/40 dark:text-zinc-600"
                        }`}
                      >
                        {time}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <button
              onClick={() => {
                setShowPartySheet(false);
                setGuestCountFilter(partySize);
                setToastMessage(`${partySize} kishilik joylar saralanmoqda...`);
              }}
              className="w-full py-4.5 bg-[#FF6B00] hover:bg-[#E05000] text-white font-extrabold text-sm rounded-[24px] shadow-lg shadow-[#FF6B00]/20 hover:scale-[1.01] active:scale-[0.99] transition-all duration-200 cursor-pointer"
            >
              Izlash ({partySize} kishi, {selectedDay} {selectedTime})
            </button>
          </div>
        </div>
      )}

      {/* Location Search Overlay */}
      {showLocationSearch && (
        <div className="fixed inset-0 z-50 bg-brand-light-surface dark:bg-[var(--background)] flex flex-col max-w-md mx-auto shadow-2xl animate-fade-in text-foreground dark:text-white select-none">
          {/* Header Row with Search Input */}
          <div className="flex items-center gap-3 px-6 py-5 border-b border-brand-light-border dark:border-white/5 bg-brand-light-surface dark:bg-[var(--background)] z-30 sticky top-0">
            <button
              onClick={() => {
                setShowLocationSearch(false);
                setLocationSearchInput("");
              }}
              className="p-2.5 rounded-xl bg-brand-light-card dark:bg-[#393939] border border-brand-light-border dark:border-white/5 text-foreground/80 dark:text-white/80 hover:text-white transition-all active:scale-90 cursor-pointer"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>

            <div className="flex-1 flex items-center bg-brand-light-card dark:bg-[#393939] border border-brand-light-border dark:border-white/5 rounded-2xl overflow-hidden focus-within:border-[#FF6B00]/40 transition-all px-4 py-3">
              <Search className="h-4.5 w-4.5 text-foreground/40 dark:text-zinc-500 shrink-0" />
              <input
                type="text"
                value={locationSearchInput}
                onChange={(e) => setLocationSearchInput(e.target.value)}
                placeholder="Viloyat yoki tuman qidirish..."
                className="w-full bg-transparent border-0 p-0 pl-2.5 text-sm font-bold text-foreground dark:text-white focus:ring-0 outline-none placeholder:text-foreground/30 dark:placeholder:text-zinc-600"
              />
              {locationSearchInput && (
                <button
                  type="button"
                  onClick={() => setLocationSearchInput("")}
                  className="text-zinc-400 hover:text-white p-1 cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>

          {/* Action: Manzilni avtomatik aniqlash (GPS) */}
          <button
            onClick={handleAutoLocation}
            disabled={geoDetecting}
            className="w-full px-6 py-4.5 border-b border-brand-light-border dark:border-white/5 flex items-center gap-3.5 hover:bg-foreground/5 dark:hover:bg-white/5 transition-colors cursor-pointer text-left disabled:opacity-50"
          >
            <div className="w-10 h-10 rounded-full bg-[#FF6B00]/10 flex items-center justify-center text-[#FF6B00] shrink-0">
              {geoDetecting ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Compass className="w-5 h-5" />
              )}
            </div>
            <div>
              <span className="text-sm font-black text-foreground dark:text-white block">
                {geoDetecting ? "Joylashuv aniqlanmoqda..." : "Manzilni avtomatik aniqlash"}
              </span>
              <span className="text-[10px] text-zinc-400">GPS koordinata orqali eng yaqin tuman</span>
            </div>
          </button>

          {/* Scrollable List */}
          <div className="flex-1 px-6 py-5 space-y-6 text-left overflow-y-auto">
            {/* Top Quick Option: Barcha tumanlar */}
            {!locationSearchInput.trim() && (
              <button
                type="button"
                onClick={() => handleSelectDistrict(null, "Toshkent shahri (Barcha tumanlar)")}
                className={`w-full py-3.5 px-4 rounded-2xl border flex items-center justify-between transition-all cursor-pointer ${
                  selectedDistrictId === null
                    ? "bg-[#FF6B00]/10 border-[#FF6B00] text-[#FF6B00] font-bold"
                    : "border-brand-light-border dark:border-white/5 bg-brand-light-card/60 dark:bg-[#393939]/40 hover:bg-foreground/5 dark:hover:bg-white/5 text-foreground dark:text-white"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-[#FF6B00]/15 flex items-center justify-center text-[#FF6B00] shrink-0">
                    <Globe className="h-4.5 w-4.5" />
                  </div>
                  <div className="text-left">
                    <span className="text-sm font-bold block">Barcha tumanlar</span>
                    <span className="text-[10px] opacity-60">Barcha restoran va to'yxonalarni ko'rish</span>
                  </div>
                </div>
                {selectedDistrictId === null && <Check className="h-4 w-4 text-[#FF6B00]" />}
              </button>
            )}
            {/* Oxirgi manzillar (if any) */}
            {recentLocations.length > 0 && !locationSearchInput.trim() && (
              <div className="space-y-2.5">
                <h3 className="text-xs font-extrabold text-foreground/40 dark:text-zinc-400 tracking-wider uppercase">
                  Oxirgi manzillar
                </h3>
                <div className="space-y-1">
                  {recentLocations.map((loc) => (
                    <button
                      key={loc.id}
                      onClick={() => handleSelectDistrict(loc.district_id, loc.label)}
                      className="w-full py-3 px-3.5 rounded-xl border border-transparent hover:border-brand-light-border dark:hover:border-white/5 flex items-center gap-3 hover:bg-foreground/5 dark:hover:bg-white/5 transition-colors cursor-pointer text-left"
                    >
                      <MapPin className="h-4 w-4 text-[#FF6B00] shrink-0" />
                      <span className="text-sm font-bold text-foreground/90 dark:text-white/90 truncate">{loc.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Barcha viloyatlar va tumanlar */}
            <div className="space-y-3">
              <h3 className="text-xs font-extrabold text-foreground/40 dark:text-zinc-400 tracking-wider uppercase">
                {locationSearchInput.trim() ? "Qidiruv natijalari" : "Viloyatlar va tumanlar"}
              </h3>

              <div className="space-y-2">
                {geoRegions
                  .filter((r) =>
                    !locationSearchInput.trim() ||
                    r.name.toLowerCase().includes(locationSearchInput.toLowerCase())
                  )
                  .map((region) => {
                    const isExpanded = activeRegionId === region.id;
                    const districts = regionDistrictsMap[region.id] || [];
                    const isLoadingDistricts = loadingDistrictsFor === region.id;

                    return (
                      <div
                        key={region.id}
                        className={`rounded-2xl border transition-all overflow-hidden ${
                          isExpanded
                            ? "border-[#FF6B00]/40 bg-[#FF6B00]/5 dark:bg-white/[0.02]"
                            : "border-brand-light-border dark:border-white/5 bg-brand-light-card/50 dark:bg-[#393939]/30"
                        }`}
                      >
                        {/* Region Header Button */}
                        <button
                          type="button"
                          onClick={() => handleToggleRegion(region.id)}
                          className="w-full px-4 py-3.5 flex items-center justify-between text-left cursor-pointer hover:opacity-90"
                        >
                          <div className="flex items-center gap-2.5">
                            <span className="text-base font-bold text-foreground dark:text-white">
                              {region.name}
                            </span>
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-foreground/5 dark:bg-white/10 text-foreground/60 dark:text-white/60">
                              {region.code}
                            </span>
                          </div>
                          <ChevronDown
                            className={`h-4 w-4 transition-transform duration-200 text-foreground/40 dark:text-zinc-400 ${
                              isExpanded ? "rotate-180 text-[#FF6B00]" : ""
                            }`}
                          />
                        </button>

                        {/* Districts list inside region */}
                        {isExpanded && (
                          <div className="px-3 pb-3 pt-1 border-t border-brand-light-border/60 dark:border-white/5 space-y-1">
                            {isLoadingDistricts ? (
                              <div className="py-4 flex items-center justify-center gap-2 text-xs text-zinc-400">
                                <Loader2 className="h-4 w-4 animate-spin text-[#FF6B00]" />
                                <span>Tumanlar yuklanmoqda...</span>
                              </div>
                            ) : districts.length > 0 ? (
                              districts.map((district) => {
                                const isCurrent = selectedDistrictId === district.id;
                                return (
                                  <button
                                    key={district.id}
                                    type="button"
                                    onClick={() => handleSelectDistrict(district.id, `${region.name}, ${district.name}`)}
                                    className={`w-full py-2.5 px-3 rounded-xl flex items-center justify-between text-xs font-bold transition-all cursor-pointer ${
                                      isCurrent
                                        ? "bg-[#FF6B00] text-white shadow-sm"
                                        : "hover:bg-foreground/5 dark:hover:bg-white/10 text-foreground/80 dark:text-white/80"
                                    }`}
                                  >
                                    <span>{district.name}</span>
                                    {isCurrent && <Check className="h-3.5 w-3.5" />}
                                  </button>
                                );
                              })
                            ) : (
                              <p className="py-2 text-center text-xs text-zinc-400">Tumanlar topilmadi</p>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>
            </div>
          </div>
        </div>
      )}



      {/* ==================== NOTIFICATIONS DRAWER MODAL ==================== */}
      {showNotificationsModal && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center animate-fade-in p-4">
          <div className="absolute inset-0" onClick={() => setShowNotificationsModal(false)} />
          <div
            className={`w-full max-w-md rounded-[32px] p-6 flex flex-col gap-4 z-10 border relative text-left shadow-2xl ${
              theme === "dark" ? "bg-[#2C2C2E] border-white/10" : "bg-white border-zinc-200"
            }`}
          >
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-primary/10 text-primary">
                  <Bell className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-black text-base">Bildirishnomalar</h3>
                  <p className="text-[11px] text-zinc-400 font-bold">Ilova xabarnomalari</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowNotificationsModal(false)}
                className="p-2 rounded-full bg-white/5 hover:bg-white/10 text-zinc-400 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Quick Actions */}
            {notifications.length > 0 && (
              <div className="flex justify-end pt-1">
                <button
                  type="button"
                  onClick={async () => {
                    await engagementService.markAllNotificationsRead().catch(() => {});
                    setUnreadCount(0);
                    setNotifications((prev) => prev.map((n) => ({ ...n, read_at: new Date().toISOString() })));
                    setToastMessage("Barcha bildirishnomalar o'qildi deb belgilandi");
                  }}
                  className="text-xs font-bold text-primary hover:underline cursor-pointer"
                >
                  Barchasini o'qilgan qilish
                </button>
              </div>
            )}

            {/* Notifications List */}
            <div className="max-h-72 overflow-y-auto space-y-2.5 py-1">
              {(notifications.length > 0 ? notifications : [
                {
                  id: 1,
                  type: "booking",
                  title: "Bron muvaffaqiyatli tasdiqlandi 🎉",
                  body: "Bahor restoranidagi 4-stol uchun buyurtmangiz tasdiqlandi. Chiptangiz 'Chiptalar' bo'limida mavjud.",
                  payload: null,
                  read_at: null,
                  sent_at: new Date().toISOString(),
                },
                {
                  id: 2,
                  type: "promo",
                  title: "Yangi 15% chegirmali promokod",
                  body: "Ushbu dam olish kunlari uchun barcha to'yxonalarga 'BAZM15' kodi bilan 15% chegirma!",
                  payload: null,
                  read_at: new Date(Date.now() - 3600000).toISOString(),
                  sent_at: new Date(Date.now() - 3600000).toISOString(),
                },
              ]).map((n) => {
                const isRead = !!n.read_at;
                return (
                  <div
                    key={n.id}
                    className={`p-3.5 rounded-2xl border transition-all text-left ${
                      !isRead
                        ? "bg-primary/5 border-primary/20"
                        : theme === "dark"
                        ? "bg-white/5 border-white/5"
                        : "bg-zinc-50 border-zinc-100"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <h5 className="font-extrabold text-xs text-foreground dark:text-white leading-tight">
                        {n.title}
                      </h5>
                      {!isRead && (
                        <span className="w-2 h-2 rounded-full bg-primary shrink-0 mt-0.5" />
                      )}
                    </div>
                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1 leading-relaxed">
                      {n.body}
                    </p>
                  </div>
                );
              })}
            </div>

            <button
              type="button"
              onClick={() => setShowNotificationsModal(false)}
              className="w-full py-3.5 bg-zinc-100 dark:bg-white/10 hover:bg-zinc-200 text-foreground dark:text-white font-bold text-xs rounded-2xl transition-colors cursor-pointer mt-1"
            >
              Yopish
            </button>
          </div>
        </div>
      )}

      {/* Toyxona Booking Flow Modal */}
      <ToyxonaFlowModal
        isOpen={showToyxonaModal}
        onClose={() => setShowToyxonaModal(false)}
        venue={selectedToyxonaVenue}
        theme={theme}
        initialStep={toyxonaModalStep}
        onSuccess={() => {
          setToastMessage("To'yxona muvaffaqiyatli band qilindi!");
          setShowBookingSuccessToast(true);
        }}
      />
    </div>
  );
}
