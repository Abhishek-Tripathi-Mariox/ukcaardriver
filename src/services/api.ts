import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import {
  CACHE_KEYS,
  CACHE_TTL,
  clearAllCache,
  getOrFetch,
  invalidate,
  invalidatePrefix,
  setCached,
} from './apiCache';

// ── API base URL config ──
// Mirrors the customer app's resolution so dev/prod behave consistently.
// In `__DEV__` builds we point at the dev machine over LAN; in release
// builds we always hit the production API.

/** Force production API even when running a dev build (handy for testing
 *  on a physical device against staging/prod). */
// Set true to point a dev (Metro) build at the live EC2 backend
// (https://ukcaar.com) instead of a local LAN server. Needed to test against
// production data / the deployed FCM fix. Flip back to false for local backend dev.
const FORCE_PRODUCTION = true;

/** Your dev machine's LAN IPv4 — used ONLY by dev/USB (Metro) builds so a
 *  physical phone on the same Wi-Fi reaches the local backend. Release/prod
 *  APKs always use the deployed backend (PRODUCTION_URL) — see API_BASE_URL.
 *  Update if your IP changes (Windows: `ipconfig`; macOS/Linux: `ip addr`). */
const LOCAL_IP = '192.168.1.34';

/** Set to true ONLY when running in the Android emulator (which routes
 *  10.0.2.2 → host machine's loopback). Physical devices + iOS sim/device
 *  use LOCAL_IP. */
const USE_ANDROID_EMULATOR = false;

const PORT = 5000;
const PRODUCTION_URL = 'https://ukcaar.com/api/v1';

const devHost =
  Platform.OS === 'android' && USE_ANDROID_EMULATOR
    ? '10.0.2.2'
    : LOCAL_IP;

// Dev/USB build → local LAN backend; release build → deployed backend.
export const API_BASE_URL = FORCE_PRODUCTION
  ? PRODUCTION_URL
  : __DEV__
    ? `http://${devHost}:${PORT}/api/v1`
    : PRODUCTION_URL;

if (__DEV__) {
  // eslint-disable-next-line no-console
  console.log('[api] API_BASE_URL =', API_BASE_URL);
}

const ACCESS_TOKEN_KEY = 'auth.accessToken';
const REFRESH_TOKEN_KEY = 'auth.refreshToken';

export type RegistrationStep =
  | 'service-type'
  | 'choose-route'
  | 'vehicle-details'
  | 'owner-details'
  | 'driver-details'
  | 'complete-profile'
  | 'pending'
  | 'approved'
  | 'rejected';

export interface ApiUser {
  id: string;
  firstName?: string;
  lastName?: string;
  phone: string;
  countryCode?: string;
  email?: string;
  role: 'customer' | 'user' | 'driver' | 'admin';
  isVerified: boolean;
  avatar?: string;
  isProfileSetup: boolean;
  /** Account creation timestamp — used as the driver "joining date". */
  createdAt?: string;
  /** Where in driver registration the user left off. null = not started. */
  registrationStep?: RegistrationStep | null;
  /**
   * Subset of driverProfile we need for resuming registration. Populated
   * by fetchCurrentUser. Optional because customers / new signups won't
   * have it.
   */
  driverProfile?: {
    licenceNumber?: string;
    licenceExpiry?: string | null;
    yearsExperience?: number | null;
    documents?: DriverDocument[];
    ownerName?: string;
    ownerContact?: string;
    ownerAddress?: string;
    vehicleMake?: string;
    vehicleModel?: string;
    vehicleYear?: string;
    vehicleColor?: string;
    seatingCapacity?: number;
    plateNumber?: string;
    insuranceExpiry?: string | null;
    rating?: number;
    serviceType?: 'instant' | 'private' | 'scheduled';
    bankDetails?: {
      accountHolder?: string;
      bankName?: string;
      accountNumber?: string;
      ifsc?: string;
      passbookUrl?: string;
    };
  };
  /** Date of birth as ISO string. */
  dob?: string | null;
  /** Refer-and-earn code shown on the Refer & Earn screen. */
  referralCode?: string;
  /** How many drivers/riders signed up using this user's referral code. */
  referralCount?: number;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export class ApiError extends Error {
  status: number;
  payload: unknown;
  constructor(message: string, status: number, payload: unknown) {
    super(message);
    this.status = status;
    this.payload = payload;
  }
}

async function request<T>(
  path: string,
  init: RequestInit & { auth?: boolean } = {},
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(init.headers as Record<string, string> | undefined),
  };

