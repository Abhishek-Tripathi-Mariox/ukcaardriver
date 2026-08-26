import { useEffect, useState } from 'react';
import { Alert, Linking, Pressable, ScrollView, StatusBar, Text, View } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { ApiError, fetchJourney, fetchJourneyPassengers, startJourney } from '../services/api';
import { dialPhone } from '../utils/navigation';
import {
  BackArrowIcon,
  ChatBubbleIcon,
  ClockSmallIcon,
  LocationPinSmallIcon,
  PhoneIcon,
  RoutingIcon,
  UsersIcon,
} from '../components/icons/ServiceTypeIcons';
import { fs, s, vs } from '../theme/responsive';

interface Stop {
  index: number;
  title: string;
  time: string;
  board?: number;
  drop?: number;
  final?: boolean;
}

interface Passenger {
  id: string;
  bookingId?: string;
  name: string;
  seat: number;
  contact: string;
  boarded: boolean;
  noShow: boolean;
}

interface UpcomingBookingDetailsScreenProps {
  journeyKey?: string | null;
  journeyId?: string;
  title?: string;
  routeFrom?: string;
  routeTo?: string;
  date?: string;
  time?: string;
  stopsCount?: number;
  passengerCount?: number;
  durationMins?: number;
  stops?: Stop[];
  passengers?: Passenger[];
  totalFare?: string;
  baseFare?: string;
  stopsFare?: string;
  onBack?: () => void;
  onCallPassenger?: (id: string) => void;
  /** Open the booking-scoped chat thread with this passenger's customer. */
  onChatPassenger?: (p: { bookingId: string; name: string; contact?: string }) => void;
  onStartJourney?: () => void;
}

// Neutral fallbacks — real stops/passengers are fetched on mount.
const DEFAULT_STOPS: Stop[] = [];

const DEFAULT_PASSENGERS: Passenger[] = [];

function StopRow({ stop, isLast }: { stop: Stop; isLast: boolean }) {
  const dotColor = stop.index === 1 ? '#00C950' : stop.final ? '#FB2C36' : '#AD46FF';
  return (
    <View className="flex-row" style={{ gap: s(16) }}>
      <View className="items-center">
        <View
          className="rounded-full"
          style={{ width: s(16), height: s(16), backgroundColor: dotColor }}
        />
        {!isLast && <View className="flex-1 bg-[#D1D5DC]" style={{ marginTop: vs(4), width: s(2) }} />}
      </View>
      <View className="flex-1" style={{ paddingBottom: vs(16) }}>
        <Text
          className="font-poppins-medium text-[#1E293B]"
          style={{ fontSize: fs(16), lineHeight: fs(22) }}
          numberOfLines={2}
        >
          {stop.title}
        </Text>
        <Text
          className="text-[#6A7282]"
          style={{ fontSize: fs(14), marginTop: vs(2) }}
        >
          {stop.time || 'Scheduled Stop'}
        </Text>
        <View className="flex-row" style={{ marginTop: vs(8), gap: s(16) }}>
          {stop.board != null && (
            <Text
              className="text-[#00A63E] font-poppins-medium"
              style={{ fontSize: fs(14) }}
            >
              ↑ {stop.board} Board
            </Text>
          )}
          {stop.drop != null && (
            <Text
              className="text-[#E7000B] font-poppins-medium"
              style={{ fontSize: fs(14) }}
            >
              ↓ {stop.drop} Drop
            </Text>
          )}
        </View>
      </View>
    </View>
  );
}

