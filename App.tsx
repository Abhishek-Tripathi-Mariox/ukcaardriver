import './global.css';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, BackHandler, Modal, StatusBar, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import DriverBottomNav from './src/components/DriverBottomNav';
import RideRequestModal from './src/components/RideRequestModal';
import {
  buzzForRideAlert,
  ensureFcmTokenRegistered,
  initFcm,
  resyncFcmTokenIfPending,
  stopRideAlert,
} from './src/services/fcmService';
import {
  connectSocket,
  setSocketListeners,
} from './src/services/socketService';
import {
  acceptRideRequest as apiAcceptRide,
  rejectRideRequest as apiRejectRide,
  getActiveRide,
  rateRide as apiRateRide,
} from './src/services/api';
import RatePassengerModal from './src/components/RatePassengerModal';
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
import { EmergencyAlertScreen } from './src/screens/EmergencyAlertScreen';
import { EmergencyDropSummaryScreen } from './src/screens/EmergencyDropSummaryScreen';
import { DestinationReachedScreen } from './src/screens/DestinationReachedScreen';
import { JourneyRideSummaryScreen } from './src/screens/JourneyRideSummaryScreen';
import { FeedbackRatingsScreen } from './src/screens/FeedbackRatingsScreen';
import type { RideRequest } from './src/components/RideRequestModal';
import {
  ApiUser,
  fetchCurrentUser,
  fetchCurrentUserFresh,
  isRegisteredDriver,
  updateRegistrationStep,
} from './src/services/api';

/**
 * Decides which screen to show when a returning user finishes OTP login.
 * Mirrors the registrationStep enum on the backend.
 */