  if (init.auth) {
    const token = await AsyncStorage.getItem(ACCESS_TOKEN_KEY);
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  // Hard network timeout. Raw fetch has none, so an unresponsive server (e.g.
  // a stalled endpoint) would hang the caller forever — which froze the driver
  // on the ride screen when "Complete" couldn't get a reply. Abort after 20s so
  // the promise rejects and the UI can surface an error / move on instead.
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 20000);
  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      headers,
      signal: controller.signal,
    });
  } catch (err: any) {
    if (err?.name === 'AbortError') {
      throw new ApiError('Request timed out', 0, null);
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
  const text = await res.text();
  const json = text ? safeParseJson(text) : null;

  if (!res.ok) {
    const message =
      (json && (json.message || json.error)) || `Request failed (${res.status})`;
    throw new ApiError(message, res.status, json);
  }

  return json as T;
}

function safeParseJson(text: string): any {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

// ── Auth ──

export interface SendOtpResponse {
  success: boolean;
  message: string;
  otp?: string; // present in dev/test mode
}

export async function sendOtp(
  phone: string,
  countryCode = '+91',
): Promise<SendOtpResponse> {
  return request<SendOtpResponse>('/auth/send-otp', {
    method: 'POST',
    body: JSON.stringify({ phone, countryCode }),
  });
}

export interface VerifyOtpResponse {
  success: boolean;
  message: string;
  data: {
    user: ApiUser;
    tokens: AuthTokens;
  };
}

export async function verifyOtp(
  phone: string,
  otp: string,
  countryCode = '+91',
): Promise<VerifyOtpResponse> {
  const res = await request<VerifyOtpResponse>('/auth/verify-otp', {
    method: 'POST',
    body: JSON.stringify({ phone, otp, countryCode }),
  });

  if (res.data?.tokens) await persistTokens(res.data.tokens);

  return res;
}

export async function persistTokens(tokens: AuthTokens): Promise<void> {
  // async-storage v3 renamed multiSet/multiRemove → setMany/removeMany.
  await AsyncStorage.setMany({
    [ACCESS_TOKEN_KEY]: tokens.accessToken,
    [REFRESH_TOKEN_KEY]: tokens.refreshToken,
  });
}

export async function clearTokens(): Promise<void> {
  await AsyncStorage.removeMany([ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY]);
}

/**
 * Resumes a session on app start: if we have a stored access token, ask
 * the backend who we are. Returns null if no token is stored or if the
 * token has expired / been revoked (backend will 401, which we surface
 * as null so the caller routes to login).
 *
 * The user shape here is whatever /auth/me returns — we map it to the
 * same ApiUser shape the verify-otp endpoint uses, so the rest of the
 * app's routing logic (resolveStageForUser, isRegisteredDriver) just works.
 */
async function fetchCurrentUserUncached(): Promise<ApiUser | null> {
  const token = await AsyncStorage.getItem(ACCESS_TOKEN_KEY);
  if (!token) return null;
  try {
    const res = await request<{
      success: boolean;
      data: { user: any; referrals?: { count: number } };
    }>('/auth/me', { method: 'GET', auth: true });
    const u = res?.data?.user;
    if (!u) return null;
    const referralCount = res?.data?.referrals?.count;
    return {
      id: String(u._id ?? u.id),
      firstName: u.firstName,
      lastName: u.lastName,
      phone: u.phone,
      countryCode: u.countryCode,
      email: u.email,
      role: u.role,
      isVerified: !!u.isVerified,
      avatar: u.avatar,
      isProfileSetup: !!u.isProfileSetup,
      createdAt: u.createdAt,
      registrationStep: u.driverProfile?.registrationStep ?? null,
      driverProfile: u.driverProfile
        ? {
            licenceNumber: u.driverProfile.licenceNumber,
            licenceExpiry: u.driverProfile.licenceExpiry ?? null,
            yearsExperience: u.driverProfile.yearsExperience ?? null,
            documents: u.driverProfile.documents ?? [],
            ownerName: u.driverProfile.ownerName,
            ownerContact: u.driverProfile.ownerContact,
            ownerAddress: u.driverProfile.ownerAddress,
            vehicleMake: u.driverProfile.vehicleMake,
            vehicleModel: u.driverProfile.vehicleModel,
            vehicleYear: u.driverProfile.vehicleYear,
            vehicleColor: u.driverProfile.vehicleColor,
            seatingCapacity: u.driverProfile.seatingCapacity,
            plateNumber: u.driverProfile.plateNumber,
            insuranceExpiry: u.driverProfile.insuranceExpiry ?? null,
            rating: u.driverProfile.rating,
            serviceType: u.driverProfile.serviceType,
            bankDetails: u.driverProfile.bankDetails,
          }
        : undefined,
      dob: u.dob ?? null,
      referralCode: u.referralCode,
      referralCount,
    };
  } catch (err) {
    // 401 (expired/revoked) or network — fall through to login. Don't
    // clear the stored token here on transient failures; only clear on
    // an explicit 401 so an offline launch doesn't log the user out.
    if (err instanceof ApiError && err.status === 401) {
      await clearTokens();
    }
    return null;
  }
}

/**
 * Cached wrapper around /auth/me. The driver app hits this from many
 * screens (Profile, Documents, BankDetails, CashoutFunds, ReferAndEarn, …)
 * and the underlying record changes rarely. CACHE_TTL.CURRENT_USER bounds
 * the staleness; mutations (logout, profile updates, toggle-online) call
 * `invalidate(CACHE_KEYS.CURRENT_USER)` so a fresh fetch is guaranteed
 * when state actually changes.
 */
export async function fetchCurrentUser(): Promise<ApiUser | null> {
  return getOrFetch(
    CACHE_KEYS.CURRENT_USER,
    fetchCurrentUserUncached,
    CACHE_TTL.CURRENT_USER,
  );
}

/** Bypass the cache for the rare callers that genuinely need a hot read. */
export async function fetchCurrentUserFresh(): Promise<ApiUser | null> {
  invalidate(CACHE_KEYS.CURRENT_USER);
  return fetchCurrentUser();
}

/**
 * Update the driver's editable profile fields (name, email). Persists via
 * PUT /auth/profile, then returns the fresh user (cache invalidated).
 */
export async function updateProfile(input: {
  firstName?: string;
  lastName?: string;
  email?: string;
}): Promise<ApiUser | null> {
  await request('/auth/profile', {
    method: 'PUT',
    auth: true,
    body: JSON.stringify(input),
  });
  return fetchCurrentUserFresh();
}

/**
 * Logs the user out: tells the backend to invalidate the refresh token
 * (best-effort), then clears local tokens. Safe to call even if the server
 * call fails — local clear always runs.
 *
 * Also clears the FCM token cache. Without this, a second driver logging
 * in on the same physical device would skip token re-registration (the
 * `synced` flag was true from the previous user's session) and the
 * backend would still have the previous user's record holding this
 * device's token — pushes for the new user go to the old user's record.
 */
export async function logout(): Promise<void> {
  try {
    await request('/auth/logout', { method: 'POST', auth: true });
  } catch (err) {
    console.warn('[logout] backend call failed (continuing):', err);
  } finally {
    await clearTokens();
    // Drop every cached read — a different user logging in on the same
    // install must not see the previous user's dashboard / wallet / etc.
    clearAllCache();
    try {
      const { clearFcmToken } = await import('./fcmService');
      await clearFcmToken();
    } catch (err) {
      console.warn('[logout] fcm clear failed (continuing):', err);
    }
  }
}

export async function getStoredAccessToken(): Promise<string | null> {
  return AsyncStorage.getItem(ACCESS_TOKEN_KEY);
}

// ── App settings (public, admin-configured) ──
// The referral amounts, support contacts, etc. must come from the admin panel,
// not be hardcoded per screen (Refer & Earn used to hardcode ₹200 for both
// sides even though the referrer and joiner rewards differ). Public endpoint —
// no auth. 5-min TTL so an admin change shows up on the next visit.
export interface DriverAppSettings {
  /** Credited to the JOINER when they sign up with a code. */
  referralBonus: number;
  /** Paid to the referring DRIVER once their referee completes a first ride. */
  referrerRewardDriver: number;
  referrerRewardCustomer: number;
  supportEmail: string;
  supportPhone: string;
  currencySymbol: string;
}

const APP_SETTINGS_TTL_MS = 5 * 60 * 1000;
let cachedAppSettings: DriverAppSettings | null = null;
let cachedAppSettingsAt = 0;

export async function fetchAppSettings(force = false): Promise<DriverAppSettings | null> {
  if (!force && cachedAppSettings && Date.now() - cachedAppSettingsAt < APP_SETTINGS_TTL_MS) {
    return cachedAppSettings;
  }
  try {
    const res = await request<{ success: boolean; data: any }>('/settings/app', {
      method: 'GET',
    });
    const d = res?.data ?? {};
    const next: DriverAppSettings = {
      referralBonus: Number(d.referralBonus ?? 0),
      referrerRewardDriver: Number(d.referrerRewardDriver ?? 0),
      referrerRewardCustomer: Number(d.referrerRewardCustomer ?? 0),
      supportEmail: String(d.supportEmail ?? ''),
      supportPhone: String(d.supportPhone ?? ''),
      currencySymbol: String(d.currencySymbol ?? '₹'),
    };
    cachedAppSettings = next;
    cachedAppSettingsAt = Date.now();
    return next;
  } catch (err) {
    console.warn('[api] fetchAppSettings failed:', err);
    return cachedAppSettings; // last-known value, or null on cold failure
  }
}

/**
 * A registered driver = role is 'driver' AND profile setup is complete
 * AND admin has approved them.
 * Anything else means we route to the registration flow (or to the
 * appropriate intermediate screen — see resolveRegistrationStage).
 */
export function isRegisteredDriver(user: ApiUser): boolean {
  return (
    user.role === 'driver' &&
    user.isProfileSetup === true &&
    user.registrationStep === 'approved'
  );
}

// ── Driver registration funnel ──

export interface UpdateStepResponse {
  success: boolean;
  data: {
    registrationStep: RegistrationStep | null;
    role: string;
    isProfileSetup: boolean;
  };
}

export async function updateRegistrationStep(
  step: RegistrationStep,
  data?: Record<string, unknown>,
): Promise<UpdateStepResponse> {
  // Backend mounts the driver router at /drivers (plural), see routes/index.ts.
  const result = await request<UpdateStepResponse>('/drivers/registration/step', {
    method: 'PUT',
    auth: true,
    body: JSON.stringify({ step, data }),
  });
  // The user record just changed (role, profile fields, registrationStep);
  // drop the snapshot so the next /auth/me read is hot.
  invalidate(CACHE_KEYS.CURRENT_USER);
  return result;
}

// ── Catalogue (vehicle + fuel types) ──

export interface CatalogueType {
  _id: string;
  name: string;
  code: string;
  description?: string;
  isActive: boolean;
  sortOrder: number;
}

export async function listVehicleTypes(): Promise<CatalogueType[]> {
  const res = await request<{ success: boolean; data: { types: CatalogueType[] } }>(
    '/vehicle-types',
    { method: 'GET', auth: true },
  );
  return res.data.types;
}

// ── Driver dashboard + online toggle ──

export interface DriverDashboard {
  driver: {
    firstName: string;
    lastName: string;
    rating: number;
    isOnline: boolean;
    serviceType: 'instant' | 'private' | 'scheduled' | null;
  };
  stats: {
    totalEarnings: number;
    totalServices: number;
    upcomingServices: number;
    todayServices: number;
  };
}

async function fetchMyDashboardUncached(): Promise<DriverDashboard> {
  const res = await request<{ success: boolean; data: DriverDashboard }>(
    '/drivers/me/dashboard',
    { method: 'GET', auth: true },
  );
  return res.data;
}

/**
 * Cached driver dashboard. The home screen mounts a 30s unread-count poll
 * but the underlying stats (rating, today's services, earnings) don't move
 * that fast — a 60s TTL keeps screen-switching cheap while pull-to-refresh
 * still gets a hot read because the caller can invalidate first.
 */
export async function fetchMyDashboard(): Promise<DriverDashboard> {
  return getOrFetch(
    CACHE_KEYS.DASHBOARD,
    fetchMyDashboardUncached,
    CACHE_TTL.DASHBOARD,
  );
}

/** Pull-to-refresh handler should call this instead of fetchMyDashboard
 *  so the user gets fresh data on demand even if the TTL hasn't expired. */
export async function fetchMyDashboardFresh(): Promise<DriverDashboard> {
  invalidate(CACHE_KEYS.DASHBOARD);
  return fetchMyDashboard();
}

// ── Notifications ──

export interface NotificationApi {
  _id: string;
  title: string;
  body: string;
  type: 'ride' | 'payment' | 'promo' | 'safety' | 'system';
  data?: Record<string, any>;
  isRead: boolean;
  createdAt: string;
}

export interface NotificationsPage {
  notifications: NotificationApi[];
  unreadCount: number;
  pagination: { page: number; limit: number; total: number; pages: number };
}

export async function fetchNotifications(
  page = 1,
  limit = 30,
): Promise<NotificationsPage> {
  const res = await request<{ success: boolean; data: NotificationsPage }>(
    `/notifications?page=${page}&limit=${limit}`,
    { method: 'GET', auth: true },
  );
  return res.data;
}

/**
 * Cheap call for the dashboard bell badge — pulls one row just to surface
 * the unreadCount aggregate the API returns. Cached so screen flipping
 * doesn't pound the endpoint; mark-as-read / mark-all and inbound push
 * events should call `invalidateUnreadNotificationCount()` so the badge
 * updates instantly when state actually changes.
 */
async function fetchUnreadNotificationCountUncached(): Promise<number> {
  const res = await fetchNotifications(1, 1);
  return res.unreadCount;
}

export async function fetchUnreadNotificationCount(): Promise<number> {
  return getOrFetch(
    CACHE_KEYS.UNREAD_NOTIF_COUNT,
    fetchUnreadNotificationCountUncached,
    CACHE_TTL.UNREAD_NOTIF_COUNT,
  );
}

/** Drop the cached badge count — call this on inbound FCM/socket events
 *  so the next badge read reflects reality. */
export function invalidateUnreadNotificationCount(): void {
  invalidate(CACHE_KEYS.UNREAD_NOTIF_COUNT);
}

export async function markNotificationRead(id: string): Promise<void> {
  await request(`/notifications/${id}/read`, { method: 'PUT', auth: true });
  // Best guess: one fewer unread. Cheap optimistic update; next real fetch
  // will overwrite it. We use setCached rather than invalidate so the badge
  // doesn't flash 0 between the dispatch and the next read.
  invalidateUnreadNotificationCount();
}

export async function markAllNotificationsRead(): Promise<void> {
  await request('/notifications/read-all', { method: 'PUT', auth: true });
  setCached(CACHE_KEYS.UNREAD_NOTIF_COUNT, 0, CACHE_TTL.UNREAD_NOTIF_COUNT);
}

export interface DriverEarnings {
  today?: { total: number; completedRides: number };
  thisWeek?: { total: number; completedRides: number };
  thisMonth: {
    total: number;
    growthPct: number;
    completedRides: number;
  };
  trend: { label: string; value: number }[];
  hourlySeries?: { label: string; value: number }[]; // Daily tab — today, 4h buckets
  weekSeries?: { label: string; value: number }[]; // Weekly tab — last 7 days
  breakdown: {
    totalEarned: number;
    platformFee: number;
    fuelAllowance: number;
    netEarnings: number;
    commissionPct: number;
    fuelPct: number;
  };
}

async function fetchMyEarningsUncached(): Promise<DriverEarnings> {
  const res = await request<{ success: boolean; data: DriverEarnings }>(
    '/drivers/me/earnings',
    { method: 'GET', auth: true },
  );
  return res.data;
}

/**
 * Earnings only change when a ride completes or a cashout settles — both
 * mutations call `invalidate(CACHE_KEYS.EARNINGS)`, so the TTL can be
 * generous (5 min). Visiting the Earnings screen repeatedly between ride
 * completions reuses the cache.
 */
export async function fetchMyEarnings(): Promise<DriverEarnings> {
  return getOrFetch(
    CACHE_KEYS.EARNINGS,
    fetchMyEarningsUncached,
    CACHE_TTL.EARNINGS,
  );
}

/** Pull-to-refresh path. */
export async function fetchMyEarningsFresh(): Promise<DriverEarnings> {
  invalidate(CACHE_KEYS.EARNINGS);
  return fetchMyEarnings();
}

export async function setOnlineStatus(
  isOnline: boolean,
  coords?: { lat: number; lng: number },
): Promise<{ isOnline: boolean }> {
  const res = await request<{
    success: boolean;
    data: { isOnline: boolean };
  }>('/drivers/toggle-online', {
    method: 'PUT',
    auth: true,
    body: JSON.stringify({ isOnline, ...(coords ?? {}) }),
  });
  // Online status lives on both the dashboard and the /auth/me snapshot;
  // drop both so the next read reflects the toggle.
  invalidate(CACHE_KEYS.CURRENT_USER);
  invalidate(CACHE_KEYS.DASHBOARD);
  return res.data;
}

export async function listFuelTypes(): Promise<CatalogueType[]> {
  const res = await request<{ success: boolean; data: { types: CatalogueType[] } }>(
    '/fuel-types',
    { method: 'GET', auth: true },
  );
  return res.data.types;
}

// ── Rides (history) ──

export interface RideListItem {
  _id: string;
  status: string;
  pickup: { address: string; lat: number; lng: number };
  dropoff: { address: string; lat: number; lng: number };
  estimatedDistance: number;
  actualDistance?: number;
  estimatedDuration: number;
  actualDuration?: number;
  estimatedFare: number;
  actualFare?: number;
  driverEarnings?: number;
  paymentStatus: 'pending' | 'completed' | 'refunded' | 'failed';
  paymentMethod: 'card' | 'cash' | 'wallet';
  rideType: string;
  isScheduled?: boolean;
  startedAt?: string;
  completedAt?: string;
  createdAt: string;
  customer?: {
    _id: string;
    firstName?: string;
    lastName?: string;
    avatar?: string;
  };
}

export async function listMyRides(
  params: { page?: number; limit?: number; status?: string } = {},
): Promise<{ rides: RideListItem[]; total: number; page: number; pages: number }> {
  const qs = new URLSearchParams();
  if (params.page) qs.set('page', String(params.page));
  if (params.limit) qs.set('limit', String(params.limit));
  if (params.status) qs.set('status', params.status);
  const path = qs.toString() ? `/rides?${qs.toString()}` : '/rides';
  const res = await request<{
    success: boolean;
    data: {
      rides: RideListItem[];
      pagination: { page: number; total: number; pages: number };
    };
  }>(path, { method: 'GET', auth: true });
  return {
    rides: res.data.rides,
    total: res.data.pagination.total,
    page: res.data.pagination.page,
    pages: res.data.pagination.pages,
  };
}

export async function getRide(id: string): Promise<RideListItem> {
  const res = await request<{ success: boolean; data: { ride: RideListItem } }>(
    `/rides/${id}`,
    { method: 'GET', auth: true },
  );
  return res.data.ride;
}

// ── Wallet ──

export interface WalletData {
  wallet: { balance: number; currency: string };
  recentTransactions: WalletTransactionApi[];
}

export interface WalletTransactionApi {
  _id: string;
  type: string;
  amount: number;
  status: string;
  description?: string;
  createdAt: string;
  ride?: string;
}

async function fetchWalletUncached(): Promise<WalletData> {
  const res = await request<{ success: boolean; data: WalletData }>(
    '/payments/wallet',
    { method: 'GET', auth: true },
  );
  return res.data;
}

/**
 * Cached wallet snapshot. Recharge / cashout / ride-payment mutations
 * invalidate the entry so the next read picks up the new balance.
 */
export async function fetchWallet(): Promise<WalletData> {
  return getOrFetch(
    CACHE_KEYS.WALLET,
    fetchWalletUncached,
    CACHE_TTL.WALLET,
  );
}

export async function fetchWalletFresh(): Promise<WalletData> {
  invalidate(CACHE_KEYS.WALLET);
  return fetchWallet();
}

export interface WalletStatementPage {
  items: WalletTransactionApi[];
  pagination: { page: number; limit: number; total: number; pages: number };
}

export async function fetchWalletStatement(
  page = 1,
  limit = 30,
): Promise<WalletStatementPage> {
  const res = await request<{ success: boolean; data: WalletStatementPage }>(
    `/payments/wallet/statement?page=${page}&limit=${limit}`,
    { method: 'GET', auth: true },
  );
  return res.data;
}

export interface ReceivedAmountItem {
  _id: string;
  grossFare: number;
  commission: number;
  netEarnings: number;
  tip: number;
  at: string;
}

export interface ReceivedAmountsPage {
  items: ReceivedAmountItem[];
  pagination: { page: number; limit: number; total: number; pages: number };
}

export async function fetchReceivedAmounts(
  page = 1,
  limit = 30,
): Promise<ReceivedAmountsPage> {
  const res = await request<{ success: boolean; data: ReceivedAmountsPage }>(
    `/payments/wallet/received?page=${page}&limit=${limit}`,
    { method: 'GET', auth: true },
  );
  return res.data;
}

/**
 * Creates a Razorpay order for a wallet recharge. The hosted checkout page
 * (built via `buildRechargeCheckoutUrl`) consumes the returned IDs.
 */
export async function createRechargeOrder(amount: number): Promise<{
  orderId: string;
  amount: number; // in paise
  currency: string;
  keyId: string;
  paymentId: string;
}> {
  const res = await request<{
    success: boolean;
    data: {
      orderId: string;
      amount: number;
      currency: string;
      keyId: string;
      paymentId: string;
    };
  }>('/payments/create-order', {
    method: 'POST',
    auth: true,
    body: JSON.stringify({ amount, type: 'wallet_topup' }),
  });
  return res.data;
}

/**
 * Builds the URL of the backend's hosted Razorpay checkout page. Kept for
 * backward compat — the driver app now uses the native Razorpay SDK
 * (`react-native-razorpay`) instead of opening a browser, which closes the
 * race-condition where the wallet balance lagged behind the transaction.
 */
export function buildRechargeCheckoutUrl(opts: {
  orderId: string;
  amount: number;
  currency: string;
  keyId: string;
}): string {
  const callbackUrl = `${API_BASE_URL}/payments/checkout/callback`;
  const params = new URLSearchParams({
    orderId: opts.orderId,
    amount: String(opts.amount),
    currency: opts.currency,
    keyId: opts.keyId,
    callbackUrl,
  });
  return `${API_BASE_URL}/payments/checkout?${params.toString()}`;
}

/**
 * Verify a Razorpay payment server-side. The native checkout SDK returns a
 * payment_id + signature once the user pays; we POST those to the backend
 * which validates the HMAC, marks the Payment record completed, and credits
 * the driver's wallet. Returns the fresh wallet so the UI can update
 * without a second round-trip to GET /payments/wallet.
 */
export async function verifyRechargePayment(payload: {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}): Promise<{ payment: { _id: string; status: string }; wallet: { balance: number; currency: string } }> {
  const res = await request<{
    success: boolean;
    data: { payment: { _id: string; status: string }; wallet: { balance: number; currency: string } };
  }>('/payments/verify-payment', {
    method: 'POST',
    auth: true,
    body: JSON.stringify(payload),
  });
  // Wallet balance + transaction list both changed; next read refetches.
  invalidate(CACHE_KEYS.WALLET);
  return res.data;
}

/**
 * Mark a Payment record as 'failed' when the user dismisses the Razorpay
 * sheet without completing payment. Without this the row sits in 'pending'
 * forever and shows a stale "Pending" badge in the wallet statement.
 * Best-effort — we don't surface errors because the user has already moved
 * on; if the backend update fails the row just stays as pending.
 */
export async function cancelRechargeOrder(razorpay_order_id: string): Promise<void> {
  try {
    await request<{ success: boolean }>('/payments/cancel-order', {
      method: 'POST',
      auth: true,
      body: JSON.stringify({ razorpay_order_id }),
    });
  } catch (err) {
    console.warn('[recharge] cancel-order failed (non-fatal):', err);
  }
}

// ── OnePass (driver subscription — PAID via Razorpay) ──

export interface OnePassPlan {
  key: string;
  label: string;
  price: number;
  days: number;
  currency: string;
}

export async function fetchOnePassPlans(): Promise<OnePassPlan[]> {
  const res = await request<{ success: boolean; data: { plans: OnePassPlan[] } }>(
    '/drivers/onepass/plans',
    { method: 'GET', auth: true },
  );
  return res.data.plans ?? [];
}

export interface OnePassStatus {
  isActive: boolean;
  expiresAt: string | null;
}

export async function fetchOnePassStatus(): Promise<OnePassStatus> {
  const res = await request<{ success: boolean; data: OnePassStatus }>(
    '/drivers/onepass/status',
    { method: 'GET', auth: true },
  );
  return res.data;
}

/** Create a Razorpay order for a OnePass plan (price is server-authoritative). */
export async function createOnePassOrder(plan: string): Promise<{
  orderId: string;
  amount: number;
  currency: string;
  keyId: string;
  paymentId: string;
}> {
  const res = await request<{
    success: boolean;
    data: { orderId: string; amount: number; currency: string; keyId: string; paymentId: string };
  }>('/payments/create-order', {
    method: 'POST',
    auth: true,
    body: JSON.stringify({ type: 'subscription', plan }),
  });
  return res.data;
}

/** Verify the OnePass payment. The backend activates OnePass on success. */
export async function verifyOnePassPayment(payload: {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}): Promise<void> {
  await request<{ success: boolean }>('/payments/verify-payment', {
    method: 'POST',
    auth: true,
    body: JSON.stringify(payload),
  });
  // OnePass flag lives on the /auth/me snapshot — drop it so status refreshes.
  invalidate(CACHE_KEYS.CURRENT_USER);
}

// ── Driver incentives (read-only) ──

export interface IncentiveRule {
  _id: string;
  name: string;
  description?: string;
  period: string;
  target: 'rides' | 'earnings';
  threshold: number;
  rewardType: 'flat' | 'percentage';
  rewardAmount: number;
  minRating?: number;
}

export interface IncentiveProgress {
  _id?: string;
  progress?: number;
  threshold?: number;
  rewardAmount?: number;
  paidOut?: boolean;
  periodKey?: string;
  periodStart?: string;
  incentive?: any;
}

export async function fetchIncentives(): Promise<
  { incentive: IncentiveRule; progress: IncentiveProgress | null }[]
> {
  const res = await request<{
    success: boolean;
    data: { items: { incentive: IncentiveRule; progress: IncentiveProgress | null }[] };
  }>('/drivers/incentives', { method: 'GET', auth: true });
  return res.data.items ?? [];
}

export async function fetchIncentiveHistory(): Promise<IncentiveProgress[]> {
  const res = await request<{ success: boolean; data: { items: IncentiveProgress[] } }>(
    '/drivers/incentives/history',
    { method: 'GET', auth: true },
  );
  return res.data.items ?? [];
}

// ── Driver ratings / feedback ──

export interface DriverRatings {
  overallRating: number;
  totalRides: number;
  weeklyTrend: number[];
  metrics: { label: string; value: number }[];
  comments: {
    id: string;
    stars: number;
    text: string;
    source: string;
    reviewerName?: string;
    reviewerAvatar?: string | null;
    date?: string | null;
  }[];
}

export async function fetchMyRatings(): Promise<DriverRatings> {
  const res = await request<{ success: boolean; data: DriverRatings }>(
    '/drivers/me/ratings',
    { method: 'GET', auth: true },
  );
  return res.data;
}

// ── Scheduled journeys (shuttle operation) ──

export interface JourneySummary {
  journeyKey: string;
  routeId: string;
  routeName: string;
  from: string;
  to: string;
  stopCount: number;
  departureDate: string;
  departureIndex: number;
  departureTime: string;
  seatPrice: number;
  totalSeats: number;
  status: 'scheduled' | 'active' | 'in_progress' | 'completed' | 'cancelled';
  currentStopIndex: number;
  passengerCount: number;
  boardedCount: number;
  bookingCount: number;
  startedAt: string | null;
  completedAt: string | null;
  earnings: number;
}

export interface JourneyStop {
  index: number;
  name: string;
  sequence: number;
}

export interface JourneyPassenger {
  bookingId: string;
  seat: number;
  name: string;
  contact: string;
  boarded: boolean;
  noShow: boolean;
  /** Got off early (before their booked stop) — no longer on board. */
  dropped?: boolean;
  gender?: 'F' | 'M';
  age?: number;
  stop?: number;
}

export async function fetchJourneys(scope: 'upcoming' | 'past'): Promise<JourneySummary[]> {
  const res = await request<{ success: boolean; data: { items: JourneySummary[] } }>(
    `/drivers/journeys?scope=${scope}`,
    { method: 'GET', auth: true },
  );
  return res.data.items ?? [];
}

export async function fetchJourney(
  key: string,
): Promise<{ journey: JourneySummary; stops: JourneyStop[] }> {
  const res = await request<{ success: boolean; data: { journey: JourneySummary; stops: JourneyStop[] } }>(
    `/drivers/journeys/${key}`,
    { method: 'GET', auth: true },
  );
  return res.data;
}

export async function fetchJourneyPassengers(
  key: string,
): Promise<{ passengers: JourneyPassenger[]; total: number; boarded: number; noShow: number; dropped?: number; onBoard?: number }> {
  const res = await request<{
    success: boolean;
    data: { passengers: JourneyPassenger[]; total: number; boarded: number; noShow: number; dropped?: number; onBoard?: number };
  }>(`/drivers/journeys/${key}/passengers`, { method: 'GET', auth: true });
  return res.data;
}

export async function startJourney(key: string): Promise<{ status: string; currentStopIndex: number }> {
  const res = await request<{ success: boolean; data: { status: string; currentStopIndex: number } }>(
    `/drivers/journeys/${key}/start`,
    { method: 'POST', auth: true },
  );
  return res.data;
}

export async function checkInPassenger(
  key: string,
  bookingId: string,
  seats?: number[],
): Promise<void> {
  await request(`/drivers/journeys/${key}/checkin`, {
    method: 'POST',
    auth: true,
    body: JSON.stringify({ bookingId, seats }),
  });
}

export async function markNoShow(
  key: string,
  bookingId: string,
  seats?: number[],
): Promise<void> {
  await request(`/drivers/journeys/${key}/no-show`, {
    method: 'POST',
    auth: true,
    body: JSON.stringify({ bookingId, seats }),
  });
}

/** Record an early drop for a boarded passenger (rider got off before their
 *  booked stop). The seat stays boarded (still earns); does not end the trip. */
export async function dropPassengerEarly(
  key: string,
  bookingId: string,
  seats?: number[],
): Promise<void> {
  await request(`/drivers/journeys/${key}/drop`, {
    method: 'POST',
    auth: true,
    body: JSON.stringify({ bookingId, seats }),
  });
}

/** A pending customer-initiated early-drop request awaiting the driver's
 *  approval. Delivered live over the socket + fetchable on resume. */
export interface EarlyDropRequest {
  bookingId: string;
  customerName: string;
  contact?: string;
  seats: number[];
  reason?: string;
  routeId?: string;
  departureIndex?: number;
  departureDate?: string;
  requestedAt?: string | null;
}

/** Summary returned when the driver approves — the recomputed partial fare +
 *  refund, shown on the drop-complete screen. */
export interface EarlyDropApproveResult {
  originalFare: number;
  partialFare: number;
  refund: number;
  refundMethod?: string;
  dropStopName?: string;
}

/** Approve a rider's early-drop request: recomputes the partial fare, refunds
 *  the difference, and records the drop. */
export async function approveEarlyDrop(bookingId: string): Promise<EarlyDropApproveResult> {
  const res = await request<{ success: boolean; data: EarlyDropApproveResult }>(
    `/drivers/journeys/early-drop/${bookingId}/approve`,
    { method: 'POST', auth: true },
  );
  return res.data;
}

/** Decline a rider's early-drop request (can't safely stop). */
export async function declineEarlyDrop(bookingId: string, reason?: string): Promise<void> {
  await request(`/drivers/journeys/early-drop/${bookingId}/decline`, {
    method: 'POST',
    auth: true,
    body: JSON.stringify(reason ? { reason } : {}),
  });
}

/** Early-drop requests currently awaiting this driver — fetched on app resume
 *  so a request that arrived while backgrounded isn't missed. */
export async function fetchPendingEarlyDrops(): Promise<EarlyDropRequest[]> {
  const res = await request<{ success: boolean; data: { requests: EarlyDropRequest[] } }>(
    `/drivers/journeys/early-drop/pending`,
    { method: 'GET', auth: true },
  );
  return res.data?.requests ?? [];
}

/** The driver's rating of the riders on their trip. Each entry is stored on
 *  the matching booking (scoped to this driver's journey). */
export async function rateJourneyPassengers(
  key: string,
  ratings: { bookingId: string; rating: number; comment?: string }[],
): Promise<{ updated: number }> {
  const res = await request<{ success: boolean; data: { updated: number } }>(
    `/drivers/journeys/${key}/rate-passengers`,
    { method: 'POST', auth: true, body: JSON.stringify({ ratings }) },
  );
  return res.data;
}

export async function verifyJourneyQr(
  key: string,
  qr: string,
): Promise<{ valid: boolean; passenger?: any; message?: string }> {
  try {
    const res = await request<{ success: boolean; valid: boolean; data?: { passenger: any } }>(
      `/drivers/journeys/${key}/verify-qr`,
      { method: 'POST', auth: true, body: JSON.stringify({ qr }) },
    );
    return { valid: res.valid, passenger: res.data?.passenger };
  } catch (err) {
    return { valid: false, message: err instanceof ApiError ? err.message : 'Invalid ticket' };
  }
}

export async function advanceJourney(
  key: string,
  toStopIndex?: number,
): Promise<{ currentStopIndex: number; atDestination: boolean }> {
  const res = await request<{ success: boolean; data: { currentStopIndex: number; atDestination: boolean } }>(
    `/drivers/journeys/${key}/advance`,
    { method: 'POST', auth: true, body: JSON.stringify({ toStopIndex }) },
  );
  return res.data;
}

export async function completeJourney(
  key: string,
): Promise<{ earnings: number; boardedSeatCount?: number; gross?: number }> {
  // Earnings just settled → wallet + earnings views are stale.
  invalidate(CACHE_KEYS.EARNINGS);
  invalidate(CACHE_KEYS.WALLET);
  invalidate(CACHE_KEYS.DASHBOARD);
  const res = await request<{ success: boolean; data: { earnings: number; boardedSeatCount?: number; gross?: number } }>(
    `/drivers/journeys/${key}/complete`,
    { method: 'POST', auth: true },
  );
  return res.data;
}

export interface CashoutResponse {
  payment: {
    _id: string;
    amount: number;
    status: string;
    payoutMethod?: 'bank' | 'upi';
    payoutDestination?: {
      bankName?: string;
      accountLast4?: string;
      upiId?: string;
    };
  };
  wallet: { balance: number; currency: string };
}

export async function requestCashout(input: {
  amount: number;
  method: 'bank' | 'upi';
  upiId?: string;
}): Promise<CashoutResponse> {
  const res = await request<{ success: boolean; data: CashoutResponse }>(
    '/payments/wallet/cashout',
    {
      method: 'POST',
      auth: true,
      body: JSON.stringify(input),
    },
  );
  // Wallet balance + earnings both shift on cashout.
  invalidate(CACHE_KEYS.WALLET);
  invalidate(CACHE_KEYS.EARNINGS);
  return res.data;
}

// ── Support ticket (Help & Support) ──

export async function createSupportTicket(input: {
  subject: string;
  description: string;
  category?: string;
  tags?: string[];
  metadata?: Record<string, any>;
}): Promise<{ ticketNumber: string; _id: string }> {
  const res = await request<{
    success: boolean;
    data: { ticketNumber: string; _id: string };
  }>('/support/tickets', {
    method: 'POST',
    auth: true,
    body: JSON.stringify(input),
  });
  return { ticketNumber: res.data.ticketNumber, _id: res.data._id };
}

// ── FAQs (admin-managed Help & Support content) ──

export interface Faq {
  _id: string;
  question: string;
  answer: string;
  order?: number;
}

/**
 * Active FAQ entries flagged for the driver app (audience 'driver' or
 * 'both'), already sorted by the admin-defined order. The Help & Support
 * screen falls back to a bundled list if this returns nothing.
 */
export async function fetchFaqs(): Promise<Faq[]> {
  const res = await request<{ success: boolean; data: { faqs: Faq[] } }>(
    '/support/faqs',
    { method: 'GET', auth: true },
  );
  return res?.data?.faqs ?? [];
}

// ── Document update requests (driver-initiated, routed via support tickets) ──

/**
 * Driver-initiated document change request. Creates a support ticket tagged
 * 'doc-update' so admin can filter for these specifically. The (optional)
 * new file URL is included in the description and attached to the first
 * message so admin can preview it inline.
 */
export async function requestDocumentChange(input: {
  docType: string;
  docTitle: string;
  reason: string;
  newFileUrl?: string;
}): Promise<{ ticketNumber: string }> {
  const description = [
    `Document: ${input.docTitle}`,
    `Reason: ${input.reason}`,
    input.newFileUrl ? `Proposed new file: ${input.newFileUrl}` : null,
  ]
    .filter(Boolean)
    .join('\n');
  return createSupportTicket({
    subject: `Document update request — ${input.docTitle}`,
    description,
    category: 'account',
    tags: ['doc-update'],
    metadata: {
      docType: input.docType,
      newFileUrl: input.newFileUrl ?? null,
    },
  });
}

export interface MySupportTicket {
  _id: string;
  ticketNumber: string;
  subject: string;
  status: 'open' | 'pending_user' | 'in_progress' | 'resolved' | 'closed';
  tags?: string[];
  createdAt: string;
  updatedAt: string;
  metadata?: { docType?: string };
}

/**
 * Returns the tickets opened by the current driver, used by DocumentsScreen
 * to surface a "change requested" pill on docs with a pending request.
 */
export async function listMySupportTickets(): Promise<MySupportTicket[]> {
  const res = await request<{
    success: boolean;
    data: { items: MySupportTicket[] };
  }>('/support/tickets?limit=50', { method: 'GET', auth: true });
  return res.data.items ?? [];
}

// ── Ride accept / reject (driver) ──

export interface AcceptedRide {
  _id: string;
  status: string;
  pickup: { address: string; lat: number; lng: number };
  dropoff: { address: string; lat: number; lng: number };
  estimatedFare?: number;
  customer?: {
    _id: string;
    firstName?: string;
    lastName?: string;
    phone?: string;
  };
}

/**
 * First-driver-wins claim. Returns the ride document with customer +
 * driver populated, or throws if a faster driver already grabbed it (the
 * backend returns 400 in that case so the modal can show a toast).
 */
export async function acceptRideRequest(rideId: string): Promise<AcceptedRide> {
  const res = await request<{ success: boolean; data: { ride: AcceptedRide } }>(
    `/rides/${rideId}/accept`,
    { method: 'PUT', auth: true },
  );
  return res.data.ride;
}

export interface ActiveRide {
  _id: string;
  status: string;
  isPrivate?: boolean;
  pickup: { address?: string; lat?: number; lng?: number };
  dropoff: { address?: string; lat?: number; lng?: number };
  estimatedFare?: number;
  estimatedDistance?: number;
  estimatedDuration?: number;
  customer?: {
    _id?: string;
    firstName?: string;
    lastName?: string;
    phone?: string;
    avatar?: string | null;
  };
}

/**
 * The driver's current in-flight ride, if any. Used on cold start to resume
 * the right screen (verify-OTP / in-progress) instead of dropping the driver
 * on the dashboard mid-trip. Returns null when there's no active ride.
 *
 * Backend scopes the result to the authenticated driver and only returns
 * rides in an active status (driver_assigned … in_progress).
 */
export async function getActiveRide(): Promise<ActiveRide | null> {
  const res = await request<{ success: boolean; data: { ride: ActiveRide | null } }>(
    `/rides/active`,
    { method: 'GET', auth: true },
  );
  return res.data?.ride ?? null;
}

/** Raw ride-request payload — matches the backend socket `ride:new-request`
 *  and `GET /rides/available` shape (numbers, not display strings). */
export interface AvailableRidePayload {
  rideId: string;
  variant: 'instant' | 'private';
  passengerName: string;
  pickup: string;
  drop: string;
  pickupLat: number;
  pickupLng: number;
  dropLat?: number;
  dropLng?: number;
  fare: number;
  distance: number;
  duration: number;
}

/**
 * Pull the ride requests currently offered to this driver. The REST complement
 * to the socket `ride:new-request` push — works on a multi-instance / split
 * backend where the socket emit can't reach the driver's process, so the
 * dashboard's in-app request list stays reliable even when only FCM arrives.
 * Returns [] when the driver is offline / has no fix (server-gated).
 */
export async function getAvailableRides(): Promise<AvailableRidePayload[]> {
  const res = await request<{
    success: boolean;
    data: { rides: AvailableRidePayload[] };
  }>(`/rides/available`, { method: 'GET', auth: true });
  return res.data?.rides ?? [];
}

export async function rejectRideRequest(
  rideId: string,
  reason?: string,
): Promise<void> {
  await request<{ success: boolean }>(`/rides/${rideId}/reject`, {
    method: 'PUT',
    auth: true,
    body: JSON.stringify({ reason }),
  });
}

/**
 * Driver enters the 4-digit OTP the passenger reads aloud. Backend either
 * accepts (status flips to 'in_progress' and broadcasts to the customer)
 * or rejects with a message we can surface in the UI.
 */
export async function verifyRideOtp(
  rideId: string,
  otp: string,
): Promise<void> {
  await request<{ success: boolean }>(`/rides/${rideId}/verify-otp`, {
    method: 'PUT',
    auth: true,
    body: JSON.stringify({ otp }),
  });
}

/**
 * Driver rates the passenger after the trip. The backend's /rate endpoint
 * detects the requester is the driver and stores it as `driverToCustomer`.
 * Only accepted once the ride has settled to `completed`.
 */
export async function rateRide(
  rideId: string,
  rating: number,
  comment?: string,
): Promise<void> {
  await request<{ success: boolean }>(`/rides/${rideId}/rate`, {
    method: 'PUT',
    auth: true,
    body: JSON.stringify({ rating, comment }),
  });
}

/**
 * Manually progress the ride state machine from the driver app:
 *   driver_assigned  → driver_arriving  (driver started moving)
 *   driver_arriving  → driver_arrived   (at pickup)
 *   driver_arrived   → in_progress      (handled by verify-otp instead)
 *   in_progress      → completed        (drop-off reached)
 *
 * Backend rejects invalid transitions with 400, so a stale UI can't break
 * the state machine.
 */
export async function updateRideStatus(
  rideId: string,
  status:
    | 'driver_arriving'
    | 'driver_arrived'
    | 'in_progress'
    | 'payment_pending'
    | 'completed',
): Promise<void> {
  // Settlement (the payment_pending → completed transition) shifts earnings,
  // the dashboard's today/upcoming counts, and the wallet balance — drop
  // them all so the next read is hot. We also do it for payment_pending in
  // case the dashboard needs to refresh its "current ride" view.
  if (status === 'completed' || status === 'payment_pending') {
    invalidate(CACHE_KEYS.EARNINGS);
    invalidate(CACHE_KEYS.DASHBOARD);
    invalidate(CACHE_KEYS.WALLET);
  }
  await request<{ success: boolean }>(`/rides/${rideId}/status`, {
    method: 'PUT',
    auth: true,
    body: JSON.stringify({ status }),
  });
}

/**
 * Driver-only: confirm the rider paid cash for a `payment_pending` ride.
 * Flips the ride to `completed` and credits the driver's earnings on the
 * server side.
 */
export async function confirmCashCollected(rideId: string): Promise<void> {
  invalidate(CACHE_KEYS.EARNINGS);
  invalidate(CACHE_KEYS.DASHBOARD);
  invalidate(CACHE_KEYS.WALLET);
  await request<{ success: boolean }>(`/payments/rides/${rideId}/confirm-cash`, {
    method: 'POST',
    auth: true,
  });
}

// ── Bank update request (uses support ticket as the change-request channel) ──

export async function requestBankDetailsUpdate(input: {
  newBankName?: string;
  newAccountHolder?: string;
  newAccountNumber?: string;
  newIfsc?: string;
  reason?: string;
}): Promise<void> {
  const description = [
    input.reason && `Reason: ${input.reason}`,
    input.newAccountHolder && `Account Holder: ${input.newAccountHolder}`,
    input.newBankName && `Bank Name: ${input.newBankName}`,
    input.newAccountNumber && `Account Number: ${input.newAccountNumber}`,
    input.newIfsc && `IFSC: ${input.newIfsc}`,
  ]
    .filter(Boolean)
    .join('\n');
  await createSupportTicket({
    subject: 'Bank details update request',
    description: description || 'Driver requested a bank details update.',
    category: 'payment',
  });
}

// ── Address autocomplete (Google Places via backend proxy) ──

export interface AddressHit {
  id: string;
  displayName: string;
  address: string;
  lat: number;
  lng: number;
  parts: {
    houseNumber: string;
    road: string;
    area: string;
    city: string;
    state: string;
    pincode: string;
    country: string;
    countryCode: string;
  };
}

// ── Driver documents (upload + status) ──

export type DocumentType =
  | 'licence'
  | 'aadhaar'
  | 'aadhaar-front'
  | 'aadhaar-back'
  | 'profile-photo'
  | 'vehicle'
  | 'insurance'
  | 'dbs'
  | 'phv'
  // Pollution Under Control certificate (vehicle document).
  | 'puc';

export interface DriverDocument {
  type: string;
  url: string;
  status: 'pending' | 'verified' | 'rejected';
  expiry?: string;
  /** Why an admin rejected this doc — shown to the driver so they know what
   *  to fix. */
  rejectionReason?: string;
  reviewedAt?: string;
  resubmittedAt?: string;
}

export interface UploadedFile {
  uri: string;
  fileName?: string | null;
  type?: string | null;
}

/**
 * The backend only accepts image/jpeg, image/png, image/webp and
 * application/pdf. Some pickers report the non-standard 'image/jpg', and
 * iPhones can report 'image/heic'/'image/heif' — normalise those to
 * image/jpeg (the picker re-encodes to JPEG when resizing, so the bytes
 * match). Anything unknown falls back to image/jpeg rather than being
 * rejected server-side.
 */
function normalizeMime(type?: string | null): string {
  const t = (type || '').toLowerCase();
  if (t === 'image/png' || t === 'image/webp' || t === 'application/pdf') return t;
  return 'image/jpeg';
}

/**
 * Uploads a single driver document to the backend (which streams it to S3
 * under driver/{id}/docs/{type}/...). Returns the public URL.
 *
 * On the upload side this is a multipart POST — we have to construct the
 * FormData manually because RN's fetch handles the boundary itself.
 */
export async function uploadDocument(
  file: UploadedFile,
  type: DocumentType,
): Promise<{ url: string; key: string }> {
  const token = await AsyncStorage.getItem(ACCESS_TOKEN_KEY);
  if (!token) throw new ApiError('Not signed in', 401, null);

  const form = new FormData();
  // RN's FormData expects { uri, name, type } for files.
  form.append('file', {
    uri: file.uri,
    name: file.fileName || `${type}.jpg`,
    type: normalizeMime(file.type),
  } as any);
  form.append('type', type);

  const res = await fetch(`${API_BASE_URL}/uploads`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      // NOTE: do NOT set Content-Type — RN sets it with the multipart boundary.
    },
    body: form as any,
  });
  const text = await res.text();
  const json = text ? safeParseJson(text) : null;
  if (!res.ok) {
    const message = json?.message || `Upload failed (${res.status})`;
    throw new ApiError(message, res.status, json);
  }
  return { url: json.data?.url, key: json.data?.key };
}

