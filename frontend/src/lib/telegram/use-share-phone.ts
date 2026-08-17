"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { authKeys, shareTelegramContact } from "@/lib/api/endpoints/auth";
import { requestContact } from "@/lib/telegram/webapp";
import { ApiError } from "@/lib/api/types";

/**
 * Asking Telegram for the phone number, in one place.
 *
 * Two screens need this — the step shown after sign-in and the card in the
 * profile — and they differ only in how they look. Sharing the hook keeps the
 * refusal handling, which is the subtle part, from drifting between them.
 */
export function useSharePhone(onDone?: () => void) {
  const [refusal, setRefusal] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async () => {
      const outcome = await requestContact();
      if ("refused" in outcome) {
        // Neither is an error. An old Telegram simply lacks the method, and a
        // person is allowed to say no — both are answers, and each gets its own
        // sentence rather than a generic failure.
        setRefusal(
          outcome.refused === "unsupported"
            ? "Telegram ilovangizni yangilang"
            : "Raqamni ulashmadingiz",
        );
        return null;
      }
      setRefusal(null);
      return shareTelegramContact(outcome.contactData);
    },
    onSuccess: (user) => {
      if (!user) return;
      void queryClient.invalidateQueries({ queryKey: authKeys.me() });
      onDone?.();
    },
  });

  const failure =
    mutation.error instanceof ApiError
      ? mutation.error.message
      : mutation.error
        ? "Xatolik yuz berdi"
        : null;

  return {
    share: () => mutation.mutate(),
    isSharing: mutation.isPending,
    /** The one line to show under the button, whichever way it went wrong. */
    problem: failure ?? refusal,
  };
}
