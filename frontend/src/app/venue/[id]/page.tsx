"use client";

import React, { use, useState, useEffect, useRef } from "react";
import Link from "next/link";
import { notFound, useRouter } from "next/navigation";
import { useTheme } from "@/components/theme-provider";
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
} from "lucide-react";

interface Props {
  params: Promise<{ id: string }>;
}

const VENUES_DATA: Record<string, {
  name: string;
  location: string;
  rating: string;
  reviews: string;
  image: string;
  distance: string;
  isDeposit: boolean;
  hasDiscount: boolean;
  gallery: string[];
}> = {
  "1": {
    name: "Sayqal",
    location: "Umid qo'rg'oni 765 - uy",
    rating: "4.8",
    reviews: "128 ta sharh",
    image: "/images/home/tuyxona1.png",
    distance: "2 km uzoqda",
    isDeposit: false,
    hasDiscount: true,
    gallery: [
      "/images/home/rest1.png",
      "/images/home/rest2.png",
      "/images/home/rest3.png",
      "/images/home/rest4.png",
      "/images/home/rest5.png",
      "/images/home/rest6.png"
    ]
  },
  "2": {
    name: "Tinchlik",
    location: "Umid qo'rg'oni 765 - uy",
    rating: "4.8",
    reviews: "214 ta sharh",
    image: "/images/home/tuyxona2.png",
    distance: "2 km uzoqda",
    isDeposit: true,
    hasDiscount: false,
    gallery: [
      "/images/home/rest1.png",
      "/images/home/rest2.png",
      "/images/home/rest3.png",
      "/images/home/rest4.png",
      "/images/home/rest5.png",
      "/images/home/rest6.png"
    ]
  },
  "3": {
    name: "Rest One",
    location: "Navoiy, O'zbekiston ko'chasi 27 - uy",
    rating: "4.8",
    reviews: "356 ta sharh",
    image: "/images/home/top.png",
    distance: "1 km uzoqda",
    isDeposit: true,
    hasDiscount: true,
    gallery: [
      "/images/home/rest1.png",
      "/images/home/rest2.png",
      "/images/home/rest3.png",
      "/images/home/rest4.png",
      "/images/home/rest5.png",
      "/images/home/rest6.png"
    ]
  },
  "4": {
    name: "Panorama",
    location: "Umid qo'rg'oni 765 - uy",
    rating: "4.8",
    reviews: "185 ta sharh",
    image: "/images/home/tuyxona3.png",
    distance: "2 km uzoqda",
    isDeposit: true,
    hasDiscount: true,
    gallery: [
      "/images/home/rest1.png",
      "/images/home/rest2.png",
      "/images/home/rest3.png",
      "/images/home/rest4.png",
      "/images/home/rest5.png",
      "/images/home/rest6.png"
    ]
  },
  "5": {
    name: "Sharqona",
    location: "Umid qo'rg'oni 765 - uy",
    rating: "4.8",
    reviews: "95 ta sharh",
    image: "/images/home/tuyxona4.png",
    distance: "2 km uzoqda",
    isDeposit: false,
    hasDiscount: true,
    gallery: [
      "/images/home/rest1.png",
      "/images/home/rest2.png",
      "/images/home/rest3.png",
      "/images/home/rest4.png",
      "/images/home/rest5.png",
      "/images/home/rest6.png"
    ]
  }
};