/**
 * Uploads a profile picture and lets the backend persist it on the user
 * record (uploadController updates user.avatar when type === 'avatar').
 */
export async function uploadAvatar(
  file: UploadedFile,
): Promise<{ url: string; key: string }> {
  const token = await AsyncStorage.getItem(ACCESS_TOKEN_KEY);
  if (!token) throw new ApiError('Not signed in', 401, null);

  const form = new FormData();
  form.append('file', {
    uri: file.uri,
    name: file.fileName || 'avatar.jpg',
    type: normalizeMime(file.type),
  } as any);
  form.append('type', 'avatar');

  const res = await fetch(`${API_BASE_URL}/uploads`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: form as any,
  });
  const text = await res.text();
  const json = text ? safeParseJson(text) : null;
  if (!res.ok) {
    const message = json?.message || `Upload failed (${res.status})`;
    throw new ApiError(message, res.status, json);
  }
  // user.avatar just changed — drop the cached profile snapshot.
  invalidate(CACHE_KEYS.CURRENT_USER);
  return { url: json.data?.url, key: json.data?.key };
}

/**
 * Returns the current user's driver documents (with statuses), pulled
 * fresh from /auth/me. Used by the reupload screen + driver-details
 * resume flow.
 */
export async function getMyDocuments(): Promise<DriverDocument[]> {
  const user = await fetchCurrentUserRaw();
  return user?.driverProfile?.documents ?? [];
}

