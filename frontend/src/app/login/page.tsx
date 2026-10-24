"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "@/components/theme-provider";
import {
  Globe,
  Search,
  Check,
  Phone,
  Apple,
  Lock,
  User,
  ArrowRight,
  ChevronLeft,
  MapPin,
  Bell,
  Wallet,
  CreditCard,
  Clock,
  Languages,
  Headset,
  HelpCircle,
  LogOut,
  ChevronRight,
  Share2,
  CheckCircle,
  X,
  ChevronDown,
  Trash2,
  Sun,
  Moon,
  Loader2,
  Store,
} from "lucide-react";
import Navbar from "@/components/navbar";
import { TelegramPhonePrompt } from "@/components/telegram-phone-prompt";
import { useAuth } from "@/contexts/AuthContext";
import { PhoneInput } from "@/components/phone-input";
import { AmountInput } from "@/components/amount-input";
import { PasswordInput } from "@/components/password-input";
import {
  EMPTY_VENUE_SETUP,
  SetupKind,
  VenueSetup,
  VenueSetupDraft,
  isVenueSetupComplete,
  tableCountsPayload,
  tableSeats,
} from "@/components/venue-setup";
import { formatPhone, toE164 } from "@/lib/phone";
import {
  authService,
  userService,
  geoService,
  partnerService,
  catalogService,
  engagementService,
  RegionRead,
  DistrictRead,
  NotificationRead,
} from "@/lib/api";

type Step =
  | 1
  | 2
  | "login"
  | "register_customer"
  | "register_customer_phone_otp"
  | "register_customer_email_otp"
  | "register_customer_name"
  | 3
  | "partner_address"
  | "region"
  | "district"
  | "partner_hours"
  | "venue_setup"
  | 4
  | "partner_price"
  | 5
  | 6
  | "partner_password"
  | 7
  | 8;

interface Language {
  code: string;
  name: string;
  nativeName: string;
  flag: string;
}

const LANGUAGES: Language[] = [
  { code: "en", name: "English", nativeName: "English", flag: "/icons/eng.png" },
  { code: "ru", name: "Russian", nativeName: "Русский", flag: "/icons/ru.png" },
  { code: "uz", name: "Uzbek", nativeName: "O'zbekcha", flag: "/icons/uzb.png" },
];

const FAQS = [
  {
    q: "Qanday qilib restoran yoki marosim zalini bron qilish mumkin?",
    a: "Bosh sahifadan restoran yoki to'yxonani tanlang, sana, vaqt va mehmonlar sonini belgilang. Bron muassasaga so'rov sifatida boradi; muassasa tasdiqlagach, chiptangiz 'Mening bronlarim' bo'limida faollashadi."
  },
  {
    q: "To'lov qanday amalga oshiriladi?",
    a: "Ilova orqali onlayn to'lov hozircha yo'q — to'lov muassasaning o'zida amalga oshiriladi. Ba'zi to'yxonalar depozit talab qiladi; uning miqdori bron oynasida ko'rsatiladi."
  },
  {
    q: "Buyurtmani bekor qilsam, pulim qaytariladimi?",
    a: "Bronni 'Mening bronlarim' bo'limidan bekor qilishingiz mumkin. Depozit to'langan bo'lsa va tadbirga 24 soatdan kam qolgan bo'lsa, depozit qaytarilmaydi."
  },
  {
    q: "Promo-kodlar va kuponlardan qanday foydalanaman?",
    a: "Promokodlar hozircha mavjud emas. Muassasalarning o'z chegirmalari esa ularning sahifasida ko'rsatiladi."
  }
];

