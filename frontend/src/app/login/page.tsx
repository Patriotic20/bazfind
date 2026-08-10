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
} from "lucide-react";
import Navbar from "@/components/navbar";

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
    a: "Loyiha bosh sahifasidagi 'Joylar' bo'limiga o'ting, o'zingizga yoqqan restoran yoki zalni tanlang. Sana, vaqt va stol raqamini belgilab, to'lovni tasdiqlang. Broningiz muvaffaqiyatli amalga oshgach, u 'Tarix' bo'limida faol holatda ko'rinadi."
  },
  {
    q: "To'lovlar xavfsizmi va qanday amalga oshiriladi?",
    a: "Barcha to'lovlar hamkor rasmiy to'lov tizimlari orqali 3D-Secure himoyasi bilan amalga oshiriladi. Humo yoki Uzcard bank kartangizni kiritib, SMS-kod orqali tasdiqlash yo'li bilan mutlaqo xavfsiz to'lov qilishingiz mumkin."
  },
  {
    q: "Buyurtmani bekor qilsam, pulim qaytariladimi?",
    a: "Ha, albatta. Agar tadbiringiz boshlanishiga 48 soatdan ko'proq vaqt qolgan bo'lsa, buyurtmani bekor qilishingiz mumkin va mablag'ingiz kartangizga 100% qaytarib beriladi. 48 soatdan kam vaqt qolganda esa bekor qilish imkoniyati mavjud emas."
  },
  {
    q: "Promo-kodlar va kuponlardan qanday foydalanaman?",
    a: "Mavjud kuponlarni 'Voucher' bo'limida ko'rishingiz mumkin. Buyurtmani rasmiylashtirish va to'lov sahifasida promo-kod kiritish oynasiga kupon kodini kiritsangiz, chegirma avtomatik ravishda buyurtma summasiga qo'llaniladi."
  }
];