async function fetchCurrentUserRaw(): Promise<any> {
  const token = await AsyncStorage.getItem(ACCESS_TOKEN_KEY);
  if (!token) return null;
  const res = await request<{ success: boolean; data: { user: any } }>(
    '/auth/me',
    { method: 'GET', auth: true },
  );
  return res?.data?.user ?? null;
}

export async function searchAddress(
  q: string,
  countryCodes = 'in',
): Promise<AddressHit[]> {
  if (q.trim().length < 2) return [];
  const params = new URLSearchParams({ q, countrycodes: countryCodes });
  const res = await request<{ success: boolean; data: { results: AddressHit[] } }>(
    `/geo/autocomplete?${params.toString()}`,
    { method: 'GET', auth: true },
  );
  return res.data.results ?? [];
}

export interface GeoDirections {
  polyline: { lat: number; lng: number }[];
  distanceMeters: number;
  durationSeconds: number;
  /** Which routing engine produced this: 'google' | 'osrm' | 'straight'. */
  provider?: string;
}

/**
 * Driving directions via the backend `/geo/directions` (Google Directions →
 * OSRM → straight-line fallback, same route the customer app uses). Preferred
 * over hitting the public OSRM demo server straight from the handset — that
 * server is rate-limited and unauthenticated, which is why drivers sometimes
 * saw no route at all. Returns null on failure so callers can fall back.
 */
