// TypeScript definitions matching Bazmly Backend OpenAPI 3.1.0 Specification

export type UserRole = "customer" | "venue_owner" | "venue_staff" | "moderator" | "admin" | "partner" | "staff";
export type UserStatus = "active" | "inactive" | "pending_profile" | "blocked" | "deleted";
export type UserTheme = "light" | "dark" | "system";

export interface UserRead {
  id: number;
  first_name: string;
  last_name: string;
  phone: string | null;
  email: string | null;
  avatar_url: string | null;
  language_id: number;
  district_id: number | null;
  role: UserRole;
  status: UserStatus;
  theme: UserTheme;
  created_at: string;
}

export interface UserProfileUpdate {
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
  avatar_url?: string | null;
  language_id?: number | null;
  district_id?: number | null;
  theme?: UserTheme | null;
}

export interface UserListItem {
  id: number;
  first_name: string;
  last_name: string;
  avatar_url: string | null;
}

export interface TokenPair {
  access_token: string;
  refresh_token: string;
  token_type?: string;
  expires_in_seconds: number;
  user_id: number;
  must_change_password?: boolean;
  profile_completed?: boolean;
}

export interface PhoneCheck {
  phone: string;
}

export interface PhoneCheckResult {
  phone: string;
  registered: boolean;
  password_required: boolean;
}

export interface PhoneRegister {
  phone: string;
  first_name: string;
  last_name: string;
  password?: string | null;
  language_id?: number | null;
  district_id?: number | null;
}

export interface PhoneLogin {
  phone: string;
  password?: string | null;
}

export interface TelegramLogin {
  init_data: string;
}

export interface TelegramContactShare {
  contact_data: string;
}

export interface StaffLogin {
  login: string;
  password: string;
}

export interface PasswordChange {
  current_password?: string | null;
  new_password: string;
}

export interface RefreshRequest {
  refresh_token: string;
}

// Geo & Localization
export interface LanguageRead {
  id: number;
  code: string;
  name_native: string;
  name_english: string;
  flag_url: string | null;
  sort_order: number;
}

export interface RegionRead {
  id: number;
  name: string;
  code: string;
}

export interface RegionCreate {
  name: string;
  code: string;
}

export interface RegionUpdate {
  name?: string | null;
  code?: string | null;
}

export interface DistrictRead {
  id: number;
  region_id: number;
  name: string;
  latitude: string;
  longitude: string;
}

export interface DistrictCreate {
  region_id: number;
  name: string;
  latitude: number | string;
  longitude: number | string;
}

export interface DistrictUpdate {
  region_id?: number | null;
  name?: string | null;
  latitude?: number | string | null;
  longitude?: number | string | null;
}

export interface NearestDistrictRead {
  district_id: number;
  district_name: string;
  region_id: number;
  region_name: string;
  latitude: string;
  longitude: string;
  distance_m: number;
}

export interface UserAddressRead {
  id: number;
  district_id: number;
  label: string;
  latitude: string;
  longitude: string;
  last_used_at: string;
}

export interface UserAddressCreate {
  district_id: number;
  label: string;
  latitude: number | string;
  longitude: number | string;
}

export type DevicePlatform = "android" | "ios" | "web";

export interface DeviceRead {
  id: number;
  device_uuid: string;
  platform: DevicePlatform;
  app_version: string;
  last_seen_at: string;
}

export interface DeviceCreate {
  device_uuid: string;
  platform: DevicePlatform;
  app_version: string;
  push_token?: string | null;
}

export type FriendshipStatus = "pending" | "accepted" | "declined" | "blocked";

export interface FriendshipRead {
  id: number;
  requester_id: number;
  addressee_id: number;
  status: FriendshipStatus;
}

export interface FriendshipCreate {
  addressee_id: number;
}

export interface FriendshipRespond {
  accept: boolean;
}

// Catalog & Services
export interface AmenityRead {
  id: number;
  slug: string;
  name: string;
  icon_url: string | null;
  sort_order: number;
}

export type VenueTypeSlug = "restoran" | "toyxona" | "katering" | "bezaklar";

