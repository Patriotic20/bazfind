import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import BottomNav from "@/components/bottom-nav";
import SplashScreen from "@/components/splash-screen";

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
        <ThemeProvider>
          {/* Global App Load Splash Screen */}
          <SplashScreen />
          
          {/* Centered Mobile-only Device Mock Frame */}
          <div className="w-full max-w-md min-h-screen bg-[var(--background)] flex flex-col shadow-2xl relative border-x border-brand-light-border dark:border-brand-dark-border pb-16">
            {children}
            <BottomNav />
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}
