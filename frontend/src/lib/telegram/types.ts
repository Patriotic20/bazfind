/**
 * The slice of the Telegram Mini App SDK this product uses.
 *
 * Hand-written rather than pulled from a package: the official types ship with
 * a runtime, and everything here is read off a global that Telegram injects
 * before any of our code runs. What is typed below is what is used — adding a
 * field you have not used yet is how a typo becomes a runtime error.
 *
 * Reference: https://core.telegram.org/bots/webapps
 */

export interface TelegramThemeParams {
  bg_color?: string;
  text_color?: string;
  hint_color?: string;
  link_color?: string;
  button_color?: string;
  button_text_color?: string;
  secondary_bg_color?: string;
}

export interface TelegramWebAppUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  photo_url?: string;
}

export interface TelegramBackButton {
  isVisible: boolean;
  show: () => void;
  hide: () => void;
  onClick: (handler: () => void) => void;
  offClick: (handler: () => void) => void;
}

export interface TelegramHapticFeedback {
  impactOccurred: (style: "light" | "medium" | "heavy" | "rigid" | "soft") => void;
  notificationOccurred: (type: "error" | "success" | "warning") => void;
  selectionChanged: () => void;
}

/**
 * What `requestContact` hands back when the user agrees.
 *
 * Typed defensively: `response` is the signed query string the backend verifies,
 * and it is the only field this app reads. `responseUnsafe` is the same data
 * already parsed and, as its name says, unverified — it must never reach a
 * decision.
 */
export interface TelegramContactResponse {
  status: "sent" | "cancelled" | string;
  response?: string;
  responseUnsafe?: unknown;
}

export interface TelegramWebApp {
  /**
   * The signed payload, verbatim.
   *
   * It must be sent to the backend exactly as received — the signature covers
   * this precise string, so re-encoding or reordering it invalidates it.
   * Empty when the page is opened outside Telegram.
   */
  initData: string;
  initDataUnsafe: { user?: TelegramWebAppUser };

  version: string;
  platform: string;
  colorScheme: "light" | "dark";
  themeParams: TelegramThemeParams;

  isExpanded: boolean;
  viewportStableHeight: number;

  BackButton: TelegramBackButton;
  HapticFeedback: TelegramHapticFeedback;

  /**
   * Ask the user to share the phone number on their Telegram account.
   *
   * Available from Bot API 6.9, so it is optional here — an older client simply
   * does not have it, and the app has to notice rather than throw.
   */
  requestContact?: (
    callback: (shared: boolean, result?: TelegramContactResponse) => void,
  ) => void;

  ready: () => void;
  expand: () => void;
  close: () => void;
  onEvent: (event: "themeChanged" | "viewportChanged", handler: () => void) => void;
  offEvent: (event: "themeChanged" | "viewportChanged", handler: () => void) => void;
}

declare global {
  interface Window {
    Telegram?: { WebApp?: TelegramWebApp };
  }
}
