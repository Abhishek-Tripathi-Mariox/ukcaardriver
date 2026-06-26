import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StatusBar, Text, View } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ArrowRightIcon,
  BackArrowIcon,
  CalendarIcon,
  ClockSmallIcon,
  LocationPinSmallIcon,
  UsersIcon,
} from '../components/icons/ServiceTypeIcons';
import { fetchJourneys, type JourneySummary } from '../services/api';

interface ScheduledJourney {
  id: string;
  title: string;
  date: string;
  time: string;
  fare: string;
  from: string;
  to: string;
  stops: number;
  passengers: number;
  completed?: boolean;
}

interface ScheduledJourneysScreenProps {
  onBack?: () => void;
  onOpenUpcoming?: (id: string) => void;
  onOpenPast?: (id: string) => void;
}

// Map a backend JourneySummary to the card shape. The card's `id` is the
// journeyKey so taps thread the real trip identity forward.
function toCard(j: JourneySummary): ScheduledJourney {
  const completed = j.status === 'completed';
  const fareVal = completed ? j.earnings : j.passengerCount * j.seatPrice;
  return {
    id: j.journeyKey,
    title: j.routeName,
    date: j.departureDate,
    time: j.departureTime,
    fare: `₹${Math.round(fareVal)}`,
    from: j.from,
    to: j.to,
    stops: j.stopCount,
    passengers: j.passengerCount,
    completed,
  };
}