function PassengerRow({
  passenger,
  onCall,
  onChat,
}: {
  passenger: Passenger;
  onCall?: () => void;
  onChat?: () => void;
}) {
  const initials =
    passenger.name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase() ?? '')
      .join('') || '?';
  const status = passenger.noShow
    ? { label: 'No-show', color: '#E7000B' }
    : passenger.boarded
      ? { label: 'Boarded', color: '#00A63E' }
      : { label: 'Not boarded yet', color: '#6A7282' };
  return (
    <View
      className="flex-row items-center justify-between bg-[#F9FAFB]"
      style={{ borderRadius: s(16), paddingHorizontal: s(16), paddingVertical: vs(12) }}
    >
      <View className="flex-1 flex-row items-center" style={{ gap: s(12) }}>
        <View
          className="items-center justify-center rounded-full bg-[#E9D4FF]"
          style={{ width: s(40), height: s(40) }}
        >
          <Text
            className="font-poppins-semibold text-[#8200DB]"
            style={{ fontSize: fs(15) }}
          >
            {initials}
          </Text>
        </View>
        <View className="flex-1 pr-2">
          <Text
            className="font-poppins-medium text-[#1E293B]"
            style={{ fontSize: fs(16), lineHeight: fs(22) }}
            numberOfLines={1}
          >
            {passenger.name}
          </Text>
          <Text
            className="text-[#6A7282] font-poppins-regular"
            style={{ fontSize: fs(14) }}
            numberOfLines={1}
          >
            Seat {passenger.seat} • <Text style={{ color: status.color }}>{status.label}</Text>
          </Text>
        </View>
      </View>
      <View className="flex-row items-center" style={{ gap: s(8) }}>
        {onChat && (
          <Pressable
            onPress={onChat}
            hitSlop={8}
            className="items-center justify-center rounded-full bg-[#E0F7FA]"
            style={{ width: s(36), height: s(36) }}
          >
            <ChatBubbleIcon size={s(16)} color="#0097B3" />
          </Pressable>
        )}
        <Pressable
          onPress={onCall}
          hitSlop={8}
          className="items-center justify-center rounded-full bg-[#0097B3]"
          style={{ width: s(36), height: s(36) }}
        >
          <PhoneIcon size={s(16)} color="white" />
        </Pressable>
      </View>
    </View>
  );
}

