import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StatusBar, Text, View } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  BackArrowIcon,
  CheckCircleIcon,
  XCircleIcon,
} from '../components/icons/ServiceTypeIcons';
import { fetchJourneyPassengers } from '../services/api';
import { fs, s, vs } from '../theme/responsive';

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
  const insets = useSafeAreaInsets();
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
                Boarding Summary
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

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: s(16), gap: vs(16) }}
        showsVerticalScrollIndicator={false}
      >
        <View
          className="items-center rounded-2xl bg-[#FAF3FF]"
          style={{ paddingVertical: vs(32) }}
        >
          <Text
            className="font-poppins-bold text-[#9C1AFC]"
            style={{ fontSize: fs(64), lineHeight: fs(72) }}
          >
            {boarded}/{total}
          </Text>
          <Text
            className="font-poppins-medium text-[#1E293B]"
            style={{ fontSize: fs(20), marginTop: vs(8) }}
          >
            Passengers Boarded
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
            style={{ fontSize: fs(18) }}
          >
            Boarding Status
          </Text>
          <View className="flex-row" style={{ marginTop: vs(16) }}>
            <View className="flex-1 items-center">
              <CheckCircleIcon size={s(28)} color="#00A63E" />
              <Text
                className="text-[#6A7282] font-poppins-regular"
                style={{ fontSize: fs(14), marginTop: vs(8) }}
              >
                Boarded
              </Text>
              <Text
                className="font-poppins-bold text-[#00A63E]"
                style={{ fontSize: fs(24), marginTop: vs(4) }}
              >
                {boarded}
              </Text>
            </View>
            <View className="h-full w-px bg-[#E5E7EB]" />
            <View className="flex-1 items-center">
              <XCircleIcon size={s(28)} color="#E02D3C" />
              <Text
                className="text-[#6A7282] font-poppins-regular"
                style={{ fontSize: fs(14), marginTop: vs(8) }}
              >
                Marked Absent
              </Text>
              <Text
                className="font-poppins-bold text-[#E02D3C]"
                style={{ fontSize: fs(24), marginTop: vs(4) }}
              >
                {absentCount}
              </Text>
            </View>
          </View>
        </View>

        {/* Only render the red "Absent Passengers" card when there actually
            are no-shows — it used to show unconditionally, so an all-boarded
            trip still displayed an empty red "Absent Passengers" box. */}
        {absent.length > 0 && (
          <View
            className="bg-[#FFE5E5]"
            style={{ borderRadius: s(16), padding: s(20) }}
          >
            <Text
              className="font-poppins-semibold text-[#1E293B]"
              style={{ fontSize: fs(18) }}
            >
              Absent Passengers
            </Text>
            <View style={{ marginTop: vs(12), gap: vs(8) }}>
              {absent.map(p => (
                <View
                  key={p.id}
                  className="flex-row items-center justify-between bg-white"
                  style={{ borderRadius: s(16), paddingHorizontal: s(16), paddingVertical: vs(12) }}
                >
                  <Text
                    className="flex-1 font-poppins-medium text-[#1E293B]"
                    style={{ fontSize: fs(16) }}
                    numberOfLines={1}
                  >
                    {p.name}
                  </Text>
                  <Text
                    className="text-[#6A7282] font-poppins-regular"
                    style={{ fontSize: fs(14), marginLeft: s(8) }}
                  >
                    Seat {p.seat}
                  </Text>
                </View>
              ))}
            </View>
            <Text
              className="text-[#991B1B] font-poppins-regular"
              style={{ fontSize: fs(12), marginTop: vs(12) }}
            >
              Excluded from earnings • Refunds reviewed by admin
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Edge-to-edge (SDK 36): keep the CTA above the system nav bar. */}
      <View
        style={{
          paddingHorizontal: s(16),
          paddingBottom: Math.max(insets.bottom, vs(12)) + vs(12),
          paddingTop: vs(8),
        }}
      >
        {!canStart && (
          <Text
            className="text-center font-poppins-regular text-[#B45309]"
            style={{ fontSize: fs(13), marginBottom: vs(8) }}
          >
            {pending} passenger{pending === 1 ? '' : 's'} not yet checked in or marked no-show.
          </Text>
        )}
        <Pressable
          onPress={() => canStart && onStartJourney?.()}
          disabled={!canStart}
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
      </View>
    </View>
  );
}

export default BoardingSummaryScreen;
