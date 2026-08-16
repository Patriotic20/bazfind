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