export function UpcomingBookingDetailsScreen({
  journeyKey,
  journeyId = 'SCH001',
  title: titleProp = 'Scheduled Journey',
  routeFrom: routeFromProp = '—',
  routeTo: routeToProp = '—',
  date: dateProp = '—',
  time: timeProp = '—',
  stopsCount: stopsCountProp = 5,
  passengerCount: passengerCountProp = 12,
  durationMins = 40,
  stops: stopsProp = DEFAULT_STOPS,
  passengers: passengersProp = DEFAULT_PASSENGERS,
  totalFare: totalFareProp = '—',
  onBack,
  onCallPassenger,
  onChatPassenger,
  onStartJourney,
}: UpcomingBookingDetailsScreenProps) {
  const insets = useSafeAreaInsets();
  const [detail, setDetail] = useState<Awaited<ReturnType<typeof fetchJourney>> | null>(null);
  const [detailError, setDetailError] = useState(false);
  // Bumping this re-runs the fetch effect (Retry action on fetch failure).
  const [fetchNonce, setFetchNonce] = useState(0);
  const [pax, setPax] = useState<Passenger[] | null>(null);
  const [starting, setStarting] = useState(false);
  // Re-evaluated every 30s so the Start button enables itself once the
  // start window opens while the driver keeps the screen open.
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const tick = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(tick);
  }, []);

  useEffect(() => {
    if (!journeyKey) return;
    setDetailError(false);
    fetchJourney(journeyKey)
      .then((d) => {
        setDetail(d);
        setDetailError(false);
      })
      // Don't leave the driver stuck: the failure is surfaced inline with a
      // Retry action, and the Start gate fails open (server still enforces).
      .catch(() => setDetailError(true));
    fetchJourneyPassengers(journeyKey)
      .then((r) =>
        setPax(
          // Map only the fields the backend actually returns. The API never
          // populates gender/age/stop, so the old code defaulted them to
          // M / 28 / Stop 1 for every rider — fabricated data the driver
          // would read as real. Show the seat + live boarding status instead.
          r.passengers.map((p) => ({
            id: `${p.bookingId}-${p.seat}`,
            bookingId: p.bookingId,
            name: p.name,
            seat: p.seat,
            contact: p.contact,
            boarded: p.boarded,
            noShow: p.noShow,
          })),
        ),
      )
      .catch(() => {});
  }, [journeyKey, fetchNonce]);

  const j = detail?.journey;
  const title = j?.routeName ?? titleProp;
  const routeFrom = j?.from ?? routeFromProp;
  const routeTo = j?.to ?? routeToProp;
  const date = j?.departureDate ?? dateProp;
  const time = j?.departureTime ?? timeProp;
  const stopsCount = detail?.stops?.length ?? stopsCountProp;
  const passengerCount = j?.passengerCount ?? passengerCountProp;
  const stops =
    detail?.stops?.map((s, i) => ({ index: i + 1, title: s.name, time: '' })) ?? stopsProp;
  const passengers = pax ?? passengersProp;
  // Real fare = seat price × seats booked. No fabricated base/stops split.
  const seatPrice = j?.seatPrice ?? 0;
  const grossFare = seatPrice * passengerCount;
  const totalFare = j ? `₹${grossFare.toLocaleString('en-IN')}` : totalFareProp;

  // ── Start-window gating (all business times are IST) ──
  // Server enforces this too; the client mirrors it so the driver is not
  // offered a button that can only fail.
  const startWindowMinutes = j?.startWindowMinutes ?? 30;
  // IST-correct departure instant: pin the offset so the device timezone
  // never shifts the result.
  const departureMs =
    /^\d{4}-\d{2}-\d{2}$/.test(date) && /^\d{1,2}:\d{2}$/.test(time)
      ? Date.parse(`${date}T${time.padStart(5, '0')}:00+05:30`)
      : NaN;
  const windowOpensMs = departureMs - startWindowMinutes * 60_000;
  // Today's IST civil date, independent of the device timezone.
  const istToday = new Date(now + 5.5 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const departureKnown = Number.isFinite(departureMs);
  const isFutureDate = departureKnown && date > istToday;
  // Pure epoch rule — no civil-date veto, so a start window that spans
  // midnight (e.g. a 00:10 slot startable from 23:40) works. When departure
  // info is unknown (detail fetch failed / missing date+time) we FAIL OPEN:
  // the server enforces the window authoritatively and returns a clean
  // message, so the driver is never silently locked out by a client gap.
  const canStart = !!journeyKey && (!departureKnown || now >= windowOpensMs);

  const istClock = (ms: number) =>
    new Date(ms).toLocaleTimeString('en-IN', {
      timeZone: 'Asia/Kolkata',
      hour: '2-digit',
      minute: '2-digit',
    });
  const istDate = (ms: number) =>
    new Date(ms).toLocaleDateString('en-IN', {
      timeZone: 'Asia/Kolkata',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });

  let startHelper: string | null = null;
  if (!canStart && journeyKey && departureKnown) {
    // Before the window opens: a genuinely future IST date reads better as a
    // date; otherwise (today, or a window that opens later today for an
    // after-midnight slot) show the exact opening time.
    startHelper = isFutureDate
      ? `This journey is scheduled for ${istDate(departureMs)}`
      : `Journey can be started from ${istClock(windowOpensMs)}`;
  }

  const handleStart = async () => {
    // No trip identity — nothing legitimate to start. The button is disabled
    // in this state; this guard is the last line of defence.
    if (!journeyKey || !canStart) return;
    setStarting(true);
    try {
      await startJourney(journeyKey);
      onStartJourney?.();
    } catch (err) {
      // Server 4xx messages are already clean business English; anything
      // else (network, parse) gets a generic fallback — never raw errors.
      const message = err instanceof ApiError ? err.message : 'Please try again.';
      Alert.alert('Could not start', message);
    } finally {
      setStarting(false);
    }
  };

  return (
    <View className="flex-1 bg-white">
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      <LinearGradient
        colors={['#AD46FF', '#9810FA']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
      >
        <SafeAreaView edges={['top']}>
          <View
            className="flex-row items-center"
            style={{ paddingHorizontal: s(24), paddingBottom: vs(16), paddingTop: vs(8), gap: s(16) }}
          >
            <Pressable onPress={onBack} hitSlop={10}>
              <BackArrowIcon size={s(22)} color="white" />
            </Pressable>
            <View className="flex-1">
              <Text
                className="font-poppins-semibold text-white"
                style={{ fontSize: fs(20), lineHeight: fs(28) }}
              >
                {title}
              </Text>
              <Text
                className="text-white/80 font-poppins-regular"
                style={{ fontSize: fs(14) }}
              >
                Journey ID: {journeyId}
              </Text>
            </View>
          </View>
        </SafeAreaView>
      </LinearGradient>

      <LinearGradient
        colors={['#F3E8FF', '#E9D4FF']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View className="items-center" style={{ paddingVertical: vs(24) }}>
          <RoutingIcon size={s(32)} color="#6E11B0" />
          <Text
            className="font-poppins-medium text-[#6E11B0]"
            style={{ fontSize: fs(16), marginTop: vs(8) }}
          >
            Route Map
          </Text>
          <Text
            className="text-[#9810FA] font-poppins-medium text-center px-4"
            style={{ fontSize: fs(14) }}
            numberOfLines={2}
          >
            {routeFrom} → {routeTo}
          </Text>
        </View>
      </LinearGradient>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: s(24), paddingBottom: vs(32), gap: vs(24) }}
        showsVerticalScrollIndicator={false}
      >
        <LinearGradient
          colors={['#FAF5FF', '#F3E8FF']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ borderRadius: s(16), padding: s(20) }}
        >
          <View className="flex-row items-start">
            <View className="flex-1">
              <Text className="text-[#8200DB] font-poppins-medium" style={{ fontSize: fs(14) }}>
                Date
              </Text>
              <Text
                className="font-poppins-semibold text-[#1E293B]"
                style={{ fontSize: fs(16), marginTop: vs(4) }}
              >
                {date}
              </Text>
            </View>
            <View className="flex-1">
              <Text className="text-[#8200DB] font-poppins-medium" style={{ fontSize: fs(14) }}>
                Time
              </Text>
              <Text
                className="font-poppins-semibold text-[#1E293B]"
                style={{ fontSize: fs(16), marginTop: vs(4) }}
              >
                {time}
              </Text>
            </View>
            <View
              className="rounded-full bg-[#9810FA]"
              style={{ paddingHorizontal: s(12), paddingVertical: vs(4) }}
            >
              <Text
                className="font-poppins-semibold text-white"
                style={{ fontSize: fs(14) }}
              >
                {totalFare}
              </Text>
            </View>
          </View>
          <View
            className="flex-row border-t border-[#E9D4FF]"
            style={{ marginTop: vs(16), paddingTop: vs(16) }}
          >
            <View className="flex-1 items-center">
              <LocationPinSmallIcon size={s(20)} color="#8200DB" />
              <Text
                className="text-[#8200DB] font-poppins-medium"
                style={{ fontSize: fs(14), marginTop: vs(4) }}
              >
                {stopsCount} Stops
              </Text>
            </View>
            <View className="flex-1 items-center">
              <UsersIcon size={s(20)} color="#8200DB" />
              <Text
                className="text-[#8200DB] font-poppins-medium"
                style={{ fontSize: fs(14), marginTop: vs(4) }}
              >
                {passengerCount} Passengers
              </Text>
            </View>
            <View className="flex-1 items-center">
              <ClockSmallIcon size={s(20)} color="#8200DB" />
              <Text
                className="text-[#8200DB] font-poppins-medium"
                style={{ fontSize: fs(14), marginTop: vs(4) }}
              >
                ₹{seatPrice.toLocaleString('en-IN')}/seat
              </Text>
            </View>
          </View>
        </LinearGradient>

        <View>
          <Text
            className="font-poppins-semibold text-[#1E293B]"
            style={{ fontSize: fs(18) }}
          >
            Route & Stops
          </Text>
          <View style={{ marginTop: vs(16) }}>
            {stops.map((s, i) => (
              <StopRow key={s.index} stop={s} isLast={i === stops.length - 1} />
            ))}
          </View>
        </View>

        <View>
          <Text
            className="font-poppins-semibold text-[#1E293B]"
            style={{ fontSize: fs(18) }}
          >
            Passenger List ({passengers.length})
          </Text>
          <View style={{ marginTop: vs(16), gap: vs(8) }}>
            {passengers.map(p => (
              <PassengerRow
                key={p.id}
                passenger={p}
                onCall={() => {
                  onCallPassenger?.(p.id);
                  // Dial directly — the callback was never wired in App.tsx,
                  // which left this button dead.
                  void dialPhone(p.contact);
                }}
                onChat={
                  p.bookingId && onChatPassenger
                    ? () =>
                        onChatPassenger({
                          bookingId: p.bookingId!,
                          name: p.name,
                          contact: p.contact,
                        })
                    : undefined
                }
              />
            ))}
          </View>
        </View>

        <LinearGradient
          colors={['#FAF5FF', '#F3E8FF']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={{ borderRadius: s(16), padding: s(20) }}
        >
          <View className="flex-row items-center justify-between">
            <View>
              <Text className="text-[#8200DB] font-poppins-medium" style={{ fontSize: fs(14) }}>
                Total Fare
              </Text>
              <Text
                className="font-poppins-bold text-[#9810FA]"
                style={{ fontSize: fs(30), marginTop: vs(4) }}
              >
                {totalFare}
              </Text>
            </View>
            <View className="items-end">
              <Text className="text-[#8200DB] font-poppins-medium" style={{ fontSize: fs(14) }}>
                ₹{seatPrice.toLocaleString('en-IN')} / seat
              </Text>
              <Text className="text-[#8200DB] font-poppins-medium" style={{ fontSize: fs(14) }}>
                {passengerCount} seat{passengerCount === 1 ? '' : 's'}
              </Text>
            </View>
          </View>
        </LinearGradient>
      </ScrollView>

      {/* Edge-to-edge (SDK 36): keep the CTA above the system nav bar. */}
      <View
        style={{
          paddingHorizontal: s(16),
          paddingBottom: Math.max(insets.bottom, vs(12)) + vs(12),
          paddingTop: vs(8),
        }}
      >
        {detailError && (
          <View
            className="flex-row items-center bg-[#FEF3C7]"
            style={{
              borderRadius: s(12),
              paddingHorizontal: s(12),
              paddingVertical: vs(8),
              marginBottom: vs(8),
              gap: s(8),
            }}
          >
            <Text
              className="flex-1 font-poppins-regular text-[#92400E]"
              style={{ fontSize: fs(12), lineHeight: fs(17) }}
            >
              Could not load journey details. Some information may be missing.
            </Text>
            <Pressable onPress={() => setFetchNonce((n) => n + 1)} hitSlop={8}>
              <Text
                className="font-poppins-semibold text-[#9810FA]"
                style={{ fontSize: fs(13) }}
              >
                Retry
              </Text>
            </Pressable>
          </View>
        )}
        <Pressable
          onPress={handleStart}
          disabled={!canStart || starting}
          className="items-center justify-center bg-[#9810FA]"
          style={[
            { height: s(56), borderRadius: s(16) },
            canStart ? undefined : { opacity: 0.5 },
          ]}
        >
          <Text
            className="font-poppins-medium uppercase text-white"
            style={{ fontSize: fs(16) }}
          >
            Start Journey
          </Text>
        </Pressable>
        {startHelper != null && (
          <Text
            className="text-center font-poppins-medium text-[#6A7282]"
            style={{ fontSize: fs(13), marginTop: vs(8) }}
          >
            {startHelper}
          </Text>
        )}
      </View>
    </View>
  );
}

export default UpcomingBookingDetailsScreen;
