"use client";

import React, { use, useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { notFound, useRouter } from "next/navigation";
import { useTheme } from "@/components/theme-provider";
import { useAuth } from "@/contexts/AuthContext";
import {
  ChevronLeft,
  Share2,
  Bookmark,
  Percent,
  ChevronRight,
  Compass,
  MapPin,
  Search,
  Star,
  CheckCircle,
  Wallet,
  Plus,
  Minus,
  X,
  Loader2,
  Phone,
  CalendarDays,
  Users,
  ChevronDown,
  MessageSquare,
  Send,
  ImageOff,
} from "lucide-react";
import {
  venueService,
  engagementService,
  geoService,
  VenueDetailRead,
  MenuItemListItem,
  ReviewListItem,
  ReviewAggregateRead,
  MessageRead,
  VenueWorkingHoursRead,
  bookingService,
  BazmlyApiError,
} from "@/lib/api";
import { formatAddress, formatMoney, formatRating, formatDiscount, nextDateForWeekday } from "@/lib/format";

interface Props {
  params: Promise<{ id: string }>;
}

/** Times offered in the picker: whole hours this weekday's opening hours allow
 * a two-hour table to fit into. Empty when the venue is closed that day. */
function slotsFor(hours: VenueWorkingHoursRead[], weekday: number): string[] {
  const day = hours.find((h) => h.weekday === weekday);
  if (!day || day.is_closed || !day.opens_at || !day.closes_at) return [];
  const open = Number(day.opens_at.slice(0, 2)) + (day.opens_at.slice(3, 5) === "00" ? 0 : 1);
  const close = Number(day.closes_at.slice(0, 2));
  const slots: string[] = [];
  for (let hour = open; hour + 2 <= close; hour++) slots.push(`${String(hour).padStart(2, "0")}:00`);
  return slots;
}

const PICKER_DAYS = ["Dush", "Sesh", "Chor", "Pay", "Jum", "Shan", "Yak"];

export default function VenueDetailPage({ params }: Props) {
  const router = useRouter();
  const { id } = use(params);
  const { theme } = useTheme();
  const { isAuthenticated, user } = useAuth();
  const isDark = theme === "dark";

  // Real backend states
  const [venueDetail, setVenueDetail] = useState<VenueDetailRead | null>(null);
  const [loading, setLoading] = useState(true);
  const [menuItems, setMenuItems] = useState<MenuItemListItem[]>([]);
  const [activeCategory, setActiveCategory] = useState("Barchasi");
  const [activeImage, setActiveImage] = useState<string>("");
  const [isSaved, setIsSaved] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  // Pre-order, keyed by menu item id.
  const [selectedItems, setSelectedItems] = useState<Record<number, number>>({});

  // Interactive party/time picker state
  const [showPartySheet, setShowPartySheet] = useState(false);
  const [partySize, setPartySize] = useState(5);
  // The next seven days, today first, as weekday labels the picker scrolls.
  const [dayOptions] = useState(() => {
    const today = (new Date().getDay() + 6) % 7;
    return Array.from({ length: 7 }, (_, offset) => PICKER_DAYS[(today + offset) % 7]);
  });
  const [selectedDay, setSelectedDay] = useState(dayOptions[0]);
  const [pickedTime, setPickedTime] = useState("");
  const timeOptions = slotsFor(venueDetail?.working_hours ?? [], PICKER_DAYS.indexOf(selectedDay));
  const selectedTime = timeOptions.includes(pickedTime) ? pickedTime : (timeOptions[0] ?? "");

  // Reviews state
  const [showReviews, setShowReviews] = useState(false);
  const [newReviewText, setNewReviewText] = useState("");
  const [newRating, setNewRating] = useState(5);
  const [reviewsList, setReviewsList] = useState<ReviewListItem[]>([]);
  const [aggregate, setAggregate] = useState<ReviewAggregateRead | null>(null);

  // Real-time Chat States
  const [showChatModal, setShowChatModal] = useState(false);
  const [conversationId, setConversationId] = useState<number | null>(null);
  const [chatMessages, setChatMessages] = useState<MessageRead[]>([]);
  const [chatError, setChatError] = useState<string | null>(null);
  const [newMessageText, setNewMessageText] = useState("");
  const [sendingMessage, setSendingMessage] = useState(false);
  const [loadingChat, setLoadingChat] = useState(false);
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
    if (index >= 0 && index < dayOptions.length) {
      setSelectedDay(dayOptions[index]);
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
    if (index >= 0 && index < timeOptions.length) {
      setPickedTime(timeOptions[index]);
    }
  };

  // Center alignment effect on mount
  useEffect(() => {
    if (showPartySheet) {
      setTimeout(() => {
        const dayIdx = dayOptions.indexOf(selectedDay);
        if (dayIdx !== -1 && dayScrollRef.current) {
          dayScrollRef.current.scrollTop = dayIdx * 40;
        }

        const timeIdx = timeOptions.indexOf(selectedTime);
        if (timeIdx !== -1 && timeScrollRef.current) {
          timeScrollRef.current.scrollTop = timeIdx * 40;
        }
      }, 50);
    }
  }, [showPartySheet, selectedDay, selectedTime]);

  // Venue, menu and reviews — everything this screen shows comes from here.
  const loadVenueData = useCallback(async () => {
    setLoading(true);
    try {
      const [detail, menu, revs, agg] = await Promise.all([
        venueService.getVenueDetail(id),
        venueService.getMenu(id).catch(() => []),
        venueService.getReviews(id).catch(() => ({ items: [], total: 0 })),
        venueService.getReviewAggregate(id).catch(() => null),
      ]);

      setVenueDetail(detail);
      setMenuItems(menu || []);
      setReviewsList(revs.items || []);
      setAggregate(agg);
      setActiveImage(detail.photos[0]?.url ?? "");
    } catch (err) {
      console.warn("Venue detail fetch error:", err);
      setVenueDetail(null);
    } finally {
      setLoading(false);
    }

    if (isAuthenticated) {
      engagementService
        .getFavorites()
        .then((favs) => setIsSaved((favs || []).some((f) => f.venue.id === Number(id))))
        .catch(() => {});
    }
  }, [id, isAuthenticated]);

  useEffect(() => {
    loadVenueData();
  }, [loadVenueData]);

  const handleOpenChat = async () => {
    setShowChatModal(true);
    setChatError(null);
    if (!isAuthenticated) {
      setChatMessages([]);
      setChatError("Xabar yozish uchun tizimga kiring");
      return;
    }
    setLoadingChat(true);
    try {
      const conv = await engagementService.createConversation(Number(id));
      setConversationId(conv.id);
      setChatMessages(await engagementService.getMessages(conv.id));
    } catch (err) {
      setChatError(err instanceof BazmlyApiError ? err.message : "Suhbatni ochib bo'lmadi");
    } finally {
      setLoadingChat(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = newMessageText.trim();
    if (!text || !conversationId) return;
    setSendingMessage(true);
    try {
      const sent = await engagementService.sendMessage(conversationId, text);
      setChatMessages((prev) => [...prev, sent]);
      setNewMessageText("");
    } catch (err) {
      setChatError(err instanceof BazmlyApiError ? err.message : "Xabar yuborilmadi");
    } finally {
      setSendingMessage(false);
    }
  };

  const handleAddItem = (itemId: number) => {
    setSelectedItems((prev) => ({ ...prev, [itemId]: (prev[itemId] || 0) + 1 }));
  };

  // A dish sold by portion has no price of its own; it is shown "from" its
  // cheapest portion and pre-ordered at that price.
  const allFoodsList = menuItems.map((m) => {
    const price = m.effective_price ?? m.price_from;
    const label = formatMoney(price, m.currency);
    return {
      id: m.id,
      name: m.name,
      category: m.category_name,
      img: m.photo_url,
      price: label ? (m.effective_price ? label : `${label} dan`) : "Narx ko'rsatilmagan",
      priceVal: price ? Number(price) : 0,
    };
  });
  const categories = ["Barchasi", ...Array.from(new Set(menuItems.map((m) => m.category_name)))];

  const filteredFoods = allFoodsList.filter((f) => {
    const matchCategory = activeCategory === "Barchasi" || f.category === activeCategory;
    const matchSearch = f.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchCategory && matchSearch;
  });

  const cartTotal = Object.entries(selectedItems).reduce((sum, [itemId, qty]) => {
    const item = allFoodsList.find((f) => f.id === Number(itemId));
    return sum + (item ? item.priceVal * qty : 0);
  }, 0);

  // Toggle Save / Bookmark
  const handleSaveToggle = async () => {
    if (!isAuthenticated) {
      setToastMessage("Sevimliga qo'shish uchun tizimga kiring");
      return;
    }
    try {
      const res = await engagementService.toggleFavorite(Number(id));
      setIsSaved(res.is_favorite);
      setToastMessage(res.is_favorite ? "Restoran saqlandi ❤️" : "Saqlanganlardan olib tashlandi");
    } catch (err) {
      setToastMessage(err instanceof BazmlyApiError ? err.message : "Saqlab bo'lmadi");
    }
  };

  const handleShare = () => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(window.location.href);
      setToastMessage("Havola buferga nusxalandi!");
    }
  };

  // A review belongs to a completed visit: the server accepts one per
  // completed booking, so the form looks for the guest's own unreviewed one.
  const handleSendReview = async (e: React.FormEvent) => {
    e.preventDefault();
    const comment = newReviewText.trim();
    if (!comment) return;
    if (!isAuthenticated) {
      setToastMessage("Sharh qoldirish uchun tizimga kiring");
      return;
    }
    try {
      const mine = await bookingService.getMyBookings();
      const visit = mine.find((b) => b.venue_id === Number(id) && b.status === "completed");
      if (!visit) {
        setToastMessage("Sharh faqat shu yerga tashrifingizdan keyin qoldiriladi");
        return;
      }
      await venueService.createReview({ booking_id: visit.id, rating: newRating, comment });
      setNewReviewText("");
      setToastMessage("Sharhingiz qabul qilindi!");
      const [revs, agg] = await Promise.all([
        venueService.getReviews(id),
        venueService.getReviewAggregate(id).catch(() => null),
      ]);
      setReviewsList(revs.items || []);
      setAggregate(agg);
    } catch (err) {
      setToastMessage(err instanceof BazmlyApiError ? err.message : "Sharh yuborilmadi");
    }
  };

  // Toast auto-dismiss helper
  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(""), 3000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  const venue = venueDetail?.venue;
  const venueName = venue?.name ?? "";
  const venueLocation = formatAddress(venue?.street, venue?.house_number);
  const reviewsCount = aggregate?.count ?? venue?.reviews_count ?? 0;
  const venueRating = formatRating(aggregate?.average ?? venue?.rating_avg, reviewsCount);
  const discount = formatDiscount(venue?.discount_percent);
  const isDeposit = venue?.requires_deposit ?? false;
  const gallery = venueDetail?.photos.map((p) => p.url) ?? [];

  if (loading) {
    return (
      <div
        className={`flex flex-col flex-1 min-h-screen relative animate-pulse select-none ${
          isDark ? "bg-[var(--background)] text-white" : "bg-white text-zinc-900"
        }`}
      >
        {/* Cinematic Top Image Skeleton */}
        <div className="relative w-full h-[280px] bg-zinc-200 dark:bg-zinc-800 border-b border-zinc-200 dark:border-white/5 overflow-hidden">
          {/* Header Action Buttons Skeleton */}
          <div className="absolute top-5 left-6 right-6 flex items-center justify-between z-20">
            <div className="w-10 h-10 rounded-full bg-black/25 dark:bg-white/10 backdrop-blur-md" />
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-full bg-black/25 dark:bg-white/10 backdrop-blur-md" />
              <div className="w-10 h-10 rounded-full bg-black/25 dark:bg-white/10 backdrop-blur-md" />
            </div>
          </div>

          {/* Bottom Small Gallery Thumbnails Skeleton */}
          <div className="absolute bottom-4 left-6 right-6 z-20 flex justify-center">
            <div className="bg-white/80 dark:bg-zinc-900/80 rounded-[18px] p-1.5 flex gap-1.5 items-center shadow-lg border border-white/40 dark:border-white/10 backdrop-blur-md max-w-[340px] overflow-hidden">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div
                  key={i}
                  className="w-11 h-11 rounded-[12px] bg-zinc-300 dark:bg-white/10 shrink-0"
                />
              ))}
            </div>
          </div>
        </div>

        {/* Main Details Body Skeleton */}
        <main className="flex-1 px-6 py-6 pb-28 flex flex-col gap-6 max-w-md mx-auto w-full text-left">
          {/* Info Block Skeleton */}
          <div className="space-y-4">
            {/* Badges & Rating Row */}
            <div className="flex items-center justify-between gap-4">
              <div className="w-36 h-6 rounded-lg bg-emerald-500/15" />
              <div className="w-24 h-6 rounded-lg bg-yellow-500/15" />
            </div>

            {/* Title & Status */}
            <div className="flex items-center justify-between gap-2">
              <div className="h-8 w-56 rounded-xl bg-zinc-200 dark:bg-zinc-800" />
              <div className="h-5 w-14 rounded-full bg-emerald-500/15" />
            </div>

            {/* Tagline */}
            <div className="h-4 w-40 rounded-md bg-zinc-200/80 dark:bg-zinc-800/80" />

            {/* Capacity & Deposit */}
            <div className="flex items-center justify-between pt-1">
              <div className="h-4 w-32 rounded-md bg-zinc-200/70 dark:bg-zinc-800/70" />
              <div className="h-5 w-20 rounded-md bg-zinc-200/70 dark:bg-zinc-800/70" />
            </div>

            {/* Address */}
            <div className="h-4 w-60 rounded-md bg-zinc-200/60 dark:bg-zinc-800/60" />

            {/* Contact Action Buttons Skeleton */}
            <div className="flex gap-2.5 pt-1">
              <div className="flex-1 h-12 rounded-2xl bg-zinc-200 dark:bg-zinc-800" />
              <div className="flex-1 h-12 rounded-2xl bg-zinc-200 dark:bg-zinc-800" />
            </div>
          </div>



          {/* Menu Food Section Skeleton */}
          <div className="space-y-3 pt-2">
            <div className="h-5 w-32 rounded-md bg-zinc-200 dark:bg-zinc-800" />
            <div className="flex gap-2 overflow-hidden">
              <div className="h-9 w-20 rounded-full bg-zinc-200 dark:bg-zinc-800 shrink-0" />
              <div className="h-9 w-24 rounded-full bg-zinc-200 dark:bg-zinc-800 shrink-0" />
              <div className="h-9 w-20 rounded-full bg-zinc-200 dark:bg-zinc-800 shrink-0" />
            </div>
            <div className="space-y-2.5 pt-1">
              <div className="h-20 w-full rounded-2xl border border-zinc-200 dark:border-white/5 bg-zinc-100 dark:bg-zinc-800/40" />
              <div className="h-20 w-full rounded-2xl border border-zinc-200 dark:border-white/5 bg-zinc-100 dark:bg-zinc-800/40" />
            </div>
          </div>
        </main>

        {/* Sticky Bottom CTA Skeleton */}
        <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto p-4 z-40 bg-gradient-to-t from-[var(--background)] via-[var(--background)]/90 to-transparent">
          <div className="w-full h-14 bg-primary/40 rounded-[24px]" />
        </div>
      </div>
    );
  }

  if (!venueDetail || !venue) {
    return (
      <div className="flex flex-col flex-1 min-h-screen items-center justify-center gap-4 px-6 text-center bg-[var(--background)]">
        <p className={`text-sm font-bold ${isDark ? "text-white" : "text-zinc-900"}`}>Muassasa topilmadi</p>
        <button
          type="button"
          onClick={() => router.push("/")}
          className="px-5 py-2.5 rounded-xl bg-[#FF6B00] text-white text-xs font-bold cursor-pointer"
        >
          Bosh sahifaga qaytish
        </button>
      </div>
    );
  }

  return (
    <div
      className={`flex flex-col flex-1 bg-[var(--background)] min-h-screen relative ${
        isDark ? "text-white" : "text-zinc-900"
      }`}
    >
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50 px-4 py-2.5 rounded-xl bg-primary text-white text-xs font-bold shadow-xl animate-fade-in flex items-center gap-2 max-w-xs text-center border border-white/20">
          <CheckCircle className="h-4 w-4 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Cinematic Top Image Section */}
      <div className="relative w-full h-[280px] bg-zinc-900 border-b border-white/5 overflow-hidden">
        {activeImage ? (
          <img
            src={activeImage}
            alt={venueName}
            className="w-full h-full object-cover transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-white/30">
            <ImageOff className="h-10 w-10" />
          </div>
        )}

        <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-black/70 pointer-events-none" />

        {/* Floating Header Actions */}
        <div className="absolute top-5 left-6 right-6 flex items-center justify-between z-20">
          <button
            onClick={() => router.back()}
            className="p-2.5 rounded-full bg-black/40 backdrop-blur-md border border-white/10 text-white/90 hover:text-white transition-all active:scale-90 cursor-pointer"
          >
            <ChevronLeft className="h-5 w-5 stroke-[2.5]" />
          </button>

          <div className="flex items-center gap-2.5">
            <button
              onClick={handleShare}
              className="p-2.5 rounded-full bg-black/40 backdrop-blur-md border border-white/10 text-white/90 hover:text-white transition-all active:scale-90 cursor-pointer"
            >
              <Share2 className="h-5 w-5" />
            </button>
            <button
              onClick={handleSaveToggle}
              className="p-2.5 rounded-full bg-black/40 backdrop-blur-md border border-white/10 transition-all active:scale-90 cursor-pointer"
            >
              <Bookmark
                className={`h-5 w-5 ${
                  isSaved ? "fill-primary text-primary" : "text-white/90 hover:text-white"
                }`}
              />
            </button>
          </div>
        </div>

        {/* Bottom Small Image Gallery previews */}
        {gallery.length > 1 && (
        <div className="absolute bottom-4 left-6 right-6 z-20 flex justify-center">
          <div className="bg-white/95 dark:bg-zinc-900/90 rounded-[18px] p-[5px] flex gap-[6px] items-center shadow-[0_8px_30px_rgba(0,0,0,0.16)] border border-white/40 dark:border-white/10 max-w-[340px] overflow-x-auto scrollbar-none backdrop-blur-md">
            {gallery.map((thumb, idx) => {
              const isSel = activeImage === thumb;
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setActiveImage(thumb)}
                  className={`w-11 h-11 rounded-[12px] overflow-hidden shrink-0 transition-all duration-300 cursor-pointer ${
                    isSel ? "border-2 border-[#FF6B00] scale-105" : "border-0 opacity-80 hover:opacity-100"
                  }`}
                >
                  <img
                    src={thumb}
                    alt={`Gallery ${idx + 1}`}
                    className="w-full h-full object-cover"
                  />
                </button>
              );
            })}
          </div>
        </div>
        )}
      </div>

      {/* Main Details Body */}
      <main className="flex-1 px-6 py-6 pb-28 flex flex-col gap-6 max-w-md mx-auto w-full text-left">
        {/* Info detail block */}
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            {discount ? (
              <div className="flex items-center gap-1.5 bg-green-500/10 border border-green-500/20 text-[#10B981] font-bold rounded-lg px-2.5 py-1 text-xs">
                <Percent className="h-3.5 w-3.5" />
                <span>{discount}</span>
              </div>
            ) : (
              <span />
            )}

            {/* Rating row link */}
            <button
              type="button"
              onClick={() => setShowReviews(true)}
              className={`flex items-center gap-1 text-xs font-bold transition-colors cursor-pointer active:scale-95 ${
                isDark ? "text-white/70 hover:text-white" : "text-zinc-650 hover:text-zinc-950"
              }`}
            >
              <Star className="h-3.5 w-3.5 fill-[#FFB800] text-[#FFB800]" />
              <span>{venueRating ? `${venueRating} (${reviewsCount} ta sharh)` : "Hali sharh yo'q"}</span>
              <ChevronRight className="h-4 w-4 text-[#FFB800]" />
            </button>
          </div>

          {/* Restaurant Title & Status */}
          <div className="flex items-start justify-between">
            <div>
              <h2 className={`text-2xl font-black tracking-tight ${isDark ? "text-white" : "text-black"}`}>
                {venueName}
              </h2>
              {venueDetail?.venue.tagline && (
                <p className="text-xs text-zinc-400 mt-0.5">{venueDetail.venue.tagline}</p>
              )}
            </div>
            <div
              className={`flex items-center gap-1.5 text-xs font-bold pt-2 ${
                venueDetail.is_open_now ? "text-[#10B981]" : "text-zinc-400"
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${venueDetail.is_open_now ? "bg-[#10B981]" : "bg-zinc-400"}`} />
              <span>{venueDetail.is_open_now ? "Ochiq" : "Yopiq"}</span>
            </div>
          </div>

          {/* Metadata Row: Capacity & Deposit */}
          <div className="flex justify-between items-center text-xs">
            <div
              className={`flex items-center gap-1.5 font-semibold ${
                isDark ? "text-white/70" : "text-zinc-600"
              }`}
            >
              <Users className="h-4 w-4 text-[#FF6B00]" />
              <span>{venue.total_seats ? `Sig'imi: ${venue.total_seats} ta o'rin` : "Sig'imi ko'rsatilmagan"}</span>
            </div>

            {/* Deposit Badges */}
            {isDeposit ? (
              <div className="flex items-center gap-1 bg-green-500/10 border border-green-500/20 text-[#10B981] font-bold rounded-lg px-2.5 py-1 text-[10px] uppercase tracking-wider">
                <Wallet className="h-3.5 w-3.5 shrink-0" />
                <span>Depozitlik</span>
              </div>
            ) : (
              <span className="text-[11px] font-bold text-zinc-400">Depozitsiz</span>
            )}
          </div>

          {/* Address */}
          <div
            className={`flex items-center gap-2 text-xs font-semibold leading-relaxed ${
              isDark ? "text-white/50" : "text-zinc-600"
            }`}
          >
            <MapPin className={`h-4 w-4 shrink-0 ${isDark ? "text-white/30" : "text-zinc-400"}`} />
            <span>{venueLocation ?? "Manzil ko'rsatilmagan"}</span>
          </div>

          {/* Quick Contact & Chat Buttons */}
          <div className="flex gap-2.5 pt-1">
            {venueDetail?.venue.phone && (
              <a
                href={`tel:${venueDetail.venue.phone}`}
                className={`flex-1 py-3 px-4 rounded-2xl border text-xs font-bold flex items-center justify-center gap-2 transition-all active:scale-98 ${
                  isDark
                    ? "bg-[#393939] border-white/10 text-white hover:bg-white/10"
                    : "bg-zinc-100 border-zinc-200 text-zinc-800 hover:bg-zinc-200"
                }`}
              >
                <Phone className="h-4 w-4 text-emerald-500" />
                <span>Qo'ng'iroq</span>
              </a>
            )}
            <button
              type="button"
              onClick={handleOpenChat}
              className="flex-1 py-3 px-4 rounded-2xl bg-primary/10 border border-primary/20 text-primary hover:bg-primary/20 text-xs font-bold flex items-center justify-center gap-2 transition-all active:scale-98 cursor-pointer shadow-sm"
            >
              <MessageSquare className="h-4 w-4" />
              <span>Xabar yozish</span>
            </button>
          </div>
        </div>



        {/* Menyu Section */}
        <div className="space-y-4 pt-2 text-left">
          <div className={`border-b ${isDark ? "border-white/5" : "border-zinc-100"}`}>
            <div className="inline-block border-b-2 border-primary pb-2 pr-4 text-sm font-bold text-primary tracking-wide">
              Menyu
            </div>
          </div>

          <div className="flex justify-between items-center text-xs font-bold">
            <span className={isDark ? "text-white/90" : "text-zinc-850"}>
              {`Taomlar (${filteredFoods.length} mahsulot)`}
            </span>
          </div>

          {/* Search bar inside section */}
          <div
            className={`flex items-center border rounded-2xl overflow-hidden transition-all duration-300 ${
              isDark
                ? "bg-[#393939] border-white/5 focus-within:border-[#FF6B00]/50"
                : "bg-zinc-100 border-transparent focus-within:bg-zinc-200/50"
            }`}
          >
            <span className={isDark ? "text-white/40 pl-4" : "text-zinc-400 pl-4"}>
              <Search className="h-5 w-5" />
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Taom qidirish..."
              className={`w-full pl-3 pr-4 py-3.5 bg-transparent text-sm font-semibold outline-none ${
                isDark ? "text-white placeholder:text-white/30" : "text-zinc-950 placeholder:text-zinc-400"
              }`}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="pr-4 text-zinc-400 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Categories Horizontal Pills */}
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-none pb-1">
            {categories.map((cat) => {
              const isActive = activeCategory === cat;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setActiveCategory(cat)}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all shrink-0 cursor-pointer border ${
                    isActive
                      ? "bg-[#FF6B00] border-[#FF6B00] text-white shadow-sm"
                      : isDark
                      ? "bg-[#393939] border-white/5 text-white/60 hover:text-white"
                      : "bg-white border-zinc-200 text-zinc-700 hover:text-zinc-950"
                  }`}
                >
                  {cat}
                </button>
              );
            })}
          </div>

          {/* Food Grid Display */}
          <div className="grid grid-cols-2 gap-4 pt-1">
            {filteredFoods.length === 0 && (
              <p className="col-span-2 py-8 text-center text-xs text-zinc-400">
                {menuItems.length === 0 ? "Bu muassasa hali menyu qo'shmagan" : "Hech narsa topilmadi"}
              </p>
            )}
            {filteredFoods.map((food) => {
              const qty = selectedItems[food.id] || 0;
              return (
                <div
                  key={food.id}
                  className={`border rounded-3xl p-3 flex flex-col gap-3 relative text-left animate-fade-in ${
                    isDark
                      ? "bg-[#393939] border-white/5 shadow-lg"
                      : "bg-white border-zinc-200 shadow-sm"
                  }`}
                >
                  <div
                    className={`w-full aspect-[1.15/1] rounded-2xl overflow-hidden relative border ${
                      isDark ? "border-white/5 bg-zinc-800" : "border-zinc-100 bg-zinc-50"
                    }`}
                  >
                    {food.img ? (
                      <img src={food.img} alt={food.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-zinc-300">
                        <ImageOff className="h-6 w-6" />
                      </div>
                    )}

                    {qty > 0 ? (
                      <div className="absolute bottom-2 right-2 bg-white border border-zinc-200 text-black rounded-full px-2 py-1 flex items-center gap-2 shadow-md z-10 animate-scale-up">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedItems((prev) => {
                              const next = { ...prev };
                              if (next[food.id] > 1) next[food.id]--;
                              else delete next[food.id];
                              return next;
                            });
                          }}
                          className="w-5 h-5 flex items-center justify-center font-black text-xs text-zinc-500 hover:text-black cursor-pointer active:scale-80 transition-all"
                        >
                          <Minus className="h-3 w-3 stroke-[3]" />
                        </button>
                        <span className="text-xs font-bold text-zinc-955 select-none min-w-[8px] text-center">
                          {qty}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleAddItem(food.id)}
                          className="w-5 h-5 flex items-center justify-center font-black text-xs text-zinc-500 hover:text-black cursor-pointer active:scale-80 transition-all"
                        >
                          <Plus className="h-3 w-3 stroke-[3]" />
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleAddItem(food.id)}
                        className={`absolute bottom-2 right-2 w-8 h-8 rounded-full shadow-md flex items-center justify-center font-bold hover:scale-105 active:scale-95 transition-all z-10 ${
                          isDark
                            ? "bg-[#FF6B00] text-white"
                            : "bg-white border border-zinc-200 text-zinc-950 cursor-pointer"
                        }`}
                      >
                        <Plus className="h-4 w-4 stroke-[3]" />
                      </button>
                    )}
                  </div>

                  <div className="space-y-1 pr-0.5">
                    <p className={`text-sm font-black tracking-wide ${isDark ? "text-white" : "text-zinc-955"}`}>
                      {food.price}
                    </p>
                    <p className={`text-xs font-semibold truncate ${isDark ? "text-white/50" : "text-zinc-500"}`}>
                      {food.name}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </main>

      {/* Sticky Bottom Action Panel */}
      <div
        className={`fixed bottom-0 left-0 right-0 max-w-md mx-auto border-t px-6 py-4 z-40 ${
          isDark ? "bg-black/90 border-white/5" : "bg-white border-zinc-200 shadow-[0_-4px_12px_rgba(0,0,0,0.06)]"
        }`}
      >
        <button
          onClick={() => setShowPartySheet(true)}
          className="w-full py-4 rounded-[24px] bg-[#FF5A00] hover:bg-[#E05000] text-white font-extrabold text-sm tracking-wide flex items-center justify-center gap-2 transition-all active:scale-98 shadow-lg shadow-[#FF6B00]/25 cursor-pointer"
        >
          <span>{cartTotal > 0 ? `${formatMoney(cartTotal)} • Bron qilish` : "Bron qilish"}</span>
        </button>
      </div>

      {/* Reviews Screen Overlay */}
      {showReviews && (
        <div
          className={`fixed inset-0 z-50 flex flex-col max-w-md mx-auto shadow-2xl animate-fade-in overflow-hidden ${
            isDark ? "bg-[#333333] text-white" : "bg-white text-zinc-900"
          }`}
        >
          <div
            className={`relative py-6 px-6 flex items-center justify-between z-20 border-b ${
              isDark ? "border-white/5 bg-[#333333]" : "border-zinc-100 bg-white"
            }`}
          >
            <button
              onClick={() => setShowReviews(false)}
              className={`w-9 h-9 rounded-full transition-all flex items-center justify-center cursor-pointer active:scale-90 ${
                isDark ? "bg-white/10 text-white hover:bg-white/20" : "bg-zinc-100 text-zinc-800 hover:bg-zinc-200"
              }`}
            >
              <ChevronLeft className="w-5 h-5 stroke-[2.5]" />
            </button>
            <div
              className={`absolute left-1/2 -translate-x-1/2 font-bold text-base tracking-wide ${
                isDark ? "text-white" : "text-zinc-950"
              }`}
            >
              Sharhlar ({reviewsList.length})
            </div>
            <div className="w-9" />
          </div>

          <div className="flex-1 overflow-y-auto px-6 py-6 pb-20 flex flex-col gap-4">
            {/* Aggregate Score Header */}
            <div
              className={`p-4 rounded-2xl border flex items-center justify-between text-left ${
                isDark ? "bg-[#393939] border-white/5" : "bg-zinc-50 border-zinc-200"
              }`}
            >
              <div>
                <span className="text-3xl font-black text-[#FFB800]">{venueRating ?? "—"}</span>
                <span className="text-xs text-zinc-400 block mt-0.5">5.0 ballik shkalada</span>
              </div>
              <div className="text-right">
                <div className="flex items-center gap-0.5 text-[#FFB800] justify-end">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      className={`h-4 w-4 text-[#FFB800] ${i < Math.round(Number(venueRating ?? 0)) ? "fill-[#FFB800]" : ""}`}
                    />
                  ))}
                </div>
                <span className="text-xs font-bold text-zinc-400 block mt-0.5">
                  {reviewsCount} ta umumiy baho
                </span>
              </div>
            </div>

            {reviewsList.length === 0 ? (
              <div className="py-12 text-center text-zinc-400 text-xs">
                Hozircha sharhlar mavjud emas. Birinchi bo'lib sharh qoldiring!
              </div>
            ) : (
              reviewsList.map((rev, idx) => (
                <div
                  key={rev.id || idx}
                  className={`border rounded-[22px] p-5 relative text-left animate-slide-up ${
                    isDark ? "bg-[#393939] border-white/5 shadow-lg" : "bg-white border-zinc-200 shadow-sm"
                  }`}
                >
                  <div className="flex items-center justify-between mb-3.5">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-9 h-9 rounded-full overflow-hidden shrink-0 border ${
                          isDark ? "border-white/10 bg-zinc-800" : "border-zinc-200 bg-zinc-50"
                        }`}
                      >
                        {rev.author.avatar_url ? (
                          <img src={rev.author.avatar_url} className="w-full h-full object-cover" alt={rev.author.first_name} />
                        ) : (
                          <span className="w-full h-full flex items-center justify-center text-xs font-bold text-zinc-400">
                            {rev.author.first_name.charAt(0)}
                          </span>
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className={`text-sm font-bold tracking-wide ${isDark ? "text-white" : "text-zinc-950"}`}>
                            {rev.author.first_name} {rev.author.last_name || ""}
                          </span>
                          {rev.is_verified && (
                            <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-[4px] font-semibold tracking-wide ml-1">
                              Tasdiqlangan
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-0.5 text-[#FFB800]">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <span key={i} className="text-xs">
                          {i < rev.rating ? "★" : "☆"}
                        </span>
                      ))}
                    </div>
                  </div>
                  <p className={`text-xs font-medium leading-relaxed ${isDark ? "text-white/80" : "text-zinc-850"}`}>
                    {rev.comment}
                  </p>
                </div>
              ))
            )}
          </div>

          <div
            className={`absolute bottom-0 left-0 right-0 px-6 py-4 border-t pb-6 z-10 ${
              isDark ? "bg-[#333333] border-white/5" : "bg-white border-zinc-150"
            }`}
          >
            <form
              onSubmit={handleSendReview}
              className={`flex items-center rounded-full px-4 py-3 gap-3 border transition-all ${
                isDark
                  ? "bg-[#393939] border-white/5 focus-within:border-[#FF6B00]/40"
                  : "bg-zinc-100 border-transparent focus-within:bg-zinc-200/50"
              }`}
            >
              <div className="flex items-center shrink-0">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setNewRating(n)}
                    aria-label={`${n} baho`}
                    className="p-0.5 cursor-pointer"
                  >
                    <Star className={`h-4 w-4 text-[#FFB800] ${n <= newRating ? "fill-[#FFB800]" : ""}`} />
                  </button>
                ))}
              </div>
              <input
                type="text"
                value={newReviewText}
                onChange={(e) => setNewReviewText(e.target.value)}
                placeholder="Sharh qoldirish..."
                className={`flex-1 bg-transparent text-sm outline-none ${
                  isDark ? "text-white placeholder:text-zinc-500" : "text-zinc-950 placeholder:text-zinc-450"
                }`}
              />
              <button
                type="submit"
                disabled={!newReviewText.trim()}
                className="p-1.5 rounded-full bg-transparent text-[#FF6B00] hover:scale-105 active:scale-95 disabled:opacity-40 disabled:scale-100 transition-all shrink-0 flex items-center justify-center cursor-pointer"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Partiya Soni & Kun va Vaqt Bottom Sheet Overlay */}
      {showPartySheet && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end max-w-md mx-auto bg-black/60 backdrop-blur-sm transition-all duration-300">
          <div className="absolute inset-0 z-0" onClick={() => setShowPartySheet(false)} />

          <div
            className={`w-full border-t rounded-t-[36px] px-6 pb-9 pt-4 shadow-2xl relative z-10 flex flex-col gap-6 animate-slide-up select-none ${
              isDark ? "bg-[#393939] border-white/5" : "bg-white border-zinc-150"
            }`}
          >
            <div className={`w-10 h-1.5 rounded-full mx-auto ${isDark ? "bg-white/10" : "bg-zinc-200"}`} />

            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                Bronlash sozlamalari
              </span>
              <button
                onClick={() => setShowPartySheet(false)}
                className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                  isDark ? "bg-white/5 text-zinc-400 hover:text-white" : "bg-zinc-100 text-zinc-500 hover:text-zinc-800"
                }`}
              >
                <X className="h-4 w-4" />
              </button>
            </div>



            <div className="space-y-3.5 text-left">
              <h3 className={`font-extrabold text-sm ${isDark ? "text-white" : "text-zinc-950"}`}>
                Mehmonlar soni
              </h3>
              <div className="flex justify-between items-center gap-2.5">
                {[1, 2, 4, 6, 8, 10].map((num) => {
                  const isSelected = partySize === num;
                  return (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setPartySize(num)}
                      className={`flex-1 py-3 text-sm font-extrabold rounded-2xl transition-all cursor-pointer ${
                        isSelected
                          ? "border border-[#FF5A00] bg-[#FF5A00]/10 text-[#FF5A00] scale-105"
                          : isDark
                          ? "border border-white/5 bg-zinc-900 text-white hover:bg-zinc-800"
                          : "border border-zinc-200 bg-white text-zinc-900 hover:bg-zinc-50"
                      }`}
                    >
                      {num}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-3.5 text-left">
              <h3 className={`font-extrabold text-sm ${isDark ? "text-white" : "text-zinc-950"}`}>
                Kun va vaqt
              </h3>

              <div
                className={`grid grid-cols-2 gap-6 py-4 rounded-2xl relative border overflow-hidden h-[120px] select-none ${
                  isDark ? "bg-zinc-900/60 border-white/5" : "bg-zinc-50 border-zinc-200"
                }`}
              >
                <div
                  className={`absolute top-1/2 -translate-y-1/2 left-4 right-4 h-10 border-y pointer-events-none z-20 ${
                    isDark ? "border-zinc-800" : "border-zinc-250"
                  }`}
                />

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
                  {dayOptions.map((day) => {
                    const isActive = selectedDay === day;
                    return (
                      <div
                        key={day}
                        style={{ height: "40px", lineHeight: "40px" }}
                        className={`snap-center shrink-0 flex items-center justify-center text-sm font-black transition-all duration-200 ${
                          isActive
                            ? isDark
                              ? "text-white scale-110"
                              : "text-black scale-110"
                            : "text-zinc-400"
                        }`}
                      >
                        {day}
                      </div>
                    );
                  })}
                </div>

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
                  {timeOptions.length === 0 && (
                    <div style={{ height: "40px", lineHeight: "40px" }} className="text-xs font-bold text-zinc-400">
                      Dam olish kuni
                    </div>
                  )}
                  {timeOptions.map((time) => {
                    const isActive = selectedTime === time;
                    return (
                      <div
                        key={time}
                        style={{ height: "40px", lineHeight: "40px" }}
                        className={`snap-center shrink-0 flex items-center justify-center text-sm font-black transition-all duration-200 ${
                          isActive
                            ? isDark
                              ? "text-white scale-110"
                              : "text-black scale-110"
                            : "text-zinc-400"
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
                const itemsQuery = encodeURIComponent(JSON.stringify(selectedItems));
                router.push(
                  `/booking/${id}?guests=${partySize}&date=${nextDateForWeekday(selectedDay)}&time=${selectedTime}&items=${itemsQuery}`
                );
              }}
              className="w-full py-4.5 bg-[#FF5A00] hover:bg-[#E05000] text-white font-extrabold text-sm rounded-[24px] shadow-lg shadow-[#FF5A00]/20 hover:scale-[1.01] active:scale-[0.99] transition-all duration-200 cursor-pointer"
            >
              Stol tanlash va davom etish
            </button>
          </div>
        </div>
      )}

      {/* ==================== DIRECT VENUE CHAT MODAL ==================== */}
      {showChatModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center animate-fade-in p-4">
          <div className="absolute inset-0" onClick={() => setShowChatModal(false)} />
          <div
            className={`w-full max-w-md h-[550px] rounded-[32px] flex flex-col z-10 border relative text-left shadow-2xl overflow-hidden ${
              isDark ? "bg-[#2C2C2E] border-white/10" : "bg-white border-zinc-200"
            }`}
          >
            {/* Chat Top Header */}
            <div className="px-5 py-4 border-b border-zinc-100 dark:border-white/5 flex items-center justify-between bg-zinc-50/50 dark:bg-white/[0.02]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full border border-primary/30 overflow-hidden bg-zinc-100">
                  {gallery[0] && <img src={gallery[0]} alt={venueName} className="w-full h-full object-cover" />}
                </div>
                <div>
                  <h4 className="font-extrabold text-sm leading-tight text-foreground dark:text-white">
                    {venueName}
                  </h4>
                  <div className="text-[10px] text-zinc-400 font-bold">Ma&apos;muriyat bilan yozishma</div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowChatModal(false)}
                className="p-2 rounded-full bg-white/5 hover:bg-white/10 text-zinc-400 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Chat Messages Body */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {loadingChat ? (
                <div className="flex flex-col items-center justify-center h-full gap-2 text-zinc-400 text-xs">
                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                  <span>Xabarlar yuklanmoqda...</span>
                </div>
              ) : chatError ? (
                <div className="text-center py-10 text-xs text-red-500 font-semibold">{chatError}</div>
              ) : chatMessages.length === 0 ? (
                <div className="text-center py-10 text-xs text-zinc-400">
                  Muloqotni boshlash uchun savolingizni yozing.
                </div>
              ) : (
                chatMessages.map((msg) => {
                  const isMine = msg.sender_user_id === user?.id;
                  return (
                    <div
                      key={msg.id}
                      className={`flex ${isMine ? "justify-end" : "justify-start"} animate-scale-up`}
                    >
                      <div
                        className={`max-w-[75%] p-3.5 rounded-2xl text-xs font-medium leading-relaxed ${
                          isMine
                            ? "bg-primary text-white rounded-br-none shadow-md shadow-primary/20"
                            : isDark
                            ? "bg-[#393939] text-white/90 rounded-bl-none border border-white/5"
                            : "bg-zinc-100 text-zinc-800 rounded-bl-none"
                        }`}
                      >
                        <p>{msg.body}</p>
                        <span
                          className={`text-[9px] block text-right mt-1 opacity-60 ${
                            isMine ? "text-white" : "text-zinc-400"
                          }`}
                        >
                          {new Date(msg.created_at).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Chat Input Bar */}
            <form
              onSubmit={handleSendMessage}
              className="p-3 border-t border-zinc-100 dark:border-white/5 bg-zinc-50/50 dark:bg-white/[0.02] flex items-center gap-2"
            >
              <input
                type="text"
                value={newMessageText}
                onChange={(e) => setNewMessageText(e.target.value)}
                placeholder="Savolingizni yozing..."
                className={`flex-1 px-4 py-3 rounded-2xl border text-xs font-medium outline-none ${
                  isDark ? "border-white/10 bg-[#1E1E1E] text-white" : "border-zinc-200 bg-white text-zinc-900"
                }`}
              />
              <button
                type="submit"
                disabled={!newMessageText.trim() || !conversationId || sendingMessage}
                className="w-11 h-11 rounded-2xl bg-primary hover:bg-[#E05000] text-white flex items-center justify-center transition-all disabled:opacity-40 disabled:scale-100 active:scale-95 cursor-pointer shadow-md shadow-primary/20"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
