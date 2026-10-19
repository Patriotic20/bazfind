"use client";

import React, { useState, useEffect, use, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import Navbar from "@/components/navbar";
import { venueService, VenueDetailRead } from "@/lib/api";
import { MOCK_VENUES } from "@/data/venues";

interface Props {
  params: Promise<{ id: string }>;
}

function PaymentContent({ id }: { id: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [venueDetail, setVenueDetail] = useState<VenueDetailRead | null>(null);

  // Read query configurations
  const date = searchParams.get("date") || "2026-06-18";
  const session = searchParams.get("session") || "evening";
  const guests = searchParams.get("guests") || "250";
  const totalParam = searchParams.get("total") || "15000000";
  const totalAmount = Number(totalParam);

  useEffect(() => {
    venueService.getVenueDetail(id)
      .then((d) => setVenueDetail(d))
      .catch(() => {});
  }, [id]);

  const fallbackVenue = MOCK_VENUES.find((v) => v.id === id) || MOCK_VENUES[0];
  const venueName = venueDetail?.venue.name || fallbackVenue.name;

  // Card input states
  const [cardNumber, setCardNumber] = useState("");
  const [cardName, setCardName] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCvv, setCardCvv] = useState("");
  const [isFlipped, setIsFlipped] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.replace(/\D/g, "");
    let formatted = val.match(/.{1,4}/g)?.join(" ") || "";
    setCardNumber(formatted.substring(0, 19));
  };

  const handleExpiryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.replace(/\D/g, "");
    if (val.length > 2) {
      val = val.substring(0, 2) + "/" + val.substring(2, 4);
    }
    setCardExpiry(val.substring(0, 5));
  };

  const handleCvvChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.replace(/\D/g, "");
    setCardCvv(val.substring(0, 3));
  };

  const handlePaymentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (cardNumber.length < 19 || cardExpiry.length < 5 || cardCvv.length < 3 || !cardName) {
      setError("Iltimos, barcha karta ma'lumotlarini to'g'ri to'ldiring!");
      return;
    }
    setError("");
    setLoading(true);

    setTimeout(() => {
      setLoading(false);
      router.push(`/payment-success?venueId=${id}&date=${date}&session=${session}&guests=${guests}&total=${totalAmount}`);
    }, 1200);
  };

  return (
    <div className="flex flex-col gap-8">
      {/* Animated 3D Credit Card */}
      <div className="flex justify-center py-4">
        <div
          className="w-full max-w-[380px] h-[220px] rounded-3xl relative transition-all duration-700 select-none shadow-2xl"
          style={{
            perspective: "1000px",
            transformStyle: "preserve-3d",
            transform: isFlipped ? "rotateY(180deg)" : "rotateY(0deg)",
          }}
        >
          {/* Front Side */}
          <div
            className="absolute inset-0 bg-gradient-to-br from-primary via-orange-500 to-amber-600 p-6 rounded-3xl text-white flex flex-col justify-between"
            style={{
              backfaceVisibility: "hidden",
              transform: "rotateY(0deg)",
            }}
          >
            <div className="flex justify-between items-start">
              <div>
                <p className="text-[10px] font-bold tracking-widest uppercase opacity-80">BAZMLY Pay</p>
                <p className="text-lg font-black tracking-wider mt-1">UZCARD / HUMO</p>
              </div>
              <div className="h-10 w-14 rounded-lg bg-white/20 flex items-center justify-center font-bold text-xs">
                CHIP
              </div>
            </div>

            <div className="text-xl font-bold tracking-widest font-mono py-2">
              {cardNumber || "•••• •••• •••• ••••"}
            </div>

            <div className="flex justify-between items-end">
              <div>
                <p className="text-[8px] font-bold uppercase tracking-wider opacity-60">Karta egasi</p>
                <p className="text-sm font-bold tracking-wide truncate max-w-[200px]">
                  {cardName.toUpperCase() || "ISM SHARIF"}
                </p>
              </div>
              <div className="text-right">
                <p className="text-[8px] font-bold uppercase tracking-wider opacity-60">Muddati</p>
                <p className="text-sm font-bold font-mono">{cardExpiry || "MM/YY"}</p>
              </div>
            </div>
          </div>

          {/* Back Side */}
          <div
            className="absolute inset-0 bg-gradient-to-br from-brand-dark-card to-zinc-800 border border-white/10 p-6 rounded-3xl text-white flex flex-col justify-between"
            style={{
              backfaceVisibility: "hidden",
              transform: "rotateY(180deg)",
            }}
          >
            <div className="h-10 bg-black/80 -mx-6 mt-2" />
            <div className="flex justify-end items-center gap-2">
              <span className="text-[10px] uppercase font-bold opacity-60">CVV:</span>
              <span className="bg-white text-black font-mono font-bold px-3 py-1.5 rounded-lg text-sm">
                {cardCvv || "•••"}
              </span>
            </div>
            <p className="text-[9px] text-white/40 leading-relaxed text-center">
              Ushbu karta BAZMLY to'lov tizimida xavfsiz himoyalangan.
            </p>
          </div>
        </div>
      </div>

      {/* Input Form */}
      <form
        onSubmit={handlePaymentSubmit}
        className="rounded-3xl border border-brand-light-border dark:border-brand-dark-border bg-brand-light-card dark:bg-brand-dark-card p-6 shadow-lg space-y-6"
      >
        <h3 className="font-extrabold text-lg text-foreground">Karta ma'lumotlari</h3>

        {error && (
          <div className="rounded-xl bg-red-500/10 border border-red-500/20 p-3 text-sm text-red-500 text-center font-semibold">
            ⚠️ {error}
          </div>
        )}

        <div className="space-y-4">
          <div className="rounded-2xl border border-brand-light-border dark:border-brand-dark-border bg-foreground/3 dark:bg-white/3 p-4 focus-within:ring-2 focus-within:ring-primary/50 transition-all">
            <label className="block text-xs font-bold text-foreground/50 uppercase tracking-wider mb-1">
              Karta egasi ismi
            </label>
            <input
              type="text"
              required
              placeholder="SHOHRUX RAHIMOV"
              value={cardName}
              onChange={(e) => setCardName(e.target.value.replace(/[^a-zA-Z\s]/g, ""))}
              disabled={loading}
              className="block w-full border-0 bg-transparent p-0 text-foreground font-bold outline-none uppercase placeholder-foreground/30 focus:ring-0"
            />
          </div>

          <div className="rounded-2xl border border-brand-light-border dark:border-brand-dark-border bg-foreground/3 dark:bg-white/3 p-4 focus-within:ring-2 focus-within:ring-primary/50 transition-all">
            <label className="block text-xs font-bold text-foreground/50 uppercase tracking-wider mb-1">
              Karta raqami
            </label>
            <input
              type="text"
              required
              placeholder="8600 1234 5678 9012"
              value={cardNumber}
              onChange={handleCardNumberChange}
              disabled={loading}
              className="block w-full border-0 bg-transparent p-0 text-foreground font-bold font-mono outline-none placeholder-foreground/30 focus:ring-0"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-2xl border border-brand-light-border dark:border-brand-dark-border bg-foreground/3 dark:bg-white/3 p-4 focus-within:ring-2 focus-within:ring-primary/50 transition-all">
              <label className="block text-xs font-bold text-foreground/50 uppercase tracking-wider mb-1">
                Amal qilish muddati
              </label>
              <input
                type="text"
                required
                placeholder="MM/YY"
                value={cardExpiry}
                onChange={handleExpiryChange}
                disabled={loading}
                className="block w-full border-0 bg-transparent p-0 text-foreground font-bold font-mono outline-none placeholder-foreground/30 focus:ring-0"
              />
            </div>

            <div className="rounded-2xl border border-brand-light-border dark:border-brand-dark-border bg-foreground/3 dark:bg-white/3 p-4 focus-within:ring-2 focus-within:ring-primary/50 transition-all">
              <label className="block text-xs font-bold text-foreground/50 uppercase tracking-wider mb-1">
                CVV
              </label>
              <input
                type="password"
                required
                placeholder="•••"
                value={cardCvv}
                onChange={handleCvvChange}
                onFocus={() => setIsFlipped(true)}
                onBlur={() => setIsFlipped(false)}
                disabled={loading}
                className="block w-full border-0 bg-transparent p-0 text-foreground font-bold font-mono outline-none placeholder-foreground/30 focus:ring-0"
              />
            </div>
          </div>
        </div>

        <div>
          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center rounded-2xl bg-primary py-4 text-base font-bold text-white shadow-xl shadow-primary/20 hover:bg-primary-hover transition-all duration-200 disabled:opacity-50 cursor-pointer"
          >
            {loading ? "To'lov qilinmoqda..." : `Jami to'lov: ${totalAmount.toLocaleString()} UZS`}
          </button>
        </div>
      </form>

      {/* Details */}
      <div className="rounded-3xl border border-brand-light-border dark:border-brand-dark-border bg-brand-light-card dark:bg-brand-dark-card p-6 shadow-2xl space-y-4">
        <h3 className="text-lg font-bold text-foreground">Buyurtma tafsilotlari</h3>
        <div className="space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-foreground/60">Maskan:</span>
            <span className="font-bold">{venueName}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-foreground/60">Sana:</span>
            <span className="font-bold font-mono">{date}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-foreground/60">Mehmonlar:</span>
            <span className="font-bold">{guests} kishi</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PaymentPage({ params }: Props) {
  const { id } = use(params);

  return (
    <div className="flex flex-col flex-1">
      <Navbar />
      <main className="flex-1 w-full px-4 py-6 pb-24">
        <Link
          href={`/booking/${id}`}
          className="inline-flex items-center gap-2 text-sm font-bold text-primary hover:underline mb-6"
        >
          ← Ortga qaytish
        </Link>
        <h1 className="text-3xl font-extrabold text-foreground mb-8">To'lovni Tasdiqlash</h1>
        <Suspense
          fallback={
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary" />
            </div>
          }
        >
          <PaymentContent id={id} />
        </Suspense>
      </main>
    </div>
  );
}
