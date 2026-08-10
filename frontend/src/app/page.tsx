"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  Search,
  SlidersHorizontal,
  Star,
  MapPin,
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
} from "lucide-react";
import Navbar from "@/components/navbar";
import { useTheme } from "@/components/theme-provider";

export default function WelcomePage() {
  const [mounted, setMounted] = useState(false);
  const [isRegistered, setIsRegistered] = useState(true);
  const [fullName, setFullName] = useState("Shahzod");
  const [activeTab, setActiveTab] = useState("Umumiy");
  const [currentSlide, setCurrentSlide] = useState(0);
  const [showBookingSuccessToast, setShowBookingSuccessToast] = useState(false);
  const { theme, toggleTheme } = useTheme();

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

  const BANNERS = [
    "/images/home/adv1.png",
    "/images/home/top.png",
    "/images/home/tuyxona2.png",
    "/images/home/tuyxona3.png"
  ];

  useEffect(() => {
    setMounted(true);
    const registered = localStorage.getItem("isRegistered");
    if (registered === "false") {
      setIsRegistered(false);
    } else {
      setIsRegistered(true);
      setFullName(localStorage.getItem("fullName") || "Shahzod");
      localStorage.setItem("isRegistered", "true");
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

  // Automatic slide interval for best offers carousel
  useEffect(() => {
    if (!isRegistered) return;
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % BANNERS.length);
    }, 3500);
    return () => clearInterval(interval);
  }, [isRegistered]);

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

  const horizontalTabs = ["Umumiy", "Restoranlar", "To'yxonalar"];

  return (
    <div className="flex flex-col flex-1 bg-[var(--background)] text-foreground transition-colors duration-300 relative">
      {isRegistered ? (
        /* ==================== HIGH-FIDELITY REGISTERED ASOSIY (HOME) VIEW ==================== */
        <div className="flex flex-col flex-1 min-h-screen bg-white dark:bg-[var(--background)]">
          {/* Header Row */}
          <div className={`flex items-center justify-between px-6 transition-all duration-200 ${
            theme === "dark" 
              ? "py-5 border-b border-brand-dark-border" 
              : "pt-6 pb-2"
          }`}>
            <h1 className={`text-xl font-extrabold tracking-tight ${
              theme === "dark" ? "text-white" : "text-zinc-900"
            }`}>
              Hayrli kun! {fullName}
            </h1>
            
            <div className="flex items-center gap-2">
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

              {theme === "dark" ? (
                /* Original Voucher button for dark mode */
                <Link
                  href="/tickets"
                  className="p-2.5 rounded-xl bg-[#393939] border border-white/5 text-white/80 hover:text-white transition-all active:scale-95 flex items-center justify-center"
                >
                  <Ticket className="h-5 w-5" />
                </Link>
              ) : (
                /* Bookmark button for light mode */
                <button
                  type="button"
                  className="p-2.5 rounded-2xl bg-white border border-zinc-200 text-zinc-800 hover:text-primary transition-all active:scale-95 flex items-center justify-center cursor-pointer shadow-sm"
                  aria-label="Bookmarks"
                >
                  <Bookmark className="h-5 w-5" />
                </button>
              )}
            </div>
          </div>

          {/* Main Scrollable Area */}
          <main className={`flex-1 overflow-y-auto px-6 pb-8 flex flex-col gap-6 max-w-md mx-auto w-full text-left ${theme === "dark" ? "py-6" : "py-4"}`}>
            
            {/* Search Input and Filter Button */}
            <div className="flex items-center gap-3">
              {/* Search Field */}
              <div className={`flex-1 relative flex items-center rounded-2xl overflow-hidden transition-all duration-300 ${
                theme === "dark" 
                  ? "bg-[#393939] border border-white/5 focus-within:border-primary/50" 
                  : "bg-zinc-100 border border-transparent focus-within:ring-2 focus-within:ring-primary/20"
              }`}>
                <span className={`pl-4 ${theme === "dark" ? "text-white/40" : "text-zinc-400"}`}>
                  <Search className="h-5 w-5" />
                </span>
                <input
                  type="text"
                  placeholder="Qidirish"
                  className={`w-full pl-3 pr-4 py-3.5 bg-transparent text-sm font-medium outline-none ${
                    theme === "dark" 
                      ? "text-white placeholder:text-white/30" 
                      : "text-zinc-800 placeholder:text-zinc-400"
                  }`}
                />
              </div>

              {/* Orange Slider/Filter Button */}
              <button
                type="button"
                onClick={() => setShowPartySheet(true)}
                className={`bg-[#FF6B00] hover:bg-[#E05000] text-white rounded-2xl shadow-lg shadow-[#FF6B00]/20 transition-all active:scale-95 flex items-center justify-center cursor-pointer ${
                  theme === "dark" ? "p-4" : "p-3.5"
                }`}
              >
                <SlidersHorizontal className="h-5 w-5" />
              </button>
            </div>

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
                        ? (theme === "dark" 
                            ? "bg-primary text-white border-primary shadow-lg shadow-primary/10" 
                            : "bg-primary text-white border-primary shadow-md")
                        : (theme === "dark" 
                            ? "bg-[#393939] border-white/5 text-white/60 hover:text-white" 
                            : "bg-white border-zinc-200 text-zinc-800 hover:text-zinc-900")
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
                <h2 className={`text-base font-extrabold tracking-tight ${theme === "dark" ? "text-white" : "text-zinc-900"}`}>Eng yaxshi takliflar</h2>
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
                <div className={`w-full aspect-[2.1/1] rounded-[28px] overflow-hidden border shadow-lg relative ${
                  theme === "dark" ? "bg-[#393939] border-white/5" : "bg-white border-zinc-100"
                }`}>
                  {BANNERS.map((banner, index) => {
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
                  {BANNERS.map((_, index) => {
                    const isActive = currentSlide === index;
                    return (
                      <button
                        key={index}
                        type="button"
                        onClick={() => setCurrentSlide(index)}
                        className={`h-1.5 rounded-full transition-all duration-300 cursor-pointer ${
                          isActive 
                            ? "w-4 bg-primary" 
                            : (theme === "dark" 
                                ? "w-1.5 bg-white/20 hover:bg-white/40" 
                                : "w-1.5 bg-zinc-300 hover:bg-zinc-400")
                        }`}
                      />
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Section: Top Restoranlar */}
            <div className="space-y-4">
              <div className="flex justify-between items-center pr-1">
                <h2 className={`text-base font-extrabold tracking-tight ${theme === "dark" ? "text-white" : "text-zinc-900"}`}>Top Restoranlar</h2>
                <Link 
                  href="/feed" 
                  className={`text-xs font-bold hover:underline transition-colors ${
                    theme === "dark" ? "text-white/40" : "text-[#FF6B00]"
                  }`}
                >
                  Barchasini ko'rish
                </Link>
              </div>

              {/* Large Full-Width Restaurant Card */}
              <Link
                href="/venue/3"
                className={`w-full border rounded-3xl flex flex-col gap-4 shadow-lg transition-all block text-left ${
                  theme === "dark" 
                    ? "bg-[#393939] border-white/5 p-5 hover:border-white/10" 
                    : "bg-white border-zinc-100 p-4 hover:border-zinc-200"
                }`}
              >
                {/* Visual Image Display */}
                <div className={`w-full h-44 rounded-2xl overflow-hidden relative border ${
                  theme === "dark" ? "border-white/5" : "border-zinc-100"
                }`}>
                  <img
                    src="/images/home/top.png"
                    alt="Rest One"
                    className="w-full h-full object-cover"
                  />
                </div>

                {/* Restaurant details */}
                <div className="space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className={`text-base font-extrabold tracking-tight ${theme === "dark" ? "text-white" : "text-zinc-900"}`}>Rest One</h3>
                      <div className="flex items-center gap-1 text-xs text-green-600 font-bold pt-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                        <span>Ochiq</span>
                      </div>
                    </div>

                    {/* Star Rating */}
                    <div className={`flex items-center gap-1 text-xs font-bold text-[#FFB800] border px-2.5 py-1 rounded-xl ${
                      theme === "dark" ? "bg-white/5 border-white/5" : "bg-yellow-500/5 border-yellow-500/10"
                    }`}>
                      <Star className="h-3.5 w-3.5 fill-[#FFB800] text-[#FFB800]" />
                      <span>4.8 (356 ta sharh)</span>
                    </div>
                  </div>

                  {/* Metadata Row */}
                  <div className="flex justify-between items-center">
                    <div className={`flex items-center gap-1.5 text-xs font-bold ${theme === "dark" ? "text-white/60" : "text-zinc-500"}`}>
                      <Compass className="h-4 w-4 text-zinc-400 dark:text-white/40" />
                      <span>1 km uzoqda</span>
                    </div>

                    {/* Deposit green badge */}
                    <div className={`flex items-center gap-1 font-bold rounded-lg px-2.5 py-1 text-[10px] uppercase tracking-wider transition-colors ${
                      theme === "dark" 
                        ? "bg-green-500/10 border border-green-500/20 text-[#10B981]" 
                        : "bg-[#10B981] text-white shadow-sm"
                    }`}>
                      <Wallet className="h-3.5 w-3.5 shrink-0" />
                      <span>Depozitlik</span>
                    </div>
                  </div>

                  {/* Address */}
                  <div className={`flex items-center gap-1.5 text-xs font-semibold truncate pt-0.5 ${
                    theme === "dark" ? "text-white/50" : "text-zinc-500"
                  }`}>
                    <MapPin className="h-4 w-4 text-zinc-400 dark:text-white/30 shrink-0" />
                    <span className="truncate">O'zbekiston ko'chasi 27 - uy</span>
                  </div>
                </div>
              </Link>
            </div>

            {/* 2x2 Grid of Restaurants */}
            <div className="grid grid-cols-2 gap-4">
              {[
                { id: "1", name: "Sayqal", img: "/images/home/tuyxona1.png", rating: "4.8" },
                { id: "2", name: "Tinchlik", img: "/images/home/tuyxona2.png", rating: "4.8" },
                { id: "4", name: "Panorama", img: "/images/home/tuyxona3.png", rating: "4.8" },
                { id: "5", name: "Sharqona", img: "/images/home/tuyxona4.png", rating: "4.8" }
              ].map((card) => (
                <div
                  key={card.id}
                  className={`border rounded-3xl p-3 flex flex-col gap-3 shadow-md text-left relative ${
                    theme === "dark" ? "bg-[#393939] border-white/5 shadow-lg" : "bg-white border-zinc-100"
                  }`}
                >
                  {/* Image Viewport */}
                  <div className={`w-full aspect-[1.1/1] rounded-2xl overflow-hidden relative border ${
                    theme === "dark" ? "bg-zinc-800 border-white/5" : "bg-zinc-100 border-zinc-100"
                  }`}>
                    <img
                      src={card.img}
                      alt={card.name}
                      className="w-full h-full object-cover"
                    />
                  </div>

                  {/* Info details */}
                  <div className="space-y-2 pr-0.5">
                    <div className="flex items-center justify-between gap-1">
                      <h4 className={`text-xs font-bold tracking-wide truncate ${theme === "dark" ? "text-white" : "text-zinc-950"}`}>{card.name}</h4>
                      <div className="flex items-center gap-0.5 text-[10px] font-bold text-[#FFB800] shrink-0">
                        <Star className="h-3 w-3 fill-[#FFB800] text-[#FFB800]" />
                        <span>{card.rating}</span>
                      </div>
                    </div>

                    {/* Distance & Status info */}
                    <div className={`flex items-center gap-1 text-[10px] font-bold leading-none ${theme === "dark" ? "text-white/50" : "text-zinc-500"}`}>
                      <Compass className="h-3 w-3 text-zinc-400 dark:text-white/30 shrink-0" />
                      <span>2 km</span>
                      <span className="opacity-20">|</span>
                      <span className="text-[#10B981]">Ochiq</span>
                    </div>

                    {/* Address */}
                    <div className={`flex items-center gap-1 text-[10px] font-semibold truncate leading-none ${theme === "dark" ? "text-white/40" : "text-zinc-400"}`}>
                      <MapPin className="h-3 w-3 text-zinc-400 dark:text-white/20 shrink-0" />
                      <span className="truncate">Umid qo'rg'...</span>
                    </div>

                    {/* View Button */}
                    <Link
                      href={`/venue/${card.id}`}
                      className={`w-full py-2 text-[10px] font-bold rounded-full flex items-center justify-center gap-1 active:scale-95 transition-all shadow-md mt-1 ${
                        theme === "dark" 
                          ? "bg-white text-zinc-950 hover:bg-zinc-100" 
                          : "bg-[#FF6B00] text-white hover:bg-[#E05000]"
                      }`}
                    >
                      <span>Ko'rish</span>
                      <ArrowRight className={`h-3 w-3 stroke-[3] ${theme === "dark" ? "text-zinc-950" : "text-white"}`} />
                    </Link>
                  </div>
                </div>
              ))}
            </div>

          </main>
        </div>
      ) : (
        /* ==================== ORIGINAL WELCOME ONBOARDING VIEW ==================== */
        <div className="flex flex-col flex-1 relative">
          {/* Floating Theme Toggle Button for Onboarding screen */}
          <div className="absolute top-5 right-5 z-50">
            <button
              type="button"
              onClick={toggleTheme}
              className="p-2.5 rounded-xl bg-white/10 dark:bg-black/20 border border-white/20 backdrop-blur-md text-white hover:bg-white/20 transition-all active:scale-95 flex items-center justify-center cursor-pointer shadow-lg"
              aria-label="Toggle theme"
            >
              {theme === "dark" ? <Sun className="h-5 w-5 text-orange-400 animate-scale-up" /> : <Moon className="h-5 w-5 text-white animate-scale-up" />}
            </button>
          </div>

          <Navbar />

          <main className="flex-1">
            <section 
              className="relative overflow-hidden py-24 lg:py-36 bg-cover bg-center"
              style={{ backgroundImage: "url('/images/onboarding_bg.jpg')" }}
            >
              {/* Glassmorphic dark gradient overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/75 to-black/60 backdrop-blur-[3px]" />

              <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative z-10 text-center text-white">
                {/* Tagline */}
                <div className="inline-flex items-center gap-1.5 rounded-full bg-primary/20 border border-primary/30 px-4 py-1.5 text-sm font-bold text-primary mb-6 animate-pulse backdrop-blur-md">
                  🎉 Yangi Avlod Marosim Platformasi
                </div>

                {/* Title */}
                <h1 className="text-4xl font-extrabold tracking-tight sm:text-6xl max-w-4xl mx-auto leading-tight sm:leading-none text-white">
                  Bazmlarni oson{" "}
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-orange-400">
                    rejalashtiring!
                  </span>
                </h1>

                {/* Subtext */}
                <p className="mt-6 text-lg sm:text-xl text-white/80 max-w-2xl mx-auto leading-relaxed">
                  Qidiruv va oson band qilish uchun ilovadan ro'yxatdan o'ting. To'yxonalar, shinam restoranlar va katering xizmatlarini birgina bosish orqali band qiling!
                </p>

                {/* CTAs */}
                <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
                  <Link
                    href="/login"
                    className="w-full sm:w-auto inline-flex items-center justify-center rounded-2xl bg-primary px-8 py-4 text-base font-bold text-white shadow-xl shadow-primary/30 hover:bg-primary-hover hover:scale-[1.02] transition-all duration-200"
                  >
                    Ro'yxatdan o'tish
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      className="ml-2 h-5 w-5"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
                    </svg>
                  </Link>
                  <Link
                    href="/feed"
                    className="w-full sm:w-auto inline-flex items-center justify-center rounded-2xl bg-white/10 border border-white/20 backdrop-blur-md px-8 py-4 text-base font-bold text-white hover:bg-white/20 hover:scale-[1.02] transition-all duration-200"
                  >
                    Zallarni Ko'rish
                  </Link>
                </div>
              </div>
            </section>

            {/* Feature/Category Section */}
            <section className="py-16 bg-foreground/3 dark:bg-white/3">
              <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                <div className="text-center max-w-2xl mx-auto mb-12">
                  <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
                    Biz nimalarni taklif qilamiz?
                  </h2>
                  <p className="mt-4 text-foreground/70">
                    Sizning barcha shodiyonalaringiz va bayramlaringiz uchun mukammal yechimlar.
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
                  {welcomeCategories.map((cat, idx) => (
                    <div
                      key={idx}
                      className="group relative rounded-3xl bg-brand-light-card dark:bg-brand-dark-card border border-brand-light-border dark:border-brand-dark-border p-6 shadow-sm hover:shadow-md hover:border-primary/50 dark:hover:border-primary/50 transition-all duration-300 hover:-translate-y-1"
                    >
                      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-3xl mb-5 group-hover:scale-110 transition-transform duration-300">
                        {cat.icon}
                      </div>
                      <h3 className="text-xl font-bold mb-2 text-foreground group-hover:text-primary transition-colors duration-200">
                        {cat.title}
                      </h3>
                      <p className="text-sm text-foreground/60 mb-4">{cat.desc}</p>
                      <span className="inline-flex items-center rounded-lg bg-foreground/5 dark:bg-white/5 px-2.5 py-1 text-xs font-bold text-primary">
                        {cat.count}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            {/* Dynamic Interactive Features Mockup */}
            <section className="py-20 overflow-hidden">
              <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                <div className="rounded-3xl bg-gradient-to-br from-primary/20 via-orange-500/5 to-transparent border border-primary/20 p-8 sm:p-12 lg:p-16 flex flex-col lg:flex-row items-center gap-12">
                  <div className="flex-1 text-center lg:text-left">
                    <span className="text-xs font-bold uppercase tracking-widest text-primary">
                      Premium interfeys va qulaylik
                    </span>
                    <h2 className="text-3xl font-extrabold tracking-tight sm:text-5xl mt-3 text-foreground">
                      Hamma narsa bir joyda
                    </h2>
                    <p className="mt-4 text-base sm:text-lg text-foreground/75 leading-relaxed">
                      Ilovadan foydalanib, marosimingizning sanasini tekshiring, interfaol kalendardan bo'sh kunlarni ko'ring, to'lovlarni amalga oshiring va kirish chiptasini (QR kod) qo'lga kiriting. Ortiqcha ovvoragarchiliklarsiz, ishonchli band qiling!
                    </p>
                    <div className="mt-8 flex flex-wrap justify-center lg:justify-start gap-6">
                      <div className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-primary" />
                        <span className="text-sm font-semibold text-foreground/80">Tezkor bron</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-primary" />
                        <span className="text-sm font-semibold text-foreground/80">Xavfsiz to'lov</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-primary" />
                        <span className="text-sm font-semibold text-foreground/80">QR chipta</span>
                      </div>
                    </div>
                  </div>

                  {/* Decorative design graphic */}
                  <div className="flex-1 w-full max-w-md relative animate-float">
                    <div className="rounded-3xl bg-brand-light-card dark:bg-brand-dark-card border border-brand-light-border dark:border-brand-dark-border shadow-2xl p-6 relative z-10">
                      <div className="flex items-center justify-between border-b border-brand-light-border dark:border-brand-dark-border pb-4 mb-4">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center text-xl">
                            👑
                          </div>
                          <div>
                            <h4 className="font-bold text-foreground text-sm">Oltin Saroy To'yxonasi</h4>
                            <p className="text-xs text-foreground/50">Toshkent sh., Yunusobod</p>
                          </div>
                        </div>
                        <span className="text-sm font-bold text-primary">★★★★★ 4.9</span>
                      </div>
                      <div className="h-40 rounded-2xl bg-gradient-to-r from-primary/30 to-orange-500/20 flex items-center justify-center text-5xl mb-4">
                        🎉
                      </div>
                      <div className="flex items-center justify-between text-xs text-foreground/60 mb-4">
                        <span>Sig'imi: 500 kishi</span>
                        <span>Narxi: 12,000,000 UZS dan</span>
                      </div>
                      <Link
                        href="/feed"
                        className="block w-full text-center py-2.5 rounded-xl bg-primary text-white font-bold hover:bg-primary-hover transition-colors duration-200 text-sm"
                      >
                        Hozir Bron Qilish
                      </Link>
                    </div>
                    {/* Decorative glowing blur */}
                    <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full scale-90 -z-10" />
                  </div>
                </div>
              </div>
            </section>
          </main>

          {/* Footer */}
          <footer className="border-t border-brand-light-border dark:border-brand-dark-border py-8 text-center text-sm text-foreground/50">
            <p>© 2026 BAZMLY. Barcha huquqlar himoyalangan.</p>
          </footer>
        </div>
      )}

      {showBookingSuccessToast && (
        <div className="fixed bottom-24 left-1/2 transform -translate-x-1/2 z-[100] px-5 py-3 rounded-2xl bg-[#FF6B00] text-white text-xs font-black shadow-2xl flex items-center gap-2 border border-white/20 animate-bounce select-none">
          <CheckCircle className="h-4.5 w-4.5 shrink-0" />
          <span>Joyingiz band qilindi</span>
        </div>
      )}

      {/* Partiya Soni & Kun va Vaqt Bottom Sheet Overlay (2-rasm) */}
      {showPartySheet && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end max-w-md mx-auto bg-black/60 backdrop-blur-sm transition-all duration-300">
          <div className="absolute inset-0 z-0" onClick={() => setShowPartySheet(false)} />
          
          <div className="w-full bg-brand-light-card dark:bg-[#393939] border-t border-brand-light-border dark:border-white/5 rounded-t-[36px] px-6 pb-9 pt-4 shadow-2xl relative z-10 flex flex-col gap-6 animate-slide-up select-none">
            
            <div className="w-10 h-1.5 bg-foreground/10 dark:bg-white/10 rounded-full mx-auto" />
            
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-foreground/50 dark:text-zinc-500 uppercase tracking-widest">Partiya sozlamalari</span>
              <button 
                onClick={() => setShowPartySheet(false)}
                className="w-8 h-8 rounded-full bg-foreground/5 dark:bg-white/5 flex items-center justify-center text-foreground/60 dark:text-zinc-400 hover:text-[#FF6B00] dark:hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3.5 text-left">
              <h3 className="font-extrabold text-sm text-foreground dark:text-white">Partiya soni</h3>
              <div className="flex justify-between items-center gap-3">
                {[1, 2, 3, 4, 5].map((num) => {
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
                {/* Center Highlight Bar overlay */}
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
                setShowLocationSearch(true);
              }}
              className="w-full py-4.5 bg-[#FF6B00] hover:bg-[#E05000] text-white font-extrabold text-sm rounded-[24px] shadow-lg shadow-[#FF6B00]/20 hover:scale-[1.01] active:scale-[0.99] transition-all duration-200"
            >
              Izlash
            </button>
          </div>
        </div>
      )}

      {/* Location Search Overlay (2-rasm) */}
      {showLocationSearch && (
        <div className="fixed inset-0 z-50 bg-brand-light-surface dark:bg-[var(--background)] flex flex-col max-w-md mx-auto shadow-2xl animate-fade-in text-foreground dark:text-white select-none">
          {/* Header Row with Search Input */}
          <div className="flex items-center gap-3 px-6 py-5 border-b border-brand-light-border dark:border-white/5 bg-brand-light-surface dark:bg-[var(--background)] z-30 sticky top-0">
            <button
              onClick={() => {
                setShowLocationSearch(false);
                setShowPartySheet(true); // go back to bottom sheet
              }}
              className="p-2.5 rounded-xl bg-brand-light-card dark:bg-[#393939] border border-brand-light-border dark:border-white/5 text-foreground/80 dark:text-white/80 hover:text-white transition-all active:scale-90"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>

            {/* Search Input Field */}
            <div className="flex-1 flex items-center bg-brand-light-card dark:bg-[#393939] border border-brand-light-border dark:border-white/5 rounded-2xl overflow-hidden focus-within:border-[#FF6B00]/40 transition-all px-4 py-3">
              <Search className="h-4.5 w-4.5 text-foreground/40 dark:text-zinc-500 shrink-0" />
              <input
                type="text"
                placeholder="Qidirish"
                className="w-full bg-transparent border-0 p-0 pl-2.5 text-sm font-bold text-foreground dark:text-white focus:ring-0 outline-none placeholder:text-foreground/30 dark:placeholder:text-zinc-600"
              />
            </div>
          </div>

          {/* Action: Manzilni avtomatik aniqlash */}
          <button
            onClick={() => {
              setShowLocationSearch(false);
              window.location.href = `/venue/3?guests=${partySize}&date=${selectedDay}&time=${selectedTime}&location=Toshkent`;
            }}
            className="w-full px-6 py-5 border-b border-brand-light-border dark:border-white/5 flex items-center gap-3.5 hover:bg-foreground/5 dark:hover:bg-white/5 transition-colors cursor-pointer text-left"
          >
            {/* Compass / Navigation Icon */}
            <div className="text-[#FF6B00]">
              <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                <path d="M12 2L2 22l10-4 10 4L12 2z" />
              </svg>
            </div>
            <span className="text-sm font-black text-foreground dark:text-white">Manzilni avtomatik aniqlash</span>
          </button>

          {/* Section: Oxirgi manzillar */}
          <div className="flex-1 px-6 py-6 space-y-4 text-left">
            <h3 className="text-sm font-black text-foreground/40 dark:text-zinc-400 tracking-wide">Oxirgi manzillar</h3>
            
            <div className="space-y-1">
              {[
                { name: "Navoiy shahar, Navoiy" },
                { name: "Mirzo Ulug'bek, Toshkent" }
              ].map((loc, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setShowLocationSearch(false);
                    window.location.href = `/venue/3?guests=${partySize}&date=${selectedDay}&time=${selectedTime}&location=${encodeURIComponent(loc.name)}`;
                  }}
                  className="w-full py-4 border-b border-brand-light-border dark:border-white/5 last:border-b-0 flex items-center gap-3.5 hover:bg-foreground/5 dark:hover:bg-white/5 transition-colors cursor-pointer text-left"
                >
                  <MapPin className="h-5 w-5 text-foreground/30 dark:text-zinc-500 shrink-0" />
                  <span className="text-sm font-bold text-foreground/90 dark:text-white/90">{loc.name}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
