import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StatusBar, Text, View } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { fetchJourney, fetchJourneyPassengers } from '../services/api';
import {
  BackArrowIcon,
  ClockSmallIcon,
  LocationPinSmallIcon,
  PhoneIcon,
  RoutingIcon,
  UsersIcon,
} from '../components/icons/ServiceTypeIcons';

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
  gender: 'F' | 'M';
  age: number;
  stop: number;
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
    <View className="flex-row gap-4">
      <View className="items-center">
        <View
          className="h-4 w-4 rounded-full"
          style={{ backgroundColor: dotColor }}
        />
        {!isLast && <View className="mt-1 w-[2px] flex-1 bg-[#D1D5DC]" />}
      </View>
      <View className="flex-1 pb-4">
        <Text className="text-base font-medium text-[#1E293B]">{stop.title}</Text>
        <Text className="mt-0.5 text-[14px] text-[#6A7282]">{stop.time}</Text>
        <View className="mt-2 flex-row gap-4">
          {stop.board != null && (
            <Text className="text-[14px] text-[#00A63E]">
              ↑ {stop.board} Board
            </Text>
          )}
          {stop.drop != null && (
            <Text className="text-[14px] text-[#E7000B]">
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
    <View className="flex-row items-center justify-between rounded-2xl bg-[#F9FAFB] px-4 py-3">
      <View className="flex-1 flex-row items-center gap-3">
        <View className="h-10 w-10 items-center justify-center rounded-full bg-[#E9D4FF]">
          <Text className="text-base font-semibold text-[#8200DB]">
            {passenger.gender}
          </Text>
        </View>
        <View className="flex-1">
          <Text className="text-base font-medium text-[#1E293B]">
            {passenger.name}
          </Text>
          <Text className="text-[14px] text-[#6A7282]">
            {passenger.age} years • Stop {passenger.stop}
          </Text>
        </View>
      </View>
      <Pressable
        onPress={onCall}
        hitSlop={8}
        className="h-8 w-8 items-center justify-center rounded-full bg-[#0097B3]"
      >
        <PhoneIcon size={16} color="white" />
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
  const [detail, setDetail] = useState<Awaited<ReturnType<typeof fetchJourney>> | null>(null);
  const [pax, setPax] = useState<Passenger[] | null>(null);

  useEffect(() => {
    if (!journeyKey) return;
    fetchJourney(journeyKey).then(setDetail).catch(() => {});
    fetchJourneyPassengers(journeyKey)
      .then((r) =>
        setPax(
          r.passengers.map((p) => ({
            id: `${p.bookingId}-${p.seat}`,
            name: p.name,
            gender: 'M' as const,
            age: 0,
            stop: 1,
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
  const stops =
    detail?.stops?.map((s, i) => ({ index: i + 1, title: s.name, time: '' })) ?? stopsProp;
  const passengers = pax ?? passengersProp;
  const totalFare = j ? `₹${Math.round(j.earnings).toLocaleString('en-IN')}` : totalFareProp;

  return (
    <View className="flex-1 bg-white">
      <StatusBar barStyle="light-content" />

      <LinearGradient
        colors={['#AD46FF', '#9810FA']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
      >
        <SafeAreaView edges={['top']}>
          <View className="flex-row items-center gap-4 px-6 pb-4 pt-2">
            <Pressable onPress={onBack} hitSlop={10}>
              <BackArrowIcon size={22} color="white" />
            </Pressable>
            <View className="flex-1">
              <Text className="text-[20px] font-semibold text-white">
                Completed Ride
              </Text>
              <Text className="text-[14px] text-white/80">
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
        <View className="items-center py-6">
          <RoutingIcon size={32} color="#6E11B0" />
          <Text className="mt-2 text-base font-medium text-[#6E11B0]">
            Route Map
          </Text>
          <Text className="text-[14px] text-[#9810FA]">
            {routeFrom} → {routeTo}
          </Text>
        </View>
      </LinearGradient>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 24, paddingBottom: 40, gap: 24 }}
        showsVerticalScrollIndicator={false}
      >
        <LinearGradient
          colors={['#FAF5FF', '#F3E8FF']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          className="rounded-2xl p-5"
        >
          <View className="flex-row">
            <View className="flex-1">
              <Text className="text-[14px] text-[#8200DB]">Date</Text>
              <Text className="mt-1 text-base font-semibold text-[#1E293B]">
                {date}
              </Text>
            </View>
            <View className="flex-1">
              <Text className="text-[14px] text-[#8200DB]">Time</Text>
              <Text className="mt-1 text-base font-semibold text-[#1E293B]">
                {time}
              </Text>
            </View>
          </View>
          <View className="mt-4 flex-row border-t border-[#E9D4FF] pt-4">
            <View className="flex-1 items-center">
              <LocationPinSmallIcon size={20} color="#8200DB" />
              <Text className="mt-1 text-[14px] text-[#8200DB]">
                {stopsCount} Stops
              </Text>
            </View>
            <View className="flex-1 items-center">
              <UsersIcon size={20} color="#8200DB" />
              <Text className="mt-1 text-[14px] text-[#8200DB]">
                {passengerCount} Passengers
              </Text>
            </View>
            <View className="flex-1 items-center">
              <ClockSmallIcon size={20} color="#8200DB" />
              <Text className="mt-1 text-[14px] text-[#8200DB]">
                {durationMins} mins
              </Text>
            </View>
          </View>
        </LinearGradient>

        <View>
          <Text className="text-[18px] font-semibold text-[#1E293B]">
            Route & Stops
          </Text>
          <View className="mt-4">
            {stops.map((s, i) => (
              <StopRow key={s.index} stop={s} isLast={i === stops.length - 1} />
            ))}
          </View>
        </View>

        <View>
          <Text className="text-[18px] font-semibold text-[#1E293B]">
            Passenger List ({passengers.length})
          </Text>
          <View className="mt-4 gap-2">
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
          className="rounded-2xl p-5"
        >
          <View className="flex-row items-center justify-between">
            <View>
              <Text className="text-[14px] text-[#008236]">Earnings</Text>
              <Text className="mt-1 text-[30px] font-bold text-[#00A63E]">
                {totalFare}
              </Text>
            </View>
            <View className="items-end">
              <Text className="text-[14px] text-[#008236]">
                {passengerCount} passenger{passengerCount === 1 ? '' : 's'}
              </Text>
              <Text className="text-[14px] text-[#008236]">{stopsCount} stops</Text>
            </View>
          </View>
        </LinearGradient>
      </ScrollView>
    </View>
  );
}

export default CompletedRideScreen;
