import { apiFetch, setTokens, clearTokens } from "../config";
import {
  PhoneCheck,
  PhoneCheckResult,
  PhoneRegister,
  PhoneLogin,
  TelegramLogin,
  TelegramContactShare,
  StaffLogin,
  TokenPair,
  UserRead,
  UserProfileUpdate,
  PasswordChange,
  RefreshRequest,
} from "../types";

export const authService = {
  // Check if phone number is registered
  async checkPhone(phone: string): Promise<PhoneCheckResult> {
    return apiFetch<PhoneCheckResult>("/api/v1/auth/phone-check", {
      method: "POST",
      body: JSON.stringify({ phone }),
      skipAuth: true,
    });
  },

  // Register new user with phone
  async register(data: PhoneRegister): Promise<TokenPair> {
    const res = await apiFetch<TokenPair>("/api/v1/auth/register", {
      method: "POST",
      body: JSON.stringify(data),
      skipAuth: true,
    });
    setTokens({
      access_token: res.access_token,
      refresh_token: res.refresh_token,
    });
    return res;
  },

  // Login with phone
  async login(data: PhoneLogin): Promise<TokenPair> {
    const res = await apiFetch<TokenPair>("/api/v1/auth/login", {
      method: "POST",
      body: JSON.stringify(data),
      skipAuth: true,
    });
    setTokens({
      access_token: res.access_token,
      refresh_token: res.refresh_token,
    });
    return res;
  },

  // Login via Telegram Mini App initData
  async loginTelegram(initData: string): Promise<TokenPair> {
    const res = await apiFetch<TokenPair>("/api/v1/auth/telegram", {
      method: "POST",
      body: JSON.stringify({ init_data: initData }),
      skipAuth: true,
    });
    setTokens({
      access_token: res.access_token,
      refresh_token: res.refresh_token,
    });
    return res;
  },

  // Share Telegram contact to bind phone
  async shareTelegramContact(contactData: string): Promise<UserRead> {
    return apiFetch<UserRead>("/api/v1/auth/telegram/contact", {
      method: "POST",
      body: JSON.stringify({ contact_data: contactData }),
    });
  },

  // Complete profile if pending
  async completeProfile(data: UserProfileUpdate): Promise<UserRead> {
    return apiFetch<UserRead>("/api/v1/auth/complete-profile", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  // Set or change password
  async setPassword(data: PasswordChange): Promise<void> {
    return apiFetch<void>("/api/v1/auth/password", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  // Staff login with login & password
  async loginStaff(data: StaffLogin): Promise<TokenPair> {
    const res = await apiFetch<TokenPair>("/api/v1/auth/staff-login", {
      method: "POST",
      body: JSON.stringify(data),
      skipAuth: true,
    });
    setTokens({
      access_token: res.access_token,
      refresh_token: res.refresh_token,
    });
    return res;
  },

  // Refresh token
  async refresh(refreshToken: string): Promise<TokenPair> {
    const res = await apiFetch<TokenPair>("/api/v1/auth/refresh", {
      method: "POST",
      body: JSON.stringify({ refresh_token: refreshToken }),
      skipAuth: true,
    });
    setTokens({
      access_token: res.access_token,
      refresh_token: res.refresh_token,
    });
    return res;
  },

  // Logout from current device
  async logout(refreshToken: string): Promise<void> {
    try {
      await apiFetch<void>("/api/v1/auth/logout", {
        method: "POST",
        body: JSON.stringify({ refresh_token: refreshToken }),
      });
    } finally {
      clearTokens();
    }
  },

  // Logout from all devices
  async logoutAll(): Promise<void> {
    try {
      await apiFetch<void>("/api/v1/auth/logout-all", {
        method: "POST",
      });
    } finally {
      clearTokens();
    }
  },
};
