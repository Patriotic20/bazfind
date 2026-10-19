"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import {
  UserRead,
  PhoneLogin,
  PhoneRegister,
  StaffLogin,
  UserProfileUpdate,
  TokenPair,
} from "@/lib/api/types";
import {
  authService,
  userService,
  getAccessToken,
  getRefreshToken,
  clearTokens,
} from "@/lib/api";

interface AuthContextType {
  user: UserRead | null;
  loading: boolean;
  isAuthenticated: boolean;
  isPartner: boolean;
  isAdmin: boolean;
  checkPhone: (phone: string) => Promise<{ phone: string; registered: boolean; password_required: boolean }>;
  login: (data: PhoneLogin) => Promise<TokenPair>;
  register: (data: PhoneRegister) => Promise<TokenPair>;
  loginStaff: (data: StaffLogin) => Promise<TokenPair>;
  loginTelegram: (initData: string) => Promise<TokenPair>;
  logout: () => Promise<void>;
  deleteAccount: () => Promise<void>;
  refreshUser: () => Promise<UserRead | null>;
  updateProfile: (data: UserProfileUpdate) => Promise<UserRead>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserRead | null>(null);
  const [loading, setLoading] = useState(true);

  const syncLegacyStorage = (currentUser: UserRead | null) => {
    if (typeof window === "undefined") return;
    if (currentUser) {
      localStorage.setItem("isRegistered", "true");
      const fullName = `${currentUser.first_name || ""} ${currentUser.last_name || ""}`.trim() || "Foydalanuvchi";
      localStorage.setItem("fullName", fullName);
      if (currentUser.phone) localStorage.setItem("phone", currentUser.phone);
      const isPrivileged =
        currentUser.role === "partner" ||
        currentUser.role === "venue_owner" ||
        currentUser.role === "venue_staff" ||
        currentUser.role === "admin" ||
        currentUser.role === "staff";
      localStorage.setItem("userRole", isPrivileged ? "partner" : "customer");
    } else {
      localStorage.setItem("isRegistered", "false");
      localStorage.removeItem("fullName");
      localStorage.removeItem("phone");
      localStorage.removeItem("userRole");
    }
    window.dispatchEvent(new Event("isRegisteredChange"));
  };

  const refreshUser = useCallback(async (): Promise<UserRead | null> => {
    const token = getAccessToken();
    if (!token) {
      setUser(null);
      syncLegacyStorage(null);
      setLoading(false);
      return null;
    }

    try {
      const profile = await userService.getMe();
      setUser(profile);
      syncLegacyStorage(profile);
      return profile;
    } catch (err: any) {
      if (err?.status === 401 || err?.status === 403) {
        clearTokens();
      }
      setUser(null);
      syncLegacyStorage(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshUser();

    const handleLogoutEvent = () => {
      setUser(null);
      syncLegacyStorage(null);
    };

    window.addEventListener("auth:logout", handleLogoutEvent);
    return () => {
      window.removeEventListener("auth:logout", handleLogoutEvent);
    };
  }, [refreshUser]);

  const checkPhone = async (phone: string) => {
    return authService.checkPhone(phone);
  };

  const login = async (data: PhoneLogin): Promise<TokenPair> => {
    const tokens = await authService.login(data);
    await refreshUser();
    return tokens;
  };

  const register = async (data: PhoneRegister): Promise<TokenPair> => {
    const tokens = await authService.register(data);
    await refreshUser();
    return tokens;
  };

  const loginStaff = async (data: StaffLogin): Promise<TokenPair> => {
    const tokens = await authService.loginStaff(data);
    await refreshUser();
    return tokens;
  };

  const loginTelegram = async (initData: string): Promise<TokenPair> => {
    const tokens = await authService.loginTelegram(initData);
    await refreshUser();
    return tokens;
  };

  const logout = async (): Promise<void> => {
    const refresh = getRefreshToken();
    if (refresh) {
      try {
        await authService.logout(refresh);
      } catch {}
    }
    clearTokens();
    setUser(null);
    syncLegacyStorage(null);
  };

  const deleteAccount = async (): Promise<void> => {
    try {
      await userService.deleteMe();
    } catch {}
    clearTokens();
    setUser(null);
    syncLegacyStorage(null);
  };

  const updateProfile = async (data: UserProfileUpdate): Promise<UserRead> => {
    const updated = await userService.updateMe(data);
    setUser(updated);
    syncLegacyStorage(updated);
    return updated;
  };

  const isAuthenticated = !!user;
  const isPartner =
    user?.role === "partner" ||
    user?.role === "venue_owner" ||
    user?.role === "venue_staff" ||
    user?.role === "admin" ||
    user?.role === "staff";
  const isAdmin = user?.role === "admin";

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAuthenticated,
        isPartner,
        isAdmin,
        checkPhone,
        login,
        register,
        loginStaff,
        loginTelegram,
        logout,
        deleteAccount,
        refreshUser,
        updateProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
