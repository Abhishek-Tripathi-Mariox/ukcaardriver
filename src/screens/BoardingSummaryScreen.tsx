import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StatusBar, Text, View } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  BackArrowIcon,
  CheckCircleIcon,
  XCircleIcon,
} from '../components/icons/ServiceTypeIcons';
import { fetchJourneyPassengers } from '../services/api';

interface AbsentPassenger {
  id: string;
  name: string;
  seat: string;
}

interface BoardingSummaryScreenProps {
  journeyKey?: string | null;
  journeyId?: string;
  boarded?: number;
  total?: number;
  absentCount?: number;
  absent?: AbsentPassenger[];
  onBack?: () => void;
  onStartJourney?: () => void;
}

const DEFAULT_ABSENT: AbsentPassenger[] = [];

export function BoardingSummaryScreen({
  journeyKey,
  journeyId = 'SCH001',
  boarded: boardedProp = 0,
  total: totalProp = 0,
  absentCount: absentCountProp = 0,
  absent: absentProp = DEFAULT_ABSENT,
  onBack,
  onStartJourney,
}: BoardingSummaryScreenProps) {
  const [counts, setCounts] = useState<{
    boarded: number;
    total: number;
    noShowCount: number;
    pending: number;
    absent: AbsentPassenger[];
  } | null>(null);

  useEffect(() => {
    if (!journeyKey) return;
    fetchJourneyPassengers(journeyKey)
      .then((r) =>
        setCounts({
          boarded: r.boarded,
          total: r.total,
          noShowCount: r.noShow,
          // Still-unprocessed = neither boarded nor marked no-show.
          pending: r.passengers.filter((p) => !p.boarded && !p.noShow).length,
          // "Absent" = genuine no-shows only (not the unprocessed).
          absent: r.passengers
            .filter((p) => p.noShow)
            .map((p) => ({ id: `${p.bookingId}-${p.seat}`, name: p.name, seat: String(p.seat) })),
        }),
      )
      .catch(() => {});
  }, [journeyKey]);

  const boarded = counts?.boarded ?? boardedProp;
  const total = counts?.total ?? totalProp;
  const absent = counts?.absent ?? absentProp;
  const absentCount = counts ? counts.noShowCount : absentCountProp;
  // Block departure while passengers remain unprocessed (must be boarded or
  // marked no-show first). An empty trip (total 0) is fine to start.
  const pending = counts?.pending ?? 0;
  const canStart = total === 0 || pending === 0;

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
              <BackArrowIcon size={22} color="white" />
            </Pressable>
            <View className="flex-1">
              <Text className="text-[20px] font-semibold text-white">
                Boarding Summary
              </Text>
              <Text className="text-[14px] text-white/80">
                Journey ID: {journeyId}
              </Text>
            </View>
          </View>
        </SafeAreaView>
      </LinearGradient>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 16, gap: 16 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="items-center rounded-2xl bg-[#FAF3FF] py-8">
          <Text className="text-[64px] font-bold leading-[72px] text-[#9C1AFC]">
            {boarded}/{total}
          </Text>
          <Text className="mt-2 text-[20px] font-medium text-[#1E293B]">
            Passengers Boarded
          </Text>
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
          <Text className="text-[18px] font-semibold text-[#1E293B]">
            Boarding Status
          </Text>
          <View className="mt-4 flex-row">
            <View className="flex-1 items-center">
              <CheckCircleIcon size={28} color="#00A63E" />
              <Text className="mt-2 text-[14px] text-[#6A7282]">Boarded</Text>
              <Text className="mt-1 text-[24px] font-bold text-[#00A63E]">
                {boarded}
              </Text>
            </View>
            <View className="h-full w-px bg-[#E5E7EB]" />
            <View className="flex-1 items-center">
              <XCircleIcon size={28} color="#E02D3C" />
              <Text className="mt-2 text-[14px] text-[#6A7282]">
                Marked Absent
              </Text>
              <Text className="mt-1 text-[24px] font-bold text-[#E02D3C]">
                {absentCount}
              </Text>
            </View>
          </View>
        </View>

        <View className="rounded-2xl bg-[#FFE5E5] p-5">
          <Text className="text-[18px] font-semibold text-[#1E293B]">
            Absent Passengers
          </Text>
          <View className="mt-3 gap-2">
            {absent.map(p => (
              <View
                key={p.id}
                className="flex-row items-center justify-between rounded-2xl bg-white px-4 py-3"
              >
                <Text className="text-base font-medium text-[#1E293B]">
                  {p.name}
                </Text>
                <Text className="text-[14px] text-[#6A7282]">Seat {p.seat}</Text>
              </View>
            ))}
          </View>
          <Text className="mt-3 text-[12px] text-[#991B1B]">
            Excluded from earnings • Refunds reviewed by admin
          </Text>
        </View>
      </ScrollView>

      <View className="px-4 pb-6 pt-2">
        {!canStart && (
          <Text className="mb-2 text-center text-[13px] text-[#B45309]">
            {pending} passenger{pending === 1 ? '' : 's'} not yet checked in or marked no-show.
          </Text>
        )}
        <Pressable
          onPress={() => canStart && onStartJourney?.()}
          disabled={!canStart}
          className="h-[56px] items-center justify-center rounded-2xl bg-[#9810FA]"
          style={canStart ? undefined : { opacity: 0.5 }}
        >
          <Text className="text-base font-semibold uppercase text-white">
            Start Journey
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

export default BoardingSummaryScreen;
