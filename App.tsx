import './global.css';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, AppState, BackHandler, Linking, Modal, StatusBar, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import DriverBottomNav from './src/components/DriverBottomNav';
import RideRequestModal from './src/components/RideRequestModal';
import {
  buzzForRideAlert,
  ensureFcmTokenRegistered,
  initFcm,
  PENDING_RIDE_REQUEST_KEY,
  resyncFcmTokenIfPending,
  stopRideAlert,
} from './src/services/fcmService';
import {
  connectSocket,
  setSocketListeners,
} from './src/services/socketService';
import { startLocationReporting } from './src/services/locationReporter';
import {
  acceptRideRequest as apiAcceptRide,
  rejectRideRequest as apiRejectRide,
  getActiveRide,
  getAvailableRides,
  rateRide as apiRateRide,
  logout as apiLogout,
  approveEarlyDrop,
  declineEarlyDrop,
  fetchPendingEarlyDrops,
  type EarlyDropApproveResult,
} from './src/services/api';
import RatePassengerModal from './src/components/RatePassengerModal';
import { DriverMenuSheet, type DriverMenuItem } from './src/components/DriverMenuSheet';
import {
  WalletIcon,
  BellIcon,
  DocumentIcon,
  BankIcon,
  GiftIcon,
  HelpIcon,
  LogoutIcon,
  TicketIcon,
} from './src/components/icons/ServiceTypeIcons';
import {
  hasCriticalDriverPermissions,
  requestAllDriverPermissions,
} from './src/services/permissions';
import { useUserStore } from './src/store';
import { AccountRejectedScreen } from './src/screens/AccountRejectedScreen';
import { ChooseLanguageScreen } from './src/screens/ChooseLanguageScreen';
import { ChooseScheduledRouteScreen } from './src/screens/ChooseScheduledRouteScreen';
import { ChooseServiceTypeScreen } from './src/screens/ChooseServiceTypeScreen';
import { CompleteProfileScreen } from './src/screens/CompleteProfileScreen';
import { DriverDashboardScreen } from './src/screens/DriverDashboardScreen';
import { DriverDetailsScreen } from './src/screens/DriverDetailsScreen';
import { DriverRegistrationHomeScreen } from './src/screens/DriverRegistrationHomeScreen';
import { LoginScreen } from './src/screens/LoginScreen';
import { OwnerDetailsScreen } from './src/screens/OwnerDetailsScreen';
import { RegistrationPendingScreen } from './src/screens/RegistrationPendingScreen';
import { PermissionsGateScreen } from './src/screens/PermissionsGateScreen';
import { SplashScreen } from './src/screens/SplashScreen';
import { VehicleDetailsScreen } from './src/screens/VehicleDetailsScreen';
import { VerifyOtpScreen } from './src/screens/VerifyOtpScreen';
import { VerifyRideOtpScreen } from './src/screens/VerifyRideOtpScreen';
import { RideInProgressScreen } from './src/screens/RideInProgressScreen';
import { RideChatScreen } from './src/screens/RideChatScreen';
import { RideSummaryScreen } from './src/screens/RideSummaryScreen';
import { EarningsScreen } from './src/screens/EarningsScreen';
import { ProfileScreen } from './src/screens/ProfileScreen';
import { DocumentsScreen } from './src/screens/DocumentsScreen';
import { BankDetailsScreen } from './src/screens/BankDetailsScreen';
import { NotificationsScreen } from './src/screens/NotificationsScreen';
import { HistoryScreen } from './src/screens/HistoryScreen';
import { HistoryDetailScreen } from './src/screens/HistoryDetailScreen';
import { WalletScreen } from './src/screens/WalletScreen';
import { RechargeWalletScreen } from './src/screens/RechargeWalletScreen';
import { OnePassScreen } from './src/screens/OnePassScreen';
import { IncentivesScreen } from './src/screens/IncentivesScreen';
import { CashoutFundsScreen } from './src/screens/CashoutFundsScreen';
import { CashoutSuccessScreen } from './src/screens/CashoutSuccessScreen';
import { ReceivedAmountScreen } from './src/screens/ReceivedAmountScreen';
import { WalletStatementScreen } from './src/screens/WalletStatementScreen';
import { ReferAndEarnScreen } from './src/screens/ReferAndEarnScreen';
import { HelpSupportScreen } from './src/screens/HelpSupportScreen';
import { DriverInstructionsScreen } from './src/screens/DriverInstructionsScreen';
import { ScheduledJourneysScreen } from './src/screens/ScheduledJourneysScreen';
import { CompletedRideScreen } from './src/screens/CompletedRideScreen';
import { RideActivationScreen } from './src/screens/RideActivationScreen';
import { UpcomingBookingDetailsScreen } from './src/screens/UpcomingBookingDetailsScreen';
import { PassengerCheckInScreen } from './src/screens/PassengerCheckInScreen';
import { QRVerificationScreen } from './src/screens/QRVerificationScreen';
import { QRVerifiedScreen } from './src/screens/QRVerifiedScreen';
import { BoardingSummaryScreen } from './src/screens/BoardingSummaryScreen';
import { JourneyInProgressScreen } from './src/screens/JourneyInProgressScreen';
import { EmergencyAlertScreen, type IncomingEarlyDrop } from './src/screens/EmergencyAlertScreen';
import { EmergencyDropSummaryScreen } from './src/screens/EmergencyDropSummaryScreen';
import { RatePassengersScreen } from './src/screens/RatePassengersScreen';
import { DestinationReachedScreen } from './src/screens/DestinationReachedScreen';
import { JourneyRideSummaryScreen } from './src/screens/JourneyRideSummaryScreen';
import { FeedbackRatingsScreen } from './src/screens/FeedbackRatingsScreen';
import { NotVerifiedScreen } from './src/screens/NotVerifiedScreen';
import type { RideRequest } from './src/components/RideRequestModal';
import {
  ApiUser,
  completeJourney,
  fetchCurrentUser,
  fetchCurrentUserFresh,
  isRegisteredDriver,
  updateRegistrationStep,
} from './src/services/api';

/**
 * Decides which screen to show when a returning user finishes OTP login.
 * Mirrors the registrationStep enum on the backend.
 */
function resolveStageForUser(_user: ApiUser): Stage {
  // Account-first flow: creating the account (OTP login) is all it takes to
  // reach Home. Vehicle registration is started from a Home banner/popup and
  // can be resumed at any time — the driver explores the app freely but gets
  // no bookings until an admin approves them (server hard-gates acceptance).
  return 'dashboard';
}

/** Where the "Continue registration" banner resumes the funnel. */
function registrationResumeStage(user: ApiUser | null): Stage {
  switch (user?.registrationStep) {
    case 'service-type':
      return 'service-type';
    case 'choose-route':
      return 'choose-route';
    case 'vehicle-details':
      return 'vehicle-details';
    case 'owner-details':
      return 'owner-details';
    case 'driver-details':
      return 'driver-details';
    case 'complete-profile':
      return 'complete-profile';
    default:
      // Never started → the "Register Vehicle" landing screen.
      return 'registration';
  }
}

/** Registration state the dashboard surfaces as a banner / popup. */
export type RegistrationStatus =
  | 'none'
  | 'in-progress'
  | 'pending'
  | 'rejected'
  | 'approved';

function registrationStatusForUser(user: ApiUser | null): RegistrationStatus {
  if (!user) return 'none';
  if (isRegisteredDriver(user)) return 'approved';
  switch (user.registrationStep) {
    case 'pending':
      return 'pending';
    case 'rejected':
      return 'rejected';
    case 'approved':
      return 'approved';
    case 'service-type':
    case 'choose-route':
    case 'vehicle-details':
    case 'owner-details':
    case 'driver-details':
    case 'complete-profile':
      return 'in-progress';
    default:
      return 'none';
  }
}

/**
 * Map a populated ride document (from the accept push or GET /rides/active)
 * into the RideRequest shape the active-ride screens consume. Kept in one
 * place so the cold-start resume and the live admin-assign path can't drift.
 */
function rideToActiveRide(r: any): RideRequest {
  const customer = r?.customer ?? {};
  return {
    rideId: String(r._id),
    variant: r.isPrivate ? 'private' : 'instant',
    passengerName:
      [customer.firstName, customer.lastName].filter(Boolean).join(' ') ||
      'Passenger',
    passengerPhone: customer.phone ?? '',
    passengerAvatar: customer.avatar ?? null,
    pickup: r.pickup?.address ?? '',
    drop: r.dropoff?.address ?? '',
    fare: r.estimatedFare ? `₹${Number(r.estimatedFare).toFixed(2)}` : '₹0.00',
    distance: `${(r.estimatedDistance ?? 0).toFixed(1)} km`,
    eta: `${Math.round(r.estimatedDuration ?? 0)} min`,
    pickupLat: r.pickup?.lat,
    pickupLng: r.pickup?.lng,
    dropLat: r.dropoff?.lat,
    dropLng: r.dropoff?.lng,
  };
}

/**
 * Which active-ride screen a returning driver should land on for a given
 * ride status. Returns null for statuses with no dedicated resume screen
 * (driver stays on the dashboard).
 */
