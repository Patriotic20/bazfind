"use client";

import React, { use, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronLeft,
  Share2,
  Bookmark,
  BadgePercent,
  Star,
  Users,
  MapPin,
  ArrowRight,
  CheckCircle,
  ImageOff,
  Loader2,
  Wallet,
} from "lucide-react";
import { useTheme } from "@/components/theme-provider";
import { useAuth } from "@/contexts/AuthContext";
import ToyxonaFlowModal from "@/components/toyxona-flow-modal";
import { venueService, engagementService, BazmlyApiError, VenueDetailRead } from "@/lib/api";
import { formatAddress, formatCapacity, formatDiscount, formatMoney, formatRating } from "@/lib/format";

export default function ToyxonaDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { theme } = useTheme();
  const { isAuthenticated } = useAuth();
  const isDark = theme === "dark";

  const [detail, setDetail] = useState<VenueDetailRead | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [activeImage, setActiveImage] = useState("");
  const [isSaved, setIsSaved] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [showBookingModal, setShowBookingModal] = useState(false);

  useEffect(() => {
    venueService
      .getVenueDetail(id)
      .then((venueDetail) => {
        // A restaurant is booked by table, on its own page.
        if (venueDetail.venue.venue_type !== "toyxona") {
          router.replace(`/venue/${id}`);
          return;
        }
        setDetail(venueDetail);
        setActiveImage(venueDetail.photos[0]?.url ?? "");
      })
      .catch((err) => setLoadError(err instanceof BazmlyApiError ? err.message : "Muassasa topilmadi"));
  }, [id, router]);

  useEffect(() => {
    if (!isAuthenticated) return;
    engagementService
      .getFavorites()
      .then((favs) => setIsSaved(favs.some((f) => f.venue.id === Number(id))))
      .catch(() => {});
  }, [id, isAuthenticated]);

  useEffect(() => {
    if (!toastMessage) return;
    const timer = setTimeout(() => setToastMessage(null), 2500);
    return () => clearTimeout(timer);
  }, [toastMessage]);

  const handleShare = () => {
    navigator.clipboard?.writeText(window.location.href);
    setToastMessage("Havola buferga nusxalandi!");
  };

  const handleToggleSave = async () => {
    if (!isAuthenticated) {
      setToastMessage("Saqlash uchun tizimga kiring");
      return;
    }
    try {
      const res = await engagementService.toggleFavorite(Number(id));
      setIsSaved(res.is_favorite);
      setToastMessage(res.is_favorite ? "Sevimlilarga saqlandi ❤️" : "Saqlanganlardan olib tashlandi");
    } catch (err) {
      setToastMessage(err instanceof BazmlyApiError ? err.message : "Saqlab bo'lmadi");
    }
  };

  if (loadError) {
    return (
      <div className="flex flex-col flex-1 min-h-screen items-center justify-center gap-4 px-6 text-center bg-[var(--background)]">
        <p className={`text-sm font-bold ${isDark ? "text-white" : "text-zinc-900"}`}>{loadError}</p>
        <button
          type="button"
          onClick={() => router.push("/")}
          className="px-5 py-2.5 rounded-xl bg-[#FF5A00] text-white text-xs font-bold cursor-pointer"
        >
          Bosh sahifaga qaytish
        </button>
      </div>
    );
  }

  if (!detail) {
    return (
      <div className="flex flex-1 min-h-screen items-center justify-center bg-[var(--background)]">
        <Loader2 className="h-8 w-8 animate-spin text-[#FF5A00]" />
      </div>
    );
  }

  const venue = detail.venue;
  const discount = formatDiscount(venue.discount_percent);
  const rating = formatRating(venue.rating_avg, venue.reviews_count);
  const capacity = formatCapacity(venue.capacity_min, venue.capacity_max);
  const address = formatAddress(venue.street, venue.house_number);
  // "From" the cheapest band: what a hall costs depends on how many come.
  const cheapest = detail.guest_tiers.length
    ? Math.min(...detail.guest_tiers.map((t) => Number(t.base_price)))
    : venue.base_price
      ? Number(venue.base_price)
      : null;
  const price = formatMoney(cheapest, venue.currency);
  const gallery = detail.photos.map((p) => p.url);

  return (
    <div
      className={`w-full min-h-screen flex flex-col relative transition-colors duration-300 select-none pb-12 ${
        isDark ? "bg-[#1E1E1E] text-white" : "bg-white text-zinc-900"
      }`}
    >
      {toastMessage && (
        <div className="fixed top-6 left-1/2 transform -translate-x-1/2 z-[80] px-4 py-2.5 rounded-2xl bg-zinc-900/90 text-white text-xs font-semibold shadow-2xl flex items-center gap-2 border border-white/10 backdrop-blur-md animate-fade-in">
          <CheckCircle className="w-4 h-4 text-[#16A34A] shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      <div className="w-full h-80 sm:h-96 relative overflow-hidden shrink-0 bg-zinc-900">
        {activeImage ? (
          <img src={activeImage} alt={venue.name} className="w-full h-full object-cover transition-all duration-300" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-white/30">
            <ImageOff className="h-10 w-10" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/30 pointer-events-none" />

        <div className="absolute top-5 left-4 right-4 flex items-center justify-between z-10">
          <button
            onClick={() => router.back()}
            className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-md text-white flex items-center justify-center active:scale-95 transition-all cursor-pointer shadow-md"
            aria-label="Orqaga"
          >
            <ChevronLeft className="w-6 h-6 stroke-[2.5]" />
          </button>
          <div className="flex items-center gap-2.5">
            <button
              onClick={handleShare}
              className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-md text-white flex items-center justify-center active:scale-95 transition-all cursor-pointer shadow-md"
              aria-label="Ulashish"
            >
              <Share2 className="w-5 h-5" />
            </button>
            <button
              onClick={handleToggleSave}
              className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-md text-white flex items-center justify-center active:scale-95 transition-all cursor-pointer shadow-md"
              aria-label="Saqlash"
            >
              <Bookmark className={`w-5 h-5 ${isSaved ? "fill-[#FF5A00] text-[#FF5A00]" : "text-white"}`} />
            </button>
          </div>
        </div>

        {gallery.length > 1 && (
          <div className="absolute bottom-3.5 left-0 right-0 z-10 flex justify-center px-4">
            <div className="flex items-center gap-2 overflow-x-auto scrollbar-none py-1 max-w-full">
              {gallery.map((thumb, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setActiveImage(thumb)}
                  className={`w-11 h-11 rounded-xl overflow-hidden shrink-0 border-2 transition-all cursor-pointer shadow-sm ${
                    activeImage === thumb
                      ? "border-[#FF5A00] scale-105 opacity-100 ring-2 ring-[#FF5A00]/40"
                      : "border-white/80 opacity-85 hover:opacity-100"
                  }`}
                >
                  <img src={thumb} alt={`Rasm ${idx + 1}`} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="p-5 space-y-4">
        <div className="flex items-center justify-between">
          {discount ? (
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#EAF8EE] border border-[#A7E9BE] text-[#16A34A] text-xs font-semibold">
              <BadgePercent className="w-3.5 h-3.5" />
              <span>{discount}</span>
            </div>
          ) : (
            <span />
          )}
          <div className="flex items-center gap-1 text-xs font-semibold text-zinc-600 dark:text-zinc-400">
            <Star className="w-4 h-4 fill-[#F59E0B] text-[#F59E0B]" />
            <span>{rating ? `${rating} (${venue.reviews_count} ta sharh)` : "Hali sharh yo'q"}</span>
          </div>
        </div>

        <div className="flex items-center justify-between gap-2">
          <h1 className="text-2xl font-bold tracking-tight">{venue.name}</h1>
          <div
            className={`flex items-center gap-1.5 text-sm font-bold shrink-0 ${
              detail.is_open_now ? "text-[#16A34A] dark:text-[#22C55E]" : "text-zinc-400"
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${detail.is_open_now ? "bg-[#16A34A] dark:bg-[#22C55E]" : "bg-zinc-400"}`} />
            <span>{detail.is_open_now ? "Ochiq" : "Yopiq"}</span>
          </div>
        </div>
        {venue.tagline && <p className="text-xs text-zinc-400 -mt-2">{venue.tagline}</p>}

        <div className="space-y-2.5 pt-1 text-sm font-medium text-zinc-700 dark:text-zinc-300">
          {capacity && (
            <div className="flex items-center gap-2.5">
              <Users className="w-4 h-4 text-zinc-500 shrink-0" />
              <span>{capacity}</span>
            </div>
          )}
          {venue.requires_deposit && (
            <div className="flex items-center gap-2.5">
              <Wallet className="w-4 h-4 text-zinc-500 shrink-0" />
              <span>
                Depozit talab qilinadi
                {venue.deposit_percent ? ` (${+Number(venue.deposit_percent).toFixed(0)}%)` : ""}
              </span>
            </div>
          )}
          {address && (
            <div className="flex items-center gap-2.5">
              <MapPin className="w-4 h-4 text-zinc-500 shrink-0" />
              <span>{address}</span>
            </div>
          )}
        </div>

        <div className="pt-2 pb-1 flex items-center justify-between gap-4">
          <div>
            {price && (
              <>
                <span className="text-xs text-zinc-400 block font-normal">Zal narxi</span>
                <span className="text-2xl font-black tracking-tight">{price} dan</span>
              </>
            )}
          </div>
          <button
            onClick={() => setShowBookingModal(true)}
            className="px-6 py-3.5 rounded-2xl bg-[#FF5A00] hover:bg-[#E05000] text-white font-bold text-sm flex items-center justify-center gap-2 active:scale-95 transition-all shadow-md shadow-[#FF5A00]/25 cursor-pointer shrink-0"
          >
            <span>Band qilish</span>
            <ArrowRight className="w-4 h-4 stroke-[3]" />
          </button>
        </div>

        {venue.description && (
          <div className="space-y-1.5 pt-2">
            <h2 className="text-base font-bold">Tavsif</h2>
            <p className="text-xs sm:text-[13px] text-zinc-500 dark:text-zinc-400 leading-relaxed">{venue.description}</p>
          </div>
        )}

        {detail.amenities.length > 0 && (
          <div className="grid grid-cols-2 gap-3 pt-2">
            {detail.amenities.map((amenity) => (
              <div
                key={amenity.id}
                className={`flex items-center gap-3 p-3 rounded-2xl border ${
                  isDark
                    ? "bg-zinc-800/80 border-white/5 text-zinc-200"
                    : "bg-white border-zinc-100 text-zinc-800 shadow-[0_2px_8px_rgba(0,0,0,0.03)]"
                }`}
              >
                <div className="w-10 h-10 rounded-2xl bg-[#FFF4ED] dark:bg-[#FF5A00]/10 text-[#FF5A00] flex items-center justify-center shrink-0 overflow-hidden">
                  {amenity.icon_url ? (
                    <img src={amenity.icon_url} alt="" className="w-5 h-5 object-contain" />
                  ) : (
                    <CheckCircle className="w-5 h-5" />
                  )}
                </div>
                <span className="text-xs font-semibold leading-tight">{amenity.name}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {showBookingModal && (
        <ToyxonaFlowModal isOpen={showBookingModal} onClose={() => setShowBookingModal(false)} detail={detail} theme={theme} />
      )}
    </div>
  );
}