export async function getDirections(
  origin: { lat: number; lng: number },
  dest: { lat: number; lng: number },
): Promise<GeoDirections | null> {
  try {
    const params = new URLSearchParams({
      originLat: String(origin.lat),
      originLng: String(origin.lng),
      destLat: String(dest.lat),
      destLng: String(dest.lng),
    });
    const res = await request<{ success: boolean; data: GeoDirections }>(
      `/geo/directions?${params.toString()}`,
      { method: 'GET', auth: true },
    );
    return res?.data ?? null;
  } catch {
    return null;
  }
}

/**
 * Raise a safety SOS. Opens an urgent 'safety' support ticket for ops (with the
 * driver's live location + emergency contacts) and, during a ride, pushes to
 * the ride room so the live map flags it. Best-effort location.
 */
export async function sendSos(
  loc?: { lat?: number; lng?: number } | null,
  rideId?: string,
): Promise<void> {
  await request('/safety/sos', {
    method: 'POST',
    auth: true,
    body: JSON.stringify({ lat: loc?.lat, lng: loc?.lng, rideId }),
  });
}

// ── Scheduled routes (driver registration + browsing) ──

export interface RouteStop {
  name: string;
  address?: string;
  lat: number;
  lng: number;
  sequence: number;
  fareFromPrevious?: number;
  /** Indian 6-digit PIN captured by admin when picking the stop. May be
   *  absent on legacy stops saved before this field existed. */
  pincode?: string;
}

