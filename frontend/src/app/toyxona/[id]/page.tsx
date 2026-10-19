"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronLeft,
  Share2,
  Bookmark,
  BadgePercent,
  Star,
  Users,
  Map,
  MapPin,
  ArrowRight,
  Snowflake,
  Utensils,
  Wifi,
  CheckCircle,
} from "lucide-react";
import { useTheme } from "@/components/theme-provider";
import ToyxonaFlowModal from "@/components/toyxona-flow-modal";

const DEFAULT_GALLERY = [
  "/images/home/rest1.png",
  "/images/home/rest2.png",
  "/images/home/rest3.png",
  "/images/home/rest4.png",
  "/images/home/rest5.png",
  "/images/home/rest6.png",
];

export default function ToyxonaDetailPage() {
  const router = useRouter();
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const [activeImage, setActiveImage] = useState<string>("/images/home/top.png");
  const [isSaved, setIsSaved] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [showBookingModal, setShowBookingModal] = useState(false);

  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(null), 2500);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  const handleShare = () => {
    if (typeof window !== "undefined") {
      navigator.clipboard?.writeText(window.location.href);
      setToastMessage("Havola buferga nusxalandi!");
    }
  };

  const handleToggleSave = () => {
    setIsSaved((prev) => !prev);
    setToastMessage(!isSaved ? "Sevimlilarga saqlandi ❤️" : "Saqlanganlardan olib tashlandi");
  };

  return (
    <div
      className={`w-full min-h-screen flex flex-col relative transition-colors duration-300 select-none pb-12 ${
        isDark ? "bg-[#1E1E1E] text-white" : "bg-white text-zinc-900"
      }`}
    >
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-6 left-1/2 transform -translate-x-1/2 z-[80] px-4 py-2.5 rounded-2xl bg-zinc-900/90 text-white text-xs font-semibold shadow-2xl flex items-center gap-2 border border-white/10 backdrop-blur-md animate-fade-in">
          <CheckCircle className="w-4 h-4 text-[#16A34A] shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Image Viewport (Full-bleed edge-to-edge) */}
      <div className="w-full h-80 sm:h-96 relative overflow-hidden shrink-0">
        <img
          src={activeImage}
          alt="The Royal Grand"
          className="w-full h-full object-cover transition-all duration-300"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/30 pointer-events-none" />

        {/* Top Navigation Buttons */}
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
              <Bookmark
                className={`w-5 h-5 ${isSaved ? "fill-[#FF5A00] text-[#FF5A00]" : "text-white"}`}
              />
            </button>
          </div>
        </div>

        {/* Bottom Gallery Thumbnails */}
        <div className="absolute bottom-3.5 left-0 right-0 z-10 flex justify-center px-4">
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-none py-1 max-w-full">
            {DEFAULT_GALLERY.map((thumb, idx) => {
              const isSel = activeImage === thumb;
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setActiveImage(thumb)}
                  className={`w-11 h-11 rounded-xl overflow-hidden shrink-0 border-2 transition-all cursor-pointer shadow-sm ${
                    isSel
                      ? "border-[#FF5A00] scale-105 opacity-100 ring-2 ring-[#FF5A00]/40"
                      : "border-white/80 opacity-85 hover:opacity-100"
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
      </div>

      {/* Venue Information Body */}
      <div className="p-5 space-y-4">
        {/* Row 1: Badges & Rating */}
        <div className="flex items-center justify-between">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#EAF8EE] border border-[#A7E9BE] text-[#16A34A] text-xs font-semibold">
            <BadgePercent className="w-3.5 h-3.5" />
            <span>10% chegirma</span>
          </div>

          <div className="flex items-center gap-1 text-xs font-semibold text-zinc-600 dark:text-zinc-400">
            <Star className="w-4 h-4 fill-[#F59E0B] text-[#F59E0B]" />
            <span>4.8 (356 ta sharh)</span>
          </div>
        </div>

        {/* Row 2: Title & Status */}
        <div className="flex items-center justify-between gap-2">
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white">
            The Royal Grand
          </h1>
          <div className="flex items-center gap-1.5 text-sm font-bold text-[#16A34A] dark:text-[#22C55E]">
            <span className="w-2 h-2 rounded-full bg-[#16A34A] dark:bg-[#22C55E]" />
            <span>Ochiq</span>
          </div>
        </div>

        {/* Row 3: Specifications */}
        <div className="space-y-2.5 pt-1 text-sm font-medium text-zinc-700 dark:text-zinc-300">
          <div className="flex items-center gap-2.5">
            <svg
              className="w-4 h-4 text-zinc-500 shrink-0"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect width="20" height="12" x="2" y="6" rx="2" />
              <circle cx="12" cy="12" r="2" />
              <path d="M6 12h.01M18 12h.01" />
            </svg>
            <span>25,000,000 so'm</span>
          </div>

          <div className="flex items-center gap-2.5">
            <Users className="w-4 h-4 text-zinc-500 shrink-0" />
            <span>500 - 1,200 gacha odam</span>
          </div>

          <div className="flex items-center gap-2.5">
            <Map className="w-4 h-4 text-zinc-500 shrink-0" />
            <span>1 km uzoqda</span>
            <span className="text-zinc-300 select-none">|</span>
            <div className="inline-flex items-center gap-1 bg-[#16A34A] text-white px-2.5 py-0.5 rounded-lg text-xs font-bold">
              <span className="text-[10px] font-black">%</span>
              <span>Depozitlik</span>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <MapPin className="w-4 h-4 text-zinc-500 shrink-0" />
            <span>Navoiy, O‘zbekiston ko‘chasi 27 - uy</span>
          </div>
        </div>

        {/* Row 4: Jami narx & Band qilish Button */}
        <div className="pt-2 pb-1 flex items-center justify-between gap-4">
          <div>
            <span className="text-xs text-zinc-400 block font-normal">Jami narx</span>
            <span className="text-2xl font-black text-zinc-900 dark:text-white tracking-tight">
              25,000,000
            </span>
          </div>
          <button
            onClick={() => setShowBookingModal(true)}
            className="px-6 py-3.5 rounded-2xl bg-[#FF5A00] hover:bg-[#E05000] text-white font-bold text-sm flex items-center justify-center gap-2 active:scale-95 transition-all shadow-md shadow-[#FF5A00]/25 cursor-pointer"
          >
            <span>Band qilish</span>
            <ArrowRight className="w-4 h-4 stroke-[3]" />
          </button>
        </div>

        {/* Row 5: Tavsif */}
        <div className="space-y-1.5 pt-2">
          <h2 className="text-base font-bold text-zinc-900 dark:text-white">Tavsif</h2>
          <p className="text-xs sm:text-[13px] text-zinc-500 dark:text-zinc-400 leading-relaxed">
            Hasidona Koshona - bu sizning unutilmas tadbirlaringiz uchun mo'ljallangan hashamatli majmua.
            Modern klassika uslubidagi dizayn, keng va yorug' zal hamda professional xizmat ko'rsatish
            jamoasi sizning to'y, korporativ tadbir yoki yubileyingizni yuqori saviyada o'tkazishni ta'minlaydi.
          </p>
        </div>

        {/* Row 6: Amenities Grid (6 cards) */}
        <div className="grid grid-cols-2 gap-3 pt-2">
          {[
            { label: "Keng avtoturargoh", type: "parking" },
            { label: "Akustik tizim", type: "audio" },
            { label: "Katta sahna", type: "stage" },
            { label: "Konditsioner", type: "ac" },
            { label: "Professional oshxona", type: "kitchen" },
            { label: "Yuqori tezlikdagi Wi-Fi", type: "wifi" },
          ].map((item, idx) => (
            <div
              key={idx}
              className={`flex items-center gap-3 p-3 rounded-2xl border ${
                isDark
                  ? "bg-zinc-800/80 border-white/5 text-zinc-200"
                  : "bg-white border-zinc-100 text-zinc-800 shadow-[0_2px_8px_rgba(0,0,0,0.03)]"
              }`}
            >
              <div className="w-10 h-10 rounded-2xl bg-[#FFF4ED] dark:bg-[#FF5A00]/10 text-[#FF5A00] flex items-center justify-center shrink-0">
                {item.type === "parking" && <span className="font-extrabold text-sm">P</span>}
                {item.type === "audio" && (
                  <svg
                    className="w-5 h-5"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                  >
                    <path d="M4 10v4M8 7v10M12 4v16M16 8v8M20 11v2" />
                  </svg>
                )}
                {item.type === "stage" && (
                  <svg
                    className="w-5 h-5"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <circle cx="8" cy="11" r="5" />
                    <path d="M6 10h.01M10 10h.01" />
                    <path d="M6 13c.8 1 2 1 2.8 0" />
                    <circle cx="16" cy="13" r="5" />
                    <path d="M14 12h.01M18 12h.01" />
                    <path d="M14 15c.8-.8 2-.8 2.8 0" />
                  </svg>
                )}
                {item.type === "ac" && <Snowflake className="w-5 h-5 stroke-[2.2]" />}
                {item.type === "kitchen" && <Utensils className="w-5 h-5 stroke-[2.2]" />}
                {item.type === "wifi" && <Wifi className="w-5 h-5 stroke-[2.2]" />}
              </div>
              <span className="text-xs font-semibold leading-tight">{item.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Booking Flow Modal when "Band qilish" is pressed */}
      {showBookingModal && (
        <ToyxonaFlowModal
          isOpen={showBookingModal}
          onClose={() => setShowBookingModal(false)}
          initialStep="step1"
          theme={theme}
          venue={{
            id: 99,
            name: "The Royal Grand",
            price: "25,000,000 so'm",
            capacity: "500 - 1,200 gacha odam",
            img: activeImage,
            rating: "4.8",
            reviewsCount: "356 ta sharh",
            distance: "1 km uzoqda",
            address: "Navoiy, O‘zbekiston ko‘chasi 27 - uy",
            discount: "10% chegirma",
            description:
              "Hasidona Koshona - bu sizning unutilmas tadbirlaringiz uchun mo'ljallangan hashamatli majmua. Modern klassika uslubidagi dizayn, keng va yorug' zal hamda professional xizmat ko'rsatish jamoasi sizning to'y, korporativ tadbir yoki yubileyingizni yuqori saviyada o'tkazishni ta'minlaydi.",
          }}
          onSuccess={() => {
            setShowBookingModal(false);
            setToastMessage("To'yxona muvaffaqiyatli band qilindi!");
          }}
        />
      )}
    </div>
  );
}