function UpcomingJourneyCard({
  journey,
  onPress,
}: {
  journey: ScheduledJourney;
  onPress?: () => void;
}) {
  return (
    <Pressable onPress={onPress}>
      <LinearGradient
        colors={['#FAF5FF', '#F3E8FF']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        className="rounded-2xl p-5"
      >
        <View className="flex-row items-start justify-between">
          <View className="flex-1 pr-3">
            <Text className="text-base font-semibold text-[#1E293B]">
              {journey.title}
            </Text>
            <View className="mt-1 flex-row items-center gap-4">
              <View className="flex-row items-center gap-1.5">
                <CalendarIcon size={14} color="#8200DB" />
                <Text className="text-[14px] font-medium text-[#8200DB]">
                  {journey.date}
                </Text>
              </View>
              <View className="flex-row items-center gap-1.5">
                <ClockSmallIcon size={14} color="#8200DB" />
                <Text className="text-[14px] font-medium text-[#8200DB]">
                  {journey.time}
                </Text>
              </View>
            </View>
          </View>
          <View className="rounded-full bg-[#9810FA] px-3 py-1">
            <Text className="text-[14px] font-semibold text-white">
              {journey.fare}
            </Text>
          </View>
        </View>

        <View className="mt-4 flex-row items-center gap-2">
          <LocationPinSmallIcon size={16} color="#4A5565" />
          <Text className="text-[14px] font-medium text-[#4A5565]">
            {journey.from}
          </Text>
          <ArrowRightIcon size={12} color="#4A5565" />
          <Text className="text-[14px] font-medium text-[#4A5565]">
            {journey.to}
          </Text>
        </View>

        <View className="mt-4 flex-row items-center gap-6 border-t border-[#E9D4FF] pt-3">
          <View className="flex-row items-center gap-1.5">
            <LocationPinSmallIcon size={14} color="#4A5565" />
            <Text className="text-[14px] font-medium text-[#4A5565]">
              {journey.stops} Stops
            </Text>
          </View>
          <View className="flex-row items-center gap-1.5">
            <UsersIcon size={14} color="#4A5565" />
            <Text className="text-[14px] font-medium text-[#4A5565]">
              {journey.passengers} Passengers
            </Text>
          </View>
        </View>
      </LinearGradient>
    </Pressable>
  );
}

function PastJourneyCard({
  journey,
  onPress,
}: {
  journey: ScheduledJourney;
  onPress?: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className="rounded-2xl bg-[#F9FAFB] p-5"
    >
      <View className="flex-row items-start justify-between">
        <View className="flex-1 pr-3">
          <Text className="text-base font-semibold text-[#1E293B]">
            {journey.title}
          </Text>
          <View className="mt-1 flex-row items-center gap-4">
            <View className="flex-row items-center gap-1.5">
              <CalendarIcon size={14} color="#4A5565" />
              <Text className="text-[14px] font-medium text-[#4A5565]">
                {journey.date}
              </Text>
            </View>
            <View className="flex-row items-center gap-1.5">
              <ClockSmallIcon size={14} color="#4A5565" />
              <Text className="text-[14px] font-medium text-[#4A5565]">
                {journey.time}
              </Text>
            </View>
          </View>
        </View>
        <View className="items-end">
          <Text className="text-base font-semibold text-[#00A63E]">
            {journey.fare}
          </Text>
          <Text className="mt-0.5 text-[12px] font-medium text-[#00A63E]">
            ✓ Completed
          </Text>
        </View>
      </View>

      <View className="mt-4 flex-row items-center gap-2">
        <LocationPinSmallIcon size={16} color="#4A5565" />
        <Text className="text-[14px] font-medium text-[#4A5565]">
          {journey.from} → {journey.to}
        </Text>
      </View>

      <View className="mt-4 flex-row items-center gap-6 border-t border-[#E5E7EB] pt-3">
        <View className="flex-row items-center gap-1.5">
          <LocationPinSmallIcon size={14} color="#4A5565" />
          <Text className="text-[14px] font-medium text-[#4A5565]">
            {journey.stops} Stops
          </Text>
        </View>
        <View className="flex-row items-center gap-1.5">
          <UsersIcon size={14} color="#4A5565" />
          <Text className="text-[14px] font-medium text-[#4A5565]">
            {journey.passengers} Passengers
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

export function ScheduledJourneysScreen({
  onBack,
  onOpenUpcoming,
  onOpenPast,
}: ScheduledJourneysScreenProps) {
  const [tab, setTab] = useState<'upcoming' | 'past'>('upcoming');
  const [upcoming, setUpcoming] = useState<ScheduledJourney[]>([]);
  const [past, setPast] = useState<ScheduledJourney[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    Promise.all([fetchJourneys('upcoming'), fetchJourneys('past')])
      .then(([up, pa]) => {
        if (!alive) return;
        setUpcoming(up.map(toCard));
        setPast(pa.map(toCard));
      })
      .catch(() => {})
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, []);

  const items = tab === 'upcoming' ? upcoming : past;

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
                {tab === 'past' ? 'Past Journeys' : 'Scheduled Journeys'}
              </Text>
              <Text className="text-[14px] text-white/80">
                Pre-planned multi-stop rides
              </Text>
            </View>
          </View>
        </SafeAreaView>
      </LinearGradient>

      <View className="px-6 pt-6">
        <View className="h-9 flex-row rounded-2xl bg-[#ECECF0] p-1">
          <Pressable
            onPress={() => setTab('upcoming')}
            className={`flex-1 items-center justify-center rounded-2xl ${
              tab === 'upcoming' ? 'bg-white' : ''
            }`}
          >
            <Text className="text-[14px] font-medium text-[#1E293B]">
              Upcoming
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setTab('past')}
            className={`flex-1 items-center justify-center rounded-2xl ${
              tab === 'past' ? 'bg-white' : ''
            }`}
          >
            <Text className="text-[14px] font-medium text-[#1E293B]">Past</Text>
          </Pressable>
        </View>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 24, paddingBottom: 32, gap: 16 }}
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <ActivityIndicator className="mt-10" color="#9810FA" />
        ) : items.length === 0 ? (
          <Text className="mt-10 text-center text-sm text-[#6A7282]">
            No {tab} journeys.
          </Text>
        ) : (
          items.map(j =>
            tab === 'upcoming' ? (
              <UpcomingJourneyCard
                key={j.id}
                journey={j}
                onPress={() => onOpenUpcoming?.(j.id)}
              />
            ) : (
              <PastJourneyCard
                key={j.id}
                journey={j}
                onPress={() => onOpenPast?.(j.id)}
              />
            ),
          )
        )}
      </ScrollView>
    </View>
  );
}

export default ScheduledJourneysScreen;
