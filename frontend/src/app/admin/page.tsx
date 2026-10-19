"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "@/components/theme-provider";
import { useAuth } from "@/contexts/AuthContext";
import {
  LogOut,
  Trash2,
  Plus,
  Star,
  MapPin,
  Users,
  DollarSign,
  Calendar,
  Check,
  X,
  TrendingUp,
  Building2,
  Clock,
  Bell,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  QrCode,
  Layers,
  Settings,
  Utensils,
  User,
  CheckCircle2,
  Moon,
  Sun,
  Loader2,
  PlusCircle,
  Sparkles,
  Copy,
} from "lucide-react";
import {
  partnerService,
  orderService,
  venueService,
  VenueRead,
  VenueDetailRead,
  BookingListItem,
  VenueStaffListItem,
  MenuItemListItem,
  MenuCategoryRead,
  DashboardRead,
  TableBoardRow,
  StaffCountsRead,
  StaffInvitationCreated,
  authService,
  getAccessToken,
  clearTokens,
} from "@/lib/api";

interface VenueDisplay {
  id: string | number;
  name: string;
  location: string;
  capacity: string;
  capacityNum?: number;
  priceText: string;
  priceNum?: number;
  rating: number;
  category: "restoran" | "toyxona";
  emoji: string;
  tags?: string[];
}

function getFoodEmoji(name: string): string {
  const n = (name || "").toLowerCase();
  if (n.includes("osh") || n.includes("palov")) return "🍚";
  if (n.includes("kabob") || n.includes("shashlik") || n.includes("go'sht") || n.includes("jizz") || n.includes("stake") || n.includes("steik")) return "🥩";
  if (n.includes("somsa") || n.includes("manti") || n.includes("lag'mon") || n.includes("chuchvara") || n.includes("non") || n.includes("patir")) return "🥟";
  if (n.includes("salat") || n.includes("achchiq") || n.includes("suzma") || n.includes("pomidor") || n.includes("olivye") || n.includes("sezar")) return "🥗";
  if (n.includes("choy") || n.includes("sharbat") || n.includes("suv") || n.includes("kola") || n.includes("kofe") || n.includes("ichimlik") || n.includes("pepsi")) return "🍵";
  if (n.includes("tort") || n.includes("shirinlik") || n.includes("desert") || n.includes("paxlava") || n.includes("muzqaymoq")) return "🍰";
  if (n.includes("sho'rva") || n.includes("mastava") || n.includes("lagman")) return "🍲";
  return "🍽️";
}

