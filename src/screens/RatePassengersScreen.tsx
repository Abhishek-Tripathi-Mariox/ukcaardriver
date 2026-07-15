import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StatusBar,
  Text,
  View,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BackArrowIcon, StarIcon } from '../components/icons/ServiceTypeIcons';
import { fetchJourneyPassengers, rateJourneyPassengers } from '../services/api';
import { fs, s, vs } from '../theme/responsive';

interface RatePassengersScreenProps {
  journeyKey?: string | null;
  onBack?: () => void;
  onDone?: () => void;
}

interface Rider {
  bookingId: string;
  name: string;
  seats: number[];
}

/**
 * Driver rates the riders on a completed scheduled journey. One rating per
 * booking (a rider may hold several seats). Real passengers are pulled from the
 * journey manifest — no fabricated rows. Persisted via rate-passengers.
 */
export function RatePassengersScreen({ journeyKey, onBack, onDone }: RatePassengersScreenProps) {
  const [loading, setLoading] = useState(true);
  const [riders, setRiders] = useState<Rider[]>([]);
  const [stars, setStars] = useState<Record<string, number>>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!journeyKey) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const data = await fetchJourneyPassengers(journeyKey);
        if (cancelled) return;
        // One row per booking (rider), only for those who actually boarded.
        const byBooking = new Map<string, Rider>();
        for (const p of data.passengers) {
          if (!p.boarded) continue;
          const r = byBooking.get(p.bookingId) ?? { bookingId: p.bookingId, name: p.name || 'Passenger', seats: [] };
          r.seats.push(p.seat);
          byBooking.set(p.bookingId, r);
        }
        const list = [...byBooking.values()];
        setRiders(list);
        // Default every rider to 5 stars so the driver can submit with one tap.
        const seed: Record<string, number> = {};
        list.forEach((r) => (seed[r.bookingId] = 5));
        setStars(seed);
      } catch {
        /* leave empty */
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [journeyKey]);

  const setRating = (bookingId: string, value: number) =>
    setStars((prev) => ({ ...prev, [bookingId]: value }));

  const canSubmit = useMemo(
    () => riders.length > 0 && riders.every((r) => (stars[r.bookingId] ?? 0) >= 1),
    [riders, stars],
  );

  const submit = async () => {
    if (!journeyKey || !canSubmit) {
      onDone?.();
      return;
    }
    setSubmitting(true);
    try {
      await rateJourneyPassengers(
        journeyKey,
        riders.map((r) => ({ bookingId: r.bookingId, rating: stars[r.bookingId] ?? 5 })),
      );
    } catch {
      /* best-effort — don't block the driver from finishing */
    } finally {
      setSubmitting(false);
      onDone?.();
    }
  };

  return (
    <View className="flex-1 bg-[#F9FAFB]">
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      <LinearGradient colors={['#AD46FF', '#9810FA']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
        <SafeAreaView edges={['top']}>
          <View className="flex-row items-center gap-4 px-6 pb-4 pt-2">
            <Pressable onPress={onBack} hitSlop={10}>
              <BackArrowIcon size={22} color="white" />
            </Pressable>
            <Text className="text-[20px] font-poppins-semibold text-white">Rate Passengers</Text>
          </View>
        </SafeAreaView>
      </LinearGradient>

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#9810FA" />
        </View>
      ) : riders.length === 0 ? (
        <View className="flex-1 items-center justify-center px-8">
          <Text className="text-center text-[15px] font-poppins-semibold text-[#1E293B]">
            No boarded passengers to rate
          </Text>
          <Text className="mt-1 text-center text-[13px] text-[#6A7282]">
            Ratings are only for riders who boarded this trip.
          </Text>
        </View>
      ) : (
        <ScrollView className="flex-1" contentContainerStyle={{ padding: 16, gap: 12 }} showsVerticalScrollIndicator={false}>
          <Text className="text-[13px] text-[#6A7282]">
            How were your riders? Your rating helps keep the community safe.
          </Text>
          {riders.map((r) => {
            const val = stars[r.bookingId] ?? 0;
            return (
              <View
                key={r.bookingId}
                className="rounded-2xl bg-white p-4"
                style={{ shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 }}
              >
                <Text className="text-[16px] font-poppins-semibold text-[#1E293B]" numberOfLines={1}>
                  {r.name}
                </Text>
                <Text className="mt-0.5 text-[12px] text-[#6A7282]">
                  {r.seats.length > 1 ? `Seats ${r.seats.sort((a, b) => a - b).join(', ')}` : `Seat ${r.seats[0]}`}
                </Text>
                <View className="mt-3 flex-row" style={{ gap: s(6) }}>
                  {[1, 2, 3, 4, 5].map((n) => (
                    <Pressable key={n} onPress={() => setRating(r.bookingId, n)} hitSlop={6}>
                      <StarIcon size={s(30)} color={n <= val ? '#FFB100' : '#E5E7EB'} />
                    </Pressable>
                  ))}
                </View>
              </View>
            );
          })}
        </ScrollView>
      )}

      <View className="px-4 pb-6 pt-2">
        <Pressable
          onPress={submit}
          disabled={submitting}
          style={{ opacity: submitting ? 0.6 : 1 }}
          className="h-[54px] items-center justify-center rounded-2xl bg-[#9810FA]"
        >
          {submitting ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text className="text-[14px] font-poppins-semibold uppercase text-white">
              {riders.length === 0 ? 'Continue' : 'Submit Ratings'}
            </Text>
          )}
        </Pressable>
        {riders.length > 0 && (
          <Pressable onPress={onDone} className="mt-3 h-[46px] items-center justify-center">
            <Text className="text-[14px] font-poppins-medium text-[#6A7282]">Skip for now</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

export default RatePassengersScreen;
