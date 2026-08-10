"use client";

import React, { useEffect, useState } from "react";

export default function SplashScreen() {
  const [visible, setVisible] = useState(true);
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    // Show splash screen for 1.8 seconds then trigger fade out
    const timer = setTimeout(() => {
      setFadeOut(true);
      const removeTimer = setTimeout(() => {
        setVisible(false);
      }, 500); // Wait for the fade-out opacity transition (500ms)
      return () => clearTimeout(removeTimer);
    }, 1800);

    return () => clearTimeout(timer);
  }, []);

  if (!visible) return null;

  return (
    <div
      className={`fixed inset-0 z-[9999] flex items-center justify-center transition-opacity duration-500 ease-out max-w-md mx-auto ${
        fadeOut ? "opacity-0 pointer-events-none" : "opacity-100"
      }`}
      style={{ backgroundColor: "#E85102" }}
    >
      <div className="flex flex-col items-center justify-center animate-pulse">
        <img
          src="/logo-loading.png"
          alt="Bazmly Loading"
          className="h-28 w-auto object-contain"
        />
      </div>
    </div>
  );
}