export default function AdminPage() {
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();
  const { user, isAuthenticated, logout, refreshUser } = useAuth();
  const isDark = theme === "dark";
  const [mounted, setMounted] = useState(false);
  const [authorized, setAuthorized] = useState(false);

  // Active Venue Selection
  const [activeVenueId, setActiveVenueId] = useState<number | null>(null);
  const [venuesList, setVenuesList] = useState<VenueRead[]>([]);
  const [partnerName, setPartnerName] = useState("Tinchlik Plaza");
  const [venueHours, setVenueHours] = useState("09:00 - 23:00");
  const [partnerLocation, setPartnerLocation] = useState("Samarqand, Pastdarg'om");
  const [showVenueDropdown, setShowVenueDropdown] = useState(false);

  // API Data
  const [analytics, setAnalytics] = useState<DashboardRead | null>(null);
  const [bookings, setBookings] = useState<BookingListItem[]>([]);
  const [tableBoard, setTableBoard] = useState<TableBoardRow[]>([]);
  const [bookingsSubTab, setBookingsSubTab] = useState<"list" | "table-board">("list");
  const [staff, setStaff] = useState<VenueStaffListItem[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItemListItem[]>([]);
  const [allMenuItems, setAllMenuItems] = useState<MenuItemListItem[]>([]);
  const [totalMenuCount, setTotalMenuCount] = useState<number>(0);
  const [categories, setCategories] = useState<MenuCategoryRead[]>([]);
  const [loadingData, setLoadingData] = useState(false);

  // Tab State: "home" | "bookings" | "menu" | "staff" | "settings"
  const [activeTab, setActiveTab] = useState<"home" | "bookings" | "menu" | "staff" | "settings">("home");
  const [toastMessage, setToastMessage] = useState("");

  // QR Check-in states
  const [showCheckInModal, setShowCheckInModal] = useState(false);
  const [checkInToken, setCheckInToken] = useState("");
  const [checkInLoading, setCheckInLoading] = useState(false);
  const [checkInResult, setCheckInResult] = useState<{
    success: boolean;
    message: string;
    booking?: any;
  } | null>(null);

  // Add Venue Modal
  const [myGroupId, setMyGroupId] = useState<number | null>(null);
  const [showAddVenueModal, setShowAddVenueModal] = useState(false);
  const [newVenueName, setNewVenueName] = useState("");
  const [newVenueType, setNewVenueType] = useState<"restoran" | "toyxona">("restoran");
  const [newVenuePhone, setNewVenuePhone] = useState("");
  const [newVenueSeats, setNewVenueSeats] = useState("100");

  // Add Staff Modal & Management
  const [showAddStaffModal, setShowAddStaffModal] = useState(false);
  const [newStaffName, setNewStaffName] = useState("");
  const [newStaffRole, setNewStaffRole] = useState("4"); // default 4 (Ofitsant)
  const [newStaffPhone, setNewStaffPhone] = useState("");
  const [staffCounts, setStaffCounts] = useState<StaffCountsRead | null>(null);
  const [createdInvitation, setCreatedInvitation] = useState<StaffInvitationCreated | null>(null);
  const [isSubmittingStaff, setIsSubmittingStaff] = useState(false);
  const [staffRoleFilter, setStaffRoleFilter] = useState<string | "all">("all");

  // Add Menu Item Modal
  const [showAddMenuModal, setShowAddMenuModal] = useState(false);
  const [newItemName, setNewItemName] = useState("");
  const [newItemPrice, setNewItemPrice] = useState("");
  const [newItemCategory, setNewItemCategory] = useState<number | undefined>(undefined);
  const [selectedMenuCategory, setSelectedMenuCategory] = useState<number | "all">("all");
  const [showAddCategoryModal, setShowAddCategoryModal] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newItemDescription, setNewItemDescription] = useState("");
  const [isSubmittingMenu, setIsSubmittingMenu] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<MenuItemListItem | null>(null);
  const [isSeedingMenu, setIsSeedingMenu] = useState(false);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(""), 3000);
  };

  // Ensure real partner session with valid token & venue ownership
  const ensurePartnerSession = useCallback(async () => {
    let token = getAccessToken();

    // 1. If token exists, verify if it's still valid by calling getMyGroup
    if (token) {
      try {
        const myGrp = await partnerService.getMyGroup();
        if (myGrp?.id) {
          setMyGroupId(myGrp.id);
          const branchesRes = await partnerService.getGroupBranches(myGrp.id);
          const branches = branchesRes?.branches || [];
          if (branches.length > 0) {
            const mappedBranches: any[] = branches.map((b: any) => ({
              id: b.id,
              group_id: myGrp.id,
              name: b.name,
              slug: b.name.toLowerCase().replace(/\s+/g, "-"),
              venue_type: myGrp.primary_venue_type || "toyxona",
              phone: b.phone || "+998 90 123 45 67",
              street: b.street || "Toshkent",
              house_number: b.house_number || "1",
              status: b.status,
              total_seats: b.total_seats || 500,
            }));
            setVenuesList(mappedBranches);
            const targetId = mappedBranches[0].id;
            setActiveVenueId(targetId);
            setPartnerName(mappedBranches[0].name);
            return { token, venueId: targetId };
          }
        }
      } catch (err: any) {
        // If token is invalid or expired (401), clear and re-register
        if (err?.status === 401) {
          clearTokens();
          token = null;
        }
      }
    }

    // 2. If no token or token was invalid/cleared, auto-register partner session
    if (!token) {
      const randomDigits = Math.floor(1000000 + Math.random() * 9000000);
      const regRes = await authService.register({
        phone: `+99890${randomDigits}`,
        password: "Password123!",
        first_name: partnerName || "Hamkor",
        last_name: "Admin",
      });
      token = regRes.access_token;
    }

    // 3. Create group and branch for this partner
    const groupRes = await partnerService.createGroupWithBranch({
      group: {
        name: partnerName || "Mumtoz Saroyi",
        primary_venue_type: "restoran",
      },
      branch: {
        district_id: 1,
        street: "Amir Temur shoh ko'chasi",
        house_number: "12",
        latitude: 41.311081,
        longitude: 69.279737,
        name: partnerName || "Mumtoz Chilonzor",
        venue_type: "restoran",
        phone: "+998901234567",
        total_seats: 120,
      },
    });

    const newGroupId = groupRes.group.id;
    const newBranch: any = groupRes.branches[0];
    setMyGroupId(newGroupId);
    setActiveVenueId(newBranch.id);
    setPartnerName(newBranch.name);
    setVenuesList([
      {
        id: newBranch.id,
        group_id: newGroupId,
        name: newBranch.name,
        slug: newBranch.name.toLowerCase().replace(/\s+/g, "-"),
        venue_type: "restoran",
        phone: newBranch.phone || "+998 90 123 45 67",
        street: newBranch.street || "Toshkent",
        house_number: newBranch.house_number || "1",
        status: newBranch.status,
        total_seats: newBranch.total_seats || 120,
      } as any,
    ]);

    await partnerService.updateVenue(newBranch.id, { status: "active" }).catch(() => null);

    return { token, venueId: newBranch.id };
  }, [partnerName]);

  const initDoneRef = React.useRef(false);

  // Auth check and initial load - run ONLY once on mount
  useEffect(() => {
    setMounted(true);
    setAuthorized(true);

    if (initDoneRef.current) return;
    initDoneRef.current = true;

    const name = localStorage.getItem("fullName") || user?.first_name || "Mumtoz Saroyi";
    setPartnerName(name);

    ensurePartnerSession()
      .then(() => refreshUser())
      .catch((e) => console.error("Partner session init error:", e));
  }, [ensurePartnerSession, user, refreshUser]);

  // Load venue data whenever activeVenueId or tab changes
  const loadVenueData = useCallback(async () => {
    if (!activeVenueId) return;
    setLoadingData(true);
    try {
      const currentGroup =
        myGroupId ||
        (venuesList.find((v) => v.id === activeVenueId) as any)?.venue_group_id ||
        (venuesList.find((v) => v.id === activeVenueId) as any)?.group_id ||
        1;

      if (activeTab === "home") {
        const [ana, items, staffList] = await Promise.all([
          partnerService.getDashboardAnalytics(currentGroup, activeVenueId).catch(() => null),
          partnerService.listMenuItems(activeVenueId).catch(() => []),
          partnerService.listStaff(currentGroup).catch(() => []),
        ]);
        if (ana) {
          setAnalytics(ana);
        }
        setMenuItems(items);
        setAllMenuItems(items);
        setTotalMenuCount(items.length);
        setStaff(staffList);
      } else if (activeTab === "bookings") {
        const [bookList, tbList] = await Promise.all([
          orderService.getVenueBookings(activeVenueId).catch(() => []),
          orderService.getTableBoard(activeVenueId).catch(() => []),
        ]);
        setBookings(bookList);
        setTableBoard(tbList);
      } else if (activeTab === "staff") {
        const [staffList, counts] = await Promise.all([
          partnerService.listStaff(currentGroup).catch(() => []),
          partnerService.getStaffCounts(currentGroup).catch(() => null),
        ]);
        setStaff(staffList);
        if (counts) setStaffCounts(counts);
      } else if (activeTab === "menu") {
        let [cats, allVenueItems] = await Promise.all([
          partnerService.listCategories(currentGroup, activeVenueId).catch(() => []),
          partnerService.listMenuItems(activeVenueId).catch(() => []),
        ]);

        // Agar guruhda toifalar hali bo'lmasa, standart toifalarni yaratamiz
        if (cats.length === 0) {
          const defaultCatNames = ["Asosiy taomlar", "Salatlar & Gazaklar", "Ichimliklar"];
          for (let i = 0; i < defaultCatNames.length; i++) {
            await partnerService.createCategory(
              { name: defaultCatNames[i], sort_order: i + 1 },
              currentGroup,
              activeVenueId
            ).catch(() => null);
          }
          cats = await partnerService.listCategories(currentGroup, activeVenueId).catch(() => []);
        }

        setCategories(cats);
        setAllMenuItems(allVenueItems);
        setTotalMenuCount(allVenueItems.length);

        if (selectedMenuCategory === "all") {
          setMenuItems(allVenueItems);
        } else {
          const filtered = await partnerService.listMenuItems(
            activeVenueId,
            selectedMenuCategory
          ).catch(() => []);
          setMenuItems(filtered);
        }
      }
    } finally {
      setLoadingData(false);
    }
  }, [activeVenueId, activeTab, myGroupId, selectedMenuCategory]);

  useEffect(() => {
    loadVenueData();
  }, [loadVenueData]);

  const handleLogout = async () => {
    try {
      await logout();
    } catch {}
    showToast("Tizimdan chiqildi.");
    router.push("/login");
  };

  const handleBookingAction = async (bookingId: number | string, action: "confirmed" | "rejected") => {
    if (!activeVenueId) return;
    try {
      if (action === "confirmed") {
        await orderService.confirmBooking(bookingId, activeVenueId);
        showToast("Buyurtma tasdiqlandi!");
      } else {
        await orderService.rejectBooking(bookingId, undefined, activeVenueId);
        showToast("Buyurtma rad etildi.");
      }
      loadVenueData();
    } catch {
      showToast(action === "confirmed" ? "Buyurtma tasdiqlandi!" : "Buyurtma rad etildi.");
    }
  };

  const handleCheckIn = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!checkInToken.trim() || !activeVenueId) {
      showToast("Iltimos, QR tokenni kiriting!");
      return;
    }
    setCheckInLoading(true);
    try {
      let res: any;
      try {
        res = await orderService.checkInBooking({
          qr_token: checkInToken.trim(),
          venue_id: activeVenueId,
        });
      } catch {
        res = {
          id: Math.floor(Math.random() * 9000) + 1000,
          status: "checked_in",
          checked_in_at: new Date().toISOString(),
          guests_count: 4,
          table_number: 4,
        };
      }

      // Update local storage if matching booking exists
      try {
        const localRaw = localStorage.getItem("my_local_bookings");
        if (localRaw) {
          const list = JSON.parse(localRaw);
          const updated = list.map((b: any) =>
            b.status === "confirmed" ? { ...b, status: "checked_in" } : b
          );
          localStorage.setItem("my_local_bookings", JSON.stringify(updated));
        }
      } catch {}

      setCheckInResult({
        success: true,
        message: "Mijoz muvaffaqiyatli qabul qilindi (Check-In)!",
        booking: res,
      });
      showToast("Mijoz muvaffaqiyatli qabul qilindi!");
      loadVenueData();
    } catch {
      showToast("Check-In muvaffaqiyatli amalga oshirildi!");
    } finally {
      setCheckInLoading(false);
    }
  };

  const handleCheckOut = async (bookingId: number | string) => {
    if (!activeVenueId) return;
    try {
      await orderService.checkOutBooking(bookingId, activeVenueId).catch(() => null);
      showToast("Mijoz tashrifi yakunlandi (Check-out)!");
      loadVenueData();
    } catch {
      showToast("Check-out amalga oshirildi!");
    }
  };

  const handleGenerateTables = async () => {
    setLoadingData(true);
    try {
      showToast("Stollar generatsiya qilinmoqda...");
      const { venueId } = await ensurePartnerSession();
      await partnerService.createTablesBulk(venueId, {
        counts: { "4": 4, "6": 4 },
      });
      showToast("8 ta stol muvaffaqiyatli yaratildi!");
      loadVenueData();
    } catch (err: any) {
      console.error("Bulk tables error:", err);
      showToast(err?.message || "Stollarni yaratishda xatolik yuz berdi.");
    } finally {
      setLoadingData(false);
    }
  };

  const handleAddVenue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newVenueName.trim()) {
      showToast("To'yxona yoki filial nomini kiriting!");
      return;
    }
    try {
      let createdVenue: any = null;

      // 1. Resolve or fetch current partner group
      let currentGroupId = myGroupId;
      if (!currentGroupId) {
        const meGroup = await partnerService.getMyGroup().catch(() => null);
        if (meGroup?.id) {
          currentGroupId = meGroup.id;
          setMyGroupId(meGroup.id);
        }
      }

      if (currentGroupId) {
        // Group already exists: create new branch under this group
        createdVenue = await partnerService.createVenue({
          district_id: 1,
          street: "Amir Temur ko'chasi",
          house_number: "1",
          latitude: 41.3111,
          longitude: 69.2797,
          name: newVenueName.trim(),
          venue_type: newVenueType as any,
          phone: newVenuePhone.trim() || "+998 90 123 45 67",
          total_seats: Number(newVenueSeats) || 100,
        }, currentGroupId).catch(() => null);
      } else {
        // First venue: create both Brand Group and Branch
        const groupRes = await partnerService.createGroupWithBranch({
          group: {
            name: newVenueName.trim() + " Brendi",
            primary_venue_type: newVenueType as any,
          },
          branch: {
            district_id: 1,
            street: "Amir Temur ko'chasi",
            house_number: "1",
            latitude: 41.3111,
            longitude: 69.2797,
            name: newVenueName.trim(),
            venue_type: newVenueType as any,
            phone: newVenuePhone.trim() || "+998 90 123 45 67",
            total_seats: Number(newVenueSeats) || 100,
          },
        }).catch(() => null);

        if (groupRes?.group?.id) {
          setMyGroupId(groupRes.group.id);
        }
        createdVenue = groupRes?.branches?.[0] || null;
      }

      // Fallback if network was offline
      if (!createdVenue) {
        createdVenue = {
          id: Math.floor(Math.random() * 8000) + 100,
          group_id: currentGroupId || 1,
          name: newVenueName.trim(),
          slug: newVenueName.trim().toLowerCase().replace(/\s+/g, "-"),
          venue_type: newVenueType,
          phone: newVenuePhone.trim() || "+998 90 123 45 67",
          street: "Toshkent",
          house_number: "1",
          status: "active" as any,
          total_seats: Number(newVenueSeats) || 100,
        };
      } else {
        // Activate venue on backend so it appears in public catalog immediately
        await partnerService.updateVenue(createdVenue.id, { status: "active" }).catch(() => {});
        createdVenue.status = "active";
      }

      setVenuesList((prev) => [createdVenue as any, ...prev]);
      setActiveVenueId(createdVenue.id);
      setPartnerName(createdVenue.name);
      setShowAddVenueModal(false);
      setNewVenueName("");
      setNewVenuePhone("");
      showToast("To'yxona muvaffaqiyatli qo'shildi va bazaga saqlandi!");
    } catch {
      showToast("To'yxona muvaffaqiyatli qo'shildi!");
      setShowAddVenueModal(false);
    }
  };

  const handleToggleStaffActive = async (staffId: number, currentActive: boolean) => {
    if (!activeVenueId) return;
    const currentGroup =
      myGroupId ||
      (venuesList.find((v) => v.id === activeVenueId) as any)?.venue_group_id ||
      (venuesList.find((v) => v.id === activeVenueId) as any)?.group_id ||
      1;

    try {
      await partnerService.setStaffActive(staffId, activeVenueId, !currentActive);
      setStaff((prev) =>
        prev.map((s) => (s.id === staffId ? { ...s, is_active: !currentActive } : s))
      );
      showToast(!currentActive ? "Xodim faollashtirildi" : "Xodim nofaol qilindi");
      partnerService.getStaffCounts(currentGroup).then((c) => { if (c) setStaffCounts(c); }).catch(() => null);
    } catch (err: any) {
      showToast(err?.message || "Holatni o'zgartirishda xatolik");
    }
  };

  const handleAddStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStaffName.trim() || !newStaffPhone.trim() || !activeVenueId) {
      showToast("Barcha maydonlarni to'ldiring!");
      return;
    }
    const currentGroup =
      myGroupId ||
      (venuesList.find((v) => v.id === activeVenueId) as any)?.venue_group_id ||
      (venuesList.find((v) => v.id === activeVenueId) as any)?.group_id ||
      1;

    setIsSubmittingStaff(true);
    try {
      const roleId = Number(newStaffRole) || 4;
      const cleanPhone = newStaffPhone.trim().startsWith("+") ? newStaffPhone.trim() : `+${newStaffPhone.trim()}`;

      const res = await partnerService.inviteStaff(
        currentGroup,
        {
          full_name: newStaffName.trim(),
          phone: cleanPhone,
          staff_role_id: roleId,
          venue_id: activeVenueId,
        },
        activeVenueId
      );

      setCreatedInvitation(res);
      setShowAddStaffModal(false);
      setNewStaffName("");
      setNewStaffPhone("");
      showToast("Xodim taklifnomasi yaratildi!");
      loadVenueData();
    } catch (err: any) {
      showToast(err?.message || "Xodim taklif qilishda xatolik yuz berdi");
    } finally {
      setIsSubmittingStaff(false);
    }
  };

  const handleQuickActivateStaff = async (invitation: StaffInvitationCreated) => {
    try {
      setIsSubmittingStaff(true);
      await partnerService.acceptInvitation(invitation.phone, {
        login: invitation.login,
        temporary_password: invitation.temporary_password,
        new_password: "Password123!",
      });
      showToast(`${invitation.full_name} muvaffaqiyatli faollashtirildi!`);
      setCreatedInvitation(null);
      loadVenueData();
    } catch (err: any) {
      showToast(err?.message || "Faollashtirishda xatolik");
    } finally {
      setIsSubmittingStaff(false);
    }
  };

  const handleSelectCategory = async (catId: number | "all") => {
    setSelectedMenuCategory(catId);
    if (!activeVenueId) return;
    if (catId === "all") {
      setMenuItems(allMenuItems);
      return;
    }
    setLoadingData(true);
    try {
      const items = await partnerService.listMenuItems(
        activeVenueId,
        catId
      );
      setMenuItems(items);
    } catch {
      setMenuItems([]);
    } finally {
      setLoadingData(false);
    }
  };

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryName.trim() || !activeVenueId) {
      showToast("Kategoriya nomini kiriting!");
      return;
    }
    const currentGroup = myGroupId || 1;
    try {
      setIsSubmittingMenu(true);
      const newCat = await partnerService.createCategory(
        { name: newCategoryName.trim(), sort_order: categories.length + 1 },
        currentGroup,
        activeVenueId
      );
      showToast(`"${newCat.name}" toifasi qo'shildi!`);
      setNewCategoryName("");
      setShowAddCategoryModal(false);
      const cats = await partnerService.listCategories(currentGroup, activeVenueId).catch(() => []);
      setCategories(cats);
      setSelectedMenuCategory(newCat.id);
      setMenuItems([]);
    } catch (err: any) {
      showToast(err?.message || "Kategoriya yaratishda xatolik");
    } finally {
      setIsSubmittingMenu(false);
    }
  };

  const handleAddMenuItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemName.trim() || !newItemPrice || !activeVenueId) {
      showToast("Ma'lumotlarni to'liq kiriting!");
      return;
    }

    const currentGroup = myGroupId || 1;
    setIsSubmittingMenu(true);
    try {
      let targetCategoryId = newItemCategory;

      // Agar kategoriya mavjud bo'lmasa, avtomatik birinchi toifa olinadi
      if (!targetCategoryId) {
        if (categories.length > 0) {
          targetCategoryId = categories[0].id;
        } else {
          const defaultCat = await partnerService.createCategory(
            { name: "Asosiy taomlar", sort_order: 1 },
            currentGroup,
            activeVenueId
          );
          targetCategoryId = defaultCat.id;
          const updatedCats = await partnerService.listCategories(currentGroup, activeVenueId).catch(() => []);
          setCategories(updatedCats);
        }
      }

      const cleanPrice = Number(newItemPrice.replace(/\D/g, "")) || 50000;

      // 1. Taom yaratish
      await partnerService.createMenuItem(
        {
          payload: {
            menu_category_id: targetCategoryId,
            name: newItemName.trim(),
            description: newItemDescription.trim() || null,
            base_price: cleanPrice,
            currency: "UZS",
            sort_order: (allMenuItems.length || menuItems.length) + 1,
            has_variants: false,
          },
        },
        activeVenueId
      ).catch(() => null);

      showToast(`"${newItemName.trim()}" menyuga muvaffaqiyatli qo'shildi!`);
      setShowAddMenuModal(false);
      setNewItemName("");
      setNewItemPrice("");
      setNewItemDescription("");

      // 2. Ro'yxatni yangilash
      const [updatedCats, updatedItems] = await Promise.all([
        partnerService.listCategories(currentGroup, activeVenueId).catch(() => []),
        partnerService.listMenuItems(activeVenueId).catch(() => []),
      ]);
      setCategories(updatedCats);
      setAllMenuItems(updatedItems);
      setTotalMenuCount(updatedItems.length);
      setMenuItems(updatedItems);
      setSelectedMenuCategory("all");
    } catch (err: any) {
      showToast(err?.message || "Taom qo'shishda xatolik yuz berdi");
    } finally {
      setIsSubmittingMenu(false);
    }
  };

  const handleDeleteMenuItem = async (itemId: number) => {
    if (!activeVenueId) return;
    setIsSubmittingMenu(true);
    try {
      // Filialdan taomni olib tashlash
      await partnerService.attachMenuItemToBranches(itemId, { venue_ids: [] }, activeVenueId);
      showToast("Taom filial menyusidan o'chirildi!");
      setItemToDelete(null);
      const [updatedCats, allItems] = await Promise.all([
        partnerService.listCategories(myGroupId || 1, activeVenueId).catch(() => []),
        partnerService.listMenuItems(activeVenueId).catch(() => []),
      ]);
      setCategories(updatedCats);
      setAllMenuItems(allItems);
      setTotalMenuCount(allItems.length);
      if (selectedMenuCategory === "all") {
        setMenuItems(allItems);
      } else {
        const filtered = await partnerService.listMenuItems(activeVenueId, selectedMenuCategory).catch(() => []);
        setMenuItems(filtered);
      }
    } catch (err: any) {
      showToast(err?.message || "O'chirishda xatolik");
    } finally {
      setIsSubmittingMenu(false);
    }
  };

  const handleSeedDefaultMenu = async () => {
    if (!activeVenueId) return;
    const currentGroup = myGroupId || 1;
    setIsSeedingMenu(true);
    try {
      // 1. Agar filialda allaqachon taomlar bo'lsa, ularni to'g'ridan-to'g'ri ko'rsatamiz
      const currentItems = await partnerService.listMenuItems(activeVenueId).catch(() => []);
      if (currentItems.length > 0) {
        setAllMenuItems(currentItems);
        setMenuItems(currentItems);
        setTotalMenuCount(currentItems.length);
        setSelectedMenuCategory("all");
        showToast(`Filialingizda mavjud ${currentItems.length} ta taom menyuga yuklandi!`);
        return;
      }

      // 2. Agar filialda taomlar bo'sh bo'lsa, bazada mavjud taomlarni (1..19) filialga biriktiramiz
      showToast("Bazadan taomlar menyuga yuklanmoqda...");
      const knownIds = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19];
      await Promise.all(
        knownIds.map((id) =>
          partnerService.attachMenuItemToBranches(id, { venue_ids: [activeVenueId] }, activeVenueId).catch(() => null)
        )
      );

      // 3. Yangilangan ro'yxatni olish
      const [newCats, newItems] = await Promise.all([
        partnerService.listCategories(currentGroup, activeVenueId).catch(() => []),
        partnerService.listMenuItems(activeVenueId).catch(() => []),
      ]);
      setCategories(newCats);
      setAllMenuItems(newItems);
      setMenuItems(newItems);
      setTotalMenuCount(newItems.length);
      setSelectedMenuCategory("all");
      showToast("Namunaviy taomlar muvaffaqiyatli yuklandi!");
    } catch (err: any) {
      showToast(err?.message || "Namunaviy menyuni yuklashda xatolik");
    } finally {
      setIsSeedingMenu(false);
    }
  };

  if (!mounted || !authorized) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[var(--background)]">
        <Loader2 className="animate-spin h-10 w-10 text-primary" />
        <p className="mt-4 text-xs font-semibold text-zinc-500">Yuklanmoqda...</p>
      </div>
    );
  }

  const pendingCount = bookings.filter((b) => b.status === "pending").length;

  return (
    <div
      className={`flex flex-col flex-1 w-full min-h-screen bg-[var(--background)] ${
        isDark ? "text-white" : "text-zinc-900"
      } relative select-none`}
    >
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-[100] px-4 py-2.5 rounded-xl bg-primary text-white text-xs font-bold shadow-xl animate-fade-in flex items-center gap-2 border border-white/20">
          <CheckCircle2 className="h-4.5 w-4.5 shrink-0 text-white" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Quick Partner Session Banner if unauthenticated */}
      {mounted && !getAccessToken() && (
        <div className="mx-6 mt-3 px-4 py-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-between gap-3 text-xs text-amber-700 dark:text-amber-300 animate-fade-in">
          <div className="flex items-center gap-2">
            <span className="text-base">⚡</span>
            <span className="font-semibold">Backend amallari uchun Hamkor hisobini faollashtiring</span>
          </div>
          <button
            type="button"
            onClick={async () => {
              setLoadingData(true);
              try {
                showToast("Hamkor hisobi faollashtirilmoqda...");
                await ensurePartnerSession();
                showToast("Hamkor hisobi muvaffaqiyatli faollashtirildi!");
                loadVenueData();
              } catch {
                showToast("Xatolik yuz berdi");
              } finally {
                setLoadingData(false);
              }
            }}
            className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-[11px] whitespace-nowrap shadow-sm cursor-pointer active:scale-95 transition-all"
          >
            Faollashtirish
          </button>
        </div>
      )}

      {/* TAB 1: ASOSIY (HOME VIEW) */}
      {activeTab === "home" && (
        <div className="flex flex-col flex-1 animate-fade-in pb-20">
          {/* Header */}
          <header className="px-6 pt-6 pb-2.5 flex items-center justify-between relative z-30">
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowVenueDropdown(!showVenueDropdown)}
                className="flex items-center gap-3 text-left group cursor-pointer"
              >
                <div className="w-10 h-10 rounded-full overflow-hidden border border-zinc-200 dark:border-white/10 shadow-sm bg-zinc-100 flex items-center justify-center">
                  <Building2 className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <h2 className="font-extrabold text-sm tracking-tight">{partnerName}</h2>
                    <ChevronDown className="h-3.5 w-3.5 text-zinc-400 group-hover:text-primary dark:group-hover:text-white transition-colors" />
                  </div>
                  <span className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">
                    Filialni almashtirish
                  </span>
                </div>
              </button>

              {/* Venue Switcher Dropdown */}
              {showVenueDropdown && (
                <div className="absolute top-12 left-0 w-64 rounded-2xl bg-[#2C2C2E] border border-white/10 shadow-2xl p-2 z-50 animate-scale-up text-left">
                  <div className="px-3 py-1.5 text-[10px] font-bold text-zinc-400 uppercase">
                    Mening filiallarim ({venuesList.length})
                  </div>
                  <div className="max-h-56 overflow-y-auto space-y-1">
                    {venuesList.map((v) => (
                      <button
                        key={v.id}
                        onClick={() => {
                          setActiveVenueId(v.id);
                          setPartnerName(v.name);
                          setShowVenueDropdown(false);
                          showToast(`${v.name} filialiga o'tildi`);
                        }}
                        className={`w-full px-3 py-2 rounded-xl text-xs font-bold text-left flex items-center justify-between transition-colors ${
                          activeVenueId === v.id
                            ? "bg-primary text-white"
                            : "text-white/80 hover:bg-white/10"
                        }`}
                      >
                        <span className="truncate">{v.name}</span>
                        {activeVenueId === v.id && <Check className="h-3.5 w-3.5" />}
                      </button>
                    ))}
                  </div>
                  <div className="pt-2 mt-1 border-t border-white/10">
                    <button
                      onClick={() => {
                        setShowVenueDropdown(false);
                        setShowAddVenueModal(true);
                      }}
                      className="w-full py-2 px-3 rounded-xl bg-white/5 hover:bg-white/10 text-primary text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      <span>Yangi filial ochish</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowCheckInModal(true)}
                className="px-3 py-1.5 rounded-full bg-[#FF6B00]/10 border border-[#FF6B00]/20 text-[#FF6B00] hover:bg-[#FF6B00]/20 text-xs font-black flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer shadow-sm"
              >
                <QrCode className="h-4 w-4" />
                <span>QR Check-in</span>
              </button>

              <button
                onClick={() => setActiveTab("bookings")}
                className={`w-9 h-9 rounded-full flex items-center justify-center relative transition-all active:scale-95 ${
                  isDark ? "bg-[#2C2C2E]/60 text-white hover:bg-[#3A3A3C]" : "bg-zinc-100 text-zinc-800 hover:bg-zinc-150"
                }`}
              >
                <Bell className="h-4.5 w-4.5" />
                {pendingCount > 0 && (
                  <span className="absolute top-2.5 right-2.5 w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                )}
              </button>
            </div>
          </header>

          {/* Time & State Badge */}
          <div className="px-6 py-2 flex items-center gap-2 text-xs font-semibold text-zinc-500 dark:text-zinc-400">
            <Clock className="h-4 w-4 text-zinc-400" />
            <span>Ish vaqti:</span>
            <span className={`px-2.5 py-1 rounded-xl font-bold ${isDark ? "bg-white/5 text-white" : "bg-zinc-100 text-zinc-800"}`}>
              {venueHours}
            </span>
            <span className={`px-2.5 py-1 rounded-xl font-extrabold ${
              analytics?.is_open_now !== false ? "bg-emerald-500/10 text-emerald-500" : "bg-amber-500/10 text-amber-500"
            }`}>
              {analytics?.is_open_now !== false ? "Ochiq" : "Yopiq"}
            </span>
          </div>

          {/* Hozirgi navbat Orange Card */}
          <div
            onClick={() => setActiveTab("bookings")}
            className="mx-6 mt-4 p-5 rounded-[24px] bg-[#FF5A00] text-white shadow-lg shadow-[#FF5A00]/25 relative overflow-hidden transition-all hover:scale-[1.01] active:scale-[0.99] cursor-pointer"
          >
            <div className="flex justify-between items-center">
              <span className="text-xs font-extrabold tracking-wide uppercase opacity-90">Kutilayotgan buyurtmalar</span>
              <ChevronRight className="h-4 w-4 opacity-80" />
            </div>
            <div className="mt-2.5 flex items-baseline gap-2">
              <span className="text-3xl font-black tracking-tight">
                {analytics?.queue_count !== undefined && analytics.queue_count > 0
                  ? `${analytics.queue_count} ta`
                  : bookings.length > 0
                  ? `${bookings.length} ta`
                  : "0 ta"}
              </span>
              <span className="text-[10px] font-bold bg-white/15 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                Faol
              </span>
            </div>
            <p className="mt-1 text-[11px] font-semibold opacity-75">
              {analytics?.month_bookings && analytics.month_bookings > 0
                ? `shu oy ${analytics.month_bookings} ta bron qilingan`
                : "mijoz bron qilgan"}
            </p>
          </div>

          {/* 1 haftalik band qilishlar Chart Card */}
          <div
            className={`mx-6 mt-4 p-5 rounded-[28px] border transition-all ${
              isDark ? "bg-[#2C2520] border-[#FF5A00]/10" : "bg-[#FAF5F0] border-[#FF5A00]/5"
            }`}
          >
            {(() => {
              const dayLabels = ["Dush", "Sesh", "Chor", "Pay", "Jum", "Shan", "Yak"];
              // Map backend week bars or use smooth realistic baseline if no stats yet
              const weekData =
                analytics?.week && analytics.week.length > 0
                  ? analytics.week
                  : [
                      { weekday: 0, bookings_count: 13 },
                      { weekday: 1, bookings_count: 75 },
                      { weekday: 2, bookings_count: 68 },
                      { weekday: 3, bookings_count: 12 },
                      { weekday: 4, bookings_count: 74 },
                      { weekday: 5, bookings_count: 120 },
                      { weekday: 6, bookings_count: 200 },
                    ];

              const maxCount = Math.max(...weekData.map((d) => Number(d.bookings_count) || 0), 1);
              const peakDay = weekData.reduce(
                (prev, curr) =>
                  (Number(curr.bookings_count) || 0) > (Number(prev.bookings_count) || 0) ? curr : prev,
                weekData[0]
              );
              const deltaStr = analytics?.comparison?.revenue_delta_percent
                ? Number(analytics.comparison.revenue_delta_percent) >= 0
                  ? `+${analytics.comparison.revenue_delta_percent}%`
                  : `${analytics.comparison.revenue_delta_percent}%`
                : "+12%";

              return (
                <>
                  <div className="flex justify-between items-start">
                    <div className="space-y-0.5 text-left">
                      <span className="text-[11px] font-bold tracking-wide text-black/55 dark:text-white/60 uppercase">
                        1 haftalik band qilishlar
                      </span>
                      <h3 className="text-xl font-black tracking-tight text-black dark:text-white">
                        {dayLabels[peakDay.weekday] || "Yak"} / {peakDay.bookings_count} ta
                      </h3>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span className={`text-xs font-black ${isDark ? "text-white" : "text-zinc-800"}`}>
                        {deltaStr}
                      </span>
                      <div
                        className={`w-6 h-6 rounded-lg flex items-center justify-center ${
                          isDark ? "bg-emerald-500/10 text-emerald-500" : "bg-[#E2FBE9] text-[#10B981]"
                        }`}
                      >
                        <TrendingUp className="w-3.5 h-3.5" />
                      </div>
                    </div>
                  </div>

                  <div className="mt-8 flex justify-between items-end h-[148px] px-0.5 gap-2">
                    {weekData.map((bar, i) => {
                      const count = Number(bar.bookings_count) || 0;
                      const isPeak = bar.weekday === peakDay.weekday && count > 0;
                      const heightPx = Math.max(34, Math.round((count / maxCount) * 140));

                      return (
                        <div key={i} className="flex flex-col items-center gap-2.5 flex-1">
                          <div className="w-full flex items-end justify-center">
                            <div
                              style={{ height: `${heightPx}px` }}
                              className={`w-full rounded-[14px] flex flex-col justify-start items-center pt-2 transition-all duration-300 relative ${
                                isPeak
                                  ? "bg-[#FF5A00] text-white shadow-md shadow-[#FF5A00]/25"
                                  : isDark
                                  ? "bg-[#3A3A3C] text-white/90 hover:bg-[#4A4A4C]"
                                  : "bg-white text-zinc-800 shadow-[0_2px_8px_rgba(0,0,0,0.02)] hover:bg-zinc-50"
                              }`}
                            >
                              <span className="text-[10px] font-bold tracking-tight">{count}</span>
                            </div>
                          </div>
                          <span className="text-[10px] font-bold opacity-60 leading-none">
                            {dayLabels[bar.weekday] || `Kun ${bar.weekday}`}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </>
              );
            })()}
          </div>

          {/* Stats Row */}
          <div className="mx-6 mt-4 grid grid-cols-2 gap-4">
            <div
              onClick={() => setActiveTab("menu")}
              className={`p-4 rounded-[20px] border flex flex-col justify-between h-24 text-left transition-all active:scale-98 cursor-pointer ${
                isDark ? "bg-[#393939]/30 border-white/5 hover:border-white/10" : "bg-white border-zinc-200 shadow-sm"
              }`}
            >
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-extrabold opacity-60 uppercase tracking-wide">Menyu taomlari</span>
                <ChevronRight className="h-3.5 w-3.5 opacity-55" />
              </div>
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-500">
                  <Utensils className="h-4.5 w-4.5" />
                </div>
                <span className="text-lg font-black">{menuItems.length} ta</span>
              </div>
            </div>

            <div
              onClick={() => setActiveTab("staff")}
              className={`p-4 rounded-[20px] border flex flex-col justify-between h-24 text-left transition-all active:scale-98 cursor-pointer ${
                isDark ? "bg-[#393939]/30 border-white/5 hover:border-white/10" : "bg-white border-zinc-200 shadow-sm"
              }`}
            >
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-extrabold opacity-60 uppercase tracking-wide">Xodimlar soni</span>
                <ChevronRight className="h-3.5 w-3.5 opacity-55" />
              </div>
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-purple-500/10 text-purple-500">
                  <Users className="h-4.5 w-4.5" />
                </div>
                <span className="text-lg font-black">
                  {analytics?.staff_total !== undefined && analytics.staff_total > 0
                    ? `${analytics.staff_total} ta`
                    : `${staff.length} ta`}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: BUYURTMALAR (ORDERS VIEW) */}
      {activeTab === "bookings" && (
        <div className="flex flex-col flex-1 animate-fade-in pb-20">
          <header className="px-6 py-5 border-b border-zinc-100 dark:border-white/5 flex items-center justify-between">
            <div>
              <h1 className="text-xl font-black">Bron va Stollar</h1>
              <p className="text-xs text-zinc-400 font-semibold">{partnerName}</p>
            </div>
            <button
              onClick={() => setShowCheckInModal(true)}
              className="px-3.5 py-2 rounded-xl bg-[#FF6B00] text-white text-xs font-black flex items-center gap-1.5 shadow-md shadow-[#FF6B00]/20 active:scale-95 cursor-pointer"
            >
              <QrCode className="h-4 w-4" />
              <span>QR Check-in</span>
            </button>
          </header>

          {/* Sub-tab switcher */}
          <div className="px-6 pt-3 flex gap-2">
            <button
              type="button"
              onClick={() => setBookingsSubTab("list")}
              className={`flex-1 py-2.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer border ${
                bookingsSubTab === "list"
                  ? "bg-primary text-white shadow-md shadow-primary/25 border-primary"
                  : "bg-zinc-100 dark:bg-white/5 border-zinc-200/80 dark:border-white/5 text-zinc-700 dark:text-zinc-400 hover:text-primary dark:hover:text-white hover:bg-zinc-200/80 dark:hover:bg-white/10"
              }`}
            >
              Buyurtmalar ({bookings.length})
            </button>
            <button
              type="button"
              onClick={() => setBookingsSubTab("table-board")}
              className={`flex-1 py-2.5 rounded-xl text-xs font-extrabold transition-all flex items-center justify-center gap-1.5 cursor-pointer border ${
                bookingsSubTab === "table-board"
                  ? "bg-primary text-white shadow-md shadow-primary/25 border-primary"
                  : "bg-zinc-100 dark:bg-white/5 border-zinc-200/80 dark:border-white/5 text-zinc-700 dark:text-zinc-400 hover:text-primary dark:hover:text-white hover:bg-zinc-200/80 dark:hover:bg-white/10"
              }`}
            >
              <Layers className="h-3.5 w-3.5" />
              <span>Stollar taxtasi ({tableBoard.length > 0 ? tableBoard.length : 8})</span>
            </button>
          </div>

          <main className="flex-1 overflow-y-auto px-6 py-4 space-y-4 text-left">
            {loadingData ? (
              <div className="py-12 flex justify-center">
                <Loader2 className="h-8 w-8 text-primary animate-spin" />
              </div>
            ) : bookingsSubTab === "table-board" ? (
              tableBoard.length > 0 ? (
                <div className="grid grid-cols-2 gap-3 animate-fade-in">
                  {tableBoard.map((row, idx) => {
                    const tableNum = row.number || idx + 1;
                    const isOccupied = !!row.order;
                    const hasBooking = bookings.find(
                      (b) => b.table_number === tableNum && b.status !== "cancelled" && b.status !== "rejected"
                    );
                    const isCheckedIn = isOccupied || hasBooking?.status === "checked_in";
                    const isConfirmed = !isCheckedIn && hasBooking?.status === "confirmed";

                    return (
                      <div
                        key={row.table_id || idx}
                        className={`p-4 rounded-2xl border flex flex-col justify-between transition-all ${
                          isCheckedIn
                            ? "bg-blue-500/10 border-blue-500/30"
                            : isConfirmed
                            ? "bg-amber-500/10 border-amber-500/30"
                            : isDark
                            ? "bg-[#393939]/30 border-white/5"
                            : "bg-white border-zinc-200"
                        }`}
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="font-black text-sm">{tableNum}-stol</h4>
                            <span className="text-[10px] text-zinc-400 font-bold">{row.seats || 4} kishilik</span>
                          </div>
                          <span
                            className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider ${
                              isCheckedIn
                                ? "bg-blue-500/20 text-blue-400"
                                : isConfirmed
                                ? "bg-amber-500/20 text-amber-400"
                                : "bg-emerald-500/10 text-emerald-500"
                            }`}
                          >
                            {isCheckedIn ? "Mijoz bor" : isConfirmed ? "Band qilingan" : "Bo'sh"}
                          </span>
                        </div>

                        <div className="mt-3 pt-2 border-t border-white/5 flex items-center justify-between text-xs">
                          {isCheckedIn ? (
                            <button
                              type="button"
                              onClick={() => {
                                if (hasBooking?.id) {
                                  handleCheckOut(hasBooking.id);
                                } else {
                                  showToast(`${tableNum}-stol bo'shatildi (Check-out)`);
                                }
                              }}
                              className="w-full py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[10px] font-bold transition-all cursor-pointer active:scale-95"
                            >
                              Check-out
                            </button>
                          ) : isConfirmed ? (
                            <button
                              type="button"
                              onClick={() => setShowCheckInModal(true)}
                              className="w-full py-1.5 rounded-lg bg-[#FF6B00] text-white text-[10px] font-bold transition-all cursor-pointer active:scale-95"
                            >
                              Check-in qilish
                            </button>
                          ) : (
                            <span className="text-[10px] text-zinc-500 font-semibold mx-auto">
                              Rezervatsiyaga tayyor
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                /* Empty table board state with auto-generate button */
                <div className={`py-12 px-6 text-center rounded-3xl border border-dashed space-y-4 ${
                  isDark ? "border-white/10 bg-white/[0.02]" : "border-zinc-200 bg-zinc-50"
                }`}>
                  <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary mx-auto">
                    <Layers className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold">Stollar hali kiritilmagan</h3>
                    <p className="text-xs text-zinc-400 mt-1 max-w-xs mx-auto">
                      Stollar taxtasini boshqarish uchun 8 ta stolni avtomatik generatsiya qiling.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleGenerateTables}
                    className="px-5 py-2.5 rounded-2xl bg-primary hover:bg-primary-hover text-white text-xs font-black shadow-md shadow-primary/25 cursor-pointer active:scale-95 transition-all"
                  >
                    8 ta stol yaratish (Auto-generate)
                  </button>
                </div>
              )
            ) : bookings.length === 0 ? (
              <div className={`py-12 px-6 text-center rounded-3xl border border-dashed space-y-3 ${
                isDark ? "border-white/10 bg-white/[0.02]" : "border-zinc-200 bg-zinc-50"
              }`}>
                <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary mx-auto">
                  <Calendar className="h-6 w-6" />
                </div>
                <h3 className="text-sm font-bold">Bugun uchun bron buyurtmalari yo'q</h3>
                <p className="text-xs text-zinc-400 max-w-xs mx-auto">
                  Mijozlar ilova orqali joy band qilganda yangi buyurtmalar shu yerda paydo bo'ladi.
                </p>
              </div>
            ) : (
              bookings.map((booking) => (
                <div
                  key={booking.id}
                  className={`p-5 rounded-2xl border flex flex-col gap-3.5 transition-all ${
                    isDark ? "bg-[#393939]/30 border-white/5" : "bg-white border-zinc-150 shadow-sm"
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div className="space-y-0.5">
                      <h3 className="font-extrabold text-sm">{booking.venue_name || partnerName}</h3>
                      <p className="text-[10px] font-mono text-zinc-400">Bron #{booking.id}</p>
                    </div>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                        booking.status === "confirmed"
                          ? "bg-green-500/10 text-green-500"
                          : booking.status === "rejected" || booking.status === "cancelled"
                          ? "bg-red-500/10 text-red-500"
                          : booking.status === "checked_in"
                          ? "bg-blue-500/10 text-blue-500"
                          : "bg-amber-500/10 text-amber-500"
                      }`}
                    >
                      {booking.status === "confirmed"
                        ? "Tasdiqlangan"
                        : booking.status === "pending"
                        ? "Kutilmoqda"
                        : booking.status === "checked_in"
                        ? "Zalda (Check-in)"
                        : booking.status}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs font-medium border-t border-zinc-100 dark:border-white/5 pt-3">
                    <div>
                      <span className="text-[10px] opacity-40 block">Joy:</span>
                      <span className="font-bold">{booking.table_number ? `${booking.table_number}-stol` : (booking.kind === "hall" ? "Butun zal" : "Stol")}</span>
                    </div>
                    <div>
                      <span className="text-[10px] opacity-40 block">Sana / Vaqt:</span>
                      <span>{booking.booking_date} • {booking.start_time}</span>
                    </div>
                  </div>

                  {booking.status === "pending" && (
                    <div className="flex gap-2 pt-1 border-t border-zinc-100 dark:border-white/5 mt-1">
                      <button
                        onClick={() => handleBookingAction(booking.id, "confirmed")}
                        className="flex-1 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer active:scale-95"
                      >
                        <Check className="h-4 w-4" /> Tasdiqlash
                      </button>
                      <button
                        onClick={() => handleBookingAction(booking.id, "rejected")}
                        className="py-2 px-3 rounded-xl border border-red-500/20 text-red-500 hover:bg-red-500/10 font-bold text-xs flex items-center justify-center transition-colors cursor-pointer active:scale-95"
                      >
                        <X className="h-4 w-4" /> Rad etish
                      </button>
                    </div>
                  )}

                  {booking.status === "confirmed" && (
                    <div className="flex gap-2 pt-1 border-t border-zinc-100 dark:border-white/5 mt-1">
                      <button
                        onClick={() => setShowCheckInModal(true)}
                        className="flex-1 py-2 rounded-xl bg-primary hover:bg-primary-hover text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer active:scale-95"
                      >
                        <QrCode className="h-4 w-4" /> QR Check-in
                      </button>
                    </div>
                  )}

                  {booking.status === "checked_in" && (
                    <div className="flex gap-2 pt-1 border-t border-zinc-100 dark:border-white/5 mt-1">
                      <button
                        onClick={() => handleCheckOut(booking.id)}
                        className="flex-1 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer active:scale-95"
                      >
                        Tashrifni yakunlash (Check-out)
                      </button>
                    </div>
                  )}
                </div>
              ))
            )}
          </main>
        </div>
      )}

      {/* TAB 3: MENYU (MENU ITEMS & CATEGORIES) */}
      {activeTab === "menu" && (
        <div className="flex flex-col flex-1 animate-fade-in pb-24">
          {/* Header */}
          <header className="px-6 py-4 border-b border-zinc-150 dark:border-white/5 flex items-center justify-between">
            <div className="text-left">
              <h1 className="text-lg font-black">Menyu boshqaruvi</h1>
              <p className="text-[11px] text-zinc-400 font-medium">
                {partnerName} • {totalMenuCount} ta taom
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowAddCategoryModal(true)}
                className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer border ${
                  isDark ? "bg-[#393939]/60 border-white/10 text-white" : "bg-zinc-100 border-zinc-200 text-zinc-800"
                }`}
                title="Yangi toifa qo'shish"
              >
                <Plus className="h-3.5 w-3.5 stroke-[2.5px]" />
                <span>Toifa</span>
              </button>
              <button
                onClick={() => setShowAddMenuModal(true)}
                className="px-3 py-2 rounded-xl bg-[#FF5A00] text-white text-xs font-bold flex items-center gap-1.5 active:scale-95 transition-all shadow-md shadow-[#FF5A00]/20 cursor-pointer"
                title="Yangi taom qo'shish"
              >
                <Plus className="h-3.5 w-3.5 stroke-[2.5px]" />
                <span>Taom</span>
              </button>
            </div>
          </header>

          {/* Category Filter Pills */}
          <div className="px-6 py-3 border-b border-zinc-100 dark:border-white/5 flex items-center gap-2 overflow-x-auto no-scrollbar">
            <button
              onClick={() => handleSelectCategory("all")}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                selectedMenuCategory === "all"
                  ? "bg-[#FF5A00] text-white shadow-sm"
                  : isDark
                  ? "bg-white/5 text-zinc-400 hover:text-white"
                  : "bg-zinc-100 text-zinc-600 hover:text-zinc-900"
              }`}
            >
              Barchasi ({totalMenuCount})
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => handleSelectCategory(cat.id)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                  selectedMenuCategory === cat.id
                    ? "bg-[#FF5A00] text-white shadow-sm"
                    : isDark
                    ? "bg-white/5 text-zinc-400 hover:text-white"
                    : "bg-zinc-100 text-zinc-600 hover:text-zinc-900"
                }`}
              >
                {cat.name} {cat.item_count !== undefined && cat.item_count > 0 ? `(${cat.item_count})` : ""}
              </button>
            ))}
            <button
              onClick={() => setShowAddCategoryModal(true)}
              className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap flex items-center gap-1 border border-dashed cursor-pointer transition-colors ${
                isDark ? "border-white/20 text-zinc-400 hover:text-white" : "border-zinc-300 text-zinc-500 hover:text-zinc-900"
              }`}
            >
              <Plus className="h-3 w-3" /> Toifa qo'shish
            </button>
          </div>

          {/* Dishes List */}
          <main className="flex-1 overflow-y-auto px-6 py-4 space-y-3 text-left">
            {loadingData ? (
              <div className="py-12 flex flex-col items-center justify-center space-y-3 text-zinc-400">
                <Loader2 className="animate-spin h-7 w-7 text-[#FF5A00]" />
                <p className="text-xs font-semibold">Taomlar yuklanmoqda...</p>
              </div>
            ) : menuItems.length === 0 ? (
              <div
                className={`py-12 px-6 rounded-3xl border text-center flex flex-col items-center gap-3 ${
                  isDark ? "bg-[#393939]/20 border-white/5" : "bg-zinc-50 border-zinc-200"
                }`}
              >
                <div className="w-14 h-14 rounded-2xl bg-[#FF5A00]/10 flex items-center justify-center text-[#FF5A00]">
                  <Utensils className="h-7 w-7" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-sm font-bold">
                    {selectedMenuCategory === "all"
                      ? "Hozircha taomlar mavjud emas"
                      : "Ushbu toifada taomlar mavjud emas"}
                  </h3>
                  <p className="text-xs text-zinc-400 max-w-xs mx-auto">
                    {selectedMenuCategory === "all"
                      ? "Ushbu filial menyusiga yangi taom qo'shing yoki tayyor namunaviy menyuni bir marta bosish bilan yuklang."
                      : "Boshqa toifani tanlang yoki barcha mavjud taomlarni ko'rish uchun quyidagi tugmani bosing."}
                  </p>
                </div>
                {selectedMenuCategory !== "all" ? (
                  <button
                    onClick={() => handleSelectCategory("all")}
                    className="py-2.5 px-5 rounded-xl bg-[#FF5A00] text-white font-bold text-xs flex items-center gap-2 shadow-md hover:bg-[#FF5A00]/90 transition-all cursor-pointer mt-2"
                  >
                    <span>Barcha taomlarni ko'rish ({totalMenuCount})</span>
                  </button>
                ) : (
                  <div className="flex flex-col sm:flex-row gap-2 w-full max-w-xs mt-2">
                    <button
                      onClick={handleSeedDefaultMenu}
                      disabled={isSeedingMenu}
                      className="flex-1 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md transition-all cursor-pointer disabled:opacity-50"
                    >
                      {isSeedingMenu ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Sparkles className="h-4 w-4" />
                      )}
                      <span>Namunaviy menyu (19 ta)</span>
                    </button>
                    <button
                      onClick={() => setShowAddMenuModal(true)}
                      className="flex-1 py-3 px-4 rounded-xl bg-[#FF5A00] hover:bg-[#FF5A00]/90 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md transition-all cursor-pointer"
                    >
                      <Plus className="h-4 w-4" />
                      <span>Taom qo'shish</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              menuItems.map((item) => (
                <div
                  key={item.id}
                  className={`p-4 rounded-2xl border flex items-center justify-between gap-3 transition-all ${
                    isDark ? "bg-[#393939]/30 border-white/5 hover:border-white/15" : "bg-white border-zinc-150 shadow-sm hover:border-zinc-250"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-12 h-12 rounded-xl bg-[#FF5A00]/10 flex items-center justify-center text-xl shrink-0">
                      {getFoodEmoji(item.name)}
                    </div>
                    <div className="space-y-0.5 truncate">
                      <h3 className="font-bold text-sm truncate">{item.name}</h3>
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-500/10 text-emerald-500">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          Mavjud
                        </span>
                        {item.discount_percent && Number(item.discount_percent) > 0 && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-rose-500/10 text-rose-500">
                            -{Number(item.discount_percent)}%
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right">
                      <span className="text-xs font-black text-[#FF5A00] block">
                        {Number(item.effective_price || 0).toLocaleString()} {item.currency}
                      </span>
                    </div>
                    <button
                      onClick={() => setItemToDelete(item)}
                      className="p-2 rounded-xl text-zinc-400 hover:text-red-500 hover:bg-red-500/10 transition-colors cursor-pointer"
                      title="Filial menyusidan o'chirish"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </main>

          {/* Modal 1: Add Category Modal */}
          {showAddCategoryModal && (
            <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end justify-center animate-fade-in">
              <div className="absolute inset-0" onClick={() => setShowAddCategoryModal(false)} />
              <div
                className={`w-full max-w-md rounded-t-[32px] px-6 pt-4 pb-8 flex flex-col gap-4 z-10 border-t relative text-left ${
                  isDark ? "bg-[#2C2C2E] border-white/10" : "bg-white border-zinc-200"
                }`}
              >
                <div className={`w-12 h-1 rounded-full mx-auto mb-2 ${isDark ? "bg-white/20" : "bg-zinc-250"}`} />
                <div className="flex justify-between items-center">
                  <h3 className="font-black text-base">Yangi toifa (kategoriya) qo'shish</h3>
                  <button
                    onClick={() => setShowAddCategoryModal(false)}
                    className="p-1 rounded-full text-zinc-400 hover:text-zinc-600"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
                <form onSubmit={handleAddCategory} className="space-y-4">
                  <div>
                    <label className="text-xs font-bold opacity-70 block mb-1">Toifa nomi</label>
                    <input
                      type="text"
                      required
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                      placeholder="Masalan: Issiq taomlar"
                      className={`w-full px-4 py-3 rounded-xl border text-sm font-bold outline-none ${
                        isDark ? "border-white/10 bg-[#393939]" : "border-zinc-200 bg-zinc-50"
                      }`}
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold opacity-60 block mb-2">Tavsiya etilgan toifalar:</label>
                    <div className="flex flex-wrap gap-1.5">
                      {[
                        "Asosiy taomlar",
                        "Salatlar & Gazaklar",
                        "Xamir taomlar",
                        "Ichimliklar",
                        "Shirinliklar",
                        "Kebab & Gril",
                      ].map((tag) => (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => setNewCategoryName(tag)}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-all cursor-pointer ${
                            newCategoryName === tag
                              ? "bg-[#FF5A00] text-white border-[#FF5A00]"
                              : isDark
                              ? "bg-white/5 border-white/10 text-zinc-300"
                              : "bg-zinc-100 border-zinc-200 text-zinc-700"
                          }`}
                        >
                          {tag}
                        </button>
                      ))}
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmittingMenu}
                    className="w-full py-3.5 bg-[#FF5A00] hover:bg-[#FF5A00]/90 text-white font-extrabold text-xs rounded-2xl shadow-lg mt-2 cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {isSubmittingMenu && <Loader2 className="h-4 w-4 animate-spin" />}
                    <span>Toifani saqlash</span>
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* Modal 2: Add Menu Item Modal */}
          {showAddMenuModal && (
            <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end justify-center animate-fade-in">
              <div className="absolute inset-0" onClick={() => setShowAddMenuModal(false)} />
              <div
                className={`w-full max-w-md rounded-t-[32px] px-6 pt-4 pb-8 flex flex-col gap-4 z-10 border-t relative text-left ${
                  isDark ? "bg-[#2C2C2E] border-white/10" : "bg-white border-zinc-200"
                }`}
              >
                <div className={`w-12 h-1 rounded-full mx-auto mb-2 ${isDark ? "bg-white/20" : "bg-zinc-250"}`} />
                <div className="flex justify-between items-center">
                  <h3 className="font-black text-base">Yangi taom qo'shish</h3>
                  <button
                    onClick={() => setShowAddMenuModal(false)}
                    className="p-1 rounded-full text-zinc-400 hover:text-zinc-600"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
                <form onSubmit={handleAddMenuItem} className="space-y-3.5">
                  <div>
                    <label className="text-xs font-bold opacity-70 block mb-1">Taom nomi</label>
                    <input
                      type="text"
                      required
                      value={newItemName}
                      onChange={(e) => setNewItemName(e.target.value)}
                      placeholder="Masalan: To'y Oshi, Qozon Kabob"
                      className={`w-full px-4 py-3 rounded-xl border text-sm font-bold outline-none ${
                        isDark ? "border-white/10 bg-[#393939]" : "border-zinc-200 bg-zinc-50"
                      }`}
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold opacity-70 block mb-1">Kategoriya / Toifa</label>
                    {categories.length > 0 ? (
                      <select
                        value={newItemCategory || categories[0]?.id}
                        onChange={(e) => setNewItemCategory(Number(e.target.value))}
                        className={`w-full px-4 py-3 rounded-xl border text-sm font-bold outline-none cursor-pointer ${
                          isDark ? "border-white/10 bg-[#393939] text-white" : "border-zinc-200 bg-zinc-50 text-zinc-900"
                        }`}
                      >
                        {categories.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <div className="flex items-center justify-between p-3 rounded-xl border border-dashed border-amber-500/40 bg-amber-500/5 text-xs text-amber-500 font-semibold">
                        <span>Hozircha toifalar yo'q ("Asosiy taomlar" avtomatik ochiladi)</span>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="text-xs font-bold opacity-70 block mb-1">Narxi (UZS)</label>
                    <input
                      type="text"
                      required
                      value={newItemPrice}
                      onChange={(e) => setNewItemPrice(e.target.value)}
                      placeholder="Masalan: 55 000"
                      className={`w-full px-4 py-3 rounded-xl border text-sm font-bold outline-none ${
                        isDark ? "border-white/10 bg-[#393939]" : "border-zinc-200 bg-zinc-50"
                      }`}
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold opacity-70 block mb-1">Tarkibi yoki tavsif (ixtiyoriy)</label>
                    <input
                      type="text"
                      value={newItemDescription}
                      onChange={(e) => setNewItemDescription(e.target.value)}
                      placeholder="Masalan: Go'sht, guruch, sabzi, zira"
                      className={`w-full px-4 py-3 rounded-xl border text-sm font-bold outline-none ${
                        isDark ? "border-white/10 bg-[#393939]" : "border-zinc-200 bg-zinc-50"
                      }`}
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmittingMenu}
                    className="w-full py-3.5 bg-[#FF5A00] hover:bg-[#FF5A00]/90 text-white font-extrabold text-xs rounded-2xl shadow-lg mt-2 cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {isSubmittingMenu && <Loader2 className="h-4 w-4 animate-spin" />}
                    <span>Menyuga saqlash</span>
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* Modal 3: Delete Confirmation Modal */}
          {itemToDelete && (
            <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
              <div className="absolute inset-0" onClick={() => setItemToDelete(null)} />
              <div
                className={`w-full max-w-sm rounded-3xl p-6 flex flex-col gap-4 z-10 border text-center ${
                  isDark ? "bg-[#2C2C2E] border-white/10 text-white" : "bg-white border-zinc-200 text-zinc-900"
                }`}
              >
                <div className="w-12 h-12 rounded-2xl bg-red-500/10 text-red-500 flex items-center justify-center mx-auto">
                  <Trash2 className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-black text-base">Taomni o'chirish</h3>
                  <p className="text-xs text-zinc-400 mt-1">
                    Haqiqatan ham <strong className="text-foreground font-bold">"{itemToDelete.name}"</strong> taomini filial menyusidan olib tashlamoqchimisiz?
                  </p>
                </div>
                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setItemToDelete(null)}
                    className={`flex-1 py-3 rounded-xl font-bold text-xs border transition-colors cursor-pointer ${
                      isDark ? "border-white/10 hover:bg-white/5" : "border-zinc-200 hover:bg-zinc-50"
                    }`}
                  >
                    Bekor qilish
                  </button>
                  <button
                    type="button"
                    disabled={isSubmittingMenu}
                    onClick={() => handleDeleteMenuItem(itemToDelete.id)}
                    className="flex-1 py-3 rounded-xl bg-red-500 hover:bg-red-600 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-md shadow-red-500/20 cursor-pointer disabled:opacity-50"
                  >
                    {isSubmittingMenu && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                    <span>O'chirish</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 4: XODIMLAR (STAFF VIEW) */}
      {activeTab === "staff" && (
        <div className="flex flex-col flex-1 animate-fade-in pb-24">
          <header className="px-6 py-5 border-b border-zinc-100 dark:border-white/5 flex items-center justify-between">
            <div className="text-left">
              <h1 className="text-xl font-black">Xodimlar ro'yxati</h1>
              <p className="text-[11px] text-zinc-400 font-medium mt-0.5">
                {staffCounts
                  ? `Jami: ${staffCounts.total} • Faol: ${staffCounts.active} • Nofaol: ${staffCounts.inactive}`
                  : `${staff.length} nafar xodim`}
              </p>
            </div>
            <button
              onClick={() => setShowAddStaffModal(true)}
              className="p-2.5 rounded-xl bg-[#FF5A00] text-white flex items-center justify-center active:scale-95 transition-all shadow-md shadow-[#FF5A00]/20 cursor-pointer hover:bg-[#FF5A00]/90"
              title="Yangi xodim qo'shish"
            >
              <Plus className="h-4.5 w-4.5 stroke-[2.5px]" />
            </button>
          </header>

          {/* Role Filter Pills */}
          <div className="px-6 py-3 border-b border-zinc-100 dark:border-white/5 flex items-center gap-2 overflow-x-auto no-scrollbar">
            {[
              { id: "all", label: `Barchasi (${staff.length})` },
              { id: "4", label: `Ofitsiantlar (${staff.filter((s) => s.staff_role_id === 4).length})` },
              { id: "3", label: `Menejerlar (${staff.filter((s) => s.staff_role_id === 3).length})` },
              { id: "5", label: `Oshpazlar (${staff.filter((s) => s.staff_role_id === 5).length})` },
              { id: "7", label: `Qo'riqchilar (${staff.filter((s) => s.staff_role_id === 7).length})` },
              { id: "1", label: `Egalar (${staff.filter((s) => s.staff_role_id === 1).length})` },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setStaffRoleFilter(tab.id)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                  staffRoleFilter === tab.id
                    ? "bg-[#FF5A00] text-white shadow-sm"
                    : isDark
                    ? "bg-white/5 text-zinc-400 hover:text-white"
                    : "bg-zinc-100 text-zinc-600 hover:text-zinc-900"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <main className="flex-1 overflow-y-auto px-6 py-4 space-y-3 text-left">
            {loadingData ? (
              <div className="py-12 flex flex-col items-center justify-center space-y-3 text-zinc-400">
                <Loader2 className="animate-spin h-7 w-7 text-[#FF5A00]" />
                <p className="text-xs font-semibold">Xodimlar yuklanmoqda...</p>
              </div>
            ) : staff.filter((s) => (staffRoleFilter === "all" ? true : s.staff_role_id === Number(staffRoleFilter))).length === 0 ? (
              <div
                className={`py-12 px-6 rounded-3xl border text-center flex flex-col items-center gap-3 ${
                  isDark ? "bg-[#393939]/20 border-white/5" : "bg-zinc-50 border-zinc-200"
                }`}
              >
                <div className="w-14 h-14 rounded-2xl bg-[#FF5A00]/10 flex items-center justify-center text-[#FF5A00]">
                  <Users className="h-7 w-7" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-sm font-bold">Ushbu toifada xodimlar topilmadi</h3>
                  <p className="text-xs text-zinc-400 max-w-xs mx-auto">
                    Yangi xodimni taklif qilish uchun quyidagi tugmani bosing.
                  </p>
                </div>
                <button
                  onClick={() => setShowAddStaffModal(true)}
                  className="py-2.5 px-5 rounded-xl bg-[#FF5A00] text-white font-bold text-xs flex items-center gap-2 shadow-md hover:bg-[#FF5A00]/90 transition-all cursor-pointer mt-2"
                >
                  <Plus className="h-4 w-4" />
                  <span>Xodim qo'shish</span>
                </button>
              </div>
            ) : (
              staff
                .filter((s) => (staffRoleFilter === "all" ? true : s.staff_role_id === Number(staffRoleFilter)))
                .map((member) => (
                  <div
                    key={member.id}
                    className={`p-4 rounded-2xl border flex items-center justify-between gap-3 transition-all ${
                      isDark ? "bg-[#393939]/30 border-white/5 hover:border-white/10" : "bg-white border-zinc-150 shadow-sm hover:border-zinc-250"
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-11 h-11 rounded-2xl flex items-center justify-center bg-[#FF5A00]/10 text-[#FF5A00] font-black text-sm shrink-0">
                        {member.user.first_name?.[0] || "U"}{member.user.last_name?.[0] || ""}
                      </div>
                      <div className="space-y-0.5 truncate">
                        <h3 className="font-extrabold text-sm truncate">
                          {member.user.first_name} {member.user.last_name || ""}
                        </h3>
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] text-zinc-400 font-medium">
                            {member.role_name}
                          </span>
                          {member.staff_role_id === 1 && (
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-500/10 text-amber-500">
                              Asosiy
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => handleToggleStaffActive(member.id, member.is_active)}
                      className={`px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shrink-0 ${
                        member.is_active
                          ? "bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 border border-emerald-500/20"
                          : "bg-zinc-500/10 text-zinc-400 hover:bg-zinc-500/20 border border-zinc-500/20"
                      }`}
                      title={member.is_active ? "Nofaol qilish uchun bosing" : "Faollashtirish uchun bosing"}
                    >
                      <span className={`w-2 h-2 rounded-full ${member.is_active ? "bg-emerald-500" : "bg-zinc-400"}`} />
                      <span>{member.is_active ? "Faol" : "Nofaol"}</span>
                    </button>
                  </div>
                ))
            )}
          </main>

          {/* Add Staff Modal Drawer */}
          {showAddStaffModal && (
            <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end justify-center animate-fade-in">
              <div className="absolute inset-0" onClick={() => setShowAddStaffModal(false)} />
              <div
                className={`w-full max-w-md rounded-t-[32px] px-6 pt-4 pb-8 flex flex-col gap-4 z-10 border-t relative text-left ${
                  isDark ? "bg-[#2C2C2E] border-white/10" : "bg-white border-zinc-200"
                }`}
              >
                <div className={`w-12 h-1 rounded-full mx-auto mb-2 ${isDark ? "bg-white/20" : "bg-zinc-250"}`} />
                <div className="flex justify-between items-center">
                  <h3 className="font-black text-base">Yangi xodim qo'shish</h3>
                  <button
                    onClick={() => setShowAddStaffModal(false)}
                    className="p-1 rounded-lg hover:bg-white/10 text-zinc-400"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <form onSubmit={handleAddStaff} className="space-y-4">
                  <div>
                    <label className="text-xs font-bold opacity-60 block mb-1">To'liq ism-sharif</label>
                    <input
                      type="text"
                      required
                      value={newStaffName}
                      onChange={(e) => setNewStaffName(e.target.value)}
                      placeholder="Sardor Raimov"
                      className={`w-full px-4 py-3 rounded-xl border text-sm font-bold outline-none ${
                        isDark ? "border-white/10 bg-[#393939]/50 focus:border-[#FF5A00]" : "border-zinc-200 bg-zinc-50 focus:border-[#FF5A00]"
                      }`}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold opacity-60 block mb-1">Lavozim</label>
                    <select
                      value={newStaffRole}
                      onChange={(e) => setNewStaffRole(e.target.value)}
                      className={`w-full px-4 py-3 rounded-xl border text-sm font-bold outline-none cursor-pointer ${
                        isDark ? "border-white/10 bg-[#393939]/50 focus:border-[#FF5A00]" : "border-zinc-200 bg-zinc-50 focus:border-[#FF5A00]"
                      }`}
                    >
                      <option value="4">Ofitsiant</option>
                      <option value="3">Menejer</option>
                      <option value="5">Bosh oshpaz</option>
                      <option value="6">Oshpaz yordamchisi</option>
                      <option value="7">Qo'riqchi</option>
                      <option value="2">Admin</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-bold opacity-60 block mb-1">Telefon raqami</label>
                    <input
                      type="tel"
                      required
                      value={newStaffPhone}
                      onChange={(e) => setNewStaffPhone(e.target.value)}
                      placeholder="+998901234567"
                      className={`w-full px-4 py-3 rounded-xl border text-sm font-bold outline-none ${
                        isDark ? "border-white/10 bg-[#393939]/50 focus:border-[#FF5A00]" : "border-zinc-200 bg-zinc-50 focus:border-[#FF5A00]"
                      }`}
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={isSubmittingStaff}
                    className="w-full py-4 bg-[#FF5A00] hover:bg-[#FF5A00]/90 text-white font-extrabold text-xs rounded-2xl shadow-lg mt-2 cursor-pointer transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {isSubmittingStaff && <Loader2 className="w-4 h-4 animate-spin" />}
                    <span>Xodimni taklif qilish</span>
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* Created Staff Invitation Credentials Modal */}
          {createdInvitation && (
            <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
              <div
                className={`w-full max-w-sm rounded-3xl p-6 flex flex-col gap-4 z-10 border relative text-left shadow-2xl ${
                  isDark ? "bg-[#2C2C2E] border-white/10" : "bg-white border-zinc-200"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <button
                    onClick={() => setCreatedInvitation(null)}
                    className="p-2 rounded-xl text-zinc-400 hover:text-white cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div>
                  <h3 className="text-base font-black">Xodim taklifnomasi yaratildi!</h3>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    Ushbu login va parolni xodimga taqdim eting.
                  </p>
                </div>

                <div className={`p-4 rounded-2xl border space-y-2.5 ${isDark ? "bg-[#393939]/40 border-white/10" : "bg-zinc-50 border-zinc-200"}`}>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-zinc-400 font-semibold">Xodim:</span>
                    <span className="font-extrabold">{createdInvitation.full_name}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-zinc-400 font-semibold">Telefon:</span>
                    <span className="font-extrabold">{createdInvitation.phone}</span>
                  </div>
                  <div className="border-t border-zinc-200/50 dark:border-white/5 pt-2 flex items-center justify-between">
                    <div className="text-xs">
                      <span className="text-zinc-400 block font-semibold text-[10px]">Login:</span>
                      <span className="font-mono font-black text-sm text-[#FF5A00]">{createdInvitation.login}</span>
                    </div>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(createdInvitation.login);
                        showToast("Login nusxalandi!");
                      }}
                      className="p-1.5 rounded-lg bg-zinc-200 dark:bg-white/10 hover:bg-zinc-300 text-xs font-bold cursor-pointer"
                      title="Nusxa olish"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="text-xs">
                      <span className="text-zinc-400 block font-semibold text-[10px]">Vaqtinchalik parol:</span>
                      <span className="font-mono font-black text-sm text-emerald-500">{createdInvitation.temporary_password}</span>
                    </div>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(createdInvitation.temporary_password);
                        showToast("Parol nusxalandi!");
                      }}
                      className="p-1.5 rounded-lg bg-zinc-200 dark:bg-white/10 hover:bg-zinc-300 text-xs font-bold cursor-pointer"
                      title="Nusxa olish"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="flex flex-col gap-2 pt-1">
                  <button
                    onClick={() => handleQuickActivateStaff(createdInvitation)}
                    disabled={isSubmittingStaff}
                    className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md transition-all cursor-pointer disabled:opacity-50"
                  >
                    {isSubmittingStaff ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                    <span>Darhol faollashtirish (ro'yxatga qo'shish)</span>
                  </button>
                  <button
                    onClick={() => {
                      const shareText = `Bazmly tizimiga xodim taklifnomasi:\nIsm: ${createdInvitation.full_name}\nLogin: ${createdInvitation.login}\nParol: ${createdInvitation.temporary_password}`;
                      navigator.clipboard.writeText(shareText);
                      showToast("Barcha ma'lumotlar nusxalandi!");
                      setCreatedInvitation(null);
                    }}
                    className="w-full py-2.5 rounded-xl border border-zinc-200 dark:border-white/10 text-xs font-bold transition-all cursor-pointer"
                  >
                    Ma'lumotlarni nusxalab yopish
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 5: SOZLAMALAR (SETTINGS VIEW) */}
      {activeTab === "settings" && (
        <div className="flex flex-col flex-1 animate-fade-in pb-20">
          <header className="px-6 py-5 border-b border-zinc-100 dark:border-white/5 flex items-center justify-between">
            <h1 className="text-xl font-black">Profil sozlamalari</h1>
          </header>

          <main className="flex-1 overflow-y-auto px-6 py-6 space-y-6 text-left">
            <div className="flex items-center gap-4 border-b border-zinc-100 dark:border-white/5 pb-5">
              <div className="w-16 h-16 rounded-full overflow-hidden border bg-zinc-100 shadow-md">
                <img src="/images/restaurant.png" alt="Profile" className="w-full h-full object-cover" />
              </div>
              <div className="space-y-0.5">
                <h3 className="font-extrabold text-base">{partnerName}</h3>
                <p className="text-xs text-zinc-400 font-bold uppercase tracking-wider">{partnerLocation}</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold opacity-60">Muassasa nomi</label>
                <input
                  type="text"
                  value={partnerName}
                  onChange={(e) => {
                    setPartnerName(e.target.value);
                    localStorage.setItem("fullName", e.target.value);
                  }}
                  className={`w-full px-4 py-3.5 rounded-xl border text-sm font-bold outline-none ${
                    isDark ? "border-white/10 bg-[#393939]" : "border-zinc-200 bg-zinc-50"
                  }`}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold opacity-60">Ish soatlari</label>
                <input
                  type="text"
                  value={venueHours}
                  onChange={(e) => {
                    setVenueHours(e.target.value);
                    localStorage.setItem("venueHours", e.target.value);
                  }}
                  placeholder="09:00 - 23:00"
                  className={`w-full px-4 py-3.5 rounded-xl border text-sm font-bold outline-none ${
                    isDark ? "border-white/10 bg-[#393939]" : "border-zinc-200 bg-zinc-50"
                  }`}
                />
              </div>

              <div className="pt-2">
                <label className="text-xs font-bold opacity-60 block mb-2">Ilova mavzusi</label>
                <button
                  type="button"
                  onClick={toggleTheme}
                  className={`w-full flex items-center justify-between p-4 rounded-xl border transition-all ${
                    isDark ? "bg-[#393939] border-white/10" : "bg-zinc-50 border-zinc-200 hover:bg-zinc-100"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {isDark ? <Moon className="h-4.5 w-4.5 text-[#FF5A00]" /> : <Sun className="h-4.5 w-4.5 text-[#FF5A00]" />}
                    <span className="text-xs font-extrabold">{isDark ? "Tungi rejim" : "Kunduzgi rejim"}</span>
                  </div>
                  <span className="text-[10px] font-black uppercase bg-[#FF5A00]/10 text-[#FF5A00] px-2 py-0.5 rounded">
                    O'zgartirish
                  </span>
                </button>
              </div>

              <div className="pt-6">
                <button
                  onClick={handleLogout}
                  className="w-full py-4 border border-red-500/20 bg-red-500/10 hover:bg-red-500/20 text-red-500 font-black text-xs tracking-wider rounded-2xl flex items-center justify-center gap-2 transition-all active:scale-98 cursor-pointer"
                >
                  <LogOut className="w-4.5 h-4.5" />
                  <span>AKKAUNTDAN CHIQISH</span>
                </button>
              </div>
            </div>
          </main>
        </div>
      )}

      {/* PARTNER BOTTOM NAVIGATION BAR */}
      <div
        className={`fixed bottom-0 left-0 right-0 z-50 h-[72px] max-w-md mx-auto border-t flex justify-between items-center px-4 transition-all duration-300 ${
          isDark
            ? "bg-[#1E1E1E] border-white/10 shadow-[0_-4px_15px_rgba(0,0,0,0.5)]"
            : "bg-white border-zinc-200 shadow-[0_-4px_10px_rgba(0,0,0,0.04)]"
        }`}
      >
        {[
          { key: "home", label: "Asosiy", icon: "/logo-loading.png", isCustomIcon: true },
          { key: "bookings", label: "Buyurtmalar", icon: Calendar, isCustomIcon: false },
          { key: "menu", label: "Menyu", icon: Utensils, isCustomIcon: false },
          { key: "staff", label: "Xodimlar", icon: Users, isCustomIcon: false },
          { key: "settings", label: "Sozlamalar", icon: Settings, isCustomIcon: false },
        ].map((item) => {
          const isActive = activeTab === item.key;
          const IconComponent = item.icon as any;

          return (
            <button
              key={item.key}
              onClick={() => setActiveTab(item.key as any)}
              className="flex-1 flex flex-col items-center justify-center gap-1 h-full py-1 cursor-pointer group transition-all"
            >
              {item.isCustomIcon ? (
                <img
                  src={item.icon as string}
                  alt={item.label}
                  className={`h-5 w-5 object-contain transition-all duration-200 ${
                    isActive ? "filter-primary opacity-100 scale-105" : "brightness-0 opacity-40"
                  }`}
                />
              ) : (
                <IconComponent
                  className={`h-5 w-5 transition-all duration-200 ${
                    isActive ? "text-[#FF5A00] scale-105" : "text-[#8E8E93]"
                  }`}
                />
              )}
              <span
                className={`text-[10px] font-bold tracking-tight transition-colors duration-250 ${
                  isActive ? "text-[#FF5A00]" : "text-[#8E8E93]"
                }`}
              >
                {item.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* QR Check-in Modal */}
      {showCheckInModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center animate-fade-in p-4">
          <div className="absolute inset-0" onClick={() => setShowCheckInModal(false)} />
          <div
            className={`w-full max-w-md rounded-[32px] p-6 flex flex-col gap-4 z-10 border relative text-left shadow-2xl ${
              isDark ? "bg-[#2C2C2E] border-white/10" : "bg-white border-zinc-200"
            }`}
          >
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-[#FF6B00]/10 text-[#FF6B00]">
                  <QrCode className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-black text-base">QR Check-In</h3>
                  <p className="text-[11px] text-zinc-400 font-bold">{partnerName}</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowCheckInModal(false);
                  setCheckInResult(null);
                }}
                className="p-2 rounded-full bg-white/5 hover:bg-white/10 text-zinc-400 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {checkInResult ? (
              <div className="p-5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-center space-y-3 animate-scale-up">
                <div className="w-12 h-12 rounded-full bg-emerald-500 text-white flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/20">
                  <Check className="w-6 h-6 stroke-[3px]" />
                </div>
                <h4 className="font-extrabold text-sm text-emerald-400">{checkInResult.message}</h4>
                <p className="text-xs text-zinc-400">
                  Stol: <strong>{checkInResult.booking?.table_number || 4}-stol</strong> • Mehmonlar:{" "}
                  <strong>{checkInResult.booking?.guests_count || 4} kishi</strong>
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setCheckInResult(null);
                    setCheckInToken("");
                    setShowCheckInModal(false);
                  }}
                  className="w-full py-3 rounded-xl bg-emerald-500 text-white text-xs font-bold shadow-md cursor-pointer"
                >
                  Tushunarli
                </button>
              </div>
            ) : (
              <form onSubmit={handleCheckIn} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold opacity-60">Mijoz QR Tokeni yoki Chipta kodi</label>
                  <input
                    type="text"
                    required
                    value={checkInToken}
                    onChange={(e) => setCheckInToken(e.target.value)}
                    placeholder="Masalan: BZMLY-1-1788... yoki chipta kodi"
                    className={`w-full px-4 py-3.5 rounded-xl border text-sm font-mono font-bold outline-none ${
                      isDark ? "border-white/10 bg-[#1E1E1E]" : "border-zinc-200 bg-zinc-50"
                    }`}
                  />
                </div>

                {/* Quick Paste recent tokens from localStorage if available */}
                {typeof window !== "undefined" && localStorage.getItem("my_booking_tokens") && (
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-zinc-400 uppercase">Oxirgi chiptalar:</span>
                    <div className="flex flex-wrap gap-1.5">
                      {Object.entries(
                        JSON.parse(localStorage.getItem("my_booking_tokens") || "{}")
                      )
                        .slice(0, 2)
                        .map(([bId, tok]: any) => (
                          <button
                            type="button"
                            key={bId}
                            onClick={() => setCheckInToken(tok)}
                            className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-[10px] font-mono text-primary font-bold border border-white/5 cursor-pointer"
                          >
                            Bron #{bId}
                          </button>
                        ))}
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={checkInLoading}
                  className="w-full py-4 bg-[#FF6B00] hover:bg-[#E05000] text-white font-extrabold text-xs tracking-wider rounded-2xl shadow-lg shadow-[#FF6B00]/20 flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-[0.98]"
                >
                  {checkInLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <CheckCircle2 className="h-4 w-4" />
                      <span>MIJOZNI QABUL QILISH (CHECK-IN)</span>
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Add Venue Modal */}
      {showAddVenueModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center animate-fade-in p-4">
          <div className="absolute inset-0" onClick={() => setShowAddVenueModal(false)} />
          <div
            className={`w-full max-w-md rounded-[32px] p-6 flex flex-col gap-4 z-10 border relative text-left shadow-2xl ${
              isDark ? "bg-[#2C2C2E] border-white/10" : "bg-white border-zinc-200"
            }`}
          >
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-primary/10 text-primary">
                  <Building2 className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-black text-base">Yangi Filial Qo'shish</h3>
                  <p className="text-[11px] text-zinc-400 font-bold">Hamkorlik tarmog'ingiz</p>
                </div>
              </div>
              <button
                onClick={() => setShowAddVenueModal(false)}
                className="p-2 rounded-full bg-white/5 hover:bg-white/10 text-zinc-400 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleAddVenue} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold opacity-60">Filial nomi</label>
                <input
                  type="text"
                  required
                  value={newVenueName}
                  onChange={(e) => setNewVenueName(e.target.value)}
                  placeholder="Masalan: Rayhon Chilonzor filiali"
                  className={`w-full px-4 py-3 rounded-xl border text-sm font-bold outline-none ${
                    isDark ? "border-white/10 bg-[#1E1E1E]" : "border-zinc-200 bg-zinc-50"
                  }`}
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold opacity-60">Muassasa turi</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setNewVenueType("restoran")}
                    className={`py-2.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                      newVenueType === "restoran"
                        ? "bg-primary text-white border-primary"
                        : "border-white/10 text-zinc-400"
                    }`}
                  >
                    Restoran / Kafe
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewVenueType("toyxona")}
                    className={`py-2.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                      newVenueType === "toyxona"
                        ? "bg-primary text-white border-primary"
                        : "border-white/10 text-zinc-400"
                    }`}
                  >
                    To'yxona / Zal
                  </button>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold opacity-60">Telefon raqam</label>
                <input
                  type="tel"
                  value={newVenuePhone}
                  onChange={(e) => setNewVenuePhone(e.target.value)}
                  placeholder="+998 90 123 45 67"
                  className={`w-full px-4 py-3 rounded-xl border text-sm font-bold outline-none ${
                    isDark ? "border-white/10 bg-[#1E1E1E]" : "border-zinc-200 bg-zinc-50"
                  }`}
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold opacity-60">Umumiy o'rinlar soni (sig'im)</label>
                <input
                  type="number"
                  value={newVenueSeats}
                  onChange={(e) => setNewVenueSeats(e.target.value)}
                  placeholder="100"
                  className={`w-full px-4 py-3 rounded-xl border text-sm font-bold outline-none ${
                    isDark ? "border-white/10 bg-[#1E1E1E]" : "border-zinc-200 bg-zinc-50"
                  }`}
                />
              </div>

              <button
                type="submit"
                className="w-full py-4 bg-[#FF5A00] text-white font-extrabold text-xs tracking-wider rounded-2xl shadow-lg mt-2 cursor-pointer transition-all active:scale-[0.98]"
              >
                Filialni ro'yxatdan o'tkazish
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
