"use client";

import React, { useState } from "react";
import {
  X,
  ChevronLeft,
  Star,
  MapPin,
  Map,
  Users,
  CheckCircle,
  CreditCard,
  Check,
  Sparkles,
  Wind,
  Wifi,
  Utensils,
  ShieldCheck,
  Loader2,
  Share2,
  Bookmark,
  BadgePercent,
  ArrowRight,
  Snowflake,
  Apple,
  Soup,
  Wine,
  Cake,
  Pencil,
  Lock,
  Receipt,
  FileText,
} from "lucide-react";

export interface ToyxonaVenueData {
  id: number;
  name: string;
  price: string;
  capacity: string;
  img: string;
  rating: string;
  reviewsCount: string;
  distance: string;
  address: string;
  discount?: string;
  description?: string;
}

interface ToyxonaFlowModalProps {
  isOpen: boolean;
  onClose: () => void;
  venue?: ToyxonaVenueData | null;
  theme?: string;
  initialStep?: "detail" | "step1";
  onSuccess?: () => void;
}

const DEFAULT_GALLERY = [
  "/images/home/rest1.png",
  "/images/home/rest2.png",
  "/images/home/rest3.png",
  "/images/home/rest4.png",
  "/images/home/rest5.png",
  "/images/home/rest6.png",
];

