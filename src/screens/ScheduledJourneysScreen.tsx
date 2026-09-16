import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StatusBar, Text, View } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ArrowRightIcon,
  BackArrowIcon,
  CalendarIcon,
  ClockSmallIcon,
  LocationPinSmallIcon,
  UsersIcon,
} from '../components/icons/ServiceTypeIcons';
import { fetchJourneys, type JourneySummary } from '../services/api';
import { fs, s, vs } from '../theme/responsive';

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
  status: JourneySummary['status'];
  completed?: boolean;
}

interface ScheduledJourneysScreenProps {
  onBack?: () => void;
  /** `status` lets the caller resume an already active/in-progress journey
   *  at the right screen instead of restarting from the details page. */
  onOpenUpcoming?: (id: string, status: JourneySummary['status']) => void;
  onOpenPast?: (id: string) => void;
}

// Map a backend JourneySummary to the card shape. The card's `id` is the
// journeyKey so taps thread the real trip identity forward.
function toCard(j: JourneySummary): ScheduledJourney {
  const completed = j.status === 'completed';
  // Completed journeys show real earnings. Upcoming ones used to show
  // passengerCount × seatPrice — a projected gross that ignores per-segment
  // fares and commission (the history card refuses to show exactly this,
  // calling it fiction). Show the admin-set per-seat price instead: real,
  // and matches the details screen's stat strip.
  const fareVal = completed ? `₹${Math.round(j.earnings)}` : `₹${Math.round(j.seatPrice)}/seat`;
  return {
    id: j.journeyKey,
    title: j.routeName,
    date: j.departureDate,
    time: j.departureTime,
    fare: fareVal,
    from: j.from,
    to: j.to,
    stops: j.stopCount,
    passengers: j.passengerCount,
    status: j.status,
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
        style={{ borderRadius: s(16), padding: s(20) }}
      >
        <View className="flex-row items-start justify-between">
          <View className="flex-1 pr-3">
            <Text
              className="font-poppins-semibold text-[#1E293B]"
              style={{ fontSize: fs(16), lineHeight: fs(22) }}
              numberOfLines={2}
            >
              {journey.title}
            </Text>
            <View className="flex-row items-center gap-4" style={{ marginTop: vs(4) }}>
              <View className="flex-row items-center gap-1.5">
                <CalendarIcon size={s(14)} color="#8200DB" />
                <Text
                  className="font-poppins-medium text-[#8200DB]"
                  style={{ fontSize: fs(14) }}
                >
                  {journey.date}
                </Text>
              </View>
              <View className="flex-row items-center gap-1.5">
                <ClockSmallIcon size={s(14)} color="#8200DB" />
                <Text
                  className="font-poppins-medium text-[#8200DB]"
                  style={{ fontSize: fs(14) }}
                >
                  {journey.time}
                </Text>
              </View>
            </View>
          </View>
          <View
            className="rounded-full bg-[#9810FA]"
            style={{ paddingHorizontal: s(12), paddingVertical: vs(4) }}
          >
            <Text
              className="font-poppins-semibold text-white"
              style={{ fontSize: fs(14) }}
            >
              {journey.fare}
            </Text>
          </View>
        </View>

        <View className="flex-row items-center" style={{ marginTop: vs(16) }}>
          <LocationPinSmallIcon size={s(16)} color="#4A5565" />
          <Text
            className="font-poppins-medium text-[#4A5565] flex-1 ml-2"
            style={{ fontSize: fs(14) }}
            numberOfLines={2}
          >
            {journey.from} → {journey.to}
          </Text>
        </View>

        <View
          className="flex-row items-center gap-6 border-t border-[#E9D4FF]"
          style={{ marginTop: vs(16), paddingTop: vs(12) }}
        >
          <View className="flex-row items-center gap-1.5">
            <LocationPinSmallIcon size={s(14)} color="#4A5565" />
            <Text
              className="font-poppins-medium text-[#4A5565]"
              style={{ fontSize: fs(14) }}
            >
              {journey.stops} Stops
            </Text>
          </View>
          <View className="flex-row items-center gap-1.5">
            <UsersIcon size={s(14)} color="#4A5565" />
            <Text
              className="font-poppins-medium text-[#4A5565]"
              style={{ fontSize: fs(14) }}
            >
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
  // Badge follows the real outcome. 'expired' (or a trip still marked
  // scheduled whose date has passed) never ran — it was missed, not
  // completed, and showing a projected fare for it would be fiction.
  const badge =
    journey.status === 'completed'
      ? { label: 'Completed', color: '#00A63E' }
      : journey.status === 'cancelled'
        ? { label: 'Cancelled', color: '#E7000B' }
        : { label: 'Missed', color: '#6A7282' };
  const showFare = journey.status === 'completed';
  return (
    <Pressable
      onPress={onPress}
      className="bg-[#F9FAFB]"
      style={{ borderRadius: s(16), padding: s(20) }}
    >
      <View className="flex-row items-start justify-between">
        <View className="flex-1 pr-3">
          <Text
            className="font-poppins-semibold text-[#1E293B]"
            style={{ fontSize: fs(16), lineHeight: fs(22) }}
            numberOfLines={2}
          >
            {journey.title}
          </Text>
          <View className="flex-row items-center gap-4" style={{ marginTop: vs(4) }}>
            <View className="flex-row items-center gap-1.5">
              <CalendarIcon size={s(14)} color="#4A5565" />
              <Text
                className="font-poppins-medium text-[#4A5565]"
                style={{ fontSize: fs(14) }}
              >
                {journey.date}
              </Text>
            </View>
            <View className="flex-row items-center gap-1.5">
              <ClockSmallIcon size={s(14)} color="#4A5565" />
              <Text
                className="font-poppins-medium text-[#4A5565]"
                style={{ fontSize: fs(14) }}
              >
                {journey.time}
              </Text>
            </View>
          </View>
        </View>
        <View className="items-end">
          <Text
            className="font-poppins-semibold"
            style={{ fontSize: fs(16), color: showFare ? '#00A63E' : '#6A7282' }}
          >
            {showFare ? journey.fare : '—'}
          </Text>
          <Text
            className="font-poppins-medium"
            style={{ fontSize: fs(12), marginTop: vs(2), color: badge.color }}
          >
            {badge.label}
          </Text>
        </View>
      </View>

      <View className="flex-row items-center" style={{ marginTop: vs(16) }}>
        <LocationPinSmallIcon size={s(16)} color="#4A5565" />
        <Text
          className="font-poppins-medium text-[#4A5565] flex-1 ml-2"
          style={{ fontSize: fs(14) }}
          numberOfLines={2}
        >
          {journey.from} → {journey.to}
        </Text>
      </View>

      <View
        className="flex-row items-center gap-6 border-t border-[#E5E7EB]"
        style={{ marginTop: vs(16), paddingTop: vs(12) }}
      >
        <View className="flex-row items-center gap-1.5">
          <LocationPinSmallIcon size={s(14)} color="#4A5565" />
          <Text
            className="font-poppins-medium text-[#4A5565]"
            style={{ fontSize: fs(14) }}
          >
            {journey.stops} Stops
          </Text>
        </View>
        <View className="flex-row items-center gap-1.5">
          <UsersIcon size={s(14)} color="#4A5565" />
          <Text
            className="font-poppins-medium text-[#4A5565]"
            style={{ fontSize: fs(14) }}
          >
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
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<'upcoming' | 'past'>('upcoming');
  const [upcoming, setUpcoming] = useState<ScheduledJourney[]>([]);
  const [past, setPast] = useState<ScheduledJourney[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [fetchNonce, setFetchNonce] = useState(0);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setLoadFailed(false);
    Promise.all([fetchJourneys('upcoming'), fetchJourneys('past')])
      .then(([up, pa]) => {
        if (!alive) return;
        setUpcoming(up.map(toCard));
        setPast(pa.map(toCard));
      })
      // A failed load used to be swallowed, leaving the "no journeys" empty
      // state — indistinguishable from genuinely having none, which was the
      // client's original "scheduled screen is empty" complaint.
      .catch(() => alive && setLoadFailed(true))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [fetchNonce]);

  const items = tab === 'upcoming' ? upcoming : past;

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
            className="flex-row items-center gap-4"
            style={{ paddingHorizontal: s(24), paddingBottom: vs(16), paddingTop: vs(8) }}
          >
            <Pressable onPress={onBack} hitSlop={10}>
              <BackArrowIcon size={s(22)} color="white" />
            </Pressable>
            <View className="flex-1">
              <Text
                className="font-poppins-semibold text-white"
                style={{ fontSize: fs(20), lineHeight: fs(28) }}
              >
                {tab === 'past' ? 'Past Journeys' : 'Scheduled Journeys'}
              </Text>
              <Text
                className="text-white/80 font-poppins-regular"
                style={{ fontSize: fs(14) }}
              >
                Pre-planned multi-stop rides
              </Text>
            </View>
          </View>
        </SafeAreaView>
      </LinearGradient>

      <View style={{ paddingHorizontal: s(24), paddingTop: vs(24) }}>
        <View
          className="flex-row bg-[#ECECF0]"
          style={{ height: vs(40), borderRadius: s(16), padding: s(4) }}
        >
          <Pressable
            onPress={() => setTab('upcoming')}
            className={`flex-1 items-center justify-center ${
              tab === 'upcoming' ? 'bg-white' : ''
            }`}
            style={{ borderRadius: s(14) }}
          >
            <Text
              className="font-poppins-medium text-[#1E293B]"
              style={{ fontSize: fs(14) }}
            >
              Upcoming
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setTab('past')}
            className={`flex-1 items-center justify-center ${
              tab === 'past' ? 'bg-white' : ''
            }`}
            style={{ borderRadius: s(14) }}
          >
            <Text
              className="font-poppins-medium text-[#1E293B]"
              style={{ fontSize: fs(14) }}
            >
              Past
            </Text>
          </Pressable>
        </View>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: s(24), paddingBottom: vs(32) + insets.bottom, gap: vs(16) }}
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <ActivityIndicator style={{ marginTop: vs(40) }} color="#9810FA" />
        ) : loadFailed ? (
          <Pressable onPress={() => setFetchNonce((n) => n + 1)} hitSlop={8}>
            <Text
              className="text-center font-poppins-regular text-[#B91C1C]"
              style={{ marginTop: vs(40), fontSize: fs(14) }}
            >
              Couldn't load your journeys — tap to retry.
            </Text>
          </Pressable>
        ) : items.length === 0 ? (
          <Text
            className="text-center font-poppins-regular text-[#6A7282]"
            style={{ marginTop: vs(40), fontSize: fs(14) }}
          >
            No {tab} journeys.
          </Text>
        ) : (
          items.map(j =>
            tab === 'upcoming' ? (
              <UpcomingJourneyCard
                key={j.id}
                journey={j}
                onPress={() => onOpenUpcoming?.(j.id, j.status)}
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
