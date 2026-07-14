import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
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
  type JourneySummary,
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
      <View>
        <Text
          style={{ fontSize: fs(22), lineHeight: fs(24) }}
          className="font-poppins-semibold text-brand-teal"
        >
          {value}
        </Text>
        <Text
          style={{ fontSize: fs(12), marginTop: vs(6) }}
          className="font-poppins-bold uppercase text-[#6C757D]"
        >
          {label}
        </Text>
      </View>
      <View
        style={{ height: s(36), width: s(36) }}
        className="items-center justify-center rounded-full bg-[#F0F0FA]"
      >
        {icon === 'rupee' ? <RupeeBadgeIcon size={s(18)} /> : <ListBadgeIcon size={s(18)} />}
      </View>
    </View>
  );
}

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
}: DriverDashboardScreenProps) {
  const [data, setData] = useState<DriverDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [togglingOnline, setTogglingOnline] = useState(false);
  const [unreadNotifs, setUnreadNotifs] = useState(0);
  const [upcomingJourneys, setUpcomingJourneys] = useState<JourneySummary[]>([]);

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
      const [fresh, journeys] = await Promise.all([
        fetchMyDashboardFresh(),
        fetchJourneys('upcoming').catch(() => [] as JourneySummary[]),
        refreshUnread(),
      ]);
      setData(fresh);
      setUpcomingJourneys(journeys);
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
              <View>
                <Text
                  style={{ fontSize: fs(24), lineHeight: fs(32) }}
                  className="font-poppins-semibold text-white"
                >
                  Welcome back,
                </Text>
                <Text
                  style={{ fontSize: fs(18) }}
                  className="font-poppins text-white/90"
                >
                  {driverName} 👋
                </Text>
              </View>
              <View className="flex-row items-center" style={{ gap: s(12) }}>
                <Pressable
                  onPress={onOpenWallet}
                  style={{ height: s(44), width: s(44) }}
                  className="items-center justify-center rounded-full bg-white/20"
                  hitSlop={8}
                >
                  <WalletIcon size={s(20)} color="white" />
                </Pressable>
                <Pressable
                  onPress={() => {
                    onOpenNotifications?.();
                    setUnreadNotifs(0);
                  }}
                  style={{ height: s(44), width: s(44) }}
                  className="items-center justify-center rounded-full bg-white/20"
                  hitSlop={8}
                >
                  <BellIcon size={s(20)} color="white" />
                  {unreadNotifs > 0 && (
                    <View
                      className="absolute -right-0.5 -top-0.5 items-center justify-center rounded-full border-[1.5px] border-[#0097B3] bg-[#E02D3C] px-1"
                      style={{ height: s(18), minWidth: s(18) }}
                    >
                      <Text
                        style={{ fontSize: fs(10) }}
                        className="font-poppins-bold text-white"
                      >
                        {unreadNotifs > 99 ? '99+' : unreadNotifs}
                      </Text>
                    </View>
                  )}
                </Pressable>
              </View>
            </View>

            <View
              style={{ marginTop: vs(24), height: vs(56), paddingHorizontal: s(16) }}
              className="flex-row items-center justify-between rounded-2xl bg-white shadow-sm"
            >
              <View className="flex-row items-center" style={{ gap: s(12) }}>
                <View
                  style={{ height: s(12), width: s(12) }}
                  className={`rounded-full ${
                    isOnline ? 'bg-[#00C896]' : 'bg-[#99A1AF]'
                  }`}
                />
                <Text
                  style={{ fontSize: fs(16) }}
                  className="font-poppins-semibold text-[#1E293B]"
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
                className={`h-8 w-14 justify-center rounded-full px-1 ${
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
              <Text className="text-[18px] font-poppins-semibold text-[#1E293B]">
                Incoming Requests
              </Text>
              <View className="min-w-[22px] items-center justify-center rounded-full bg-[#00C896] px-2 py-0.5">
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
                    <Text className="text-[15px] font-poppins-semibold text-[#1E293B]">
                      {req.passengerName}
                    </Text>
                    <Text className="text-[15px] font-poppins-bold text-brand-teal">
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

                  <View className="mt-2 flex-row items-center gap-3 pl-4">
                    <Text className="text-[12px] text-[#94A3B8]">
                      {req.distance}
                    </Text>
                    <Text className="text-[12px] text-[#94A3B8]">•</Text>
                    <Text className="text-[12px] text-[#94A3B8]">{req.eta}</Text>
                  </View>

                  <View className="mt-3 flex-row gap-3">
                    <Pressable
                      onPress={() => onRejectRequest?.(req)}
                      className="h-11 flex-1 items-center justify-center rounded-xl border border-[#E2E8F0] bg-white"
                    >
                      <Text className="text-[14px] font-poppins-semibold text-[#64748B]">
                        Reject
                      </Text>
                    </Pressable>
                    <Pressable
                      onPress={() => onAcceptRequest?.(req)}
                      className="h-11 flex-1 items-center justify-center rounded-xl bg-brand-teal"
                    >
                      <Text className="text-[14px] font-poppins-semibold text-white">
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
                    className="h-20 flex-row items-center gap-3 rounded-2xl px-4 shadow-sm"
                  >
                    <View className="h-12 w-12 items-center justify-center rounded-full bg-white/20">
                      {card.icon}
                    </View>
                    <View className="flex-1">
                      <Text className="text-base font-poppins-semibold text-white">
                        {card.title}
                      </Text>
                      <Text className="text-sm font-poppins-medium text-white/80">
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

            <View className="mt-4 flex-row items-center justify-between rounded-[15px] border border-[#EBEBEB] bg-white px-4 py-5">
              <View>
                <Text className="text-[13px] text-[#6A7282]">Your Rating</Text>
                <Text className="text-[22px] font-poppins-semibold leading-[22px] text-brand-teal">
                  {(data?.driver?.rating ?? 0).toFixed(1)}
                </Text>
              </View>
              <View className="flex-row items-center gap-1">
                {[1, 2, 3, 4, 5].map(i => (
                  <StarIcon
                    key={i}
                    size={20}
                    color={
                      i <= Math.round(data?.driver?.rating ?? 0)
                        ? '#FFB100'
                        : '#E5E7EB'
                    }
                  />
                ))}
              </View>
            </View>

            {upcomingJourneys.length > 0 ? (
              <View className="mt-6">
                <View className="mb-3 flex-row items-center justify-between">
                  <Text className="text-base font-poppins-semibold text-[#0A0A0A]">
                    Upcoming Scheduled Rides
                  </Text>
                  <Pressable onPress={onOpenScheduledJourneys}>
                    <Text className="text-sm font-poppins-medium text-brand-teal">
                      View All
                    </Text>
                  </Pressable>
                </View>
                {upcomingJourneys.slice(0, 3).map(j => (
                  <Pressable
                    key={j.journeyKey}
                    onPress={onOpenScheduledJourneys}
                    className="mb-3 rounded-2xl border border-[#EBEBEB] bg-white p-4 shadow-sm"
                  >
                    <View className="flex-row items-center justify-between">
                      <Text
                        className="flex-1 font-poppins-semibold text-[#1E293B]"
                        style={{ fontSize: fs(15) }}
                        numberOfLines={1}
                      >
                        {j.routeName}
                      </Text>
                      <View className="rounded-full bg-[#EBF8FA] px-2.5 py-1">
                        <Text className="font-poppins-semibold text-xs text-brand-teal">
                          ₹{j.seatPrice} / seat
                        </Text>
                      </View>
                    </View>
                    <View className="mt-2 flex-row items-center gap-4">
                      <View className="flex-row items-center gap-1.5">
                        <CalendarIcon size={14} color="#0097B3" />
                        <Text className="font-poppins-medium text-xs text-[#6A7282]">
                          {j.departureDate}
                        </Text>
                      </View>
                      <View className="flex-row items-center gap-1.5">
                        <Text className="font-poppins-semibold text-xs text-[#0A0A0A]">
                          {j.departureTime}
                        </Text>
                      </View>
                    </View>
                    <Text
                      className="mt-2 font-poppins-regular text-xs text-[#6A7282]"
                      numberOfLines={1}
                    >
                      {j.from} → {j.to}
                    </Text>
                  </Pressable>
                ))}
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
          </>
        )}
      </ScrollView>

      {/* The ride-request modal is rendered globally from App.tsx. */}
    </View>
  );
}

export default DriverDashboardScreen;
