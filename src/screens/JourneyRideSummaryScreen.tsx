import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StatusBar, Text, View } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  CloseIcon,
  StarIcon,
} from '../components/icons/ServiceTypeIcons';
import { fetchJourney, fetchJourneyPassengers } from '../services/api';

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
      <StatusBar barStyle="light-content" />

      <LinearGradient
        colors={['#AD46FF', '#9810FA']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
      >
        <SafeAreaView edges={['top']}>
          <View className="flex-row items-center gap-4 px-6 pb-4 pt-2">
            <Pressable onPress={onBack} hitSlop={10}>
              <CloseIcon size={22} color="white" />
            </Pressable>
            <Text className="text-[20px] font-semibold text-white">
              Ride Summary
            </Text>
          </View>
        </SafeAreaView>
      </LinearGradient>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 16, gap: 16 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="items-center rounded-2xl bg-[#FCF9FF] py-8">
          <Text className="text-[12px] font-medium uppercase tracking-wider text-[#6A7282]">
            Total Earnings
          </Text>
          <Text className="mt-2 text-[60px] font-bold leading-[64px] text-[#9A15FB]">
            {totalEarnings}
          </Text>
          <Text className="mt-2 text-[14px] text-[#6A7282]">{route}</Text>
        </View>

        <View
          className="rounded-2xl bg-white p-5"
          style={{
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.06,
            shadowRadius: 4,
            elevation: 2,
          }}
        >
          <Text className="text-[16px] font-semibold text-[#1E293B]">
            Passenger Summary
          </Text>
          <View className="mt-3 flex-row items-center justify-between">
            <Text className="text-[14px] text-[#6A7282]">Total Passengers</Text>
            <Text className="text-[16px] font-semibold text-[#1E293B]">
              {totalPassengers}
            </Text>
          </View>
          <View className="my-3 h-px bg-[#E5E7EB]" />
          <View className="flex-row">
            <View className="flex-1 items-center">
              <Text className="text-[12px] text-[#6A7282]">Boarded</Text>
              <Text className="mt-1 text-[24px] font-bold text-[#9A15FB]">
                {boarded}
              </Text>
            </View>
            <View className="h-full w-px bg-[#E5E7EB]" />
            <View className="flex-1 items-center">
              <Text className="text-[12px] text-[#6A7282]">Marked Absent</Text>
              <Text className="mt-1 text-[24px] font-bold text-[#F44336]">
                {absent}
              </Text>
            </View>
          </View>
        </View>

        <View
          className="rounded-2xl bg-white p-5"
          style={{
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.06,
            shadowRadius: 4,
            elevation: 2,
          }}
        >
          <Text className="text-[16px] font-semibold text-[#1E293B]">
            Journey Details
          </Text>
          <View className="mt-3 gap-2">
            <View className="flex-row justify-between">
              <Text className="text-[14px] text-[#6A7282]">Route</Text>
              <Text className="text-[14px] font-semibold text-[#1E293B]">
                {route}
              </Text>
            </View>
            <View className="flex-row justify-between">
              <Text className="text-[14px] text-[#6A7282]">Stops</Text>
              <Text className="text-[14px] font-semibold text-[#1E293B]">
                {stops}
              </Text>
            </View>
            <View className="flex-row justify-between">
              <Text className="text-[14px] text-[#6A7282]">Passengers Boarded</Text>
              <Text className="text-[14px] font-semibold text-[#1E293B]">
                {boarded}/{totalPassengers}
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>

      <View className="px-4 pb-6 pt-2">
        <Pressable
          onPress={onViewFeedback}
          className="h-[56px] flex-row items-center justify-center gap-2 rounded-[14px] bg-[#9810FA]"
        >
          <StarIcon size={18} color="white" />
          <Text className="text-[14px] font-semibold uppercase text-white">
            View Feedback
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

export default JourneyRideSummaryScreen;
