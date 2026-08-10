"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { X, ChevronLeft, CheckCircle, Aperture, AlertCircle } from "lucide-react";

import { useTheme } from "@/components/theme-provider";

export default function BottomNav() {
  const pathname = usePathname();
  const { theme } = useTheme();
  const [isRegistered, setIsRegistered] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const checkRegistration = () => {
      setIsRegistered(localStorage.getItem("isRegistered") === "true");
    };
    checkRegistration();
    window.addEventListener("isRegisteredChange", checkRegistration);
    return () => {
      window.removeEventListener("isRegisteredChange", checkRegistration);
    };
  }, []);

  useEffect(() => {
    if (mounted) {
      setIsRegistered(localStorage.getItem("isRegistered") === "true");
    }
  }, [pathname, mounted]);

  const isHiddenRoute = 
    pathname.startsWith("/venue/") ||
    pathname.startsWith("/booking/") ||
    pathname.startsWith("/payment/") ||
    pathname.startsWith("/payment-success") ||
    pathname.startsWith("/admin") ||
    (pathname.startsWith("/login") && mounted && !isRegistered) ||
    (pathname === "/" && mounted && !isRegistered);

  useEffect(() => {
    if (!mounted) return;
    const parentFrame = document.getElementById("global-bottom-nav")?.parentElement;
    if (parentFrame) {
      if (isHiddenRoute) {
        parentFrame.classList.remove("pb-20");
      } else {
        parentFrame.classList.add("pb-20");
      }
    }
    return () => {
      if (parentFrame) {
        parentFrame.classList.add("pb-20");
      }
    };
  }, [pathname, isHiddenRoute, mounted]);

  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<string | null>(null);
  const [loadingScan, setLoadingScan] = useState(false);
  const [scanState, setScanState] = useState<"scanning" | "permission" | "my_qr">("permission");

  // Real Camera Streaming Refs and States
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);

  // Triggered when Scan button is clicked
  const handleScanClick = () => {
    setIsScanning(true);
    setScanResult(null);
    setLoadingScan(true);
    setScanState("permission"); // Always start with permission check screen

    // Simulate scanning/decoding delay of 2.8 seconds
    setTimeout(() => {
      setLoadingScan(false);
      setScanResult("BZ-90214"); // Simulated valid ticket ID
    }, 2800);
  };

  // Camera stream activation and release effect
  useEffect(() => {
    let activeStream: MediaStream | null = null;

    if (isScanning && scanState === "scanning" && !scanResult) {
      // Request access to rear environment camera
      navigator.mediaDevices
        .getUserMedia({
          video: {
            facingMode: "environment",
            width: { ideal: 640 },
            height: { ideal: 640 },
          },
          audio: false,
        })
        .then((stream) => {
          activeStream = stream;
          setMediaStream(stream);
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            videoRef.current.play().catch((err) => console.log("Video play error:", err));
          }
        })
        .catch((err) => {
          console.warn("Camera blocked or unavailable, falling back to simulation:", err);
        });
    }

    return () => {
      // Stop all tracks to release camera hardware immediately on close or success
      if (activeStream) {
        activeStream.getTracks().forEach((track) => track.stop());
      }
      if (mediaStream) {
        mediaStream.getTracks().forEach((track) => track.stop());
      }
      setMediaStream(null);
    };
  }, [isScanning, scanState, scanResult]);

  const closeScanner = () => {
    // Release camera tracks
    if (mediaStream) {
      mediaStream.getTracks().forEach((track) => track.stop());
      setMediaStream(null);
    }
    setIsScanning(false);
    setScanResult(null);
    setLoadingScan(false);
    setScanState("permission");
  };

  // 5 navigation items including the central Scan button
  const navItems = [
    {
      name: "Asosiy",
      path: "/",
      icon: "/logo-loading.png",
      isActive: pathname === "/",
      isAction: false,
    },
    {
      name: "Voucher",
      path: "/tickets",
      icon: "/icons/discount-shape.png",
      isActive: pathname.startsWith("/tickets") || pathname.startsWith("/payment-success"),
      isAction: false,
    },
    {
      name: "Skaner",
      path: "#scan",
      icon: "/icons/scan-barcode.png",
      isActive: isScanning,
      isAction: true,
      action: handleScanClick,
    },
    {
      name: "Joylar",
      path: "/feed",
      icon: "/icons/receipt.png",
      isActive: pathname.startsWith("/feed") || pathname.startsWith("/venue") || pathname.startsWith("/booking") || pathname.startsWith("/payment"),
      isAction: false,
    },
    {
      name: "Profilim",
      path: "/login",
      icon: "/icons/user.png",
      isActive: pathname.startsWith("/login"),
      isAction: false,
    },
  ];

  // Derive the active index dynamically based on routes and scanner state
  const getActiveIndex = () => {
    if (isScanning) return 2;
    if (pathname === "/") return 0;
    if (pathname.startsWith("/tickets") || pathname.startsWith("/payment-success")) return 1;
    if (pathname.startsWith("/feed") || pathname.startsWith("/venue") || pathname.startsWith("/booking") || pathname.startsWith("/payment")) return 3;
    if (pathname.startsWith("/login")) return 4;
    return 0; // default to Asosiy
  };

  const activeIdx = getActiveIndex();

  // Coordinates are locked to 200 to keep the notch centered on the Scanner
  const cX = 200;

  // Silliq tushuvchi (bell-curve) oyiq path formula driven by active index cX
  // Increased gap width (58) and depth (79) to make the space around the button perfectly spacious
  const getDynamicPath = (center: number) => {
    return `M0,15 
            L${center - 58},15 
            C${center - 40},15 ${center - 36},33 ${center - 28},49 
            C${center - 15},79 ${center + 15},79 ${center + 28},49 
            C${center + 36},33 ${center + 40},15 ${center + 58},15 
            L400,15 
            L400,95 
            L0,95 
            Z`;
  };

  // Perfectly symmetrical top border path with slightly wider/deeper spacing
  const getTopBorderPath = (center: number) => {
    return `M0,15 
            L${center - 58},15 
            C${center - 40},15 ${center - 36},33 ${center - 28},49 
            C${center - 15},79 ${center + 15},79 ${center + 28},49 
            C${center + 36},33 ${center + 40},15 ${center + 58},15 
            L400,15`;
  };

  if (isHiddenRoute) {
    return <div id="global-bottom-nav" className="hidden" />;
  }

  const isDark = theme === "dark";

  return (
    <>
      {/* Dynamic Sliding Bottom Bar Container */}
      <div id="global-bottom-nav" className="fixed bottom-0 left-0 right-0 z-50 h-[85px] max-w-md mx-auto transition-all duration-300">
        
        {/* Dynamic Curved SVG Background with sliding notch */}
        <svg
          className={`absolute inset-0 w-full h-[95px] pointer-events-none transition-all duration-300 ${
            isDark ? "drop-shadow-[0_-4px_15px_rgba(0,0,0,0.5)]" : "drop-shadow-[0_-4px_10px_rgba(0,0,0,0.06)]"
          }`}
          viewBox="0 0 400 95"
          preserveAspectRatio="none"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Main dynamic path that morphs smoothly */}
          <path
            d={getDynamicPath(cX)}
            fill={isDark ? "#333333" : "#FFFFFF"}
            className="transition-all duration-300 ease-out"
          />
          {/* Top dynamic border path that morphs smoothly */}
          <path
            d={getTopBorderPath(cX)}
            fill="none"
            stroke={isDark ? "#404040" : "#E5E7EB"}
            strokeWidth="1.5"
            className="transition-all duration-300 ease-out"
          />
        </svg>

        {/* Content Navigation Actions Layer */}
        <div className="absolute inset-0 flex justify-between items-center px-2 z-10 pt-4">
          
          {navItems.map((item, index) => {
            const isCenterFAB = index === 2;
            const isActive = index === activeIdx;

            // Compute icon class dynamically based on theme and active state
            let iconClass = "h-5 w-5 object-contain transition-all duration-300 ease-out ";
            if (isCenterFAB) {
              iconClass += "opacity-0 scale-50 pointer-events-none translate-y-4";
            } else if (isDark) {
              if (isActive) {
                iconClass += "brightness-0 invert opacity-100";
              } else {
                iconClass += "brightness-0 invert opacity-40 hover:opacity-75";
              }
            } else {
              if (isActive) {
                iconClass += "filter-primary opacity-100";
              } else {
                iconClass += "brightness-0 opacity-40 hover:opacity-75";
              }
            }

            // Compute text class dynamically based on theme and active state
            let textClass = "text-[11px] font-bold transition-all duration-300 ease-out ";
            if (isCenterFAB) {
              textClass += "opacity-0 scale-50 pointer-events-none translate-y-4";
            } else if (isDark) {
              if (isActive) {
                textClass += "text-white";
              } else {
                textClass += "text-[#8E8E93] hover:text-white/80";
              }
            } else {
              if (isActive) {
                textClass += "text-primary";
              } else {
                textClass += "text-[#8E8E93] hover:text-zinc-700";
              }
            }

            return (
              <div
                key={index}
                className="relative flex-1 flex flex-col items-center justify-center h-full pt-1"
              >
                {item.isAction ? (
                  <button
                    onClick={item.action}
                    className="flex flex-col items-center gap-1 py-1 px-3 transition-all duration-300 ease-out"
                  >
                    <img
                      src={item.icon}
                      alt={item.name}
                      className={iconClass}
                    />
                    <span className={textClass}>
                      {item.name}
                    </span>
                  </button>
                ) : (
                  <Link
                    href={item.path}
                    className="flex flex-col items-center gap-1 py-1 px-3 transition-all duration-300 ease-out"
                  >
                    <img
                      src={item.icon}
                      alt={item.name}
                      className={iconClass}
                    />
                    <span className={textClass}>
                      {item.name}
                    </span>
                  </Link>
                )}
              </div>
            );
          })}

        </div>

        {/* ==================== SMOOTH SLIDING ACTIVE CIRCLE (FAB) ==================== */}
        {/* Floating position is centered with perfectly matching concentric space around it */}
        <div
          className={`absolute w-[60px] h-[60px] rounded-full flex items-center justify-center shadow-2xl z-50 transition-all duration-300 ease-out cursor-pointer active:scale-95 ${
            isDark 
              ? "bg-[#3A3A3C] border border-white/10" 
              : "bg-white border border-zinc-200 shadow-md"
          }`}
          style={{
            top: "5px", // Mathematically centered: floats 10px above Y=15, and has 14px gap at the bottom Y=79
            left: "50%",
            transform: "translateX(-50%)",
          }}
          onClick={handleScanClick}
        >
          <button className="w-full h-full flex items-center justify-center cursor-pointer">
            <img
              src="/icons/scan-barcode.png"
              alt="Skaner"
              className={`h-8 w-8 object-contain animate-scale-up ${
                isDark ? "brightness-0 invert" : "filter-primary"
              }`}
            />
          </button>
        </div>

      </div>

      {/* Skaner Modal interfeysi saqlab qolindi */}
      {isScanning && (
        <div className="fixed inset-0 z-[100] bg-[var(--background)] flex flex-col justify-between max-w-md mx-auto shadow-2xl animate-fade-in text-white overflow-hidden select-none">
          
          {/* Header */}
          <div className="relative py-6 px-6 flex items-center justify-between z-20">
            {scanState === "my_qr" ? (
              <>
                <button
                  onClick={() => setScanState("scanning")}
                  className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 transition-all flex items-center justify-center text-white cursor-pointer active:scale-90"
                >
                  <ChevronLeft className="w-5 h-5 stroke-[2.5]" />
                </button>
                <div className="absolute left-1/2 -translate-x-1/2 font-black text-lg tracking-tighter text-white select-none scale-x-95">
                  Bazmly
                </div>
                <div className="w-9" />
              </>
            ) : (
              <>
                <div className="absolute left-1/2 -translate-x-1/2 font-semibold text-sm tracking-wide text-white/90">
                  Scanning QR code
                </div>
                <div className="w-9" />
                <button
                  onClick={closeScanner}
                  className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 transition-all flex items-center justify-center text-white cursor-pointer active:scale-90"
                >
                  <X className="w-5 h-5 stroke-[2.5]" />
                </button>
              </>
            )}
          </div>

          {/* Main Area */}
          <div className="flex-1 flex flex-col items-center justify-center relative px-6 z-10">
            
            {scanState === "my_qr" ? (
              /* State 3: User QR Code View */
              <div className="flex flex-col items-center justify-center w-full animate-scale-up -mt-8">
                {/* White Rounded Card */}
                <div className="w-full max-w-[280px] bg-white rounded-[32px] p-6 shadow-[0_20px_50px_rgba(0,0,0,0.5)] flex flex-col items-center gap-6 text-center">
                  
                  {/* Detailed SVG QR Code */}
                  <div className="p-1 bg-white rounded-2xl">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" className="h-44 w-44 text-black">
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

                      {/* Mock QR bits */}
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

                  {/* Caption Text */}
                  <p className="text-[#3A3A3C] text-[13px] font-bold tracking-tight px-4 leading-normal select-none">
                    Ushbu QR kodni sotuvchiga ko'rsating
                  </p>
                </div>
              </div>
            ) : (
              /* State 1 & 2: Active Scanner Viewport */
              <div className="flex flex-col items-center justify-center w-full animate-fade-in">
                {/* Viewfinder frame container */}
                <div className="relative w-64 h-64 border-2 border-white/20 rounded-[28px] overflow-hidden flex items-center justify-center bg-black/40 shadow-2xl">
                  {scanState === "scanning" ? (
                    <>
                      {/* Real-time HTML5 Back Camera Feed */}
                      <video
                        ref={videoRef}
                        playsInline
                        autoPlay
                        muted
                        className="absolute inset-0 w-full h-full object-cover"
                      />

                      {/* Laser scan line over the video feed */}
                      <div className="absolute left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[#FF5A00] to-transparent shadow-[0_0_12px_rgba(255,90,0,0.8)] animate-laser z-10" />
                    </>
                  ) : (
                    /* Blur camera placeholder for permission screen */
                    <div className="absolute inset-0 bg-gradient-to-tr from-zinc-900 to-zinc-950 flex items-center justify-center select-none">
                      <div className="w-16 h-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/20 animate-pulse">
                        <svg className="w-8 h-8 fill-current" viewBox="0 0 24 24">
                          <path d="M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6Zm0-6a9 9 0 1 1 0 18 9 9 0 0 1 0-18Z" />
                        </svg>
                      </div>
                    </div>
                  )}

                  {/* Glowing target corners */}
                  <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-[#FF5A00] rounded-tl-xl z-10" />
                  <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-[#FF5A00] rounded-tr-xl z-10" />
                  <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-[#FF5A00] rounded-bl-xl z-10" />
                  <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-[#FF5A00] rounded-br-xl z-10" />
                </div>
              </div>
            )}
          </div>

          {/* Footer State-dependent Area */}
          <div className="w-full px-6 pb-12 z-20 flex flex-col items-center">
            {scanState === "permission" && (
              /* State 2: Camera Permission bottom sheet drawer */
              <div className="w-full bg-[#393939] border-t border-[#2A2A2A]/40 rounded-t-[32px] px-6 pb-8 pt-4 shadow-2xl flex flex-col items-stretch animate-scale-up absolute bottom-0 left-0 right-0">
                {/* Drag pill handle */}
                <div className="w-9 h-1 bg-white/20 rounded-full mx-auto mb-6" />
                
                <div className="space-y-6">
                  <p className="text-white text-center font-bold text-[15px] leading-snug px-6">
                    Ilovada kamera yoqishga ruxsat bering
                  </p>

                  <div className="space-y-3">
                    <button
                      onClick={() => setScanState("scanning")}
                      className="w-full py-4 bg-[#FF5A00] hover:bg-[#E05000] text-white font-extrabold text-sm rounded-[24px] shadow-lg shadow-[#FF5A00]/20 hover:scale-[1.01] active:scale-[0.99] transition-all duration-200"
                    >
                      Ruxsat berish
                    </button>
                    <button
                      onClick={closeScanner}
                      className="w-full py-3 bg-transparent text-white/70 hover:text-white font-bold text-sm tracking-wide transition-colors"
                    >
                      Ruxsat yo'q
                    </button>
                  </div>
                </div>
              </div>
            )}

            {scanState === "scanning" && (
              /* State 1: Active scan bottom triggers */
              <div className="flex flex-col items-center justify-center animate-fade-in">
                {/* Custom QR code active scan badge */}
                <div 
                  onClick={() => setScanState("my_qr")}
                  className="w-14 h-14 bg-[#FF5A00] hover:bg-[#E05000] rounded-2xl flex items-center justify-center shadow-[0_6px_20px_rgba(255,90,0,0.35)] cursor-pointer transform active:scale-95 transition-all mb-2"
                >
                  <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 7V5a2 2 0 0 1 2-2h2" />
                    <path d="M17 3h2a2 2 0 0 1 2 2v2" />
                    <path d="M21 17v2a2 2 0 0 1-2 2h-2" />
                    <path d="M3 17v2a2 2 0 0 1 2 2h2" />
                    <rect x="7" y="7" width="10" height="10" rx="1.5" />
                  </svg>
                </div>
                <span className="text-white/90 text-xs font-semibold tracking-wide">
                  QR kod orqali
                </span>
              </div>
            )}

            {scanState === "my_qr" && (
              /* State 3: User QR Code bottom close button */
              <button
                onClick={() => setScanState("scanning")}
                className="w-full py-4 bg-[#FF5A00] hover:bg-[#E05000] text-white font-extrabold text-sm rounded-[24px] shadow-lg shadow-[#FF5A00]/20 hover:scale-[1.01] active:scale-[0.99] transition-all duration-200 animate-fade-in"
              >
                Ortga
              </button>
            )}
          </div>

        </div>
      )}
    </>
  );
}
