import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StatusBar, Text, View } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { fetchJourney, fetchJourneyPassengers } from '../services/api';
import {
  BackArrowIcon,
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
  name: string;
  seat: number;
  boarded: boolean;
  noShow: boolean;
}

interface CompletedRideScreenProps {
  journeyKey?: string | null;
  journeyId?: string;
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
          {stop.time || 'Completed Stop'}
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
}: {
  passenger: Passenger;
  onCall?: () => void;
}) {
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
            {passenger.name
              .split(' ')
              .filter(Boolean)
              .slice(0, 2)
              .map((w) => w[0]?.toUpperCase() ?? '')
              .join('') || '?'}
          </Text>
        </View>
        <View className="flex-1">
          <Text
            className="font-poppins-medium text-[#1E293B]"
            style={{ fontSize: fs(16), lineHeight: fs(22) }}
          >
            {passenger.name}
          </Text>
          <Text
            className="text-[#6A7282] font-poppins-regular"
            style={{ fontSize: fs(14) }}
          >
            Seat {passenger.seat} •{' '}
            {passenger.noShow ? 'No-show' : passenger.boarded ? 'Boarded' : 'Not boarded'}
          </Text>
        </View>
      </View>
      <Pressable
        onPress={onCall}
        hitSlop={8}
        className="items-center justify-center rounded-full bg-[#0097B3]"
        style={{ width: s(36), height: s(36) }}
      >
        <PhoneIcon size={s(16)} color="white" />
      </Pressable>
    </View>
  );
}

export function CompletedRideScreen({
  journeyKey,
  journeyId = 'SCH098',
  routeFrom: routeFromProp = '—',
  routeTo: routeToProp = '—',
  date: dateProp = '—',
  time: timeProp = '—',
  stopsCount: stopsCountProp = 0,
  passengerCount: passengerCountProp = 0,
  durationMins = 0,
  stops: stopsProp = DEFAULT_STOPS,
  passengers: passengersProp = DEFAULT_PASSENGERS,
  totalFare: totalFareProp = '—',
  onBack,
  onCallPassenger,
}: CompletedRideScreenProps) {
  const insets = useSafeAreaInsets();
  const [detail, setDetail] = useState<Awaited<ReturnType<typeof fetchJourney>> | null>(null);
  const [pax, setPax] = useState<Passenger[] | null>(null);

  useEffect(() => {
    if (!journeyKey) return;
    fetchJourney(journeyKey).then(setDetail).catch(() => {});
    fetchJourneyPassengers(journeyKey)
      .then((r) =>
        setPax(
          // Real fields only — the API never returns gender/age/stop, so the
          // old defaults invented M / 28 / Stop 1 for every rider.
          r.passengers.map((p) => ({
            id: `${p.bookingId}-${p.seat}`,
            name: p.name,
            seat: p.seat,
            boarded: p.boarded,
            noShow: p.noShow,
          })),
        ),
      )
      .catch(() => {});
  }, [journeyKey]);

  const j = detail?.journey;
  const routeFrom = j?.from ?? routeFromProp;
  const routeTo = j?.to ?? routeToProp;
  const date = j?.departureDate ?? dateProp;
  const time = j?.departureTime ?? timeProp;
  const stopsCount = detail?.stops?.length ?? stopsCountProp;
  const passengerCount = j?.passengerCount ?? passengerCountProp;
  // Real elapsed journey minutes from the start/complete timestamps — the
  // prop default (0) only shows when neither timestamp made it to the doc.
  const elapsedMins =
    j?.startedAt && j?.completedAt
      ? Math.max(
          1,
          Math.round(
            (new Date(j.completedAt).getTime() - new Date(j.startedAt).getTime()) / 60000,
          ),
        )
      : null;
  const journeyMins = elapsedMins ?? durationMins;
  const stops =
    detail?.stops?.map((s, i) => ({ index: i + 1, title: s.name, time: '' })) ?? stopsProp;
  const passengers = pax ?? passengersProp;
  const totalFare = j ? `₹${Math.round(j.earnings).toLocaleString('en-IN')}` : totalFareProp;

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
                Completed Ride
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
        contentContainerStyle={{ padding: s(24), paddingBottom: vs(40) + insets.bottom, gap: vs(24) }}
        showsVerticalScrollIndicator={false}
      >
        <LinearGradient
          colors={['#FAF5FF', '#F3E8FF']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ borderRadius: s(16), padding: s(20) }}
        >
          <View className="flex-row">
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
                {journeyMins} mins
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
                onCall={() => onCallPassenger?.(p.id)}
              />
            ))}
          </View>
        </View>

        <LinearGradient
          colors={['#F0FDF4', '#DCFCE7']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={{ borderRadius: s(16), padding: s(20) }}
        >
          <View className="flex-row items-center justify-between">
            <View>
              <Text className="text-[#008236] font-poppins-medium" style={{ fontSize: fs(14) }}>
                Earnings
              </Text>
              <Text
                className="font-poppins-bold text-[#00A63E]"
                style={{ fontSize: fs(30), marginTop: vs(4) }}
              >
                {totalFare}
              </Text>
            </View>
            <View className="items-end">
              <Text className="text-[#008236] font-poppins-medium" style={{ fontSize: fs(14) }}>
                {passengerCount} passenger{passengerCount === 1 ? '' : 's'}
              </Text>
              <Text className="text-[#008236] font-poppins-medium" style={{ fontSize: fs(14) }}>
                {stopsCount} stops
              </Text>
            </View>
          </View>
        </LinearGradient>
      </ScrollView>
    </View>
  );
}

export default CompletedRideScreen;