export default function VenueDetailPage({ params }: Props) {
  const router = useRouter();
  const { id } = use(params);
  const venue = VENUES_DATA[id] || VENUES_DATA["3"]; // fallback to Rest One
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const [activeImage, setActiveImage] = useState(venue.image);
  const [isSaved, setIsSaved] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedItems, setSelectedItems] = useState<Record<string, number>>({});
  
  // Interactive party/time picker state (2-rasm)
  const [showPartySheet, setShowPartySheet] = useState(false);
  const [showLocationSearch, setShowLocationSearch] = useState(false);
  const [partySize, setPartySize] = useState(5);
  const [selectedDay, setSelectedDay] = useState("Jum");
  const [selectedTime, setSelectedTime] = useState("23:30");

  // --- Drag to Scroll Spinner Picker Logic (2-rasm) ---
  const dayScrollRef = useRef<HTMLDivElement>(null);
  const [dayDragState, setDayDragState] = useState({ isDown: false, startY: 0, scrollTop: 0 });

  const handleDayMouseDown = (e: React.MouseEvent) => {
    const el = dayScrollRef.current;
    if (!el) return;
    setDayDragState({
      isDown: true,
      startY: e.pageY - el.offsetTop,
      scrollTop: el.scrollTop
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
    setDayDragState(prev => ({ ...prev, isDown: false }));
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
      scrollTop: el.scrollTop
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
    setTimeDragState(prev => ({ ...prev, isDown: false }));
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
  }, [showPartySheet]);

  const FOODS = [
    { name: "Jizz", img: "/images/home/food1.png", price: "500 000 so'm", priceVal: 500000 },
    { name: "Qozon kabob", img: "/images/home/food2.png", price: "300 000 so'm", priceVal: 300000 },
    { name: "Manti", img: "/images/home/food3.png", price: "100 000 so'm", priceVal: 100000 },
    { name: "Stake", img: "/images/home/food4.png", price: "180 000 so'm", priceVal: 180000 },
    { name: "Tandir go'sht", img: "/images/home/top.png", price: "250 000 so'm", priceVal: 250000 },
    { name: "Somsa", img: "/images/home/tuyxona1.png", price: "15 000 so'm", priceVal: 15000 }
  ];

  const handleAddItem = (name: string) => {
    setSelectedItems(prev => ({
      ...prev,
      [name]: (prev[name] || 0) + 1
    }));
  };

  const cartTotal = Object.entries(selectedItems).reduce((sum, [name, qty]) => {
    const item = FOODS.find(f => f.name === name);
    return sum + (item ? item.priceVal * qty : 0);
  }, 0);

  const formatPrice = (val: number) => {
    return val.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ") + " so'm";
  };
  const [showReviews, setShowReviews] = useState(false);
  const [newReviewText, setNewReviewText] = useState("");
  const [userName, setUserName] = useState("Shahzod");
  const [reviewsList, setReviewsList] = useState([
    {
      author: "KaiB",
      avatar: "/images/home/rest1.png",
      date: "22 Jul",
      isVerified: true,
      rating: 5,
      text: "KaiB was amazing with our cats!! 🌟🌟🌟 This was our first time using a pet-sitting service, so we were naturally quite anxious. We took a chance on Kai and completely lucked out! We booked Kai to come twice a day for three days."
    },
    {
      author: "Shahzod",
      avatar: "/images/home/rest2.png",
      date: "20 Jul",
      isVerified: true,
      rating: 5,
      text: "Menga bu joy juda yoqdi! Taomlari shirin, xizmat ko'rsatish darajasi juda yuqori. Hammaga tavsiya qilaman! 🌟"
    },
    {
      author: "Malika",
      avatar: "/images/home/rest3.png",
      date: "18 Jul",
      isVerified: true,
      rating: 5,
      text: "Ajoyib muhit va shinam joy. Oilaviy o'tirishlar uchun juda mos keladi. Kelajakda yana albatta kelamiz."
    },
    {
      author: "Olim",
      avatar: "/images/home/rest4.png",
      date: "10 Jul",
      isVerified: true,
      rating: 4,
      text: "Xizmat ko'rsatish a'lo darajada. Taomlari ham lazzatli. Faqat sal kechroq tayyor bo'ldi, lekin kutishga arziydi."
    }
  ]);

  useEffect(() => {
    setActiveImage(venue.image);
  }, [venue]);

  useEffect(() => {
    const name = localStorage.getItem("fullName");
    if (name) {
      setUserName(name);
    }
  }, []);

  useEffect(() => {
    const bottomNav = document.getElementById("global-bottom-nav");
    if (bottomNav) {
      if (showReviews) {
        bottomNav.style.transform = "translateY(100%)";
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
  }, [showReviews]);

  const reviewsEndRef = useRef<HTMLDivElement | null>(null);

  const scrollToBottom = () => {
    // Standard delay to let state render fully before scrolling
    setTimeout(() => {
      reviewsEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  };

  useEffect(() => {
    if (showReviews) {
      scrollToBottom();
    }
  }, [reviewsList, showReviews]);

  const handleSendReview = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newReviewText.trim()) return;

    const newRev = {
      author: userName,
      avatar: "/images/home/rest6.png",
      date: "Hozir",
      isVerified: true,
      rating: 5,
      text: newReviewText.trim()
    };

    setReviewsList([...reviewsList, newRev]);
    setNewReviewText("");
    setToastMessage("Sharhingiz muvaffaqiyatli qo'shildi!");
  };

  // Toast auto-dismiss helper
  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(""), 3000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  const handleSaveToggle = () => {
    setIsSaved(!isSaved);
    setToastMessage(!isSaved ? "Restoran saqlandi!" : "Restoran saqlanganlardan olib tashlandi!");
  };

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    setToastMessage("Havola buferga nusxalandi!");
  };

  return (
    <div className={`flex flex-col flex-1 bg-[var(--background)] min-h-screen relative ${
      isDark ? "text-white" : "text-zinc-900"
    }`}>
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50 px-4 py-2.5 rounded-xl bg-primary text-white text-xs font-bold shadow-xl animate-fade-in flex items-center gap-2 max-w-xs text-center border border-white/20">
          <CheckCircle className="h-4 w-4 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Cinematic Top Image Section */}
      <div className="relative w-full h-[280px] bg-zinc-900 border-b border-white/5 overflow-hidden">
        <img
          src={activeImage}
          alt={venue.name}
          className="w-full h-full object-cover"
        />

        {/* Gradient overlays */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-black/70 pointer-events-none" />

        {/* Floating Header Actions */}
        <div className="absolute top-5 left-6 right-6 flex items-center justify-between z-20">
          {/* Back Chevron */}
          <button
            onClick={() => router.back()}
            className="p-2.5 rounded-full bg-black/40 backdrop-blur-md border border-white/10 text-white/90 hover:text-white transition-all active:scale-90 cursor-pointer"
          >
            <ChevronLeft className="h-5 w-5 stroke-[2.5]" />
          </button>

          {/* Right share & save */}
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

        {/* Bottom Small Image Gallery previews inside overlay */}
        <div className="absolute bottom-4 left-6 right-6 z-20 flex justify-center">
          <div className="bg-white/95 rounded-[18px] p-[5px] flex gap-[6px] items-center shadow-[0_8px_30px_rgba(0,0,0,0.16)] border border-white/40 max-w-[340px] overflow-x-auto scrollbar-none">
            {venue.gallery.map((thumb, idx) => {
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
      </div>

      {/* Main Details Body */}
      <main className="flex-1 px-6 py-6 pb-24 flex flex-col gap-6 max-w-md mx-auto w-full text-left">
        
        {/* Info detail block */}
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            {/* 10% discount green pill */}
            <div className="flex items-center gap-1.5 bg-green-500/10 border border-green-500/20 text-[#10B981] font-bold rounded-lg px-2.5 py-1 text-xs">
              <Percent className="h-3.5 w-3.5" />
              <span>10% chegirma</span>
            </div>

            {/* Rating row link */}
            <button
              type="button"
              onClick={() => setShowReviews(true)}
              className={`flex items-center gap-1 text-xs font-bold transition-colors cursor-pointer active:scale-95 transition-all ${
                isDark ? "text-white/70 hover:text-white" : "text-zinc-650 hover:text-zinc-950"
              }`}
            >
              <span className="text-[#FFB800]">★</span>
              <span>{venue.rating} ({reviewsList.length} ta sharh)</span>
              <ChevronRight className="h-4 w-4 text-[#FFB800]" />
            </button>
          </div>

          {/* Restaurant Title & Status */}
          <div className="flex items-start justify-between">
            <h2 className={`text-2xl font-black tracking-tight ${isDark ? "text-white" : "text-black"}`}>{venue.name}</h2>
            <div className="flex items-center gap-1.5 text-xs text-[#10B981] font-bold pt-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#10B981]" />
              <span>Ochiq</span>
            </div>
          </div>

          {/* Distance Row */}
          <div className="flex justify-between items-center">
            <div className={`flex items-center gap-2 text-xs font-semibold ${
              isDark ? "text-white/70" : "text-zinc-600"
            }`}>
              <Compass className={`h-4 w-4 ${isDark ? "text-white/40" : "text-zinc-455"}`} />
              <span>{venue.distance}</span>
            </div>

            {/* Deposit Badges */}
            {venue.isDeposit && (
              <div className="flex items-center gap-1 bg-green-500/10 border border-green-500/20 text-[#10B981] font-bold rounded-lg px-2.5 py-1 text-[10px] uppercase tracking-wider">
                <Wallet className="h-3.5 w-3.5 shrink-0" />
                <span>Depozitlik</span>
              </div>
            )}
          </div>

          {/* Address */}
          <div className={`flex items-center gap-2 text-xs font-semibold leading-relaxed ${
            isDark ? "text-white/50" : "text-zinc-600"
          }`}>
            <MapPin className={`h-4 w-4 shrink-0 ${isDark ? "text-white/30" : "text-zinc-400"}`} />
            <span>{venue.location}</span>
          </div>
        </div>

        {/* Menyu Section */}
        <div className="space-y-4 pt-2">
          {/* Section tab header */}
          <div className={`border-b ${isDark ? "border-white/5" : "border-zinc-100"}`}>
            <div className="inline-block border-b-2 border-primary pb-2 pr-4 text-sm font-bold text-primary tracking-wide">
              Menyu
            </div>
          </div>

          {/* Menu Count bar */}
          <div className="flex justify-between items-center text-xs font-bold">
            <span className={isDark ? "text-white/90" : "text-zinc-850"}>{`Menu (${FOODS.length * 14 + 2} mahsulot)`}</span>
            <button className={`transition-colors ${isDark ? "text-white/40 hover:text-white/60" : "text-primary hover:text-primary-hover"}`}>
              Menyuni ko'rish
            </button>
          </div>

          {/* Search bar inside section */}
          <div className={`flex items-center border rounded-2xl overflow-hidden transition-all duration-300 ${
            isDark 
              ? "bg-[#393939] border-white/5 focus-within:border-[#FF6B00]/50" 
              : "bg-zinc-100 border-transparent focus-within:bg-zinc-200/50"
          }`}>
            <span className={isDark ? "text-white/40 pl-4" : "text-zinc-400 pl-4"}>
              <Search className="h-5 w-5" />
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Qidirish"
              className={`w-full pl-3 pr-4 py-4 bg-transparent text-sm font-semibold outline-none ${
                isDark ? "text-white placeholder:text-white/30" : "text-zinc-950 placeholder:text-zinc-400"
              }`}
            />
          </div>

          {/* Food Grid Display */}
          <div className="grid grid-cols-2 gap-4 pt-1">
            {FOODS.filter(f => f.name.toLowerCase().includes(searchQuery.toLowerCase())).map((food, idx) => {
              const qty = selectedItems[food.name] || 0;
              return (
                <div
                  key={idx}
                  className={`border rounded-3xl p-3 flex flex-col gap-3 relative text-left animate-fade-in ${
                    isDark 
                      ? "bg-[#393939] border-white/5 shadow-lg" 
                      : "bg-white border-zinc-200 shadow-sm"
                  }`}
                >
                  {/* Image Viewport */}
                  <div className={`w-full aspect-[1.15/1] rounded-2xl overflow-hidden relative border ${
                    isDark ? "border-white/5 bg-zinc-800" : "border-zinc-100 bg-zinc-50"
                  }`}>
                    <img
                      src={food.img}
                      alt={food.name}
                      className="w-full h-full object-cover"
                    />
                    
                    {/* Add/Remove Item Controller conforming to Mockup Screen 2 */}
                    {qty > 0 ? (
                      <div className="absolute bottom-2 right-2 bg-white border border-zinc-200 text-black rounded-full px-2 py-1 flex items-center gap-2 shadow-md z-10 animate-scale-up">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedItems(prev => {
                              const next = { ...prev };
                              if (next[food.name] > 1) next[food.name]--;
                              else delete next[food.name];
                              return next;
                            });
                          }}
                          className="w-5 h-5 flex items-center justify-center font-black text-xs text-zinc-500 hover:text-black cursor-pointer active:scale-80 transition-all"
                        >
                          <Minus className="h-3 w-3 stroke-[3]" />
                        </button>
                        <span className="text-xs font-bold text-zinc-955 select-none min-w-[8px] text-center">{qty}</span>
                        <button
                          type="button"
                          onClick={() => handleAddItem(food.name)}
                          className="w-5 h-5 flex items-center justify-center font-black text-xs text-zinc-500 hover:text-black cursor-pointer active:scale-80 transition-all"
                        >
                          <Plus className="h-3 w-3 stroke-[3]" />
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleAddItem(food.name)}
                        className={`absolute bottom-2 right-2 w-8 h-8 rounded-full shadow-md flex items-center justify-center font-bold hover:scale-105 active:scale-95 transition-all z-10 ${
                          isDark ? "bg-[#FF6B00] text-white" : "bg-white border border-zinc-200 text-zinc-950 cursor-pointer"
                        }`}
                      >
                        <Plus className="h-4 w-4 stroke-[3]" />
                      </button>
                    )}
                  </div>

                  {/* Details */}
                  <div className="space-y-1 pr-0.5">
                    <p className={`text-sm font-black tracking-wide ${isDark ? "text-white" : "text-zinc-955"}`}>{food.price}</p>
                    <p className={`text-xs font-semibold ${isDark ? "text-white/50" : "text-zinc-500"}`}>{food.name}</p>
                  </div>
                </div>
              );
            })}
            {FOODS.filter(f => f.name.toLowerCase().includes(searchQuery.toLowerCase())).length === 0 && (
              <div className={`col-span-2 py-8 text-center text-xs font-semibold ${isDark ? "text-white/40" : "text-zinc-400"}`}>
                Mahsulot topilmadi
              </div>
            )}
          </div>
        </div>

      </main>

      {/* Solid Sticky Bottom Action Panel */}
      <div className={`fixed bottom-0 left-0 right-0 max-w-md mx-auto border-t px-6 py-4.5 z-40 ${
        isDark ? "bg-black/85 border-white/5" : "bg-white border-zinc-150 shadow-[0_-4px_12px_rgba(0,0,0,0.05)]"
      }`}>
        <button
          onClick={() => setShowPartySheet(true)}
          className="w-full py-4 rounded-[24px] bg-[#FF5A00] hover:bg-[#E05000] text-white font-bold text-sm tracking-wide flex items-center justify-center gap-2 transition-all active:scale-98 shadow-lg shadow-[#FF6B00]/20 cursor-pointer"
        >
          <span>{cartTotal > 0 ? formatPrice(cartTotal) : "Keyingisi"}</span>
        </button>
      </div>

      {/* Reviews Screen Overlay */}
      {showReviews && (
        <div className={`fixed inset-0 z-50 flex flex-col max-w-md mx-auto shadow-2xl animate-fade-in overflow-hidden ${
          isDark ? "bg-[#333333] text-white" : "bg-white text-zinc-900"
        }`}>
          {/* Header */}
          <div className={`relative py-6 px-6 flex items-center justify-between z-20 border-b ${
            isDark ? "border-white/5 bg-[#333333]" : "border-zinc-100 bg-white"
          }`}>
            <button
              onClick={() => setShowReviews(false)}
              className={`w-9 h-9 rounded-full transition-all flex items-center justify-center cursor-pointer active:scale-90 ${
                isDark ? "bg-white/10 text-white hover:bg-white/20" : "bg-zinc-100 text-zinc-800 hover:bg-zinc-200"
              }`}
            >
              <ChevronLeft className="w-5 h-5 stroke-[2.5]" />
            </button>
            <div className={`absolute left-1/2 -translate-x-1/2 font-bold text-base tracking-wide ${isDark ? "text-white" : "text-zinc-950"}`}>
              Sharhlar ({reviewsList.length})
            </div>
            <div className="w-9" />
          </div>

          {/* Review Cards list container */}
          <div className="flex-1 overflow-y-auto px-6 py-6 pb-20 flex flex-col gap-4">
            {reviewsList.map((rev, idx) => (
              <div
                key={idx}
                className={`border rounded-[22px] p-5 relative text-left animate-slide-up ${
                  isDark ? "bg-[#393939] border-white/5 shadow-lg" : "bg-white border-zinc-200 shadow-sm"
                }`}
                style={{ animationDelay: `${idx * 50}ms` }}
              >
                <div className="flex items-center justify-between mb-3.5">
                  <div className="flex items-center gap-3">
                    {/* Avatar */}
                    <div className={`w-9 h-9 rounded-full overflow-hidden shrink-0 border ${
                      isDark ? "border-white/10 bg-zinc-800" : "border-zinc-200 bg-zinc-50"
                    }`}>
                      <img
                        src={rev.avatar}
                        className="w-full h-full object-cover"
                        alt={rev.author}
                      />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className={`text-sm font-bold tracking-wide ${isDark ? "text-white" : "text-zinc-950"}`}>{rev.author}</span>
                        <span className="text-zinc-400 text-[10px]">•</span>
                        <span className={`text-xs ${isDark ? "text-white/50" : "text-zinc-500"}`}>{rev.date}</span>
                        {rev.isVerified && (
                          <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-[4px] font-semibold tracking-wide ml-1">
                            Verified
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  {/* Stars */}
                  <div className="flex items-center gap-0.5 text-[#FFB800]">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <span key={i} className="text-xs">
                        {i < rev.rating ? "★" : "☆"}
                      </span>
                    ))}
                  </div>
                </div>
                {/* Text Body */}
                <p className={`text-xs font-medium leading-relaxed ${isDark ? "text-white/80" : "text-zinc-850"}`}>
                  {rev.text}
                </p>
                {/* Read More button */}
                <div className="flex justify-end mt-2">
                  <button className={`text-[10px] font-bold transition-colors ${
                    isDark ? "text-white/40 hover:text-white/60" : "text-zinc-400 hover:text-zinc-650"
                  }`}>
                    Read More
                  </button>
                </div>
              </div>
            ))}
            <div ref={reviewsEndRef} />
          </div>

          {/* Input panel fixed at bottom of overlay */}
          <div className={`absolute bottom-0 left-0 right-0 px-6 py-4 border-t pb-6 z-10 ${
            isDark ? "bg-[#333333] border-white/5" : "bg-white border-zinc-150"
          }`}>
            <form
              onSubmit={handleSendReview}
              className={`flex items-center rounded-full px-4 py-3.5 gap-3 border transition-all ${
                isDark 
                  ? "bg-[#393939] border-white/5 focus-within:border-[#FF6B00]/40" 
                  : "bg-zinc-100 border-transparent focus-within:bg-zinc-200/50"
              }`}
            >
              <input
                type="text"
                value={newReviewText}
                onChange={(e) => setNewReviewText(e.target.value)}
                placeholder="Yozish"
                className={`flex-1 bg-transparent text-sm outline-none ${
                  isDark ? "text-white placeholder:text-zinc-500" : "text-zinc-950 placeholder:text-zinc-450"
                }`}
              />
              <button
                type="submit"
                disabled={!newReviewText.trim()}
                className="p-1.5 rounded-full bg-transparent text-[#FF6B00] hover:scale-105 active:scale-95 disabled:opacity-40 disabled:scale-100 transition-all shrink-0 flex items-center justify-center cursor-pointer"
              >
                <svg className="w-5.5 h-5.5 fill-current transform rotate-45 -translate-x-[2px] translate-y-[1px]" viewBox="0 0 24 24">
                  <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                </svg>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Partiya Soni & Kun va Vaqt Bottom Sheet Overlay (2-rasm) */}
      {showPartySheet && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end max-w-md mx-auto bg-black/60 backdrop-blur-sm transition-all duration-300">
          <div className="absolute inset-0 z-0" onClick={() => setShowPartySheet(false)} />
          
          <div className={`w-full border-t rounded-t-[36px] px-6 pb-9 pt-4 shadow-2xl relative z-10 flex flex-col gap-6 animate-slide-up select-none ${
            isDark ? "bg-[#393939] border-white/5" : "bg-white border-zinc-150"
          }`}>
            
            <div className={`w-10 h-1.5 rounded-full mx-auto ${isDark ? "bg-white/10" : "bg-zinc-200"}`} />
            
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Partiya sozlamalari</span>
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
              <h3 className={`font-extrabold text-sm ${isDark ? "text-white" : "text-zinc-950"}`}>Partiya soni</h3>
              <div className="flex justify-between items-center gap-3">
                {[1, 2, 3, 4, 5].map((num) => {
                  const isSelected = partySize === num;
                  return (
                    <button
                      key={num}
                      onClick={() => setPartySize(num)}
                      className={`flex-1 py-3 text-base font-extrabold rounded-2xl transition-all cursor-pointer ${
                        isSelected 
                          ? "border border-[#FF5A00] bg-[#FF5A00]/5 text-[#FF5A00] scale-105" 
                          : isDark
                            ? "border border-white/5 bg-zinc-900 text-white"
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
              <h3 className={`font-extrabold text-sm ${isDark ? "text-white" : "text-zinc-950"}`}>Kun va vaqt</h3>
              
              <div className={`grid grid-cols-2 gap-6 py-4 rounded-2xl relative border overflow-hidden h-[120px] select-none ${
                isDark ? "bg-zinc-900/60 border-white/5" : "bg-zinc-50 border-zinc-200"
              }`}>
                {/* Center Highlight Bar overlay */}
                <div className={`absolute top-1/2 -translate-y-1/2 left-4 right-4 h-10 border-y pointer-events-none z-20 ${
                  isDark ? "border-zinc-800" : "border-zinc-250"
                }`} />
                
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
                          isActive 
                            ? isDark ? "text-white scale-110" : "text-black scale-110" 
                            : "text-zinc-400"
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
                          isActive 
                            ? isDark ? "text-white scale-110" : "text-black scale-110" 
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
                setShowLocationSearch(true);
              }}
              className="w-full py-4.5 bg-[#FF5A00] hover:bg-[#E05000] text-white font-extrabold text-sm rounded-[24px] shadow-lg shadow-[#FF5A00]/20 hover:scale-[1.01] active:scale-[0.99] transition-all duration-200 cursor-pointer"
            >
              Izlash
            </button>
          </div>
        </div>
      )}

      {/* Location Search Overlay (2-rasm) */}
      {showLocationSearch && (
        <div className="fixed inset-0 z-50 bg-[var(--background)] flex flex-col max-w-md mx-auto shadow-2xl animate-fade-in overflow-hidden">
          {/* Header Row with Search Input */}
          <div className={`flex items-center gap-3 px-6 py-5 border-b z-30 sticky top-0 ${
            isDark ? "border-white/5 bg-[#333333]" : "border-zinc-100 bg-white"
          }`}>
            <button
              onClick={() => {
                setShowLocationSearch(false);
                setShowPartySheet(true); // go back to bottom sheet
              }}
              className={`p-2.5 rounded-xl transition-all active:scale-90 cursor-pointer ${
                isDark ? "bg-[#393939] border border-white/5 text-white/80 hover:text-white" : "bg-zinc-100 text-zinc-800 hover:bg-zinc-200"
              }`}
            >
              <ChevronLeft className="h-5 w-5" />
            </button>

            {/* Search Input Field */}
            <div className={`flex-1 flex items-center border rounded-2xl overflow-hidden px-4 py-3 transition-all ${
              isDark 
                ? "bg-[#393939] border-white/5 focus-within:border-[#FF6B00]/40" 
                : "bg-zinc-100 border-transparent focus-within:bg-zinc-200/50"
            }`}>
              <Search className={`h-4.5 w-4.5 shrink-0 ${isDark ? "text-zinc-500" : "text-zinc-400"}`} />
              <input
                type="text"
                placeholder="Qidirish"
                className={`w-full bg-transparent border-0 p-0 pl-2.5 text-sm font-bold focus:ring-0 outline-none ${
                  isDark ? "text-white placeholder:text-zinc-650" : "text-zinc-950 placeholder:text-zinc-400"
                }`}
              />
            </div>
          </div>

          {/* Action: Manzilni avtomatik aniqlash */}
          <button
            onClick={() => {
              setToastMessage("Manzil avtomatik aniqlandi: Toshkent shahri");
              setTimeout(() => setToastMessage(""), 3000);
              setTimeout(() => {
                setShowLocationSearch(false);
                router.push(`/booking/${id}?total=${cartTotal}&guests=${partySize}&date=${selectedDay}&time=${selectedTime}&location=Toshkent`);
              }, 1200);
            }}
            className={`w-full px-6 py-5 border-b flex items-center gap-3.5 transition-colors cursor-pointer text-left ${
              isDark ? "border-white/5 hover:bg-white/5 text-white bg-[#333333]" : "border-zinc-100 hover:bg-zinc-50 text-zinc-950 bg-white"
            }`}
          >
            {/* Compass / Navigation Icon */}
            <div className="text-[#FF5A00]">
              <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                <path d="M12 2L2 22l10-4 10 4L12 2z" />
              </svg>
            </div>
            <span className="text-sm font-black">Manzilni avtomatik aniqlash</span>
          </button>

          {/* Section: Oxirgi manzillar */}
          <div className={`flex-1 px-6 py-6 space-y-4 text-left ${isDark ? "bg-[#333333]" : "bg-white"}`}>
            <h3 className="text-sm font-black text-zinc-400 tracking-wide">Oxirgi manzillar</h3>
            
            <div className="space-y-1">
              {[
                { name: "Navoiy shahar, Navoiy" },
                { name: "Mirzo Ulug'bek, Toshkent" }
              ].map((loc, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setToastMessage(`${loc.name} tanlandi`);
                    setTimeout(() => setToastMessage(""), 3000);
                    setTimeout(() => {
                      setShowLocationSearch(false);
                      router.push(`/booking/${id}?total=${cartTotal}&guests=${partySize}&date=${selectedDay}&time=${selectedTime}&location=${encodeURIComponent(loc.name)}`);
                    }, 1000);
                  }}
                  className={`w-full py-4 border-b last:border-b-0 flex items-center gap-3.5 transition-colors cursor-pointer text-left ${
                    isDark ? "border-white/5 hover:bg-white/5 text-white/90" : "border-zinc-100 hover:bg-zinc-50 text-zinc-850"
                  }`}
                >
                  <MapPin className="h-5 w-5 text-zinc-400 shrink-0" />
                  <span className="text-sm font-bold">{loc.name}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