// Human-readable journey id derived from the composite journey key
// (`<routeId>_<index>_<date>`) — the last 6 chars of the route id, upper-cased.
// Matches RideActivationScreen's derivation so every scheduled screen shows the
// SAME real id instead of the hardcoded "SCH001"/"SCH098" placeholders.
function journeyIdFromKey(key?: string | null): string | undefined {
  return key ? key.split('_')[0].slice(-6).toUpperCase() : undefined;
}

function stageForRideStatus(status?: string): Stage | null {
  switch (status) {
    case 'driver_assigned':
    case 'driver_arriving':
    case 'driver_arrived':
      return 'verify-ride-otp';
    case 'in_progress':
      return 'ride-in-progress';
    case 'payment_pending':
      // Trip ended, awaiting payment — resume to the cash-collection summary
      // so a driver who killed the app there can still confirm cash.
      return 'ride-summary';
    default:
      return null;
  }
}

type Stage =
  | 'splash'
  | 'login'
  | 'otp'
  | 'registration'
  | 'service-type'
  | 'choose-route'
  | 'change-route'
  | 'vehicle-details'
  | 'owner-details'
  | 'driver-details'
  | 'complete-profile'
  | 'registration-pending'
  | 'account-rejected'
  | 'dashboard'
  | 'verify-ride-otp'
  | 'ride-in-progress'
  | 'ride-chat'
  | 'ride-summary'
  | 'earnings'
  | 'profile'
  | 'documents'
  | 'bank-details'
  | 'notifications'
  | 'history'
  | 'history-detail'
  | 'wallet'
  | 'recharge-wallet'
  | 'wallet-statement'
  | 'cashout'
  | 'cashout-success'
  | 'received-amount'
  | 'refer-earn'
  | 'help-support'
  | 'driver-instructions'
  | 'onepass'
  | 'incentives'
  | 'scheduled-journeys'
  | 'ride-activation'
  | 'upcoming-booking-details'
  | 'passenger-checkin'
  | 'qr-verification'
  | 'qr-verified'
  | 'boarding-summary'
  | 'journey-in-progress'
  | 'emergency-alert'
  | 'emergency-drop-summary'
  | 'destination-reached'
  | 'journey-ride-summary'
  | 'rate-passengers'
  | 'feedback-ratings'
  | 'completed-ride';