export interface RouteDeparture {
  stopIndex: number;
  /** Local time HH:mm. */
  time: string;
}

export interface RouteSchedule {
  daysOfWeek: number[];
  departures: RouteDeparture[];
  seatPrice?: number;
  vehicleType?: string;
  totalSeats?: number;
}

export interface ScheduledRouteApi {
  _id: string;
  name: string;
  description?: string;
  type: 'private' | 'scheduled';
  stops: RouteStop[];
  corridorBufferMeters: number;
  schedule?: RouteSchedule;
  approvedDriverCount?: number;
  approvedDepartureIndexes?: number[];
}

export async function fetchScheduledRoutes(opts: {
  /** Customer-side: only routes that have at least one approved driver. */
  hasApprovedDriver?: boolean;
} = {}): Promise<ScheduledRouteApi[]> {
  const params = new URLSearchParams();
  if (opts.hasApprovedDriver) params.set('hasApprovedDriver', 'true');
  const qs = params.toString();
  const res = await request<{ success: boolean; data: { routes: ScheduledRouteApi[] } }>(
    `/routes/scheduled${qs ? `?${qs}` : ''}`,
    { method: 'GET', auth: true },
  );
  return res.data.routes ?? [];
}

export async function fetchRouteById(id: string): Promise<ScheduledRouteApi> {
  const res = await request<{ success: boolean; data: { route: ScheduledRouteApi } }>(
    `/routes/${id}`,
    { method: 'GET', auth: true },
  );
  return res.data.route;
}

