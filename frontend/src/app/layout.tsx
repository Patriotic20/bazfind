import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Geist_Mono } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { TelegramProvider } from "@/components/telegram-provider";
import BottomNav from "@/components/bottom-nav";
import SplashScreen from "@/components/splash-screen";
import Providers from "./providers";

const plusJakartaSans = Plus_Jakarta_Sans({
  variable: "--font-plus-jakarta-sans",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "BAZMLY - Telegram Mini App",
  description: "Marosim zallari va restoranlarni bron qilish uchun premium Telegram Mini App.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="uz"
      className={`${plusJakartaSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full bg-[var(--background)] text-foreground transition-colors duration-300 flex justify-center items-stretch">
        {/*
          Inside <body>, not beside it: React rejects a <script> as a direct
          child of <html>, and the resulting hydration error takes the whole
          client render down with it. `beforeInteractive` is hoisted into the
          head by Next from here just the same, which is what the Telegram
          runtime needs — it must exist before any application code reads it.
        */}
        <Script src="https://telegram.org/js/telegram-web-app.js" strategy="beforeInteractive" />
        <Providers>
          <TelegramProvider>
            <ThemeProvider>
              {/* Global App Load Splash Screen */}
              <SplashScreen />

              {/* Centered Mobile-only Device Mock Frame */}
              <div className="w-full max-w-md min-h-screen bg-[var(--background)] flex flex-col shadow-2xl relative border-x border-brand-light-border dark:border-brand-dark-border pb-16">
                {children}
                <BottomNav />
              </div>
            </ThemeProvider>
          </TelegramProvider>
        </Providers>
      </body>
    </html>
  );
}