export interface ServiceCatalogRead {
  id: number;
  slug: string;
  name: string;
  icon_url: string | null;
  applies_to_venue_type: VenueTypeSlug | null;
  sort_order: number;
}

export type ServicePriceUnit = "flat" | "per_guest" | "per_hour";

export interface VenueServiceItemRead {
  id: number;
  name: string;
  price: string;
  sort_order: number;
}

export interface VenueServiceItemCreate {
  name: string;
  price: number | string;
  sort_order?: number;
}

export interface VenueServiceRead {
  id: number;
  venue_group_id: number;
  venue_id: number | null;
  service_catalog_id: number;
  name: string;
  price: string;
  currency: string;
  price_unit: ServicePriceUnit;
  is_active: boolean;
  sort_order: number;
  items?: VenueServiceItemRead[];
}

export interface VenueServiceCreate {
  service_catalog_id: number;
  price: number | string;
  currency?: string;
  price_unit?: ServicePriceUnit;
  venue_id?: number | null;
  sort_order?: number;
  items?: VenueServiceItemCreate[];
}

// Venues & Venue Groups
export type VenueGroupStatus = "active" | "inactive" | "suspended";
export type VenueStatus = "active" | "draft" | "closed" | "suspended";

export interface VenueGroupRead {
  id: number;
  owner_id: number;
  primary_venue_type: VenueTypeSlug;
  name: string;
  description: string | null;
  logo_url: string | null;
  default_currency: string;
  status: VenueGroupStatus;
}

export interface VenueGroupCreate {
  primary_venue_type: VenueTypeSlug;
  name: string;
  description?: string | null;
  logo_url?: string | null;
  default_currency?: string;
}

export interface VenueGroupUpdate {
  name?: string | null;
  description?: string | null;
  primary_venue_type?: VenueTypeSlug | null;
  logo_url?: string | null;
  default_currency?: string | null;
  status?: VenueGroupStatus | null;
}

export interface VenueWorkingHoursRead {
  weekday: number; // 0 = Monday, 6 = Sunday
  opens_at: string | null;
  closes_at: string | null;
  is_closed: boolean;
}

export interface WorkingHoursCreate {
  weekday: number;
  opens_at?: string | null;
  closes_at?: string | null;
  is_closed?: boolean;
}

export interface WorkingHoursReplace {
  days: WorkingHoursCreate[];
}

export interface VenuePhotoRead {
  id: number;
  url: string;
  sort_order: number;
  is_cover: boolean;
}

export interface VenueZoneRead {
  id: number;
  slug: string;
  name: string;
  sort_order: number;
}

export interface VenueTableRead {
  id: number;
  number: number;
  seats: number;
  zone_id: number | null;
  is_active: boolean;
}

export interface TableCountsCreate {
  counts: Record<string, number>; // e.g. { "2": 5, "4": 10, "6": 4 }
  zone_id?: number | null;
}

export interface AvailableTableRead {
  id: number;
  number: number;
  seats: number;
  zone_id: number | null;
}

export interface BlockedDatesRead {
  venue_id: number;
  dates: string[]; // ['2026-06-18', ...]
}

export interface VenueRead {
  id: number;
  venue_group_id: number;
  name: string;
  description: string | null;
  tagline: string | null;
  district_id: number;
  venue_type: VenueTypeSlug;
  street: string;
  house_number: string;
  latitude: string;
  longitude: string;
  phone: string;
  total_seats: number | null;
  capacity_min: number | null;
  capacity_max: number | null;
  base_price: string | null;
  currency: string;
  min_advance_booking_days: number;
  late_grace_minutes: number;
  requires_deposit: boolean;
  deposit_percent: string | null;
  discount_percent: string | null;
  rating_avg: string;
  reviews_count: number;
  status: VenueStatus;
  onboarding_step: number;
  onboarded_at: string | null;
}

/** To'yxona pricing band. A null `max_guests` is the open-ended top band. */
export interface VenueGuestTierRead {
  id: number;
  min_guests: number;
  max_guests: number | null;
  base_price: string;
  sort_order: number;
}

