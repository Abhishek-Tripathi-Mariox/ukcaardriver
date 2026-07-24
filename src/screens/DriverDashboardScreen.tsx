import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StatusBar,
  Text,
  View,
} from 'react-native';
import Geolocation from '@react-native-community/geolocation';
import LinearGradient from 'react-native-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { RideRequest } from '../components/RideRequestModal';
import {
  AlertCircleIcon,
  CarIcon as CarGlyphIcon,
  ClipboardListIcon,
  HourglassIcon,
} from '../components/icons/ServiceTypeIcons';
import {
  CalendarIcon,
  InstantRideIcon,
  ListBadgeIcon,
  LockIcon,
  BellIcon,
  RupeeBadgeIcon,
  StarIcon,
  WalletIcon,
  ScheduledRideIcon,
} from '../components/icons/ServiceTypeIcons';
import {
  DriverDashboard,
  fetchMyDashboardFresh,
  fetchUnreadNotificationCount,
  setOnlineStatus,
  fetchJourneys,
  getActiveRide,
  fetchMyRatings,
  type JourneySummary,
  type ActiveRide,
  type DriverRatings,
} from '../services/api';
import {
  ensureLocationPermission,
  startLocationReporting,
  stopLocationReporting,
} from '../services/locationReporter';
import { fs, s, vs } from '../theme/responsive';

type ServiceType = 'instant' | 'private' | 'scheduled';

interface RideTypeCard {
  id: ServiceType;
  title: string;
  subtitle: string;
  colors: [string, string];
  icon: React.ReactNode;
}

const RIDE_TYPE_CARDS: RideTypeCard[] = [
  {
    id: 'instant',
    title: 'Instant Ride',
    subtitle: 'Get immediate ride requests',
    colors: ['#0097B3', '#00A8C5'],
    icon: <InstantRideIcon size={22} />,
  },
  {
    id: 'private',
    title: 'Private Ride',
    subtitle: 'Premium rides with higher fares',
    colors: ['#00C896', '#00D6A5'],
    icon: <LockIcon size={22} color="white" />,
  },
  {
    id: 'scheduled',
    title: 'Scheduled Journey',
    subtitle: 'Pre-planned multi-stop rides',
    colors: ['#AD46FF', '#9810FA'],
    icon: <ScheduledRideIcon size={22} />,
  },
];

interface DriverDashboardScreenProps {
  onAcceptRide?: (request: RideRequest) => void;
  /** Ride requests currently awaiting a decision — rendered as an in-app list
   *  so the driver can accept/reject without relying on the pop-up modal. */
  incomingRequests?: RideRequest[];
  onAcceptRequest?: (request: RideRequest) => void;
  onRejectRequest?: (request: RideRequest) => void;
  /** Re-open the full-screen request modal for a tapped list item. */
  onOpenRequest?: (request: RideRequest) => void;
  onOpenEarnings?: () => void;
  onOpenProfile?: () => void;
  onOpenNotifications?: () => void;
  onOpenWallet?: () => void;
  onOpenScheduledJourneys?: () => void;
  /** Resume the driver's in-progress ride from the Current Ride card. */
  onOpenActiveRide?: () => void;
  /** Open the slide-in menu (hamburger / bottom "Menu" tab). */
  onOpenMenu?: () => void;
  /** Open the full ratings & reviews screen ("View All"). */
  onOpenReviews?: () => void;
  /** Where the driver is in vehicle registration — drives the Home banner /
   *  popup. 'approved' renders the normal dashboard. */
  registrationStatus?: 'none' | 'in-progress' | 'pending' | 'rejected' | 'approved';
  /** Tap on the registration banner / popup CTA. */
  onRegistrationAction?: () => void;
}

interface CounterCardProps {
  value: string;
  label: string;
  icon: 'rupee' | 'list';
}

function CounterCard({ value, label, icon }: CounterCardProps) {
  return (
    <View
      style={{ paddingHorizontal: s(16), paddingVertical: vs(18), borderRadius: s(15) }}
      className="flex-1 flex-row items-start justify-between border border-[#EBEBEB] bg-white"
    >
      <View style={{ flex: 1, minWidth: 0, marginRight: s(8) }}>
        <Text
          style={{ fontSize: fs(22), lineHeight: fs(26) }}
          className="font-poppins-semibold text-brand-teal"
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.7}
        >
          {value}
        </Text>
        <Text
          style={{ fontSize: fs(12), marginTop: vs(6) }}
          className="font-poppins-bold text-[#6C757D]"
          numberOfLines={1}
          ellipsizeMode="tail"
        >
          {label}
        </Text>
      </View>
      <View
        style={{ height: s(36), width: s(36), flexGrow: 0, flexShrink: 0 }}
        className="items-center justify-center rounded-full bg-[#F0F0FA]"
      >
        {icon === 'rupee' ? <RupeeBadgeIcon size={s(18)} /> : <ListBadgeIcon size={s(18)} />}
      </View>
    </View>
  );
}

