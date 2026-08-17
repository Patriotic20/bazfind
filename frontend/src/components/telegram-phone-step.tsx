"use client";

import { Phone, ShieldCheck } from "lucide-react";

import { useSharePhone } from "@/lib/telegram/use-share-phone";

/**
 * The one thing asked on the way in.
 *
 * Telegram already said who this is, so there is no login to complete — but a
 * venue has to be able to ring the person whose table it is holding, and
 * Telegram does not hand over the number unasked.
 *
 * Skippable on purpose. The number is needed to *book*, not to look, and a
 * blocking wall on first launch costs more browsing than it gains numbers.
 */
export function TelegramPhoneStep({ onSkip }: { onSkip: () => void }) {
  const { share, isSharing, problem } = useSharePhone();

  return (
    <div className="flex min-h-screen flex-1 flex-col justify-between bg-[var(--background)] px-6 py-10">
      <div className="flex flex-1 flex-col items-center justify-center text-center gap-5">
        <div className="rounded-full bg-primary/10 p-5">
          <Phone className="h-9 w-9 text-primary" />
        </div>

        <div className="space-y-2">
          <h1 className="text-xl font-bold">Telefon raqamingiz</h1>
          <p className="text-sm opacity-70 max-w-xs">
            Muassasa bron yuzasidan bog&apos;lanishi uchun kerak. Raqamni Telegram tasdiqlagan —
            kod kiritish shart emas.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs opacity-60">
          <ShieldCheck className="h-4 w-4 shrink-0" />
          <span>Raqamingiz faqat bron uchun ishlatiladi</span>
        </div>

        {problem && <p className="text-xs font-semibold text-red-500">{problem}</p>}
      </div>

      <div className="space-y-3">
        <button
          type="button"
          onClick={share}
          disabled={isSharing}
          className="w-full rounded-2xl bg-[#FF6B00] py-4 text-sm font-bold text-white transition-all hover:bg-[#E05000] active:scale-98 disabled:opacity-50"
        >
          {isSharing ? "Kutilmoqda..." : "Raqamni ulashish"}
        </button>

        <button
          type="button"
          onClick={onSkip}
          className="w-full py-3 text-sm font-semibold opacity-60 transition-opacity hover:opacity-100"
        >
          Keyinroq
        </button>
      </div>
    </div>
  );
}
