import type { TelegramWebApp } from "./types";

/**
 * Reading the Telegram runtime, when there is one.
 *
 * The app has to work in an ordinary browser too — that is where it is
 * developed, and where a shared link opens. So nothing here throws when
 * Telegram is absent: every helper degrades to "not in Telegram" and the
 * phone-and-password flow stays reachable.
 */

export function getWebApp(): TelegramWebApp | null {
  if (typeof window === "undefined") return null;
  return window.Telegram?.WebApp ?? null;
}

/**
 * Whether this page is genuinely running inside Telegram.
 *
 * The presence of the SDK is not enough: the script loads anywhere. `initData`
 * is only populated when Telegram actually launched the app, which is also the
 * only case where the backend can verify anything.
 */
export function isInsideTelegram(): boolean {
  const webApp = getWebApp();
  return Boolean(webApp && webApp.initData);
}

/** The signed payload to hand the backend, or null outside Telegram. */
export function getInitData(): string | null {
  const webApp = getWebApp();
  return webApp?.initData || null;
}

/**
 * Tell Telegram the interface is ready, and take the full height.
 *
 * Until `ready()` is called Telegram keeps its own loading placeholder over the
 * page. `expand()` opens the sheet to full height — without it the app opens
 * as a half-screen card that the user has to drag up.
 */
export function announceReady(): void {
  const webApp = getWebApp();
  if (!webApp) return;
  webApp.ready();
  if (!webApp.isExpanded) webApp.expand();
}

/**
 * Drive Telegram's own back button.
 *
 * Returns a cleanup function. Telegram's button lives outside the page, so a
 * handler left registered on unmount keeps firing on the next screen.
 */
export function bindBackButton(handler: () => void): () => void {
  const webApp = getWebApp();
  if (!webApp) return () => {};

  webApp.BackButton.onClick(handler);
  webApp.BackButton.show();

  return () => {
    webApp.BackButton.offClick(handler);
    webApp.BackButton.hide();
  };
}

/** A short tap. Silently does nothing outside Telegram. */
export function hapticTap(): void {
  getWebApp()?.HapticFeedback.impactOccurred("light");
}

/** Why asking for a contact did not produce one. */
export type ContactRefusal = "unsupported" | "declined";

/**
 * Ask Telegram for the user's phone number.
 *
 * Resolves with the signed payload to hand the backend, or with why it did not:
 * `unsupported` when the Telegram client predates Bot API 6.9, `declined` when
 * the user said no. Neither is an error — both are answers, and the caller shows
 * something different for each.
 *
 * The signed string is passed on untouched. It is what the signature covers, so
 * re-encoding it or picking the number out of `responseUnsafe` would throw away
 * the only proof that Telegram, and not the page, produced this number.
 */
export function requestContact(): Promise<{ contactData: string } | { refused: ContactRefusal }> {
  const webApp = getWebApp();
  if (!webApp?.requestContact) return Promise.resolve({ refused: "unsupported" as const });

  return new Promise((resolve) => {
    webApp.requestContact!((shared, result) => {
      const contactData = result?.response;
      if (shared && contactData) resolve({ contactData });
      else resolve({ refused: "declined" as const });
    });
  });
}

/** Marks the document so CSS can tell it is running inside Telegram. */
const TELEGRAM_CLASS = "tg-app";
const HEIGHT_VARIABLE = "--tg-app-height";

/**
 * Bind the layout's idea of "full height" to Telegram's.
 *
 * `100vh` is the visible window in a browser, but inside Telegram the app is a
 * panel with a header above it — so `min-h-screen` makes every screen taller
 * than the space it has, and the bottom of the content sits below the fold.
 *
 * Telegram reports the real figure and changes it when the sheet is expanded or
 * the keyboard opens, hence the subscription. `viewportStableHeight` rather than
 * `viewportHeight`: the stable one excludes the transient shrink while the
 * keyboard animates, which otherwise makes the layout jump on every focus.
 *
 * Returns a cleanup that puts the document back as it was.
 */
export function bindViewportHeight(): () => void {
  const webApp = getWebApp();
  if (!webApp || typeof document === "undefined") return () => {};

  const root = document.documentElement;
  const apply = () => {
    root.style.setProperty(HEIGHT_VARIABLE, `${webApp.viewportStableHeight}px`);
  };

  root.classList.add(TELEGRAM_CLASS);
  apply();
  webApp.onEvent("viewportChanged", apply);

  return () => {
    webApp.offEvent("viewportChanged", apply);
    root.classList.remove(TELEGRAM_CLASS);
    root.style.removeProperty(HEIGHT_VARIABLE);
  };
}
