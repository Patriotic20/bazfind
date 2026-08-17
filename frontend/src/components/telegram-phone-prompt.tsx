"use client";

import { Phone, Check } from "lucide-react";

import { useSharePhone } from "@/lib/telegram/use-share-phone";
import { useTelegram } from "@/components/telegram-provider";

/**
 * One tap instead of six digits.
 *
 * A venue needs a number to call about a booking, but the customer signed in
 * through Telegram and never typed one. Telegram already verified the number on
 * their account, so asking it for one is both easier for the user and better
 * evidence than a code we could send and have them read back.
 *
 * Renders nothing outside Telegram, and nothing once a number is stored — this
 * is a gap to fill, not a permanent fixture.
 */
export function TelegramPhonePrompt({ hasPhone }: { hasPhone: boolean }) {
  const { inside } = useTelegram();
  const { share, isSharing, problem } = useSharePhone();

  if (!inside || hasPhone) return null;

  return (
    <div className="rounded-2xl border border-primary/30 bg-primary/5 p-4 flex flex-col gap-3">
      <div className="flex items-start gap-3">
        <Phone className="h-5 w-5 shrink-0 text-primary mt-0.5" />
        <div className="text-left">
          <p className="text-sm font-bold">Telefon raqamingiz</p>
          <p className="text-xs opacity-70 mt-0.5">
            Muassasa bron yuzasidan bog&apos;lanishi uchun kerak. Kod kiritish shart emas.
          </p>
        </div>
      </div>

      {problem && <p className="text-xs font-semibold text-red-500">{problem}</p>}

      <button
        type="button"
        onClick={share}
        disabled={isSharing}
        className="w-full py-3 rounded-xl bg-[#FF6B00] hover:bg-[#E05000] disabled:opacity-50 text-white font-bold text-sm transition-all active:scale-98 flex items-center justify-center gap-2"
      >
        {isSharing ? (
          "Kutilmoqda..."
        ) : (
          <>
            <Check className="h-4 w-4" />
            Raqamni ulashish
          </>
        )}
      </button>
    </div>
  );
}