export interface VenueDetailRead {
  venue: VenueRead;
  photos: VenuePhotoRead[];
  amenities: AmenityRead[];
  venue_type: VenueTypeSlug;
  working_hours: VenueWorkingHoursRead[];
  is_open_now: boolean;
  guest_tiers: VenueGuestTierRead[];
}

export interface VenueListItem {
  id: number;
  name: string;
  tagline: string | null;
  venue_type: VenueTypeSlug;
  status: VenueStatus;
  street: string;
  house_number: string;
  capacity_min: number | null;
  capacity_max: number | null;
  rating_avg: string;
  reviews_count: number;
  base_price: string | null;
  currency: string;
  discount_percent: string | null;
  requires_deposit: boolean;
  distance_m: number | null;
  is_open_now: boolean;
  cover_url: string | null;
}

export interface BranchListItem {
  id: number;
  name: string;
  tagline: string | null;
  status: string;
}

export interface VenueGroupWithBranchesRead {
  group: VenueGroupRead;
  branches: BranchListItem[];
}

export interface VenueCreate {
  district_id: number;
  street: string;
  house_number: string;
  latitude: number | string;
  longitude: number | string;
  phone: string;
  name: string;
  description?: string | null;
  tagline?: string | null;
  venue_type: VenueTypeSlug;
  amenity_ids?: number[];
  total_seats?: number | null;
  capacity_min?: number | null;
  capacity_max?: number | null;
  base_price?: number | string | null;
  currency?: string;
  min_advance_booking_days?: number;
  late_grace_minutes?: number;
  requires_deposit?: boolean;
  deposit_percent?: number | string | null;
  manager_user_id?: number | null;
}

export interface VenueGroupWithBranchCreate {
  group: VenueGroupCreate;
  branch: VenueCreate;
}

export interface VenueUpdate {
  name?: string | null;
  description?: string | null;
  tagline?: string | null;
  district_id?: number | null;
  street?: string | null;
  house_number?: string | null;
  latitude?: number | string | null;
  longitude?: number | string | null;
  phone?: string | null;
  total_seats?: number | null;
  capacity_min?: number | null;
  capacity_max?: number | null;
  base_price?: number | string | null;
  min_advance_booking_days?: number | null;
  late_grace_minutes?: number | null;
  requires_deposit?: boolean | null;
  deposit_percent?: number | string | null;
  discount_percent?: number | string | null;
  manager_user_id?: number | null;
  venue_type?: VenueTypeSlug | null;
  status?: VenueStatus | null;
}

export interface VenueSearchParams {
  query?: string | null;
  venue_type?: VenueTypeSlug | null;
  district_id?: number | null;
  guest_count?: number | null;
  min_rating?: number | string | null;
  requires_deposit?: boolean | null;
  latitude?: number | null;
  longitude?: number | null;
  radius_m?: number | null;
  only_open_now?: boolean;
  sort?: string;
  limit?: number;
  offset?: number;
}

export interface VenueStatusCountsRead {
  total: number;
  active: number;
  closed: number;
}

// Menu Items & Categories
export interface MenuCategoryRead {
  id: number;
  name: string;
  sort_order: number;
  is_active: boolean;
  item_count?: number;
}

export interface MenuCategoryCreate {
  name: string;
  sort_order?: number;
}

export type MenuItemStatus = "active" | "hidden" | "out_of_stock";

export interface MenuItemVariantRead {
  id: number;
  name: string;
  price: string;
  effective_price: string;
  sort_order: number;
  is_active: boolean;
}

export interface MenuItemVariantCreate {
  name: string;
  price: number | string;
  sort_order?: number;
}

export interface MenuItemListItem {
  id: number;
  menu_category_id: number;
  category_name: string;
  name: string;
  description: string | null;
  photo_url: string | null;
  effective_price: string | null;
  price_from: string | null;
  currency: string;
  discount_percent: string | null;
  has_variants: boolean;
  is_available: boolean;
  status: MenuItemStatus;
}