export default function LoginPage() {
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();
  const { user, login, register, loginStaff, logout, updateProfile, deleteAccount, checkPhone } = useAuth();
  const isDark = theme === "dark";
  const [mounted, setMounted] = useState(false);
  const [isRegistered, setIsRegistered] = useState(false);
  // Set while a sign-in or sign-up is on its way to another page. The account
  // exists as soon as `register`/`login` resolves, which would swap this page to
  // the profile view while the partner setup is still running — so the profile
  // flashed up before the panel opened.
  const [leaving, setLeaving] = useState(false);
  // Step 1 was an interface-language picker; the interface has one language
  // and the server no longer stores a choice, so the wizard starts at 2.
  const [step, setStep] = useState<Step>(2);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  
  // Registration / Profile States
  const [searchLang, setSearchLang] = useState("");
  const [selectedLang, setSelectedLang] = useState("uz");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [fullName, setFullName] = useState("");
  const [location, setLocation] = useState("Tashkent, Tashkent city");
  const [role, setRole] = useState<"customer" | "partner">("customer");
  
  // New login/wizard states
  const [accountType, setAccountType] = useState<"customer" | "restaurant" | "toyxona" | "both">("customer");
  const [username, setUsername] = useState("");
  // Customers and owners sign in by phone, staff by the login the owner issued.
  // Two modes rather than one guessing field, so the phone can keep +998 fixed.
  const [loginMode, setLoginMode] = useState<"phone" | "login">("phone");
  const [password, setPassword] = useState("");
  const [venueName, setVenueName] = useState("");
  const [venueType, setVenueType] = useState<"restaurant" | "toyxona">("restaurant");
  const [venueHours, setVenueHours] = useState("09:00 - 23:00");
  const [partnerStreet, setPartnerStreet] = useState("");
  const [partnerHouse, setPartnerHouse] = useState("");
  const [venueCapacity, setVenueCapacity] = useState("");
  const [venuePrice, setVenuePrice] = useState("");
  // Seats, hours, days, notice and (for a to'yxona) services, collected on the
  // setup screens and written once the account exists.
  const [venueSetup, setVenueSetup] = useState<VenueSetupDraft>(EMPTY_VENUE_SETUP);
  const [setupEntry, setSetupEntry] = useState<"hub" | "services">("hub");
  const setupKind: SetupKind = accountType === "toyxona" ? "toyxona" : accountType === "both" ? "both" : "restoran";
  const [venueImages, setVenueImages] = useState<string[]>([]);
  const [activePartnerField, setActivePartnerField] = useState<"name" | "hours" | "capacity" | "price" | "phone" | "password" | "">("name");
  const [isNumLayout, setIsNumLayout] = useState(false);
  const [reg, setReg] = useState("");
  const [dist, setDist] = useState("");
  const [partnerRegions, setPartnerRegions] = useState<RegionRead[]>([]);
  const [partnerDistricts, setPartnerDistricts] = useState<DistrictRead[]>([]);
  const [selectedPartnerRegionId, setSelectedPartnerRegionId] = useState<number | null>(null);
  const [selectedPartnerDistrictId, setSelectedPartnerDistrictId] = useState<number | null>(null);
  const [loadingPartnerDistricts, setLoadingPartnerDistricts] = useState(false);

  // Profile Edit Mode States
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editLocation, setEditLocation] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [showCards, setShowCards] = useState(false);
  const [showLanguages, setShowLanguages] = useState(false);
  const [showMessages, setShowMessages] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [tempLanguage, setTempLanguage] = useState("uz");

  // Cards Management States
  const [userCards, setUserCards] = useState([
    { id: "1", type: "humo", number: "**** **** **** 1234", name: "" }
  ]);
  const [selectedCardForDelete, setSelectedCardForDelete] = useState<any | null>(null);
  const [showAddCard, setShowAddCard] = useState(false);
  const [newCardNumber, setNewCardNumber] = useState("");
  const [newCardExpiry, setNewCardExpiry] = useState("");
  const [showCardOtp, setShowCardOtp] = useState(false);
  const [cardOtp, setCardOtp] = useState(["", "", "", "", "", ""]);

  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, "");
    const formatted = val.match(/.{1,4}/g)?.join(" ") || val;
    setNewCardNumber(formatted.substring(0, 19));
  };

  const handleCardExpiryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, "");
    let formatted = val;
    if (val.length > 2) {
      formatted = val.substring(0, 2) + "/" + val.substring(2, 4);
    }
    setNewCardExpiry(formatted.substring(0, 5));
  };

  const handleKeypadPress = (key: string) => {
    if (key === "⌫") {
      setCardOtp(prev => {
        const next = [...prev];
        for (let i = 5; i >= 0; i--) {
          if (next[i] !== "") {
            next[i] = "";
            break;
          }
        }
        return next;
      });
    } else if (key === "+*#" || key === "") {
      // do nothing
    } else {
      setCardOtp(prev => {
        const next = [...prev];
        for (let i = 0; i < 6; i++) {
          if (next[i] === "") {
            next[i] = key;
            break;
          }
        }
        return next;
      });
    }
  };

  const [isCaps, setIsCaps] = useState(false);
  
  const handleCustomerFinalRegister = async () => {
    setError("");
    const nameParts = fullName.trim().split(/\s+/);
    if (nameParts.length < 2) {
      setError("Ism va familiyangizni kiriting!");
      return;
    }
    if (password.trim().length < 8) {
      setError("Parol kamida 8 belgidan iborat bo'lsin!");
      return;
    }

    setLoading(true);
    try {
      const firstName = nameParts[0];
      const lastName = nameParts.slice(1).join(" ");
      const formattedPhone = toE164(phone);
      if (!formattedPhone) {
        setError("Telefon raqamini to'liq kiriting!");
        return;
      }

      setLeaving(true);
      await register({
        phone: formattedPhone,
        first_name: firstName,
        last_name: lastName,
        password: password.trim(),
      });

      setIsRegistered(true);
      setRole("customer");
      setFullName(fullName.trim());
      setPhone(formattedPhone);
      showToast("Ro'yxatdan muvaffaqiyatli o'tdingiz!");
      router.push("/feed");
    } catch (err: any) {
      setLeaving(false);
      setError(err?.message || "Ro'yxatdan o'tishda xatolik yuz berdi");
    } finally {
      setLoading(false);
    }
  };

  const handlePhoneCheckAndContinue = async () => {
    if (phone.length < 9) {
      setError("Telefon raqamingizni to'liq kiriting!");
      return;
    }
    setError("");
    const formattedPhone = toE164(phone);
    if (!formattedPhone) {
      setError("Telefon raqamini to'liq kiriting!");
      return;
    }

    setLoading(true);
    try {
      const result = await checkPhone(formattedPhone);
      if (result.registered) {
        showToast("Bu raqam ro'yxatdan o'tgan — parolingiz bilan kiring.");
        setUsername(phone);
        setStep("login");
      } else {
        // There is no SMS step behind the API, so none is pretended here.
        setStep("register_customer_name");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Raqamni tekshirib bo'lmadi");
    } finally {
      setLoading(false);
    }
  };

  const handleCustomKeyPress = (key: string) => {
    if (step === "register_customer") {
      if (key === "⌫") {
        setPhone(prev => prev.slice(0, -1));
      } else if (key === "+*#" || key === "") {
        // do nothing
      } else {
        if (phone.length < 9) {
          setPhone(prev => prev + key);
        }
      }
    } else if (step === "register_customer_phone_otp" || step === "register_customer_email_otp") {
      if (key === "⌫") {
        const newOtp = [...otp];
        for (let i = 5; i >= 0; i--) {
          if (newOtp[i] !== "") {
            newOtp[i] = "";
            break;
          }
        }
        setOtp(newOtp);
      } else if (key === "+*#" || key === "") {
        // do nothing
      } else {
        const newOtp = [...otp];
        for (let i = 0; i < 6; i++) {
          if (newOtp[i] === "") {
            newOtp[i] = key;
            break;
          }
        }
        setOtp(newOtp);
      }
    } else if (step === 4) {
      if (key === "⌫") {
        setVenueCapacity(prev => prev.slice(0, -1));
      } else if (key !== "+*#" && key !== "") {
        setVenueCapacity(prev => prev + key);
      }
    } else if (step === "partner_price") {
      if (key === "⌫") {
        setVenuePrice(prev => prev.slice(0, -1));
      } else if (key !== "+*#" && key !== "") {
        setVenuePrice(prev => prev + key);
      }
    } else if (step === 6) {
      if (key === "⌫") {
        setPhone(prev => prev.slice(0, -1));
      } else if (key !== "+*#" && key !== "") {
        if (phone.length < 9) {
          setPhone(prev => prev + key);
        }
      }
    } else if (step === "partner_password") {
      if (key === "⌫") {
        setPassword(prev => prev.slice(0, -1));
      } else if (key !== "+*#" && key !== "") {
        setPassword(prev => prev + key);
      }
    } else if (step === 7) {
      if (key === "⌫") {
        const newOtp = [...otp];
        for (let i = 5; i >= 0; i--) {
          if (newOtp[i] !== "") {
            newOtp[i] = "";
            break;
          }
        }
        setOtp(newOtp);
      } else if (key !== "+*#" && key !== "") {
        const newOtp = [...otp];
        for (let i = 0; i < 6; i++) {
          if (newOtp[i] === "") {
            newOtp[i] = key;
            break;
          }
        }
        setOtp(newOtp);
      }
    }
  };

  const handleQwertyPress = (key: string) => {
    if (key === "⌫") {
      if (step === "register_customer_name") {
        setFullName(prev => prev.slice(0, -1));
      } else if (step === 3) {
        setVenueName(prev => prev.slice(0, -1));
      } else if (step === "partner_hours") {
        setVenueHours(prev => prev.slice(0, -1));
      }
    } else if (key === "space") {
      if (step === "register_customer_name") {
        setFullName(prev => prev + " ");
      } else if (step === 3) {
        setVenueName(prev => prev + " ");
      } else if (step === "partner_hours") {
        setVenueHours(prev => prev + " ");
      }
    } else if (key === "shift") {
      setIsCaps(prev => !prev);
    } else if (key === "123" || key === "abc") {
      setIsNumLayout(prev => !prev);
    } else if (key === "return") {
      if (step === "register_customer_name") {
        handleCustomerFinalRegister();
      } else {
        handleNextStep();
      }
    } else if (key === "globe" || key === "mic") {
      // do nothing or mock
    } else {
      const char = isCaps ? key.toUpperCase() : key;
      if (step === "register_customer_name") {
        setFullName(prev => prev + char);
      } else if (step === 3) {
        setVenueName(prev => prev + char);
      } else if (step === "partner_hours") {
        setVenueHours(prev => prev + char);
      }
    }
  };

  const renderNumericKeypad = (onKeyPress: (key: string) => void) => {
    return (
      <div className={`grid grid-cols-3 gap-y-3 gap-x-4 px-4 py-4 rounded-3xl ${
        isDark ? "bg-[#2C2C2E]/40" : "bg-[#D1D3D9]/40 backdrop-blur-md"
      }`}>
        {[
          { val: "1", sub: "" },
          { val: "2", sub: "abc" },
          { val: "3", sub: "def" },
          { val: "4", sub: "ghi" },
          { val: "5", sub: "jkl" },
          { val: "6", sub: "mno" },
          { val: "7", sub: "pqrs" },
          { val: "8", sub: "tuv" },
          { val: "9", sub: "wxyz" },
          { val: "", sub: "" },
          { val: "0", sub: "" },
          { val: "⌫", sub: "" }
        ].map((btn, index) => {
          if (btn.val === "") {
            return <div key={index} className="py-2.5" />;
          }
          const isSpecial = btn.val === "⌫";
          return (
            <button
              key={index}
              type="button"
              onClick={() => onKeyPress(btn.val)}
              className={`rounded-xl py-3 flex flex-col items-center justify-center transition-all duration-100 cursor-pointer ${
                isDark
                  ? "bg-[#2C2C2E] hover:bg-[#3A3A3C] active:bg-[#48484A]"
                  : isSpecial
                    ? "bg-transparent text-black hover:bg-zinc-200 active:bg-zinc-300"
                    : "bg-white text-black shadow-[0_1px_2px_rgba(0,0,0,0.1)] hover:bg-zinc-50 active:bg-zinc-100"
              }`}
            >
              <span className={`text-xl font-bold leading-tight ${isDark ? "text-white" : "text-black"}`}>{btn.val}</span>
              {btn.sub && <span className={`text-[9px] font-medium uppercase tracking-widest leading-none ${
                isDark ? "text-white/40" : "text-zinc-505"
              }`}>{btn.sub}</span>}
            </button>
          );
        })}
      </div>
    );
  };

  const renderQwertyKeyboard = (onKeyPress: (key: string) => void) => {
    const row1 = isNumLayout
      ? ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"]
      : ["q", "w", "e", "r", "t", "y", "u", "i", "o", "p"];
    const row2 = isNumLayout
      ? ["-", "/", ":", ";", "(", ")", "$", "&", "@"]
      : ["a", "s", "d", "f", "g", "h", "j", "k", "l"];
    const row3 = isNumLayout
      ? ["abc", ".", ",", "?", "!", "'", "⌫"]
      : ["shift", "z", "x", "c", "v", "b", "n", "m", "⌫"];
    const row4 = ["123", "globe", "space", "return"];

    return (
      <div className={`flex flex-col gap-2 p-2 rounded-3xl ${
        isDark ? "bg-[#2C2C2E]/40" : "bg-[#D1D3D9]/40 backdrop-blur-md"
      }`}>
        {/* Row 1 */}
        <div className="flex gap-1 justify-center">
          {row1.map((char) => (
            <button
              key={char}
              type="button"
              onClick={() => onKeyPress(char)}
              className={`flex-1 rounded-lg py-3 text-sm font-semibold transition-all active:scale-95 cursor-pointer flex justify-center items-center h-11 ${
                isDark ? "bg-[#3A3A3C] text-white hover:bg-[#48484A]" : "bg-white text-black shadow-[0_1px_2px_rgba(0,0,0,0.1)] hover:bg-zinc-50"
              }`}
            >
              {isCaps ? char.toUpperCase() : char}
            </button>
          ))}
        </div>

        {/* Row 2 */}
        <div className="flex gap-1 justify-center px-4">
          {row2.map((char) => (
            <button
              key={char}
              type="button"
              onClick={() => onKeyPress(char)}
              className={`flex-1 rounded-lg py-3 text-sm font-semibold transition-all active:scale-95 cursor-pointer flex justify-center items-center h-11 ${
                isDark ? "bg-[#3A3A3C] text-white hover:bg-[#48484A]" : "bg-white text-black shadow-[0_1px_2px_rgba(0,0,0,0.1)] hover:bg-zinc-50"
              }`}
            >
              {isCaps ? char.toUpperCase() : char}
            </button>
          ))}
        </div>

        {/* Row 3 */}
        <div className="flex gap-1 justify-center">
          {row3.map((char) => {
            const isSpecial = char === "shift" || char === "abc" || char === "⌫";
            return (
              <button
                key={char}
                type="button"
                onClick={() => onKeyPress(char)}
                className={`rounded-lg py-3 text-sm font-semibold transition-all active:scale-95 cursor-pointer flex justify-center items-center h-11 ${
                  char === "shift"
                    ? `w-12 ${isCaps ? "bg-[#FF5A00] text-white" : isDark ? "bg-[#2C2C2E] text-white" : "bg-[#B0B3BC] text-black"}`
                    : char === "abc"
                      ? `w-12 ${isDark ? "bg-[#2C2C2E] text-white" : "bg-[#B0B3BC] text-black"}`
                      : char === "⌫"
                        ? `w-12 ${isDark ? "bg-[#2C2C2E] text-white" : "bg-[#B0B3BC] text-black"}`
                        : `flex-1 ${isDark ? "bg-[#3A3A3C] text-white hover:bg-[#48484A]" : "bg-white text-black shadow-[0_1px_2px_rgba(0,0,0,0.1)] hover:bg-zinc-50"}`
                }`}
              >
                {char === "shift" ? "⇧" : char === "abc" ? "abc" : isCaps && !isSpecial ? char.toUpperCase() : char}
              </button>
            );
          })}
        </div>

        {/* Row 4 */}
        <div className="flex gap-1 justify-center">
          {row4.map((char) => {
            const displayChar = char === "123" ? (isNumLayout ? "abc" : "123") : char;
            const actionKey = char === "123" ? (isNumLayout ? "abc" : "123") : char;
            return (
              <button
                key={char}
                type="button"
                onClick={() => onKeyPress(actionKey)}
                className={`rounded-lg py-3 text-xs font-bold transition-all active:scale-95 cursor-pointer flex justify-center items-center h-11 ${
                  char === "space"
                    ? `flex-1 ${isDark ? "bg-[#3A3A3C] text-white hover:bg-[#48484A]" : "bg-white text-black shadow-[0_1px_2px_rgba(0,0,0,0.1)] hover:bg-zinc-50"}`
                    : char === "return"
                      ? `w-20 bg-[#FF5A00] text-white hover:bg-[#E04F00]`
                      : `w-12 ${isDark ? "bg-[#2C2C2E] text-white" : "bg-[#B0B3BC] text-black"}`
                }`}
              >
                {char === "space" ? "Space" : char === "return" ? "Next" : displayChar}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<NotificationRead[] | null>(null);
  // Owning a chain does not change users.role on the server, so the panel link
  // follows the chain itself rather than the role.
  const [ownsChain, setOwnsChain] = useState(false);
  const [notificationsError, setNotificationsError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState("");

  // Mount effect to check registration state
  useEffect(() => {
    setMounted(true);
    if (user) {
      setIsRegistered(true);
      const name = `${user.first_name || ""} ${user.last_name || ""}`.trim() || "Foydalanuvchi";
      setFullName(name);
      if (user.phone) setPhone(user.phone);
      const isPrivileged =
        user.role === "partner" ||
        user.role === "venue_owner" ||
        user.role === "venue_staff" ||
        user.role === "admin" ||
        user.role === "staff";
      setRole(isPrivileged ? "partner" : "customer");
    } else {
      // Only a signed-in account has a profile to show.
      setIsRegistered(false);
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;
    partnerService
      .getMyGroup()
      .then(() => setOwnsChain(true))
      .catch(() => setOwnsChain(false));
  }, [user]);

  useEffect(() => {
    geoService.getRegions()
      .then((res) => setPartnerRegions(res || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (selectedPartnerRegionId) {
      setLoadingPartnerDistricts(true);
      geoService.getDistricts(selectedPartnerRegionId)
        .then((d) => setPartnerDistricts(d || []))
        .catch(() => setPartnerDistricts([]))
        .finally(() => setLoadingPartnerDistricts(false));
    } else {
      setPartnerDistricts([]);
    }
  }, [selectedPartnerRegionId]);

  // Dynamic bottom navigation bar visibility controller for cards sub-flows & logout drawers
  useEffect(() => {
    const bottomNav = document.getElementById("global-bottom-nav");
    if (bottomNav) {
      if (
        (showCards && (showCardOtp || showAddCard || selectedCardForDelete)) ||
        activeModal === "logout_profile" ||
        activeModal === "delete_account" ||
        showLanguages ||
        showMessages ||
        showHelp
      ) {
        bottomNav.style.transform = "translateY(100%)";
        bottomNav.style.opacity = "0";
        bottomNav.style.pointerEvents = "none";
      } else {
        bottomNav.style.transform = "translateY(0)";
        bottomNav.style.opacity = "1";
        bottomNav.style.pointerEvents = "auto";
      }
    }
    return () => {
      if (bottomNav) {
        bottomNav.style.transform = "translateY(0)";
        bottomNav.style.opacity = "1";
        bottomNav.style.pointerEvents = "auto";
      }
    };
  }, [showCards, showCardOtp, showAddCard, selectedCardForDelete, activeModal, showLanguages, showMessages, showHelp]);

  // Toast auto-dismiss helper
  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(""), 3000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  if (!mounted) {
    return <div className="flex flex-col flex-1 bg-[var(--background)] animate-pulse" />;
  }

  const showToast = (msg: string) => {
    setToastMessage(msg);
  };

  const handleSaveProfile = async () => {
    if (!editName.trim()) {
      showToast("Ism va familiyangiz bo'sh bo'lishi mumkin emas!");
      return;
    }
    const nameParts = editName.trim().split(/\s+/);
    if (nameParts.length < 2) {
      showToast("Ism va familiyangizni kiriting!");
      return;
    }
    const firstName = nameParts[0];
    const lastName = nameParts.slice(1).join(" ");
    setLoading(true);
    try {
      await updateProfile({
        first_name: firstName,
        last_name: lastName,
      });
      showToast("Profil muvaffaqiyatli saqlandi!");
      setFullName(editName);
      setPhone(editPhone);
      setIsEditing(false);
    } catch (err: any) {
      showToast(err?.message || "Profilni saqlashda xatolik!");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    setLoading(true);
    try {
      await deleteAccount();
      setIsRegistered(false);
      setFullName("");
      setPhone("");
      setStep(2);
      setActiveModal(null);
      showToast("Akkaunt muvaffaqiyatli o'chirildi.");
    } catch (err: any) {
      showToast(err?.message || "Akkauntni o'chirishda xatolik yuz berdi.");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
    } catch {}
    setIsRegistered(false);
    setFullName("");
    setPhone("");
    setStep(2);
    setActiveModal(null);
    showToast("Akkauntdan chiqildi.");
  };

  const filteredLanguages = LANGUAGES.filter((l) =>
    l.name.toLowerCase().includes(searchLang.toLowerCase()) ||
    l.nativeName.toLowerCase().includes(searchLang.toLowerCase())
  );

  const handleNextStep = () => {
    setError("");
    if (step === 1) {
      setStep(2);
    } else if (step === 2) {
      // Welcome options screen transitions are triggered by buttons
    } else if (step === 3) {
      if (!venueName.trim()) {
        setError("Joyingiz nomini kiriting!");
        return;
      }
      if (!reg || !dist || !selectedPartnerDistrictId) {
        setError("Viloyat va tumanni belgilang!");
        return;
      }
      if (!partnerStreet.trim() || !partnerHouse.trim()) {
        setError("Ko'cha va uy raqamini kiriting!");
        return;
      }
      setSetupEntry("hub");
      setStep("venue_setup");
    } else if (step === "partner_price") {
      if (!venuePrice.trim()) {
        setError("Narxni kiriting!");
        return;
      }
      // Photos have no upload endpoint yet, so the gallery step is skipped
      // rather than collecting pictures that would never be saved.
      setStep(6);
    } else if (step === 6) {
      if (fullName.trim().split(/\s+/).length < 2) {
        setError("Ism va familiyangizni kiriting!");
        return;
      }
      if (phone.length < 9) {
        setError("Telefon raqamini to'liq kiriting!");
        return;
      }
      setStep("partner_password");
    } else if (step === "partner_password") {
      if (password.trim().length < 8) {
        setError("Parol kamida 8 belgidan iborat bo'lsin!");
        return;
      }
      handleCompletePartnerRegistration();
    }
  };

  const handleBackStep = () => {
    setError("");
    if (step === 2) {
      setStep(2);
    } else if (step === "login" || step === "register_customer") {
      setStep(2);
    } else if (step === "register_customer_phone_otp") {
      setStep("register_customer");
    } else if (step === "register_customer_email_otp") {
      setStep("register_customer_phone_otp");
    } else if (step === "register_customer_name") {
      setStep("register_customer");
    } else if (step === 3) {
      setStep(2);
    } else if (step === "partner_address") {
      setStep(3);
    } else if (step === "region") {
      setStep(3);
    } else if (step === "district") {
      setStep("region");
    } else if (step === "partner_price") {
      // A restaurant's setup ends at the hub; "both" ends at the services.
      setSetupEntry(setupKind === "both" ? "services" : "hub");
      setStep("venue_setup");
    } else if (step === 5) {
      setStep("partner_price");
    } else if (step === 6) {
      if (setupKind === "toyxona") {
        setSetupEntry("services");
        setStep("venue_setup");
      } else {
        setStep("partner_price");
      }
    } else if (step === "partner_password") {
      setStep(6);
    } else if (step === 7) {
      setStep("partner_password");
    } else if (step === 8) {
      setStep(7);
    }
  };

  const handleOtpChange = (value: string, index: number) => {
    if (isNaN(Number(value))) return;
    const newOtp = [...otp];
    newOtp[index] = value.substring(value.length - 1);
    setOtp(newOtp);

    if (value && index < 5) {
      const nextInput = document.getElementById(`otp-${index + 1}`);
      nextInput?.focus();
    }
  };

  const handleOtpKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      const prevInput = document.getElementById(`otp-${index - 1}`);
      prevInput?.focus();
    }
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!username.trim() || !password.trim()) {
      setError(loginMode === "phone" ? "Telefon va parolni to'liq kiriting!" : "Login va parolni to'liq kiriting!");
      return;
    }

    setLoading(true);
    try {
      if (loginMode === "phone") {
        const phoneToLogin = toE164(username);
        if (!phoneToLogin) {
          setError("Telefon raqamini to'liq kiriting!");
          return;
        }

        setLeaving(true);
        await login({ phone: phoneToLogin, password: password.trim() });
        showToast("Tizimga muvaffaqiyatli kirdingiz!");
        setIsRegistered(true);
        const me = await userService.getMe().catch(() => null);
        const ownsGroup = await partnerService.getMyGroup().then(() => true, () => false);
        if (ownsGroup || (me && (me.role === "venue_owner" || me.role === "venue_staff"))) {
          router.push("/admin");
        } else {
          router.push("/feed");
        }
        return;
      } else {
        // Staff username login
        setLeaving(true);
        await loginStaff({ login: username.trim(), password: password.trim() });
        showToast("Xodim sifatida tizimga kirdingiz!");
        setIsRegistered(true);
        router.push("/admin");
        return;
      }
    } catch (err: any) {
      setLeaving(false);
      setError(err?.message || "Login yoki parol noto'g'ri!");
    } finally {
      setLoading(false);
    }
  };

  const handleCustomerRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!fullName.trim() || !phone.trim() || !password.trim()) {
      setError("Iltimos, barcha maydonlarni to'ldiring!");
      return;
    }

    setStep(6);
  };

  /**
   * The account, the chain and its branches, in that order — each step stops on
   * the server's refusal instead of carrying on as if it worked. "Both" is two
   * branches of one chain: a restaurant and a to'yxona are booked differently
   * (a table against the whole hall), so one venue cannot be both.
   */
  const handleCompletePartnerRegistration = async () => {
    setError("");
    const district = partnerDistricts.find((d) => d.id === selectedPartnerDistrictId);
    if (!district || !isVenueSetupComplete(venueSetup, setupKind)) {
      setError("Manzil yoki ish vaqti to'liq emas — orqaga qaytib tekshiring.");
      return;
    }
    const formattedPhone = toE164(phone);
    if (!formattedPhone) {
      setError("Telefon raqamini to'liq kiriting!");
      return;
    }
    const [firstName, ...rest] = fullName.trim().split(/\s+/);
    const hasRestaurant = setupKind !== "toyxona";
    const hasHall = setupKind !== "restoran";
    const name = venueName.trim();
    const common = {
      district_id: district.id,
      street: partnerStreet.trim(),
      house_number: partnerHouse.trim(),
      // The district's own point until there is a map picker.
      latitude: Number(district.latitude),
      longitude: Number(district.longitude),
      phone: formattedPhone,
      min_advance_booking_days: venueSetup.minAdvanceDays,
    };
    const restaurantBranch = {
      ...common,
      name,
      venue_type: "restoran" as const,
      total_seats: tableSeats(venueSetup),
      base_price: Number(venuePrice.replace(/\D/g, "")) || null,
    };
    // A to'yxona is priced by its services, not by an average per guest.
    const hallBranch = {
      ...common,
      name: setupKind === "both" ? `${name} (To'yxona)` : name,
      venue_type: "toyxona" as const,
      capacity_min: Number(venueSetup.capacityMin) || null,
      capacity_max: Number(venueSetup.capacityMax),
      base_price: null,
    };
    const week = {
      days: Array.from({ length: 7 }, (_, weekday) =>
        venueSetup.weekdays.includes(weekday)
          ? { weekday, opens_at: `${venueSetup.opens}:00`, closes_at: `${venueSetup.closes}:00`, is_closed: false }
          : { weekday, opens_at: null, closes_at: null, is_closed: true },
      ),
    };

    setLoading(true);
    try {
      setLeaving(true);
      await register({ phone: formattedPhone, password: password.trim(), first_name: firstName, last_name: rest.join(" ") });
      const created = await partnerService.createGroupWithBranch({
        group: { name, primary_venue_type: hasRestaurant ? "restoran" : "toyxona" },
        branch: hasRestaurant ? restaurantBranch : hallBranch,
      });
      const groupId = created.group.id;
      const firstId = created.branches[0].id;
      const restaurantId = hasRestaurant ? firstId : null;
      const hallId = !hasHall
        ? null
        : hasRestaurant
          ? (await partnerService.createVenue(hallBranch, groupId)).id
          : firstId;

      for (const venueId of [restaurantId, hallId]) {
        if (venueId) await partnerService.updateWorkingHours(venueId, week);
      }
      if (restaurantId) {
        await partnerService.createTablesBulk(restaurantId, { counts: tableCountsPayload(venueSetup) });
      }
      if (hallId) {
        for (const [index, service] of venueSetup.services.entries()) {
          await catalogService.createVenueService(
            {
              service_catalog_id: service.catalogId,
              price: Number(service.price),
              sort_order: index,
              items: service.items.map((item, i) => ({ name: item.name, price: Number(item.price), sort_order: i })),
            },
            hallId,
            groupId,
          );
        }
      }
      for (const venueId of [restaurantId, hallId]) {
        if (venueId) await partnerService.updateVenue(venueId, { status: "active" });
      }
      showToast("Ro'yxatdan muvaffaqiyatli o'tdingiz!");
      router.push("/admin");
    } catch (err) {
      setLeaving(false);
      setError(err instanceof Error ? err.message : "Ro'yxatdan o'tishda xatolik yuz berdi");
    } finally {
      setLoading(false);
    }
  };

  const openNotifications = () => {
    setShowMessages(true);
    setNotifications(null);
    setNotificationsError(null);
    engagementService
      .getNotifications(50, 0)
      .then((page) => setNotifications(page.items))
      .catch((err) => setNotificationsError(err instanceof Error ? err.message : "Xabarlarni yuklab bo'lmadi"));
  };

  // Cards, interface languages and a booking "history" had no data behind
  // them; history is the tickets page, the other two are gone.
  const isPartnerAccount = ownsChain || user?.role === "venue_owner" || user?.role === "venue_staff";
  const menuItems = [
    ...(isPartnerAccount
      ? [
          {
            label: "Hamkor paneli",
            icon: Store,
            action: () => router.push("/admin"),
          },
        ]
      : []),
    {
      label: "Xabarlar",
      icon: Bell,
      action: openNotifications,
    },
    {
      label: "Mening bronlarim",
      icon: Clock,
      action: () => router.push("/tickets"),
    },
    {
      label: "Yordam",
      icon: Headset,
      action: () => setShowHelp(true),
    },
    {
      label: "Chiqish",
      icon: LogOut,
      action: () => setActiveModal("logout_profile"),
    },
  ];

  const isBottomNavHidden =
    (showCards && (showCardOtp || showAddCard || selectedCardForDelete)) ||
    activeModal === "logout_profile" ||
    activeModal === "delete_account" ||
    showLanguages ||
    showMessages ||
    showHelp;

  return (
    <div
      className="flex flex-col flex-1 bg-[var(--background)] transition-colors duration-300 relative"
    >
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50 px-4 py-2.5 rounded-xl bg-primary text-white text-xs font-bold shadow-xl animate-fade-in flex items-center gap-2 max-w-xs text-center border border-white/20">
          <CheckCircle className="h-4 w-4 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {isRegistered && !leaving ? (
        /* ==================== REGISTERED PROFILE VIEW ==================== */
        <div className={`flex flex-col flex-1 bg-[var(--background)] ${isDark ? "text-white" : "text-zinc-900"} transition-all duration-300 ${isBottomNavHidden ? "-mb-16" : ""}`}>
          {showMessages ? (
            /* ==================== HIGH-FIDELITY REGISTERED XABARLAR VIEW ==================== */
            <div className={`flex flex-col flex-1 bg-[var(--background)] ${isDark ? "text-white" : "text-zinc-900"} animate-fade-in`}>
              {/* Top Bar Header */}
              <div className="relative flex items-center justify-between px-6 py-5">
                <button
                  onClick={() => setShowMessages(false)}
                  className={`p-2 rounded-xl transition-all active:scale-95 ${
                    isDark ? "bg-white/5 text-white/80 hover:bg-white/10 hover:text-white" : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200"
                  }`}
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <h1 className={`text-base font-bold tracking-wide ${isDark ? "text-white" : "text-zinc-900"}`}>Xabarlar</h1>
                <div className="w-9 h-9" />
              </div>

              {/* Form Content */}
              <main className="flex-1 overflow-y-auto px-6 py-6 flex flex-col gap-6 max-w-md mx-auto w-full text-left">
                {/* Subtitle */}
                <div className="space-y-1">
                  <h2 className={`text-xl font-bold tracking-tight leading-tight ${isDark ? "text-white" : "text-zinc-900"}`}>Ilovamiz bo'yicha yangiliklarni</h2>
                  <p className={`text-xl font-bold tracking-tight leading-tight ${isDark ? "text-white/95" : "text-zinc-800"}`}>kuzatib boring</p>
                </div>

                {notificationsError ? (
                  <p className="text-xs font-bold text-red-500">{notificationsError}</p>
                ) : notifications === null ? (
                  <div className="flex justify-center py-10">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  </div>
                ) : notifications.length === 0 ? (
                  <p className={`text-sm text-center py-10 ${isDark ? "text-white/50" : "text-zinc-500"}`}>Hozircha xabarlar yo&apos;q</p>
                ) : (
                  <div className="space-y-3.5">
                    {notifications.map((n) => (
                      <div
                        key={n.id}
                        className={`w-full border rounded-3xl p-5 flex items-start gap-4 relative shadow-lg ${
                          !n.read_at
                            ? isDark
                              ? "bg-[#221A15] border-white/5"
                              : "bg-orange-50/50 border-orange-100"
                            : isDark
                              ? "bg-[#393939] border-white/5"
                              : "bg-zinc-100 border-zinc-200"
                        }`}
                      >
                        {!n.read_at && <span className="absolute top-3.5 right-3.5 w-2 h-2 rounded-full bg-[#E53E3E]" />}
                        <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center shrink-0 shadow-md">
                          <Bell className="w-6 h-6 text-white" />
                        </div>
                        <div className="space-y-1">
                          <h4 className={`text-sm font-bold leading-snug ${isDark ? "text-white" : "text-zinc-900"}`}>{n.title}</h4>
                          {n.body && <p className={`text-xs leading-normal ${isDark ? "text-white/80" : "text-zinc-650"}`}>{n.body}</p>}
                          <p className={`text-[10px] font-semibold pt-1 ${isDark ? "text-white/45" : "text-zinc-400"}`}>
                            {new Date(n.sent_at).toLocaleString("uz-UZ")}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </main>
            </div>
          ) : showHelp ? (
            /* ==================== HIGH-FIDELITY REGISTERED YORDAM (HELP) VIEW ==================== */
            <div className={`flex flex-col flex-1 bg-[var(--background)] ${isDark ? "text-white" : "text-zinc-900"} animate-fade-in`}>
              {/* Top Bar Header */}
              <div className={`relative flex items-center justify-between px-6 py-5 border-b ${
                isDark ? "border-white/5" : "border-zinc-100"
              }`}>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setShowHelp(false);
                      setOpenFaq(null);
                    }}
                    className={`p-2 rounded-xl transition-all active:scale-95 ${
                      isDark ? "bg-white/5 text-white/80 hover:bg-white/10 hover:text-white" : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200"
                    }`}
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <h1 className={`text-xl font-bold tracking-wide ${isDark ? "text-white" : "text-zinc-900"}`}>Yordam markazi</h1>
                </div>
              </div>

              {/* Scrollable Help Content */}
              <main className="flex-1 overflow-y-auto px-6 py-6 pb-8 flex flex-col gap-6 max-w-md mx-auto w-full text-left">
                {/* Hero Card */}
                <div className={`w-full border rounded-3xl p-5 flex flex-col gap-3 shadow-xl ${
                  isDark 
                    ? "bg-gradient-to-br from-[#393939] to-[#252528] border-white/5" 
                    : "bg-zinc-100 border-zinc-200"
                }`}>
                  <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-inner">
                    <HelpCircle className="h-6 w-6" />
                  </div>
                  <div className="space-y-1">
                    <h2 className={`text-base font-bold tracking-wide ${isDark ? "text-white" : "text-zinc-900"}`}>Qanday yordam bera olamiz?</h2>
                    <p className={`text-xs leading-relaxed font-medium ${isDark ? "text-white/60" : "text-zinc-650"}`}>
                      BAZMLY ilovasi orqali marosim zallari, restoran va shou-dasturlarni onlayn, xavfsiz va eng yaxshi narxlarda bron qilish bo'yicha savollaringizga javob oling.
                    </p>
                  </div>
                </div>

                {/* FAQ Header */}
                <div className="space-y-1 mt-1">
                  <h3 className={`text-base font-bold tracking-wide ${isDark ? "text-white" : "text-zinc-900"}`}>Tez-tez beriladigan savollar</h3>
                  <p className={`text-xs font-medium ${isDark ? "text-white/40" : "text-zinc-500"}`}>Eng ko'p beriladigan savollarga javoblar</p>
                </div>

                {/* FAQ Accordions List */}
                <div className="space-y-3">
                  {FAQS.map((faq, idx) => {
                    const isOpen = openFaq === idx;
                    return (
                      <div
                        key={idx}
                        className={`w-full border rounded-2xl overflow-hidden transition-all duration-300 shadow-md ${
                          isDark ? "bg-[#393939] border-white/5" : "bg-zinc-100 border-zinc-200"
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => setOpenFaq(isOpen ? null : idx)}
                          className={`w-full px-5 py-4 flex items-center justify-between gap-3 text-left transition-colors ${
                            isDark ? "hover:bg-white/5" : "hover:bg-zinc-200"
                          }`}
                        >
                          <span className={`text-xs font-bold leading-snug ${isDark ? "text-white/90" : "text-zinc-900"}`}>{faq.q}</span>
                          <ChevronDown className={`h-4.5 w-4.5 shrink-0 transition-transform duration-300 ${isDark ? "text-white/40" : "text-zinc-500"} ${isOpen ? "rotate-180 text-primary" : ""}`} />
                        </button>
                        
                        <div
                          className={`transition-all duration-300 ease-in-out overflow-hidden ${
                            isOpen ? `border-t ${isDark ? "border-white/5" : "border-zinc-200"}` : "max-h-0"
                          }`}
                        >
                          <p className={`px-5 py-4 text-xs leading-relaxed font-medium ${
                            isDark ? "text-white/60 bg-[#161618]" : "text-zinc-650 bg-zinc-50"
                          }`}>
                            {faq.a}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Support Contact Section */}
                <div className={`w-full border rounded-3xl p-5 flex flex-col gap-4 shadow-xl mt-2 ${
                  isDark ? "bg-[#221A15] border-[#FF6B00]/10" : "bg-orange-50/50 border-orange-100"
                }`}>
                  <div className="space-y-1">
                    <h4 className={`text-sm font-bold tracking-wide ${isDark ? "text-white" : "text-zinc-900"}`}>Savolingizga javob topmadingizmi?</h4>
                    <p className={`text-[11px] leading-relaxed font-medium ${isDark ? "text-white/60" : "text-zinc-650"}`}>
                      Bizning mijozlarni qo'llab-quvvatlash xizmati mutaxassislarimiz haftada 7 kun, 24 soat davomida sizga tezkor yordam berishga tayyor.
                    </p>
                  </div>
                  
                  <a
                    href="https://t.me/bazmly_support"
                    target="_blank"
                    rel="noreferrer"
                    className="w-full py-3.5 rounded-2xl bg-[#FF6B00] hover:bg-[#E05000] text-white font-bold text-xs tracking-wide flex items-center justify-center gap-2 transition-all active:scale-98 shadow-lg shadow-[#FF6B00]/20"
                  >
                    <svg className="h-4.5 w-4.5 fill-current" viewBox="0 0 24 24">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15.82-.77 4.47-1.09 6.16-.13.72-.4 1-.66 1.03-.57.05-1-.38-1.55-.74-.86-.57-1.34-.86-2.18-1.41-.97-.64-.34-.99.21-1.56.14-.15 2.65-2.42 2.7-2.63.01-.03.01-.13-.05-.18-.06-.05-.14-.03-.21-.02-.09.02-1.54.98-4.36 2.88-.41.28-.79.42-1.12.41-.37-.01-1.08-.21-1.61-.38-.65-.21-1.17-.32-1.12-.68.02-.19.28-.38.77-.57 3.01-1.31 5.02-2.18 6.03-2.6 2.87-1.19 3.47-1.4 3.86-1.4.08 0 .28.02.4.12.1.09.13.21.14.31.01.07-.01.2-.02.26z"/>
                    </svg>
                    <span>Qo'llab-quvvatlash xizmati (Telegram)</span>
                  </a>
                </div>
              </main>
            </div>
          ) : isEditing ? (
            /* ==================== HIGH-FIDELITY REGISTERED EDIT PROFILE VIEW ==================== */
            <div className="flex flex-col flex-1">
              {/* Custom Top Bar Header matching screenshot */}
              <div className={`relative flex items-center justify-between px-6 py-5 border-b ${
                isDark ? "border-white/5" : "border-zinc-100"
              }`}>
                <button
                  onClick={handleSaveProfile}
                  className={`p-2 rounded-xl transition-all active:scale-95 ${
                    isDark 
                      ? "bg-white/5 text-white/80 hover:bg-white/10 hover:text-white" 
                      : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200"
                  }`}
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <h1 className={`text-base font-bold tracking-wide ${isDark ? "text-white" : "text-zinc-900"}`}>Sozlamalar</h1>
                <div className="w-9 h-9" />
              </div>

              {/* Content Container */}
              <main className="flex-1 overflow-y-auto px-6 py-8 pb-10 flex flex-col items-center max-w-md mx-auto w-full">
                {/* Circle Avatar with Camera/Plus icon */}
                <div className="relative mb-8 mt-2">
                  <div className="w-36 h-36 rounded-full overflow-hidden border-2 border-white/10 shadow-2xl bg-zinc-800">
{user?.avatar_url ? (
                      <img src={user.avatar_url} alt={fullName} className="w-full h-full object-cover" />
                    ) : (
                      <span className="w-full h-full flex items-center justify-center text-4xl font-black text-primary bg-primary/10">
                        {(user?.first_name?.[0] ?? "") + (user?.last_name?.[0] ?? "")}
                      </span>
                    )}
                  </div>
                  <div className="absolute bottom-1 right-1 bg-white text-zinc-800 p-2.5 rounded-full shadow-lg border border-white/10 cursor-pointer hover:bg-zinc-100 transition-colors flex items-center justify-center">
                    <svg className="h-4.5 w-4.5 text-zinc-700" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                      <circle cx="12" cy="13" r="4"/>
                      <line x1="21" y1="10" x2="21" y2="6"/>
                      <line x1="19" y1="8" x2="23" y2="8"/>
                    </svg>
                  </div>
                </div>

                {/* Form Fields */}
                <div className="w-full space-y-5">
                  {/* Name field */}
                  <div className="space-y-2 text-left">
                    <label className={`block text-xs font-semibold ${isDark ? "text-zinc-400" : "text-zinc-500"}`}>Ism/Familiya</label>
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      placeholder="Alisher Raimov"
                      className={`w-full px-4 py-3.5 rounded-xl border text-sm font-medium outline-none focus:border-primary/50 transition-colors ${
                        isDark ? "border-white/10 bg-[#393939] text-white" : "border-zinc-200 bg-zinc-100 text-zinc-900 focus:bg-white"
                      }`}
                    />
                  </div>

                  {/* Phone field */}
                  <div className="space-y-2 text-left">
                    <label className={`block text-xs font-semibold ${isDark ? "text-zinc-400" : "text-zinc-500"}`}>Telefon raqam</label>
                    <input
                      type="text"
                      value={formatPhone(editPhone)}
                      readOnly
                      title="Telefon raqami akkauntga bog'langan va bu yerda o'zgarmaydi"
                      className={`w-full px-4 py-3.5 rounded-xl border text-sm font-medium outline-none focus:border-primary/50 transition-colors ${
                        isDark ? "border-white/10 bg-[#393939] text-white" : "border-zinc-200 bg-zinc-100 text-zinc-900 focus:bg-white"
                      }`}
                    />
                  </div>

                  {/* Danger zone */}
                  <div className="pt-2">
                    <span className="block text-red-400 text-xs font-semibold uppercase tracking-wider text-left mb-2">
                      Xavfli zona
                    </span>
                    <button
                      type="button"
                      onClick={() => setActiveModal("delete_account")}
                      className={`w-full border rounded-xl p-4 flex justify-between items-center cursor-pointer transition-colors text-left ${
                        isDark ? "bg-[#393939] border-white/10 hover:bg-[#252528]" : "bg-zinc-100 border-zinc-200 hover:bg-zinc-200"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="p-2 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 flex items-center justify-center">
                          <Trash2 className="h-4.5 w-4.5" />
                        </span>
                        <span className={`text-sm font-bold ${isDark ? "text-white/90" : "text-zinc-900"}`}>Akkauntni o'chirish</span>
                      </div>
                      <ChevronRight className={`h-4.5 w-4.5 ${isDark ? "text-white/30" : "text-zinc-400"}`} />
                    </button>
                  </div>
                </div>
              </main>
            </div>
          ) : (
            /* ==================== REGISTERED DASHBOARD VIEW ==================== */
            <>
              <Navbar />

              <main className="flex-1 flex flex-col items-center justify-start py-8 px-4 pb-0 max-w-md mx-auto w-full">
                {/* Header Title */}
                <h1 className={`text-xl font-black mb-6 ${isDark ? "text-white" : "text-zinc-900"}`}>
                  Sozlamalar
                </h1>

                {/* Profile Card Info */}
                <div className="w-full flex flex-col items-center text-center mb-8">
                  {/* Circle Avatar with custom styling */}
                  <div className="relative">
                    <div className={`w-36 h-36 rounded-full overflow-hidden relative ${
                      isDark 
                        ? "border-4 border-primary/20 bg-zinc-800 shadow-2xl" 
                        : "bg-zinc-150 shadow-md"
                    }`}>
{user?.avatar_url ? (
                      <img src={user.avatar_url} alt={fullName} className="w-full h-full object-cover" />
                    ) : (
                      <span className="w-full h-full flex items-center justify-center text-4xl font-black text-primary bg-primary/10">
                        {(user?.first_name?.[0] ?? "") + (user?.last_name?.[0] ?? "")}
                      </span>
                    )}
                    </div>
                    {isDark && (
                      <div className="absolute bottom-0 right-1 bg-primary text-white p-2.5 rounded-full shadow-lg border-2 border-brand-dark">
                        <User className="h-4.5 w-4.5" />
                      </div>
                    )}
                  </div>

                  <div className="mt-5 space-y-1.5">
                    <h2 className={`text-2xl font-bold tracking-tight ${isDark ? "text-white" : "text-black"}`}>
                      {fullName}
                    </h2>
                    <div className={`flex items-center justify-center gap-2 ${
                      isDark ? "text-xs font-medium text-white/60" : "text-base font-semibold text-black"
                    }`}>
                      <span>{formatPhone(user?.phone)}</span>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center justify-center gap-3.5 w-full max-w-xs mt-6">
                    <button
                      onClick={() => {
                        setEditName(fullName);
                        setEditLocation(location);
                        setEditPhone(phone || "+998 99 219 19 55");
                        setIsEditing(true);
                      }}
                      className={`flex-1 py-3 px-4 rounded-xl text-xs font-bold transition-all active:scale-95 shadow-sm ${
                        isDark 
                          ? "bg-white/5 border border-white/10 text-white hover:bg-[#252528]" 
                          : "bg-white border border-primary text-primary hover:bg-orange-50"
                      }`}
                    >
                      Edit profile
                    </button>
                    <button
                      onClick={() => setActiveModal("friends")}
                      className="flex-1 py-3 px-4 rounded-xl bg-primary text-xs font-bold text-white shadow-lg hover:bg-primary-hover transition-all active:scale-95"
                    >
                      Add friends
                    </button>
                  </div>
                </div>

                {/* Only inside Telegram, and only until a number is stored. */}
                <div className="w-full">
                  <TelegramPhonePrompt hasPhone={Boolean(user?.phone)} />
                </div>

                {/* Options List Dashboard Container */}
                <div className={`w-full border rounded-[32px] p-5.5 space-y-4 bg-transparent shadow-xl ${
                  isDark ? "border-white/5" : "border-zinc-100 bg-white/50"
                }`}>
                  {menuItems.map((item, index) => {
                    const Icon = item.icon;
                    const isChiqish = item.label === "Chiqish";
                    
                    if (isChiqish) {
                      return (
                        <button
                          key={index}
                          onClick={item.action}
                          className={`w-full flex items-center justify-between py-4 px-5 rounded-[20px] active:scale-[0.99] border transition-all duration-200 text-left cursor-pointer ${
                            isDark
                              ? "bg-red-500/10 border-red-500/20 hover:bg-red-500/20 text-red-500"
                              : "bg-red-50/60 border-red-100/80 hover:bg-red-100/50 text-red-500"
                          }`}
                        >
                          <div className="flex items-center gap-3.5">
                            <Icon className="w-5.5 h-5.5 text-red-500 shrink-0" />
                            <span className="text-sm font-extrabold text-red-500 tracking-wide">{item.label}</span>
                          </div>
                          <ChevronRight className="w-5 h-5 text-red-500/70" />
                        </button>
                      );
                    }
                    
                    return (
                      <button
                        key={index}
                        onClick={item.action}
                        className={`w-full flex items-center justify-between py-4 px-5 rounded-[20px] active:scale-[0.99] transition-all duration-200 text-left cursor-pointer shadow-sm ${
                          isDark
                            ? "bg-[#393939] hover:bg-[#484848] text-white"
                            : "bg-zinc-100 hover:bg-zinc-200 text-zinc-900"
                        }`}
                      >
                        <div className="flex items-center gap-3.5">
                          <Icon className={`w-5.5 h-5.5 shrink-0 ${isDark ? "text-white/90" : "text-zinc-650"}`} />
                          <span className={`text-sm font-semibold tracking-wide ${isDark ? "text-white" : "text-zinc-900"}`}>{item.label}</span>
                        </div>
                        <ChevronRight className={`w-5 h-5 ${isDark ? "text-white/70" : "text-zinc-400"}`} />
                      </button>
                    );
                  })}
                </div>
              </main>
            </>
          )}

          {/* ==================== SETTINGS MODALS ==================== */}
          {activeModal && activeModal !== "logout_profile" && activeModal !== "delete_account" && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
              <div className="w-full max-w-sm border border-foreground/10 dark:border-white/10 rounded-3xl shadow-2xl bg-brand-light-card dark:bg-zinc-900 p-6 space-y-5 relative animate-scale-up">
                
                {/* Close Button */}
                <button
                  onClick={() => setActiveModal(null)}
                  className="absolute top-4 right-4 p-1.5 rounded-lg bg-foreground/5 dark:bg-white/5 hover:bg-foreground/10 dark:hover:bg-white/10 text-foreground/50 dark:text-white/50 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>

                {/* Modal Title */}
                <div className="flex items-center gap-2">
                  <span className="p-1.5 bg-primary/10 rounded-lg text-primary">
                    {activeModal === "messages" && <Bell className="h-5 w-5" />}
                    {activeModal === "history" && <Clock className="h-5 w-5" />}
                    {activeModal === "languages" && <Globe className="h-5 w-5" />}
                    {activeModal === "help" && <HelpCircle className="h-5 w-5" />}
                    {activeModal === "logout" && <LogOut className="h-5 w-5" />}
                    {activeModal === "friends" && <Share2 className="h-5 w-5" />}
                  </span>
                  <h3 className="text-lg font-black text-foreground dark:text-white">
                    {activeModal === "messages" && "Xabarlar"}
                    {activeModal === "history" && "Bronlar Tarixi"}
                    {activeModal === "languages" && "Tizim Tili"}
                    {activeModal === "help" && "Yordam Markazi"}
                    {activeModal === "logout" && "Akkauntdan chiqish"}
                    {activeModal === "friends" && "Do'stlarni chaqirish"}
                  </h3>
                </div>

                {/* Modal Content */}
                <div className="text-xs text-foreground/70 dark:text-white/70 space-y-3 leading-relaxed">
                  {/* Messages Content */}
                  {activeModal === "messages" && (
                    <div className="space-y-3 max-h-[250px] overflow-y-auto pr-1">
                      <div className="p-3 bg-foreground/5 dark:bg-white/5 border border-foreground/5 dark:border-white/5 rounded-xl">
                        <div className="flex justify-between font-bold text-foreground dark:text-white mb-1">
                          <span>🎉 Xush kelibsiz!</span>
                          <span className="text-[10px] text-foreground/40 dark:text-white/40">Hozir</span>
                        </div>
                        <p>BAZMLY ilovasiga muvaffaqiyatli kirdingiz! Endilikda premium restoran va marosim zallarini oson bron qilishingiz mumkin.</p>
                      </div>
                      <div className="p-3 bg-foreground/5 dark:bg-white/5 border border-foreground/5 dark:border-white/5 rounded-xl">
                        <div className="flex justify-between font-bold text-foreground dark:text-white mb-1">
                          <span>🔥 10% Chegirma Kuponi</span>
                          <span className="text-[10px] text-foreground/40 dark:text-white/40">Kecha</span>
                        </div>
                        <p>Birinchi broningiz uchun 10% lik kuponingiz chiptalar bo'limida saqlandi!</p>
                      </div>
                    </div>
                  )}

                  {/* History Content */}
                  {activeModal === "history" && (
                    <div className="space-y-3 max-h-[250px] overflow-y-auto pr-1">
                      <div className="p-3 bg-foreground/5 dark:bg-white/5 border border-foreground/5 dark:border-white/5 rounded-xl flex items-center justify-between">
                        <div>
                          <p className="font-bold text-foreground dark:text-white">Oltin Saroy Marosim Zali</p>
                          <p className="text-[10px] text-foreground/45 dark:text-white/45">Bron ID: BZ-90214 • 12 Iyun, 2026</p>
                        </div>
                        <span className="px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 font-bold text-[10px]">
                          Faol
                        </span>
                      </div>
                      <div className="p-3 bg-foreground/5 dark:bg-white/5 border border-foreground/5 dark:border-white/5 rounded-xl flex items-center justify-between">
                        <div>
                          <p className="font-bold text-foreground dark:text-white">Versal Hall Premium</p>
                          <p className="text-[10px] text-foreground/45 dark:text-white/45">Bron ID: BZ-89110 • 28 May, 2026</p>
                        </div>
                        <span className="px-2 py-0.5 rounded bg-foreground/10 border border-foreground/15 text-foreground/60 dark:text-white/60 font-bold text-[10px]">
                          Yakunlangan
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Languages Content */}
                  {activeModal === "languages" && (
                    <div className="grid grid-cols-2 gap-2 max-h-[250px] overflow-y-auto pr-1">
                      {LANGUAGES.map((lang) => {
                        const isSel = selectedLang === lang.code;
                        return (
                          <button
                            key={lang.code}
                            onClick={() => {
                              setSelectedLang(lang.code);
                              showToast(`Tizim tili o'zgartirildi: ${lang.nativeName}`);
                              setActiveModal(null);
                            }}
                            className={`flex items-center gap-2.5 p-3 rounded-xl border text-left transition-all active:scale-95 ${
                              isSel
                                ? "bg-[#FF5A00]/10 border-[#FF5A00] text-foreground dark:text-white"
                                : "bg-foreground/5 dark:bg-white/5 border-foreground/5 dark:border-white/5 text-foreground/75 dark:text-white/75 hover:bg-foreground/10 dark:hover:bg-white/10"
                            }`}
                          >
                            <img
                              src={lang.flag}
                              alt={lang.name}
                              className="w-6 h-6 rounded-full object-cover shrink-0 border border-foreground/10 shadow-sm"
                            />
                            <div>
                              <p className="text-xs font-bold leading-tight">{lang.nativeName}</p>
                              <p className="text-[9px] text-foreground/45 dark:text-white/45">{lang.name}</p>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* Help Content */}
                  {activeModal === "help" && (
                    <div className="space-y-4">
                      <p>BAZMLY ilovasi orqali marosim zallari, restoran va shou-dasturlarni onlayn, xavfsiz va eng yaxshi narxlarda bron qilishingiz mumkin.</p>
                      
                      <div className="space-y-2">
                        <p className="font-bold text-foreground dark:text-white">Tez-tez beriladigan savollar:</p>
                        <details className="bg-foreground/5 dark:bg-white/5 rounded-xl border border-foreground/5 dark:border-white/5 p-2 focus:outline-none">
                          <summary className="font-bold text-[11px] cursor-pointer text-foreground dark:text-white">To'lovlar xavfsizmi?</summary>
                          <p className="mt-1 pl-2 text-[10px] text-foreground/60 dark:text-white/60">Barcha to'lovlar rasmiy to'lov tizimlari orqali 3D-Secure himoyasi bilan amalga oshiriladi.</p>
                        </details>
                        <details className="bg-foreground/5 dark:bg-white/5 rounded-xl border border-foreground/5 dark:border-white/5 p-2 focus:outline-none">
                          <summary className="font-bold text-[11px] cursor-pointer text-foreground dark:text-white">Qanday bekor qilish mumkin?</summary>
                          <p className="mt-1 pl-2 text-[10px] text-foreground/60 dark:text-white/60">Tadbirdan 48 soat oldin bekor qilinsa, pul mablag'ingiz to'liq qaytariladi.</p>
                        </details>
                      </div>

                      <a
                        href="https://t.me/bazmly_support"
                        target="_blank"
                        rel="noreferrer"
                        className="w-full flex items-center justify-center gap-2 rounded-xl bg-primary py-3 text-xs font-bold text-white shadow-md hover:bg-primary-hover transition-colors"
                      >
                        Qo'llab-quvvatlash guruhi bilan aloqa (Telegram)
                      </a>
                    </div>
                  )}

                  {/* Friends Referral Content */}
                  {activeModal === "friends" && (
                    <div className="space-y-4 text-center">
                      <p className="text-foreground/75 dark:text-white/75">
                        Do'stlaringizni taklif qiling va ularning birinchi bronidan keyin <span className="font-bold text-primary">50,000 so'm</span> bonusga ega bo'ling!
                      </p>

                      <div className="p-4 bg-foreground/5 dark:bg-white/5 border border-foreground/5 dark:border-white/5 rounded-2xl space-y-1 relative">
                        <span className="block text-[10px] text-foreground/45 dark:text-white/40 font-bold uppercase tracking-wider">Taklif kodingiz</span>
                        <span className="block text-2xl font-black text-primary tracking-widest uppercase">BZMLY8839</span>
                      </div>

                      <button
                        onClick={() => {
                          navigator.clipboard.writeText("https://t.me/bazmly_bot?start=BZMLY8839");
                          showToast("Taklif havolasi nusxalandi!");
                          setActiveModal(null);
                        }}
                        className="w-full flex items-center justify-center gap-2 rounded-xl bg-primary py-3 text-xs font-bold text-white shadow-md hover:bg-primary-hover transition-colors"
                      >
                        Havolani nusxalash <Share2 className="h-4 w-4" />
                      </button>
                    </div>
                  )}

                  {/* Logout Content */}
                  {activeModal === "logout" && (
                    <div className="space-y-4">
                      <p className="text-center text-foreground/80 dark:text-white/80 font-medium">
                        Haqiqatan ham akkauntingizdan chiqmoqchimisiz?
                      </p>
                      <div className="flex gap-3">
                        <button
                          onClick={() => setActiveModal(null)}
                          className="flex-1 py-3 rounded-xl bg-foreground/10 dark:bg-white/10 hover:bg-foreground/15 text-xs font-bold text-foreground dark:text-white transition-colors"
                        >
                          Bekor qilish
                        </button>
                        <button
                          onClick={handleLogout}
                          className="flex-1 py-3 rounded-xl bg-red-500 hover:bg-red-600 text-xs font-bold text-white shadow-md transition-colors"
                        >
                          Ha, chiqish
                        </button>
                      </div>
                    </div>
                  )}
                </div>

              </div>
            </div>
          )}

          {/* Profildan Chiqish Bottom Sheet Modal matching Screenshot 2 (left) */}
          {activeModal === "logout_profile" && (
            <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end justify-center transition-opacity duration-300 animate-fade-in">
              <div className="absolute inset-0" onClick={() => setActiveModal(null)} />
              
              <div className={`w-full max-w-md rounded-t-[32px] px-6 pt-3 pb-8 flex flex-col items-center gap-4 z-10 animate-slide-up border-t relative ${
                isDark ? "bg-[#393939] border-white/5" : "bg-white border-zinc-200"
              }`}>
                {/* Notch indicator */}
                <div className={`w-12 h-1 rounded-full mb-2 ${isDark ? "bg-white/20" : "bg-zinc-200"}`} />
                
                {/* Title */}
                <p className={`text-base font-bold tracking-wide ${isDark ? "text-white" : "text-zinc-900"}`}>Profildan chiqmoqchimisiz?</p>
                
                {/* Red Profile Logout Button with logout icon */}
                <button
                  type="button"
                  onClick={() => {
                    setActiveModal(null);
                    handleLogout();
                  }}
                  className="w-full py-4 rounded-2xl bg-[#E82C2C] hover:bg-red-700 text-white font-bold text-sm tracking-wide flex items-center justify-center gap-2 transition-all active:scale-98 shadow-lg shadow-red-600/10"
                >
                  <LogOut className="h-4.5 w-4.5" />
                  <span>Profildan chiqish</span>
                </button>
                
                {/* Cancel Button */}
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className={`w-full py-4 font-bold text-sm tracking-wide transition-all active:scale-98 ${
                    isDark ? "text-white/60 hover:text-white" : "text-zinc-500 hover:text-zinc-800"
                  }`}
                >
                  Bekor qilish
                </button>
              </div>
            </div>
          )}

          {/* Akkauntni O'chirish Bottom Sheet Modal matching Screenshot 2 (right) */}
          {activeModal === "delete_account" && (
            <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end justify-center transition-opacity duration-300 animate-fade-in">
              <div className="absolute inset-0" onClick={() => setActiveModal(null)} />
              
              <div className={`w-full max-w-md rounded-t-[32px] px-6 pt-3 pb-8 flex flex-col items-center gap-4 z-10 animate-slide-up border-t relative ${
                isDark ? "bg-[#393939] border-white/5" : "bg-white border-zinc-200"
              }`}>
                {/* Notch indicator */}
                <div className={`w-12 h-1 rounded-full mb-2 ${isDark ? "bg-white/20" : "bg-zinc-200"}`} />
                
                {/* Title */}
                <p className={`text-base font-bold tracking-wide ${isDark ? "text-white" : "text-zinc-900"}`}>Akkauntni o'chirish tasdiqlansinmi?</p>
                
                {/* Red Account Delete Button with trash icon */}
                <button
                  type="button"
                  onClick={() => {
                    setActiveModal(null);
                    handleDeleteAccount();
                  }}
                  className="w-full py-4 rounded-2xl bg-[#E82C2C] hover:bg-red-700 text-white font-bold text-sm tracking-wide flex items-center justify-center gap-2 transition-all active:scale-98 shadow-lg shadow-red-600/10"
                >
                  <Trash2 className="h-4.5 w-4.5" />
                  <span>Akkauntni o'chirish</span>
                </button>
                
                {/* Cancel Button */}
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className={`w-full py-4 font-bold text-sm tracking-wide transition-all active:scale-98 ${
                    isDark ? "text-white/60 hover:text-white" : "text-zinc-500 hover:text-zinc-800"
                  }`}
                >
                  Bekor qilish
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (

        /* ==================== ORIGINAL STEPPED REGISTRATION VIEW ==================== */
        <div className="flex flex-col flex-1">
          <Navbar />

          <main className="flex-1 flex items-start justify-center pt-2 pb-10 px-4 max-w-md mx-auto w-full">
            <div className={`w-full flex flex-col justify-between p-2 relative overflow-hidden transition-all duration-300 ${
              isDark
                ? "text-white"
                : "text-zinc-900"
            }`}>

              {/* Wizard Navigation Header */}
              {step !== 1 && step !== 2 && (
                <div className="flex justify-end mb-4">
                  {["register_customer", "register_customer_phone_otp", "register_customer_email_otp", "register_customer_name"].includes(String(step)) ? (
                    <button
                      onClick={() => setStep(2)}
                      className={`p-2 rounded-xl transition-colors cursor-pointer ${
                        isDark ? "bg-white/5 hover:bg-white/10 text-white/80" : "bg-zinc-100 hover:bg-zinc-200 text-zinc-800"
                      }`}
                    >
                      <X className="h-5 w-5" />
                    </button>
                  ) : (
                    <div className="h-9" />
                  )}
                </div>
              )}

              {/* Steps Content Area */}
              <div className="flex-1 flex flex-col justify-between">
                
                {/* Step 1: Language Selection */}
                {step === 1 && (
                  <div className="space-y-5 flex-1 flex flex-col justify-between animate-scale-up">
                    <div className="space-y-4">
                      <h2 className={`text-xl font-bold text-left ${isDark ? "text-white" : "text-zinc-900"}`}>Tizim tilini tanlang</h2>

                      {/* Language Search */}
                      <div className="relative mt-2">
                        <Search className="absolute inset-y-0 left-0 pl-3.5 h-5 w-5 my-auto text-zinc-400" />
                        <input
                          type="text"
                          placeholder="Search"
                          value={searchLang}
                          onChange={(e) => setSearchLang(e.target.value)}
                          className={`w-full pl-10 pr-4 py-3 rounded-[18px] border bg-transparent text-sm outline-none focus:border-[#FF5A00] transition-colors ${
                            isDark
                              ? "border-white/10 text-white placeholder-white/30"
                              : "border-zinc-200 text-zinc-900 placeholder-zinc-400"
                          }`}
                        />
                      </div>

                      {/* Languages List */}
                      <div className="space-y-2.5 max-h-[280px] overflow-y-auto pr-1">
                        {filteredLanguages.map((lang) => {
                          const isSelected = selectedLang === lang.code;
                          return (
                            <button
                              key={lang.code}
                              onClick={() => setSelectedLang(lang.code)}
                              className={`w-full flex items-center justify-between p-3.5 px-4 rounded-[18px] transition-all duration-200 text-left cursor-pointer ${
                                isSelected
                                  ? (isDark ? "bg-[#FF5A00]/10 text-white" : "bg-[#FF5A00]/5 text-[#FF5A00]")
                                  : (isDark ? "bg-transparent text-white/80 hover:bg-white/5" : "bg-transparent text-zinc-800 hover:bg-zinc-50")
                              }`}
                            >
                              <div className="flex items-center gap-3.5">
                                <img
                                  src={lang.flag}
                                  alt={lang.name}
                                  className={`w-10 h-10 rounded-full object-cover shrink-0 border shadow-sm ${
                                    isDark ? "border-white/10" : "border-zinc-100"
                                  }`}
                                />
                                <span className={`text-[15px] tracking-wide ${
                                  isSelected 
                                    ? (isDark ? "text-white font-bold" : "text-[#FF5A00] font-bold") 
                                    : (isDark ? "text-white/80 font-semibold" : "text-zinc-800 font-semibold")
                                }`}>
                                  {lang.name}
                                </span>
                              </div>
                              <div className={`w-5.5 h-5.5 rounded-full flex items-center justify-center shrink-0 border transition-all ${
                                isSelected
                                  ? "bg-[#FF5A00] border-[#FF5A00]"
                                  : (isDark ? "border-white/25 bg-transparent" : "border-zinc-350 bg-transparent")
                              }`}>
                                {isSelected && <Check className="h-3 w-3 text-white stroke-[3.5px]" />}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <button
                      onClick={handleNextStep}
                      className="w-full flex items-center justify-center gap-2 rounded-[20px] bg-[#FF5A00] hover:bg-[#E04F00] py-4 text-sm font-bold text-white shadow-lg active:scale-[0.99] transition-all mt-6 cursor-pointer"
                    >
                      Keyingisi <ArrowRight className="h-4 w-4" />
                    </button>
                  </div>
                )}

                {/* Step 2: Welcome Screen Options */}
                {step === 2 && (
                  <div className="space-y-6 flex-1 flex flex-col justify-center animate-scale-up py-4">
                    {/* Section 1: Existing Account */}
                    <div className="space-y-4">
                      <p className={`text-center text-sm font-bold ${isDark ? "text-white/95" : "text-zinc-800"}`}>
                        Akkauntingiz allaqachon mavjudmi?
                      </p>
                      <button
                        onClick={() => setStep("login")}
                        className="w-full py-3.5 rounded-[20px] bg-[#FF5A00] hover:bg-[#E04F00] text-white font-bold text-sm shadow-md transition-all active:scale-[0.99] cursor-pointer"
                      >
                        Sign In
                      </button>
                    </div>

                    {/* Divider Line */}
                    <div className="border-b border-zinc-200 dark:border-white/10 my-2" />

                    {/* Section 2: Create Account */}
                    <div className="space-y-4">
                      <p className={`text-center text-sm font-bold ${isDark ? "text-white/95" : "text-zinc-800"}`}>
                        Akkaunt ochmoqchimisiz?
                      </p>

                      <div className="space-y-3.5">
                        {/* Customer Account Button */}
                        <button
                          onClick={() => {
                            setAccountType("customer");
                            setStep("register_customer");
                          }}
                          className="w-full py-3.5 rounded-[20px] border border-[#FF5A00] hover:bg-[#FF5A00]/5 text-[#FF5A00] font-bold text-sm transition-all active:scale-[0.99] cursor-pointer bg-transparent"
                        >
                          Mijoz uchun akkaunt
                        </button>

                        {/* Restaurant Account Button */}
                        <button
                          onClick={() => {
                            setAccountType("restaurant");
                            setStep(3);
                          }}
                          className="w-full py-3.5 rounded-[20px] border border-[#FF5A00] hover:bg-[#FF5A00]/5 text-[#FF5A00] font-bold text-sm transition-all active:scale-[0.99] cursor-pointer bg-transparent"
                        >
                          Restoran uchun akkaunt
                        </button>

                        {/* Toyxona Account Button */}
                        <button
                          onClick={() => {
                            setAccountType("toyxona");
                            setStep(3);
                          }}
                          className="w-full py-3.5 rounded-[20px] border border-[#FF5A00] hover:bg-[#FF5A00]/5 text-[#FF5A00] font-bold text-sm transition-all active:scale-[0.99] cursor-pointer bg-transparent"
                        >
                          To'yxona uchun akkaunt
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Step "login": Traditional Sign In form */}
                {step === "login" && (
                  <form onSubmit={handleLoginSubmit} className="space-y-4 flex-1 flex flex-col justify-between animate-scale-up">
                    <div className="space-y-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5 text-left -ml-2">
                          <button
                            type="button"
                            onClick={handleBackStep}
                            className="p-1 rounded-lg transition-colors cursor-pointer text-zinc-950 dark:text-white hover:opacity-75"
                          >
                            <ChevronLeft className="h-7 w-7 stroke-[2.5px]" />
                          </button>
                          <Lock className="h-6 w-6 text-[#FF5A00]" />
                          <h2 className="text-xl font-black text-foreground dark:text-white">Kirish</h2>
                        </div>
                        <p className="text-xs text-foreground/50 dark:text-white/50 pl-7">
                          Login va parolingizni kiritib tizimga kiring
                        </p>
                      </div>

                      {error && (
                        <div className="rounded-xl bg-red-500/10 border border-red-500/20 p-3 text-xs text-red-400 text-center font-bold">
                          {error}
                        </div>
                      )}

                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-foreground/5 dark:bg-white/5">
                          {([
                            { mode: "phone", label: "Telefon" },
                            { mode: "login", label: "Login" },
                          ] as const).map((tab) => (
                            <button
                              key={tab.mode}
                              type="button"
                              onClick={() => {
                                if (tab.mode === loginMode) return;
                                setLoginMode(tab.mode);
                                setUsername("");
                                setError("");
                              }}
                              className={`py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                loginMode === tab.mode
                                  ? "bg-[#FF5A00] text-white shadow"
                                  : "text-foreground/60 dark:text-white/60"
                              }`}
                            >
                              {tab.label}
                            </button>
                          ))}
                        </div>

                        <div className="space-y-1.5 text-left">
                          <label className="block text-xs font-bold text-foreground/60 dark:text-white/60">
                            {loginMode === "phone" ? "Telefon raqam" : "Login"}
                          </label>
                          {loginMode === "phone" ? (
                            <div className="rounded-xl border border-foreground/10 dark:border-white/10 bg-foreground/5 dark:bg-white/5 px-3.5 py-3 focus-within:ring-2 focus-within:ring-[#FF5A00]/50 transition-all flex items-center gap-2">
                              <img src="/icons/uzb.png" alt="UZ" className="w-5 h-5 rounded-full object-cover shrink-0" />
                              <PhoneInput
                                required
                                value={username}
                                onChange={setUsername}
                                className="flex-1 text-sm font-bold text-foreground dark:text-white"
                              />
                            </div>
                          ) : (
                            <div className="rounded-xl border border-foreground/10 dark:border-white/10 bg-foreground/5 dark:bg-white/5 px-3.5 py-3 focus-within:ring-2 focus-within:ring-[#FF5A00]/50 transition-all">
                              <input
                                type="text"
                                required
                                autoCapitalize="none"
                                autoCorrect="off"
                                placeholder="Masalan: bzquhcbq24"
                                value={username}
                                onChange={(e) => setUsername(e.target.value.trim())}
                                className="block w-full border-0 bg-transparent p-0 text-foreground dark:text-white font-bold outline-none placeholder-foreground/20 dark:placeholder-white/20 focus:ring-0 text-sm"
                              />
                            </div>
                          )}
                        </div>

                        <div className="space-y-1.5 text-left">
                          <label className="block text-xs font-bold text-foreground/60 dark:text-white/60">Parol</label>
                          <div className="rounded-xl border border-foreground/10 dark:border-white/10 bg-foreground/5 dark:bg-white/5 px-3.5 py-3 focus-within:ring-2 focus-within:ring-[#FF5A00]/50 transition-all">
                            <PasswordInput
                              required
                              placeholder="••••••"
                              value={password}
                              onChange={(e) => setPassword(e.target.value)}
                              className="block w-full border-0 bg-transparent p-0 text-foreground dark:text-white font-bold outline-none placeholder-foreground/20 dark:placeholder-white/20 focus:ring-0 text-sm"
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    <button
                      type="submit"
                      className="w-full flex items-center justify-center gap-2 rounded-xl bg-primary py-3.5 text-sm font-bold text-white shadow-lg hover:bg-primary-hover transition-colors mt-6"
                    >
                      Kirish <ArrowRight className="h-4 w-4" />
                    </button>
                  </form>
                )}

                {/* Step "register_customer": Mijoz registration */}
                {step === "register_customer" && (
                  <div className="flex-1 flex flex-col justify-between animate-scale-up space-y-6">
                    <div className="space-y-5">
                      <div className="text-left space-y-1">
                        <h2 className={`text-2xl font-extrabold ${isDark ? "text-white" : "text-black"}`}>Akkaunt yaratish</h2>
                        <p className={`text-sm ${isDark ? "text-white/60" : "text-zinc-500"}`}>Telefon raqamingizni kiriting</p>
                      </div>

                      {error && (
                        <div className="rounded-xl bg-red-500/10 border border-red-500/20 p-3 text-xs text-red-400 text-center font-bold">
                          {error}
                        </div>
                      )}

                      {/* Formatted Phone Input Box */}
                      <div className={`flex items-center gap-3.5 px-4 py-1.5 rounded-2xl border transition-all border-[#FF5A00] ring-2 ring-[#FF5A00]/20 ${
                        isDark 
                          ? "bg-[#2C2C2E]/60 text-white" 
                          : "bg-zinc-50 text-black"
                      }`}>
                        {/* Flag indicator +998 */}
                        <div className="flex items-center gap-2 shrink-0 select-none">
                          <img src="/icons/uzb.png" alt="UZ" className="w-5.5 h-5.5 rounded-full object-cover shadow-sm border border-zinc-200/50" />
                        </div>
                        <PhoneInput
                          value={phone}
                          onChange={setPhone}
                          className="flex-1 bg-transparent text-sm font-bold tracking-wide outline-none border-none focus:ring-0 p-0"
                        />
                      </div>

                    </div>

                    <div className="space-y-4">
                      {/* Orange Action Button */}
                      <button
                        type="button"
                        onClick={handlePhoneCheckAndContinue}
                        className={`w-full py-3.5 rounded-[20px] font-bold text-sm tracking-wide transition-all active:scale-98 shadow-lg ${
                          phone.length === 9
                            ? "bg-[#FF5A00] text-white shadow-[#FF5A00]/25 cursor-pointer hover:bg-[#E04F00]"
                            : isDark
                              ? "bg-white/10 text-white/30 cursor-not-allowed"
                              : "bg-[#FF5A00]/20 text-[#FF5A00]/45 cursor-not-allowed"
                        }`}
                      >
                        Davom etish
                      </button>


                    </div>
                  </div>
                )}

                {/* Step "register_customer_phone_otp": Phone OTP verification */}

                {/* Step "register_customer_email_otp": Email OTP verification */}

                {/* Step "register_customer_name": Name entry screen */}
                {step === "register_customer_name" && (
                  <div className="flex-1 flex flex-col justify-between animate-scale-up space-y-6">
                    <div className="space-y-5">
                      <div className="text-left space-y-1">
                        <div className="flex items-center gap-1.5 -ml-2">
                          <button
                            type="button"
                            onClick={handleBackStep}
                            className="p-1 rounded-lg transition-colors cursor-pointer text-zinc-950 dark:text-white hover:opacity-75"
                          >
                            <ChevronLeft className="h-7 w-7 stroke-[2.5px]" />
                          </button>
                          <h2 className={`text-2xl font-extrabold ${isDark ? "text-white" : "text-black"}`}>Ism va familiya</h2>
                        </div>
                        <p className={`text-sm ${isDark ? "text-white/60" : "text-zinc-500"} pl-7`}>Ismingizni kiriting</p>
                      </div>

                      {error && (
                        <div className="rounded-xl bg-red-500/10 border border-red-500/20 p-3 text-xs text-red-400 text-center font-bold">
                          {error}
                        </div>
                      )}

                      {/* Name Input Box */}
                      <input
                        type="text"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="Ism va familiyangiz"
                        className={`w-full px-4 py-3.5 rounded-2xl border transition-all outline-none ${
                          isDark 
                            ? "bg-[#2C2C2E]/60 border-white/10 text-white focus:border-[#FF5A00]" 
                            : "bg-zinc-50 border-zinc-200 text-black focus:border-[#FF5A00]"
                        } text-sm font-bold tracking-wide`}
                      />
                      <PasswordInput
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Parol (kamida 8 belgi)"
                        className={`w-full px-4 py-3.5 rounded-2xl border transition-all outline-none ${
                          isDark
                            ? "bg-[#2C2C2E]/60 border-white/10 text-white focus:border-[#FF5A00]"
                            : "bg-zinc-50 border-zinc-200 text-black focus:border-[#FF5A00]"
                        } text-sm font-bold tracking-wide`}
                      />
                    </div>

                    <div className="space-y-4">
                      {/* Next/Finish Register Button */}
                      <button
                        type="button"
                        onClick={() => {
                          setError("");
                          handleCustomerFinalRegister();
                        }}
                        className={`w-full py-3.5 rounded-[20px] font-bold text-sm tracking-wide transition-all active:scale-98 shadow-lg ${
                          fullName.trim()
                            ? "bg-[#FF5A00] text-white shadow-[#FF5A00]/25 cursor-pointer hover:bg-[#E04F00]"
                            : isDark
                              ? "bg-white/10 text-white/30 cursor-not-allowed"
                              : "bg-[#FF5A00]/20 text-[#FF5A00]/45 cursor-not-allowed"
                        }`}
                      >
                        {loading ? "Yuborilmoqda..." : "Ro'yxatdan o'tish"}
                      </button>
                    </div>
                  </div>
                )}

                 {/* Step 3: Venue Basic Info Details */}
                {step === 3 && (
                  <div className="space-y-4 flex-1 flex flex-col justify-between animate-scale-up">
                    <div className="space-y-4">
                      {/* Title & Subtitle */}
                      <div className="space-y-1.5 text-left">
                        <div className="flex items-center gap-1.5 -ml-2">
                          <button
                            type="button"
                            onClick={handleBackStep}
                            className="p-1 rounded-lg transition-colors cursor-pointer text-zinc-950 dark:text-white hover:opacity-75"
                          >
                            <ChevronLeft className="h-7 w-7 stroke-[2.5px]" />
                          </button>
                          <h2 className={`text-2xl font-extrabold ${isDark ? "text-white" : "text-black"}`}>
                            Restoraningizni kiritish
                          </h2>
                        </div>
                        <p className={`text-xs ${isDark ? "text-white/60" : "text-zinc-500"} pl-7`}>
                          Ma'lumotlarni to'g'ri kiritilishiga e'tiborli bo'ling!
                        </p>
                      </div>

                      {error && (
                        <div className="rounded-xl bg-red-500/10 border border-red-500/20 p-3 text-xs text-red-400 text-center font-bold">
                          {error}
                        </div>
                      )}

                      <div className="space-y-4 text-left">
                        {/* 1. Venue Name Input */}
                        <div className="space-y-2">
                          <label className={`block text-xs font-bold ${isDark ? "text-white/80" : "text-zinc-750"}`}>
                            Joyingiz nomini kiritish
                          </label>
                          <input 
                            type="text"
                            value={venueName}
                            onChange={(e) => setVenueName(e.target.value)}
                            placeholder="Yozish"
                            className={`w-full px-4 py-3.5 rounded-2xl border transition-all outline-none ${
                              isDark 
                                ? "bg-[#2C2C2E]/60 border-white/10 text-white focus:border-[#FF5A00]" 
                                : "bg-white border-zinc-200 text-black focus:border-[#FF5A00]"
                            } text-sm font-bold tracking-wide`}
                          />
                        </div>

                        {/* 2. Activity Category selector */}
                        <div className="space-y-2">
                          <label className={`block text-xs font-bold ${isDark ? "text-white/80" : "text-zinc-750"}`}>
                            Faoliyat turini tanlang
                          </label>
                          <div className="flex gap-2.5 flex-wrap">
                            {/* Restoran Pill */}
                            <button
                              type="button"
                              onClick={() => {
                                setAccountType("restaurant");
                                setVenueType("restaurant");
                              }}
                              className={`py-2 px-4 rounded-full border flex items-center gap-2 text-sm font-bold transition-all cursor-pointer ${
                                accountType === "restaurant"
                                  ? "bg-[#FF5A00] border-[#FF5A00] text-white shadow-md shadow-[#FF5A00]/15"
                                  : isDark
                                    ? "bg-transparent border-white/25 text-white/80 hover:bg-white/5"
                                    : "bg-white border-zinc-200 text-zinc-800 hover:bg-zinc-50"
                              }`}
                            >
                              <span>Restoran</span>
                              {accountType === "restaurant" ? (
                                <div className="w-5 h-5 rounded-full bg-white flex items-center justify-center shrink-0">
                                  <X className="h-3 w-3 text-[#FF5A00] stroke-[3px]" />
                                </div>
                              ) : (
                                <div className="w-5 h-5 rounded-full border border-zinc-350 dark:border-white/25 bg-transparent shrink-0" />
                              )}
                            </button>

                            {/* To'yxona Pill */}
                            <button
                              type="button"
                              onClick={() => {
                                setAccountType("toyxona");
                                setVenueType("toyxona");
                              }}
                              className={`py-2 px-4 rounded-full border flex items-center gap-2 text-sm font-bold transition-all cursor-pointer ${
                                accountType === "toyxona"
                                  ? "bg-[#FF5A00] border-[#FF5A00] text-white shadow-md shadow-[#FF5A00]/15"
                                  : isDark
                                    ? "bg-transparent border-white/25 text-white/80 hover:bg-white/5"
                                    : "bg-white border-zinc-200 text-zinc-800 hover:bg-zinc-50"
                              }`}
                            >
                              <span>To'yxona</span>
                              {accountType === "toyxona" ? (
                                <div className="w-5 h-5 rounded-full bg-white flex items-center justify-center shrink-0">
                                  <X className="h-3 w-3 text-[#FF5A00] stroke-[3px]" />
                                </div>
                              ) : (
                                <div className="w-5 h-5 rounded-full border border-zinc-350 dark:border-white/25 bg-transparent shrink-0" />
                              )}
                            </button>

                            {/* Barchasi: a restaurant and a to'yxona, as two branches of one chain */}
                            <button
                              type="button"
                              onClick={() => setAccountType("both")}
                              className={`py-2 px-4 rounded-full border flex items-center gap-2 text-sm font-bold transition-all cursor-pointer ${
                                accountType === "both"
                                  ? "bg-[#FF5A00] border-[#FF5A00] text-white shadow-md shadow-[#FF5A00]/15"
                                  : isDark
                                    ? "bg-transparent border-white/25 text-white/80 hover:bg-white/5"
                                    : "bg-white border-zinc-200 text-zinc-800 hover:bg-zinc-50"
                              }`}
                            >
                              <span>Barchasi</span>
                              {accountType === "both" ? (
                                <div className="w-5 h-5 rounded-full bg-white flex items-center justify-center shrink-0">
                                  <X className="h-3 w-3 text-[#FF5A00] stroke-[3px]" />
                                </div>
                              ) : (
                                <div className="w-5 h-5 rounded-full border border-zinc-350 dark:border-white/25 bg-transparent shrink-0" />
                              )}
                            </button>
                          </div>
                        </div>

                        {/* 3. Address select trigger */}
                        <div className="space-y-2">
                          <label className={`block text-xs font-bold ${isDark ? "text-white/80" : "text-zinc-750"}`}>
                            Manzilni kiritish
                          </label>
                          <button
                            type="button"
                            onClick={() => setStep("region")}
                            className={`w-full flex items-center justify-between px-4 py-3.5 rounded-2xl border transition-all text-left cursor-pointer ${
                              isDark ? "bg-[#2C2C2E]/60 border-white/10 text-white" : "bg-white border-zinc-200 text-zinc-800"
                            }`}
                          >
                            <span className={`text-sm font-bold ${reg && dist ? "" : isDark ? "text-white/20" : "text-zinc-350"}`}>
                              {reg && dist ? `${reg}, ${dist}` : "Manzilni kiriting"}
                            </span>
                            <ChevronRight className="h-4.5 w-4.5 opacity-60 text-zinc-400" />
                          </button>
                          <div className="grid grid-cols-3 gap-2">
                            <input
                              value={partnerStreet}
                              onChange={(e) => setPartnerStreet(e.target.value)}
                              placeholder="Ko'cha"
                              className={`col-span-2 w-full px-4 py-3.5 rounded-2xl border transition-all outline-none text-sm font-bold ${
                                isDark ? "bg-[#2C2C2E]/60 border-white/10 text-white focus:border-[#FF5A00]" : "bg-white border-zinc-200 text-black focus:border-[#FF5A00]"
                              }`}
                            />
                            <input
                              value={partnerHouse}
                              onChange={(e) => setPartnerHouse(e.target.value)}
                              placeholder="Uy"
                              className={`w-full px-4 py-3.5 rounded-2xl border transition-all outline-none text-sm font-bold ${
                                isDark ? "bg-[#2C2C2E]/60 border-white/10 text-white focus:border-[#FF5A00]" : "bg-white border-zinc-200 text-black focus:border-[#FF5A00]"
                              }`}
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Bottom Action Button */}
                    <div className="space-y-4">
                      <button
                        type="button"
                        onClick={() => {
                          if (!venueName.trim()) {
                            setError("Iltimos joyingiz nomini kiriting!");
                            return;
                          }
                          setError("");
                          handleNextStep();
                        }}
                        className="w-full py-4 rounded-full bg-[#FF5A00] hover:bg-[#E04F00] text-white font-bold text-sm shadow-lg shadow-[#FF5A00]/15 transition-all active:scale-[0.99] cursor-pointer"
                      >
                        Tasdiqlash
                      </button>
                    </div>
                  </div>
                )}

                {/* Step "region": Region Selector */}
                {step === "region" && (
                  <div className="space-y-4 flex-1 flex flex-col justify-between animate-scale-up">
                    <div className="space-y-4">
                      <div className="space-y-1 text-left">
                        <div className="flex items-center gap-1.5 -ml-2">
                          <button
                            type="button"
                            onClick={handleBackStep}
                            className="p-1 rounded-lg transition-colors cursor-pointer text-zinc-950 dark:text-white hover:opacity-75"
                          >
                            <ChevronLeft className="h-7 w-7 stroke-[2.5px]" />
                          </button>
                          <h2 className={`text-2xl font-extrabold ${isDark ? "text-white" : "text-black"}`}>
                            Viloyatni tanlang
                          </h2>
                        </div>
                        <p className={`text-sm ${isDark ? "text-white/60" : "text-zinc-500"} pl-7`}>
                          Muassasa joylashgan viloyatni belgilang
                        </p>
                      </div>

                      <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1 text-left">
                        {partnerRegions.length > 0 ? (
                          partnerRegions.map((region) => {
                            const isSelected = selectedPartnerRegionId === region.id;
                            return (
                              <button
                                key={region.id}
                                type="button"
                                onClick={() => {
                                  setSelectedPartnerRegionId(region.id);
                                  setReg(region.name);
                                  setDist("");
                                  setSelectedPartnerDistrictId(null);
                                  setStep("district");
                                }}
                                className={`w-full flex items-center justify-between p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                                  isSelected
                                    ? "bg-[#FF5A00]/10 border-[#FF5A00] font-bold text-[#FF5A00]"
                                    : isDark
                                      ? "bg-[#2C2C2E]/60 border-white/5 hover:bg-[#3A3A3C] text-white"
                                      : "bg-zinc-50 border-zinc-200 hover:bg-zinc-100 text-zinc-900"
                                }`}
                              >
                                <span>{region.name}</span>
                                <ChevronRight className="h-4 w-4 opacity-50" />
                              </button>
                            );
                          })
                        ) : (
                          <div className="py-8 flex items-center justify-center gap-2 text-xs text-zinc-400">
                            <Loader2 className="h-4 w-4 animate-spin text-[#FF5A00]" />
                            <span>Viloyatlar yuklanmoqda...</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Step "district": District Selector */}
                {step === "district" && (
                  <div className="space-y-4 flex-1 flex flex-col justify-between animate-scale-up">
                    <div className="space-y-4">
                      <div className="space-y-1 text-left">
                        <div className="flex items-center gap-1.5 -ml-2">
                          <button
                            type="button"
                            onClick={handleBackStep}
                            className="p-1 rounded-lg transition-colors cursor-pointer text-zinc-950 dark:text-white hover:opacity-75"
                          >
                            <ChevronLeft className="h-7 w-7 stroke-[2.5px]" />
                          </button>
                          <h2 className={`text-2xl font-extrabold ${isDark ? "text-white" : "text-black"}`}>
                            Tumanni tanlang
                          </h2>
                        </div>
                        <p className={`text-sm ${isDark ? "text-white/60" : "text-zinc-500"} pl-7`}>
                          {reg} viloyati bo'yicha tumanni tanlang
                        </p>
                      </div>

                      <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1 text-left">
                        {loadingPartnerDistricts ? (
                          <div className="py-8 flex items-center justify-center gap-2 text-xs text-zinc-400">
                            <Loader2 className="h-4 w-4 animate-spin text-[#FF5A00]" />
                            <span>Tumanlar yuklanmoqda...</span>
                          </div>
                        ) : partnerDistricts.length > 0 ? (
                          partnerDistricts.map((district) => {
                            const isSelected = selectedPartnerDistrictId === district.id;
                            return (
                              <button
                                key={district.id}
                                type="button"
                                onClick={() => {
                                  setSelectedPartnerDistrictId(district.id);
                                  setDist(district.name);
                                  setStep(3);
                                }}
                                className={`w-full flex items-center justify-between p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                                  isSelected
                                    ? "bg-[#FF5A00]/10 border-[#FF5A00] font-bold text-[#FF5A00]"
                                    : isDark
                                      ? "bg-[#2C2C2E]/60 border-white/5 hover:bg-[#3A3A3C] text-white"
                                      : "bg-zinc-50 border-zinc-200 hover:bg-zinc-100 text-zinc-900"
                                }`}
                              >
                                <span>{district.name}</span>
                                <Check className={`h-4 w-4 text-[#FF5A00] ${isSelected ? "opacity-100" : "opacity-0"}`} />
                              </button>
                            );
                          })
                        ) : (
                          <p className="py-6 text-center text-xs text-zinc-400">Tumanlar topilmadi</p>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Seats, hours, days and notice — and a to'yxona's services */}
                {step === "venue_setup" && (
                  <VenueSetup
                    isDark={isDark}
                    kind={setupKind}
                    value={venueSetup}
                    onChange={setVenueSetup}
                    initialScreen={setupEntry}
                    onBack={() => {
                      setError("");
                      setStep(3);
                    }}
                    onDone={() => {
                      setError("");
                      // A restaurant still gives its average bill; a to'yxona does not.
                      setStep(setupKind === "toyxona" ? 6 : "partner_price");
                    }}
                  />
                )}

                {/* Step "partner_price": Venue Price */}
                {step === "partner_price" && (
                  <div className="space-y-4 flex-1 flex flex-col justify-between animate-scale-up">
                    <div className="space-y-4">
                      <div className="space-y-1.5 text-left">
                        <div className="flex items-center gap-1.5 -ml-2">
                          <button
                            type="button"
                            onClick={handleBackStep}
                            className="p-1 rounded-lg transition-colors cursor-pointer text-zinc-950 dark:text-white hover:opacity-75"
                          >
                            <ChevronLeft className="h-7 w-7 stroke-[2.5px]" />
                          </button>
                          <h2 className={`text-2xl font-extrabold ${isDark ? "text-white" : "text-black"}`}>
                            O'rtacha narx
                          </h2>
                        </div>
                        <p className={`text-xs ${isDark ? "text-white/60" : "text-zinc-500"} pl-7`}>
                          Bir kishi uchun o'rtacha xizmat narxini belgilang (UZS)
                        </p>
                      </div>

                      {error && (
                        <div className="rounded-xl bg-red-500/10 border border-red-500/20 p-3 text-xs text-red-400 text-center font-bold">
                          {error}
                        </div>
                      )}

                      <div className="space-y-4 text-left">
                        <AmountInput
                          value={venuePrice}
                          onChange={setVenuePrice}
                          placeholder="O'rtacha narx (masalan: 150 000)"
                          className={`w-full px-4 py-3.5 rounded-2xl border transition-all outline-none ${
                            isDark 
                              ? "bg-[#2C2C2E]/60 border-white/10 text-white focus:border-[#FF5A00]" 
                              : "bg-white border-zinc-200 text-black focus:border-[#FF5A00]"
                          } text-sm font-bold tracking-wide`}
                        />
                      </div>
                    </div>

                    <div className="space-y-4">
                      <button
                        type="button"
                        onClick={() => {
                          if (!venuePrice.trim()) {
                            setError("Iltimos o'rtacha narxni kiriting!");
                            return;
                          }
                          setError("");
                          handleNextStep();
                        }}
                        className={`w-full py-4 rounded-full font-bold text-sm tracking-wide transition-all active:scale-98 shadow-lg ${
                          venuePrice.trim()
                            ? "bg-[#FF5A00] text-white shadow-[#FF5A00]/25 cursor-pointer hover:bg-[#E04F00]"
                            : isDark
                              ? "bg-white/10 text-white/30 cursor-not-allowed"
                              : "bg-[#FF5A00]/20 text-[#FF5A00]/45 cursor-not-allowed"
                        }`}
                      >
                        Keyingisi
                      </button>
                    </div>
                  </div>
                )}


                {/* Step 6: Phone and Password Signup Credentials */}
                {step === 6 && (
                  <div className="space-y-4 flex-1 flex flex-col justify-between animate-scale-up">
                    <div className="space-y-4">
                      <div className="space-y-1.5 text-left">
                        <div className="flex items-center gap-1.5 -ml-2">
                          <button
                            type="button"
                            onClick={handleBackStep}
                            className="p-1 rounded-lg transition-colors cursor-pointer text-zinc-950 dark:text-white hover:opacity-75"
                          >
                            <ChevronLeft className="h-7 w-7 stroke-[2.5px]" />
                          </button>
                          <h2 className={`text-2xl font-extrabold ${isDark ? "text-white" : "text-black"}`}>
                            Telefon raqami
                          </h2>
                        </div>
                        <p className={`text-xs ${isDark ? "text-white/60" : "text-zinc-500"} pl-7`}>
                          Ismingiz va tizimga kirish uchun telefon raqamingiz
                        </p>
                      </div>

                      {error && (
                        <div className="rounded-xl bg-red-500/10 border border-red-500/20 p-3 text-xs text-red-400 text-center font-bold">
                          {error}
                        </div>
                      )}

                      <div className="space-y-4 text-left">
                        <input
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          placeholder="Ism va familiyangiz"
                          className={`w-full px-4 py-3.5 rounded-2xl border transition-all outline-none text-sm font-bold ${
                            isDark ? "bg-[#2C2C2E]/60 border-white/10 text-white focus:border-[#FF5A00]" : "bg-white border-zinc-200 text-black focus:border-[#FF5A00]"
                          }`}
                        />
                        {/* Phone Input Box */}
                        <div className={`flex items-center gap-3.5 px-4 py-3.5 rounded-2xl border transition-all ${
                          isDark 
                            ? "bg-[#2C2C2E]/60 border-white/10 text-white focus-within:border-[#FF5A00]" 
                            : "bg-white border-zinc-200 text-black focus-within:border-[#FF5A00]"
                        }`}>
                          {/* Flag indicator +998 */}
                          <div className="flex items-center gap-2 shrink-0 select-none">
                            <img src="/icons/uzb.png" alt="UZ" className="w-5.5 h-5.5 rounded-full object-cover shadow-sm border border-zinc-200/50" />
                          </div>
                          <PhoneInput
                            value={phone}
                            onChange={setPhone}
                            className="flex-1 bg-transparent border-0 p-0 text-sm font-bold tracking-wide outline-none focus:ring-0 focus:outline-none"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <button
                        type="button"
                        onClick={() => {
                          if (phone.length !== 9) {
                            setError("Telefon raqamini to'liq kiriting (9 ta raqam)!");
                            return;
                          }
                          setError("");
                          handleNextStep();
                        }}
                        className={`w-full py-4 rounded-full font-bold text-sm tracking-wide transition-all active:scale-98 shadow-lg ${
                          phone.length === 9
                            ? "bg-[#FF5A00] text-white shadow-[#FF5A00]/25 cursor-pointer hover:bg-[#E04F00]"
                            : isDark
                              ? "bg-white/10 text-white/30 cursor-not-allowed"
                              : "bg-[#FF5A00]/20 text-[#FF5A00]/45 cursor-not-allowed"
                        }`}
                      >
                        Keyingisi
                      </button>
                    </div>
                  </div>
                )}

                {/* Step "partner_password": Password */}
                {step === "partner_password" && (
                  <div className="space-y-4 flex-1 flex flex-col justify-between animate-scale-up">
                    <div className="space-y-4">
                      <div className="space-y-1.5 text-left">
                        <div className="flex items-center gap-1.5 -ml-2">
                          <button
                            type="button"
                            onClick={handleBackStep}
                            className="p-1 rounded-lg transition-colors cursor-pointer text-zinc-950 dark:text-white hover:opacity-75"
                          >
                            <ChevronLeft className="h-7 w-7 stroke-[2.5px]" />
                          </button>
                          <h2 className={`text-2xl font-extrabold ${isDark ? "text-white" : "text-black"}`}>
                            Parol yarating
                          </h2>
                        </div>
                        <p className={`text-xs ${isDark ? "text-white/60" : "text-zinc-500"} pl-7`}>
                          Akkauntingiz uchun xavfsiz parol kiriting
                        </p>
                      </div>

                      {error && (
                        <div className="rounded-xl bg-red-500/10 border border-red-500/20 p-3 text-xs text-red-400 text-center font-bold">
                          {error}
                        </div>
                      )}

                      <div className="space-y-4 text-left">
                        <PasswordInput
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="••••••"
                          className={`w-full px-4 py-3.5 rounded-2xl border transition-all outline-none ${
                            isDark 
                              ? "bg-[#2C2C2E]/60 border-white/10 text-white focus:border-[#FF5A00]" 
                              : "bg-white border-zinc-200 text-black focus:border-[#FF5A00]"
                          } text-sm font-bold tracking-widest`}
                        />
                      </div>
                    </div>

                    <div className="space-y-4">
                      <button
                        type="button"
                        onClick={() => {
                          setError("");
                          handleNextStep();
                        }}
                        className={`w-full py-4 rounded-full font-bold text-sm tracking-wide transition-all active:scale-98 shadow-lg ${
                          password.trim().length >= 8 && !loading
                            ? "bg-[#FF5A00] text-white shadow-[#FF5A00]/25 cursor-pointer hover:bg-[#E04F00]"
                            : isDark
                              ? "bg-white/10 text-white/30 cursor-not-allowed"
                              : "bg-[#FF5A00]/20 text-[#FF5A00]/45 cursor-not-allowed"
                        }`}
                      >
                        {loading ? "Ro'yxatdan o'tkazilmoqda..." : "Ro'yxatdan o'tish"}
                      </button>
                    </div>
                  </div>
                )}

                {/* Step 8: Success / Live Preview Setup */}
                {step === 8 && (
                  <div className="space-y-4 flex-1 flex flex-col justify-between animate-scale-up">
                    <div className="space-y-4">
                      {/* Success Check circle */}
                      <div className="flex flex-col items-center gap-3 text-center py-4">
                        <div className="w-16 h-16 rounded-full bg-[#10B981]/15 flex items-center justify-center text-[#10B981] animate-bounce">
                          <CheckCircle className="h-10 w-10" />
                        </div>
                        <h2 className={`text-2xl font-black ${isDark ? "text-white" : "text-black"}`}>
                          {accountType === "restaurant" ? "Restoran faollashdi!" : "To'yxona faollashdi!"}
                        </h2>
                        <p className={`text-xs ${isDark ? "text-white/60" : "text-zinc-505"}`}>
                          Akkauntingiz faollashtirildi. Quyida sizning joyingiz haqidagi ma'lumotlar keltirilgan:
                        </p>
                      </div>

                      {/* Live Summary Preview Box */}
                      <div className={`p-4 rounded-2xl border text-left space-y-2.5 ${
                        isDark ? "bg-[#2C2C2E]/60 border-white/10 text-white" : "bg-zinc-50 border-zinc-200 text-zinc-900"
                      }`}>
                        <div className="flex justify-between items-center text-xs">
                          <span className="opacity-60">Nomi:</span>
                          <span className="font-bold">{venueName}</span>
                        </div>
                        <div className="flex justify-between items-center text-xs">
                          <span className="opacity-60">Turi:</span>
                          <span className="font-bold capitalize">{accountType === "restaurant" ? "Restoran" : "To'yxona"}</span>
                        </div>
                        <div className="flex justify-between items-center text-xs">
                          <span className="opacity-60">Manzil:</span>
                          <span className="font-bold">{reg}, {dist}, {partnerStreet} {partnerHouse}</span>
                        </div>
                        <div className="flex justify-between items-center text-xs">
                          <span className="opacity-60">Sig'imi:</span>
                          <span className="font-bold">{venueCapacity} kishi</span>
                        </div>
                        <div className="flex justify-between items-center text-xs">
                          <span className="opacity-60">Narxi:</span>
                          <span className="font-bold text-[#FF5A00]">{Number(venuePrice).toLocaleString("uz-UZ")} UZS dan</span>
                        </div>
                        <div className="flex justify-between items-center text-xs">
                          <span className="opacity-60">Ish vaqti:</span>
                          <span className="font-bold">{venueHours}</span>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => router.push("/admin")}
                      className="w-full py-4 flex items-center justify-center gap-2 rounded-[20px] bg-[#FF5A00] hover:bg-[#E04F00] text-white font-bold text-sm shadow-lg hover:shadow-primary/20 transition-all mt-6 cursor-pointer"
                    >
                      Admin panelga o'tish <ArrowRight className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>

            </div>
          </main>
        </div>
      )}
    </div>
  );
}