function resolveStageForUser(user: ApiUser): Stage {
  if (isRegisteredDriver(user)) return 'dashboard';

  switch (user.registrationStep) {
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
    case 'pending':
      return 'registration-pending';
    case 'rejected':
      return 'account-rejected';
    case 'approved':
      // Approved but profile not setup is a weird state â€” fall through to
      // dashboard since admin signed off.
      return 'dashboard';
    default:
      // null / undefined â†’ never started registration â†’ show the
      // "Register Vehicle" landing screen.
      return 'registration';
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
    fare: r.estimatedFare ? `₹${Math.round(r.estimatedFare)}.00` : '₹0.00',
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
function stageForRideStatus(status?: string): Stage | null {
  switch (status) {
    case 'driver_assigned':
    case 'driver_arriving':
    case 'driver_arrived':
      return 'verify-ride-otp';
    case 'in_progress':
      return 'ride-in-progress';
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

  const [mobile, setMobile] = useState('');
  const [currentUser, setCurrentUser] = useState<ApiUser | null>(null);
  const [languageModalOpen, setLanguageModalOpen] = useState(false);
  const [activeRide, setActiveRide] = useState<RideRequest | null>(null);
  // The scheduled journey the driver is currently operating (composite key
  // <routeId>_<departureIndex>_<YYYY-MM-DD>). Threaded through the whole
  // scheduled-flow stage chain so each screen fetches the right trip.
  const [activeJourneyKey, setActiveJourneyKey] = useState<string | null>(null);
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

  useEffect(() => {
    // Listen for inbound FCM messages so we can react to admin events
    // (document rejected â†’ re-route the driver back to upload step).
    initFcm(async (msg) => {
      const kind = (msg.data as any)?.kind;
      if (kind === 'document:rejected') {
        // Pull the latest profile + docs and bounce the user back to the
        // doc-upload step so they can re-pick the rejected file. Must be a
        // FRESH read — the cached /auth/me would still show the old status.
        const fresh = await fetchCurrentUserFresh();
        if (fresh) {
          setCurrentUser(fresh);
          setStage('driver-details');
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
        // FCM is the resilient delivery path — it works regardless of
        // socket state, backend split (customer-on-server, driver-on-local),
        // or whether the app was just woken from a kill. Reconstruct the
        // ride payload from the data fields and surface the modal here,
        // so the bell rings even when no live socket emit landed. If the
        // socket *did* fire first, `setIncomingRequest`'s same-rideId
        // dedupe (see socket onRideRequest handler) prevents a duplicate.
        const d = (msg.data as any) ?? {};
        if (d.rideId) {
          setStage('dashboard');
          setIncomingRequest(prev => {
            if (prev?.rideId === d.rideId) return prev;
            const fare = Number(d.fare ?? 0);
            const distance = Number(d.distance ?? 0);
            const duration = Number(d.duration ?? 0);
            return {
              rideId: String(d.rideId),
              variant: (d.variant as 'instant' | 'private') ?? 'instant',
              passengerName: d.passengerName ?? 'Passenger',
              pickup: d.pickup ?? '',
              drop: d.drop ?? '',
              fare: `₹${Math.round(fare)}.00`,
              distance: `${distance.toFixed(1)} km`,
              eta: `${Math.round(duration)} min`,
              pickupLat: Number(d.pickupLat ?? 0),
              pickupLng: Number(d.pickupLng ?? 0),
              dropLat: Number(d.dropLat ?? 0),
              dropLng: Number(d.dropLng ?? 0),
            };
          });
          setIncomingVisible(true);
          // buzzForRideAlert was already called inside fcmService's
          // foreground onMessage handler; calling it again is a no-op
          // (alertActive guard), so we don't repeat it here.
        } else {
          setStage('dashboard');
        }
      }
    }).catch(() => {});
  }, []);

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
        // Backend may re-emit the same ride to the same driver during
        // retries — drop duplicates so we don't reset the timer.
        setIncomingRequest(prev => {
          if (prev?.rideId === payload.rideId) return prev;
          return {
            rideId: payload.rideId,
            variant: payload.variant,
            passengerName: payload.passengerName,
            pickup: payload.pickup,
            drop: payload.drop,
            fare: `₹${Math.round(payload.fare)}.00`,
            distance: `${payload.distance.toFixed(1)} km`,
            eta: `${Math.round(payload.duration)} min`,
            pickupLat: payload.pickupLat,
            pickupLng: payload.pickupLng,
            dropLat: payload.dropLat,
            dropLng: payload.dropLng,
          };
        });
        setIncomingVisible(true);
        buzzForRideAlert();
      },
      onRideRequestTaken: ({ rideId }) => {
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
        setActiveRide(rideToActiveRide(r));
        // Resume at the screen matching the ride's status (in case admin
        // assigns a ride that's already mid-trip), defaulting to verify-OTP.
        setStage(stageForRideStatus(r.status) ?? 'verify-ride-otp');
      },
    });
  }, [stage]);

  const dismissIncoming = useCallback(() => {
    stopRideAlert();
    setIncomingVisible(false);
    setIncomingRequest(null);
  }, []);

  const handleAcceptIncoming = useCallback(async () => {
    if (!incomingRequest?.rideId) {
      dismissIncoming();
      return;
    }
    try {
      await apiAcceptRide(incomingRequest.rideId);
      stopRideAlert();
      setIncomingVisible(false);
      setActiveRide(incomingRequest);
      setIncomingRequest(null);
      setStage('verify-ride-otp');
    } catch (err: any) {
      Alert.alert(
        'Ride no longer available',
        err?.message ?? 'Another driver accepted this ride.',
      );
      dismissIncoming();
    }
  }, [incomingRequest, setStage, dismissIncoming]);

  const handleRejectIncoming = useCallback(() => {
    if (incomingRequest?.rideId) {
      apiRejectRide(incomingRequest.rideId).catch(err => {
        console.warn('[app] reject failed:', err);
      });
    }
    dismissIncoming();
  }, [incomingRequest, dismissIncoming]);

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
  useEffect(() => {
    if (stage !== 'registration-pending') return;
    const interval = setInterval(async () => {
      try {
        const fresh = await fetchCurrentUserFresh();
        if (!fresh) return;
        setCurrentUser(fresh);
        if (fresh.registrationStep === 'approved' || isRegisteredDriver(fresh)) {
          setStage('dashboard');
        } else if (fresh.registrationStep === 'rejected') {
          setStage('account-rejected');
        }
      } catch {
        // Ignore transient errors â€” the next tick will retry.
      }
    }, 15000); // 15s â€” gentle on the backend, fast enough for human-scale
    return () => clearInterval(interval);
  }, [stage]);

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

  return (
    <SafeAreaProvider>
      <StatusBar hidden translucent backgroundColor="transparent" />
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
          onSubmit={() => setStage('registration-pending')}
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
              seating: 'â€”',
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
          onReupload={() => setStage('driver-details')}
          onContactSupport={() => {
            import('react-native').then(({ Linking }) =>
              Linking.openURL('tel:+911800123456').catch(() => {}),
            );
          }}
          onLogout={handleLogout}
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
          onAcceptRide={ride => {
            setActiveRide(ride);
            setStage('verify-ride-otp');
          }}
          onOpenEarnings={() => setStage('earnings')}
          onOpenProfile={() => setStage('profile')}
          onOpenNotifications={() => setStage('notifications')}
          onOpenWallet={() => setStage('wallet')}
          onOpenScheduledJourneys={() => setStage('scheduled-journeys')}
        />
      )}

      {stage === 'notifications' && (
        <NotificationsScreen onBack={goBack} />
      )}

      {stage === 'earnings' && (
        <EarningsScreen onBack={goBack} />
      )}

      {stage === 'profile' && (
        <ProfileScreen
          onBack={goBack}
          onLogout={() => setStage('login')}
          onOpenDocuments={() => setStage('documents')}
          onOpenBankDetails={() => setStage('bank-details')}
          onOpenHistory={() => setStage('history')}
          onOpenWallet={() => setStage('wallet')}
          onOpenRefer={() => setStage('refer-earn')}
          onOpenHelp={() => setStage('help-support')}
          onOpenDriverInstructions={() => setStage('driver-instructions')}
          onOpenOnePass={() => setStage('onepass')}
          onOpenIncentives={() => setStage('incentives')}
        />
      )}

      {stage === 'onepass' && <OnePassScreen onBack={goBack} />}

      {stage === 'incentives' && <IncentivesScreen onBack={goBack} />}

      {stage === 'documents' && (
        <DocumentsScreen onBack={goBack} />
      )}

      {stage === 'bank-details' && (
        <BankDetailsScreen onBack={goBack} />
      )}

      {stage === 'history' && (
        <HistoryScreen
          onBack={goBack}
          onOpenRide={(rideId) => {
            setOpenHistoryRideId(rideId);
            setStage('history-detail');
          }}
        />
      )}

      {stage === 'history-detail' && (
        <HistoryDetailScreen rideId={openHistoryRideId} onBack={goBack} />
      )}

      {stage === 'wallet' && (
        <WalletScreen
          onBack={goBack}
          onRecharge={() => setStage('recharge-wallet')}
          onStatement={() => setStage('wallet-statement')}
          onCashout={() => setStage('cashout')}
          onReceived={() => setStage('received-amount')}
        />
      )}

      {stage === 'recharge-wallet' && (
        <RechargeWalletScreen
          onBack={goBack}
          onLaunched={() => setStage('wallet')}
        />
      )}

      {stage === 'wallet-statement' && (
        <WalletStatementScreen onBack={goBack} />
      )}

      {stage === 'cashout' && (
        <CashoutFundsScreen
          onBack={goBack}
          onEditBank={() => setStage('bank-details')}
          onConfirmed={info => {
            setCashoutInfo(info);
            setStage('cashout-success');
          }}
        />
      )}

      {stage === 'cashout-success' && (
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

      {stage === 'received-amount' && (
        <ReceivedAmountScreen onBack={goBack} />
      )}

      {stage === 'refer-earn' && (
        <ReferAndEarnScreen onBack={goBack} />
      )}

      {stage === 'help-support' && (
        <HelpSupportScreen onBack={goBack} />
      )}

      {stage === 'driver-instructions' && (
        <DriverInstructionsScreen
          onBack={goBack}
          onAgree={() => setStage('profile')}
        />
      )}

      {stage === 'scheduled-journeys' && (
        <ScheduledJourneysScreen
          onBack={goBack}
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
          onBack={goBack}
          onScanQr={() => setStage('qr-verification')}
          onViewSummary={() => setStage('boarding-summary')}
        />
      )}

      {stage === 'qr-verification' && (
        <QRVerificationScreen
          journeyKey={activeJourneyKey}
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
          onBack={goBack}
          onStartJourney={() => setStage('journey-in-progress')}
        />
      )}

      {stage === 'journey-in-progress' && (
        <JourneyInProgressScreen
          journeyKey={activeJourneyKey}
          onBack={goBack}
          onNextStop={() => setStage('destination-reached')}
          onSos={() => setStage('emergency-alert')}
        />
      )}

      {stage === 'emergency-alert' && (
        <EmergencyAlertScreen
          onBack={goBack}
          onDecline={() => setStage('journey-in-progress')}
          onApproveSafe={() => setStage('emergency-drop-summary')}
          onWaitNextStop={() => setStage('journey-in-progress')}
        />
      )}

      {stage === 'emergency-drop-summary' && (
        <EmergencyDropSummaryScreen
          onBack={goBack}
          onContinue={() => setStage('journey-in-progress')}
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
          onViewFeedback={() => setStage('feedback-ratings')}
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
            activeRide?.pickupLat != null && activeRide?.pickupLng != null
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
          pickup={
            activeRide?.pickupLat != null && activeRide?.pickupLng != null
              ? { lat: activeRide.pickupLat, lng: activeRide.pickupLng }
              : null
          }
          dropoff={
            activeRide?.dropLat != null && activeRide?.dropLng != null
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
            if (activeRide?.rideId) {
              try {
                const { updateRideStatus } = await import('./src/services/api');
                await updateRideStatus(activeRide.rideId, 'payment_pending');
              } catch (err) {
                console.warn('[ride] end-trip failed:', err);
              }
            }
            setStage('ride-summary');
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
          amount={activeRide?.fare ?? '₹0.00'}
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
          onTimeout={handleRejectIncoming}
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
            }}
          />
        </View>
      )}
    </SafeAreaProvider>
  );
}

export default App;
