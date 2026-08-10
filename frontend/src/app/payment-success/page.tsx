"use client";

import React, { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import Navbar from "@/components/navbar";
import { MOCK_VENUES } from "@/data/venues";

function SuccessContent() {
  const searchParams = useSearchParams();
  const venueId = searchParams.get("venueId") || "1";
  const date = searchParams.get("date") || "2026-06-18";
  const session = searchParams.get("session") || "evening";
  const guests = searchParams.get("guests") || "250";
  const total = searchParams.get("total") || "15000000";

  const venue = MOCK_VENUES.find((v) => v.id === venueId) || MOCK_VENUES[0];

  return (
    <div className="w-full max-w-md mx-auto space-y-8">
      {/* Celebration Checkmark */}
      <div className="text-center space-y-4">
        <div className="inline-flex h-20 w-20 items-center justify-center rounded-full bg-green-500/10 border border-green-500/20 text-5xl text-green-500 animate-bounce">
          ✓
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight text-foreground">
          To'lov Muvaffaqiyatli!
        </h1>
        <p className="text-sm text-foreground/60">
          Tabriklaymiz! Sizning buyurtmangiz muvaffaqiyatli tasdiqlandi va chipta generatsiya qilindi.
        </p>
      </div>

      {/* Dashed Border Premium Ticket (BAZMLY Style) */}
      <div className="rounded-3xl border border-brand-light-border dark:border-brand-dark-border bg-brand-light-card dark:bg-brand-dark-card shadow-2xl overflow-hidden relative">
        {/* Top Segment */}
        <div className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-primary">
              Rasmiy Chipta
            </span>
            <span className="text-xs font-bold font-mono text-foreground/40">
              #BZM-{Math.floor(100000 + Math.random() * 900000)}
            </span>
          </div>

          <div>
            <h3 className="text-xl font-bold text-foreground">{venue.name}</h3>
            <p className="text-xs text-foreground/50">📍 {venue.location}</p>
          </div>

          <div className="grid grid-cols-2 gap-4 text-xs pt-2">
            <div>
              <p className="text-foreground/40 uppercase font-bold">Sana</p>
              <p className="font-extrabold text-foreground font-mono">{date}</p>
            </div>
            <div>
              <p className="text-foreground/40 uppercase font-bold">Navbat</p>
              <p className="font-extrabold text-foreground">
                {session === "morning" ? "☀️ Ertalabki" : "🌙 Kechki"}
              </p>
            </div>
            <div>
              <p className="text-foreground/40 uppercase font-bold">Mehmonlar</p>
              <p className="font-extrabold text-foreground">{guests} kishi</p>
            </div>
            <div>
              <p className="text-foreground/40 uppercase font-bold">Jami To'lov</p>
              <p className="font-extrabold text-primary">
                {Number(total).toLocaleString()} UZS
              </p>
            </div>
          </div>
        </div>

        {/* Dashed Tear-off Line with semicircles */}
        <div className="relative flex items-center justify-between my-2">
          <div className="h-6 w-3 bg-brand-light dark:bg-brand-dark rounded-r-full border-r border-y border-brand-light-border dark:border-brand-dark-border -ml-px" />
          <div className="flex-1 border-t-2 border-dashed border-brand-light-border dark:border-brand-dark-border mx-2" />
          <div className="h-6 w-3 bg-brand-light dark:bg-brand-dark rounded-l-full border-l border-y border-brand-light-border dark:border-brand-dark-border -mr-px" />
        </div>

        {/* Bottom Segment (QR Code) */}
        <div className="p-6 flex flex-col items-center justify-center space-y-4">
          {/* Custom SVG QR Code */}
          <div className="p-3 bg-white rounded-2xl shadow-md border border-gray-100 flex items-center justify-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 100 100"
              className="h-32 w-32 text-black"
            >
              {/* Top-left position marker */}
              <rect x="0" y="0" width="30" height="30" fill="currentColor" />
              <rect x="5" y="5" width="20" height="20" fill="white" />
              <rect x="10" y="10" width="10" height="10" fill="currentColor" />

              {/* Top-right position marker */}
              <rect x="70" y="0" width="30" height="30" fill="currentColor" />
              <rect x="75" y="5" width="20" height="20" fill="white" />
              <rect x="80" y="10" width="10" height="10" fill="currentColor" />

              {/* Bottom-left position marker */}
              <rect x="0" y="70" width="30" height="30" fill="currentColor" />
              <rect x="5" y="75" width="20" height="20" fill="white" />
              <rect x="10" y="80" width="10" height="10" fill="currentColor" />

              {/* Mock QR Data bits */}
              <rect x="40" y="10" width="10" height="10" fill="currentColor" />
              <rect x="55" y="0" width="10" height="15" fill="currentColor" />
              <rect x="35" y="25" width="20" height="10" fill="currentColor" />
              <rect x="50" y="45" width="15" height="15" fill="currentColor" />
              <rect x="40" y="70" width="15" height="10" fill="currentColor" />
              <rect x="80" y="40" width="10" height="20" fill="currentColor" />
              <rect x="85" y="75" width="15" height="15" fill="currentColor" />
              <rect x="70" y="85" width="10" height="10" fill="currentColor" />
              <rect x="15" y="45" width="15" height="10" fill="currentColor" />
            </svg>
          </div>
          <span className="text-[10px] font-bold text-foreground/40 uppercase tracking-widest">
            Tadbirga kirish kodi
          </span>
        </div>
      </div>

      {/* CTAs */}
      <div className="flex gap-4">
        <Link
          href="/feed"
          className="flex-1 inline-flex items-center justify-center rounded-2xl bg-foreground/5 dark:bg-white/5 border border-brand-light-border dark:border-brand-dark-border py-4 text-base font-bold text-foreground hover:bg-foreground/10 dark:hover:bg-white/10 transition-all duration-200"
        >
          Bosh sahifaga
        </Link>
        <Link
          href="/tickets"
          className="flex-1 inline-flex items-center justify-center rounded-2xl bg-primary py-4 text-base font-bold text-white shadow-xl shadow-primary/20 hover:bg-primary-hover transition-all duration-200"
        >
          Chiptalarim
        </Link>
      </div>
    </div>
  );
}

export default function PaymentSuccessPage() {
  return (
    <div className="flex flex-col flex-1">
      <Navbar />

      <main className="flex-1 max-w-lg w-full mx-auto px-4 sm:px-6 lg:px-8 py-12 flex items-center justify-center">
        <Suspense fallback={
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary" />
          </div>
        }>
          <SuccessContent />
        </Suspense>
      </main>
    </div>
  );
}
