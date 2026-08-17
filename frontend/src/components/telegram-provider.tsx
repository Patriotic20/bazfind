"use client";

import { createContext, useContext, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { authKeys, getMe, telegramLogin } from "@/lib/api/endpoints/auth";
import { hasSession } from "@/lib/api/auth-tokens";
import { TelegramPhoneStep } from "@/components/telegram-phone-step";
import {
  announceReady,
  bindViewportHeight,
  getInitData,
  getWebApp,
  isInsideTelegram,
} from "@/lib/telegram/webapp";
import type { TelegramWebAppUser } from "@/lib/telegram/types";

/**
 * Telegram sign-in, done before the user sees a login screen.
 *
 * Inside Telegram there is nothing to ask: the platform already knows who this
 * is and signs a payload saying so. This provider trades that payload for a
 * session on mount, so the app opens signed in.
 *
 * Outside Telegram it does nothing at all and the phone-and-password flow stays
 * exactly as it was — the app is still a website, and this must not break it.
 */

type TelegramStatus = "outside" | "signing-in" | "ready" | "failed";

interface TelegramContextValue {
  /** Whether Telegram actually launched this page, not merely whether the SDK loaded. */
  inside: boolean;
  status: TelegramStatus;
  user: TelegramWebAppUser | null;
  /** Why automatic sign-in failed, for a screen that wants to explain itself. */
  error: string | null;
}

const TelegramContext = createContext<TelegramContextValue>({
  inside: false,
  status: "outside",
  user: null,
  error: null,
});

/**
 * Whether Telegram launched this page, read as an external store.
 *
 * It never changes after load, so the subscription is a no-op — but going
 * through `useSyncExternalStore` is what keeps the server render (always
 * `false`, there is no Telegram there) from disagreeing with the client.
 */
const noChanges = () => () => {};

function insideSnapshot(): boolean {
  return isInsideTelegram();
}

function outsideOnServer(): boolean {
  return false;
}

export function TelegramProvider({ children }: { children: React.ReactNode }) {
  const inside = useSyncExternalStore(noChanges, insideSnapshot, outsideOnServer);
  // Only the outcome is state. "Signing in" is the absence of an outcome, so it
  // needs no setter and shows from the very first render rather than after one.
  const [outcome, setOutcome] = useState<{ done: boolean; error: string | null }>({
    done: false,
    error: null,
  });
  const queryClient = useQueryClient();

  // Strict Mode mounts effects twice in development. Without this guard the
  // second run fires a second sign-in, and two concurrent ones would each
  // create a session.
  const attempted = useRef(false);

  useEffect(() => {
    if (!inside || attempted.current) return;
    attempted.current = true;

    announceReady();

    const initData = getInitData();
    if (!initData) return;

    // An existing session wins. Trading initData again would open a second
    // refresh-token family for the same person, and the older one would keep
    // working until it expired. Both branches settle through a promise so the
    // outcome is only ever recorded from a callback, never mid-effect.
    const signedIn = hasSession() ? Promise.resolve(false) : telegramLogin(initData).then(() => true);

    signedIn
      .then((isNew) => {
        setOutcome({ done: true, error: null });
        // Anything already asking "who am I" was answered "nobody" a moment ago.
        if (isNew) void queryClient.invalidateQueries();
      })
      .catch((caught: unknown) => {
        setOutcome({
          done: true,
          error: caught instanceof Error ? caught.message : "Telegram orqali kirib bo'lmadi",
        });
      });
  }, [inside, queryClient]);

  // Not gated on `inside`: the height is a layout concern, not an identity one.
  // A runtime that reports a viewport gets used even when it hands over no
  // initData, and `bindViewportHeight` is a no-op when there is no runtime.
  useEffect(() => bindViewportHeight(), []);

  const status: TelegramStatus = !inside
    ? "outside"
    : !outcome.done
      ? "signing-in"
      : outcome.error
        ? "failed"
        : "ready";

  const user = inside ? (getWebApp()?.initDataUnsafe.user ?? null) : null;

  // Only once signed in — before that there is no account to have a number.
  const me = useQuery({
    queryKey: authKeys.me(),
    queryFn: ({ signal }) => getMe(signal),
    enabled: status === "ready",
    retry: false,
  });

  // Dismissed for this launch, not for ever: `sessionStorage` clears when the
  // Mini App is closed, so someone who said "later" is asked again next time
  // rather than never.
  const [skipped, setSkipped] = useState(false);
  const needsPhone = status === "ready" && me.data !== undefined && me.data.phone === null;

  return (
    <TelegramContext.Provider value={{ inside, status, user, error: outcome.error }}>
      {/*
        Nothing renders until sign-in settles, and only inside Telegram. The
        screens below start fetching on mount, and without this they would all
        fire before there is a session, take a 401 each, and then refetch once
        the token lands. `failed` still renders — a Telegram user whose sign-in
        broke should land in the ordinary app, not on a blank screen.
      */}
      {status === "signing-in" ? (
        <SigningIn />
      ) : needsPhone && !skipped ? (
        <TelegramPhoneStep onSkip={() => setSkipped(true)} />
      ) : (
        children
      )}
    </TelegramContext.Provider>
  );
}

/** Telegram shows its own loader over this, so it only has to not flash white. */
function SigningIn() {
  return <div className="flex min-h-screen flex-1 bg-[var(--background)]" />;
}

export function useTelegram(): TelegramContextValue {
  return useContext(TelegramContext);
}