/**
 * Driver picks a route + a specific departure slot. Backend creates a
 * pending registration; admin reviews and approves.
 */
export async function registerForRoute(
  routeId: string,
  payload: {
    /** Free-form 24h "HH:mm" time the driver picked. Backend will reuse an
     *  existing admin-defined slot if one matches, or append a new one. */
    departureTime?: string;
    /** Legacy path: register against a specific existing admin slot index.
     *  Either this or departureTime must be supplied. */
    departureIndex?: number;
    roundTrip?: boolean;
  },
): Promise<{ status: 'pending' }> {
  const res = await request<{
    success: boolean;
    data: { routeId: string; departureIndex: number; status: 'pending' };
  }>(`/routes/${routeId}/register`, {
    method: 'POST',
    auth: true,
    body: JSON.stringify(payload),
  });
  return { status: res.data.status };
}

export interface MyRouteRegistration {
  route: {
    _id: string;
    name: string;
    description?: string;
    stops: RouteStop[];
    schedule?: RouteSchedule;
  };
  status: 'pending' | 'approved' | 'rejected' | 'removed';
  departureIndex?: number;
  roundTrip?: boolean;
  registeredAt?: string;
}

export async function fetchMyRouteRegistration(): Promise<MyRouteRegistration | null> {
  const res = await request<{
    success: boolean;
    data: { registration: MyRouteRegistration | null };
  }>('/routes/my-registration', { method: 'GET', auth: true });
  return res.data.registration;
}

/**
 * Pulls the persisted chat thread for a ride. Returns null if no chat
 * doc exists yet (first message of a new ride creates it server-side).
 */
export async function fetchChatHistory(rideId: string): Promise<{
  messages: Array<{ _id?: string; sender: any; content: string; createdAt: string }>;
} | null> {
  try {
    const res = await request<{
      success: boolean;
      data: { chat: any | null; messages?: any[] };
    }>(`/chat/${rideId}`, { method: 'GET', auth: true });
    return res.data?.chat ?? null;
  } catch {
    return null;
  }
}