export interface MenuItemRead {
  id: number;
  menu_category_id: number;
  name: string;
  description: string | null;
  base_price: string | null;
  effective_price: string | null;
  currency: string;
  photo_url: string | null;
  has_variants: boolean;
  discount_percent: string | null;
  sort_order: number;
  is_available: boolean;
  status: MenuItemStatus;
  variants: MenuItemVariantRead[];
}

export interface MenuItemCreate {
  menu_category_id: number;
  name: string;
  description?: string | null;
  base_price?: number | string | null;
  currency?: string;
  photo_url?: string | null;
  has_variants?: boolean;
  discount_percent?: number | string | null;
  sort_order?: number;
}

export interface BodyVenueMenuCreateItem {
  payload: MenuItemCreate;
  variants?: MenuItemVariantCreate[] | null;
}

export interface BranchAvailabilityUpdate {
  venue_ids: number[];
  price_overrides?: Record<string, number>;
}

// Bookings
export type BookingKind = "table" | "hall";
export type BookingStatus = "pending" | "confirmed" | "checked_in" | "completed" | "cancelled" | "rejected" | "no_show";

export interface BookingItemCreate {
  menu_item_id: number;
  quantity: number;
}

export interface BookingItemRead {
  id: number;
  menu_item_id: number;
  quantity: number;
  unit_price: string;
  total_price: string;
  name_snapshot: string;
}

export interface BookingServiceCreate {
  venue_service_id: number;
  quantity?: number;
}

export interface BookingServiceRead {
  id: number;
  venue_service_id: number;
  quantity: number;
  unit_price: string;
  total_price: string;
  name_snapshot: string;
}

export type PriceLineType = "hall_rental" | "catering" | "service_logistics" | "deposit";

export interface PriceLineRead {
  id: number;
  sort_order: number;
  line_type: PriceLineType;
  label_snapshot: string;
  unit_price: string;
  quantity: number;
  amount: string;
}

export interface BookingRead {
  id: number;
  user_id: number;
  venue_id: number;
  kind: BookingKind;
  status: BookingStatus;
  booking_date: string;
  start_time: string;
  end_time: string;
  guests_count: number;
  contact_name: string;
  contact_phone: string;
  note: string | null;
  subtotal: string;
  deposit_amount: string;
  total_amount: string;
  currency: string;
  receipt_number: string;
  ticket_code: string;
  table_id: number | null;
  guest_tier_id: number | null;
  auto_cancel_at: string | null;
  confirmed_at: string | null;
  checked_in_at: string | null;
  checked_out_at: string | null;
  seated_minutes: number | null;
  cancelled_at: string | null;
  completed_at: string | null;
}

export interface BookingListItem {
  id: number;
  venue_id: number;
  venue_name: string;
  kind: BookingKind;
  status: BookingStatus;
  booking_date: string;
  start_time: string;
  end_time: string;
  guests_count: number;
  total_amount: string;
  currency: string;
  table_number: number | null;
}

export interface BookingOwnerDetail {
  booking: BookingRead;
  qr_token: string;
  venue_name: string;
  items: BookingItemRead[];
  services: BookingServiceRead[];
  price_lines: PriceLineRead[];
}

export interface TableReservationCreate {
  venue_id: number;
  booking_date: string; // YYYY-MM-DD
  start_time: string; // HH:MM:SS or HH:MM
  end_time: string;
  guests_count: number;
  contact_name: string;
  contact_phone: string;
  table_id: number;
  note?: string | null;
  services?: BookingServiceCreate[];
  items?: BookingItemCreate[];
}

export interface HallEventCreate {
  venue_id: number;
  booking_date: string;
  start_time: string;
  end_time: string;
  guests_count: number;
  contact_name: string;
  contact_phone: string;
  note?: string | null;
  services?: BookingServiceCreate[];
  venue_service_ids?: number[];
}

export interface BookingCancel {
  reason?: string | null;
}

export interface CheckInRequest {
  qr_token: string;
  venue_id: number;
}

export interface SeatedSummary {
  booking_id: number;
  checked_in_at: string | null;
  checked_out_at: string | null;
  seated_minutes: number | null;
}

