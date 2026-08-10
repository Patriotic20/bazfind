"use client";

import React, { useState, useEffect, use, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams, notFound } from "next/navigation";
import Navbar from "@/components/navbar";
import { MOCK_VENUES } from "@/data/venues";
import { 
  ChevronLeft, 
  User, 
  Phone, 
  CheckCircle, 
  X, 
  ChevronDown, 
  Share2, 
  CreditCard, 
  MapPin, 
  Clock, 
  Percent, 
  ChevronRight,
  ArrowRight,
  Plus,
  Minus,
  Sparkles
} from "lucide-react";

interface Props {
  params: Promise<{ id: string }>;
}

interface Card {
  id: string;
  number: string;
  expiry: string;
  type: "UZCARD" | "HUMO";
  name: string;
}

const ProgressBar = ({ step }: { step: number }) => {
  const steps = [
    "Restoranni belgilang",
    "Kun va vaqtni belgilang",
    "Menu",
    "Ma'lumotlarni tasdiqlash"
  ];
  return (
    <div className="w-full py-4 px-2 select-none">
      <div className="relative flex items-center justify-between">
        {/* Track Line */}
        <div className="absolute left-6 right-6 top-1/2 -translate-y-1/2 h-0.5 bg-zinc-800 z-0">
          <div 
            className="h-full bg-[#FF6B00] transition-all duration-500"
            style={{ width: `${((step - 1) / 3) * 100}%` }}
          />
        </div>

        {/* Steps */}
        {steps.map((label, idx) => {
          const num = idx + 1;
          const isCompleted = num < step;
          const isActive = num === step;
          return (
            <div key={idx} className="relative z-10 flex flex-col items-center flex-1">
              <div 
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${
                  isCompleted 
                    ? "bg-[#FF6B00] text-white" 
                    : isActive 
                    ? "bg-[#FF6B00] text-white ring-4 ring-[#FF6B00]/20" 
                    : "bg-zinc-800 text-zinc-500"
                }`}
              >
                {isCompleted ? "✓" : num}
              </div>
              <span className={`text-[8px] font-bold text-center mt-2 max-w-[70px] leading-tight transition-colors duration-300 ${
                num <= step ? "text-zinc-200" : "text-zinc-500"
              }`}>
                {label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

function BookingContent({ id }: { id: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const venue = MOCK_VENUES.find((v) => v.id === id) || MOCK_VENUES[0];

  // Parameters State (Step 1 of Interactive Booking)
  const guestsParam = searchParams.get("guests");
  const dateParam = searchParams.get("date");
  const timeParam = searchParams.get("time");

  const [guests, setGuests] = useState(guestsParam ? Number(guestsParam) : 3);
  const [selectedTable, setSelectedTable] = useState<number>(4);
  const [selectedDate, setSelectedDate] = useState(dateParam || "26");
  const [selectedTime, setSelectedTime] = useState(timeParam || "11:00");

  const toggleTable = (num: number) => {
    setSelectedTable(num);
  };

  // Multi-step State Machine
  // "params" -> "details" -> "checkout" -> "ticket" -> "qr"
  const [bookingStep, setBookingStep] = useState<"params" | "details" | "checkout" | "ticket" | "qr">("params");

  // User input details
  const [fullName, setFullName] = useState("Alisher Raimov");
  const [phoneNumber, setPhoneNumber] = useState("+998 99 219 19 55");

  // Card Management States
  const [cardList, setCardList] = useState<Card[]>([]);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  
  // Card adding interactive modal states
  const [showAddCard, setShowAddCard] = useState(false);
  const [inputCardNumber, setInputCardNumber] = useState("");
  const [inputExpiry, setInputExpiry] = useState("");
  const [cardType, setCardType] = useState<"UZCARD" | "HUMO">("UZCARD");

  // SMS Verification SMS OTP state
  const [showOTP, setShowOTP] = useState(false);
  const [otpCode, setOtpCode] = useState("");

  // Promo code states
  const [showPromoModal, setShowPromoModal] = useState(false);
  const [inputPromo, setInputPromo] = useState("");
  const [promoApplied, setPromoApplied] = useState(false);
  const [promoCode, setPromoCode] = useState("");

  // Loader / toast states
  const [loading, setLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [mounted, setMounted] = useState(false);

  // Read Menu Cart total from search params
  const rawTotal = searchParams.get("total") || "600000";
  const cartTotal = Number(rawTotal) > 0 ? Number(rawTotal) : 600000;

  // Invoice calculations
  const discountPercent = promoApplied ? 20 : 0;
  const discountAmount = Math.round((cartTotal * discountPercent) / 100);
  const finalTotal = cartTotal - discountAmount;

  useEffect(() => {
    setMounted(true);
    // Smooth scroll to top when step changes
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [bookingStep]);

  // Toast helper
  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(""), 3000);
  };

  if (!mounted) {
    return <div className="flex flex-col flex-1 bg-[var(--background)] animate-pulse h-screen" />;
  }

  // Format price helper
  const formatPrice = (val: number) => {
    return val.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ") + " so'm";
  };

  // Card format changes
  const handleCardChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.replace(/\D/g, "");
    let formatted = val.match(/.{1,4}/g)?.join(" ") || "";
    setInputCardNumber(formatted.substring(0, 19));

    // Guess card type (8600 is Uzcard, 9860 is Humo)
    if (val.startsWith("8600")) {
      setCardType("UZCARD");
    } else if (val.startsWith("9860")) {
      setCardType("HUMO");
    }
  };

  const handleExpiryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.replace(/\D/g, "");
    if (val.length > 2) {
      val = val.substring(0, 2) + "/" + val.substring(2, 4);
    }
    setInputExpiry(val.substring(0, 5));
  };

  // OTP keyboard handlers
  const handleKeypadPress = (val: string) => {
    if (val === "back") {
      setOtpCode(prev => prev.slice(0, -1));
    } else if (val === "+*#") {
      // no-op
    } else {
      if (otpCode.length < 6) {
        setOtpCode(prev => prev + val);
      }
    }
  };

  const handleVerifyCard = () => {
    if (otpCode.length < 6) {
      triggerToast("Iltimos, 6 xonali kodni to'liq kiriting!");
      return;
    }
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      // Success adding card
      const newCard: Card = {
        id: Math.random().toString(),
        number: inputCardNumber,
        expiry: inputExpiry,
        type: cardType,
        name: fullName
      };
      setCardList([...cardList, newCard]);
      setSelectedCardId(newCard.id);
      
      // Close overlays and reset
      setShowOTP(false);
      setInputCardNumber("");
      setInputExpiry("");
      setOtpCode("");
      triggerToast("Karta muvaffaqiyatli qo'shildi!");
    }, 1200);
  };

  const handlePromoApply = () => {
    if (inputPromo.trim().toUpperCase() === "BAZMLY") {
      setPromoApplied(true);
      setPromoCode("BAZMLY");
      setShowPromoModal(false);
      triggerToast("Promokod faollashtirildi: 20% chegirma!");
    } else {
      triggerToast("Noto'g'ri promokod kiritildi!");
    }
  };

  const handleCompletePayment = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setBookingStep("ticket");
      triggerToast("Tadbir muvaffaqiyatli band qilindi!");
    }, 1800);
  };

  return (
    <div className="w-full max-w-md mx-auto min-h-screen bg-[var(--background)] text-white flex flex-col relative overflow-hidden pb-12">
      
      {/* Dynamic Header */}
      <div className="flex items-center justify-between px-6 py-5 border-b border-white/5 select-none shrink-0 bg-[var(--background)] z-30 sticky top-0">
        <button
          onClick={() => {
            if (bookingStep === "details") setBookingStep("params");
            else if (bookingStep === "checkout") setBookingStep("details");
            else if (bookingStep === "ticket") setBookingStep("checkout");
            else if (bookingStep === "qr") setBookingStep("ticket");
            else router.back();
          }}
          className="p-2.5 rounded-xl bg-transparent text-white/80 hover:text-white transition-all active:scale-90"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        
        {bookingStep === "params" ? (
          <div className="w-1" />
        ) : (
          <h2 className="text-sm font-bold tracking-wide uppercase text-zinc-400">
            {bookingStep === "details" && "Ma'lumotlarni Tasdiqlash"}
            {bookingStep === "checkout" && "To'lov ma'lumotlari"}
            {bookingStep === "ticket" && "Tasdiqlandi"}
            {bookingStep === "qr" && "QR Chipta"}
          </h2>
        )}

        {/* Top-Right Location Indicator */}
        <div className="flex items-center gap-1.5 text-xs font-extrabold text-zinc-400 select-none">
          <MapPin className="h-4 w-4 text-zinc-500" />
          <span>{searchParams.get("location") ? decodeURIComponent(searchParams.get("location")!) : "Toshkent"}</span>
        </div>
      </div>

      {/* Floating Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-[999] px-4 py-3 rounded-2xl bg-[#FF6B00] text-white text-xs font-bold shadow-2xl flex items-center gap-2 border border-white/20 animate-fade-in">
          <CheckCircle className="h-4.5 w-4.5 shrink-0 animate-bounce" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* VIEW 1: Parameters Setup (Step 2 in user UI - 2-rasm) */}
      {bookingStep === "params" && (
        <div className="flex-1 flex flex-col gap-6 px-6 py-4 animate-fade-in select-none">
          {/* Progress Bar */}
          <ProgressBar step={2} />

          {/* Necha kishi uchun (Guests picker - 2-rasm) */}
          <div className="flex justify-between items-center text-left py-2">
            <div>
              <h3 className="font-extrabold text-base text-white">Necha kishi uchun</h3>
            </div>
            
            <div className="flex items-center gap-4">
              <button 
                onClick={() => setGuests(prev => Math.max(0, prev - 1))}
                className="w-9 h-9 rounded-full bg-[#2C2C2E] hover:bg-zinc-800 flex items-center justify-center font-bold text-white active:scale-95 transition-all text-lg"
              >
                —
              </button>
              <span className="text-xl font-bold w-6 text-center text-white">{guests}</span>
              <button 
                onClick={() => setGuests(prev => prev + 1)}
                className="w-9 h-9 rounded-full bg-[#2C2C2E] hover:bg-zinc-800 flex items-center justify-center font-bold text-white active:scale-95 transition-all text-lg"
              >
                +
              </button>
            </div>
          </div>

          {/* Joyni belgilash (Table Selector - 2-rasm) */}
          <div className="space-y-4 text-left py-2">
            <div>
              <h3 className="font-extrabold text-base text-white">Joyni belgilash</h3>
            </div>

            <div className="flex justify-between items-center px-1">
              {[1, 2, 3, 4, 5, 6, 7].map((num) => {
                const isSelected = selectedTable === num;
                const isPreBooked = num === 5;
                if (isSelected) {
                  return (
                    <button
                      key={num}
                      onClick={() => toggleTable(num)}
                      className="w-10 h-16 rounded-2xl bg-[#FF6B00] text-white flex flex-col items-center justify-center relative active:scale-95 transition-all"
                    >
                      <span className="text-[10px] font-black absolute top-1.5 leading-none">✓</span>
                      <span className="text-2xl font-black absolute bottom-1.5 leading-none">{num}</span>
                    </button>
                  );
                } else if (isPreBooked) {
                  return (
                    <button
                      key={num}
                      onClick={() => toggleTable(num)}
                      className="w-10 h-16 rounded-2xl border border-[#FF6B00] text-[#FF6B00] font-bold text-2xl flex items-center justify-center active:scale-95 transition-all"
                    >
                      {num}
                    </button>
                  );
                } else {
                  return (
                    <button
                      key={num}
                      onClick={() => toggleTable(num)}
                      className="w-10 h-16 text-2xl font-bold flex items-center justify-center text-white hover:text-zinc-300 active:scale-95 transition-all"
                    >
                      {num}
                    </button>
                  );
                }
              })}
            </div>
          </div>

          {/* Sanani belgilash (Date picker - 2-rasm) */}
          <div className="space-y-4 text-left py-2">
            <div>
              <h3 className="font-extrabold text-base text-white">Sanani belgilash</h3>
            </div>

            <div className="flex gap-2.5 overflow-x-auto pb-1 scrollbar-none">
              {[
                { day: "Dush", num: "26" },
                { day: "Sesh", num: "27" },
                { day: "Chor", num: "28" },
                { day: "Pay", num: "29" },
                { day: "Jum", num: "1" },
                { day: "Sh", num: "2" },
              ].map((item, idx) => {
                const isSelected = selectedDate === item.num;
                const isPreBooked = item.num === "29";
                if (isSelected) {
                  return (
                    <button
                      key={idx}
                      onClick={() => setSelectedDate(item.num)}
                      className="w-14 py-4 rounded-[20px] bg-[#FF6B00] text-white flex flex-col items-center justify-center relative shrink-0 active:scale-95 transition-all gap-0.5"
                    >
                      <span className="text-[10px] font-black leading-none">✓</span>
                      <span className="text-[10px] font-bold uppercase tracking-wide opacity-90 leading-none">{item.day}</span>
                      <span className="text-base font-black leading-none mt-0.5">{item.num}</span>
                    </button>
                  );
                } else if (isPreBooked) {
                  return (
                    <button
                      key={idx}
                      onClick={() => setSelectedDate(item.num)}
                      className="w-14 py-4 rounded-[20px] bg-[#2C2C2E] shrink-0 flex flex-col items-center justify-center gap-1.5 transition-all active:scale-95"
                    >
                      <span className="text-[10px] font-bold uppercase tracking-wide text-[#FF6B00]">
                        {item.day}
                      </span>
                      <span className="text-base font-black text-[#FF6B00]">
                        {item.num}
                      </span>
                    </button>
                  );
                } else {
                  return (
                    <button
                      key={idx}
                      onClick={() => setSelectedDate(item.num)}
                      className="w-14 py-4 rounded-[20px] bg-[#2C2C2E] shrink-0 flex flex-col items-center justify-center gap-1.5 transition-all active:scale-95"
                    >
                      <span className="text-[10px] font-bold uppercase tracking-wide text-zinc-400">
                        {item.day}
                      </span>
                      <span className="text-base font-black text-white">
                        {item.num}
                      </span>
                    </button>
                  );
                }
              })}
            </div>
          </div>

          {/* Vaqtni belgilash (Time picker - 2-rasm) */}
          <div className="space-y-4 text-left py-2">
            <div>
              <h3 className="font-extrabold text-base text-white">Vaqtni belgilash</h3>
            </div>

            <div className="flex gap-2.5 overflow-x-auto pb-1 scrollbar-none">
              {["11:00", "11:30", "12:00", "12:30"].map((t) => {
                const isSelected = selectedTime === t;
                const isPreBooked = t === "12:00";
                if (isSelected) {
                  return (
                    <button
                      key={t}
                      onClick={() => setSelectedTime(t)}
                      className="px-5 py-3 rounded-2xl text-xs font-extrabold shrink-0 bg-[#FF6B00] text-white flex items-center gap-1.5 active:scale-95 transition-all"
                    >
                      <span className="leading-none text-[10px]">✓</span>
                      <span>{t}</span>
                    </button>
                  );
                } else if (isPreBooked) {
                  return (
                    <button
                      key={t}
                      onClick={() => setSelectedTime(t)}
                      className="px-5 py-3 rounded-2xl text-xs font-extrabold shrink-0 bg-[#2C2C2E] text-[#FF6B00] active:scale-95 transition-all"
                    >
                      {t}
                    </button>
                  );
                } else {
                  return (
                    <button
                      key={t}
                      onClick={() => setSelectedTime(t)}
                      className="px-5 py-3 rounded-2xl text-xs font-extrabold shrink-0 bg-[#2C2C2E] text-white hover:text-zinc-300 active:scale-95 transition-all"
                    >
                      {t}
                    </button>
                  );
                }
              })}
            </div>
          </div>

          {/* Spacer */}
          <div className="flex-1 min-h-[40px]" />

          {/* Faded/brown Keyingisi Button (2-rasm) */}
          <button
            onClick={() => guests > 0 && setBookingStep("details")}
            className={`w-full py-4.5 rounded-2xl font-extrabold text-sm tracking-wide transition-all select-none shrink-0 ${
              guests > 0 
                ? "bg-[#FF6B00] hover:bg-[#E05000] text-white active:scale-[0.98] shadow-xl shadow-[#FF6B00]/25 cursor-pointer" 
                : "bg-[#3D251A] text-[#8C583C]/70 cursor-not-allowed opacity-80"
            }`}
          >
            Keyingisi
          </button>
        </div>
      )}

      {/* VIEW 2: Fill Details (Step 4 in user UI) */}
      {bookingStep === "details" && (
        <div className="flex-1 flex flex-col gap-6 px-6 py-4 animate-fade-in select-none">
          {/* Progress Bar */}
          <ProgressBar step={4} />

          {/* Title */}
          <div className="text-left mt-2">
            <h1 className="text-2xl font-black tracking-tight text-white">
              Ma'lumotlarni to'ldiring
            </h1>
          </div>

          {/* Inputs Section */}
          <div className="space-y-6">
            {/* Full Name */}
            <div className="space-y-2.5 text-left">
              <label className="block text-sm font-bold text-white tracking-wide">Ism/Familiya</label>
              <div className="flex items-center gap-3 pb-2 border-b border-zinc-800 focus-within:border-[#FF6B00]/40 transition-colors">
                <span className="text-zinc-500 text-base">👤</span>
                <input
                  type="text"
                  value={fullName === "Alisher Raimov" && !fullName ? "" : fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full bg-transparent border-0 p-0 text-base font-bold text-white focus:ring-0 outline-none placeholder:text-zinc-600"
                  placeholder="Ism/Familiya"
                />
              </div>
            </div>

            {/* Phone Number */}
            <div className="space-y-2.5 text-left">
              <label className="block text-sm font-bold text-white tracking-wide">Telefon raqam</label>
              <div className="flex items-center gap-3 pb-2 border-b border-zinc-800 focus-within:border-[#FF6B00]/40 transition-colors">
                <span className="text-zinc-500 text-base">📞</span>
                <input
                  type="text"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  className="w-full bg-transparent border-0 p-0 text-base font-bold text-white focus:ring-0 outline-none placeholder:text-zinc-600 font-mono"
                  placeholder="+998 ** *** ** **"
                />
              </div>
            </div>
          </div>

          {/* Info Card */}
          <div className="space-y-3 text-left">
            <label className="block text-sm font-bold text-white tracking-wide">Ma'lumot</label>
            <div className="rounded-[20px] bg-[#2C2C2E] p-5 text-left">
              <p className="text-xs font-bold text-zinc-300 leading-relaxed">
                Band qilingan vaqtgacha yetib kelishingizni so'raymiz. Kechikish <span className="text-white">40 daqiqadan</span> oshsa, band avtomatik bekor qilinishi mumkin.
              </p>
            </div>
          </div>

          {/* Spacer */}
          <div className="flex-1 min-h-[40px]" />

          {/* Submit Dynamic Button */}
          {(() => {
            const isFilled = fullName.trim().length > 0 && phoneNumber.trim().length > 0 && phoneNumber !== "+998 ** *** ** **";
            return (
              <button
                onClick={() => isFilled && setBookingStep("checkout")}
                className={`w-full py-4.5 rounded-[24px] font-extrabold text-sm tracking-wide transition-all select-none shrink-0 ${
                  isFilled 
                    ? "bg-[#FF6B00] hover:bg-[#E05000] text-white active:scale-[0.98] shadow-xl shadow-[#FF6B00]/25 cursor-pointer" 
                    : "bg-[#3D251A] text-[#8C583C]/70 cursor-not-allowed opacity-80"
                }`}
              >
                {isFilled ? "Tasdiqlash va band qilish" : "Keyingisi"}
              </button>
            );
          })()}
        </div>
      )}

      {/* VIEW 3: To'lov Ma'lumotlari (Checkout calculations) */}
      {bookingStep === "checkout" && (
        <div className="flex-1 flex flex-col gap-6 px-6 py-4 animate-fade-in">
          
          {/* Title */}
          <div className="text-left mt-2">
            <h1 className="text-2xl font-black tracking-tight text-white">
              To'lov ma'lumotlari
            </h1>
          </div>

          {/* Selected Card summary Dropdown */}
          <div className="rounded-2xl border border-white/5 bg-[#393939] p-4.5 flex items-center justify-between">
            <div className="flex items-center gap-3.5">
              {/* Logo icon */}
              <div className="w-10 h-10 rounded-xl bg-zinc-900 border border-white/5 flex items-center justify-center">
                <CreditCard className="h-5 w-5 text-[#FF6B00]" />
              </div>
              <div className="text-left">
                <p className="text-xs font-extrabold text-white">To'lov kartasini tanlash</p>
                <p className="text-[10px] text-zinc-500 font-mono mt-0.5">
                  {cardList.find(c => c.id === selectedCardId)?.type} •••• {cardList.find(c => c.id === selectedCardId)?.number.slice(-4)}
                </p>
              </div>
            </div>
            
            <button className="p-1 text-zinc-400">
              <ChevronDown className="h-4 w-4" />
            </button>
          </div>

          {/* Promokod field */}
          <div 
            onClick={() => {
              setInputPromo(promoCode);
              setShowPromoModal(true);
            }}
            className="rounded-2xl border border-white/5 bg-[#393939] p-4.5 flex items-center justify-between cursor-pointer hover:border-zinc-800 transition-colors"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-[#FF6B00]/10 flex items-center justify-center text-[#FF6B00]">
                <Percent className="h-4.5 w-4.5" />
              </div>
              <div className="text-left">
                <p className="text-xs font-extrabold text-white">Promokod kiriting</p>
                {promoApplied ? (
                  <p className="text-[10px] text-green-500 font-bold mt-0.5">
                    {promoCode} (20% chegirma faol)
                  </p>
                ) : (
                  <p className="text-[10px] text-zinc-500 font-bold mt-0.5">Promokod mavjudmi?</p>
                )}
              </div>
            </div>

            <ChevronRight className="h-4 w-4 text-zinc-500" />
          </div>

          {/* Invoicing calculations Card */}
          <div className="rounded-3xl border border-white/5 bg-[#393939] p-6 shadow-xl space-y-4.5 text-left">
            <h3 className="font-extrabold text-sm text-zinc-400 uppercase tracking-widest border-b border-white/5 pb-3">Hisob varag'i</h3>
            
            <div className="space-y-3.5 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-zinc-500 font-bold">Keyingi to'lov:</span>
                <span className="font-black text-white">2 - Fev, 2026</span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-zinc-500 font-bold">Menyu xarajati:</span>
                <span className="font-black text-white">{formatPrice(cartTotal)}</span>
              </div>

              {promoApplied && (
                <div className="flex justify-between items-center text-green-500">
                  <span className="font-bold">Chegirma (20%):</span>
                  <span className="font-black font-mono">-{formatPrice(discountAmount)}</span>
                </div>
              )}
            </div>

            <div className="border-t border-white/5 pt-4 flex flex-col gap-1">
              <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Jami to'lov</span>
              <div className="text-2xl font-black text-[#FF6B00] font-mono leading-none">
                {formatPrice(finalTotal)}
              </div>
            </div>
          </div>

          {/* Spacer */}
          <div className="flex-1 min-h-[40px]" />

          {/* Complete Payment Button */}
          <button
            onClick={handleCompletePayment}
            disabled={loading}
            className="w-full py-4.5 rounded-2xl bg-[#FF6B00] hover:bg-[#E05000] text-white font-extrabold text-sm tracking-wide transition-all active:scale-[0.98] shadow-xl shadow-[#FF6B00]/25 flex items-center justify-center gap-2 select-none"
          >
            {loading ? (
              <>
                <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <span>To'lanmoqda...</span>
              </>
            ) : (
              <span>Complete the payment</span>
            )}
          </button>
        </div>
      )}

      {/* VIEW 4: Ticket Confirmation */}
      {bookingStep === "ticket" && (
        <div className="flex-1 flex flex-col gap-6 px-6 py-4 animate-fade-in select-none">
          {/* Main Ticket Container */}
          <div 
            onClick={() => setBookingStep("qr")}
            className="rounded-[32px] border border-white/5 bg-[#393939] overflow-hidden shadow-2xl relative flex flex-col cursor-pointer hover:border-zinc-800 transition-colors"
          >
            {/* Top Image Segment */}
            <div className="relative h-44 w-full bg-zinc-900">
              <img
                src={venue.imageUrl || "/images/restaurant.png"}
                alt={venue.name}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/80" />
              
              {/* Overlay content on image */}
              <div className="absolute bottom-4 left-5 right-5 text-left">
                <h3 className="text-lg font-black text-white leading-tight">{venue.name}</h3>
                
                <div className="flex flex-wrap items-center gap-2 text-[10px] font-bold text-white/70 mt-1">
                  <span>1 km uzoqda</span>
                  <span>•</span>
                  <span className="text-[#10B981]">Ochiq</span>
                </div>
              </div>
            </div>

            {/* Ticket details info table */}
            <div className="p-5.5 space-y-4">
              {/* Phone row & address */}
              <div className="space-y-1.5 text-left border-b border-white/5 pb-3">
                <div className="flex items-center gap-2 text-[10px] text-zinc-500 font-bold">
                  <Phone className="h-3 w-3 text-[#FF6B00]" />
                  <span>+998 99 123 45 67</span>
                </div>
                <div className="flex items-center gap-2 text-[10px] text-zinc-500 font-bold">
                  <MapPin className="h-3 w-3 text-[#FF6B00]" />
                  <span className="truncate">Umid qo'rg'oni 765 - uy</span>
                </div>
              </div>

              {/* Data Table */}
              <div className="space-y-3 text-[10px] text-left">
                <div className="flex justify-between items-center">
                  <span className="text-zinc-500 font-bold">Holat:</span>
                  <span className="text-green-500 font-black">Band qilish tasdiqlandi</span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-zinc-500 font-bold">Chek raqami:</span>
                  <span className="text-white font-black font-mono">0789091172</span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-zinc-500 font-bold">Belgilandi:</span>
                  <span className="text-white font-black">{selectedTime} • {selectedDate} Iyun, 2026</span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-zinc-500 font-bold">Stol raqami:</span>
                  <span className="text-white font-black">{selectedTable} - stol</span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-zinc-500 font-bold">Restoran raqami:</span>
                  <span className="text-white font-black">+998 99 123 45 67</span>
                </div>

                {/* Price Row with highlighted Pill */}
                <div className="flex justify-between items-center pt-1.5">
                  <span className="text-zinc-500 font-bold">Narxi:</span>
                  <div className="px-3 py-1 bg-[#FF6B00] text-white font-black rounded-lg text-xs tracking-wide shadow-md shadow-[#FF6B00]/10">
                    {formatPrice(finalTotal)}
                  </div>
                </div>
              </div>
            </div>

            {/* Dotted Tear line with semicircles */}
            <div className="relative h-6 w-full flex items-center justify-between">
              {/* Left cutout */}
              <div className="w-3.5 h-6 bg-[var(--background)] rounded-r-full -ml-px border-y border-r border-white/5" />
              {/* Dash line */}
              <div className="flex-1 border-t-2 border-dashed border-zinc-800 mx-2" />
              {/* Right cutout */}
              <div className="w-3.5 h-6 bg-[var(--background)] rounded-l-full -mr-px border-y border-l border-white/5" />
            </div>

            {/* Bottom barcode segment */}
            <div className="p-5.5 flex flex-col items-center gap-4">
              <span className="text-xs font-mono font-black text-zinc-500 tracking-[0.2em]">{`1234 9877 6789 5432`}</span>
              
              {/* QR Badge click action trigger */}
              <div className="px-4.5 py-3 rounded-full bg-[#FF6B00]/10 border border-[#FF6B00]/20 flex items-center gap-2.5 text-[#FF6B00] hover:bg-[#FF6B00]/20 active:scale-95 transition-all text-[11px] font-extrabold uppercase tracking-wide">
                {/* Custom barcode scanner icon */}
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                  <path d="M4 6V4h2v2H4zm0 14v-2h2v2H4zm14 0v-2h2v2h-2zm2-14h-2V4h2v2zm-4 4V8h-2V6h2V4h-2V2H8v2H6v2h2v2H6v2h2V8h2v2h2V8h2v2h2zm-6 2h2v2h-2v-2zm-2 2H6v2h2v-2zm8 0h-2v2h2v-2zm-6 2h2v2h-2v-2zm4 2h2v2h-2v-2z" />
                </svg>
                <span>QR kod orqali</span>
              </div>
            </div>
          </div>

          {/* Pdf yuborish Button */}
          <button
            onClick={() => {
              triggerToast("PDF chipta generatsiya qilindi va yuborildi!");
              setTimeout(() => {
                // Navigate home with success flag
                router.push("/?bookingSuccess=true");
              }, 1500);
            }}
            className="w-full py-4.5 rounded-2xl bg-zinc-900 border border-white/5 hover:border-zinc-800 text-white font-extrabold text-sm tracking-wide transition-all active:scale-[0.98] shadow-lg flex items-center justify-center gap-2.5 cursor-pointer"
          >
            <Share2 className="h-4.5 w-4.5 text-[#FF6B00]" />
            <span>Pdf yuborish</span>
          </button>
        </div>
      )}

      {/* VIEW 5: QR Code Card View */}
      {bookingStep === "qr" && (
        <div className="flex-1 flex flex-col gap-6 px-6 py-4 justify-between animate-fade-in text-center">
          
          {/* Spacer */}
          <div className="w-1" />

          {/* White Rounded Premium QR Card */}
          <div className="w-full max-w-[300px] bg-white rounded-[40px] p-7 shadow-2xl flex flex-col items-center gap-6 mx-auto animate-scale-up">
            
            {/* SVG QR Code */}
            <div className="p-1 bg-white rounded-2xl">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" className="h-52 w-52 text-black">
                {/* Top-left position marker */}
                <rect x="0" y="0" width="28" height="28" fill="currentColor" rx="4" />
                <rect x="4" y="4" width="20" height="20" fill="white" rx="2" />
                <rect x="8" y="8" width="12" height="12" fill="currentColor" rx="1" />

                {/* Top-right position marker */}
                <rect x="72" y="0" width="28" height="28" fill="currentColor" rx="4" />
                <rect x="76" y="4" width="20" height="20" fill="white" rx="2" />
                <rect x="80" y="8" width="12" height="12" fill="currentColor" rx="1" />

                {/* Bottom-left position marker */}
                <rect x="0" y="72" width="28" height="28" fill="currentColor" rx="4" />
                <rect x="4" y="76" width="20" height="20" fill="white" rx="2" />
                <rect x="8" y="80" width="12" height="12" fill="currentColor" rx="1" />

                {/* Custom QR code random pixels */}
                <rect x="36" y="0" width="8" height="8" fill="currentColor" rx="1" />
                <rect x="52" y="0" width="12" height="4" fill="currentColor" rx="1" />
                <rect x="60" y="4" width="4" height="8" fill="currentColor" rx="1" />
                <rect x="36" y="12" width="4" height="12" fill="currentColor" rx="1" />
                <rect x="48" y="16" width="8" height="8" fill="currentColor" rx="1" />
                <rect x="60" y="16" width="4" height="4" fill="currentColor" rx="1" />
                <rect x="36" y="28" width="16" height="4" fill="currentColor" rx="1" />
                <rect x="56" y="24" width="8" height="8" fill="currentColor" rx="1" />
                <rect x="84" y="32" width="8" height="8" fill="currentColor" rx="1" />
                <rect x="12" y="36" width="16" height="8" fill="currentColor" rx="1" />
                <rect x="0" y="48" width="8" height="16" fill="currentColor" rx="1" />
                <rect x="36" y="44" width="8" height="12" fill="currentColor" rx="1" />
                <rect x="48" y="40" width="12" height="4" fill="currentColor" rx="1" />
                <rect x="52" y="48" width="16" height="16" fill="currentColor" rx="1" />
                <rect x="76" y="48" width="8" height="8" fill="currentColor" rx="1" />
                <rect x="88" y="56" width="12" height="4" fill="currentColor" rx="1" />
                <rect x="72" y="68" width="8" height="16" fill="currentColor" rx="1" />
                <rect x="88" y="72" width="8" height="8" fill="currentColor" rx="1" />
                <rect x="84" y="84" width="16" height="16" fill="currentColor" rx="2" />
                <rect x="20" y="60" width="4" height="4" fill="currentColor" rx="0.5" />
                <rect x="36" y="68" width="12" height="4" fill="currentColor" rx="0.5" />
                <rect x="44" y="76" width="4" height="12" fill="currentColor" rx="0.5" />
                <rect x="60" y="76" width="8" height="4" fill="currentColor" rx="0.5" />
              </svg>
            </div>

            <p className="text-zinc-600 text-xs font-extrabold tracking-tight px-4 leading-relaxed">
              Ushbu QR kodni sotuvchiga ko'rsating
            </p>
          </div>

          {/* Spacer */}
          <div className="w-1" />

          {/* Back Ortga Button */}
          <button
            onClick={() => setBookingStep("ticket")}
            className="w-full py-4.5 rounded-2xl bg-[#FF6B00] hover:bg-[#E05000] text-white font-extrabold text-sm tracking-wide transition-all active:scale-[0.98] shadow-xl shadow-[#FF6B00]/20 select-none shrink-0"
          >
            Ortga
          </button>
        </div>
      )}

      {/* OVERLAY 1: Add Card bottom sheet */}
      {showAddCard && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end max-w-md mx-auto bg-black/60 backdrop-blur-sm transition-all duration-300">
          {/* Tap outside to close */}
          <div className="absolute inset-0 z-0" onClick={() => setShowAddCard(false)} />
          
          {/* Sheet Body */}
          <div className="w-full bg-[#393939] border-t border-white/5 rounded-t-[36px] px-6 pb-9 pt-4 shadow-2xl relative z-10 flex flex-col gap-6 animate-slide-up">
            
            {/* Drag Handle */}
            <div className="w-10 h-1.5 bg-white/10 rounded-full mx-auto" />
            
            {/* Header row */}
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-black text-white">Karta ma'lumotlari</h2>
              <button 
                onClick={() => setShowAddCard(false)}
                className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-zinc-400 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Form */}
            <div className="space-y-4 text-left">
              {/* Card Number */}
              <div className="rounded-2xl border border-white/5 bg-zinc-900 p-4 focus-within:border-[#FF6B00]/50 transition-colors">
                <label className="block text-[8px] font-bold text-zinc-500 uppercase tracking-widest mb-1">
                  Karta raqami
                </label>
                <input
                  type="text"
                  value={inputCardNumber}
                  onChange={handleCardChange}
                  className="w-full bg-transparent border-0 p-0 text-sm font-bold text-white focus:ring-0 outline-none placeholder:text-zinc-700 font-mono tracking-wider"
                  placeholder="8600 1234 5678 9012"
                />
              </div>

              {/* Expiration date */}
              <div className="rounded-2xl border border-white/5 bg-zinc-900 p-4 focus-within:border-[#FF6B00]/50 transition-colors">
                <label className="block text-[8px] font-bold text-zinc-500 uppercase tracking-widest mb-1">
                  Amal qilish muddati
                </label>
                <input
                  type="text"
                  value={inputExpiry}
                  onChange={handleExpiryChange}
                  className="w-full bg-transparent border-0 p-0 text-sm font-bold text-white focus:ring-0 outline-none placeholder:text-zinc-700 font-mono"
                  placeholder="MM/YY"
                />
              </div>
            </div>

            {/* Submit */}
            <button
              disabled={inputCardNumber.length < 19 || inputExpiry.length < 5}
              onClick={() => {
                setShowAddCard(false);
                setShowOTP(true);
              }}
              className="w-full py-4.5 rounded-2xl bg-[#FF6B00] hover:bg-[#E05000] text-white font-extrabold text-sm tracking-wide transition-all active:scale-[0.98] shadow-xl shadow-[#FF6B00]/25 disabled:opacity-30 disabled:pointer-events-none"
            >
              Tasdiqlash
            </button>
          </div>
        </div>
      )}

      {/* OVERLAY 2: SMS Verification OTP Screen (with Numeric Keypad) */}
      {showOTP && (
        <div className="fixed inset-0 z-[100] flex flex-col max-w-md mx-auto bg-[var(--background)] animate-fade-in">
          
          {/* Header Row */}
          <div className="flex items-center justify-between px-6 py-5 border-b border-white/5 select-none shrink-0 bg-[var(--background)]">
            <div className="w-8 h-8" />
            <h2 className="text-sm font-bold tracking-wide uppercase text-zinc-400">Tasdiqlash</h2>
            <button 
              onClick={() => setShowOTP(false)}
              className="w-8 h-8 rounded-full bg-[#393939] border border-white/5 flex items-center justify-center text-zinc-400 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 flex flex-col gap-6 px-6 py-8">
            <div className="text-left space-y-2">
              <h1 className="text-2xl font-black text-white leading-tight">Send verification code</h1>
              <p className="text-xs text-zinc-500 leading-normal font-bold">
                We'll send a code to your phone number to verify your card
              </p>
            </div>

            {/* OTP Code Boxes */}
            <div className="flex justify-between items-center gap-2 max-w-[280px] mx-auto py-4">
              {Array.from({ length: 6 }).map((_, idx) => {
                const char = otpCode[idx] || "";
                return (
                  <div
                    key={idx}
                    className={`w-10 h-12 rounded-xl border flex items-center justify-center font-mono font-black text-base transition-all ${
                      char 
                        ? "border-[#FF6B00] bg-[#FF6B00]/5 text-white scale-105" 
                        : "border-zinc-800 bg-[#393939] text-zinc-700"
                    }`}
                  >
                    {char || "•"}
                  </div>
                );
              })}
            </div>

            <button 
              onClick={() => {
                setOtpCode("");
                triggerToast("Kod qayta yuborildi!");
              }}
              className="text-xs font-bold text-[#FF6B00] hover:underline"
            >
              Resent code
            </button>

            {/* Spacer */}
            <div className="flex-1" />

            {/* Action Next button */}
            <button
              onClick={handleVerifyCard}
              disabled={otpCode.length < 6 || loading}
              className="w-full py-4.5 rounded-2xl bg-[#FF6B00] hover:bg-[#E05000] text-white font-extrabold text-sm tracking-wide transition-all active:scale-[0.98] shadow-xl shadow-[#FF6B00]/20 flex items-center justify-center gap-2"
            >
              {loading ? (
                <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              ) : (
                <span>Next</span>
              )}
            </button>
          </div>

          {/* Custom Numeric Keypad at the bottom (Image 2 Screen 6) */}
          <div className="bg-[#393939] border-t border-white/5 p-4 grid grid-cols-3 gap-2.5 select-none shrink-0">
            {["1", "2", "3", "4", "5", "6", "7", "8", "9", "+*#", "0", "back"].map((btn) => {
              const isBack = btn === "back";
              const isSymbol = btn === "+*#";
              return (
                <button
                  key={btn}
                  onClick={() => handleKeypadPress(btn)}
                  className="py-4 bg-[#121212]/30 hover:bg-[#121212]/50 border border-white/5 active:scale-95 transition-all text-sm font-extrabold rounded-xl flex items-center justify-center text-white"
                >
                  {isBack ? (
                    /* Backspace SVG */
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9.75L14.25 12m0 0l2.25 2.25M14.25 12l2.25-2.25M14.25 12L12 14.25m-2.58 4.92l-6.375-6.375a1.125 1.125 0 010-1.59L9.42 4.83c.211-.211.498-.33.796-.33H19.5a2.25 2.25 0 012.25 2.25v10.5a2.25 2.25 0 01-2.25 2.25h-9.284c-.298 0-.585-.119-.796-.33z" />
                    </svg>
                  ) : (
                    btn
                  )}
                </button>
              );
            })}
          </div>

        </div>
      )}

      {/* OVERLAY 3: Promo code bottom sheet (Image 3 Screen 1-2) */}
      {showPromoModal && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end max-w-md mx-auto bg-black/60 backdrop-blur-sm transition-all duration-300">
          {/* Tap outside to close */}
          <div className="absolute inset-0 z-0" onClick={() => setShowPromoModal(false)} />
          
          {/* Sheet Body */}
          <div className="w-full bg-[#393939] border-t border-white/5 rounded-t-[36px] px-6 pb-9 pt-4 shadow-2xl relative z-10 flex flex-col gap-6 animate-slide-up">
            
            {/* Drag Handle */}
            <div className="w-10 h-1.5 bg-white/10 rounded-full mx-auto" />
            
            {/* Header row */}
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-black text-white flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-[#FF6B00] animate-pulse" />
                <span>Promokod</span>
              </h2>
              <button 
                onClick={() => setShowPromoModal(false)}
                className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-zinc-400 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Input field */}
            <div className="rounded-2xl border border-white/5 bg-zinc-900 p-4 focus-within:border-[#FF6B00]/50 transition-colors text-left">
              <label className="block text-[8px] font-bold text-zinc-500 uppercase tracking-widest mb-1">
                Yozish
              </label>
              <input
                type="text"
                value={inputPromo}
                onChange={(e) => setInputPromo(e.target.value.toUpperCase())}
                className="w-full bg-transparent border-0 p-0 text-sm font-bold text-white focus:ring-0 outline-none placeholder:text-zinc-700 tracking-wider"
                placeholder="Yozish"
              />
            </div>

            {/* Hint */}
            <p className="text-[10px] text-zinc-500 font-bold text-left leading-normal">
              Chegirma olish uchun <span className="text-[#FF6B00] font-black cursor-pointer hover:underline" onClick={() => setInputPromo("BAZMLY")}>BAZMLY</span> kodini kiriting!
            </p>

            {/* Apply Button */}
            <button
              disabled={!inputPromo.trim()}
              onClick={handlePromoApply}
              className="w-full py-4.5 rounded-2xl bg-[#FF6B00] hover:bg-[#E05000] text-white font-extrabold text-sm tracking-wide transition-all active:scale-[0.98] shadow-xl shadow-[#FF6B00]/25 disabled:opacity-30 disabled:pointer-events-none"
            >
              Apply
            </button>
          </div>
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
        <Suspense fallback={
          <div className="flex items-center justify-center h-64 bg-[var(--background)] text-white">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#FF6B00]" />
          </div>
        }>
          <BookingContent id={id} />
        </Suspense>
      </main>
    </div>
  );
}
