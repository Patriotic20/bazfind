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
  geoService,
  BazmlyApiError,
  VenueRead,
  VenueDetailRead,
  VenueGroupRead,
  StaffRoleRead,
  RegionRead,
  DistrictRead,
  BookingRead,
  BookingListItem,
  VenueStaffListItem,
  MenuItemListItem,
  MenuCategoryRead,
  DashboardRead,
  TableBoardRow,
  StaffCountsRead,
  StaffInvitationCreated,
} from "@/lib/api";
import { formatAddress, formatDate, formatMoney, formatTime, toApiDate } from "@/lib/format";
import { upcomingDates } from "@/lib/venue-hours";

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

/** The server's own sentence when it gave one, otherwise ours. */
function errorMessage(err: unknown, fallback: string): string {
  return err instanceof BazmlyApiError ? err.message : fallback;
}

const TABLE_SIZES = [2, 4, 6, 8, 10];

export default function AdminPage() {
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();
  const { isAuthenticated, loading: authLoading, logout } = useAuth();
  const isDark = theme === "dark";

  // Who this panel belongs to. "no-group" is an account with no chain yet —
  // it is offered to create one, never given one silently.
  const [sessionState, setSessionState] = useState<"loading" | "no-group" | "ready" | "error">("loading");
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [group, setGroup] = useState<VenueGroupRead | null>(null);
  const [venuesList, setVenuesList] = useState<VenueRead[]>([]);
  const [activeVenueId, setActiveVenueId] = useState<number | null>(null);
  const [venueDetail, setVenueDetail] = useState<VenueDetailRead | null>(null);
  const [showVenueDropdown, setShowVenueDropdown] = useState(false);
  const activeVenue = venuesList.find((v) => v.id === activeVenueId) ?? null;
  const partnerName = activeVenue?.name ?? group?.name ?? "";
  const partnerLocation = formatAddress(activeVenue?.street, activeVenue?.house_number) ?? "";
  const todayHours = venueDetail?.working_hours.find((h) => h.weekday === (new Date().getDay() + 6) % 7);
  const venueHours =
    !todayHours || !venueDetail
      ? "Belgilanmagan"
      : todayHours.is_closed || !todayHours.opens_at || !todayHours.closes_at
        ? "Bugun dam olish"
        : `${formatTime(todayHours.opens_at)} - ${formatTime(todayHours.closes_at)}`;

  // API data
  const [analytics, setAnalytics] = useState<DashboardRead | null>(null);
  const [bookings, setBookings] = useState<BookingListItem[]>([]);
  const [bookingsDay, setBookingsDay] = useState(() => toApiDate(new Date()));
  const [tableBoard, setTableBoard] = useState<TableBoardRow[]>([]);
  const [bookingsSubTab, setBookingsSubTab] = useState<"list" | "table-board">("list");
  const [staff, setStaff] = useState<VenueStaffListItem[]>([]);
  const [roles, setRoles] = useState<StaffRoleRead[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItemListItem[]>([]);
  const [allMenuItems, setAllMenuItems] = useState<MenuItemListItem[]>([]);
  const [totalMenuCount, setTotalMenuCount] = useState<number>(0);
  const [categories, setCategories] = useState<MenuCategoryRead[]>([]);
  const [loadingData, setLoadingData] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<"home" | "bookings" | "menu" | "staff" | "settings">("home");
  const [toastMessage, setToastMessage] = useState("");

  // QR check-in
  const [showCheckInModal, setShowCheckInModal] = useState(false);
  const [checkInToken, setCheckInToken] = useState("");
  const [checkInLoading, setCheckInLoading] = useState(false);
  const [checkInError, setCheckInError] = useState<string | null>(null);
  const [checkInResult, setCheckInResult] = useState<{ message: string; booking: BookingRead & { table_number?: number | null } } | null>(null);

  // Add venue
  const [showAddVenueModal, setShowAddVenueModal] = useState(false);
  const [newVenueName, setNewVenueName] = useState("");
  const [newVenueType, setNewVenueType] = useState<"restoran" | "toyxona">("restoran");
  const [newVenuePhone, setNewVenuePhone] = useState("");
  const [newVenueSeats, setNewVenueSeats] = useState("");
  const [newVenueStreet, setNewVenueStreet] = useState("");
  const [newVenueHouse, setNewVenueHouse] = useState("");
  const [regions, setRegions] = useState<RegionRead[]>([]);
  const [newVenueRegionId, setNewVenueRegionId] = useState<number | null>(null);
  const [districts, setDistricts] = useState<DistrictRead[]>([]);
  const [newVenueDistrictId, setNewVenueDistrictId] = useState<number | null>(null);
  const [isSubmittingVenue, setIsSubmittingVenue] = useState(false);

  // Staff
  const [showAddStaffModal, setShowAddStaffModal] = useState(false);
  const [newStaffName, setNewStaffName] = useState("");
  const [newStaffRole, setNewStaffRole] = useState("");
  const [newStaffPhone, setNewStaffPhone] = useState("");
  const [staffCounts, setStaffCounts] = useState<StaffCountsRead | null>(null);
  const [createdInvitation, setCreatedInvitation] = useState<StaffInvitationCreated | null>(null);
  const [isSubmittingStaff, setIsSubmittingStaff] = useState(false);
  const [staffRoleFilter, setStaffRoleFilter] = useState<string | "all">("all");

  // Menu
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

  // Tables
  const [tableCounts, setTableCounts] = useState<Record<number, string>>({});
  const [isCreatingTables, setIsCreatingTables] = useState(false);

  // Settings
  const [settingsName, setSettingsName] = useState("");
  const [settingsOpens, setSettingsOpens] = useState("");
  const [settingsCloses, setSettingsCloses] = useState("");
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(""), 3500);
  };

  // --- session -----------------------------------------------------------

  const loadSession = useCallback(async () => {
    setSessionState("loading");
    setSessionError(null);
    try {
      const myGroup = await partnerService.getMyGroup();
      const branches = await partnerService.listVenues(myGroup.id);
      setGroup(myGroup);
      setVenuesList(branches);
      setActiveVenueId((current) => (current && branches.some((b) => b.id === current) ? current : (branches[0]?.id ?? null)));
      setSessionState("ready");
      partnerService
        .listStaffRoles()
        .then(setRoles)
        .catch(() => setRoles([]));
    } catch (err) {
      if (err instanceof BazmlyApiError && err.status === 404) {
        setSessionState("no-group");
      } else {
        setSessionError(errorMessage(err, "Hamkor ma'lumotlarini yuklab bo'lmadi"));
        setSessionState("error");
      }
    }
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) {
      router.replace("/login");
      return;
    }
    loadSession();
  }, [authLoading, isAuthenticated, loadSession, router]);

  // The selected branch's hours and status, for the header and settings.
  useEffect(() => {
    if (!activeVenueId) {
      setVenueDetail(null);
      return;
    }
    venueService
      .getVenueDetail(activeVenueId)
      .then((detail) => {
        setVenueDetail(detail);
        setSettingsName(detail.venue.name);
        const sample = detail.working_hours.find((h) => !h.is_closed && h.opens_at && h.closes_at);
        setSettingsOpens(sample?.opens_at ? formatTime(sample.opens_at) : "");
        setSettingsCloses(sample?.closes_at ? formatTime(sample.closes_at) : "");
      })
      .catch(() => setVenueDetail(null));
  }, [activeVenueId]);

  // --- per-tab data --------------------------------------------------------

  const loadVenueData = useCallback(async () => {
    if (!activeVenueId || !group) return;
    setLoadingData(true);
    setLoadError(null);
    try {
      if (activeTab === "home") {
        const [ana, items, staffList] = await Promise.all([
          partnerService.getDashboardAnalytics(group.id, activeVenueId),
          partnerService.listMenuItems(activeVenueId),
          partnerService.listStaff(group.id),
        ]);
        setAnalytics(ana);
        setMenuItems(items);
        setAllMenuItems(items);
        setTotalMenuCount(items.length);
        setStaff(staffList);
      } else if (activeTab === "bookings") {
        const [bookList, board] = await Promise.all([
          orderService.getVenueBookings(activeVenueId, bookingsDay),
          orderService.getTableBoard(activeVenueId),
        ]);
        setBookings(bookList);
        setTableBoard(board);
      } else if (activeTab === "staff") {
        const [staffList, counts] = await Promise.all([
          partnerService.listStaff(group.id),
          partnerService.getStaffCounts(group.id),
        ]);
        setStaff(staffList);
        setStaffCounts(counts);
      } else if (activeTab === "menu") {
        const [cats, venueItems] = await Promise.all([
          partnerService.listCategories(group.id, activeVenueId),
          partnerService.listMenuItems(activeVenueId),
        ]);
        setCategories(cats);
        setAllMenuItems(venueItems);
        setTotalMenuCount(venueItems.length);
        setMenuItems(
          selectedMenuCategory === "all"
            ? venueItems
            : venueItems.filter((item) => item.menu_category_id === selectedMenuCategory),
        );
      }
    } catch (err) {
      setLoadError(errorMessage(err, "Ma'lumotlarni yuklab bo'lmadi"));
    } finally {
      setLoadingData(false);
    }
  }, [activeVenueId, activeTab, group, selectedMenuCategory, bookingsDay]);

  useEffect(() => {
    loadVenueData();
  }, [loadVenueData]);

  // --- actions -------------------------------------------------------------

  const handleLogout = async () => {
    await logout();
    router.push("/login");
  };

  const handleBookingAction = async (bookingId: number | string, action: "confirmed" | "rejected") => {
    if (!activeVenueId) return;
    try {
      if (action === "confirmed") {
        await orderService.confirmBooking(bookingId, activeVenueId);
        showToast("Bron tasdiqlandi");
      } else {
        await orderService.rejectBooking(bookingId, undefined, activeVenueId);
        showToast("Bron rad etildi");
      }
      loadVenueData();
    } catch (err) {
      showToast(errorMessage(err, "Amalni bajarib bo'lmadi"));
    }
  };

  const handleCheckIn = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!checkInToken.trim() || !activeVenueId) return;
    setCheckInLoading(true);
    setCheckInError(null);
    try {
      const booking = await orderService.checkInBooking({ qr_token: checkInToken.trim(), venue_id: activeVenueId });
      setCheckInResult({ message: "Mijoz qabul qilindi", booking });
      loadVenueData();
    } catch (err) {
      setCheckInError(errorMessage(err, "Chipta qabul qilinmadi"));
    } finally {
      setCheckInLoading(false);
    }
  };

  const handleCheckOut = async (bookingId: number | string) => {
    if (!activeVenueId) return;
    try {
      await orderService.checkOutBooking(bookingId, activeVenueId);
      showToast("Tashrif yakunlandi");
      loadVenueData();
    } catch (err) {
      showToast(errorMessage(err, "Check-out bajarilmadi"));
    }
  };

  const handleCreateTables = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeVenueId) return;
    const counts = Object.fromEntries(
      Object.entries(tableCounts)
        .map(([seats, count]) => [seats, Number(count)] as const)
        .filter(([, count]) => count > 0),
    );
    if (Object.keys(counts).length === 0) {
      showToast("Kamida bitta stol sonini kiriting");
      return;
    }
    setIsCreatingTables(true);
    try {
      const created = await partnerService.createTablesBulk(activeVenueId, { counts });
      showToast(`${created.length} ta stol yaratildi`);
      setTableCounts({});
      loadVenueData();
    } catch (err) {
      showToast(errorMessage(err, "Stollarni yaratib bo'lmadi"));
    } finally {
      setIsCreatingTables(false);
    }
  };

  const openAddVenue = () => {
    setShowAddVenueModal(true);
    if (regions.length === 0) {
      geoService
        .getRegions()
        .then(setRegions)
        .catch((err) => showToast(errorMessage(err, "Viloyatlarni yuklab bo'lmadi")));
    }
  };

  const chooseRegion = async (regionId: number) => {
    setNewVenueRegionId(regionId);
    setNewVenueDistrictId(null);
    setDistricts([]);
    try {
      setDistricts(await geoService.getDistricts(regionId));
    } catch (err) {
      showToast(errorMessage(err, "Tumanlarni yuklab bo'lmadi"));
    }
  };

  const handleAddVenue = async (e: React.FormEvent) => {
    e.preventDefault();
    const district = districts.find((d) => d.id === newVenueDistrictId);
    if (!newVenueName.trim() || !district || !newVenueStreet.trim() || !newVenueHouse.trim() || !newVenuePhone.trim()) {
      showToast("Barcha majburiy maydonlarni to'ldiring");
      return;
    }
    const seats = Number(newVenueSeats) || null;
    // The district's own point stands in for the pin until there is a map picker.
    const branch = {
      name: newVenueName.trim(),
      venue_type: newVenueType,
      district_id: district.id,
      street: newVenueStreet.trim(),
      house_number: newVenueHouse.trim(),
      latitude: Number(district.latitude),
      longitude: Number(district.longitude),
      phone: newVenuePhone.trim(),
      ...(newVenueType === "toyxona" ? { capacity_max: seats } : { total_seats: seats }),
    };
    setIsSubmittingVenue(true);
    try {
      let venueId: number;
      if (group) {
        venueId = (await partnerService.createVenue(branch, group.id)).id;
      } else {
        const created = await partnerService.createGroupWithBranch({
          group: { name: branch.name, primary_venue_type: newVenueType },
          branch,
        });
        venueId = created.branches[0].id;
      }
      // Published straight away, as the old panel did — but a refusal is said.
      await partnerService.updateVenue(venueId, { status: "active" });
      setShowAddVenueModal(false);
      setNewVenueName("");
      setNewVenuePhone("");
      setNewVenueStreet("");
      setNewVenueHouse("");
      setNewVenueSeats("");
      setActiveVenueId(venueId);
      showToast("Muassasa qo'shildi");
      await loadSession();
    } catch (err) {
      showToast(errorMessage(err, "Muassasani qo'shib bo'lmadi"));
    } finally {
      setIsSubmittingVenue(false);
    }
  };

  const handleToggleStaffActive = async (staffId: number, currentActive: boolean) => {
    if (!activeVenueId || !group) return;
    try {
      await partnerService.setStaffActive(staffId, activeVenueId, !currentActive);
      setStaff((prev) => prev.map((s) => (s.id === staffId ? { ...s, is_active: !currentActive } : s)));
      showToast(!currentActive ? "Xodim faollashtirildi" : "Xodim nofaol qilindi");
      partnerService.getStaffCounts(group.id).then(setStaffCounts).catch(() => {});
    } catch (err) {
      showToast(errorMessage(err, "Holatni o'zgartirib bo'lmadi"));
    }
  };

  const handleAddStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    const roleId = Number(newStaffRole);
    if (!newStaffName.trim() || !newStaffPhone.trim() || !roleId || !activeVenueId || !group) {
      showToast("Barcha maydonlarni to'ldiring");
      return;
    }
    setIsSubmittingStaff(true);
    try {
      const res = await partnerService.inviteStaff(
        group.id,
        { full_name: newStaffName.trim(), phone: newStaffPhone.trim(), staff_role_id: roleId, venue_id: activeVenueId },
        activeVenueId,
      );
      setCreatedInvitation(res);
      setShowAddStaffModal(false);
      setNewStaffName("");
      setNewStaffPhone("");
      loadVenueData();
    } catch (err) {
      showToast(errorMessage(err, "Xodimni taklif qilib bo'lmadi"));
    } finally {
      setIsSubmittingStaff(false);
    }
  };

  const handleSelectCategory = (catId: number | "all") => {
    setSelectedMenuCategory(catId);
    setMenuItems(catId === "all" ? allMenuItems : allMenuItems.filter((item) => item.menu_category_id === catId));
  };

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryName.trim() || !activeVenueId || !group) return;
    setIsSubmittingMenu(true);
    try {
      const newCat = await partnerService.createCategory(
        { name: newCategoryName.trim(), sort_order: categories.length + 1 },
        group.id,
        activeVenueId,
      );
      showToast(`"${newCat.name}" toifasi qo'shildi`);
      setNewCategoryName("");
      setShowAddCategoryModal(false);
      setCategories(await partnerService.listCategories(group.id, activeVenueId));
      setNewItemCategory(newCat.id);
    } catch (err) {
      showToast(errorMessage(err, "Toifani yaratib bo'lmadi"));
    } finally {
      setIsSubmittingMenu(false);
    }
  };

  const handleAddMenuItem = async (e: React.FormEvent) => {
    e.preventDefault();
    const categoryId = newItemCategory ?? categories[0]?.id;
    const price = Number(newItemPrice.replace(/\D/g, ""));
    if (!newItemName.trim() || !price || !activeVenueId) {
      showToast("Nom va narxni kiriting");
      return;
    }
    if (!categoryId) {
      showToast("Avval toifa qo'shing");
      return;
    }
    setIsSubmittingMenu(true);
    try {
      await partnerService.createMenuItem(
        {
          payload: {
            menu_category_id: categoryId,
            name: newItemName.trim(),
            description: newItemDescription.trim() || null,
            base_price: price,
            currency: "UZS",
            sort_order: allMenuItems.length + 1,
            has_variants: false,
          },
        },
        activeVenueId,
      );
      showToast(`"${newItemName.trim()}" menyuga qo'shildi`);
      setShowAddMenuModal(false);
      setNewItemName("");
      setNewItemPrice("");
      setNewItemDescription("");
      setSelectedMenuCategory("all");
      loadVenueData();
    } catch (err) {
      showToast(errorMessage(err, "Taomni qo'shib bo'lmadi"));
    } finally {
      setIsSubmittingMenu(false);
    }
  };

  const handleDeleteMenuItem = async (itemId: number) => {
    if (!activeVenueId) return;
    setIsSubmittingMenu(true);
    try {
      // Unticks this branch only; the dish stays in the chain's catalogue.
      await partnerService.attachMenuItemToBranches(itemId, { venue_ids: [] }, activeVenueId);
      showToast("Taom filial menyusidan olib tashlandi");
      setItemToDelete(null);
      loadVenueData();
    } catch (err) {
      showToast(errorMessage(err, "O'chirib bo'lmadi"));
    } finally {
      setIsSubmittingMenu(false);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeVenueId || !settingsName.trim()) return;
    setIsSavingSettings(true);
    try {
      await partnerService.updateVenue(activeVenueId, { name: settingsName.trim() });
      if (settingsOpens && settingsCloses) {
        // One opening and closing time for the whole week — the same shape
        // the onboarding wizard writes.
        await partnerService.updateWorkingHours(activeVenueId, {
          days: Array.from({ length: 7 }, (_, weekday) => ({
            weekday,
            opens_at: `${settingsOpens}:00`,
            closes_at: `${settingsCloses}:00`,
            is_closed: false,
          })),
        });
      }
      showToast("Sozlamalar saqlandi");
      const [branches, detail] = await Promise.all([
        partnerService.listVenues(group?.id),
        venueService.getVenueDetail(activeVenueId),
      ]);
      setVenuesList(branches);
      setVenueDetail(detail);
    } catch (err) {
      showToast(errorMessage(err, "Saqlab bo'lmadi"));
    } finally {
      setIsSavingSettings(false);
    }
  };

  const roleById = (roleId: number) => roles.find((r) => r.id === roleId);
  const invitableRoles = roles.filter((r) => r.slug !== "owner");
  const staffRolesPresent = roles.filter((r) => staff.some((s) => s.staff_role_id === r.id));
  const pendingCount = bookings.filter((b) => b.status === "pending").length;
  const anyModalOpen =
    showAddCategoryModal ||
    showAddMenuModal ||
    itemToDelete !== null ||
    showAddStaffModal ||
    createdInvitation !== null ||
    showCheckInModal ||
    showAddVenueModal;
  const bookingDays = upcomingDates(0, 7);

  const fieldClass = `w-full px-4 py-3 rounded-xl border text-sm font-bold outline-none ${
    isDark ? "border-white/10 bg-[#1E1E1E] text-white" : "border-zinc-200 bg-zinc-50 text-zinc-900"
  }`;

  const addVenueModal = showAddVenueModal && (
    <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center animate-fade-in p-4">
      <div className="absolute inset-0" onClick={() => setShowAddVenueModal(false)} />
      <div
        className={`w-full max-w-md max-h-[90vh] overflow-y-auto rounded-[32px] p-6 flex flex-col gap-4 z-10 border relative text-left shadow-2xl ${
          isDark ? "bg-[#2C2C2E] border-white/10 text-white" : "bg-white border-zinc-200 text-zinc-900"
        }`}
      >
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-primary/10 text-primary">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-black text-base">{group ? "Yangi filial qo'shish" : "Muassasangizni qo'shing"}</h3>
              <p className="text-[11px] text-zinc-400 font-bold">{group ? group.name : "Birinchi filial bilan tarmoq ochiladi"}</p>
            </div>
          </div>
          <button onClick={() => setShowAddVenueModal(false)} className="p-2 rounded-full bg-white/5 hover:bg-white/10 text-zinc-400 cursor-pointer">
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleAddVenue} className="space-y-3.5">
          <label className="block space-y-1">
            <span className="text-xs font-bold opacity-60">Nomi</span>
            <input required value={newVenueName} onChange={(e) => setNewVenueName(e.target.value)} placeholder="Masalan: Rayhon Chilonzor" className={fieldClass} />
          </label>

          <div className="space-y-1">
            <span className="text-xs font-bold opacity-60">Turi</span>
            <div className="grid grid-cols-2 gap-2">
              {(
                [
                  ["restoran", "Restoran / Kafe"],
                  ["toyxona", "To'yxona / Zal"],
                ] as const
              ).map(([type, label]) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setNewVenueType(type)}
                  className={`py-2.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                    newVenueType === type ? "bg-primary text-white border-primary" : "border-zinc-300 dark:border-white/10 text-zinc-400"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <label className="block space-y-1">
              <span className="text-xs font-bold opacity-60">Viloyat</span>
              <select required value={newVenueRegionId ?? ""} onChange={(e) => chooseRegion(Number(e.target.value))} className={`${fieldClass} cursor-pointer`}>
                <option value="" disabled>
                  Tanlang
                </option>
                {regions.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="block space-y-1">
              <span className="text-xs font-bold opacity-60">Tuman</span>
              <select
                required
                disabled={districts.length === 0}
                value={newVenueDistrictId ?? ""}
                onChange={(e) => setNewVenueDistrictId(Number(e.target.value))}
                className={`${fieldClass} cursor-pointer disabled:opacity-50`}
              >
                <option value="" disabled>
                  Tanlang
                </option>
                {districts.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <label className="block space-y-1 col-span-2">
              <span className="text-xs font-bold opacity-60">Ko&apos;cha</span>
              <input required value={newVenueStreet} onChange={(e) => setNewVenueStreet(e.target.value)} placeholder="Amir Temur ko'chasi" className={fieldClass} />
            </label>
            <label className="block space-y-1">
              <span className="text-xs font-bold opacity-60">Uy</span>
              <input required value={newVenueHouse} onChange={(e) => setNewVenueHouse(e.target.value)} placeholder="12" className={fieldClass} />
            </label>
          </div>

          <label className="block space-y-1">
            <span className="text-xs font-bold opacity-60">Telefon raqam</span>
            <input required type="tel" value={newVenuePhone} onChange={(e) => setNewVenuePhone(e.target.value)} placeholder="+998 90 123 45 67" className={fieldClass} />
          </label>

          <label className="block space-y-1">
            <span className="text-xs font-bold opacity-60">
              {newVenueType === "toyxona" ? "Eng ko'p mehmonlar soni" : "O'rinlar soni"} (ixtiyoriy)
            </span>
            <input type="number" min={1} value={newVenueSeats} onChange={(e) => setNewVenueSeats(e.target.value)} className={fieldClass} />
          </label>

          <button
            type="submit"
            disabled={isSubmittingVenue}
            className="w-full py-4 bg-[#FF5A00] text-white font-extrabold text-xs tracking-wider rounded-2xl shadow-lg mt-2 cursor-pointer transition-all active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isSubmittingVenue && <Loader2 className="h-4 w-4 animate-spin" />}
            <span>Saqlash</span>
          </button>
        </form>
      </div>
    </div>
  );

  if (authLoading || sessionState === "loading") {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[var(--background)]">
        <Loader2 className="animate-spin h-10 w-10 text-primary" />
        <p className="mt-4 text-xs font-semibold text-zinc-500">Yuklanmoqda...</p>
      </div>
    );
  }

  if (sessionState === "error" || sessionState === "no-group" || !activeVenueId) {
    return (
      <div className={`flex flex-col items-center justify-center min-h-screen gap-4 px-8 text-center bg-[var(--background)] ${isDark ? "text-white" : "text-zinc-900"}`}>
        <div className="w-14 h-14 rounded-2xl bg-[#FF5A00]/10 text-[#FF5A00] flex items-center justify-center">
          <Building2 className="h-7 w-7" />
        </div>
        {sessionState === "error" ? (
          <>
            <p className="text-sm font-bold">{sessionError}</p>
            <button onClick={loadSession} className="px-5 py-2.5 rounded-xl bg-[#FF5A00] text-white text-xs font-bold cursor-pointer">
              Qayta urinish
            </button>
          </>
        ) : (
          <>
            <div className="space-y-1">
              <p className="text-base font-black">Hamkor paneli</p>
              <p className="text-xs text-zinc-400 max-w-xs">
                Bu akkauntda hali muassasa yo&apos;q. Restoran yoki to&apos;yxonangizni qo&apos;shing — u mijozlarga ko&apos;rinadi.
              </p>
            </div>
            <button onClick={openAddVenue} className="px-5 py-3 rounded-xl bg-[#FF5A00] text-white text-xs font-bold cursor-pointer flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Muassasa qo&apos;shish
            </button>
          </>
        )}
        <button onClick={handleLogout} className="text-xs font-bold text-zinc-400 hover:text-red-500 cursor-pointer">
          Akkauntdan chiqish
        </button>
        {addVenueModal}
        {toastMessage && (
          <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[100] px-4 py-2.5 rounded-xl bg-primary text-white text-xs font-bold shadow-xl">
            {toastMessage}
          </div>
        )}
      </div>
    );
  }

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

      {loadError && (
        <div className="mx-6 mt-3 px-4 py-3 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-between gap-3 text-xs text-red-500 font-semibold">
          <span>{loadError}</span>
          <button type="button" onClick={loadVenueData} className="px-3 py-1.5 rounded-xl bg-red-500 text-white font-bold text-[11px] cursor-pointer">
            Qayta
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
                        openAddVenue();
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
                {`${analytics?.queue_count ?? 0} ta`}
              </span>
              <span className="text-[10px] font-bold bg-white/15 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                Faol
              </span>
            </div>
            <p className="mt-1 text-[11px] font-semibold opacity-75">
              {`shu oy ${analytics?.month_bookings ?? 0} ta bron`}
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
              // Every weekday shows, zero included: an empty week is a fact, not a gap to fill.
              const weekData = dayLabels.map((_, weekday) => ({
                weekday,
                bookings_count: Number(analytics?.week?.find((d) => d.weekday === weekday)?.bookings_count ?? 0),
              }));

              const maxCount = Math.max(...weekData.map((d) => Number(d.bookings_count) || 0), 1);
              const peakDay = weekData.reduce(
                (prev, curr) =>
                  (Number(curr.bookings_count) || 0) > (Number(prev.bookings_count) || 0) ? curr : prev,
                weekData[0]
              );
              const delta = analytics?.comparison?.revenue_delta_percent;
              const deltaStr =
                delta === null || delta === undefined ? null : Number(delta) >= 0 ? `+${delta}%` : `${delta}%`;

              return (
                <>
                  <div className="flex justify-between items-start">
                    <div className="space-y-0.5 text-left">
                      <span className="text-[11px] font-bold tracking-wide text-black/55 dark:text-white/60 uppercase">
                        1 haftalik band qilishlar
                      </span>
                      <h3 className="text-xl font-black tracking-tight text-black dark:text-white">
                        {peakDay.bookings_count > 0 ? `${dayLabels[peakDay.weekday]} / ${peakDay.bookings_count} ta` : "Bu hafta bron yo'q"}
                      </h3>
                    </div>

                    {deltaStr && (
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
                    )}
                  </div>

                  <div className="mt-8 flex justify-between items-end h-[148px] px-0.5 gap-2">
                    {weekData.map((bar, i) => {
                      const count = Number(bar.bookings_count) || 0;
                      const isPeak = bar.weekday === peakDay.weekday && count > 0;
                      const heightPx = Math.max(24, Math.round((count / maxCount) * 140));

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
                  {`${analytics?.staff_total ?? staff.length} ta`}
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
              <span>Stollar taxtasi ({tableBoard.length})</span>
            </button>
          </div>

          {bookingsSubTab === "list" && (
            <div className="px-6 pt-3 flex gap-2 overflow-x-auto no-scrollbar">
              {bookingDays.map((day, idx) => (
                <button
                  key={day}
                  type="button"
                  onClick={() => setBookingsDay(day)}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                    bookingsDay === day
                      ? "bg-[#FF5A00] text-white shadow-sm"
                      : isDark
                        ? "bg-white/5 text-zinc-400 hover:text-white"
                        : "bg-zinc-100 text-zinc-600 hover:text-zinc-900"
                  }`}
                >
                  {idx === 0 ? "Bugun" : idx === 1 ? "Ertaga" : formatDate(day)}
                </button>
              ))}
            </div>
          )}

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
                            <span className="text-[10px] text-zinc-400 font-bold">{row.seats} kishilik</span>
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
                                  // An open order with no booking behind it closes at the till, not here.
                                  showToast("Bu stolda bronsiz buyurtma ochiq — uni kassada yoping");
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
                /* No tables yet: say how many of each size, the server numbers them. */
                <form
                  onSubmit={handleCreateTables}
                  className={`py-8 px-6 text-center rounded-3xl border border-dashed space-y-4 ${
                    isDark ? "border-white/10 bg-white/[0.02]" : "border-zinc-200 bg-zinc-50"
                  }`}
                >
                  <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary mx-auto">
                    <Layers className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold">Stollar hali kiritilmagan</h3>
                    <p className="text-xs text-zinc-400 mt-1 max-w-xs mx-auto">Har bir o&apos;lchamdagi stollar sonini kiriting.</p>
                  </div>
                  <div className="grid grid-cols-5 gap-2">
                    {TABLE_SIZES.map((size) => (
                      <label key={size} className="space-y-1">
                        <span className="text-[10px] font-bold text-zinc-400 block">{size} kishilik</span>
                        <input
                          type="number"
                          min={0}
                          value={tableCounts[size] ?? ""}
                          onChange={(e) => setTableCounts((prev) => ({ ...prev, [size]: e.target.value }))}
                          placeholder="0"
                          className={`w-full px-2 py-2 rounded-xl border text-sm font-bold text-center outline-none ${
                            isDark ? "border-white/10 bg-[#1E1E1E]" : "border-zinc-200 bg-white"
                          }`}
                        />
                      </label>
                    ))}
                  </div>
                  <button
                    type="submit"
                    disabled={isCreatingTables}
                    className="px-5 py-2.5 rounded-2xl bg-primary hover:bg-primary-hover text-white text-xs font-black shadow-md shadow-primary/25 cursor-pointer active:scale-95 transition-all inline-flex items-center gap-2 disabled:opacity-50"
                  >
                    {isCreatingTables && <Loader2 className="h-4 w-4 animate-spin" />}
                    Stollarni yaratish
                  </button>
                </form>
              )
            ) : bookings.length === 0 ? (
              <div className={`py-12 px-6 text-center rounded-3xl border border-dashed space-y-3 ${
                isDark ? "border-white/10 bg-white/[0.02]" : "border-zinc-200 bg-zinc-50"
              }`}>
                <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary mx-auto">
                  <Calendar className="h-6 w-6" />
                </div>
                <h3 className="text-sm font-bold">Bu kunga bronlar yo&apos;q</h3>
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
                        : booking.status === "cancelled"
                        ? "Bekor qilingan"
                        : booking.status === "completed"
                        ? "Yakunlangan"
                        : booking.status === "no_show"
                        ? "Kelmagan"
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
                      <span>{formatDate(booking.booking_date)} • {formatTime(booking.start_time)}</span>
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
                      ? categories.length === 0
                        ? "Avval toifa yarating, keyin unga taom qo'shing."
                        : "Ushbu filial menyusiga birinchi taomni qo'shing."
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
                        {item.effective_price
                          ? formatMoney(item.effective_price, item.currency)
                          : item.price_from
                            ? `${formatMoney(item.price_from, item.currency)} dan`
                            : "—"}
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
            <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-end justify-center animate-fade-in">
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
            <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-end justify-center animate-fade-in">
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
                      <button
                        type="button"
                        onClick={() => {
                          setShowAddMenuModal(false);
                          setShowAddCategoryModal(true);
                        }}
                        className="w-full flex items-center justify-between p-3 rounded-xl border border-dashed border-amber-500/40 bg-amber-500/5 text-xs text-amber-500 font-semibold cursor-pointer"
                      >
                        <span>Hozircha toifa yo&apos;q — avval toifa qo&apos;shing</span>
                        <Plus className="h-4 w-4" />
                      </button>
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
            <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
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
              ...staffRolesPresent.map((role) => ({
                id: String(role.id),
                label: `${role.name} (${staff.filter((s) => s.staff_role_id === role.id).length})`,
              })),
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
                          {roleById(member.staff_role_id)?.slug === "owner" && (
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
            <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-end justify-center animate-fade-in">
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
                      required
                      value={newStaffRole}
                      onChange={(e) => setNewStaffRole(e.target.value)}
                      className={`w-full px-4 py-3 rounded-xl border text-sm font-bold outline-none cursor-pointer ${
                        isDark ? "border-white/10 bg-[#393939]/50 focus:border-[#FF5A00]" : "border-zinc-200 bg-zinc-50 focus:border-[#FF5A00]"
                      }`}
                    >
                      <option value="" disabled>
                        Lavozimni tanlang
                      </option>
                      {invitableRoles.map((role) => (
                        <option key={role.id} value={role.id}>
                          {role.name}
                        </option>
                      ))}
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
            <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
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
                    Ushbu login va vaqtinchalik parolni xodimga bering — u kirganda o&apos;z parolini o&apos;rnatadi.
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
              <div className="w-16 h-16 rounded-full overflow-hidden border bg-zinc-100 shadow-md flex items-center justify-center">
                {venueDetail?.photos[0] ? (
                  <img src={venueDetail.photos[0].url} alt={partnerName} className="w-full h-full object-cover" />
                ) : (
                  <Building2 className="h-7 w-7 text-primary" />
                )}
              </div>
              <div className="space-y-0.5">
                <h3 className="font-extrabold text-base">{partnerName}</h3>
                <p className="text-xs text-zinc-400 font-bold uppercase tracking-wider">{partnerLocation}</p>
              </div>
            </div>

            <div className="space-y-4">
              <form onSubmit={handleSaveSettings} className="space-y-4">
                <label className="block space-y-1.5">
                  <span className="text-xs font-bold opacity-60">Muassasa nomi</span>
                  <input required value={settingsName} onChange={(e) => setSettingsName(e.target.value)} className={fieldClass} />
                </label>

                <div className="grid grid-cols-2 gap-3">
                  <label className="block space-y-1.5">
                    <span className="text-xs font-bold opacity-60">Ochiladi</span>
                    <input type="time" value={settingsOpens} onChange={(e) => setSettingsOpens(e.target.value)} className={fieldClass} />
                  </label>
                  <label className="block space-y-1.5">
                    <span className="text-xs font-bold opacity-60">Yopiladi</span>
                    <input type="time" value={settingsCloses} onChange={(e) => setSettingsCloses(e.target.value)} className={fieldClass} />
                  </label>
                </div>
                <p className="text-[11px] text-zinc-400 -mt-2">Ish vaqti haftaning barcha kunlariga qo&apos;llanadi.</p>

                <button
                  type="submit"
                  disabled={isSavingSettings}
                  className="w-full py-3.5 bg-[#FF5A00] text-white font-extrabold text-xs rounded-2xl shadow-lg cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isSavingSettings && <Loader2 className="h-4 w-4 animate-spin" />}
                  Saqlash
                </button>
              </form>

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

      {/* PARTNER BOTTOM NAVIGATION BAR — hidden under an open sheet: the sheets
          live inside an animated tab, which caps their stacking below this bar,
          and it was covering their submit buttons. */}
      {!anyModalOpen && (
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
      )}

      {/* QR Check-in Modal */}
      {showCheckInModal && (
        <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center animate-fade-in p-4">
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
                  setCheckInError(null);
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
                  {checkInResult.booking.table_number ? (
                    <>
                      Stol: <strong>{checkInResult.booking.table_number}-stol</strong> •{" "}
                    </>
                  ) : null}
                  Mehmonlar: <strong>{checkInResult.booking.guests_count} kishi</strong> •{" "}
                  {checkInResult.booking.contact_name}
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
                  <label className="text-xs font-bold opacity-60">Mijoz chiptasidagi QR token</label>
                  <input
                    type="text"
                    required
                    value={checkInToken}
                    onChange={(e) => setCheckInToken(e.target.value)}
                    placeholder="QR kod ostidagi token"
                    className={`w-full px-4 py-3.5 rounded-xl border text-sm font-mono font-bold outline-none ${
                      isDark ? "border-white/10 bg-[#1E1E1E]" : "border-zinc-200 bg-zinc-50"
                    }`}
                  />
                </div>

                {checkInError && <p className="text-xs font-bold text-red-500">{checkInError}</p>}

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

      {addVenueModal}
    </div>
  );
}
