import { apiFetch } from "../client";
import { clearSession, getRefreshToken, storeSession } from "../auth-tokens";
import type { TokenPair, User, VenueGroup } from "../types";

/**
 * Signing in needs no third party.
 *
 * There is no verification code, no SMS gateway and no e-mail step: a phone
 * number, a name and a password are the whole of it. The wizard used to show
 * two OTP screens that sent nothing and accepted anything.
 *
 * `phone-check` is what decides which screen comes next, so the user types
 * their number once and is never asked whether they already have an account.
 */

export interface PhoneCheckResult {
  phone: string;
  registered: boolean;
  password_required: boolean;
}

export interface RegisterInput {
  phone: string;
  first_name: string;
  last_name: string;
  password?: string | null;
  district_id?: number | null;
}

export const authKeys = {
  me: () => ["auth", "me"] as const,
  myGroup: () => ["auth", "my-group"] as const,
};

/** The number may be typed any way at all — the server normalises it. */
export function checkPhone(phone: string): Promise<PhoneCheckResult> {
  return apiFetch<PhoneCheckResult>("/v1/auth/phone-check", {
    method: "POST",
    auth: "none",
    body: { phone },
  });
}

export async function register(input: RegisterInput): Promise<TokenPair> {
  const pair = await apiFetch<TokenPair>("/v1/auth/register", {
    method: "POST",
    auth: "none",
    body: input,
  });
  storeSession(pair);
  return pair;
}

export async function login(phone: string, password?: string): Promise<TokenPair> {
  const pair = await apiFetch<TokenPair>("/v1/auth/login", {
    method: "POST",
    auth: "none",
    body: { phone, password: password ?? null },
  });
  storeSession(pair);
  return pair;
}

/**
 * Sign in as whoever Telegram says opened the Mini App.
 *
 * `initData` must be forwarded exactly as Telegram produced it — the signature
 * covers that precise string, so re-encoding it makes the backend reject it.
 * There is no password and no registration step: an unknown Telegram account
 * becomes a new user on first arrival.
 */
export async function telegramLogin(initData: string): Promise<TokenPair> {
  const pair = await apiFetch<TokenPair>("/v1/auth/telegram", {
    method: "POST",
    auth: "none",
    body: { init_data: initData },
  });
  storeSession(pair);
  return pair;
}

/**
 * Hand the backend the signed contact Telegram produced.
 *
 * Passed on exactly as received: the signature covers that precise string, and
 * the backend re-checks it before believing the number. Returns the updated
 * user, so the caller can render the phone it actually stored rather than the
 * one it hoped for.
 */
export function shareTelegramContact(contactData: string): Promise<User> {
  return apiFetch<User>("/v1/auth/telegram/contact", {
    method: "POST",
    auth: "required",
    body: { contact_data: contactData },
  });
}

/** Staff sign in with an issued login, not with their phone number. */
export async function staffLogin(userLogin: string, password: string): Promise<TokenPair> {
  const pair = await apiFetch<TokenPair>("/v1/auth/staff-login", {
    method: "POST",
    auth: "none",
    body: { login: userLogin, password },
  });
  storeSession(pair);
  return pair;
}

export function setPassword(newPassword: string, currentPassword?: string): Promise<void> {
  return apiFetch<void>("/v1/auth/password", {
    method: "POST",
    auth: "required",
    body: { new_password: newPassword, current_password: currentPassword ?? null },
  });
}

export function completeProfile(input: {
  first_name: string;
  last_name: string;
  district_id?: number | null;
}): Promise<User> {
  return apiFetch<User>("/v1/auth/complete-profile", {
    method: "POST",
    auth: "required",
    body: input,
  });
}

export function getMe(signal?: AbortSignal): Promise<User> {
  return apiFetch<User>("/v1/users/me", { auth: "required", signal });
}

export function updateMe(patch: Partial<Pick<User, "first_name" | "last_name" | "email" | "theme" | "district_id">>): Promise<User> {
  // `UpdateSchema` forbids unknown keys AND rejects an empty body, so callers
  // must send only what changed and must not call this with nothing.
  return apiFetch<User>("/v1/users/me", { method: "PATCH", auth: "required", body: patch });
}

/** The chain this user owns, if any. Absence is what "not a partner" means. */
export function getMyGroup(signal?: AbortSignal): Promise<VenueGroup> {
  return apiFetch<VenueGroup>("/v1/venue/groups/me", { auth: "required", signal });
}

/**
 * Ends the session on the server as well as here.
 *
 * The refresh token is revoked server-side; dropping it locally alone would
 * leave a working credential in the database for thirty days.
 */
export async function logout(): Promise<void> {
  const refreshToken = getRefreshToken();
  try {
    if (refreshToken) {
      await apiFetch<void>("/v1/auth/logout", {
        method: "POST",
        auth: "required",
        body: { refresh_token: refreshToken },
      });
    }
  } finally {
    clearSession();
  }
}