export default function ToyxonaFlowModal({
  isOpen,
  onClose,
  venue,
  theme = "light",
  initialStep = "detail",
  onSuccess,
}: ToyxonaFlowModalProps) {
  const isDark = theme === "dark";

  const defaultVenue: ToyxonaVenueData = {
    id: 99,
    name: "The Royal Grand",
    price: "25,000,000 so'm",
    capacity: "500 - 1,200 gacha odam",
    img: "/images/home/top.png",
    rating: "4.8",
    reviewsCount: "356 ta sharh",
    distance: "1 km uzoqda",
    address: "Navoiy, O‘zbekiston ko‘chasi 27 - uy",
    discount: "10% chegirma",
    description:
      "Hasidona Koshona - bu sizning unutilmas tadbirlaringiz uchun mo'ljallangan hashamatli majmua. Modern klassika uslubidagi dizayn, keng va yorug' zal hamda professional xizmat ko'rsatish jamoasi sizning to'y, korporativ tadbir yoki yubileyingizni yuqori saviyada o'tkazishni ta'minlaydi.",
  };

  const currentVenue = venue || defaultVenue;

  const [activeImage, setActiveImage] = useState<string>(
    venue?.img && venue.img !== "/images/home/tuyxona2.png"
      ? venue.img
      : "/images/home/top.png"
  );
  const [isSaved, setIsSaved] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  React.useEffect(() => {
    if (venue?.img && venue.img !== "/images/home/tuyxona2.png") {
      setActiveImage(venue.img);
    } else {
      setActiveImage("/images/home/top.png");
    }
  }, [venue]);

  React.useEffect(() => {
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

  // Active Screen: "detail" | 1 | 2 | 3 | 4 | 5 | 6
  const [currentStep, setCurrentStep] = useState<"detail" | 1 | 2 | 3 | 4 | 5 | 6>(
    initialStep === "step1" ? 1 : "detail"
  );

  // Step 1: Date & Time State
  const dates = [
    { day: "Dush", date: "26", highlight: true },
    { day: "Sesh", date: "27", highlight: false },
    { day: "Chor", date: "28", highlight: false },
    { day: "Pay", date: "29", highlight: true },
    { day: "Jum", date: "1", highlight: false },
    { day: "Shan", date: "2", highlight: false },
    { day: "Yak", date: "3", highlight: false },
  ];
  const [selectedDate, setSelectedDate] = useState("26");

  const times = [
    { time: "11:00", highlight: true },
    { time: "11:30", highlight: false },
    { time: "12:00", highlight: true },
    { time: "12:30", highlight: false },
    { time: "17:30", highlight: false },
    { time: "18:00", highlight: true },
    { time: "18:30", highlight: false },
    { time: "19:00", highlight: false },
  ];
  const [selectedTime, setSelectedTime] = useState("18:00");

  // Step 2: Guest Tiers State
  const guestTiers = [
    { label: "100 - 150 kishi", priceVal: 10000000, priceText: "10,000,000 so'm" },
    { label: "150 - 200 kishi", priceVal: 15000000, priceText: "15,000,000 so'm" },
    { label: "200 - 300 kishi", priceVal: 20000000, priceText: "20,000,000 so'm" },
    { label: "300+ kishi", priceVal: 25000000, priceText: "25,000,000 so'm" },
  ];
  const [selectedGuestTier, setSelectedGuestTier] = useState(0);

  // Step 3: Catering / Menu State
  const [cateringMode, setCateringMode] = useState<"custom" | "ready">("ready");

  // Step 5: Payment Method State
  const [paymentMethod, setPaymentMethod] = useState<"card" | "click" | "payme">("card");
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

  // Calculations
  const hallRentalFee = guestTiers[selectedGuestTier].priceVal;
  const cateringPerPerson = 125000;
  const guestCountAvg = [125, 175, 250, 350][selectedGuestTier];
  const cateringTotal = cateringMode === "ready" ? guestCountAvg * cateringPerPerson : 0;
  const serviceFee = 1250000;
  const grandTotal = hallRentalFee + cateringTotal + serviceFee;
  const depositAmount = 1200000;

  const handlePayDeposit = () => {
    setIsProcessingPayment(true);
    setTimeout(() => {
      setIsProcessingPayment(false);
      setCurrentStep(6);
      if (onSuccess) onSuccess();
    }, 1200);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[70] flex justify-center bg-black/50 backdrop-blur-xs animate-fade-in">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-6 left-1/2 transform -translate-x-1/2 z-[80] px-4 py-2 rounded-xl bg-zinc-900/90 text-white text-xs font-semibold shadow-xl flex items-center gap-2 border border-white/10 backdrop-blur-md animate-fade-in">
          <CheckCircle className="w-4 h-4 text-[#16A34A] shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      <div
        className={`w-full max-w-md h-full overflow-hidden flex flex-col shadow-2xl relative transition-colors duration-300 ${
          isDark ? "bg-[#1E1E1E] text-white" : "bg-white text-zinc-900"
        }`}
      >
        {/* =======================================================================
            VIEW 0: TO'YXONA DETAIL SCREEN
           ======================================================================= */}
        {currentStep === "detail" && (
          <div className="flex-1 flex flex-col overflow-y-auto scrollbar-none pb-8">
            {/* Top Image Viewport with Overlay Buttons & Thumbnails */}
            <div className="w-full h-72 sm:h-80 relative overflow-hidden shrink-0">
              <img
                src={activeImage}
                alt={currentVenue.name}
                className="w-full h-full object-cover transition-all duration-300"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/30 pointer-events-none" />

              {/* Top Navigation */}
              <div className="absolute top-4 left-4 right-4 flex items-center justify-between z-10">
                <button
                  onClick={onClose}
                  className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-md text-white flex items-center justify-center active:scale-95 transition-all cursor-pointer shadow-md"
                >
                  <ChevronLeft className="w-6 h-6 stroke-[2.5]" />
                </button>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleShare}
                    className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-md text-white flex items-center justify-center active:scale-95 transition-all cursor-pointer shadow-md"
                  >
                    <Share2 className="w-5 h-5" />
                  </button>
                  <button
                    onClick={handleToggleSave}
                    className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-md text-white flex items-center justify-center active:scale-95 transition-all cursor-pointer shadow-md"
                  >
                    <Bookmark
                      className={`w-5 h-5 ${
                        isSaved ? "fill-[#FF5A00] text-[#FF5A00]" : "text-white"
                      }`}
                    />
                  </button>
                </div>
              </div>

              {/* Bottom Gallery Previews (6 thumbnails) */}
              <div className="absolute bottom-3 left-0 right-0 z-10 flex justify-center px-4">
                <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-1 max-w-full">
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
              {/* Badges & Rating Row */}
              <div className="flex items-center justify-between">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#EAF8EE] border border-[#A7E9BE] text-[#16A34A] text-xs font-semibold">
                  <BadgePercent className="w-3.5 h-3.5" />
                  <span>{currentVenue.discount || "10% chegirma"}</span>
                </div>

                <div className="flex items-center gap-1 text-xs font-semibold text-zinc-600 dark:text-zinc-400">
                  <Star className="w-4 h-4 fill-[#F59E0B] text-[#F59E0B]" />
                  <span>
                    {currentVenue.rating} ({currentVenue.reviewsCount})
                  </span>
                </div>
              </div>

              {/* Row 2: Title & Status */}
              <div className="flex items-center justify-between gap-2">
                <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white">
                  {currentVenue.name}
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
                  <span>{currentVenue.price}</span>
                </div>

                <div className="flex items-center gap-2.5">
                  <Users className="w-4 h-4 text-zinc-500 shrink-0" />
                  <span>{currentVenue.capacity}</span>
                </div>

                <div className="flex items-center gap-2.5">
                  <Map className="w-4 h-4 text-zinc-500 shrink-0" />
                  <span>{currentVenue.distance}</span>
                  <span className="text-zinc-300 select-none">|</span>
                  <div className="inline-flex items-center gap-1 bg-[#16A34A] text-white px-2.5 py-0.5 rounded-lg text-xs font-bold">
                    <span className="text-[10px] font-black">%</span>
                    <span>Depozitlik</span>
                  </div>
                </div>

                <div className="flex items-center gap-2.5">
                  <MapPin className="w-4 h-4 text-zinc-500 shrink-0" />
                  <span>{currentVenue.address}</span>
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
                  onClick={() => setCurrentStep(1)}
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
                  {currentVenue.description}
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
          </div>
        )}

        {/* =======================================================================
            STEP-BY-STEP HEADER & STEPPER (For Steps 1 to 6) - Figma 1:1
           ======================================================================= */}
        {currentStep !== "detail" && (
          <div className="shrink-0 border-b border-zinc-100 dark:border-white/5 z-10 bg-inherit">
            {/* Top Navigation */}
            <div className="flex items-center justify-between px-4 pt-3.5 pb-1">
              <button
                onClick={() => {
                  if (currentStep === 1) setCurrentStep("detail");
                  else setCurrentStep((prev) => ((prev as number) - 1) as any);
                }}
                className="p-1 -ml-1 text-zinc-900 dark:text-white hover:opacity-75 active:scale-95 transition-all cursor-pointer"
                aria-label="Orqaga"
              >
                <ChevronLeft className="w-6 h-6 stroke-[2]" />
              </button>
              <h3 className="font-bold text-base tracking-tight text-zinc-900 dark:text-white text-center flex-1">
                {currentVenue.name} to‘yxona
              </h3>
              <button
                onClick={onClose}
                className="p-1 -mr-1 text-zinc-900 dark:text-white hover:opacity-75 active:scale-95 transition-all cursor-pointer"
                aria-label="Yopish"
              >
                <X className="w-5 h-5 stroke-[2]" />
              </button>
            </div>

            {/* 4-Step Stepper Progress Bar (Figma 1:1) */}
            <div className="px-3 pt-2 pb-2.5">
              <div className="flex items-start justify-between">
                {[
                  {
                    step: 1,
                    line1: "To'yxonani",
                    line2: "belgilang",
                  },
                  {
                    step: 2,
                    line1: "Kun va vaqtni",
                    line2: "belgilang",
                  },
                  {
                    step: 3,
                    line1: "Mehmonlar",
                    line2: "soni",
                  },
                  {
                    step: 4,
                    line1: "Chek va",
                    line2: "to'lov",
                  },
                ].map((item, idx) => {
                  const stepNumber = idx + 1;

                  // Step 1: always completed (venue chosen)
                  // Step 2: completed when past step 1 (currentStep > 1)
                  // Step 3: completed when past step 3 (currentStep >= 4)
                  // Step 4: completed on final receipt (currentStep >= 6)
                  const isCompleted =
                    stepNumber === 1 ||
                    (stepNumber === 2 && (currentStep as number) > 1) ||
                    (stepNumber === 3 && (currentStep as number) >= 4) ||
                    (stepNumber === 4 && (currentStep as number) >= 6);

                  // Is current step active?
                  const isActive =
                    (stepNumber === 2 && currentStep === 1) ||
                    (stepNumber === 3 && (currentStep === 2 || currentStep === 3)) ||
                    (stepNumber === 4 && (currentStep === 4 || currentStep === 5));

                  return (
                    <React.Fragment key={idx}>
                      <div className="flex flex-col items-center flex-1 max-w-[84px]">
                        {/* Circle */}
                        <div
                          className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                            isCompleted || isActive
                              ? "bg-[#FF5A00] text-white"
                              : isDark
                              ? "bg-zinc-800 text-zinc-400"
                              : "bg-zinc-200 text-zinc-500"
                          }`}
                        >
                          {isCompleted ? (
                            <Check className="w-3.5 h-3.5 stroke-[3]" />
                          ) : (
                            stepNumber
                          )}
                        </div>

                        {/* 2-line Label (ALWAYS visible in Figma) */}
                        <div className="text-center mt-1 min-h-[26px]">
                          <span
                            className={`block text-[10px] leading-tight ${
                              isActive || isCompleted
                                ? "font-semibold text-zinc-900 dark:text-white"
                                : "text-zinc-400 dark:text-zinc-500 font-medium"
                            }`}
                          >
                            {item.line1}
                          </span>
                          <span
                            className={`block text-[10px] leading-tight ${
                              isActive || isCompleted
                                ? "font-semibold text-zinc-900 dark:text-white"
                                : "text-zinc-400 dark:text-zinc-500 font-medium"
                            }`}
                          >
                            {item.line2}
                          </span>
                        </div>
                      </div>

                      {/* Connecting Line between steps */}
                      {idx < 3 && (
                        <div
                          className={`flex-1 h-[2px] mt-3 mx-1 transition-colors ${
                            idx === 0 || // between 1 and 2 is always orange
                            (idx === 1 && (currentStep as number) >= 2) || // between 2 and 3
                            (idx === 2 && (currentStep as number) >= 4) // between 3 and 4
                              ? "bg-[#FF5A00]"
                              : isDark
                              ? "bg-zinc-800"
                              : "bg-zinc-200"
                          }`}
                        />
                      )}
                    </React.Fragment>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* =======================================================================
            VIEW 1: STEP 1 - SANANI VA VAQTNI BELGILASH (Figma Step 1)
           ======================================================================= */}
        {currentStep === 1 && (
          <div className="flex-1 flex flex-col h-full overflow-hidden">
            <div className="flex-1 overflow-y-auto px-4 sm:px-5 py-4 space-y-6 scrollbar-none">
              {/* Sanani belgilash */}
              <div className="space-y-3">
                <h3 className="text-base font-bold text-zinc-900 dark:text-white">
                  Sanani belgilash
                </h3>

                <div className="flex gap-2.5 overflow-x-auto pb-1 scrollbar-none">
                  {dates.map((item, idx) => {
                    const isSelected = selectedDate === item.date;
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setSelectedDate(isSelected ? "" : item.date)}
                        className={`w-[54px] sm:w-[58px] h-[82px] rounded-[18px] flex flex-col items-center justify-center shrink-0 transition-all cursor-pointer ${
                          isSelected
                            ? "bg-[#FF5A00] text-white shadow-md shadow-[#FF5A00]/25"
                            : isDark
                            ? "bg-[#2A2A2A] text-zinc-300 hover:bg-[#333333]"
                            : "bg-[#F5F5F7] text-zinc-800 hover:bg-[#EBECEF]"
                        }`}
                      >
                        {isSelected ? (
                          <Check className="w-3.5 h-3.5 stroke-[3] text-white mb-0.5" />
                        ) : (
                          <div className="w-3.5 h-3.5 mb-0.5" />
                        )}
                        <span
                          className={`text-[11px] font-medium leading-none mb-1.5 ${
                            isSelected
                              ? "text-white"
                              : item.highlight
                              ? "text-[#FF5A00] font-semibold"
                              : "text-zinc-400 dark:text-zinc-500"
                          }`}
                        >
                          {item.day}
                        </span>
                        <span
                          className={`text-xl font-bold leading-none ${
                            isSelected
                              ? "text-white"
                              : item.highlight
                              ? "text-[#FF5A00]"
                              : "text-zinc-900 dark:text-zinc-200"
                          }`}
                        >
                          {item.date}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Vaqtni belgilash */}
              <div className="space-y-3 pt-1">
                <h3 className="text-base font-bold text-zinc-900 dark:text-white">
                  Vaqtni belgilash
                </h3>

                <div className="grid grid-cols-4 gap-2.5">
                  {times.map((t, idx) => {
                    const isSelected = selectedTime === t.time;
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setSelectedTime(isSelected ? "" : t.time)}
                        className={`py-2.5 px-2 rounded-full flex items-center justify-center gap-1 transition-all text-xs font-semibold cursor-pointer ${
                          isSelected
                            ? "bg-[#FF5A00] text-white font-bold shadow-md shadow-[#FF5A00]/25"
                            : isDark
                            ? "bg-[#2A2A2A] hover:bg-[#333333]"
                            : "bg-[#F5F5F7] hover:bg-[#EBECEF]"
                        }`}
                      >
                        {isSelected && (
                          <Check className="w-3 h-3 stroke-[3] text-white shrink-0" />
                        )}
                        <span
                          className={
                            isSelected
                              ? "text-white"
                              : t.highlight
                              ? "text-[#FF5A00] font-bold"
                              : "text-zinc-700 dark:text-zinc-300"
                          }
                        >
                          {t.time}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Bottom Button Bar */}
            <div
              className={`p-4 border-t shrink-0 z-20 ${
                isDark ? "bg-[#1E1E1E] border-white/5" : "bg-white border-zinc-100"
              }`}
            >
              <button
                disabled={!selectedDate || !selectedTime}
                onClick={() => {
                  if (selectedDate && selectedTime) setCurrentStep(2);
                }}
                className={`w-full py-3.5 sm:py-4 rounded-full font-bold text-sm sm:text-base text-center transition-all ${
                  selectedDate && selectedTime
                    ? "bg-[#FF5A00] hover:bg-[#E05000] text-white shadow-lg shadow-[#FF5A00]/25 active:scale-[0.99] cursor-pointer"
                    : isDark
                    ? "bg-[#382218] text-white/40 cursor-not-allowed"
                    : "bg-[#FFD6BF] text-white cursor-not-allowed"
                }`}
              >
                Keyingisi
              </button>
              <div className="w-32 h-1 bg-black/20 dark:bg-white/20 rounded-full mx-auto mt-2.5" />
            </div>
          </div>
        )}

        {/* =======================================================================
            VIEW 2: STEP 2 - MEHMONLAR SONINI TANLASH (Figma Step 2)
           ======================================================================= */}
        {currentStep === 2 && (
          <div className="flex-1 flex flex-col h-full overflow-hidden">
            <div className="flex-1 overflow-y-auto px-4 sm:px-5 py-4 space-y-4 scrollbar-none">
              <div>
                <h2 className="text-base font-bold tracking-tight text-zinc-900 dark:text-white">
                  Tadbiringiz uchun mehmonlar sonini tanlang
                </h2>
                <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-1 leading-relaxed">
                  Tanlangan mehmonlar soni asosida taklif etiladigan zal va taomnoma menyusi o'zgarishi mumkin.
                </p>
              </div>

              <div className="space-y-3 pt-1">
                {guestTiers.map((tier, idx) => {
                  const isSelected = selectedGuestTier === idx;
                  return (
                    <div
                      key={idx}
                      onClick={() => setSelectedGuestTier(idx)}
                      className={`p-4 rounded-2xl border flex items-center justify-between cursor-pointer transition-all ${
                        isSelected
                          ? "border-[#FF5A00] bg-[#FFF9F6] dark:bg-[#FF5A00]/10"
                          : isDark
                          ? "border-white/10 bg-[#252528] hover:border-white/20"
                          : "border-zinc-200 bg-white hover:border-zinc-300"
                      }`}
                    >
                      <div>
                        <span className="text-sm font-bold block text-zinc-900 dark:text-white">{tier.label}</span>
                        <span className="text-xs text-zinc-400 dark:text-zinc-500 mt-0.5 block">
                          Asosiy narx: {tier.priceText}
                        </span>
                      </div>

                      <div
                        className={`w-5 h-5 rounded-full flex items-center justify-center transition-all ${
                          isSelected
                            ? "bg-[#FF5A00] text-white shadow-sm"
                            : "border border-zinc-300 dark:border-white/20"
                        }`}
                      >
                        {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Bottom Button Bar */}
            <div
              className={`p-4 border-t shrink-0 z-20 ${
                isDark ? "bg-[#1E1E1E] border-white/5" : "bg-white border-zinc-100"
              }`}
            >
              <button
                onClick={() => setCurrentStep(3)}
                className="w-full py-3.5 sm:py-4 rounded-full bg-[#FF5A00] hover:bg-[#E05000] text-white font-bold text-sm sm:text-base text-center transition-all shadow-lg shadow-[#FF5A00]/25 active:scale-[0.99] cursor-pointer"
              >
                Keyingisi
              </button>
              <div className="w-32 h-1 bg-black/20 dark:bg-white/20 rounded-full mx-auto mt-2.5" />
            </div>
          </div>
        )}

        {/* =======================================================================
            VIEW 3: STEP 3 - DASTURXON MAHSULOTLARINI TANLASH (Figma Step 3)
           ======================================================================= */}
        {currentStep === 3 && (
          <div className="flex-1 flex flex-col h-full overflow-hidden">
            {/* Scrollable Content Body */}
            <div className="flex-1 overflow-y-auto px-4 sm:px-5 py-3.5 space-y-3.5 scrollbar-none">
              <div>
                <h2 className="text-base font-bold tracking-tight text-zinc-900 dark:text-white">
                  Dasturxon mahsulotlarini tanlang
                </h2>
                <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-1 leading-relaxed">
                  Dasturxonni to‘liq to‘yxona tayyorlab berishi evaziga to‘yxona to‘loviga yana to‘lov qo‘shiladi!
                </p>
              </div>

              {/* 2 Options (Radio Cards matching Figma 1:1) */}
              <div className="space-y-2.5">
                {/* Option 1: O'zimiz tayyorlaymiz */}
                <div
                  onClick={() => setCateringMode("custom")}
                  className={`p-3.5 sm:p-4 rounded-2xl border flex items-center justify-between cursor-pointer transition-all ${
                    cateringMode === "custom"
                      ? "border-[#FF5A00] bg-[#FFF9F6] dark:bg-[#FF5A00]/10"
                      : isDark
                      ? "border-white/10 bg-[#252528] hover:border-white/20"
                      : "border-zinc-200 bg-white hover:border-zinc-300"
                  }`}
                >
                  <div>
                    <h4 className="text-sm font-bold text-zinc-900 dark:text-white">O‘zimiz tayyorlaymiz</h4>
                    <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-0.5 font-normal">
                      Hech qanday qo‘shimcha to‘lovsiz
                    </p>
                  </div>
                  <div
                    className={`w-5 h-5 rounded-full flex items-center justify-center transition-all ${
                      cateringMode === "custom"
                        ? "bg-[#FF5A00] text-white shadow-sm"
                        : "border border-zinc-300 dark:border-white/20"
                    }`}
                  >
                    {cateringMode === "custom" && <Check className="w-3 h-3 stroke-[3]" />}
                  </div>
                </div>

                {/* Option 2: Tayyor dasturxon */}
                <div
                  onClick={() => setCateringMode("ready")}
                  className={`p-3.5 sm:p-4 rounded-2xl border flex items-center justify-between cursor-pointer transition-all ${
                    cateringMode === "ready"
                      ? "border-[#FF5A00] bg-[#FFF9F6] dark:bg-[#FF5A00]/10"
                      : isDark
                      ? "border-white/10 bg-[#252528] hover:border-white/20"
                      : "border-zinc-200 bg-white hover:border-zinc-300"
                  }`}
                >
                  <div>
                    <h4 className="text-sm font-bold text-zinc-900 dark:text-white">Tayyor dasturxon</h4>
                    <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-0.5 font-normal">
                      To‘liq servis va tayyor taomlar to‘plami
                    </p>
                  </div>
                  <div
                    className={`w-5 h-5 rounded-full flex items-center justify-center transition-all ${
                      cateringMode === "ready"
                        ? "bg-[#FF5A00] text-white shadow-sm"
                        : "border border-zinc-300 dark:border-white/20"
                    }`}
                  >
                    {cateringMode === "ready" && <Check className="w-3 h-3 stroke-[3]" />}
                  </div>
                </div>
              </div>

              {/* Menyu tarkibi Section Header */}
              <div className="flex items-center justify-between pt-1">
                <h3 className="text-sm font-bold text-zinc-900 dark:text-white">Menyu tarkibi</h3>
                <span className="text-[11px] font-semibold text-[#FF5A00] bg-[#FFF2EA] dark:bg-[#FF5A00]/10 px-2.5 py-1 rounded-full">
                  Premium to‘plam
                </span>
              </div>

              {/* 5 Distinct Menu Cards (Figma 1:1 Icons & Text) */}
              <div className="space-y-2.5">
                {[
                  {
                    icon: Utensils,
                    label: "Salatlar",
                    desc: "Bahor, Smakcha, Olivye (3 xil)",
                  },
                  {
                    icon: Apple,
                    label: "Mevalar",
                    desc: "Mavsumiy mevalar va quruq mevalar",
                  },
                  {
                    icon: Soup,
                    label: "Asosiy Taomlar",
                    desc: "Osh, Somsa, Qozon-kabob",
                  },
                  {
                    icon: Wine,
                    label: "Ichimliklar",
                    desc: "Sharbatlar, Choy, Gazlangan suvlar",
                  },
                  {
                    icon: Cake,
                    label: "Shirinliklar",
                    desc: "Pishiriqlar, Tort, Milliy shirinliklar",
                  },
                ].map((item, idx) => (
                  <div
                    key={idx}
                    className={`p-3 rounded-2xl border flex items-center gap-3.5 transition-all shadow-[0_1px_4px_rgba(0,0,0,0.02)] ${
                      isDark
                        ? "bg-[#252528] border-white/5 text-white"
                        : "bg-white border-zinc-100 text-zinc-900"
                    }`}
                  >
                    <div className="w-10 h-10 rounded-2xl bg-[#FFF5EF] dark:bg-[#FF5A00]/10 text-[#FF5A00] flex items-center justify-center shrink-0">
                      <item.icon className="w-5 h-5 stroke-[2.2]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h5 className="text-xs font-bold leading-tight truncate">{item.label}</h5>
                      <p className="text-[11px] text-zinc-400 dark:text-zinc-500 leading-tight mt-0.5 truncate">
                        {item.desc}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Pinned Bottom Bar (Matching Figma 1:1) */}
            <div
              className={`p-4 border-t shrink-0 z-20 space-y-3 ${
                isDark
                  ? "bg-[#1E1E1E] border-white/5"
                  : "bg-white border-zinc-100 shadow-[0_-4px_20px_rgba(0,0,0,0.04)]"
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[11px] text-zinc-400 dark:text-zinc-500 block font-normal leading-tight">
                    Har bir mehmon uchun
                  </span>
                  <span className="text-xl font-black text-[#FF5A00] tracking-tight leading-tight">
                    125,000 UZS
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[11px] text-zinc-400 dark:text-zinc-500 block font-normal leading-tight">
                    Umumiy qiymat
                  </span>
                  <span className="text-sm font-bold text-zinc-900 dark:text-white block leading-tight">
                    {cateringMode === "ready"
                      ? `${(guestCountAvg * cateringPerPerson).toLocaleString()} UZS`
                      : "1,250,000 UZS"}
                  </span>
                  <span className="text-[11px] text-zinc-400 dark:text-zinc-500 block leading-tight">
                    ({cateringMode === "ready" ? guestCountAvg : 10} kishi)
                  </span>
                </div>
              </div>

              <button
                onClick={() => setCurrentStep(4)}
                className="w-full py-3.5 sm:py-4 rounded-full bg-[#FF5A00] hover:bg-[#E05000] text-white font-bold text-sm sm:text-base text-center transition-all shadow-lg shadow-[#FF5A00]/25 active:scale-[0.99] cursor-pointer"
              >
                Keyingisi
              </button>
              <div className="w-32 h-1 bg-black/20 dark:bg-white/20 rounded-full mx-auto mt-2" />
            </div>
          </div>
        )}

        {/* =======================================================================
            VIEW 4: STEP 4 - REVIEW & DETAILED PRICE REPORT (Figma Screen 5 Red Box)
           ======================================================================= */}
        {currentStep === 4 && (
          <div className="flex-1 flex flex-col h-full overflow-hidden">
            <div className="flex-1 overflow-y-auto px-4 sm:px-5 py-3.5 space-y-3.5 scrollbar-none">
              {/* Venue Card with Header Banner */}
              <div className="rounded-3xl border border-zinc-100 dark:border-white/5 bg-white dark:bg-[#252528] overflow-hidden shadow-[0_2px_12px_rgba(0,0,0,0.03)]">
                {/* Banner Image */}
                <div className="w-full h-40 sm:h-44 relative overflow-hidden">
                  <img
                    src={currentVenue.img || "/images/home/top.png"}
                    alt={currentVenue.name}
                    className="w-full h-full object-cover"
                  />
                </div>

                {/* Card Details */}
                <div className="p-4 space-y-2">
                  {/* Selected Venue Tag */}
                  <div className="flex items-center gap-1.5 text-xs font-bold text-[#FF5A00]">
                    <CheckCircle className="w-3.5 h-3.5 fill-[#FF5A00] text-white" />
                    <span>Selected Venue</span>
                  </div>

                  {/* Venue Title */}
                  <h3 className="text-xl font-extrabold tracking-tight text-zinc-900 dark:text-white">
                    {currentVenue.name}
                  </h3>

                  {/* Spec Row 1: Guests */}
                  <div className="flex items-center gap-2.5 text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                    <div className="w-5 h-5 rounded-md bg-[#FFF5EF] dark:bg-[#FF5A00]/10 text-[#FF5A00] flex items-center justify-center shrink-0">
                      <Users className="w-3.5 h-3.5" />
                    </div>
                    <span>{guestTiers[selectedGuestTier].label.replace("kishi", "Distinguished Guests")}</span>
                  </div>

                  {/* Spec Row 2: Catering */}
                  <div className="flex items-center gap-2.5 text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                    <div className="w-5 h-5 rounded-md bg-[#FFF5EF] dark:bg-[#FF5A00]/10 text-[#FF5A00] flex items-center justify-center shrink-0">
                      <Utensils className="w-3.5 h-3.5" />
                    </div>
                    <span>
                      {cateringMode === "ready"
                        ? "Premium Gold Catering Service"
                        : "O‘zimiz tayyorlaymiz"}
                    </span>
                  </div>

                  {/* Modify Selection button on right */}
                  <div className="flex justify-end pt-0.5">
                    <button
                      type="button"
                      onClick={() => setCurrentStep(2)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#F5F5F7] dark:bg-white/10 hover:bg-[#EBECEF] dark:hover:bg-white/15 text-zinc-600 dark:text-zinc-300 text-xs font-medium transition-all cursor-pointer"
                    >
                      <Pencil className="w-3 h-3 text-zinc-500 dark:text-zinc-400" />
                      <span>Modify Selection...</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Section: Detailed Price Report */}
              <div className="space-y-2 pt-1">
                <div className="flex items-center gap-2 text-sm font-bold text-zinc-900 dark:text-white">
                  <Receipt className="w-4 h-4 text-[#FF5A00]" />
                  <span>Detailed Price Report</span>
                </div>

                <div className="p-4 rounded-3xl border border-zinc-100 dark:border-white/5 bg-white dark:bg-[#252528] shadow-[0_2px_12px_rgba(0,0,0,0.03)] space-y-3">
                  {/* Hall Rental Fee */}
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-zinc-900 dark:text-white">Hall Rental Fee</h4>
                      <p className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-0.5 font-normal">
                        Full-day luxury access & staffing
                      </p>
                    </div>
                    <span className="text-sm font-bold text-zinc-900 dark:text-white">
                      $4,500.00
                    </span>
                  </div>

                  {/* Premium Catering */}
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-zinc-900 dark:text-white">Premium Catering</h4>
                      <p className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-0.5 font-normal">
                        {cateringMode === "ready"
                          ? `$65.00 per guest x ${guestCountAvg}`
                          : "Hech qanday qo‘shimcha to‘lovsiz"}
                      </p>
                    </div>
                    <span className="text-sm font-bold text-zinc-900 dark:text-white">
                      {cateringMode === "ready" ? "$9,750.00" : "$0.00"}
                    </span>
                  </div>

                  {/* Service & Logistics */}
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-zinc-900 dark:text-white">Service & Logistics</h4>
                      <p className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-0.5 font-normal">
                        Coordination & cleaning fees
                      </p>
                    </div>
                    <span className="text-sm font-bold text-zinc-900 dark:text-white">
                      $1,250.00
                    </span>
                  </div>

                  {/* Divider */}
                  <div className="h-px bg-zinc-100 dark:bg-white/10 my-0.5" />

                  {/* Total Amount Payable */}
                  <div className="flex items-center justify-between pt-0.5">
                    <div>
                      <h4 className="text-xs font-bold text-[#FF5A00]">Total Amount Payable</h4>
                      <p className="text-[10px] text-zinc-400 dark:text-zinc-500 mt-0.5 font-normal">
                        Includes all applicable taxes and fees
                      </p>
                    </div>
                    <span className="text-xl font-black text-zinc-900 dark:text-white tracking-tight">
                      {cateringMode === "ready" ? "$15,500.00" : "$5,750.00"}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Pinned Bottom Bar (Figma Screen 5) */}
            <div
              className={`p-4 border-t shrink-0 z-20 ${
                isDark
                  ? "bg-[#1E1E1E] border-white/5"
                  : "bg-white border-zinc-100 shadow-[0_-4px_20px_rgba(0,0,0,0.04)]"
              }`}
            >
              <button
                onClick={() => setCurrentStep(5)}
                className="w-full py-4 rounded-full bg-[#FF5A00] hover:bg-[#E05000] text-white font-bold text-base text-center transition-all shadow-lg shadow-[#FF5A00]/25 active:scale-[0.99] cursor-pointer"
              >
                Keyingisi
              </button>
              <div className="w-32 h-1 bg-black/20 dark:bg-white/20 rounded-full mx-auto mt-2" />
            </div>
          </div>
        )}

        {/* =======================================================================
            VIEW 5: STEP 5 - XAVFSIZ TO'LOV (Figma Screen 6)
           ======================================================================= */}
        {currentStep === 5 && (
          <div className="flex-1 flex flex-col h-full overflow-hidden">
            <div className="flex-1 overflow-y-auto px-4 sm:px-5 py-5 space-y-4 scrollbar-none">
              {/* Lock Icon */}
              <div className="text-center space-y-1">
                <div className="w-14 h-14 rounded-full bg-[#FFF5EF] dark:bg-[#FF5A00]/10 text-[#FF5A00] flex items-center justify-center mx-auto mb-2">
                  <Lock className="w-6 h-6 stroke-[2.2]" />
                </div>
                <h2 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-white">
                  Xavfsiz to‘lov
                </h2>
                <p className="text-xs text-zinc-400 dark:text-zinc-500 max-w-xs mx-auto">
                  To‘yxonani band qilish uchun depozit to‘lovi talab qilinadi.
                </p>
              </div>

              {/* Deposit Card */}
              <div
                className={`p-4 sm:p-5 rounded-3xl border border-[#FF5A00]/30 relative ${
                  isDark ? "bg-[#252528]" : "bg-white shadow-[0_2px_12px_rgba(0,0,0,0.02)]"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs text-zinc-400 dark:text-zinc-500 font-medium">Depozit miqdori</span>
                  <span className="bg-[#FF5A00] text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full">
                    20%
                  </span>
                </div>
                <div className="text-2xl sm:text-3xl font-black text-zinc-900 dark:text-white tracking-tight mt-1 mb-0.5">
                  {depositAmount.toLocaleString()} so‘m
                </div>
                <span className="text-[11px] text-zinc-400 dark:text-zinc-500 block">
                  Umumiy summadan chegirib tashlanadi
                </span>
              </div>

              {/* To'lov usuli */}
              <div className="space-y-2.5 pt-1">
                <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200 block">
                  To‘lov usuli
                </span>

                {[
                  { id: "card", name: "Bank kartasi", sub: "Visa, Mastercard, Uzcard" },
                  { id: "click", name: "Click Up", sub: "Tezkor to‘lov tizimi" },
                  { id: "payme", name: "Payme", sub: "Xavfsiz to‘lov" },
                ].map((m) => {
                  const isSelected = paymentMethod === m.id;
                  return (
                    <div
                      key={m.id}
                      onClick={() => setPaymentMethod(m.id as any)}
                      className={`p-4 rounded-2xl border flex items-center justify-between cursor-pointer transition-all ${
                        isSelected
                          ? "border-[#FF5A00] bg-[#FFF9F6] dark:bg-[#FF5A00]/10"
                          : isDark
                          ? "border-white/10 bg-[#252528] hover:border-white/20"
                          : "border-zinc-200 bg-white hover:border-zinc-300"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-[#FFF5EF] dark:bg-[#FF5A00]/10 text-[#FF5A00] flex items-center justify-center">
                          <CreditCard className="w-5 h-5 stroke-[2]" />
                        </div>
                        <div>
                          <span className="text-xs font-bold block text-zinc-900 dark:text-white">{m.name}</span>
                          <span className="text-[11px] text-zinc-400 dark:text-zinc-500 block mt-0.5">{m.sub}</span>
                        </div>
                      </div>

                      <div
                        className={`w-5 h-5 rounded-full flex items-center justify-center transition-all ${
                          isSelected
                            ? "bg-[#FF5A00] text-white shadow-sm"
                            : "border border-zinc-300 dark:border-white/20"
                        }`}
                      >
                        {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Security Note */}
              <div className="flex items-center justify-center gap-1.5 text-xs text-zinc-400 dark:text-zinc-500 pt-1">
                <ShieldCheck className="w-4 h-4 text-[#FF5A00]" />
                <span>Barcha to‘lovlar xavfsiz himoyalangan</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div
              className={`p-4 border-t shrink-0 z-20 space-y-2.5 ${
                isDark
                  ? "bg-[#1E1E1E] border-white/5"
                  : "bg-white border-zinc-100 shadow-[0_-4px_20px_rgba(0,0,0,0.04)]"
              }`}
            >
              <button
                onClick={handlePayDeposit}
                disabled={isProcessingPayment}
                className="w-full py-4 rounded-full bg-[#FF5A00] hover:bg-[#E05000] text-white font-bold text-base flex items-center justify-center gap-2 active:scale-95 transition-all shadow-lg shadow-[#FF5A00]/25 disabled:opacity-50 cursor-pointer"
              >
                {isProcessingPayment ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>To‘lov amalga oshirilmoqda...</span>
                  </>
                ) : (
                  <span>Depozitni to‘lash</span>
                )}
              </button>

              <button
                onClick={() => setCurrentStep(4)}
                disabled={isProcessingPayment}
                className="w-full py-1 text-xs font-medium text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 cursor-pointer"
              >
                Bekor qilish
              </button>
              <div className="w-32 h-1 bg-black/20 dark:bg-white/20 rounded-full mx-auto mt-2" />
            </div>
          </div>
        )}

        {/* =======================================================================
            VIEW 6: STEP 6 - MUVAFFAQIYATLI TASDIQLASH (Figma Screen 7)
           ======================================================================= */}
        {currentStep === 6 && (
          <div className="flex-1 flex flex-col h-full overflow-hidden">
            <div className="flex-1 overflow-y-auto px-4 sm:px-5 py-4 space-y-4 scrollbar-none">
              {/* Top Venue Card matching Screen 5 & 7 in Figma */}
              <div className="rounded-3xl border border-zinc-100 dark:border-white/5 bg-white dark:bg-[#252528] overflow-hidden shadow-[0_2px_12px_rgba(0,0,0,0.03)]">
                <div className="w-full h-40 sm:h-44 relative overflow-hidden">
                  <img
                    src={currentVenue.img || "/images/home/top.png"}
                    alt={currentVenue.name}
                    className="w-full h-full object-cover"
                  />
                </div>

                <div className="p-4 space-y-2">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-[#FF5A00]">
                    <CheckCircle className="w-3.5 h-3.5 fill-[#FF5A00] text-white" />
                    <span>Selected Venue</span>
                  </div>
                  <h3 className="text-xl font-extrabold tracking-tight text-zinc-900 dark:text-white">
                    {currentVenue.name}
                  </h3>
                  <div className="flex items-center gap-2.5 text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                    <div className="w-5 h-5 rounded-md bg-[#FFF5EF] dark:bg-[#FF5A00]/10 text-[#FF5A00] flex items-center justify-center shrink-0">
                      <Users className="w-3.5 h-3.5" />
                    </div>
                    <span>{guestTiers[selectedGuestTier].label.replace("kishi", "Distinguished Guests")}</span>
                  </div>
                  <div className="flex items-center gap-2.5 text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                    <div className="w-5 h-5 rounded-md bg-[#FFF5EF] dark:bg-[#FF5A00]/10 text-[#FF5A00] flex items-center justify-center shrink-0">
                      <Utensils className="w-3.5 h-3.5" />
                    </div>
                    <span>
                      {cateringMode === "ready"
                        ? "Premium Gold Catering Service"
                        : "O‘zimiz tayyorlaymiz"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Section: Buyurtma tafsilotlari (Figma Screen 7) */}
              <div className="space-y-2.5 pt-1">
                <div className="flex items-center gap-2 text-sm font-bold text-zinc-900 dark:text-white">
                  <FileText className="w-4 h-4 text-[#FF5A00]" />
                  <span>Buyurtma tafsilotlari</span>
                </div>

                <div className="p-4 sm:p-5 rounded-3xl border border-zinc-100 dark:border-white/5 bg-white dark:bg-[#252528] shadow-[0_2px_12px_rgba(0,0,0,0.03)] space-y-3 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="text-zinc-400 dark:text-zinc-500">To‘yxona nomi</span>
                    <span className="font-bold text-zinc-900 dark:text-white">{currentVenue.name}</span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-zinc-400 dark:text-zinc-500">Sana</span>
                    <span className="font-bold text-zinc-900 dark:text-white">26-Oktabr, 2024</span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-zinc-400 dark:text-zinc-500">Sig‘imi</span>
                    <span className="font-bold text-zinc-900 dark:text-white">
                      {guestTiers[selectedGuestTier].label}
                    </span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-zinc-400 dark:text-zinc-500">Xizmat turi</span>
                    <span className="font-bold text-zinc-900 dark:text-white">
                      {cateringMode === "ready" ? "Premium Paket" : "Faqat zal"}
                    </span>
                  </div>

                  <div className="h-px bg-zinc-100 dark:bg-white/10 my-1" />

                  <div className="flex justify-between items-center pt-1 text-sm font-bold">
                    <span className="text-[#FF5A00]">To‘langan depozit</span>
                    <span className="text-[#FF5A00] font-black text-base">
                      {depositAmount.toLocaleString()} UZS
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Return Button */}
            <div
              className={`p-4 border-t shrink-0 z-20 ${
                isDark
                  ? "bg-[#1E1E1E] border-white/5"
                  : "bg-white border-zinc-100 shadow-[0_-4px_20px_rgba(0,0,0,0.04)]"
              }`}
            >
              <button
                onClick={onClose}
                className="w-full py-4 rounded-full bg-[#FF5A00] hover:bg-[#E05000] text-white font-bold text-base shadow-lg shadow-[#FF5A00]/25 active:scale-95 transition-all cursor-pointer"
              >
                Bosh sahifaga qaytish
              </button>
              <div className="w-32 h-1 bg-black/20 dark:bg-white/20 rounded-full mx-auto mt-2" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