export default function LoginPage() {
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";
  const formatPhone = (val: string) => {
    if (!val) return "";
    let out = "";
    if (val.length <= 2) {
      out = "(" + val;
    } else if (val.length <= 5) {
      out = "(" + val.slice(0, 2) + ") " + val.slice(2);
    } else if (val.length <= 7) {
      out = "(" + val.slice(0, 2) + ") " + val.slice(2, 5) + "-" + val.slice(5);
    } else {
      out = "(" + val.slice(0, 2) + ") " + val.slice(2, 5) + "-" + val.slice(5, 7) + "-" + val.slice(7, 9);
    }
    return out;
  };
  const [mounted, setMounted] = useState(false);
  const [isRegistered, setIsRegistered] = useState(false);
  const [step, setStep] = useState<Step>(1);
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
  const [accountType, setAccountType] = useState<"customer" | "restaurant" | "toyxona">("customer");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [venueName, setVenueName] = useState("");
  const [venueType, setVenueType] = useState<"restaurant" | "toyxona">("restaurant");
  const [venueHours, setVenueHours] = useState("09:00 - 23:00");
  const [venueCapacity, setVenueCapacity] = useState("");
  const [venuePrice, setVenuePrice] = useState("");
  const [venueImages, setVenueImages] = useState<string[]>([]);
  const [activePartnerField, setActivePartnerField] = useState<"name" | "hours" | "capacity" | "price" | "phone" | "password" | "">("name");
  const [isNumLayout, setIsNumLayout] = useState(false);
  const [reg, setReg] = useState("");
  const [dist, setDist] = useState("");

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
  
  const handleCustomerFinalRegister = () => {
    setError("");
    if (!fullName.trim()) {
      setError("Ismingizni kiriting!");
      return;
    }

    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      const newAccount = {
        username: phone.trim(),
        password: "default_password",
        role: "customer" as const,
        name: fullName.trim(),
        phone: "+998" + phone.trim(),
        location: "Tashkent, Tashkent city"
      };

      const accountsRaw = localStorage.getItem("registeredAccounts");
      let accountsList = [];
      if (accountsRaw) {
        try {
          accountsList = JSON.parse(accountsRaw) as any[];
        } catch (err) {}
      }
      accountsList.push(newAccount);
      localStorage.setItem("registeredAccounts", JSON.stringify(accountsList));

      localStorage.setItem("fullName", newAccount.name);
      localStorage.setItem("phone", newAccount.phone);
      localStorage.setItem("location", newAccount.location);
      localStorage.setItem("userRole", newAccount.role);
      localStorage.setItem("isRegistered", "true");
      
      setIsRegistered(true);
      setRole("customer");
      showToast("Ro'yxatdan muvaffaqiyatli o'tdingiz!");
      router.push("/feed");
    }, 1000);
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
  const [toastMessage, setToastMessage] = useState("");

  // Mount effect to check registration state
  useEffect(() => {
    setMounted(true);
    const registered = localStorage.getItem("isRegistered") === "true";
    if (registered) {
      setIsRegistered(true);
      setFullName(localStorage.getItem("fullName") || "Alisher Raimov");
      setLocation(localStorage.getItem("location") || "Tashkent, Tashkent city");
      setPhone(localStorage.getItem("phone") || "");
    }
  }, []);

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

  const handleSaveProfile = () => {
    if (!editName.trim()) {
      showToast("Ism va familiyangiz bo'sh bo'lishi mumkin emas!");
      return;
    }
    const cleanLocation = editLocation.trim() || "Tashkent, Tashkent city";
    setFullName(editName);
    setLocation(cleanLocation);
    setPhone(editPhone);
    localStorage.setItem("fullName", editName);
    localStorage.setItem("location", cleanLocation);
    localStorage.setItem("phone", editPhone);
    setIsEditing(false);
    showToast("Profil muvaffaqiyatli saqlandi!");
  };

  const handleLogout = () => {
    localStorage.removeItem("isRegistered");
    localStorage.removeItem("fullName");
    localStorage.removeItem("phone");
    localStorage.removeItem("location");
    localStorage.removeItem("userRole");
    setIsRegistered(false);
    setFullName("");
    setPhone("");
    setStep(1);
    setActiveModal(null);
    showToast("Akkauntdan chiqildi.");
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("isRegisteredChange"));
    }
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
      if (!reg || !dist) {
        setError("Viloyat va tumanni belgilang!");
        return;
      }
      setStep("partner_hours");
    } else if (step === "partner_hours") {
      if (!venueHours.trim()) {
        setError("Ish tartibini kiriting!");
        return;
      }
      setStep(4);
    } else if (step === 4) {
      if (!venueCapacity.trim()) {
        setError("Sig'imni kiriting!");
        return;
      }
      setStep("partner_price");
    } else if (step === "partner_price") {
      if (!venuePrice.trim()) {
        setError("Narxni kiriting!");
        return;
      }
      setStep(5);
    } else if (step === 5) {
      if (venueImages.length === 0) {
        setError("Kamida bitta rasm tanlang!");
        return;
      }
      setStep(6);
    } else if (step === 6) {
      if (phone.length < 9) {
        setError("Telefon raqamini to'liq kiriting!");
        return;
      }
      setStep("partner_password");
    } else if (step === "partner_password") {
      if (!password.trim()) {
        setError("Parol kiriting!");
        return;
      }
      setLoading(true);
      setTimeout(() => {
        setLoading(false);
        setStep(7);
      }, 1000);
    }
  };

  const handleBackStep = () => {
    setError("");
    if (step === 2) {
      setStep(1);
    } else if (step === "login" || step === "register_customer") {
      setStep(2);
    } else if (step === "register_customer_phone_otp") {
      setStep("register_customer");
    } else if (step === "register_customer_email_otp") {
      setStep("register_customer_phone_otp");
    } else if (step === "register_customer_name") {
      setStep("register_customer_email_otp");
    } else if (step === 3) {
      setStep(2);
    } else if (step === "partner_address") {
      setStep(3);
    } else if (step === "region") {
      setStep(3);
    } else if (step === "district") {
      setStep("region");
    } else if (step === "partner_hours") {
      setStep(3);
    } else if (step === 4) {
      setStep("partner_hours");
    } else if (step === "partner_price") {
      setStep(4);
    } else if (step === 5) {
      setStep("partner_price");
    } else if (step === 6) {
      setStep(5);
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

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!username.trim() || !password.trim()) {
      setError("Login va parolni to'liq kiriting!");
      return;
    }

    // Default admin credentials bypass
    if (username.trim() === "admin" && password.trim() === "admin") {
      localStorage.setItem("fullName", "Admin Hamkor");
      localStorage.setItem("phone", "+998991234567");
      localStorage.setItem("location", "Tashkent, Tashkent city");
      localStorage.setItem("userRole", "partner");
      localStorage.setItem("isRegistered", "true");
      setIsRegistered(true);
      setRole("partner");
      setFullName("Admin Hamkor");
      showToast("Tizimga muvaffaqiyatli kirdingiz!");
      router.push("/admin");
      return;
    }

    // Check saved credentials database
    const accountsRaw = localStorage.getItem("registeredAccounts");
    if (accountsRaw) {
      try {
        const accounts = JSON.parse(accountsRaw) as any[];
        const found = accounts.find(
          (a) => a.username === username.trim() && a.password === password.trim()
        );
        if (found) {
          localStorage.setItem("fullName", found.name);
          localStorage.setItem("phone", found.phone);
          localStorage.setItem("location", found.location || "Tashkent, Tashkent city");
          localStorage.setItem("userRole", found.role);
          localStorage.setItem("isRegistered", "true");
          setIsRegistered(true);
          setRole(found.role);
          setFullName(found.name);
          setPhone(found.phone);
          showToast("Tizimga muvaffaqiyatli kirdingiz!");
          if (found.role === "partner") {
            router.push("/admin");
          } else {
            router.push("/feed");
          }
          return;
        }
      } catch (err) {}
    }

    setError("Login yoki parol noto'g'ri!");
  };

  const handleCustomerRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!fullName.trim() || !phone.trim() || !password.trim()) {
      setError("Iltimos, barcha maydonlarni to'ldiring!");
      return;
    }

    // Save to active state and verify via phone step
    setStep(6); // Telefon raqami tasdiqlash
  };

  const handleOtpConfirm = () => {
    setError("");
    if (otp.some((v) => !v)) {
      setError("6 xonali kodni to'liq kiriting!");
      return;
    }

    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      if (accountType === "customer") {
        // Complete customer registration
        const newAccount = {
          username: phone.trim(),
          password: password.trim(),
          role: "customer" as const,
          name: fullName.trim(),
          phone: "+998" + phone.trim(),
          location: "Tashkent, Tashkent city"
        };
        const accountsRaw = localStorage.getItem("registeredAccounts");
        let accountsList = [];
        if (accountsRaw) {
          try {
            accountsList = JSON.parse(accountsRaw);
          } catch (err) {}
        }
        accountsList.push(newAccount);
        localStorage.setItem("registeredAccounts", JSON.stringify(accountsList));

        // Save active session
        localStorage.setItem("fullName", fullName);
        localStorage.setItem("phone", "+998" + phone);
        localStorage.setItem("location", "Tashkent, Tashkent city");
        localStorage.setItem("userRole", "customer");
        localStorage.setItem("isRegistered", "true");

        setIsRegistered(true);
        setRole("customer");
        showToast("Muvaffaqiyatli ro'yxatdan o'tdingiz!");
        router.push("/feed");
      } else {
        // Partner goes to live status page
        setStep(8);
      }
    }, 1000);
  };

  const handleCompletePartnerRegistration = () => {
    // Generate new account credentials
    const newAccount = {
      username: phone.trim(),
      password: password.trim(),
      role: "partner" as const,
      name: venueName.trim(),
      phone: "+998" + phone.trim(),
      location: `${reg}, ${dist}`
    };

    // Save to accounts list
    const accountsRaw = localStorage.getItem("registeredAccounts");
    let accountsList = [];
    if (accountsRaw) {
      try {
        accountsList = JSON.parse(accountsRaw);
      } catch (err) {}
    }
    accountsList.push(newAccount);
    localStorage.setItem("registeredAccounts", JSON.stringify(accountsList));

    // Save to partner venues list
    const priceNumVal = Number(venuePrice.replace(/\D/g, "")) || 4000000;
    const capacityNumVal = Number(venueCapacity.replace(/\D/g, "")) || 150;
    const formattedPriceText = priceNumVal.toLocaleString("uz-UZ") + " UZS dan";

    const newVenue = {
      id: "partner-user-" + Date.now(),
      name: venueName.trim(),
      location: `${reg}, ${dist}`,
      capacity: `${capacityNumVal} kishi`,
      capacityNum: capacityNumVal,
      priceText: formattedPriceText,
      priceNum: priceNumVal,
      rating: 5.0,
      category: accountType === "restaurant" ? "restoran" as const : "toyxona" as const,
      emoji: accountType === "restaurant" ? "🍽️" : "🏰",
      tags: ["Yangi", "Premium"],
    };

    const storedVenuesRaw = localStorage.getItem("partnerVenues");
    let partnerVenuesList = [];
    if (storedVenuesRaw) {
      try {
        partnerVenuesList = JSON.parse(storedVenuesRaw);
      } catch (err) {}
    }
    partnerVenuesList.push(newVenue);
    localStorage.setItem("partnerVenues", JSON.stringify(partnerVenuesList));

    // Save session
    localStorage.setItem("fullName", venueName.trim());
    localStorage.setItem("phone", "+998" + phone);
    localStorage.setItem("location", `${reg}, ${dist}`);
    localStorage.setItem("userRole", "partner");
    localStorage.setItem("isRegistered", "true");

    setIsRegistered(true);
    setRole("partner");
    setFullName(venueName.trim());
    setPhone("+998" + phone);

    showToast("Ro'yxatdan muvaffaqiyatli o'tdingiz!");
    router.push("/admin");
  };

  const menuItems = [
    {
      label: "Xabarlar",
      icon: Bell,
      action: () => setShowMessages(true),
    },
    {
      label: "Mening kartalarim",
      icon: Wallet,
      action: () => setShowCards(true),
    },
    {
      label: "Tarix",
      icon: Clock,
      action: () => setShowHistory(true),
    },
    {
      label: "Tillar",
      icon: Languages,
      action: () => {
        setTempLanguage(selectedLang || "uz");
        setShowLanguages(true);
      },
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

      {isRegistered ? (
        /* ==================== REGISTERED PROFILE VIEW ==================== */
        <div className={`flex flex-col flex-1 bg-[var(--background)] ${isDark ? "text-white" : "text-zinc-900"} transition-all duration-300 ${isBottomNavHidden ? "-mb-16" : ""}`}>
          {showCards ? (
            /* ==================== HIGH-FIDELITY REGISTERED MY CARDS VIEW ==================== */
            <div className={`flex flex-col flex-1 bg-[var(--background)] ${isDark ? "text-white" : "text-zinc-900"}`}>
              <style>{`
                @keyframes slideUp {
                  from { transform: translateY(100%); }
                  to { transform: translateY(0); }
                }
                .animate-slide-up {
                  animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
                }
              `}</style>

              {showCardOtp ? (
                /* ==================== SCREEN 4: OTP VERIFICATION VIEW ==================== */
                <div className={`flex flex-col flex-1 bg-[var(--background)] ${isDark ? "text-white" : "text-zinc-900"}`}>
                  {/* Close Top Bar */}
                  <div className="relative flex items-center justify-between px-6 py-5">
                    <button
                      onClick={() => setShowCardOtp(false)}
                      className={`p-2 rounded-xl transition-all active:scale-95 ${
                        isDark 
                          ? "bg-white/5 text-white/80 hover:bg-white/10 hover:text-white" 
                          : "bg-transparent text-zinc-950 hover:text-zinc-700"
                      }`}
                    >
                      <X className="h-6 w-6" />
                    </button>
                    <div className="w-9 h-9" />
                  </div>

                  {/* Verification Form Content */}
                  <main className="flex-1 px-6 py-4 flex flex-col justify-between max-w-md mx-auto w-full">
                    <div className="space-y-4">
                      <h1 className={`text-3xl font-bold tracking-tight ${isDark ? "text-white" : "text-black"}`}>Send verification code</h1>
                      <p className={`text-base leading-relaxed ${isDark ? "text-white/60" : "text-zinc-800"}`}>
                        We'll send a code to your phone number to verify your card
                      </p>

                      {/* 6 OTP Code Slots */}
                      <div className="flex gap-2 justify-center py-4">
                        {[0, 1, 2, 3, 4, 5].map((idx) => (
                          <div
                            key={idx}
                            className={`w-11 h-14 rounded-xl border flex items-center justify-center text-lg font-bold transition-all duration-200 ${
                              isDark 
                                ? "bg-[#393939] border-white/10" 
                                : "bg-white border-zinc-200 text-black"
                            } ${
                              cardOtp[idx] 
                                ? "border-[#FF5A00] text-[#FF5A00]" 
                                : ""
                            }`}
                          >
                            {cardOtp[idx] || ""}
                          </div>
                        ))}
                      </div>

                      {/* Resend Code Link */}
                      <div className="text-center">
                        <button
                          type="button"
                          onClick={() => showToast("Kod qayta yuborildi!")}
                          className="text-xs font-bold text-[#FF5A00] hover:text-primary-hover transition-colors"
                        >
                          Resent code
                        </button>
                      </div>
                    </div>

                    {/* Bottom Next Button & Keypad */}
                    <div className="space-y-6 pb-2">
                      <button
                        type="button"
                        disabled={cardOtp.some(digit => digit === "")}
                        onClick={() => {
                          const firstDigit = newCardNumber.charAt(0);
                          const cardType = firstDigit === "8" ? "uzcard" : "humo";
                          const masked = `**** **** **** ${newCardNumber.replace(/\s/g, "").slice(-4)}`;
                          
                          setUserCards((prev) => [
                            ...prev,
                            {
                              id: Date.now().toString(),
                              type: cardType,
                              number: masked,
                              name: fullName || "Alisher Raimov"
                            }
                          ]);
                          
                          // Reset & Success
                          showToast("Karta muvaffaqiyatli qo'shildi!");
                          setShowCardOtp(false);
                          setShowAddCard(false);
                          setNewCardNumber("");
                          setNewCardExpiry("");
                          setCardOtp(["", "", "", "", "", ""]);
                        }}
                        className={`w-full py-4 rounded-3xl font-bold text-sm tracking-wide transition-all active:scale-98 shadow-lg ${
                          cardOtp.some(digit => digit !== "")
                            ? "bg-[#FF5A00] text-white shadow-[#FF5A00]/25 cursor-pointer"
                            : isDark
                              ? "bg-primary/20 text-white/30 cursor-not-allowed"
                              : "bg-[#FF5A00]/20 text-white cursor-not-allowed"
                        }`}
                      >
                        Next
                      </button>

                      {/* Custom Simulated Numeric Keypad matching screenshot 4 */}
                      <div className={`grid grid-cols-3 gap-y-3 gap-x-4 px-4 py-4 rounded-t-3xl ${
                        isDark ? "bg-[#2C2C2E]/50" : "bg-[#D1D3D9]/60 backdrop-blur-md"
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
                          { val: "+*#", sub: "" },
                          { val: "0", sub: "" },
                          { val: "⌫", sub: "" }
                        ].map((btn, index) => {
                          const isSpecial = btn.val === "+*#" || btn.val === "⌫";
                          return (
                            <button
                              key={index}
                              type="button"
                              onClick={() => handleKeypadPress(btn.val)}
                              className={`rounded-lg py-2.5 flex flex-col items-center justify-center transition-all duration-100 ${
                                isDark
                                  ? "bg-[#2C2C2E] hover:bg-[#3A3A3C] active:bg-[#48484A]"
                                  : isSpecial
                                    ? "bg-transparent text-black hover:bg-zinc-200 active:bg-zinc-300"
                                    : "bg-white text-black shadow-[0_1px_1px_rgba(0,0,0,0.18)] hover:bg-zinc-50 active:bg-zinc-150"
                              }`}
                            >
                              <span className={`text-xl font-bold leading-tight ${isDark ? "text-white" : "text-black"}`}>{btn.val}</span>
                              {btn.sub && <span className={`text-[9px] font-medium uppercase tracking-widest leading-none ${
                                isDark ? "text-white/40" : "text-zinc-500"
                              }`}>{btn.sub}</span>}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </main>
                </div>
              ) : showAddCard ? (
                /* ==================== SCREEN 2 & 3: ADD CARD DETAILS VIEW ==================== */
                <div className={`flex flex-col flex-1 bg-[var(--background)] ${isDark ? "text-white" : "text-zinc-900"}`}>
                  {/* Top Bar Header */}
                  <div className={`relative flex items-center justify-between px-6 py-5 ${
                    isDark ? "border-b border-white/5" : ""
                  }`}>
                    <button
                      onClick={() => setShowAddCard(false)}
                      className={`p-2 rounded-xl transition-all active:scale-95 ${
                        isDark 
                          ? "bg-white/5 text-white/80 hover:bg-white/10 hover:text-white" 
                          : "bg-transparent text-zinc-950 hover:text-zinc-700"
                      }`}
                    >
                      <ChevronLeft className="h-6 w-6" />
                    </button>
                    <h1 className={`text-lg font-semibold tracking-wide ${isDark ? "text-white" : "text-zinc-950"}`}>Karta ma‘lumotlari</h1>
                    <div className="w-9 h-9" />
                  </div>

                  {/* Form Content */}
                  <main className="flex-1 px-6 py-8 flex flex-col justify-between max-w-md mx-auto w-full">
                    <div className="space-y-6">
                      {/* Card Number field with internal custom orange icon */}
                      <div className="space-y-2">
                        <div className={`relative flex items-center rounded-2xl border overflow-hidden transition-all duration-300 ${
                          isDark 
                            ? "bg-[#393939] border-white/5 focus-within:border-primary/50" 
                            : "bg-zinc-100 border-transparent focus-within:bg-zinc-200"
                        }`}>
                          <span className="pl-4 shrink-0 flex items-center justify-center">
                            <svg className="h-5 w-5 text-[#FF5A00]" viewBox="0 0 24 24" fill="currentColor">
                              <rect x="2" y="5" width="20" height="14" rx="3" />
                              <line x1="2" y1="10" x2="22" y2="10" stroke="white" strokeWidth="2" />
                              <rect x="5" y="14" width="3" height="2" fill="white" />
                            </svg>
                          </span>
                          <input
                            type="text"
                            value={newCardNumber}
                            onChange={handleCardNumberChange}
                            placeholder="Karta raqami"
                            className={`w-full pl-3 pr-4 py-4 bg-transparent text-sm font-semibold tracking-wider outline-none ${
                              isDark ? "text-white placeholder:text-white/30" : "text-zinc-900 placeholder:text-zinc-400"
                            }`}
                          />
                        </div>
                      </div>

                      {/* Expiry field */}
                      <div className="space-y-2">
                        <div className={`relative flex items-center rounded-2xl border overflow-hidden w-36 transition-all duration-300 ${
                          isDark 
                            ? "bg-[#393939] border-white/5 focus-within:border-primary/50" 
                            : "bg-zinc-100 border-transparent focus-within:bg-zinc-200"
                        }`}>
                          <input
                            type="text"
                            value={newCardExpiry}
                            onChange={handleCardExpiryChange}
                            placeholder="OO/YY"
                            className={`w-full px-4 py-4 bg-transparent text-sm font-semibold tracking-wider outline-none ${
                              isDark ? "text-white placeholder:text-white/30" : "text-zinc-900 placeholder:text-zinc-400"
                            }`}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Bottom Submit Button */}
                    <div className="pb-8">
                      <button
                        type="button"
                        disabled={newCardNumber.length < 19 || newCardExpiry.length < 5}
                        onClick={() => {
                          setCardOtp(["", "", "", "", "", ""]);
                          setShowCardOtp(true);
                        }}
                        className={`w-full py-4 rounded-3xl font-bold text-sm tracking-wide transition-all active:scale-98 shadow-lg ${
                          newCardNumber.length === 19 && newCardExpiry.length === 5
                            ? "bg-[#FF5A00] text-white shadow-[#FF5A00]/20 hover:bg-[#E05000] cursor-pointer"
                            : isDark
                              ? "bg-[#E25C00]/10 text-white/20 cursor-not-allowed"
                              : "bg-[#FF5A00]/20 text-white cursor-not-allowed"
                        }`}
                      >
                        Tasdiqlash
                      </button>
                    </div>
                  </main>
                </div>
              ) : (
                /* ==================== SCREEN 1: CARDS LIST VIEW ==================== */
                <div className={`flex flex-col flex-1 bg-[var(--background)] ${isDark ? "text-white" : "text-zinc-900"}`}>
                  {/* Top Bar Header */}
                  <div className={`relative flex items-center justify-between px-6 py-5 ${
                    isDark ? "border-b border-white/5" : ""
                  }`}>
                    <button
                      onClick={() => setShowCards(false)}
                      className={`p-2 rounded-xl transition-all active:scale-95 ${
                        isDark 
                          ? "bg-white/5 text-white/80 hover:bg-white/10 hover:text-white" 
                          : "bg-transparent text-zinc-950 hover:text-zinc-700"
                      }`}
                    >
                      <ChevronLeft className="h-6 w-6" />
                    </button>
                    <h1 className={`text-lg font-semibold tracking-wide ${isDark ? "text-white" : "text-zinc-950"}`}>Sozlamalar</h1>
                    <div className="w-9 h-9" />
                  </div>

                  {/* Content Container */}
                  <main className="flex-1 overflow-y-auto px-6 py-8 pb-10 flex flex-col gap-6 max-w-md mx-auto w-full">
                    {/* Render existing cards */}
                    {userCards.map((card) => (
                      <div
                        key={card.id}
                        onClick={() => setSelectedCardForDelete(card)}
                        className={`w-full border rounded-[24px] p-6 flex flex-col justify-between h-44 relative overflow-hidden transition-all duration-300 cursor-pointer active:scale-98 ${
                          isDark
                            ? "border-white/15 bg-[#393939] hover:border-primary/55 shadow-2xl"
                            : "border-slate-300 bg-white hover:border-slate-400 shadow-sm"
                        }`}
                      >
                        <div className="flex justify-between items-start">
                          {card.type === "humo" ? (
                            <img
                              src="/images/humo.png"
                              alt="Humo Card"
                              className="h-9 object-contain rounded"
                            />
                          ) : (
                            <div className="flex items-center gap-2 text-primary font-black uppercase text-sm tracking-widest">
                              <CreditCard className={`h-7 w-7 ${isDark ? "text-white" : "text-zinc-900"}`} />
                              <span className={isDark ? "text-white" : "text-zinc-900"}>Uzcard</span>
                            </div>
                          )}
                        </div>
                        <p className={`text-[15px] font-semibold tracking-wide capitalize ${
                          isDark ? "text-white/90" : "text-black"
                        }`}>
                          {card.name || fullName}
                        </p>
                        <p className={`text-[15px] font-semibold tracking-widest ${
                          isDark ? "text-white/90" : "text-black"
                        }`}>
                          {card.number}
                        </p>
                      </div>
                    ))}

                    {/* Card 2: Empty Card with Add Button */}
                    <div className={`w-full border rounded-[24px] p-6 flex flex-col justify-between h-44 transition-all duration-300 ${
                      isDark
                        ? "border-white/10 bg-[#393939]/20 hover:bg-[#393939]/30"
                        : "border-primary bg-white hover:border-primary/80"
                    }`}>
                      <div className={`flex justify-between items-start ${isDark ? "text-white/60" : "text-primary"}`}>
                        <CreditCard className="h-7 w-7" />
                      </div>
                      <div className="flex justify-start">
                        <button
                          type="button"
                          onClick={() => {
                            setNewCardNumber("");
                            setNewCardExpiry("");
                            setShowAddCard(true);
                          }}
                          className="flex items-center gap-2.5 px-6 py-3 rounded-full bg-[#FF5A00] hover:bg-[#E05000] text-white text-sm font-bold shadow-lg shadow-primary/20 transition-all active:scale-95 cursor-pointer"
                        >
                          <span className="flex items-center justify-center w-5 h-5 rounded-full bg-white text-[#FF5A00] text-xs font-black">+</span>
                          <span>Karta qo'shish</span>
                        </button>
                      </div>
                    </div>
                  </main>

                  {/* Card Deletion Bottom Drawer (Sheet) matching Screenshot 1 */}
                  {selectedCardForDelete && (
                    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end justify-center transition-opacity duration-300 animate-fade-in">
                      <div className="absolute inset-0" onClick={() => setSelectedCardForDelete(null)} />
                      
                      <div className={`w-full max-w-md rounded-t-[32px] px-6 pt-3 pb-8 flex flex-col items-center gap-4 z-10 animate-slide-up border-t relative ${
                        isDark ? "bg-[#393939] border-white/5" : "bg-white border-zinc-200"
                      }`}>
                        {/* Notch indicator */}
                        <div className={`w-12 h-1 rounded-full mb-2 ${isDark ? "bg-white/20" : "bg-zinc-200"}`} />
                        
                        {/* Title */}
                        <p className={`text-base font-bold tracking-wide ${isDark ? "text-white" : "text-zinc-900"}`}>Bank kartasi</p>
                        
                        {/* Delete Button */}
                        <button
                          type="button"
                          onClick={() => {
                            const idToDelete = selectedCardForDelete.id;
                            setUserCards((prev) => prev.filter((c) => c.id !== idToDelete));
                            setSelectedCardForDelete(null);
                            showToast("Karta muvaffaqiyatli o'chirildi!");
                          }}
                          className="w-full py-4 rounded-2xl bg-[#E82C2C] hover:bg-red-700 text-white font-bold text-sm tracking-wide flex items-center justify-center gap-2 transition-all active:scale-98 shadow-lg shadow-red-600/10"
                        >
                          <Trash2 className="h-4.5 w-4.5" />
                          <span>Kartani olib tashlash</span>
                        </button>
                        
                        {/* Cancel Button */}
                        <button
                          type="button"
                          onClick={() => setSelectedCardForDelete(null)}
                          className={`w-full py-4 font-bold text-sm tracking-wide transition-all active:scale-98 ${
                            isDark ? "text-white/60 hover:text-white" : "text-zinc-500 hover:text-zinc-800"
                          }`}
                        >
                          Ortga
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : showLanguages ? (
            /* ==================== HIGH-FIDELITY REGISTERED LANGUAGE SETTINGS VIEW ==================== */
            <div className={`flex flex-col flex-1 bg-[var(--background)] ${isDark ? "text-white" : "text-zinc-900"}`}>
              {/* Top Bar Header */}
              <div className="relative flex items-center justify-between px-6 py-5">
                <button
                  onClick={() => setShowLanguages(false)}
                  className={`p-2 rounded-xl transition-all active:scale-95 ${
                    isDark ? "bg-white/5 text-white/80 hover:bg-white/10 hover:text-white" : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200"
                  }`}
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <h1 className={`text-base font-bold tracking-wide ${isDark ? "text-white" : "text-zinc-900"}`}>Til sozlamalari</h1>
                <div className="w-9 h-9" />
              </div>

              {/* Form Content */}
              <main className="flex-1 px-6 py-6 flex flex-col justify-between max-w-md mx-auto w-full">
                <div className="space-y-6">
                  {/* Subtitle */}
                  <div className="space-y-1 text-left">
                    <h2 className={`text-xl font-bold tracking-tight leading-tight ${isDark ? "text-white" : "text-zinc-900"}`}>Ilovani o'zingizga qulay</h2>
                    <p className={`text-xl font-bold tracking-tight leading-tight ${isDark ? "text-white/95" : "text-zinc-800"}`}>tilda boshqaring</p>
                  </div>

                  {/* Language Options Grid */}
                  <div className="space-y-4">
                    {[
                      { code: "uz", label: "O'zbek tili", icon: "/icons/uzb.png" },
                      { code: "en", label: "Ingliz tili", icon: "/icons/eng.png" },
                      { code: "ru", label: "Rus tili", icon: "/icons/ru.png" }
                    ].map((opt) => {
                      const isSelected = tempLanguage === opt.code;
                      return (
                        <button
                          key={opt.code}
                          type="button"
                          onClick={() => setTempLanguage(opt.code)}
                          className={`w-full flex items-center justify-between p-5 rounded-[20px] transition-all duration-200 active:scale-98 text-left ${
                            isSelected
                              ? "bg-primary text-white shadow-lg shadow-primary/20"
                              : isDark ? "bg-[#393939] text-white hover:bg-zinc-800" : "bg-zinc-100 text-zinc-900 hover:bg-zinc-200"
                          }`}
                        >
                          <div className="flex items-center gap-4">
                            <img
                              src={opt.icon}
                              alt={opt.label}
                              className="w-10 h-10 object-cover rounded-full shadow-sm"
                            />
                            <span className="text-base font-bold tracking-wide">{opt.label}</span>
                          </div>
                          {isSelected && <Check className="h-5 w-5 text-white" />}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Bottom Confirm Button */}
                <div className="pb-8">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedLang(tempLanguage);
                      setShowLanguages(false);
                      showToast("Til muvaffaqiyatli o'zgartirildi!");
                    }}
                    className="w-full py-4 rounded-2xl bg-primary hover:bg-primary-hover text-white font-bold text-sm tracking-wide transition-all active:scale-98 shadow-lg shadow-primary/20"
                  >
                    Tasdiqlash
                  </button>
                </div>
              </main>
            </div>
          ) : showMessages ? (
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

                {/* Notifications Grouped List */}
                <div className="space-y-6">
                  {/* Group 1: Today */}
                  <div className="space-y-3.5">
                    <h3 className={`text-base font-bold tracking-wide ${isDark ? "text-white" : "text-zinc-800"}`}>Today</h3>
                    
                    {/* Unread Card (warm brown tint, unread red dot) */}
                    <div className={`w-full border rounded-3xl p-5 flex items-start gap-4 relative shadow-lg ${
                      isDark ? "bg-[#221A15] border-white/5" : "bg-orange-50/50 border-orange-100"
                    }`}>
                      {/* Red unread dot */}
                      <span className="absolute top-3.5 right-3.5 w-2 h-2 rounded-full bg-[#E53E3E]" />
                      
                      {/* Stylized Logo circular container */}
                      <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center shrink-0 shadow-md">
                        <img
                          src="/logo-loading.png"
                          alt="B"
                          className="w-7 h-7 object-contain"
                        />
                      </div>
                      
                      {/* Content text */}
                      <div className="space-y-1 pr-2">
                        <h4 className={`text-sm font-bold leading-snug ${isDark ? "text-white" : "text-zinc-900"}`}>
                          Bazmly just got better! 🚀
                        </h4>
                        <p className={`text-xs leading-normal ${isDark ? "text-white/80" : "text-zinc-650"}`}>
                          Check out our latest update now
                        </p>
                        <p className={`text-[10px] font-semibold pt-1 ${isDark ? "text-white/45" : "text-zinc-400"}`}>
                          20.01.2026, 18:00
                        </p>
                      </div>
                    </div>
                  </div>

                  <hr className={`border-t my-1 ${isDark ? "border-white/5" : "border-zinc-200"}`} />

                  {/* Group 2: This Week */}
                  <div className="space-y-3.5">
                    <h3 className={`text-base font-bold tracking-wide ${isDark ? "text-white" : "text-zinc-800"}`}>This Week</h3>
                    
                    {/* Read Card 1 (dark grey bg) */}
                    <div className={`w-full border rounded-3xl p-5 flex items-start gap-4 shadow-lg ${
                      isDark ? "bg-[#393939] border-white/5" : "bg-zinc-100 border-zinc-200"
                    }`}>
                      <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center shrink-0 shadow-md">
                        <img
                          src="/logo-loading.png"
                          alt="B"
                          className="w-7 h-7 object-contain"
                        />
                      </div>
                      
                      <div className="space-y-1">
                        <h4 className={`text-sm font-bold leading-snug ${isDark ? "text-white" : "text-zinc-900"}`}>
                          Bazmly just got better! 🚀
                        </h4>
                        <p className={`text-xs leading-normal ${isDark ? "text-white/80" : "text-zinc-650"}`}>
                          Check out our latest update now
                        </p>
                        <p className={`text-[10px] font-semibold pt-1 ${isDark ? "text-white/45" : "text-zinc-400"}`}>
                          20.01.2026, 18:00
                        </p>
                      </div>
                    </div>

                    {/* Read Card 2 (dark grey bg) */}
                    <div className={`w-full border rounded-3xl p-5 flex items-start gap-4 shadow-lg ${
                      isDark ? "bg-[#393939] border-white/5" : "bg-zinc-100 border-zinc-200"
                    }`}>
                      <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center shrink-0 shadow-md">
                        <img
                          src="/logo-loading.png"
                          alt="B"
                          className="w-7 h-7 object-contain"
                        />
                      </div>
                      
                      <div className="space-y-1">
                        <h4 className={`text-sm font-bold leading-snug ${isDark ? "text-white" : "text-zinc-900"}`}>
                          Bazmly just got better! 🚀
                        </h4>
                        <p className={`text-xs leading-normal ${isDark ? "text-white/80" : "text-zinc-650"}`}>
                          Check out our latest update now
                        </p>
                        <p className={`text-[10px] font-semibold pt-1 ${isDark ? "text-white/45" : "text-zinc-400"}`}>
                          20.01.2026, 18:00
                        </p>
                      </div>
                    </div>
                  </div>

                  <hr className={`border-t my-1 ${isDark ? "border-white/5" : "border-zinc-200"}`} />

                  {/* Group 3: This Month */}
                  <div className="space-y-3.5">
                    <h3 className={`text-base font-bold tracking-wide ${isDark ? "text-white" : "text-zinc-800"}`}>This Month</h3>

                    {/* Read Card 3 (dark grey bg, different date) */}
                    <div className={`w-full border rounded-3xl p-5 flex items-start gap-4 shadow-lg ${
                      isDark ? "bg-[#393939] border-white/5" : "bg-zinc-100 border-zinc-200"
                    }`}>
                      <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center shrink-0 shadow-md">
                        <img
                          src="/logo-loading.png"
                          alt="B"
                          className="w-7 h-7 object-contain"
                        />
                      </div>
                      
                      <div className="space-y-1">
                        <h4 className={`text-sm font-bold leading-snug ${isDark ? "text-white" : "text-zinc-900"}`}>
                          Bazmly just got better! 🚀
                        </h4>
                        <p className={`text-xs leading-normal ${isDark ? "text-white/80" : "text-zinc-650"}`}>
                          Check out our latest update now
                        </p>
                        <p className={`text-[10px] font-semibold pt-1 ${isDark ? "text-white/45" : "text-zinc-400"}`}>
                          12.01.2026, 15:30
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </main>
            </div>
          ) : showHistory ? (
            /* ==================== HIGH-FIDELITY REGISTERED BOOKINGS HISTORY VIEW ==================== */
            <div className={`flex flex-col flex-1 bg-[var(--background)] ${isDark ? "text-white" : "text-zinc-900"}`}>
              {/* Top Bar Header */}
              <div className={`relative flex items-center justify-between px-6 py-5 border-b ${
                isDark ? "border-white/5" : "border-zinc-100"
              }`}>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowHistory(false)}
                    className={`p-2 rounded-xl transition-all active:scale-95 ${
                      isDark ? "bg-white/5 text-white/80 hover:bg-white/10 hover:text-white" : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200"
                    }`}
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <h1 className={`text-xl font-bold tracking-wide ${isDark ? "text-white" : "text-zinc-900"}`}>Band qilingan</h1>
                </div>
                
                {/* Location pin with Toshkent */}
                <div className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full border ${
                  isDark 
                    ? "text-white/80 bg-white/5 border-white/5" 
                    : "text-zinc-800 bg-zinc-100 border-zinc-200"
                }`}>
                  <MapPin className="h-4 w-4 text-primary shrink-0" />
                  <span>Toshkent</span>
                </div>
              </div>

              {/* Scrollable Bookings List */}
              <main className="flex-1 overflow-y-auto px-6 py-6 pb-2 flex flex-col gap-6 max-w-md mx-auto w-full text-left">
                {[
                  { id: "1", showBanner: true },
                  { id: "2", showBanner: false }
                ].map((item) => (
                  <div
                    key={item.id}
                    className={`w-full rounded-3xl p-5 flex flex-col gap-4 transition-all duration-300 ${
                      isDark
                        ? "bg-[#393939] border border-white/5 shadow-xl hover:border-white/10"
                        : "bg-white border border-[#FF6B00] shadow-md hover:shadow-lg hover:border-primary/80"
                    }`}
                  >
                    {/* Top Restaurant Detail */}
                    <div className="flex items-start gap-4">
                      {/* Rounded restaurant image */}
                      <img
                        src="/images/restaurant.png"
                        alt="Rest One"
                        className={`w-20 h-20 rounded-2xl object-cover shrink-0 border shadow-md ${
                          isDark ? "border-white/5" : "border-zinc-100"
                        }`}
                      />
                      
                      <div className="space-y-1 pr-1 w-full min-w-0">
                        <h2 className={`text-base font-bold tracking-wide truncate ${
                          isDark ? "text-white" : "text-zinc-900"
                        }`}>Rest One</h2>
                        
                        {/* Distance & Status info */}
                        <div className={`flex items-center gap-1.5 text-xs font-medium ${
                          isDark ? "text-white/50" : "text-zinc-500"
                        }`}>
                          <MapPin className="h-3.5 w-3.5 shrink-0 text-zinc-400" />
                          <span>1 km</span>
                          <span className={isDark ? "text-white/20" : "text-zinc-300"}>|</span>
                          <span className="w-1.5 h-1.5 rounded-full bg-[#10B981] shrink-0" />
                          <span className="text-[#10B981] font-bold">Ochiq</span>
                        </div>

                        {/* Phone */}
                        <div className={`flex items-center gap-1.5 text-xs font-medium ${
                          isDark ? "text-white/60" : "text-zinc-650"
                        }`}>
                          <Phone className={`h-3.5 w-3.5 shrink-0 ${isDark ? "text-white/40" : "text-zinc-400"}`} />
                          <span>+998 99 123 45 67</span>
                        </div>

                        {/* Address */}
                        <div className={`flex items-center gap-1.5 text-xs font-medium truncate ${
                          isDark ? "text-white/60" : "text-zinc-650"
                        }`}>
                          <MapPin className={`h-3.5 w-3.5 shrink-0 ${isDark ? "text-white/40" : "text-zinc-400"}`} />
                          <span className="truncate">Umid qo'rg'oni 765 - uy</span>
                        </div>
                      </div>
                    </div>

                    {/* Horizontal Divider */}
                    <hr className={`border-t ${isDark ? "border-white/5" : "border-zinc-100"}`} />

                    {/* Booking metadata table */}
                    <div className="space-y-2.5 text-xs font-semibold">
                      <div className="flex justify-between items-center">
                        <span className={isDark ? "text-white/40" : "text-zinc-400"}>Holat</span>
                        <span className={`font-bold ${isDark ? "text-white" : "text-zinc-900"}`}>Band qilish tasdiqlandi</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className={isDark ? "text-white/40" : "text-zinc-400"}>Chek raqami:</span>
                        <span className={`font-mono ${isDark ? "text-white/90" : "text-zinc-900"}`}>0789 091172</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className={isDark ? "text-white/40" : "text-zinc-400"}>Belgilandi:</span>
                        <span className={isDark ? "text-white/90" : "text-zinc-900"}>11:00 • 26/02/2024</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className={isDark ? "text-white/40" : "text-zinc-400"}>Stol raqami:</span>
                        <span className={isDark ? "text-white/90" : "text-zinc-900"}>4 - stol</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className={isDark ? "text-white/40" : "text-zinc-400"}>Restoran raqami:</span>
                        <span className={isDark ? "text-white/90" : "text-zinc-900"}>+998 99 123 45 67</span>
                      </div>
                    </div>

                    {/* Bottom orange banner with clock for Card 1 */}
                    {item.showBanner && (
                      <div className={`w-full rounded-2xl py-3.5 px-4 flex items-center justify-between text-sm font-bold ${
                        isDark 
                          ? "bg-[#FF6B00] text-white shadow-md animate-pulse" 
                          : "bg-white border border-[#FF6B00] text-[#FF6B00]"
                      }`}>
                        <span className={isDark ? "text-white" : "text-[#FF6B00] opacity-80 font-medium"}>Qoldi:</span>
                        <div className="flex items-center gap-2">
                          <Clock className={`h-4.5 w-4.5 shrink-0 ${isDark ? "text-white" : "text-[#FF6B00]"}`} />
                          <span>2 soat 25 daqiqa</span>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
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
                    <img
                      src="/images/profil.jpg"
                      alt="User Portrait"
                      className="w-full h-full object-cover"
                    />
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
                      value={editPhone}
                      onChange={(e) => setEditPhone(e.target.value)}
                      placeholder="+998 99 219 19 55"
                      className={`w-full px-4 py-3.5 rounded-xl border text-sm font-medium outline-none focus:border-primary/50 transition-colors ${
                        isDark ? "border-white/10 bg-[#393939] text-white" : "border-zinc-200 bg-zinc-100 text-zinc-900 focus:bg-white"
                      }`}
                    />
                  </div>

                  {/* Location field */}
                  <div className="space-y-2 text-left">
                    <label className={`block text-xs font-semibold ${isDark ? "text-zinc-400" : "text-zinc-500"}`}>Manzil</label>
                    <div className="relative">
                      <select
                        value={editLocation}
                        onChange={(e) => setEditLocation(e.target.value)}
                        className={`w-full px-4 py-3.5 pr-10 rounded-xl border text-sm font-medium outline-none focus:border-primary/50 transition-colors appearance-none cursor-pointer ${
                          isDark ? "border-white/10 bg-[#393939] text-white" : "border-zinc-200 bg-zinc-100 text-zinc-900"
                        }`}
                      >
                        <option value="Tashkent, Tashkent city">Toshkent</option>
                        <option value="Samarkand, Samarkand region">Samarqand</option>
                        <option value="Bukhara, Bukhara region">Buxoro</option>
                        <option value="Andijan, Andijan region">Andijon</option>
                      </select>
                      <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none text-zinc-400">
                        <ChevronDown className="h-4.5 w-4.5" />
                      </div>
                    </div>
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
                      <img
                        src="/images/profil.jpg"
                        alt="User Portrait"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    {isDark && (
                      <div className="absolute bottom-0 right-1 bg-primary text-white p-2.5 rounded-full shadow-lg border-2 border-brand-dark">
                        <User className="h-4.5 w-4.5" />
                      </div>
                    )}
                  </div>

                  <div className="mt-5 space-y-1.5">
                    <h2 className={`text-2xl font-bold tracking-tight ${isDark ? "text-white" : "text-black"}`}>
                      {fullName || "Alisher Raimov"}
                    </h2>
                    <div className={`flex items-center justify-center gap-2 ${
                      isDark ? "text-xs font-medium text-white/60" : "text-base font-semibold text-black"
                    }`}>
                      <MapPin className={isDark ? "h-4 w-4 text-primary" : "h-5.5 w-5.5 text-black"} />
                      <span>{isDark ? location.split(",")[0] : location}</span>
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
                    handleLogout();
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
                        {/* Username Input */}
                        <div className="rounded-xl border border-foreground/10 dark:border-white/10 bg-foreground/5 dark:bg-white/5 p-3.5 focus-within:ring-2 focus-within:ring-[#FF5A00]/50 transition-all">
                          <label className="block text-[10px] font-bold text-foreground/45 dark:text-white/40 uppercase tracking-wider mb-1">
                            Foydalanuvchi nomi yoki telefon
                          </label>
                          <input
                            type="text"
                            required
                            placeholder="admin yoki telefon"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            className="block w-full border-0 bg-transparent p-0 text-foreground dark:text-white font-bold outline-none placeholder-foreground/20 dark:placeholder-white/20 focus:ring-0 text-sm"
                          />
                        </div>

                        {/* Password Input */}
                        <div className="rounded-xl border border-foreground/10 dark:border-white/10 bg-foreground/5 dark:bg-white/5 p-3.5 focus-within:ring-2 focus-within:ring-[#FF5A00]/50 transition-all">
                          <label className="block text-[10px] font-bold text-foreground/45 dark:text-white/40 uppercase tracking-wider mb-1">
                            Parol
                          </label>
                          <input
                            type="password"
                            required
                            placeholder="••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="block w-full border-0 bg-transparent p-0 text-foreground dark:text-white font-bold outline-none placeholder-foreground/20 dark:placeholder-white/20 focus:ring-0 text-sm"
                          />
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
                          <span className="text-sm font-bold">+998</span>
                        </div>
                        <input
                          type="tel"
                          maxLength={14}
                          value={formatPhone(phone)}
                          onChange={(e) => {
                            const val = e.target.value.replace(/\D/g, "");
                            setPhone(val.substring(0, 9));
                          }}
                          placeholder="90 123 45 67"
                          className="flex-1 bg-transparent text-sm font-bold tracking-wide outline-none border-none focus:ring-0 p-0"
                        />
                      </div>

                      {/* Apple and Google Continuation Buttons */}
                      <div className="space-y-3 pt-2">
                        {/* Google Button */}
                        <button
                          type="button"
                          onClick={() => showToast("Google orqali kirish simulyatsiya qilindi")}
                          className={`w-full flex items-center justify-center gap-2.5 py-3 rounded-2xl border text-xs font-bold transition-all active:scale-98 cursor-pointer ${
                            isDark 
                              ? "bg-[#2C2C2E]/60 hover:bg-[#3A3A3C] border-white/10 text-white" 
                              : "bg-white hover:bg-zinc-50 border-zinc-200 text-zinc-800"
                          }`}
                        >
                          <svg className="h-4.5 w-4.5" viewBox="0 0 24 24">
                            <path
                              fill="#4285F4"
                              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                            />
                            <path
                              fill="#34A853"
                              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                            />
                            <path
                              fill="#FBBC05"
                              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                            />
                            <path
                              fill="#EA4335"
                              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                            />
                          </svg>
                          <span>Continue with Google</span>
                        </button>

                        {/* Apple Button */}
                        <button
                          type="button"
                          onClick={() => showToast("Apple orqali kirish simulyatsiya qilindi")}
                          className={`w-full flex items-center justify-center gap-2.5 py-3 rounded-2xl border text-xs font-bold transition-all active:scale-98 cursor-pointer ${
                            isDark 
                              ? "bg-[#2C2C2E]/60 hover:bg-[#3A3A3C] border-white/10 text-white" 
                              : "bg-white hover:bg-zinc-50 border-zinc-200 text-zinc-800"
                          }`}
                        >
                          <Apple className="h-4.5 w-4.5" />
                          <span>Continue with Apple</span>
                        </button>
                      </div>
                    </div>

                    <div className="space-y-4">
                      {/* Orange Action Button */}
                      <button
                        type="button"
                        onClick={() => {
                          if (phone.length < 9) {
                            setError("Telefon raqamingizni to'liq kiriting!");
                            return;
                          }
                          setError("");
                          setStep("register_customer_phone_otp");
                        }}
                        className={`w-full py-3.5 rounded-[20px] font-bold text-sm tracking-wide transition-all active:scale-98 shadow-lg ${
                          phone.length === 9
                            ? "bg-[#FF5A00] text-white shadow-[#FF5A00]/25 cursor-pointer hover:bg-[#E04F00]"
                            : isDark
                              ? "bg-white/10 text-white/30 cursor-not-allowed"
                              : "bg-[#FF5A00]/20 text-[#FF5A00]/45 cursor-not-allowed"
                        }`}
                      >
                        Akkaunt yaratish
                      </button>


                    </div>
                  </div>
                )}

                {/* Step "register_customer_phone_otp": Phone OTP verification */}
                {step === "register_customer_phone_otp" && (
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
                          <h2 className={`text-2xl font-extrabold ${isDark ? "text-white" : "text-black"}`}>Tasdiqlash kodi</h2>
                        </div>
                        <p className={`text-sm ${isDark ? "text-white/60" : "text-zinc-500"} pl-7`}>
                          Telefon raqamingizga yuborilgan 6 xonali kodni kiriting <span className="text-[#FF5A00] font-semibold">+998 {formatPhone(phone)}</span>
                        </p>
                      </div>

                      {error && (
                        <div className="rounded-xl bg-red-500/10 border border-red-500/20 p-3 text-xs text-red-400 text-center font-bold">
                          {error}
                        </div>
                      )}

                      <input
                        type="text"
                        value={otp.join("")}
                        onChange={(e) => setOtp(e.target.value.split(""))}
                        placeholder="000000"
                        className={`w-full px-4 py-3.5 rounded-2xl border transition-all outline-none ${
                          isDark ? "bg-[#2C2C2E]/60 border-white/10 text-white focus:border-[#FF5A00]" : "bg-zinc-50 border-zinc-200 text-black focus:border-[#FF5A00]"
                        } text-sm font-bold tracking-wide`}
                      />

                      {/* Resend Code Link */}
                      <div className="text-center">
                        <button
                          type="button"
                          onClick={() => {
                            showToast("Tasdiqlash kodi qayta yuborildi!");
                            setOtp(["", "", "", "", "", ""]);
                          }}
                          className="text-xs font-bold text-[#FF5A00] hover:text-[#E04F00] transition-colors"
                        >
                          Kod qayta yuborilsinmi?
                        </button>
                      </div>
                    </div>

                    <div className="space-y-4">
                      {/* Next Button */}
                      <button
                        type="button"
                        onClick={() => {
                          if (otp.some((d) => d === "")) {
                            setError("6 xonali kodni to'liq kiriting!");
                            return;
                          }
                          setError("");
                          // Clear OTP state for next email screen
                          setOtp(["", "", "", "", "", ""]);
                          setStep("register_customer_email_otp");
                        }}
                        className={`w-full py-3.5 rounded-[20px] font-bold text-sm tracking-wide transition-all active:scale-98 shadow-lg ${
                          !otp.some((d) => d === "")
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

                {/* Step "register_customer_email_otp": Email OTP verification */}
                {step === "register_customer_email_otp" && (
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
                          <h2 className={`text-2xl font-extrabold ${isDark ? "text-white" : "text-black"}`}>Email tasdiqlash</h2>
                        </div>
                        <p className={`text-sm ${isDark ? "text-white/60" : "text-zinc-500"} pl-7`}>
                          Tasdiqlash kodi elektron pochtangizga yuborildi: <span className="text-[#FF5A00] font-semibold">all*****mov564@gmail.com</span>
                        </p>
                      </div>

                      {error && (
                        <div className="rounded-xl bg-red-500/10 border border-red-500/20 p-3 text-xs text-red-400 text-center font-bold">
                          {error}
                        </div>
                      )}

                      <input
                        type="text"
                        value={otp.join("")}
                        onChange={(e) => setOtp(e.target.value.split(""))}
                        placeholder="000000"
                        className={`w-full px-4 py-3.5 rounded-2xl border transition-all outline-none ${
                          isDark ? "bg-[#2C2C2E]/60 border-white/10 text-white focus:border-[#FF5A00]" : "bg-zinc-50 border-zinc-200 text-black focus:border-[#FF5A00]"
                        } text-sm font-bold tracking-wide`}
                      />

                      {/* Resend Code Link */}
                      <div className="text-center">
                        <button
                          type="button"
                          onClick={() => {
                            showToast("Tasdiqlash kodi qayta yuborildi!");
                            setOtp(["", "", "", "", "", ""]);
                          }}
                          className="text-xs font-bold text-[#FF5A00] hover:text-[#E04F00] transition-colors"
                        >
                          Kod qayta yuborilsinmi?
                        </button>
                      </div>
                    </div>

                    <div className="space-y-4">
                      {/* Next Button */}
                      <button
                        type="button"
                        onClick={() => {
                          if (otp.some((d) => d === "")) {
                            setError("6 xonali kodni to'liq kiriting!");
                            return;
                          }
                          setError("");
                          setStep("register_customer_name");
                        }}
                        className={`w-full py-3.5 rounded-[20px] font-bold text-sm tracking-wide transition-all active:scale-98 shadow-lg ${
                          !otp.some((d) => d === "")
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
                    </div>

                    <div className="space-y-4">
                      {/* Next/Finish Register Button */}
                      <button
                        type="button"
                        onClick={() => {
                          if (!fullName.trim()) {
                            setError("Iltimos ismingizni kiriting!");
                            return;
                          }
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
                        Tasdiqlash
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
                          if (!reg || !dist) {
                            setError("Iltimos manzilni kiriting!");
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
                        {[
                          "Toshkent sh.",
                          "Toshkent vil.",
                          "Samarqand",
                          "Buxoro",
                          "Farg'ona",
                          "Andijon",
                          "Namangan",
                          "Navoiy",
                          "Jizzax",
                          "Sirdaryo",
                          "Qashqadaryo",
                          "Surxondaryo",
                          "Xorazm",
                          "Qoraqalpog'iston Resp."
                        ].map((regionName) => {
                          const isSelected = reg === regionName;
                          return (
                            <button
                              key={regionName}
                              type="button"
                              onClick={() => {
                                setReg(regionName);
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
                              <span>{regionName}</span>
                              <ChevronRight className="h-4 w-4 opacity-50" />
                            </button>
                          );
                        })}
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
                        {(reg === "Toshkent sh."
                          ? ["Chilonzor", "Yunusobod", "Mirzo Ulug'bek", "Mirobod", "Yakkasaroy", "Shayxontohur", "Olmazor", "Sergeli", "Yashnobod", "Uchtepa"]
                          : reg === "Toshkent vil."
                          ? ["Zangiota", "Qibray", "Chirchiq", "Yangiyo'l", "Bo'stonliq", "Parkent", "O'rtachirchiq"]
                          : reg === "Samarqand"
                          ? ["Samarqand sh.", "Pastdarg'om", "Urgut", "Toyloq", "Bulung'ur", "Kattaqo'rg'on"]
                          : ["Markaziy tuman", "Shimoliy tuman", "G'arbiy tuman", "Janubiy tuman"]
                        ).map((districtName) => {
                          const isSelected = dist === districtName;
                          return (
                            <button
                              key={districtName}
                              type="button"
                              onClick={() => {
                                setDist(districtName);
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
                              <span>{districtName}</span>
                              <Check className={`h-4 w-4 text-[#FF5A00] ${isSelected ? "opacity-100" : "opacity-0"}`} />
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}

                {/* Step "partner_hours": Ish tartibi */}
                {step === "partner_hours" && (
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
                            Ish tartibi (soat)
                          </h2>
                        </div>
                        <p className={`text-xs ${isDark ? "text-white/60" : "text-zinc-500"} pl-7`}>
                          Ishlash soatlarini kiriting (masalan: 09:00 - 23:00)
                        </p>
                      </div>

                      {error && (
                        <div className="rounded-xl bg-red-500/10 border border-red-500/20 p-3 text-xs text-red-400 text-center font-bold">
                          {error}
                        </div>
                      )}

                      <div className="space-y-4 text-left">
                        <input
                          type="text"
                          value={venueHours}
                          onChange={(e) => setVenueHours(e.target.value)}
                          placeholder="09:00 - 23:00"
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
                          if (!venueHours.trim()) {
                            setError("Iltimos ish tartibini kiriting!");
                            return;
                          }
                          setError("");
                          handleNextStep();
                        }}
                        className={`w-full py-4 rounded-full font-bold text-sm tracking-wide transition-all active:scale-98 shadow-lg ${
                          venueHours.trim()
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

                {/* Step 4: Venue Capacity */}
                {step === 4 && (
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
                            Mijozlar sig'imi
                          </h2>
                        </div>
                        <p className={`text-xs ${isDark ? "text-white/60" : "text-zinc-500"} pl-7`}>
                          Muassasangizning umumiy sig'imini belgilang (kishi soni)
                        </p>
                      </div>

                      {error && (
                        <div className="rounded-xl bg-red-500/10 border border-red-500/20 p-3 text-xs text-red-400 text-center font-bold">
                          {error}
                        </div>
                      )}

                      <div className="space-y-4 text-left">
                        <input
                          type="number"
                          value={venueCapacity}
                          onChange={(e) => setVenueCapacity(e.target.value)}
                          placeholder="Sig'imi (masalan: 150)"
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
                          if (!venueCapacity.trim()) {
                            setError("Iltimos mijozlar sig'imini kiriting!");
                            return;
                          }
                          setError("");
                          handleNextStep();
                        }}
                        className={`w-full py-4 rounded-full font-bold text-sm tracking-wide transition-all active:scale-98 shadow-lg ${
                          venueCapacity.trim()
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
                        <input
                          type="number"
                          value={venuePrice}
                          onChange={(e) => setVenuePrice(e.target.value)}
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

                {/* Step 5: Mock Gallery Upload */}
                {step === 5 && (
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
                            Fotogalereya yuklash
                          </h2>
                        </div>
                        <p className={`text-xs ${isDark ? "text-white/60" : "text-zinc-500"} pl-7`}>
                          Jozibali rasmlardan kamida bittasini tanlang
                        </p>
                      </div>

                      {error && (
                        <div className="rounded-xl bg-red-500/10 border border-red-500/20 p-3 text-xs text-red-400 text-center font-bold">
                          {error}
                        </div>
                      )}

                      {/* Mock Image Grid */}
                      <div className="grid grid-cols-3 gap-2">
                        {[
                          "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=200&q=80",
                          "https://images.unsplash.com/photo-1519167758481-83f550bb49b3?w=200&q=80",
                          "https://images.unsplash.com/photo-1552566626-52f8b828add9?w=200&q=80",
                          "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=200&q=80",
                          "https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?w=200&q=80",
                          "https://images.unsplash.com/photo-1544025162-d76694265947?w=200&q=80"
                        ].map((imgUrl, i) => {
                          const isSelected = venueImages.includes(imgUrl);
                          return (
                            <button
                              key={i}
                              type="button"
                              onClick={() => {
                                if (isSelected) {
                                  setVenueImages(venueImages.filter(url => url !== imgUrl));
                                } else {
                                  setVenueImages([...venueImages, imgUrl]);
                                }
                              }}
                              className={`aspect-square rounded-xl overflow-hidden relative border-2 transition-all cursor-pointer ${
                                isSelected
                                  ? "border-[#FF5A00] scale-95"
                                  : "border-transparent opacity-60 hover:opacity-100"
                              }`}
                            >
                              <img src={imgUrl} alt="Mock Venue" className="w-full h-full object-cover" />
                              {isSelected && (
                                <div className="absolute inset-0 bg-[#FF5A00]/25 flex items-center justify-center">
                                  <div className="bg-[#FF5A00] rounded-full p-1 text-white">
                                    <Check className="h-3 w-3" />
                                  </div>
                                </div>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleNextStep}
                      className={`w-full py-3.5 rounded-[20px] font-bold text-sm tracking-wide transition-all active:scale-98 shadow-lg ${
                        venueImages.length > 0
                          ? "bg-[#FF5A00] text-white shadow-[#FF5A00]/25 cursor-pointer hover:bg-[#E04F00]"
                          : isDark
                            ? "bg-white/10 text-white/30 cursor-not-allowed"
                            : "bg-[#FF5A00]/20 text-[#FF5A00]/45 cursor-not-allowed"
                      }`}
                    >
                      Keyingisi
                    </button>
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
                          Tizimga kirish uchun telefon raqamingizni kiriting
                        </p>
                      </div>

                      {error && (
                        <div className="rounded-xl bg-red-500/10 border border-red-500/20 p-3 text-xs text-red-400 text-center font-bold">
                          {error}
                        </div>
                      )}

                      <div className="space-y-4 text-left">
                        {/* Phone Input Box */}
                        <div className={`flex items-center gap-3.5 px-4 py-3.5 rounded-2xl border transition-all ${
                          isDark 
                            ? "bg-[#2C2C2E]/60 border-white/10 text-white focus-within:border-[#FF5A00]" 
                            : "bg-white border-zinc-200 text-black focus-within:border-[#FF5A00]"
                        }`}>
                          {/* Flag indicator +998 */}
                          <div className="flex items-center gap-2 shrink-0 select-none">
                            <img src="/icons/uzb.png" alt="UZ" className="w-5.5 h-5.5 rounded-full object-cover shadow-sm border border-zinc-200/50" />
                            <span className="text-sm font-bold">+998</span>
                          </div>
                          {/* Phone digits input */}
                          <input
                            type="tel"
                            value={phone}
                            onChange={(e) => {
                              const cleaned = e.target.value.replace(/\D/g, "");
                              if (cleaned.length <= 9) {
                                setPhone(cleaned);
                              }
                            }}
                            placeholder="90 123 45 67"
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
                        Kodni olish
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
                        <input
                          type="password"
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
                          if (password.length < 6) {
                            setError("Parol kamida 6 ta belgidan iborat bo'lishi kerak!");
                            return;
                          }
                          setError("");
                          handleNextStep();
                        }}
                        className={`w-full py-4 rounded-full font-bold text-sm tracking-wide transition-all active:scale-98 shadow-lg ${
                          password.trim().length >= 6
                            ? "bg-[#FF5A00] text-white shadow-[#FF5A00]/25 cursor-pointer hover:bg-[#E04F00]"
                            : isDark
                              ? "bg-white/10 text-white/30 cursor-not-allowed"
                              : "bg-[#FF5A00]/20 text-[#FF5A00]/45 cursor-not-allowed"
                        }`}
                      >
                        Parolni tasdiqlash
                      </button>
                    </div>
                  </div>
                )}

                {/* Step 7: SMS Verification / OTP */}
                {step === 7 && (
                  <div className="space-y-4 flex-1 flex flex-col justify-between animate-scale-up">
                    <div className="space-y-4">
                      <div className="text-left space-y-1.5">
                        <div className="flex items-center gap-1.5 -ml-2">
                          <button
                            type="button"
                            onClick={handleBackStep}
                            className="p-1 rounded-lg transition-colors cursor-pointer text-zinc-950 dark:text-white hover:opacity-75"
                          >
                            <ChevronLeft className="h-7 w-7 stroke-[2.5px]" />
                          </button>
                          <h2 className={`text-2xl font-extrabold ${isDark ? "text-white" : "text-black"}`}>Tasdiqlash kodi</h2>
                        </div>
                        <p className={`text-xs ${isDark ? "text-white/60" : "text-zinc-500"} pl-7`}>
                          +998 {formatPhone(phone)} raqamiga yuborilgan 6 xonali tasdiqlash kodini kiriting
                        </p>
                      </div>

                      {error && (
                        <div className="rounded-xl bg-red-500/10 border border-red-500/20 p-3 text-xs text-red-400 text-center font-bold">
                          {error}
                        </div>
                      )}

                      <div className="space-y-4 text-left">
                        <input
                          type="text"
                          maxLength={6}
                          value={otp.join("")}
                          onChange={(e) => {
                            const val = e.target.value.replace(/\D/g, "").slice(0, 6);
                            const newOtp = ["", "", "", "", "", ""];
                            for (let i = 0; i < val.length; i++) {
                              newOtp[i] = val[i];
                            }
                            setOtp(newOtp);
                          }}
                          placeholder="000000"
                          className={`w-full px-4 py-3.5 rounded-2xl border text-center transition-all outline-none ${
                            isDark
                              ? "bg-[#2C2C2E]/60 border-white/10 text-white focus:border-[#FF5A00]"
                              : "bg-white border-zinc-200 text-black focus:border-[#FF5A00]"
                          } text-sm font-bold tracking-[0.5em]`}
                        />
                      </div>

                      <div className="text-center">
                        <button
                          type="button"
                          onClick={() => {
                            showToast("Tasdiqlash kodi qayta yuborildi!");
                            setOtp(["", "", "", "", "", ""]);
                          }}
                          className="text-xs font-bold text-[#FF5A00] hover:text-[#E04F00] transition-colors"
                        >
                          Kod qayta yuborilsinmi?
                        </button>
                      </div>
                    </div>

                    <div className="space-y-4">
                      {/* Next Button */}
                      <button
                        type="button"
                        onClick={() => {
                          if (otp.some((d) => d === "")) {
                            setError("Tasdiqlash kodini to'liq kiriting!");
                            return;
                          }
                          setError("");
                          handleOtpConfirm();
                        }}
                        className={`w-full py-4 rounded-full font-bold text-sm tracking-wide transition-all active:scale-98 shadow-lg ${
                          !otp.some((d) => d === "")
                            ? "bg-[#FF5A00] text-white shadow-[#FF5A00]/25 cursor-pointer hover:bg-[#E04F00]"
                            : isDark
                              ? "bg-white/10 text-white/30 cursor-not-allowed"
                              : "bg-[#FF5A00]/20 text-[#FF5A00]/45 cursor-not-allowed"
                        }`}
                        disabled={loading}
                      >
                        {loading ? (
                          <span className="flex items-center justify-center gap-1.5">
                            <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                            </svg>
                            Tekshirilmoqda...
                          </span>
                        ) : (
                          "Tasdiqlash"
                        )}
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
                          <span className="font-bold">{reg}, {dist}</span>
                        </div>
                        <div className="flex justify-between items-center text-xs">
                          <span className="opacity-60">Sig'imi:</span>
                          <span className="font-bold">{venueCapacity} kishi</span>
                        </div>
                        <div className="flex justify-between items-center text-xs">
                          <span className="opacity-60">Narxi (bir kishi):</span>
                          <span className="font-bold text-[#FF5A00]">{Number(venuePrice).toLocaleString("uz-UZ")} UZS dan</span>
                        </div>
                        <div className="flex justify-between items-center text-xs">
                          <span className="opacity-60">Ish vaqti:</span>
                          <span className="font-bold">{venueHours}</span>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={handleCompletePartnerRegistration}
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