// Orders & POS (Venue Live Orders)
export type OrderKind = "dine_in" | "takeaway" | "event";
export type OrderStatus = "open" | "paid" | "closed" | "cancelled";
export type OrderItemStatus = "pending" | "cooking" | "served" | "cancelled";
export type OrderPaymentMethod = "cash" | "uzcard" | "humo" | "visa" | "mastercard" | "qr_pay";

export interface OrderItemCreate {
  menu_item_id: number;
  variant_id?: number | null;
  quantity: number;
  note?: string | null;
}

export interface OrderItemRead {
  id: number;
  menu_item_id: number;
  variant_id: number | null;
  quantity: number;
  unit_price: string;
  discount_amount: string;
  total_price: string;
  name_snapshot: string;
  variant_name_snapshot: string | null;
  status: OrderItemStatus;
  note: string | null;
  added_at: string;
  served_at: string | null;
}

export interface OrderPaymentCreate {
  method: OrderPaymentMethod;
  amount: number | string;
  provider_transaction_id?: string | null;
  change_amount?: number | string | null;
}

export interface OrderPaymentRead {
  id: number;
  method: OrderPaymentMethod;
  amount: string;
  currency: string;
  paid_at: string;
  change_amount: string | null;
}

export interface OrderRead {
  id: number;
  venue_id: number;
  table_id: number | null;
  booking_id: number | null;
  order_number: number;
  business_date: string;
  kind: OrderKind;
  status: OrderStatus;
  guests_count: number | null;
  waiter_staff_id: number | null;
  subtotal: string;
  discount_amount: string;
  service_charge: string;
  total_amount: string;
  currency: string;
  opened_at: string;
  closed_at: string | null;
  cancelled_at: string | null;
}

export interface OrderListItem {
  id: number;
  order_number: number;
  table_id: number | null;
  table_number: number | null;
  status: OrderStatus;
  kind: OrderKind;
  guests_count: number | null;
  total_amount: string;
  currency: string;
  opened_at: string;
  elapsed_seconds?: number;
}

export interface OrderDetailRead {
  order: OrderRead;
  items: OrderItemRead[];
  payments: OrderPaymentRead[];
  paid_amount: string;
  elapsed_seconds?: number;
}

export interface OrderOpen {
  table_id: number;
  guests_count?: number | null;
  kind?: OrderKind;
}

export interface OrderCancel {
  reason?: string | null;
}

export interface ReceiptRead {
  id: number;
  order_id: number;
  receipt_number: string;
  printed_at: string;
  fiscal_sign: string | null;
  fiscal_serial: string | null;
  payload: Record<string, any>;
  reprinted_count: number;
}

export interface TableBoardRow {
  table_id: number;
  number: number;
  seats: number;
  zone_id: number | null;
  order: OrderListItem | null;
}

export interface KitchenQueueItem {
  id: number;
  order_id: number;
  table_number: number | null;
  name_snapshot: string;
  variant_name_snapshot: string | null;
  quantity: number;
  status: OrderItemStatus;
  note: string | null;
  added_at: string;
}

// Staff & Roles
export type StaffRoleScope = "group" | "branch";

export interface StaffRoleRead {
  id: number;
  slug: string;
  scope: StaffRoleScope;
  name: string;
  sort_order: number;
}

export interface VenueStaffRead {
  id: number;
  venue_group_id: number;
  venue_id: number | null;
  user_id: number;
  staff_role_id: number;
  role_scope: string;
  is_active: boolean;
  invited_at: string;
  activated_at: string | null;
  deactivated_at: string | null;
}

export interface VenueStaffListItem {
  id: number;
  venue_id: number | null;
  staff_role_id: number;
  role_name: string;
  is_active: boolean;
  user: UserListItem;
}

export interface StaffInvitationCreate {
  full_name: string;
  phone: string;
  staff_role_id: number;
  venue_id?: number | null;
}

export interface StaffInvitationCreated {
  id: number;
  venue_group_id: number;
  venue_id: number | null;
  full_name: string;
  phone: string;
  staff_role_id: number;
  accepted_at: string | null;
  expires_at: string;
  login: string;
  /** Null when the phone already had an account with its own password. */
  temporary_password: string | null;
}