function App() {
  const [stage, setStageRaw] = useState<Stage>('splash');
  // History stack of stages the user has visited (oldest first). Pushed on
  // every forward `setStage`, popped by `goBack`. We track this in a ref so
  // updates don't cause re-renders â€” only `setStageRaw` should rerender.
  const historyRef = useRef<Stage[]>([]);

  /**
   * Navigate forward. Records the current stage onto the history stack
   * before switching, so the back button can return to wherever the user
   * came from (Profile â†’ History should go back to Profile, not always
   * to Dashboard).
   *
   * Use this everywhere instead of `setStageRaw` for forward navigation.
   */
  const setStage = useCallback((next: Stage) => {
    setStageRaw(prev => {
      if (prev !== next) historyRef.current.push(prev);
      return next;
    });
  }, []);

  /**
   * Pop the last stage off the history stack. Returns true if there was
   * somewhere to go back to (Android back swallows the event), false if
   * we're already at a root stage (back closes the app instead).
   */
  const goBack = useCallback((): boolean => {
    const prev = historyRef.current.pop();
    if (prev) {
      setStageRaw(prev);
      return true;
    }
    return false;
  }, []);

  // Menu/tab DESTINATIONS return straight to Home rather than popping the
  // history stack — a driver who opened Earnings then Profile expects Back to
  // land on Home, not walk them back through every screen. Multi-step flows
  // (registration, ride, wallet sub-flows) keep goBack.
  const goHome = useCallback(() => setStage('dashboard'), [setStage]);

  const [mobile, setMobile] = useState('');
  const [currentUser, setCurrentUser] = useState<ApiUser | null>(null);
  const [languageModalOpen, setLanguageModalOpen] = useState(false);
  const [activeRide, setActiveRide] = useState<RideRequest | null>(null);
  // The scheduled journey the driver is currently operating (composite key
  // <routeId>_<departureIndex>_<YYYY-MM-DD>). Threaded through the whole
  // scheduled-flow stage chain so each screen fetches the right trip.
  const [activeJourneyKey, setActiveJourneyKey] = useState<string | null>(null);
  // A customer-initiated early-drop request awaiting this driver's approval
  // (delivered over the socket / FCM). Drives the Emergency Alert screen.
  const [earlyDropReq, setEarlyDropReq] = useState<IncomingEarlyDrop | null>(null);
  const [earlyDropApproving, setEarlyDropApproving] = useState(false);
  // The approve result (recomputed fare + refund) shown on the drop summary.
  const [earlyDropResult, setEarlyDropResult] = useState<EarlyDropApproveResult | null>(null);
  // Slide-in driver menu (hamburger / bottom "Menu" tab).
  const [menuOpen, setMenuOpen] = useState(false);
  // Passenger from the last successful QR scan, shown on the QR-verified screen.
  const [verifiedPax, setVerifiedPax] = useState<{ name?: string; seat?: string } | null>(null);
  // Incoming ride request shown over every authenticated screen — not just
  // the dashboard. Previously this lived on DriverDashboardScreen, which
  // meant the modal silently no-op'd if the driver had navigated away
  // (Earnings/Profile/Wallet/etc.) when dispatch fired.
  const [incomingRequest, setIncomingRequest] = useState<RideRequest | null>(null);
  // Post-ride "rate your passenger" prompt. Set when a ride settles so the
  // modal can surface over the dashboard.
  const [ratePassenger, setRatePassenger] = useState<{
    rideId: string;
    name: string;
  } | null>(null);
  const [ratingSubmitting, setRatingSubmitting] = useState(false);
  const [incomingVisible, setIncomingVisible] = useState(false);
  // Every ride request currently awaiting a decision (newest first). This is
  // what powers the in-app "Incoming Requests" list on the dashboard, so the
  // driver can accept a ride from within the app instead of only from the
  // transient modal / push notification. The modal (`incomingRequest`) still
  // auto-pops the newest of these on top; dismissing/timing-out the modal
  // leaves the request here so it stays actionable in the list.
  const [pendingRequests, setPendingRequests] = useState<RideRequest[]>([]);
  // rideIds we've already popped the modal + rung for this session. Lets the
  // REST poll (getAvailableRides) keep the list fresh without re-popping the
  // modal every few seconds for a request the driver already dismissed.
  const surfacedRideIds = useRef<Set<string>>(new Set());

  // Add a request to the pending list (deduped by rideId). The modal + ring
  // fire only the FIRST time a given rideId is seen — via socket, FCM, or the
  // REST poll — so a re-emit / re-poll of the same ride never resets the accept
  // timer or re-opens a dismissed modal. Shared by every delivery path so the
  // list and the modal stay in sync.
  const enqueueRideRequest = useCallback((req: RideRequest) => {
    if (!req.rideId) return;
    const firstTime = !surfacedRideIds.current.has(req.rideId);
    surfacedRideIds.current.add(req.rideId);
    setPendingRequests(prev =>
      prev.some(r => r.rideId === req.rideId) ? prev : [req, ...prev],
    );
    if (firstTime) {
      setIncomingRequest(req);
      setIncomingVisible(true);
      buzzForRideAlert();
    }
  }, []);

  // Mirror activeRide into a ref so the socket listeners (registered once,
  // keyed on `stage`) always read the CURRENT active ride without a stale
  // closure — needed for the ride:cancelled / ride:status / ride:reassigned
  // handlers below.
  const activeRideRef = useRef<RideRequest | null>(null);
  useEffect(() => {
    activeRideRef.current = activeRide;
  }, [activeRide]);

  // Keep GPS reporting alive for the whole trip. The reporter was previously
  // start/stopped only by DriverDashboardScreen, whose unmount cleanup fired
  // the instant a ride was accepted (dashboard → verify-otp) — so the backend
  // got no driver:location for the entire trip, freezing the customer's map
  // and killing the geofence "arriving/arrived" auto-transitions. Starting is
  // idempotent; we intentionally do NOT stop on cleanup (the dashboard's
  // online-toggle effect and logout own stopping).
  useEffect(() => {
    if (activeRide) {
      startLocationReporting().catch(() => {});
    }
  }, [activeRide]);

  const removePendingRequest = useCallback((rideId?: string) => {
    setPendingRequests(prev => prev.filter(r => r.rideId !== rideId));
  }, []);

  // The ride the user tapped on the History screen — handed to the detail
  // screen so it can fetch the right record.
  const [openHistoryRideId, setOpenHistoryRideId] = useState<string | null>(null);
  const [cashoutInfo, setCashoutInfo] = useState<{
    amount: number;
    accountEndingDigits: string;
    bankLabel: string;
  } | null>(null);
  // While we're checking for a stored session, suppress the splash auto-finish
  // navigation so we don't flash the login screen for a frame before resuming.
  const [bootResolved, setBootResolved] = useState<Stage | null>(null);

  // Reconstruct the RideRequestModal from a push's data fields. Shared by the
  // FCM foreground handler, the Notifee tap/launch bridge, and the AsyncStorage
  // drain — all of which deliver the same `data` payload via different Android
  // delivery paths. The same-rideId dedupe keeps a socket emit + FCM push (or a
  // double-tap) from resetting the accept timer or stacking modals.
  const surfaceRideRequestFromData = useCallback((d: any) => {
    if (!d?.rideId) {
      setStage('dashboard');
      return;
    }
    setStage('dashboard');
    const fare = Number(d.fare ?? 0);
    const distance = Number(d.distance ?? 0);
    const duration = Number(d.duration ?? 0);
    // enqueueRideRequest adds to the in-app list, pops the modal, and rings
    // (no-ops the ring if already ringing).
    enqueueRideRequest({
      rideId: String(d.rideId),
      variant: (d.variant as 'instant' | 'private') ?? 'instant',
      passengerName: d.passengerName ?? 'Passenger',
      pickup: d.pickup ?? '',
      drop: d.drop ?? '',
      fare: `₹${Number(fare).toFixed(2)}`,
      distance: `${distance.toFixed(1)} km`,
      eta: `${Math.round(duration)} min`,
      pickupLat: Number(d.pickupLat ?? 0),
      pickupLng: Number(d.pickupLng ?? 0),
      dropLat: Number(d.dropLat ?? 0),
      dropLng: Number(d.dropLng ?? 0),
    });
  }, [enqueueRideRequest]);

  useEffect(() => {
    // Listen for inbound FCM messages so we can react to admin events
    // (document rejected â†’ re-route the driver back to upload step).
    initFcm(async (msg) => {
      const kind = (msg.data as any)?.kind;
      if (kind === 'document:rejected') {
        // Pull the latest profile + docs and take the driver to the profile
        // DOCUMENTS section — the rejected items are flagged there with a
        // one-tap re-upload. Must be a FRESH read — the cached /auth/me
        // would still show the old status.
        const fresh = await fetchCurrentUserFresh();
        if (fresh) {
          setCurrentUser(fresh);
          setStage('documents');
        }
      } else if (kind === 'application:approved') {
        // FRESH read: the cached user still says registrationStep 'pending',
        // and we want currentUser to reflect the approval before the dashboard.
        const fresh = await fetchCurrentUserFresh();
        if (fresh) {
          setCurrentUser(fresh);
          setStage('dashboard');
        }
      } else if (kind === 'ride:new-request') {
        surfaceRideRequestFromData((msg.data as any) ?? {});
      } else if (kind === 'scheduled:early-drop-request') {
        // A rider requested an early drop while the app was backgrounded. Pull
        // the pending request (the FCM data is minimal) and surface the alert.
        try {
          const reqs = await fetchPendingEarlyDrops();
          const bId = (msg.data as any)?.bookingId;
          const r = reqs.find(x => x.bookingId === bId) ?? reqs[0];
          if (r) {
            setEarlyDropReq({
              bookingId: r.bookingId,
              customerName: r.customerName,
              contact: r.contact,
              seats: r.seats ?? [],
              reason: r.reason,
            });
            setEarlyDropResult(null);
            setStage('emergency-alert');
          }
        } catch (err) {
          console.warn('[fcm] early-drop resume failed:', err);
        }
      } else if (kind === 'ride:assigned') {
        // Admin force-assigned a ride while our socket was down (the exact
        // case FCM exists for). Fetch the active ride and resume its screen —
        // previously this FCM kind was ignored, so a socket-down assignment
        // only recovered on a full app restart.
        try {
          const ride = await getActiveRide();
          if (ride) {
            stopRideAlert();
            setIncomingVisible(false);
            setIncomingRequest(null);
            setPendingRequests([]);
            setActiveRide(rideToActiveRide(ride));
            setStage(stageForRideStatus(ride.status) ?? 'verify-ride-otp');
          }
        } catch (err) {
          console.warn('[fcm] ride:assigned resume failed:', err);
        }
      }
    }).catch(() => {});
  }, [surfaceRideRequestFromData]);

  // Drain a ride request the driver tapped while the app was backgrounded but
  // alive: index.js's headless Notifee handler can't touch React state, so it
  // stashes the payload in AsyncStorage. Read it now (covers the case where the
  // stash landed after initFcm's one-shot drain) and on every return to
  // foreground, then re-surface the modal. Ignore stale taps (>2 min old) — the
  // ride has almost certainly been taken or auto-cancelled by then.
  useEffect(() => {
    const drainPendingRideRequest = async () => {
      try {
        const stashed = await AsyncStorage.getItem(PENDING_RIDE_REQUEST_KEY);
        if (!stashed) return;
        await AsyncStorage.removeItem(PENDING_RIDE_REQUEST_KEY);
        const d = JSON.parse(stashed);
        if (d?.tappedAt && Date.now() - d.tappedAt > 2 * 60 * 1000) return;
        surfaceRideRequestFromData(d);
      } catch {}
    };
    drainPendingRideRequest();
    const sub = AppState.addEventListener('change', state => {
      if (state === 'active') drainPendingRideRequest();
    });
    return () => sub.remove();
  }, [surfaceRideRequestFromData]);

  // On every app start (including a Metro reload), try to resume the
  // last session from the stored access token. If valid, skip login and
  // jump to wherever the user belongs (dashboard / mid-registration / etc).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const user = await fetchCurrentUser();
        if (cancelled) return;
        if (!user) {
          setBootResolved('login');
          return;
        }
        setCurrentUser(user);
        let target = resolveStageForUser(user);

        // An approved driver mid-trip should resume the ride, not land on
        // the dashboard. Check for an in-flight ride and jump to the
        // matching screen (verify-OTP before pickup, in-progress after).
        // Best-effort: any failure just leaves them on the dashboard.
        if (target === 'dashboard') {
          try {
            const ride = await getActiveRide();
            if (!cancelled && ride) {
              const rideStage = stageForRideStatus(ride.status);
              if (rideStage) {
                setActiveRide(rideToActiveRide(ride));
                target = rideStage;
              }
            }
          } catch (err) {
            console.warn('[boot] active-ride check failed:', err);
          }
        }

        if (!cancelled) setBootResolved(target);
      } catch {
        if (!cancelled) setBootResolved('login');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Register the FCM token the moment the driver is authenticated — including
  // while they're still going through registration / sitting on the pending
  // screen — NOT only once they reach the dashboard. Without this the backend
  // has no token for a not-yet-approved driver, so the approval push (and the
  // "you're approved → go to dashboard" navigation that rides on it) never
  // arrives. Token sync no-ops cleanly without an access token, so this is safe
  // on any authenticated stage. The 15s pending-screen poll is the fallback.
  useEffect(() => {
    const AUTHED_REGISTRATION_STAGES: Stage[] = [
      'registration',
      'service-type',
      'choose-route',
      'vehicle-details',
      'owner-details',
      'driver-details',
      'complete-profile',
      'registration-pending',
    ];
    if (!AUTHED_REGISTRATION_STAGES.includes(stage)) return;
    resyncFcmTokenIfPending().catch(() => {});
  }, [stage]);

  // Re-sync the FCM token to the backend once the user reaches the authenticated
  // dashboard (initFcm runs before login, so the first sync POST goes out without
  // a bearer token and is silently retried here).
  // Also hydrate the global user store on first dashboard entry so screens
  // like Recharge and Profile have the user's name/phone/email available
  // without re-fetching on every mount.
  useEffect(() => {
    if (stage === 'dashboard') {
      resyncFcmTokenIfPending().catch(() => {});
      useUserStore.getState().hydrate().then(u => {
        console.log('[userStore] hydrated:', {
          phone: u?.phone,
          countryCode: u?.countryCode,
          email: u?.email,
        });
      });
    }
  }, [stage]);

  // Socket: connect as soon as the driver has an access token in storage
  // and keep listeners installed at App root. We connect on *every* stage
  // (including registration-pending, complete-profile, etc.) — the only
  // gate is whether the user is authenticated, not whether they've reached
  // the dashboard. Connecting earlier means admin assignments that land
  // mid-registration or right after splash still surface live.
  //
  // The unauth stages (splash, login, otp) are skipped because connectSocket
  // is a no-op without a token anyway. Keeping the effect tied to stage
  // ensures we re-attempt the connect every time we transition forward
  // (after OTP verify, after a token refresh, etc.).
  useEffect(() => {
    const UNAUTH_STAGES: Stage[] = ['splash', 'login', 'otp'];
    if (UNAUTH_STAGES.includes(stage)) return;

    connectSocket().catch(err => {
      console.warn('[app] socket connect failed:', err);
    });
    setSocketListeners({
      onRideRequest: payload => {
        // enqueueRideRequest dedupes by rideId (so a backend re-emit doesn't
        // reset the accept timer), adds it to the in-app list, and pops the
        // modal + rings.
        enqueueRideRequest({
          rideId: payload.rideId,
          variant: payload.variant,
          passengerName: payload.passengerName,
          pickup: payload.pickup,
          drop: payload.drop,
          fare: `₹${Number(payload.fare).toFixed(2)}`,
          distance: `${payload.distance.toFixed(1)} km`,
          eta: `${Math.round(payload.duration)} min`,
          pickupLat: payload.pickupLat,
          pickupLng: payload.pickupLng,
          dropLat: payload.dropLat,
          dropLng: payload.dropLng,
        });
      },
      onRideRequestTaken: ({ rideId }) => {
        // Another driver (or a cancel) claimed it — drop it from the list and
        // close the modal if it was the one showing.
        removePendingRequest(rideId);
        setIncomingRequest(prev => {
          if (prev?.rideId !== rideId) return prev;
          stopRideAlert();
          setIncomingVisible(false);
          return null;
        });
      },
      // Admin force-assigned a ride to this driver. Skip the accept/reject
      // modal — admin already accepted on the driver's behalf — and route
      // straight to the verify-OTP screen so the driver can start the trip.
      onRideAssigned: payload => {
        const r = payload?.ride;
        if (!r) return;
        stopRideAlert();
        setIncomingVisible(false);
        setIncomingRequest(null);
        setPendingRequests([]); // entering a trip — clear any queued requests
        setActiveRide(rideToActiveRide(r));
        // Resume at the screen matching the ride's status (in case admin
        // assigns a ride that's already mid-trip), defaulting to verify-OTP.
        setStage(stageForRideStatus(r.status) ?? 'verify-ride-otp');
      },
      // Customer or admin cancelled. Previously there was NO handler, so a
      // driver mid-way to pickup saw nothing and kept driving to a dead ride.
      onRideCancelled: ({ rideId, reason, message }) => {
        removePendingRequest(rideId);
        setIncomingRequest(prev => {
          if (prev?.rideId !== rideId) return prev;
          stopRideAlert();
          setIncomingVisible(false);
          return null;
        });
        if (activeRideRef.current?.rideId === rideId) {
          stopRideAlert();
          setActiveRide(null);
          setStage('dashboard');
          Alert.alert(
            'Ride cancelled',
            message || reason || 'The rider cancelled this ride.',
          );
        }
      },
      // Ride reached `completed` — usually because the customer just paid
      // online (wallet/Razorpay). Move the driver off the "collect cash"
      // summary so they don't demand cash for an already-paid ride.
      onRideStatus: ({ rideId, status }) => {
        if (activeRideRef.current?.rideId !== rideId) return;
        if (status === 'completed') {
          const name = activeRideRef.current?.passengerName || 'Passenger';
          setActiveRide(null);
          setStage('dashboard');
          setRatePassenger({ rideId, name });
          Alert.alert('Payment received', 'The rider has paid. Trip complete.');
        }
      },
      // Admin reassigned this ride to another driver.
      onRideReassigned: ({ rideId, message }) => {
        if (activeRideRef.current?.rideId === rideId) {
          stopRideAlert();
          setActiveRide(null);
          setStage('dashboard');
          Alert.alert(
            'Ride reassigned',
            message || 'This ride was reassigned by support.',
          );
        }
      },
      // A rider on this driver's scheduled shuttle requested an early drop.
      // Surface the Emergency Alert (approve/decline) screen over whatever's
      // showing so the driver can respond immediately.
      onEarlyDropRequest: payload => {
        setEarlyDropReq({
          bookingId: payload.bookingId,
          customerName: payload.customerName,
          contact: payload.contact,
          seats: payload.seats ?? [],
          reason: payload.reason,
        });
        setEarlyDropResult(null);
        setStage('emergency-alert');
      },
      // Rider withdrew the request before the driver acted — dismiss the alert.
      onEarlyDropCancelled: ({ bookingId }) => {
        setEarlyDropReq(prev => (prev?.bookingId === bookingId ? null : prev));
        if (stage === 'emergency-alert') setStage('journey-in-progress');
      },
    });
  }, [stage]);

  // On resume (any authenticated stage), pull any early-drop request that
  // arrived while the app was backgrounded so it isn't missed. The socket push
  // only lands when the app is foregrounded on the same backend instance.
  useEffect(() => {
    const UNAUTH_STAGES: Stage[] = ['splash', 'login', 'otp'];
    if (UNAUTH_STAGES.includes(stage)) return;
    let cancelled = false;
    fetchPendingEarlyDrops()
      .then(reqs => {
        if (cancelled || reqs.length === 0) return;
        const r = reqs[0];
        setEarlyDropReq(prev =>
          prev ?? {
            bookingId: r.bookingId,
            customerName: r.customerName,
            contact: r.contact,
            seats: r.seats ?? [],
            reason: r.reason,
          },
        );
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
    // Re-check whenever the driver lands on the journey screen (resume point).
  }, [stage === 'journey-in-progress']);

  // REST poll for ride requests — the reliable, socket-independent path.
  //
  // The socket `ride:new-request` push only reaches the driver when their
  // socket is on the same backend process that handled the customer's booking.
  // On a multi-instance / split deployment it silently doesn't (only FCM does),
  // so on the dashboard we also PULL the requests currently offered to us from
  // shared DB state. enqueueRideRequest dedupes by rideId and pops the modal
  // only the first time each ride is seen, so this cooperates with the socket
  // + FCM paths without double-ringing. The server returns [] unless we're
  // online with a location, so polling is cheap and safe on any stage.
  useEffect(() => {
    if (stage !== 'dashboard') return;
    let cancelled = false;
    const poll = async () => {
      try {
        const rides = await getAvailableRides();
        // TEMP DIAGNOSTIC — remove after verifying the upcoming-rides fix.
        console.log('[avail-poll] returned', rides.length, 'ride(s):', JSON.stringify(rides.map(r => r.rideId)));
        if (cancelled) return;
        for (const p of rides) {
          enqueueRideRequest({
            rideId: String(p.rideId),
            variant: (p.variant as 'instant' | 'private') ?? 'instant',
            passengerName: p.passengerName ?? 'Passenger',
            pickup: p.pickup ?? '',
            drop: p.drop ?? '',
            fare: `₹${Number(p.fare ?? 0).toFixed(2)}`,
            distance: `${Number(p.distance ?? 0).toFixed(1)} km`,
            eta: `${Math.round(Number(p.duration ?? 0))} min`,
            pickupLat: Number(p.pickupLat ?? 0),
            pickupLng: Number(p.pickupLng ?? 0),
            dropLat: Number(p.dropLat ?? 0),
            dropLng: Number(p.dropLng ?? 0),
          });
        }
      } catch (err: any) {
        // TEMP DIAGNOSTIC — remove after verifying the upcoming-rides fix.
        console.log('[avail-poll] ERROR', err?.status ?? '', err?.message ?? String(err));
      }
    };
    poll(); // immediate on entering the dashboard
    const id = setInterval(poll, 8000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [stage, enqueueRideRequest]);

  // Close the modal WITHOUT deciding — used for the accept-timer expiry. The
  // request stays in `pendingRequests` so it remains actionable from the
  // dashboard list (the driver just missed the pop-up, not the ride).
  const dismissIncoming = useCallback(() => {
    stopRideAlert();
    setIncomingVisible(false);
    setIncomingRequest(null);
  }, []);

  // Accept a specific request — works whether it came from the modal or an
  // in-app list card. On success we enter the trip; on failure (someone else
  // took it) we drop just that request and keep the rest of the queue.
  const acceptRequest = useCallback(
    async (req: RideRequest) => {
      if (!req?.rideId) return;
      try {
        // The accept response carries the populated customer (incl. phone),
        // which the modal's RideRequest doesn't have. Merge it in so the
        // in-ride Call button + chat header actually work — previously the
        // response was discarded and every normally-accepted ride had no phone.
        const accepted = await apiAcceptRide(req.rideId);
        const phone = (accepted as any)?.customer?.phone;
        stopRideAlert();
        setIncomingVisible(false);
        setIncomingRequest(null);
        setPendingRequests([]); // entering a trip — clear the queue
        setActiveRide({ ...req, passengerPhone: phone || req.passengerPhone || '' });
        setStage('verify-ride-otp');
      } catch (err: any) {
        Alert.alert(
          'Ride no longer available',
          err?.message ?? 'Another driver accepted this ride.',
        );
        removePendingRequest(req.rideId);
        setIncomingRequest(prev => (prev?.rideId === req.rideId ? null : prev));
        setIncomingVisible(false);
        stopRideAlert();
      }
    },
    [setStage, removePendingRequest],
  );

  // Reject a specific request — removes it from the list and tells the backend.
  const rejectRequest = useCallback(
    (req: RideRequest) => {
      if (req?.rideId) {
        apiRejectRide(req.rideId).catch(err => {
          console.warn('[app] reject failed:', err);
        });
      }
      removePendingRequest(req.rideId);
      setIncomingRequest(prev => {
        if (prev?.rideId !== req.rideId) return prev;
        stopRideAlert();
        setIncomingVisible(false);
        return null;
      });
    },
    [removePendingRequest],
  );

  // Re-open the modal for a request the driver taps in the dashboard list.
  const openRequest = useCallback((req: RideRequest) => {
    setIncomingRequest(req);
    setIncomingVisible(true);
  }, []);

  // Modal button handlers just delegate to the request-based actions above.
  const handleAcceptIncoming = useCallback(() => {
    if (incomingRequest) acceptRequest(incomingRequest);
    else dismissIncoming();
  }, [incomingRequest, acceptRequest, dismissIncoming]);

  const handleRejectIncoming = useCallback(() => {
    if (incomingRequest) rejectRequest(incomingRequest);
    else dismissIncoming();
  }, [incomingRequest, rejectRequest, dismissIncoming]);

  // `permissionsOk` gates the dashboard render below. Until notifications +
  // location are both granted, we show the PermissionsGateScreen instead of
  // the dashboard.
  const [permissionsOk, setPermissionsOk] = useState<boolean | null>(null);
  const permissionsRequestedRef = useRef(false);

  // Run the full permission gauntlet ONCE, as soon as we're past the splash
  // screen (i.e. on the login screen) — not at the dashboard. Front-loading
  // them means notification permission (and the FCM token registered on the
  // registration stages above) is ready well before the admin approves the
  // driver, so the approval push actually lands.
  //
  // We deliberately wait until we're OFF the splash screen: requesting during
  // splash interrupts its JS-driven animation (useNativeDriver:false), so the
  // splash's onFinish never fires and the app is left on a stuck/blank screen.
  useEffect(() => {
    if (stage === 'splash') return;
    if (permissionsRequestedRef.current) return;
    permissionsRequestedRef.current = true;
    (async () => {
      await requestAllDriverPermissions();
      const after = await hasCriticalDriverPermissions();
      setPermissionsOk(after.notifications && after.location);
    })().catch(err => {
      console.warn('[permissions] request failed:', err);
      setPermissionsOk(false);
    });
  }, [stage]);

  // On the dashboard, just RE-CHECK (never re-ask) so the gate reflects the
  // current OS state — the prompts already happened once after splash — and
  // make sure the FCM token is registered.
  useEffect(() => {
    if (stage !== 'dashboard') return;
    let cancelled = false;
    (async () => {
      const current = await hasCriticalDriverPermissions();
      if (cancelled) return;
      const ok = current.notifications && current.location;
      setPermissionsOk(ok);
      if (ok) await ensureFcmTokenRegistered();
    })().catch(err => {
      console.warn('[permissions] check failed:', err);
      if (!cancelled) setPermissionsOk(false);
    });
    return () => {
      cancelled = true;
    };
  }, [stage]);

  // Register the FCM token with the backend the MOMENT notification + location
  // permission becomes granted — regardless of which flow granted it. The
  // permission prompt (asked once after splash) is usually answered AFTER the
  // dashboard's token check has already run, so without this the backend is
  // left with no token and pushes silently stop working. resyncFcmTokenIfPending
  // forces a re-POST (the backend wipes tokens on login) and no-ops cleanly
  // before login, so it's safe to fire whenever the flag flips to true.
  useEffect(() => {
    if (permissionsOk === true) {
      resyncFcmTokenIfPending().catch(() => {});
    }
  }, [permissionsOk]);

  // Android hardware/gesture back. Pops the navigation history stack so
  // back returns to the actual previous screen (Profile â†’ History â†’ back
  // = Profile, not Dashboard). On root stages (splash/login/dashboard) or
  // an empty stack, we let the OS handle it â€” back closes the app.
  useEffect(() => {
    const back = (): boolean => {
      const ROOT_STAGES: Stage[] = ['splash', 'login', 'dashboard'];
      if (ROOT_STAGES.includes(stage)) return false;
      // Pending/rejected: the driver is parked here until admin acts â€”
      // ignore back entirely so they can't accidentally bounce out.
      // Pending/rejected: let back minimize the app to the phone home screen
      // (return false -> OS default) instead of bouncing out of the stage. The
      // driver stays logged in and resumes here on next launch.
      if (stage === 'registration-pending' || stage === 'account-rejected') {
        return false;
      }
      return goBack();
    };
    const sub = BackHandler.addEventListener('hardwareBackPress', back);
    return () => sub.remove();
  }, [stage, goBack]);

  // Each step in the registration funnel writes to the backend, but App-level
  // `currentUser` is a snapshot from login. Refresh it whenever the user
  // reaches a screen that needs to pre-fill from earlier steps, so the form
  // sees the latest values (e.g. owner address typed two screens ago).
  useEffect(() => {
    if (
      stage === 'complete-profile' ||
      stage === 'driver-details' ||
      stage === 'registration-pending' ||
      stage === 'account-rejected'
    ) {
      fetchCurrentUser()
        .then(u => {
          if (u) setCurrentUser(u);
        })
        .catch(() => {});
    }
  }, [stage]);

  // While the driver is sitting on the "Under Review" screen, poll
  // /auth/me periodically. The moment the admin approves them
  // (registrationStep flips to 'approved'), we route to the dashboard â€”
  // even if the FCM push got lost or the device was offline. Stops as
  // soon as the user navigates away from this stage.
  //
  // Must use the FRESH (cache-busting) fetch: fetchCurrentUser() is cached
  // for 5 min (CACHE_TTL.CURRENT_USER), so the plain version would keep
  // returning the stale 'pending' snapshot and the driver would never move
  // to the dashboard until the cache happened to expire.
  const regStatus = registrationStatusForUser(currentUser);

  // Money/work screens locked until the driver is approved. Before this they
  // rendered normally: the wallet actually let an UNVERIFIED driver load
  // money, and Earnings just surfaced the API's raw "Insufficient
  // permissions" error. One friendly gate screen replaces all of that.
  const GATED_WHEN_UNVERIFIED: Stage[] = [
    'earnings',
    'wallet',
    'recharge-wallet',
    'wallet-statement',
    'cashout',
    'cashout-success',
    'received-amount',
    'onepass',
    'incentives',
    'scheduled-journeys',
  ];
  const GATED_FEATURE_NAMES: Partial<Record<Stage, string>> = {
    earnings: 'Earnings',
    wallet: 'Wallet',
    'recharge-wallet': 'Wallet',
    'wallet-statement': 'Wallet',
    cashout: 'Cashout',
    'cashout-success': 'Cashout',
    'received-amount': 'Received Amounts',
    onepass: 'OnePass',
    incentives: 'Incentives',
    'scheduled-journeys': 'My Journeys',
  };
  const gatedBlocked =
    regStatus !== 'approved' && GATED_WHEN_UNVERIFIED.includes(stage);

  useEffect(() => {
    // Poll while the registration is under review (the driver now waits on
    // the DASHBOARD, not a parking screen) so approval/rejection flips the
    // banner without an app restart. FCM is the fast path; this is fallback.
    const watching =
      regStatus === 'pending' &&
      (stage === 'dashboard' || stage === 'registration-pending');
    if (!watching) return;
    const interval = setInterval(async () => {
      try {
        const fresh = await fetchCurrentUserFresh();
        if (!fresh) return;
        setCurrentUser(fresh);
        if (
          (fresh.registrationStep === 'approved' || isRegisteredDriver(fresh)) &&
          stage === 'registration-pending'
        ) {
          setStage('dashboard');
        }
      } catch {
        // Ignore transient errors â€” the next tick will retry.
      }
    }, 15000); // 15s â€” gentle on the backend, fast enough for human-scale
    return () => clearInterval(interval);
  }, [stage, regStatus]);

  // Edge case: the splash finished and dropped us at 'login' before
  // /auth/me resolved. When the boot check lands afterwards, redirect
  // forward â€” but only if the user hasn't manually started typing a
  // phone number on the login screen.
  useEffect(() => {
    if (bootResolved && bootResolved !== 'login' && stage === 'login' && mobile === '') {
      setStage(bootResolved);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bootResolved]);

  const openLanguage = () => setLanguageModalOpen(true);
  const closeLanguage = () => setLanguageModalOpen(false);
  // Sent down to every screen that has a Logout button. The actual
  // token clear + backend call happens inside LogoutButton via api.logout().
  const handleLogout = () => {
    setMobile('');
    setCurrentUser(null);
    // Drop the cached driver profile so the next user who logs in gets a
    // fresh hydrate instead of seeing the previous user's name/phone in
    // Razorpay or the profile screen.
    useUserStore.getState().clear();
    // Clear nav history on logout — back from login shouldn't pop into a
    // previous user's profile screen.
    historyRef.current = [];
    setStageRaw('login');
  };

  // Full logout for screens that DON'T wrap their button in <LogoutButton>
  // (e.g. ProfileScreen). Clears the server session + tokens + FCM token +
  // cache via api.logout() before wiping local React state. Profile's logout
  // previously just did setStage('login'), leaving the session fully alive —
  // the next user on the device inherited it.
  const performLogout = useCallback(async () => {
    try {
      await apiLogout();
    } catch (err) {
      console.warn('[logout] failed (continuing):', err);
    }
    handleLogout();
  }, []);

  // Resume the driver's in-progress ride (Current Ride card on the dashboard).
  const resumeActiveRide = useCallback(async () => {
    try {
      const ride = await getActiveRide();
      if (ride) {
        setActiveRide(rideToActiveRide(ride));
        setStage(stageForRideStatus(ride.status) ?? 'verify-ride-otp');
      }
    } catch (err) {
      console.warn('[dashboard] resume active ride failed:', err);
    }
  }, [setStage]);

  return (
    <SafeAreaProvider>
      <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />
      {stage === 'splash' && (
        <SplashScreen
          // After splash anim finishes, route to wherever the boot check
          // landed. If the boot check is still pending (slow network),
          // fall back to login â€” fetchCurrentUser will redirect once it
          // resolves... but in practice the splash takes 2.5s, plenty of
          // time for /auth/me to return.
          onFinish={() => setStage(bootResolved ?? 'login')}
        />
      )}

      {stage === 'login' && (
        <LoginScreen
          onSendOtp={m => {
            setMobile(m);
            setStage('otp');
          }}
        />
      )}

      {stage === 'otp' && (
        <VerifyOtpScreen
          mobile={mobile}
          onBack={goBack}
          onVerified={user => {
            // Resume from wherever the driver left off in the funnel,
            // or land on the dashboard if they're fully onboarded.
            setCurrentUser(user);
            setStage(resolveStageForUser(user));
          }}
        />
      )}

      {stage === 'registration' && (
        <DriverRegistrationHomeScreen
          onRegisterVehicle={() => {
            // Mark user as entering the funnel so a relogin sends them
            // straight to ChooseServiceType instead of this landing screen.
            // Fire-and-forget â€” UI shouldn't block on this network call.
            updateRegistrationStep('service-type').catch(err =>
              console.warn('[registration] step save failed:', err),
            );
            setStage('service-type');
          }}
          onOpenLanguage={openLanguage}
          onLogout={handleLogout}
        />
      )}

      {stage === 'service-type' && (
        <ChooseServiceTypeScreen
          onBack={goBack}
          onNext={() => setStage('owner-details')}
          onLogout={handleLogout}
        />
      )}

      {stage === 'choose-route' && (
        <ChooseScheduledRouteScreen
          onBack={goBack}
          onRegistered={() => setStage('owner-details')}
        />
      )}

      {stage === 'change-route' && (
        <ChooseScheduledRouteScreen
          isChangeRequest={true}
          onBack={goBack}
          onRegistered={() => goBack()}
        />
      )}

      {stage === 'owner-details' && (
        <OwnerDetailsScreen
          onBack={goBack}
          onNext={() => setStage('vehicle-details')}
          onLogout={handleLogout}
          loggedInPhone={currentUser?.phone}
          initialOwnerName={
            currentUser?.firstName || currentUser?.lastName
              ? `${currentUser?.firstName ?? ''} ${currentUser?.lastName ?? ''}`.trim()
              : undefined
          }
        />
      )}

      {stage === 'vehicle-details' && (
        <VehicleDetailsScreen
          onBack={goBack}
          onNext={() => setStage('driver-details')}
          onLogout={handleLogout}
          initialDocs={currentUser?.driverProfile?.documents ?? []}
        />
      )}

      {stage === 'driver-details' && (
        <DriverDetailsScreen
          onBack={goBack}
          onNext={() => setStage('complete-profile')}
          onLogout={handleLogout}
          initialDlNumber={currentUser?.driverProfile?.licenceNumber}
          initialDlExpiryIso={currentUser?.driverProfile?.licenceExpiry ?? null}
          initialYearsExperience={
            currentUser?.driverProfile?.yearsExperience ?? null
          }
          initialDocs={currentUser?.driverProfile?.documents ?? []}
          serviceType={currentUser?.driverProfile?.serviceType}
        />
      )}

      {stage === 'complete-profile' && (
        <CompleteProfileScreen
          onBack={goBack}
          onSubmit={() => {
            // Under-review drivers live on Home now (waiting-approval banner),
            // not a parking screen. Refresh so the banner state is correct.
            fetchCurrentUserFresh()
              .then(u => u && setCurrentUser(u))
              .catch(() => {});
            setStage('dashboard');
          }}
          onEditVehicle={() => setStage('vehicle-details')}
          onLogout={handleLogout}
          vehicleSummary={(() => {
            const dp = currentUser?.driverProfile;
            if (!dp) return undefined;
            const insuranceExpiryLabel = dp.insuranceExpiry
              ? `Valid till ${new Date(dp.insuranceExpiry).toLocaleDateString('en-GB', {
                  month: 'short',
                  year: 'numeric',
                })}`
              : 'â€”';
            const serviceLabel = dp.serviceType
              ? dp.serviceType.charAt(0).toUpperCase() + dp.serviceType.slice(1)
              : 'â€”';
            return {
              brandModel: [dp.vehicleMake, dp.vehicleModel].filter(Boolean).join(' ') || 'â€”',
              registrationNo: dp.plateNumber || 'â€”',
              year: dp.vehicleYear || 'â€”',
              seating: dp.seatingCapacity ? String(dp.seatingCapacity) : '—',
              insurance: insuranceExpiryLabel,
              serviceType: serviceLabel,
            };
          })()}
          // Pre-fill from earlier registration steps so the user doesn't
          // re-type info they already gave us.
          initialFullName={
            currentUser?.driverProfile?.ownerName ||
            (currentUser?.firstName || currentUser?.lastName
              ? `${currentUser?.firstName ?? ''} ${currentUser?.lastName ?? ''}`.trim()
              : undefined)
          }
          initialEmail={currentUser?.email}
          initialDobIso={currentUser?.dob ?? null}
          initialAddress={currentUser?.driverProfile?.ownerAddress}
          initialDocs={currentUser?.driverProfile?.documents ?? []}
          initialBank={currentUser?.driverProfile?.bankDetails}
        />
      )}

      {stage === 'registration-pending' && (
        <RegistrationPendingScreen
          onBack={() => setStage('dashboard')}
          driverName={
            (() => {
              const fl = `${currentUser?.firstName ?? ''} ${currentUser?.lastName ?? ''}`.trim();
              return fl || currentUser?.driverProfile?.ownerName || undefined;
            })()
          }
          onLogout={handleLogout}
        />
      )}

      {stage === 'account-rejected' && (
        <AccountRejectedScreen
          driverName={
            [currentUser?.firstName, currentUser?.lastName]
              .filter(Boolean)
              .join(' ') || undefined
          }
          rejectionReason={
            (currentUser?.driverProfile as any)?.disabledReason || undefined
          }
          onReupload={() => setStage('driver-details')}
          onContactSupport={() => {
            import('react-native').then(({ Linking }) =>
              Linking.openURL('tel:+911800123456').catch(() => {}),
            );
          }}
          onLogout={handleLogout}
        />
      )}

      {gatedBlocked && (
        <NotVerifiedScreen
          status={regStatus}
          featureName={GATED_FEATURE_NAMES[stage]}
          onBack={() => setStage('dashboard')}
          onAction={() => {
            if (regStatus === 'pending') setStage('registration-pending');
            else if (regStatus === 'rejected') setStage('documents');
            else setStage(registrationResumeStage(currentUser));
          }}
        />
      )}

      {stage === 'dashboard' && permissionsOk === false && (
        <PermissionsGateScreen
          onAllGranted={async () => {
            setPermissionsOk(true);
            await ensureFcmTokenRegistered();
          }}
        />
      )}

      {stage === 'dashboard' && permissionsOk !== false && (
        <DriverDashboardScreen
          registrationStatus={regStatus}
          onRegistrationAction={() => {
            // Banner / popup tap routes by state: start or resume the funnel,
            // open the review screen while pending, or jump to the profile
            // documents section after a rejection to re-upload.
            if (regStatus === 'pending') setStage('registration-pending');
            else if (regStatus === 'rejected') setStage('documents');
            else setStage(registrationResumeStage(currentUser));
          }}
          incomingRequests={pendingRequests}
          onAcceptRequest={acceptRequest}
          onRejectRequest={rejectRequest}
          onOpenRequest={openRequest}
          onAcceptRide={ride => {
            setActiveRide(ride);
            setStage('verify-ride-otp');
          }}
          onOpenEarnings={() => setStage('earnings')}
          onOpenProfile={() => setStage('profile')}
          onOpenNotifications={() => setStage('notifications')}
          onOpenWallet={() => setStage('wallet')}
          onOpenScheduledJourneys={() => setStage('scheduled-journeys')}
          onOpenActiveRide={resumeActiveRide}
          onOpenMenu={() => setMenuOpen(true)}
          onOpenReviews={() => setStage('feedback-ratings')}
        />
      )}

      {stage === 'notifications' && (
        <NotificationsScreen onBack={goHome} />
      )}

      {stage === 'earnings' && !gatedBlocked && (
        <EarningsScreen
          onBack={goHome}
          onViewPaymentHistory={() => setStage('wallet-statement')}
          onExport={() => setStage('wallet-statement')}
          onWithdraw={() => setStage('cashout')}
        />
      )}

      {stage === 'profile' && (
        <ProfileScreen
          onBack={goHome}
          onLogout={performLogout}
          onOpenDocuments={() => setStage('documents')}
          onOpenBankDetails={() => setStage('bank-details')}
          onOpenHistory={() => setStage('history')}
          onOpenWallet={() => setStage('wallet')}
          onOpenRefer={() => setStage('refer-earn')}
          onOpenHelp={() => setStage('help-support')}
          onOpenDriverInstructions={() => setStage('driver-instructions')}
          onOpenOnePass={() => setStage('onepass')}
          onOpenIncentives={() => setStage('incentives')}
          onOpenRouteChange={() => setStage('change-route')}
          serviceType={currentUser?.driverProfile?.serviceType}
        />
      )}

      {stage === 'onepass' && !gatedBlocked && <OnePassScreen onBack={goHome} />}

      {stage === 'incentives' && !gatedBlocked && <IncentivesScreen onBack={goHome} />}

      {stage === 'documents' && (
        <DocumentsScreen onBack={goHome} />
      )}

      {stage === 'bank-details' && (
        <BankDetailsScreen
          onBack={goHome}
          // "View Transaction Statement" did nothing — the handler was never
          // passed. Route it to the wallet statement screen.
          onViewStatement={() => setStage('wallet-statement')}
        />
      )}

      {stage === 'history' && (
        <HistoryScreen
          onBack={goHome}
          onOpenRide={(rideId) => {
            setOpenHistoryRideId(rideId);
            setStage('history-detail');
          }}
        />
      )}

      {stage === 'history-detail' && (
        <HistoryDetailScreen rideId={openHistoryRideId} onBack={goBack} />
      )}

      {stage === 'wallet' && !gatedBlocked && (
        <WalletScreen
          onBack={goHome}
          onRecharge={() => setStage('recharge-wallet')}
          onStatement={() => setStage('wallet-statement')}
          onCashout={() => setStage('cashout')}
          onReceived={() => setStage('received-amount')}
        />
      )}

      {stage === 'recharge-wallet' && !gatedBlocked && (
        <RechargeWalletScreen
          onBack={goBack}
          onLaunched={() => setStage('wallet')}
        />
      )}

      {stage === 'wallet-statement' && !gatedBlocked && (
        <WalletStatementScreen onBack={goBack} />
      )}

      {stage === 'cashout' && !gatedBlocked && (
        <CashoutFundsScreen
          onBack={goBack}
          onEditBank={() => setStage('bank-details')}
          onConfirmed={info => {
            setCashoutInfo(info);
            setStage('cashout-success');
          }}
        />
      )}

      {stage === 'cashout-success' && !gatedBlocked && (
        <CashoutSuccessScreen
          amount={
            cashoutInfo
              ? `₹${new Intl.NumberFormat('en-IN', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                }).format(cashoutInfo.amount)}`
              : undefined
          }
          accountEndingDigits={cashoutInfo?.accountEndingDigits}
          onGoToWallet={() => setStage('wallet')}
          onViewTransaction={() => setStage('wallet-statement')}
        />
      )}

      {stage === 'received-amount' && !gatedBlocked && (
        <ReceivedAmountScreen onBack={goHome} />
      )}

      {stage === 'refer-earn' && (
        <ReferAndEarnScreen onBack={goHome} />
      )}

      {stage === 'help-support' && (
        <HelpSupportScreen onBack={goHome} />
      )}

      {stage === 'driver-instructions' && (
        <DriverInstructionsScreen
          onBack={goHome}
          onAgree={() => setStage('profile')}
        />
      )}

      {stage === 'scheduled-journeys' && !gatedBlocked && (
        <ScheduledJourneysScreen
          onBack={goHome}
          onOpenUpcoming={(key: string) => {
            setActiveJourneyKey(key);
            setStage('upcoming-booking-details');
          }}
          onOpenPast={(key: string) => {
            setActiveJourneyKey(key);
            setStage('completed-ride');
          }}
        />
      )}

      {stage === 'upcoming-booking-details' && (
        <UpcomingBookingDetailsScreen
          journeyKey={activeJourneyKey}
          journeyId={journeyIdFromKey(activeJourneyKey)}
          onBack={goBack}
          onStartJourney={() => setStage('ride-activation')}
        />
      )}

      {stage === 'ride-activation' && (
        <RideActivationScreen
          journeyKey={activeJourneyKey}
          onBack={goBack}
          onStartCheckIn={() => setStage('passenger-checkin')}
          onViewDetails={() => setStage('upcoming-booking-details')}
        />
      )}

      {stage === 'passenger-checkin' && (
        <PassengerCheckInScreen
          journeyKey={activeJourneyKey}
          journeyId={journeyIdFromKey(activeJourneyKey)}
          onBack={goBack}
          onScanQr={() => setStage('qr-verification')}
          onViewSummary={() => setStage('boarding-summary')}
        />
      )}

      {stage === 'qr-verification' && (
        <QRVerificationScreen
          journeyKey={activeJourneyKey}
          journeyId={journeyIdFromKey(activeJourneyKey)}
          onBack={goBack}
          onVerified={pax => {
            setVerifiedPax(pax ?? null);
            setStage('qr-verified');
          }}
        />
      )}

      {stage === 'qr-verified' && (
        <QRVerifiedScreen
          passengerName={verifiedPax?.name || undefined}
          seat={verifiedPax?.seat || undefined}
          onBack={goBack}
          onNext={() => setStage('passenger-checkin')}
        />
      )}

      {stage === 'boarding-summary' && (
        <BoardingSummaryScreen
          journeyKey={activeJourneyKey}
          journeyId={journeyIdFromKey(activeJourneyKey)}
          onBack={goBack}
          onStartJourney={() => setStage('journey-in-progress')}
        />
      )}

      {stage === 'journey-in-progress' && (
        <JourneyInProgressScreen
          journeyKey={activeJourneyKey}
          onBack={goBack}
          onNextStop={() => setStage('destination-reached')}
          onSos={() =>
            // Genuine driver SOS — call emergency services. (Early drops are
            // now customer-initiated and arrive as their own alert.)
            Alert.alert(
              'Emergency',
              'Call emergency services now?',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Call 100',
                  style: 'destructive',
                  onPress: () => Linking.openURL('tel:100').catch(() => {}),
                },
              ],
            )
          }
        />
      )}

      {/* Customer-initiated early-drop request → driver approves or declines.
          Entered by the socket/FCM handler that sets `earlyDropReq`, NOT by a
          driver button. */}
      {stage === 'emergency-alert' && (
        <EmergencyAlertScreen
          request={earlyDropReq}
          approving={earlyDropApproving}
          onBack={() =>
            setStage(activeJourneyKey ? 'journey-in-progress' : 'dashboard')
          }
          onApprove={async req => {
            setEarlyDropApproving(true);
            try {
              const res = await approveEarlyDrop(req.bookingId);
              setEarlyDropResult(res);
              setStage('emergency-drop-summary');
            } catch (err) {
              Alert.alert(
                'Could not approve',
                err instanceof Error ? err.message : 'Please try again.',
              );
            } finally {
              setEarlyDropApproving(false);
            }
          }}
          onDecline={async req => {
            try {
              await declineEarlyDrop(req.bookingId);
            } catch (err) {
              console.warn('[early-drop] decline failed:', err);
            }
            setEarlyDropReq(null);
            setStage(activeJourneyKey ? 'journey-in-progress' : 'dashboard');
          }}
        />
      )}

      {stage === 'emergency-drop-summary' && (
        <EmergencyDropSummaryScreen
          passenger={
            earlyDropReq
              ? {
                  name: earlyDropReq.customerName,
                  seat: earlyDropReq.seats?.[0],
                  contact: earlyDropReq.contact,
                }
              : null
          }
          result={earlyDropResult}
          onBack={() =>
            setStage(activeJourneyKey ? 'journey-in-progress' : 'dashboard')
          }
          onContinue={() => {
            // The approve call already recorded the drop + refund; just clear
            // and return to the journey.
            setEarlyDropReq(null);
            setEarlyDropResult(null);
            setStage(activeJourneyKey ? 'journey-in-progress' : 'dashboard');
          }}
        />
      )}

      {stage === 'destination-reached' && (
        <DestinationReachedScreen
          journeyKey={activeJourneyKey}
          onBack={goBack}
          onEndRide={() => setStage('journey-ride-summary')}
        />
      )}

      {stage === 'journey-ride-summary' && (
        <JourneyRideSummaryScreen
          journeyKey={activeJourneyKey}
          onBack={goBack}
          onViewFeedback={() => setStage('rate-passengers')}
        />
      )}

      {stage === 'rate-passengers' && (
        <RatePassengersScreen
          journeyKey={activeJourneyKey}
          onBack={() => setStage('journey-ride-summary')}
          onDone={() => setStage('feedback-ratings')}
        />
      )}

      {stage === 'feedback-ratings' && (
        <FeedbackRatingsScreen
          onBack={goBack}
          onGoDashboard={() => setStage('dashboard')}
          onViewEarnings={() => setStage('earnings')}
        />
      )}

      {stage === 'completed-ride' && (
        <CompletedRideScreen
          journeyKey={activeJourneyKey}
          journeyId={journeyIdFromKey(activeJourneyKey)}
          onBack={goBack}
        />
      )}

      {stage === 'verify-ride-otp' && (
        <VerifyRideOtpScreen
          rideId={activeRide?.rideId}
          passengerName={activeRide?.passengerName}
          pickup={activeRide?.pickup}
          drop={activeRide?.drop}
          pickupCoord={
            // Truthiness (not just != null) — the FCM/poll ingest paths coerce
            // missing coords to 0, and routing to (0,0) draws a bogus route to
            // the Gulf of Guinea. 0 is never a real coordinate for our ops.
            activeRide?.pickupLat && activeRide?.pickupLng
              ? { lat: activeRide.pickupLat, lng: activeRide.pickupLng }
              : null
          }
          onBack={goBack}
          onVerified={() => setStage('ride-in-progress')}
        />
      )}

      {stage === 'ride-in-progress' && (
        <RideInProgressScreen
          title={
            activeRide?.variant === 'private'
              ? 'Private Ride Confirmed'
              : 'Instant Ride Confirmed'
          }
          // Ride's estimated values ("N min" / "X.X km") until the map's
          // live route reports real numbers — without these the screen fell
          // back to hardcoded "2 min" / "0.5 mi" placeholders.
          eta={activeRide?.eta}
          distance={activeRide?.distance}
          pickup={
            // Truthiness — see VerifyRideOtpScreen pickupCoord note (0 = missing).
            activeRide?.pickupLat && activeRide?.pickupLng
              ? { lat: activeRide.pickupLat, lng: activeRide.pickupLng }
              : null
          }
          dropoff={
            activeRide?.dropLat && activeRide?.dropLng
              ? { lat: activeRide.dropLat, lng: activeRide.dropLng }
              : null
          }
          onBack={goBack}
          onChat={() => setStage('ride-chat')}
          onCall={async () => {
            // tel: dialer via the system. Fallback alert if no phone is on
            // the assigned ride payload (older rides booked before we wired
            // passengerPhone through).
            const phone = (activeRide?.passengerPhone || '').replace(/\s+/g, '');
            if (!phone) return;
            const url = `tel:${phone}`;
            const { Linking } = await import('react-native');
            const can = await Linking.canOpenURL(url);
            if (can) Linking.openURL(url);
          }}
          onComplete={async () => {
            // End-of-trip moves the ride to `payment_pending`, not
            // straight to `completed`. The customer's receipt screen
            // takes over from here: wallet/Razorpay/cash all finalise
            // the ride. For cash, the driver explicitly confirms
            // collection on the RideSummary screen below.
            //
            // Only advance to the summary once the backend has ACTUALLY
            // recorded the transition — otherwise we'd show a receipt for a
            // trip that's still in progress on the server (and the customer
            // stays stuck). On failure/timeout we keep the driver here so
            // they can retry, rather than freezing on a dead button.
            if (!activeRide?.rideId) {
              setStage('ride-summary');
              return;
            }
            try {
              const { updateRideStatus } = await import('./src/services/api');
              await updateRideStatus(activeRide.rideId, 'payment_pending');
              setStage('ride-summary');
            } catch (err) {
              console.warn('[ride] end-trip failed:', err);
              const { Alert } = await import('react-native');
              Alert.alert(
                'Could not complete ride',
                "We couldn't reach the server to end this trip. Please check your connection and try again.",
              );
            }
          }}
        />
      )}

      {stage === 'ride-chat' && activeRide?.rideId && (
        <RideChatScreen
          rideId={activeRide.rideId}
          customer={{
            name: activeRide.passengerName,
            phone: activeRide.passengerPhone,
            avatar: activeRide.passengerAvatar ?? null,
          }}
          onBack={goBack}
        />
      )}

      {stage === 'ride-summary' && (
        <RideSummaryScreen
          rideId={activeRide?.rideId}
          amount={activeRide?.fare ?? '₹0.00'}
          // Estimated minutes as the interim value; the screen swaps in the
          // backend's actualDuration once its fetch lands.
          duration={activeRide?.eta}
          onBack={goBack}
          onContact={() => {
            const phone = activeRide?.passengerPhone;
            if (!phone) return;
            import('react-native').then(({ Linking }) =>
              Linking.openURL(`tel:${phone}`).catch(() => {}),
            );
          }}
          onRaiseTicket={() => setStage('help-support')}
          onCollectedCash={async () => {
            // Confirm the cash payment on the backend. This is the
            // driver-side "settle" action for cash rides — it flips the
            // ride from payment_pending to completed and credits the
            // driver's earnings. For wallet/Razorpay rides this is a
            // no-op (the customer's payment path already settled).
            const rideId = activeRide?.rideId;
            const name = activeRide?.passengerName ?? 'Passenger';
            if (rideId) {
              try {
                const { confirmCashCollected } = await import('./src/services/api');
                await confirmCashCollected(rideId);
              } catch (err) {
                console.warn('[ride] confirm-cash failed:', err);
              }
            }
            setActiveRide(null);
            setStage('dashboard');
            // Ride is settled now — prompt the driver to rate the passenger.
            if (rideId) setRatePassenger({ rideId, name });
          }}
        />
      )}

      <Modal
        visible={languageModalOpen}
        transparent
        animationType="slide"
        onRequestClose={closeLanguage}
      >
        <ChooseLanguageScreen
          onContinue={closeLanguage}
          onClose={closeLanguage}
        />
      </Modal>

      {/*
       * Persistent bottom nav. Rendered as an absolute overlay at the root
       * of the SafeAreaProvider so it stays put while the active screen
       * mounts/unmounts behind it. Only shown on the 5 top-level tabs â€”
       * deeper screens (ride flow, registration, profile sub-pages) take
       * the full screen.
       */}
      {/*
       * Global incoming-ride modal. Rendered at the App root so it surfaces
       * regardless of which screen the driver is currently on — the previous
       * dashboard-scoped version silently dropped requests whenever the
       * driver had navigated away to Earnings/Profile/Wallet.
       */}
      {incomingRequest && (
        <RideRequestModal
          visible={incomingVisible}
          request={incomingRequest}
          onAccept={handleAcceptIncoming}
          onReject={handleRejectIncoming}
          // Timer expiry only closes the pop-up — the request stays in the
          // dashboard's in-app list so the driver can still act on it there.
          onTimeout={dismissIncoming}
        />
      )}

      {ratePassenger && (
        <RatePassengerModal
          visible={!!ratePassenger}
          passengerName={ratePassenger.name}
          submitting={ratingSubmitting}
          onSubmit={async (rating, comment) => {
            setRatingSubmitting(true);
            try {
              await apiRateRide(ratePassenger.rideId, rating, comment || undefined);
            } catch (err) {
              console.warn('[rate] passenger rating failed:', err);
            } finally {
              setRatingSubmitting(false);
              setRatePassenger(null);
            }
          }}
          onSkip={() => setRatePassenger(null)}
        />
      )}

      {((stage === 'dashboard' && permissionsOk !== false) ||
        stage === 'history' ||
        stage === 'earnings' ||
        stage === 'profile') && (
        <View
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
          }}
        >
          <DriverBottomNav
            active={
              stage === 'dashboard'
                ? 'home'
                : stage === 'history'
                  ? 'rides'
                  : stage === 'earnings'
                    ? 'earnings'
                    : 'profile'
            }
            onChange={tab => {
              if (tab === 'home') setStage('dashboard');
              else if (tab === 'rides') setStage('history');
              else if (tab === 'earnings') setStage('earnings');
              else if (tab === 'profile') setStage('profile');
              else if (tab === 'menu') setMenuOpen(true);
            }}
          />
        </View>
      )}

      {/* Slide-in menu (hamburger + bottom "Menu" tab). Hosts the destinations
          that don't have a dedicated bottom tab. */}
      <DriverMenuSheet
        visible={menuOpen}
        onClose={() => setMenuOpen(false)}
        items={
          [
            { key: 'wallet', label: 'Wallet', Icon: WalletIcon, onPress: () => setStage('wallet') },
            {
              key: 'notifications',
              label: 'Notifications',
              Icon: BellIcon,
              onPress: () => setStage('notifications'),
            },
            { key: 'documents', label: 'Documents', Icon: DocumentIcon, onPress: () => setStage('documents') },
            { key: 'bank', label: 'Bank Details', Icon: BankIcon, onPress: () => setStage('bank-details') },
            { key: 'onepass', label: 'One Pass', Icon: TicketIcon, onPress: () => setStage('onepass') },
            { key: 'refer', label: 'Refer & Earn', Icon: GiftIcon, onPress: () => setStage('refer-earn') },
            { key: 'help', label: 'Help & Support', Icon: HelpIcon, onPress: () => setStage('help-support') },
            { key: 'logout', label: 'Logout', Icon: LogoutIcon, danger: true, onPress: performLogout },
          ] as DriverMenuItem[]
        }
      />
    </SafeAreaProvider>
  );
}

export default App;