const formatReviewDate = (iso?: string | null): string => {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
  } catch {
    return '';
  }
};

const initialsFor = (name?: string): string =>
  (name || '')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(w => w[0]?.toUpperCase() ?? '')
    .join('') || 'R';

const formatRupees = (n: number): string => {
  // Indian-style number formatting (1,23,456). Falls back to plain if locale support missing.
  try {
    return `₹${new Intl.NumberFormat('en-IN').format(n)}`;
  } catch {
    return `₹${n}`;
  }
};

export function DriverDashboardScreen({
  onAcceptRide,
  incomingRequests = [],
  onAcceptRequest,
  onRejectRequest,
  onOpenRequest,
  onOpenEarnings,
  onOpenProfile,
  onOpenNotifications,
  onOpenWallet,
  onOpenScheduledJourneys,
  onOpenActiveRide,
  onOpenMenu,
  onOpenReviews,
  registrationStatus = 'approved',
  onRegistrationAction,
}: DriverDashboardScreenProps) {
  const [data, setData] = useState<DriverDashboard | null>(null);
  const isApprovedDriver = registrationStatus === 'approved';
  // One-shot "register your vehicle" popup for drivers who haven't started.
  const [showRegPopup, setShowRegPopup] = useState(registrationStatus === 'none');

  // Banner copy per registration state.
  const regBanner = (() => {
    switch (registrationStatus) {
      case 'none':
        return {
          icon: 'car',
          title: 'Register your vehicle',
          body: 'Add your vehicle and documents to start receiving bookings.',
          cta: 'Register Now',
          bg: '#FFFFFF',
          accent: '#0097B3',
        };
      case 'in-progress':
        return {
          icon: 'clipboard',
          title: 'Finish your registration',
          body: 'Your vehicle registration is incomplete. Pick up where you left off.',
          cta: 'Continue',
          bg: '#FFFFFF',
          accent: '#E17100',
        };
      case 'pending':
        return {
          icon: 'hourglass',
          title: 'Waiting for approval',
          body: 'Your documents are under review. You can explore the app meanwhile — bookings start once you are approved.',
          cta: 'View status',
          bg: '#FFFBEB',
          accent: '#E17100',
        };
      case 'rejected':
        return {
          icon: 'alert',
          title: 'Action needed on your documents',
          body: 'One or more documents were rejected. Re-upload them to continue.',
          cta: 'Fix documents',
          bg: '#FEF2F2',
          accent: '#E02D3C',
        };
      default:
        return null;
    }
  })();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [togglingOnline, setTogglingOnline] = useState(false);
  const [unreadNotifs, setUnreadNotifs] = useState(0);
  const [upcomingJourneys, setUpcomingJourneys] = useState<JourneySummary[]>([]);
  // Real active ride (Current Ride card) + real reviews (Reviews list) — both
  // fetched live so neither renders fabricated placeholder people/trips.
  const [activeRide, setActiveRide] = useState<ActiveRide | null>(null);
  const [reviews, setReviews] = useState<DriverRatings['comments']>([]);

  const refreshUnread = useCallback(async () => {
    try {
      const count = await fetchUnreadNotificationCount();
      setUnreadNotifs(count);
    } catch {
      // Silent — the badge just stays at its last known value.
    }
  }, []);

  const load = useCallback(async () => {
    try {
      const [fresh, journeys, active, ratings] = await Promise.all([
        fetchMyDashboardFresh(),
        fetchJourneys('upcoming').catch(() => [] as JourneySummary[]),
        getActiveRide().catch(() => null),
        fetchMyRatings().catch(() => null),
        refreshUnread(),
      ]);
      setData(fresh);
      setUpcomingJourneys(journeys);
      setActiveRide(active);
      setReviews(ratings?.comments ?? []);
    } catch (err) {
      console.warn('[dashboard] fetch failed:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [refreshUnread]);

  useEffect(() => {
    load();
  }, [load]);

  // Poll the unread count so the badge stays fresh while the user sits on
  // the dashboard. 30s is a sensible cadence — short enough to feel live,
  // long enough to be cheap. (Push will arrive faster via FCM regardless.)
  useEffect(() => {
    const id = setInterval(refreshUnread, 30_000);
    return () => clearInterval(id);
  }, [refreshUnread]);

  const onRefresh = () => {
    setRefreshing(true);
    load();
  };

  // Get a FAST GPS fix for the toggle-online call. We deliberately ask for
  // low-accuracy (cell/wifi) with a short timeout so the toggle feels
  // instant. The backend only needs an approximate location to mark the
  // driver as dispatchable — the periodic locationReporter (every 60s) will
  // refine it to high-accuracy GPS once the satellites lock.
  //
  // Why not high-accuracy here? Cold-start GPS can take 10-30s, which made
  // the toggle feel broken. The cost of an approximate fix is being matched
  // ~50-500m away from the actual position for the first minute, which is
  // well within the 7km dispatch radius.
  const getOneShotCoords = (): Promise<{ lat: number; lng: number } | null> =>
    new Promise(resolve => {
      console.log('[toggle-online] requesting fast location fix...');
      Geolocation.getCurrentPosition(
        pos => {
          console.log('[toggle-online] fix:', pos.coords.latitude, pos.coords.longitude);
          resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        },
        err => {
          console.warn(
            '[toggle-online] location failed (code=' +
              err?.code +
              ' msg=' +
              err?.message +
              ') — proceeding without coords; reporter will catch up',
          );
          resolve(null);
        },
        // enableHighAccuracy:false → use cell/wifi (instant, indoor-friendly).
        // maximumAge:300_000 → accept any fix from the last 5 min, including
        // the one the OS already cached. timeout:4_000 → don't make the
        // driver wait more than 4 seconds in the worst case.
        { enableHighAccuracy: false, timeout: 4_000, maximumAge: 300_000 },
      );
    });

  const handleToggleOnline = async () => {
    if (!data || togglingOnline) return;
    const next = !data.driver.isOnline;
    // Optimistic flip — the toggle should feel instant. Revert on error.
    setData(d => (d ? { ...d, driver: { ...d.driver, isOnline: next } } : d));
    setTogglingOnline(true);
    try {
      // When going online, attach a GPS fix to the request so the customer
      // map shows this driver immediately. Without coords on this call,
      // currentLocation stays null until the socket reporter writes one,
      // which never happens if the socket isn't connected.
      //
      // Order matters: prompt for permission BEFORE the GPS read. The first
      // toggle previously read GPS first (which silently fails with no
      // permission, returning null) and only triggered the prompt afterwards
      // via startLocationReporting. Result: every brand-new driver went
      // online with no coords and never received any ride requests.
      let coords: { lat: number; lng: number } | null = null;
      if (next) {
        const granted = await ensureLocationPermission();
        console.log('[toggle-online] permission granted=', granted);
        if (granted) coords = await getOneShotCoords();
      }
      console.log('[toggle-online] sending coords=', coords);
      await setOnlineStatus(next, coords ?? undefined);
      // Tie the GPS reporter to the online switch — drivers shouldn't be
      // broadcasting their location while offline. start/stop are both
      // idempotent so calling them either way is safe.
      if (next) {
        startLocationReporting().catch(err =>
          console.warn('[dashboard] location start failed:', err),
        );
      } else {
        stopLocationReporting();
      }
    } catch (err) {
      console.warn('[toggle-online] failed:', err);
      // Revert on failure so the dot reflects reality.
      setData(d =>
        d ? { ...d, driver: { ...d.driver, isOnline: !next } } : d,
      );
    } finally {
      setTogglingOnline(false);
    }
  };

  // If the driver is *already* online when the dashboard mounts (returning
  // user / Metro reload), start the reporter without waiting for them to
  // toggle. Cleanup stops it whenever the online flag flips false.
  useEffect(() => {
    if (data?.driver.isOnline) {
      startLocationReporting().catch(() => {});
    } else {
      stopLocationReporting();
    }
    return () => {
      // Stop on unmount too — if the user navigates back to login the
      // dashboard unmounts and we no longer have a socket to emit on.
      stopLocationReporting();
    };
  }, [data?.driver.isOnline]);

  // Socket + ride-request modal live at the App level now (see App.tsx),
  // so this screen no longer subscribes to ride:new-request. Lifting the
  // listener fixed a bug where the modal would silently drop requests if
  // the driver had navigated away from the dashboard at dispatch time.

  const driver = data?.driver;
  const stats = data?.stats;
  const driverName =
    [driver?.firstName, driver?.lastName].filter(Boolean).join(' ') || 'Driver';
  // Filter the ride-type cards to only show the type the driver registered for.
  const visibleRideTypes = driver?.serviceType
    ? RIDE_TYPE_CARDS.filter(c => c.id === driver.serviceType)
    : RIDE_TYPE_CARDS;
  const isOnline = !!driver?.isOnline;

  return (
    <View className="flex-1 bg-white">
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      <LinearGradient
        colors={['#0097B3', '#00C896']}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        className="rounded-b-3xl"
      >
        <SafeAreaView edges={['top']}>
          <View style={{ paddingHorizontal: s(24), paddingBottom: vs(24), paddingTop: vs(8) }}>
            <View className="flex-row items-center justify-between">
              <View className="flex-1" style={{ minWidth: 0, paddingRight: s(12) }}>
                <Text
                  style={{ fontSize: fs(24), lineHeight: fs(32) }}
                  className="font-poppins-semibold text-white"
                  numberOfLines={1}
                >
                  Welcome back,
                </Text>
                <Text
                  style={{ fontSize: fs(18) }}
                  className="font-poppins text-white/90"
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  {driverName}
                </Text>
              </View>
              {/* Figma header: a single hamburger "menu" button (top-right).
                  It opens the slide-in menu, which contains Wallet,
                  Notifications (with the unread count), and the rest of the
                  destinations. The unread badge is mirrored here so the count
                  is still visible on Home. */}
              <Pressable
                onPress={onOpenMenu}
                style={{ height: s(44), width: s(52), flexGrow: 0, flexShrink: 0 }}
                className="items-center justify-center rounded-2xl bg-white/20"
                hitSlop={8}
                accessibilityLabel="Open menu"
              >
                <View style={{ gap: s(4) }}>
                  <View style={{ width: s(20), height: 2, borderRadius: 2 }} className="bg-white" />
                  <View style={{ width: s(20), height: 2, borderRadius: 2 }} className="bg-white" />
                  <View style={{ width: s(20), height: 2, borderRadius: 2 }} className="bg-white" />
                </View>
                {unreadNotifs > 0 && (
                  <View
                    className="absolute -right-1 -top-1 items-center justify-center rounded-full border-[1.5px] border-[#0097B3] bg-[#E02D3C] px-1"
                    style={{ height: s(18), minWidth: s(18) }}
                  >
                    <Text style={{ fontSize: fs(10) }} className="font-poppins-bold text-white">
                      {unreadNotifs > 99 ? '99+' : unreadNotifs}
                    </Text>
                  </View>
                )}
              </Pressable>
            </View>

            {!isApprovedDriver && regBanner ? (
              <Pressable
                onPress={onRegistrationAction}
                style={{
                  marginTop: vs(24),
                  paddingHorizontal: s(16),
                  paddingVertical: vs(12),
                  borderRadius: s(16),
                  backgroundColor: regBanner.bg,
                }}
                className="flex-row items-center shadow-sm"
              >
                <View style={{ marginRight: s(10), flexGrow: 0, flexShrink: 0 }}>
                  {regBanner.icon === 'car' && <CarGlyphIcon size={s(24)} color={regBanner.accent} />}
                  {regBanner.icon === 'clipboard' && <ClipboardListIcon size={s(24)} color={regBanner.accent} />}
                  {regBanner.icon === 'hourglass' && <HourglassIcon size={s(24)} color={regBanner.accent} />}
                  {regBanner.icon === 'alert' && <AlertCircleIcon size={s(24)} color={regBanner.accent} />}
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text
                    style={{ fontSize: fs(14.5) }}
                    className="font-poppins-semibold text-[#1E293B]"
                    numberOfLines={1}
                    ellipsizeMode="tail"
                  >
                    {regBanner.title}
                  </Text>
                  <Text
                    style={{ fontSize: fs(11.5), marginTop: vs(2) }}
                    className="font-poppins text-[#6C757D]"
                    numberOfLines={2}
                    ellipsizeMode="tail"
                  >
                    {regBanner.body}
                  </Text>
                </View>
                <View
                  style={{
                    paddingHorizontal: s(12),
                    paddingVertical: vs(7),
                    borderRadius: s(10),
                    backgroundColor: regBanner.accent,
                    marginLeft: s(8),
                    flexGrow: 0,
                    flexShrink: 0,
                  }}
                >
                  <Text
                    style={{ fontSize: fs(12) }}
                    className="font-poppins-medium text-white"
                    numberOfLines={1}
                  >
                    {regBanner.cta}
                  </Text>
                </View>
              </Pressable>
            ) : (
            <View
              style={{
                marginTop: vs(24),
                minHeight: vs(56),
                paddingHorizontal: s(16),
                paddingVertical: vs(8),
              }}
              className="flex-row items-center justify-between rounded-2xl bg-white shadow-sm"
            >
              <View
                className="flex-1 flex-row items-center"
                style={{ gap: s(12), minWidth: 0, marginRight: s(10) }}
              >
                <View
                  style={{ height: s(12), width: s(12), flexGrow: 0, flexShrink: 0 }}
                  className={`rounded-full ${
                    isOnline ? 'bg-[#00C896]' : 'bg-[#99A1AF]'
                  }`}
                />
                <Text
                  style={{ fontSize: fs(16), flexShrink: 1 }}
                  className="font-poppins-semibold text-[#1E293B]"
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  {isOnline ? "You're Online" : "You're Offline"}
                </Text>
                {togglingOnline && (
                  <ActivityIndicator size="small" color="#0097B3" />
                )}
              </View>
              <Pressable
                onPress={handleToggleOnline}
                disabled={togglingOnline || loading}
                hitSlop={12}
                className={`h-8 w-14 shrink-0 grow-0 justify-center rounded-full px-1 ${
                  isOnline ? 'bg-brand-teal' : 'bg-[#CBCED4]'
                }`}
                style={{
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: 0.15,
                  shadowRadius: 2,
                  elevation: 2,
                }}
              >
                <View
                  className={`h-6 w-6 rounded-full bg-white ${
                    isOnline ? 'self-end' : 'self-start'
                  }`}
                  style={{
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 1 },
                    shadowOpacity: 0.25,
                    shadowRadius: 2,
                    elevation: 3,
                  }}
                />
              </Pressable>
            </View>
            )}
          </View>
        </SafeAreaView>
      </LinearGradient>

      <ScrollView
        className="flex-1"
        contentContainerClassName="px-6 pb-28 pt-6"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* In-app incoming ride requests — lets the driver accept/reject from
            the dashboard itself, not only from the pop-up modal / notification.
            Shown above everything and even while the dashboard stats load. */}
        {incomingRequests.length > 0 && (
          <View className="mb-5">
            <View className="mb-3 flex-row items-center gap-2">
              <Text
                className="shrink text-[18px] font-poppins-semibold text-[#1E293B]"
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                Incoming Requests
              </Text>
              <View className="min-w-[22px] shrink-0 grow-0 items-center justify-center rounded-full bg-[#00C896] px-2 py-0.5">
                <Text className="text-[12px] font-poppins-bold text-white">
                  {incomingRequests.length}
                </Text>
              </View>
            </View>

            <View className="gap-3">
              {incomingRequests.map(req => (
                <Pressable
                  key={req.rideId}
                  onPress={() => onOpenRequest?.(req)}
                  className="rounded-2xl border border-[#E2E8F0] bg-white p-4 shadow-sm"
                >
                  <View className="flex-row items-center justify-between">
                    <Text
                      className="flex-1 pr-2 text-[15px] font-poppins-semibold text-[#1E293B]"
                      numberOfLines={1}
                      ellipsizeMode="tail"
                    >
                      {req.passengerName}
                    </Text>
                    <Text
                      className="shrink-0 text-[15px] font-poppins-bold text-brand-teal"
                      numberOfLines={1}
                    >
                      {req.fare}
                    </Text>
                  </View>

                  <View className="mt-2 flex-row items-center gap-2">
                    <View className="h-2 w-2 rounded-full bg-[#00C896]" />
                    <Text
                      className="flex-1 text-[13px] text-[#475569]"
                      numberOfLines={1}
                    >
                      {req.pickup || 'Pickup'}
                    </Text>
                  </View>
                  <View className="mt-1 flex-row items-center gap-2">
                    <View className="h-2 w-2 rounded-full bg-[#E02D3C]" />
                    <Text
                      className="flex-1 text-[13px] text-[#475569]"
                      numberOfLines={1}
                    >
                      {req.drop || 'Drop'}
                    </Text>
                  </View>

                  <View className="mt-2 flex-row flex-wrap items-center gap-3 pl-4">
                    <Text className="shrink text-[12px] text-[#94A3B8]" numberOfLines={1}>
                      {req.distance}
                    </Text>
                    <Text className="shrink-0 text-[12px] text-[#94A3B8]">•</Text>
                    <Text className="shrink text-[12px] text-[#94A3B8]" numberOfLines={1}>
                      {req.eta}
                    </Text>
                  </View>

                  <View className="mt-3 flex-row gap-3">
                    <Pressable
                      onPress={() => onRejectRequest?.(req)}
                      className="h-11 flex-1 items-center justify-center rounded-xl border border-[#E2E8F0] bg-white"
                    >
                      <Text className="text-[14px] font-poppins-medium text-[#64748B]">
                        Reject
                      </Text>
                    </Pressable>
                    <Pressable
                      onPress={() => onAcceptRequest?.(req)}
                      className="h-11 flex-1 items-center justify-center rounded-xl bg-brand-teal"
                    >
                      <Text className="text-[14px] font-poppins-medium text-white">
                        Accept
                      </Text>
                    </Pressable>
                  </View>
                </Pressable>
              ))}
            </View>
          </View>
        )}

        {loading && !data ? (
          <View className="py-20 items-center">
            <ActivityIndicator color="#0097B3" />
          </View>
        ) : (
          <>
            <View className="mb-1">
              <Text className="text-[18px] font-poppins-semibold text-[#1E293B]">
                Your Ride Type
              </Text>
            </View>

            <View className="mt-3 gap-3">
              {visibleRideTypes.map(card => {
                const cardEl = (
                  <LinearGradient
                    colors={card.colors}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 0, y: 1 }}
                    style={{ minHeight: vs(80), paddingVertical: vs(10) }}
                    className="flex-row items-center gap-3 rounded-2xl px-4 shadow-sm"
                  >
                    <View className="h-12 w-12 shrink-0 grow-0 items-center justify-center rounded-full bg-white/20">
                      {card.icon}
                    </View>
                    <View className="flex-1" style={{ minWidth: 0 }}>
                      <Text
                        className="text-base font-poppins-semibold text-white"
                        numberOfLines={1}
                        ellipsizeMode="tail"
                      >
                        {card.title}
                      </Text>
                      <Text
                        className="text-sm font-poppins-medium text-white/80"
                        numberOfLines={2}
                        ellipsizeMode="tail"
                      >
                        {card.subtitle}
                      </Text>
                    </View>
                  </LinearGradient>
                );
                return card.id === 'scheduled' ? (
                  <Pressable key={card.id} onPress={onOpenScheduledJourneys}>
                    {cardEl}
                  </Pressable>
                ) : (
                  <View key={card.id}>{cardEl}</View>
                );
              })}
            </View>

            <View className="mt-6 gap-4">
              <View className="flex-row gap-4">
                <CounterCard
                  value={formatRupees(stats?.totalEarnings ?? 0)}
                  label="Total Earning"
                  icon="rupee"
                />
                <CounterCard
                  value={String(stats?.totalServices ?? 0)}
                  label="Total Service"
                  icon="list"
                />
              </View>
              <View className="flex-row gap-4">
                <CounterCard
                  value={String(Math.max(stats?.upcomingServices ?? 0, upcomingJourneys.length))}
                  label="Upcoming Services"
                  icon="list"
                />
                <CounterCard
                  value={String(stats?.todayServices ?? 0).padStart(2, '0')}
                  label="Today's Service"
                  icon="list"
                />
              </View>
            </View>

            {/* Current Ride — real in-progress/assigned ride (getActiveRide).
                Only rendered when one actually exists; no placeholder trip. */}
            {activeRide && (
              <Pressable onPress={onOpenActiveRide} className="mt-4">
                <LinearGradient
                  colors={['#0097B3', '#00C896']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={{ borderRadius: s(16), padding: s(16) }}
                >
                  <View className="flex-row items-center justify-between">
                    <Text
                      className="flex-1 font-poppins-semibold text-white"
                      style={{ fontSize: fs(18), minWidth: 0, paddingRight: s(8) }}
                      numberOfLines={1}
                      ellipsizeMode="tail"
                    >
                      Current Ride
                    </Text>
                    <View
                      className="rounded-full bg-white/25"
                      style={{
                        paddingHorizontal: s(10),
                        paddingVertical: vs(3),
                        flexGrow: 0,
                        flexShrink: 0,
                      }}
                    >
                      <Text
                        className="font-poppins-semibold text-white"
                        style={{ fontSize: fs(13) }}
                        numberOfLines={1}
                      >
                        ₹{Number(activeRide.estimatedFare ?? 0).toFixed(0)}
                      </Text>
                    </View>
                  </View>
                  <Text
                    className="font-poppins-medium text-white/90"
                    style={{ fontSize: fs(14), marginTop: vs(4) }}
                    numberOfLines={1}
                  >
                    {[activeRide.customer?.firstName, activeRide.customer?.lastName]
                      .filter(Boolean)
                      .join(' ') || 'Passenger'}
                  </Text>
                  <View className="flex-row items-center" style={{ marginTop: vs(10), gap: s(8) }}>
                    <View
                      style={{ width: s(8), height: s(8), borderRadius: s(4) }}
                      className="bg-[#B9F8CF]"
                    />
                    <Text
                      className="flex-1 font-poppins-regular text-white/90"
                      style={{ fontSize: fs(13) }}
                      numberOfLines={1}
                    >
                      {activeRide.pickup?.address || 'Pickup'}
                    </Text>
                  </View>
                  <View className="flex-row items-center" style={{ marginTop: vs(4), gap: s(8) }}>
                    <View
                      style={{ width: s(8), height: s(8), borderRadius: s(4) }}
                      className="bg-white"
                    />
                    <Text
                      className="flex-1 font-poppins-regular text-white/90"
                      style={{ fontSize: fs(13) }}
                      numberOfLines={1}
                    >
                      {activeRide.dropoff?.address || 'Drop'}
                    </Text>
                  </View>
                  <View
                    className="items-center justify-center rounded-xl bg-white"
                    style={{ marginTop: vs(14), height: vs(44) }}
                  >
                    <Text className="font-poppins-semibold text-brand-teal" style={{ fontSize: fs(15) }}>
                      {activeRide.status === 'in_progress'
                        ? 'Continue Ride'
                        : activeRide.status === 'payment_pending'
                          ? 'Collect Payment'
                          : 'Start Ride'}
                    </Text>
                  </View>
                </LinearGradient>
              </Pressable>
            )}

            {(() => {
              // A brand-new driver's true average is 0; show a neutral 5.0
              // until the first real rating arrives (real averages are >= 1).
              const real = data?.driver?.rating ?? 0;
              const shown = real > 0 ? real : 5;
              return (
                <View className="mt-4 flex-row items-center justify-between rounded-[15px] border border-[#EBEBEB] bg-white px-4 py-5">
                  <View className="flex-1 pr-3" style={{ minWidth: 0 }}>
                    <Text className="text-[13px] text-[#6A7282]" numberOfLines={1}>
                      Your Rating
                    </Text>
                    <Text
                      className="text-[22px] font-poppins-semibold leading-[26px] text-brand-teal"
                      numberOfLines={1}
                    >
                      {shown.toFixed(1)}
                    </Text>
                  </View>
                  <View className="shrink-0 grow-0 flex-row items-center gap-1">
                    {[1, 2, 3, 4, 5].map(i => (
                      <StarIcon
                        key={i}
                        size={20}
                        color={i <= Math.round(shown) ? '#FFB100' : '#E5E7EB'}
                      />
                    ))}
                  </View>
                </View>
              );
            })()}

            {upcomingJourneys.length > 0 ? (
              <View className="mt-6">
                <View className="mb-3 flex-row items-center justify-between">
                  <View className="flex-1 flex-row items-center gap-2 pr-2" style={{ minWidth: 0 }}>
                    <Text
                      className="shrink text-base font-poppins-semibold text-[#0A0A0A]"
                      numberOfLines={1}
                      ellipsizeMode="tail"
                    >
                      Upcoming Scheduled Rides
                    </Text>
                    <View className="min-w-[20px] shrink-0 grow-0 items-center justify-center rounded-full bg-brand-teal px-1.5 py-0.5">
                      <Text className="text-[11px] font-poppins-bold text-white">
                        {upcomingJourneys.length}
                      </Text>
                    </View>
                  </View>
                  <Pressable onPress={onOpenScheduledJourneys} hitSlop={8} className="shrink-0">
                    <Text className="text-sm font-poppins-medium text-brand-teal" numberOfLines={1}>
                      View All
                    </Text>
                  </Pressable>
                </View>
                {/* Figma "Upcoming Scheduled Rides" — tinted cards (alternating
                    blue/pink), a seat pill, calendar + time, a coloured route
                    dot and a "View Details" button. All fields are real journey
                    data; the tint/dot alternate purely for visual rhythm. */}
                {upcomingJourneys.slice(0, 3).map((j, idx) => {
                  const tint = idx % 2 === 0 ? '#EFF6FF' : '#FDF2F8';
                  const dot = idx % 2 === 0 ? '#0097B3' : '#9810FA';
                  return (
                    <Pressable
                      key={j.journeyKey}
                      onPress={onOpenScheduledJourneys}
                      style={{ backgroundColor: tint }}
                      className="mb-3 rounded-2xl border border-[#EBEBEB] p-4"
                    >
                      <View className="flex-row items-center justify-between">
                        <View
                          className="flex-1 flex-row items-center gap-1.5 pr-2"
                          style={{ minWidth: 0 }}
                        >
                          <View className="shrink-0 grow-0">
                            <CalendarIcon size={14} color="#0097B3" />
                          </View>
                          <Text
                            className="flex-1 font-poppins-medium text-xs text-[#6A7282]"
                            numberOfLines={1}
                            ellipsizeMode="tail"
                          >
                            {j.departureDate}, {j.departureTime}
                          </Text>
                        </View>
                        <View className="shrink-0 grow-0 rounded-full bg-[#F3E8FF] px-2.5 py-1">
                          <Text
                            className="font-poppins-semibold text-xs text-[#9810FA]"
                            numberOfLines={1}
                          >
                            {j.passengerCount}/{j.totalSeats} seats
                          </Text>
                        </View>
                      </View>
                      <View className="mt-2.5 flex-row items-center gap-2">
                        <View
                          className="h-2.5 w-2.5 shrink-0 grow-0 rounded-full"
                          style={{ backgroundColor: dot }}
                        />
                        <Text
                          className="flex-1 font-poppins-semibold text-[#1E293B]"
                          style={{ fontSize: fs(14) }}
                          numberOfLines={1}
                        >
                          {j.from} → {j.to}
                        </Text>
                      </View>
                      <Text
                        className="mt-1 font-poppins-regular text-xs text-[#6A7282]"
                        numberOfLines={1}
                      >
                        {j.routeName} • ₹{j.seatPrice}/seat
                      </Text>
                      <Pressable
                        onPress={onOpenScheduledJourneys}
                        className="mt-3 h-10 items-center justify-center rounded-xl border border-brand-teal bg-white"
                      >
                        <Text className="font-poppins-medium text-sm text-brand-teal">
                          View Details
                        </Text>
                      </Pressable>
                    </Pressable>
                  );
                })}
              </View>
            ) : (stats?.upcomingServices ?? 0) === 0 ? (
              <View className="mt-6 rounded-2xl bg-white p-5 shadow-sm items-center">
                <CalendarIcon size={32} color="#9CA3AF" />
                <Text className="mt-2 text-base font-poppins-semibold text-[#0A0A0A]">
                  No upcoming rides
                </Text>
                <Text className="mt-1 text-center text-sm text-[#6C757D]">
                  Go online and start accepting nearby ride requests.
                </Text>
              </View>
            ) : null}

            {/* Reviews — real rider reviews (name • stars • date • text) from
                /drivers/me/ratings. Placed AFTER Upcoming Scheduled Rides.
                Populated when the driver has reviews; clean empty state
                otherwise. No placeholder reviewers. */}
            <View className="mt-6">
              <View className="mb-3 flex-row items-center justify-between">
                <Text
                  className="flex-1 pr-2 text-base font-poppins-semibold text-[#0A0A0A]"
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  Reviews
                </Text>
                {reviews.length > 0 && (
                  <Pressable onPress={onOpenReviews} hitSlop={8} className="shrink-0">
                    <Text className="text-sm font-poppins-medium text-brand-teal" numberOfLines={1}>
                      View All
                    </Text>
                  </Pressable>
                )}
              </View>
              {reviews.length === 0 ? (
                <View
                  className="items-center rounded-2xl border border-[#EBEBEB] bg-white"
                  style={{ paddingVertical: vs(28), paddingHorizontal: s(16) }}
                >
                  <View
                    className="items-center justify-center rounded-full bg-[#FFF7E6]"
                    style={{ width: s(48), height: s(48) }}
                  >
                    <StarIcon size={22} color="#FFB100" />
                  </View>
                  <Text
                    className="mt-3 font-poppins-semibold text-[#1E293B]"
                    style={{ fontSize: fs(15) }}
                  >
                    No reviews yet
                  </Text>
                  <Text
                    className="mt-1 text-center font-poppins-regular text-[#6A7282]"
                    style={{ fontSize: fs(13) }}
                  >
                    Reviews from your riders will appear here after your trips.
                  </Text>
                </View>
              ) : (
                reviews.slice(0, 4).map(r => (
                  <View
                    key={r.id}
                    className="mb-3 rounded-2xl border border-[#EBEBEB] bg-white p-4"
                  >
                    <View className="flex-row items-center" style={{ gap: s(12) }}>
                      <View
                        className="items-center justify-center rounded-full bg-[#E9D4FF]"
                        style={{ width: s(40), height: s(40), flexGrow: 0, flexShrink: 0 }}
                      >
                        <Text
                          className="font-poppins-semibold text-[#8200DB]"
                          style={{ fontSize: fs(15) }}
                        >
                          {initialsFor(r.reviewerName)}
                        </Text>
                      </View>
                      <View className="flex-1">
                        <Text
                          className="font-poppins-semibold text-[#1E293B]"
                          style={{ fontSize: fs(15) }}
                          numberOfLines={1}
                        >
                          {r.reviewerName || 'Rider'}
                        </Text>
                        <View
                          className="flex-row items-center"
                          style={{ gap: s(2), marginTop: vs(2) }}
                        >
                          {[1, 2, 3, 4, 5].map(i => (
                            <StarIcon
                              key={i}
                              size={12}
                              color={i <= Math.round(r.stars) ? '#FFB100' : '#E5E7EB'}
                            />
                          ))}
                          <Text
                            className="font-poppins-medium text-[#6A7282]"
                            style={{ fontSize: fs(12), marginLeft: s(4) }}
                          >
                            {r.stars.toFixed(1)}
                          </Text>
                        </View>
                      </View>
                      {!!formatReviewDate(r.date) && (
                        <Text
                          className="font-poppins-regular text-[#9CA3AF]"
                          style={{ fontSize: fs(12), flexGrow: 0, flexShrink: 0 }}
                          numberOfLines={1}
                        >
                          {formatReviewDate(r.date)}
                        </Text>
                      )}
                    </View>
                    {!!r.text && (
                      <Text
                        className="font-poppins-regular text-[#6A7282]"
                        style={{ fontSize: fs(13), marginTop: vs(8) }}
                      >
                        {r.text}
                      </Text>
                    )}
                  </View>
                ))
              )}
            </View>
          </>
        )}
      </ScrollView>

      {/* One-time "register your vehicle" popup for fresh accounts. The
          driver can dismiss it and keep exploring — the header banner stays
          as the persistent entry point. */}
      <Modal
        visible={showRegPopup && registrationStatus === 'none'}
        transparent
        animationType="fade"
        onRequestClose={() => setShowRegPopup(false)}
      >
        <View className="flex-1 items-center justify-center bg-black/50" style={{ padding: s(28) }}>
          <View className="w-full rounded-3xl bg-white" style={{ padding: s(24) }}>
            <View className="items-center">
              <CarGlyphIcon size={s(48)} color="#0097B3" />
            </View>
            <Text
              style={{ fontSize: fs(18), marginTop: vs(10), textAlign: 'center' }}
              className="font-poppins-semibold text-[#1E293B]"
            >
              Register your vehicle
            </Text>
            <Text
              style={{ fontSize: fs(13), marginTop: vs(8), textAlign: 'center' }}
              className="font-poppins text-[#6C757D]"
            >
              Your account is ready! Add your vehicle and documents to start
              receiving bookings. You can explore the app first — registration
              takes about 10 minutes.
            </Text>
            <Pressable
              onPress={() => {
                setShowRegPopup(false);
                onRegistrationAction?.();
              }}
              style={{ marginTop: vs(18), paddingVertical: vs(13), borderRadius: s(12) }}
              className="items-center bg-brand-teal"
            >
              <Text style={{ fontSize: fs(15) }} className="font-poppins-medium text-white">
                Register Vehicle
              </Text>
            </Pressable>
            <Pressable
              onPress={() => setShowRegPopup(false)}
              style={{ marginTop: vs(10), paddingVertical: vs(10) }}
              className="items-center"
            >
              <Text style={{ fontSize: fs(13) }} className="font-poppins text-[#6C757D]">
                Explore the app first
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* The ride-request modal is rendered globally from App.tsx. */}
    </View>
  );
}

export default DriverDashboardScreen;
