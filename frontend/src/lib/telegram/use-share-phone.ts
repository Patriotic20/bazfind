"use client";

import { useState } from "react";

import { useAuth } from "@/contexts/AuthContext";
import { authService, BazmlyApiError } from "@/lib/api";
import { requestContact } from "@/lib/telegram/webapp";

/**
 * Asking Telegram for the phone number, in one place.
 *
 * Two screens need this — the step shown after sign-in and the card in the
 * profile — and they differ only in how they look. Sharing the hook keeps the
 * refusal handling, which is the subtle part, from drifting between them.
 */
export function useSharePhone(onDone?: () => void) {
  const { refreshUser } = useAuth();
  const [isSharing, setIsSharing] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  const share = async () => {
    setIsSharing(true);
    try {
      const outcome = await requestContact();
      if ("refused" in outcome) {
        // Neither is an error. An old Telegram simply lacks the method, and a
        // person is allowed to say no — both are answers, and each gets its own
        // sentence rather than a generic failure.
        setProblem(
          outcome.refused === "unsupported"
            ? "Telegram ilovangizni yangilang"
            : "Raqamni ulashmadingiz",
        );
        return;
      }
      setProblem(null);
      await authService.shareTelegramContact(outcome.contactData);
      await refreshUser();
      onDone?.();
    } catch (caught) {
      setProblem(caught instanceof BazmlyApiError ? caught.message : "Xatolik yuz berdi");
    } finally {
      setIsSharing(false);
    }
  };

  return {
    share: () => void share(),
    isSharing,
    /** The one line to show under the button, whichever way it went wrong. */
    problem,
  };
}
