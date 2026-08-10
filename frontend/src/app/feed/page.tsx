"use client";

import React, { useState, useEffect } from "react";
import {
  ChevronLeft,
  ChevronDown,
  MapPin,
  Phone,
  Clock,
  CheckCircle,
  X,
} from "lucide-react";
import Navbar from "@/components/navbar";
import { useTheme } from "@/components/theme-provider";

export default function FeedPage() {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const [mounted, setMounted] = useState(false);
  const [showLocationSelect, setShowLocationSelect] = useState(false);
  const [currentLocation, setCurrentLocation] = useState("Toshkent");
  
  // Location States
  const [selectedRegion, setSelectedRegion] = useState("");
  const [selectedDistrict, setSelectedDistrict] = useState("");
  const [isRegionDropdownOpen, setIsRegionDropdownOpen] = useState(false);
  const [isDistrictDropdownOpen, setIsDistrictDropdownOpen] = useState(false);
  
  const [toastMessage, setToastMessage] = useState("");

  useEffect(() => {
    setMounted(true);
    const loc = localStorage.getItem("feedLocation") || "Toshkent";
    setCurrentLocation(loc);
  }, []);

  // Dynamic bottom navigation bar visibility controller
  useEffect(() => {
    const bottomNav = document.getElementById("global-bottom-nav");
    if (bottomNav) {
      if (showLocationSelect) {
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
  }, [showLocationSelect]);

  // Toast auto-dismiss helper
  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(""), 3000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  if (!mounted) {
    return <div className="flex flex-col flex-1 bg-[var(--background)] animate-pulse" />;
  }

  const showToast = (msg: string) => {
    setToastMessage(msg);
  };

  const handleConfirmLocation = () => {
    if (selectedRegion && selectedDistrict) {
      const formattedLoc = `${selectedRegion}, ${selectedDistrict.replace(" tumani", "")}`;
      setCurrentLocation(formattedLoc);
      localStorage.setItem("feedLocation", formattedLoc);
      setShowLocationSelect(false);
      showToast("Manzil muvaffaqiyatli tasdiqlandi!");
    }
  };

  const REGIONS = ["Toshkent", "Navoiy", "Samarqand", "Buxoro"];
  const DISTRICTS_MAP: Record<string, string[]> = {
    "Toshkent": ["Yashnobod tumani", "Olmazor tumani", "Mirzo Ulug'bek tumani", "Toshkent shahri", "Yunusobod tumani", "Chilonzor tumani"],
    "Navoiy": ["Navoiy shahri", "Karmana tumani", "Qiziltepa tumani", "Xatirchi tumani", "Nurota tumani"],
    "Samarqand": ["Samarqand shahri", "Bulung'ur tumani", "Jomboy tumani", "Urgut tumani", "Payariq tumani", "Ishtixon tumani"],
    "Buxoro": ["Buxoro shahri", "Gijduvon tumani", "Kogon tumani", "Qorako'l tumani", "Vobkent tumani", "Shofirkon tumani"]
  };
  const districts = selectedRegion ? (DISTRICTS_MAP[selectedRegion] || []) : [];

  return (
    <div
      className={`flex flex-col flex-1 bg-[var(--background)] ${
        isDark ? "text-white" : "text-zinc-900"
      } transition-all duration-300 relative ${
        showLocationSelect ? "-mb-16" : ""
      }`}
    >
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50 px-4 py-2.5 rounded-xl bg-primary text-white text-xs font-bold shadow-xl animate-fade-in flex items-center gap-2 max-w-xs text-center border border-white/20">
          <CheckCircle className="h-4 w-4 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {showLocationSelect ? (
        /* ==================== HIGH-FIDELITY REGISTERED MANZIL (LOCATION SELECT) VIEW ==================== */
        <div className="flex flex-col flex-1 bg-[var(--background)] text-white animate-fade-in">
          {/* Top Bar Header */}
          <div className={`relative flex items-center justify-between px-6 py-5 border-b ${
            isDark ? "border-white/5" : "border-zinc-100"
          }`}>
            <h1 className={`text-xl font-bold tracking-wide ${
              isDark ? "text-white" : "text-zinc-900"
            }`}>Manzil</h1>
            <div className="w-9 h-9" />
          </div>

          {/* Form Content */}
          <main className="flex-1 px-6 py-6 pb-8 flex flex-col justify-between max-w-md mx-auto w-full">
            <div className="space-y-6">
              {/* Qaysi viloyat */}
              <div className="space-y-2 text-left">
                <label className={`block text-xs font-semibold ${isDark ? "text-zinc-400" : "text-zinc-500"}`}>Qaysi viloyat</label>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => {
                      setIsRegionDropdownOpen(!isRegionDropdownOpen);
                      setIsDistrictDropdownOpen(false);
                    }}
                    className={`w-full px-5 py-4 rounded-2xl border text-sm font-semibold flex justify-between items-center outline-none transition-colors ${
                      isDark
                        ? "border-white/5 bg-[#393939] text-white hover:border-white/10"
                        : "border-zinc-200 bg-zinc-100 text-zinc-900 hover:border-zinc-300"
                    }`}
                  >
                    <span>{selectedRegion || "Belgilash"}</span>
                    <ChevronDown
                      className={`h-4.5 w-4.5 transition-transform duration-300 ${
                        isDark ? "text-white/40" : "text-zinc-400"
                      } ${isRegionDropdownOpen ? "rotate-180 text-primary" : ""}`}
                    />
                  </button>

                  {/* Dropdown Menu */}
                  {isRegionDropdownOpen && (
                    <div className={`absolute left-0 right-0 mt-2 z-30 border rounded-2xl shadow-2xl overflow-hidden py-1 max-h-56 overflow-y-auto ${
                      isDark ? "bg-[#393939] border-white/5" : "bg-white border-zinc-200"
                    }`}>
                      {REGIONS.map((region) => (
                        <button
                          key={region}
                          type="button"
                          onClick={() => {
                            setSelectedRegion(region);
                            setSelectedDistrict(""); // Reset district
                            setIsRegionDropdownOpen(false);
                          }}
                          className={`w-full px-5 py-3.5 text-left text-xs font-bold transition-colors border-b last:border-b-0 ${
                            isDark
                              ? "text-white/90 hover:bg-white/5 active:bg-white/10 border-white/5"
                              : "text-zinc-800 hover:bg-zinc-50 active:bg-zinc-100 border-zinc-100"
                          }`}
                        >
                          {region}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Tumanni kiriting */}
              <div className="space-y-2 text-left">
                <label className={`block text-xs font-semibold ${isDark ? "text-zinc-400" : "text-zinc-500"}`}>Tumanni kiriting</label>
                <div className="relative">
                  <button
                    type="button"
                    disabled={!selectedRegion}
                    onClick={() => {
                      setIsDistrictDropdownOpen(!isDistrictDropdownOpen);
                      setIsRegionDropdownOpen(false);
                    }}
                    className={`w-full px-5 py-4 rounded-2xl border text-sm font-semibold flex justify-between items-center outline-none transition-colors ${
                      isDark
                        ? "border-white/5 bg-[#393939] text-white"
                        : "border-zinc-200 bg-zinc-100 text-zinc-900"
                    } ${
                      selectedRegion
                        ? isDark ? "hover:border-white/10 cursor-pointer" : "hover:border-zinc-300 cursor-pointer"
                        : "opacity-40 cursor-not-allowed"
                    }`}
                  >
                    <span>{selectedDistrict || "Belgilash"}</span>
                    <ChevronDown
                      className={`h-4.5 w-4.5 transition-transform duration-300 ${
                        isDark ? "text-white/40" : "text-zinc-400"
                      } ${isDistrictDropdownOpen ? "rotate-180 text-primary" : ""}`}
                    />
                  </button>

                  {/* Dropdown Menu */}
                  {isDistrictDropdownOpen && selectedRegion && (
                    <div className={`absolute left-0 right-0 mt-2 z-30 border rounded-2xl shadow-2xl overflow-hidden py-1 max-h-56 overflow-y-auto ${
                      isDark ? "bg-[#393939] border-white/5" : "bg-white border-zinc-200"
                    }`}>
                      {districts.map((district) => (
                        <button
                          key={district}
                          type="button"
                          onClick={() => {
                            setSelectedDistrict(district);
                            setIsDistrictDropdownOpen(false);
                          }}
                          className={`w-full px-5 py-3.5 text-left text-xs font-bold transition-colors border-b last:border-b-0 ${
                            isDark
                              ? "text-white/90 hover:bg-white/5 active:bg-white/10 border-white/5"
                              : "text-zinc-800 hover:bg-zinc-50 active:bg-zinc-100 border-zinc-100"
                          }`}
                        >
                          {district}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Bottom Button */}
            <div>
              {selectedRegion && selectedDistrict ? (
                <button
                  type="button"
                  onClick={handleConfirmLocation}
                  className="w-full py-4 rounded-2xl bg-[#FF6B00] hover:bg-[#E05000] text-white font-bold text-sm tracking-wide transition-all active:scale-98 shadow-lg shadow-[#FF6B00]/20"
                >
                  Tasdiqlash
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowLocationSelect(false)}
                  className="w-full py-4 rounded-2xl bg-[#FF6B00] hover:bg-[#E05000] text-white font-bold text-sm tracking-wide transition-all active:scale-98 shadow-lg shadow-[#FF6B00]/20"
                >
                  Ortga
                </button>
              )}
            </div>
          </main>
        </div>
      ) : (
        /* ==================== HIGH-FIDELITY REGISTERED BOOKINGS HISTORY VIEW ==================== */
        <div className={`flex flex-col flex-1 bg-[var(--background)] ${isDark ? "text-white" : "text-zinc-900"}`}>
          {/* Top Bar Header */}
          <div className={`relative flex items-center justify-between px-6 py-5 border-b ${
            isDark ? "border-white/5" : "border-zinc-100"
          }`}>
            <h1 className={`text-xl font-bold tracking-wide ${isDark ? "text-white" : "text-zinc-900"}`}>Band qilingan</h1>
            
            {/* Location selector trigger button */}
            <button
              onClick={() => {
                setSelectedRegion("");
                setSelectedDistrict("");
                setIsRegionDropdownOpen(false);
                setIsDistrictDropdownOpen(false);
                setShowLocationSelect(true);
              }}
              className={`flex items-center gap-1.5 text-xs font-semibold active:scale-95 transition-all px-3 py-1.5 rounded-full ${
                isDark
                  ? "text-white/80 bg-white/5 border border-white/5 hover:bg-white/10"
                  : "text-zinc-800 bg-transparent hover:bg-zinc-100"
              }`}
            >
              <MapPin className={`h-4 w-4 shrink-0 ${isDark ? "text-primary" : "text-zinc-700"}`} />
              <span>{currentLocation.split(", ").pop()}</span>
            </button>
          </div>

          {/* Scrollable Bookings List */}
          <main className="flex-1 overflow-y-auto px-6 py-6 pb-10 flex flex-col gap-6 max-w-md mx-auto w-full text-left">
            {[
              { id: "1", showBanner: true },
              { id: "2", showBanner: false }
            ].map((item) => (
              <div
                key={item.id}
                className={`w-full rounded-3xl p-5 flex flex-col gap-4 transition-all duration-300 ${
                  isDark
                    ? "bg-[#393939] border border-white/5 shadow-xl hover:border-white/10"
                    : "bg-white border border-[#FF6B00] shadow-md hover:shadow-lg hover:border-primary/80"
                }`}
              >
                {/* Top Restaurant Detail */}
                <div className="flex items-start gap-4">
                  {/* Rounded restaurant image */}
                  <img
                    src="/images/restaurant.png"
                    alt="Rest One"
                    className={`w-20 h-20 rounded-2xl object-cover shrink-0 border shadow-md ${
                      isDark ? "border-white/5" : "border-zinc-100"
                    }`}
                  />
                  
                  <div className="space-y-1 pr-1 w-full min-w-0">
                    <h2 className={`text-base font-bold tracking-wide truncate ${
                      isDark ? "text-white" : "text-zinc-900"
                    }`}>Rest One</h2>
                    
                    {/* Distance & Status info */}
                    <div className={`flex items-center gap-1.5 text-xs font-medium ${
                      isDark ? "text-white/50" : "text-zinc-500"
                    }`}>
                      <MapPin className="h-3.5 w-3.5 shrink-0 text-zinc-400" />
                      <span>1 km</span>
                      <span className={isDark ? "text-white/20" : "text-zinc-300"}>|</span>
                      <span className="w-1.5 h-1.5 rounded-full bg-[#10B981] shrink-0" />
                      <span className="text-[#10B981] font-bold">Ochiq</span>
                    </div>

                    {/* Phone */}
                    <div className={`flex items-center gap-1.5 text-xs font-medium ${
                      isDark ? "text-white/60" : "text-zinc-600"
                    }`}>
                      <Phone className={`h-3.5 w-3.5 shrink-0 ${isDark ? "text-white/40" : "text-zinc-400"}`} />
                      <span>+998 99 123 45 67</span>
                    </div>

                    {/* Address */}
                    <div className={`flex items-center gap-1.5 text-xs font-medium truncate ${
                      isDark ? "text-white/60" : "text-zinc-600"
                    }`}>
                      <MapPin className={`h-3.5 w-3.5 shrink-0 ${isDark ? "text-white/40" : "text-zinc-400"}`} />
                      <span className="truncate">Umid qo'rg'oni 765 - uy</span>
                    </div>
                  </div>
                </div>

                {/* Horizontal Divider */}
                <hr className={`border-t ${isDark ? "border-white/5" : "border-zinc-100"}`} />

                {/* Booking metadata table */}
                <div className="space-y-2.5 text-xs font-semibold">
                  <div className="flex justify-between items-center">
                    <span className={isDark ? "text-white/40" : "text-zinc-400"}>Holat</span>
                    <span className={`font-bold ${isDark ? "text-white" : "text-zinc-900"}`}>Band qilish tasdiqlandi</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className={isDark ? "text-white/40" : "text-zinc-400"}>Chek raqami:</span>
                    <span className={`font-mono ${isDark ? "text-white/90" : "text-zinc-900"}`}>0789 091172</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className={isDark ? "text-white/40" : "text-zinc-400"}>Belgilandi:</span>
                    <span className={isDark ? "text-white/90" : "text-zinc-900"}>11:00 • 26/02/2024</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className={isDark ? "text-white/40" : "text-zinc-400"}>Stol raqami:</span>
                    <span className={isDark ? "text-white/90" : "text-zinc-900"}>4 - stol</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className={isDark ? "text-white/40" : "text-zinc-400"}>Restoran raqami:</span>
                    <span className={isDark ? "text-white/90" : "text-zinc-900"}>+998 99 123 45 67</span>
                  </div>
                </div>

                {/* Bottom orange banner with clock for Card 1 */}
                {item.showBanner && (
                  <div className={`w-full rounded-2xl py-3.5 px-4 flex items-center justify-between text-sm font-bold ${
                    isDark 
                      ? "bg-[#FF6B00] text-white shadow-md animate-pulse" 
                      : "bg-white border border-[#FF6B00] text-[#FF6B00]"
                  }`}>
                    <span className={isDark ? "text-white" : "text-[#FF6B00] opacity-80 font-medium"}>Qoldi:</span>
                    <div className="flex items-center gap-2">
                      <Clock className={`h-4.5 w-4.5 shrink-0 ${isDark ? "text-white" : "text-[#FF6B00]"}`} />
                      <span>2 soat 25 daqiqa</span>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </main>
        </div>
      )}
    </div>
  );
}

