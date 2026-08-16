"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useSyncExternalStore,
} from "react";

import { getWebApp } from "@/lib/telegram/webapp";

type Theme = "light" | "dark";

type ThemeContextType = {
  theme: Theme;
  toggleTheme: () => void;
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

/**
 * Telegram's colour scheme, as an external store.
 *
 * `useSyncExternalStore` rather than an effect that calls `setTheme`: this is a
 * value owned outside React that can change at any moment, which is exactly
 * what the hook is for. Reading it during render also means the first paint is
 * already the right colour, instead of flashing light and correcting itself.
 */
function subscribeToTelegramTheme(onChange: () => void): () => void {
  const webApp = getWebApp();
  if (!webApp) return () => {};
  webApp.onEvent("themeChanged", onChange);
  return () => webApp.offEvent("themeChanged", onChange);
}

function telegramTheme(): Theme | null {
  const webApp = getWebApp();
  // `initData` rather than the SDK's presence: the script loads on any page,
  // but only a real Telegram launch has a scheme worth following.
  return webApp && webApp.initData ? webApp.colorScheme : null;
}

/** The server has no Telegram, so it renders the local theme. */
function noTelegramOnServer(): Theme | null {
  return null;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [localTheme, setTheme] = useState<Theme>("light");
  const fromTelegram = useSyncExternalStore(
    subscribeToTelegramTheme,
    telegramTheme,
    noTelegramOnServer,
  );

  // Inside Telegram the client owns the colour scheme, and a Mini App that
  // stays light inside a dark Telegram reads as broken rather than themed — so
  // the saved preference is deliberately overridden there.
  const theme = fromTelegram ?? localTheme;

  useEffect(() => {
    if (telegramTheme() !== null) return;

    const savedTheme = localStorage.getItem("bazmly-theme") as Theme | null;
    if (savedTheme) {
      setTheme(savedTheme);
    } else if (window.matchMedia("(prefers-color-scheme: light)").matches) {
      setTheme("light");
    }
  }, []);

  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
      root.classList.remove("light");
      root.style.colorScheme = "dark";
    } else {
      root.classList.add("light");
      root.classList.remove("dark");
      root.style.colorScheme = "light";
    }
    // Telegram's scheme is not the user's preference for this site, so it is
    // not written back — otherwise opening the Mini App once would silently
    // repaint the browser version too.
    if (fromTelegram === null) localStorage.setItem("bazmly-theme", theme);
  }, [theme, fromTelegram]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
