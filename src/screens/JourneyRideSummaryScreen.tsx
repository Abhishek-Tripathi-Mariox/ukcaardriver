import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StatusBar, Text, View } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  CloseIcon,
  StarIcon,
} from '../components/icons/ServiceTypeIcons';
import { fetchJourney, fetchJourneyPassengers } from '../services/api';
import { fs, s, vs } from '../theme/responsive';

interface JourneyRideSummaryScreenProps {
  journeyKey?: string | null;
  totalEarnings?: string;
  route?: string;
  totalPassengers?: number;
  boarded?: number;
  absent?: number;
  distanceKm?: number;
  durationText?: string;
  stops?: number;
  emergencyDrops?: number;
  onBack?: () => void;
  onViewFeedback?: () => void;
}

export function JourneyRideSummaryScreen({
  journeyKey,
  totalEarnings: totalEarningsProp = '—',
  route: routeProp = '—',
  totalPassengers: totalPassengersProp = 0,
  boarded: boardedProp = 0,
  absent: absentProp = 0,
  stops: stopsProp = 0,
  onBack,
  onViewFeedback,
}: JourneyRideSummaryScreenProps) {
  const [data, setData] = useState<{
    earnings: number;
    route: string;
    total: number;
    boarded: number;
    stops: number;
  } | null>(null);

  useEffect(() => {
    if (!journeyKey) return;
    (async () => {
      try {
        const [d, pax] = await Promise.all([
          fetchJourney(journeyKey),
          fetchJourneyPassengers(journeyKey),
        ]);
        setData({
          earnings: d.journey.earnings,
          route: `${d.journey.from} → ${d.journey.to}`,
          total: pax.total,
          boarded: pax.boarded,
          stops: d.stops.length,
        });
      } catch {
        /* keep placeholder */
      }
    })();
  }, [journeyKey]);

  const totalEarnings = data ? `₹${Math.round(data.earnings).toLocaleString('en-IN')}` : totalEarningsProp;
  const route = data?.route ?? routeProp;
  const totalPassengers = data?.total ?? totalPassengersProp;
  const boarded = data?.boarded ?? boardedProp;
  const absent = data ? data.total - data.boarded : absentProp;
  const stops = data?.stops ?? stopsProp;

  return (
    <View className="flex-1 bg-[#F9FAFB]">
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
              <CloseIcon size={s(22)} color="white" />
            </Pressable>
            <Text
              className="font-poppins-semibold text-white"
              style={{ fontSize: fs(20) }}
            >
              Ride Summary
            </Text>
          </View>
        </SafeAreaView>
      </LinearGradient>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: s(16), gap: vs(16) }}
        showsVerticalScrollIndicator={false}
      >
        <View
          className="items-center rounded-2xl bg-[#FCF9FF]"
          style={{ paddingVertical: vs(32) }}
        >
          <Text
            className="font-poppins-medium uppercase tracking-wider text-[#6A7282]"
            style={{ fontSize: fs(12) }}
          >
            Total Earnings
          </Text>
          <Text
            className="font-poppins-bold text-[#9A15FB]"
            style={{ fontSize: fs(60), lineHeight: fs(64), marginTop: vs(8) }}
          >
            {totalEarnings}
          </Text>
          <Text
            className="text-[#6A7282] font-poppins-regular text-center px-4"
            style={{ fontSize: fs(14), marginTop: vs(8) }}
            numberOfLines={2}
          >
            {route}
          </Text>
        </View>

        <View
          className="bg-white"
          style={{
            borderRadius: s(16),
            padding: s(20),
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.06,
            shadowRadius: 4,
            elevation: 2,
          }}
        >
          <Text
            className="font-poppins-semibold text-[#1E293B]"
            style={{ fontSize: fs(16) }}
          >
            Passenger Summary
          </Text>
          <View className="flex-row items-center justify-between" style={{ marginTop: vs(12) }}>
            <Text className="text-[#6A7282] font-poppins-regular" style={{ fontSize: fs(14) }}>
              Total Passengers
            </Text>
            <Text className="font-poppins-semibold text-[#1E293B]" style={{ fontSize: fs(16) }}>
              {totalPassengers}
            </Text>
          </View>
          <View className="h-px bg-[#E5E7EB]" style={{ marginVertical: vs(12) }} />
          <View className="flex-row">
            <View className="flex-1 items-center">
              <Text className="text-[#6A7282] font-poppins-regular" style={{ fontSize: fs(12) }}>
                Boarded
              </Text>
              <Text
                className="font-poppins-bold text-[#9A15FB]"
                style={{ fontSize: fs(24), marginTop: vs(4) }}
              >
                {boarded}
              </Text>
            </View>
            <View className="h-full w-px bg-[#E5E7EB]" />
            <View className="flex-1 items-center">
              <Text className="text-[#6A7282] font-poppins-regular" style={{ fontSize: fs(12) }}>
                Marked Absent
              </Text>
              <Text
                className="font-poppins-bold text-[#F44336]"
                style={{ fontSize: fs(24), marginTop: vs(4) }}
              >
                {absent}
              </Text>
            </View>
          </View>
        </View>

        <View
          className="bg-white"
          style={{
            borderRadius: s(16),
            padding: s(20),
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.06,
            shadowRadius: 4,
            elevation: 2,
          }}
        >
          <Text
            className="font-poppins-semibold text-[#1E293B]"
            style={{ fontSize: fs(16) }}
          >
            Journey Details
          </Text>
          <View style={{ marginTop: vs(12), gap: vs(8) }}>
            <View className="flex-row justify-between">
              <Text className="text-[#6A7282] font-poppins-regular" style={{ fontSize: fs(14) }}>
                Route
              </Text>
              <Text className="font-poppins-semibold text-[#1E293B]" style={{ fontSize: fs(14) }}>
                {route}
              </Text>
            </View>
            <View className="flex-row justify-between">
              <Text className="text-[#6A7282] font-poppins-regular" style={{ fontSize: fs(14) }}>
                Stops
              </Text>
              <Text className="font-poppins-semibold text-[#1E293B]" style={{ fontSize: fs(14) }}>
                {stops}
              </Text>
            </View>
            <View className="flex-row justify-between">
              <Text className="text-[#6A7282] font-poppins-regular" style={{ fontSize: fs(14) }}>
                Passengers Boarded
              </Text>
              <Text className="font-poppins-semibold text-[#1E293B]" style={{ fontSize: fs(14) }}>
                {boarded}/{totalPassengers}
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>

      <View style={{ paddingHorizontal: s(16), paddingBottom: vs(24), paddingTop: vs(8) }}>
        <Pressable
          onPress={onViewFeedback}
          className="flex-row items-center justify-center bg-[#9810FA]"
          style={{ height: s(56), borderRadius: s(14), gap: s(8) }}
        >
          <StarIcon size={s(18)} color="white" />
          <Text
            className="font-poppins-semibold uppercase text-white"
            style={{ fontSize: fs(14) }}
          >
            View Feedback
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

export default JourneyRideSummaryScreen;