export interface InvitationAccept {
  login: string;
  temporary_password: string;
  new_password: string;
}

export interface StaffCountsRead {
  total: number;
  active: number;
  inactive: number;
}

// Analytics & Reports
export interface StatsTotalsRead {
  bookings_count: number;
  guests_count: number;
  no_show_count: number;
  cancelled_count: number;
  orders_count: number;
  revenue: string;
}

export interface PeriodComparisonRead {
  current: StatsTotalsRead;
  previous: StatsTotalsRead;
  revenue_delta_percent: string | null;
  bookings_delta_percent: string | null;
}

export interface WeekdayBar {
  weekday: number;
  bookings_count: number;
  revenue: string;
}

export interface VenueDailyStatsRead {
  id: number;
  venue_id: number;
  business_date: string;
  bookings_count: number;
  guests_count: number;
  no_show_count: number;
  cancelled_count: number;
  orders_count: number;
  revenue: string;
  avg_check: string;
  occupancy_percent: string;
  computed_at: string;
}

export interface DashboardRead {
  group_id: number;
  group_name: string;
  venue_id: number | null;
  venue_name: string | null;
  is_open_now?: boolean;
  branches_total: number;
  branches_active: number;
  branches_closed: number;
  staff_total: number;
  staff_active: number;
  queue_count: number;
  month_revenue: string;
  month_bookings: number;
  avg_check: string;
  occupancy_percent: string;
  currency: string;
  comparison: PeriodComparisonRead;
  week: WeekdayBar[];
  today: VenueDailyStatsRead | null;
}

// Reviews
export type ReviewStatus = "pending" | "published" | "rejected";

export interface ReviewPhotoRead {
  id: number;
  url: string;
  sort_order: number;
}

export interface ReviewRead {
  id: number;
  user_id: number;
  venue_id: number;
  booking_id: number | null;
  rating: number;
  comment: string | null;
  is_verified: boolean;
  status: ReviewStatus;
  published_at: string | null;
}

export interface ReviewListItem {
  id: number;
  rating: number;
  comment: string | null;
  is_verified: boolean;
  published_at: string | null;
  author: UserListItem;
  photos?: ReviewPhotoRead[];
}

export interface ReviewAggregateRead {
  venue_id: number;
  average: string;
  count: number;
}

export interface ReviewCreate {
  booking_id: number;
  rating: number;
  comment?: string | null;
  photo_urls?: string[];
}

// Favorites & Engagement
export interface FavoriteRead {
  id: number;
  venue: VenueListItem;
}

export interface FavoriteCreate {
  venue_id: number;
}

export interface FavoriteToggled {
  venue_id: number;
  is_favorite: boolean;
}

export type MessageSenderType = "user" | "venue" | "system";

export interface MessageRead {
  id: number;
  conversation_id: number;
  sender_type: MessageSenderType;
  sender_user_id: number;
  body: string;
  read_at: string | null;
  created_at: string;
}

export interface MessageCreate {
  body: string;
}

export interface ConversationRead {
  id: number;
  venue_id: number;
  user_id: number;
  booking_id: number | null;
  last_message_at: string | null;
}

export interface ConversationListItem {
  id: number;
  venue_id: number;
  user_id: number;
  booking_id: number | null;
  last_message_at: string | null;
  last_message: MessageRead | null;
  unread_count?: number;
}

export interface ConversationCreate {
  venue_id: number;
  booking_id?: number | null;
}

export interface NotificationRead {
  id: number;
  type: string;
  title: string;
  body: string;
  payload: Record<string, any> | null;
  read_at: string | null;
  sent_at: string;
}

export interface UnreadCountRead {
  unread: number;
}

// Pagination & Standard Error
export interface Page<T> {
  items: T[];
  total: number;
  limit: number;
  offset: number;
}

export interface ApiErrorResponse {
  code: string;
  message: string;
  details?: Record<string, any> | null;
  request_id?: string;
}
