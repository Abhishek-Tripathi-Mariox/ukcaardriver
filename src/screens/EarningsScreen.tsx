import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StatusBar,
  Text,
  View,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BackArrowIcon } from '../components/icons/ServiceTypeIcons';
import { DriverEarnings, fetchMyEarnings } from '../services/api';

interface EarningsScreenProps {
  onBack?: () => void;
  onViewPaymentHistory?: () => void;
}

const formatRupees = (n: number): string => {
  try {
    return `₹${new Intl.NumberFormat('en-IN').format(n)}`;
  } catch {
    return `₹${n}`;
  }
};

// Each delta is signed (+/- prefix). Positive = green pill, negative = red.
const formatDelta = (n: number): string =>
  `${n > 0 ? '+' : n < 0 ? '' : ''}${n}%`;

export function EarningsScreen({ onBack, onViewPaymentHistory }: EarningsScreenProps) {
  const [data, setData] = useState<DriverEarnings | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const fresh = await fetchMyEarnings();
      setData(fresh);
    } catch (err: any) {
      console.warn('[earnings] fetch failed:', err);
      setError(err?.message ?? 'Could not load earnings.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = () => {
    setRefreshing(true);
    load();
  };

  const [period, setPeriod] = useState<'today' | 'week' | 'month'>('month');
  // Period-driven headline. Daily/weekly come from the same endpoint now.
  const periodData =
    period === 'today'
      ? { total: data?.today?.total ?? 0, rides: data?.today?.completedRides ?? 0, title: 'Today' }
      : period === 'week'
      ? { total: data?.thisWeek?.total ?? 0, rides: data?.thisWeek?.completedRides ?? 0, title: 'This Week' }
      : { total: data?.thisMonth.total ?? 0, rides: data?.thisMonth.completedRides ?? 0, title: 'This Month' };
  const periodTotal = data ? formatRupees(periodData.total) : '—';
  const monthTotal = data ? formatRupees(data.thisMonth.total) : '—';
  const growthPct = data ? formatDelta(data.thisMonth.growthPct) : '—';
  const isPositiveGrowth = (data?.thisMonth.growthPct ?? 0) >= 0;
  const completedRides = data?.thisMonth.completedRides ?? 0;
  // Trend chart is period-aware: Daily → today's 4-hour buckets, Weekly → last
  // 7 days, Monthly → 6-month trend. All three share the {label,value}[] shape,
  // so the same bar chart below renders each without change.
  const series =
    period === 'today'
      ? data?.hourlySeries ?? []
      : period === 'week'
      ? data?.weekSeries ?? []
      : data?.trend ?? [];
  // Cap the bar denominator at 1 so a brand-new account (all zeros) doesn't
  // produce NaN heights and crash the layout.
  const maxTrend = Math.max(1, ...series.map(t => t.value));
  const trendTitle =
    period === 'today' ? "Today's Earnings" : period === 'week' ? 'This Week' : '6-Month Trend';

  const bd = data?.breakdown;

  return (
    <View className="flex-1 bg-[#F9FAFB]">
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

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
            <Text className="text-[20px] font-poppins-semibold text-white">
              Earnings
            </Text>
          </View>
        </SafeAreaView>
      </LinearGradient>

      <ScrollView
        className="flex-1"
        // 120px bottom padding so the last card / button clears the
        // persistent DriverBottomNav (~88px + safe-area inset).
        contentContainerStyle={{ padding: 16, paddingBottom: 120, gap: 16 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {loading && !data ? (
          <View className="py-20 items-center">
            <ActivityIndicator color="#9810FA" />
          </View>
        ) : error && !data ? (
          <View className="py-10 items-center">
            <Text className="text-[14px] text-[#F44336]">{error}</Text>
            <Pressable
              onPress={load}
              className="mt-3 rounded-2xl bg-[#9810FA] px-5 py-2"
            >
              <Text className="text-sm font-poppins-semibold text-white">Retry</Text>
            </Pressable>
          </View>
        ) : (
          <>
            {/* Period filter — Daily / Weekly / Monthly. */}
            <View className="mb-4 flex-row rounded-2xl bg-[#F1ECF9] p-1">
              {([
                { key: 'today', label: 'Daily' },
                { key: 'week', label: 'Weekly' },
                { key: 'month', label: 'Monthly' },
              ] as const).map(opt => {
                const active = period === opt.key;
                return (
                  <Pressable
                    key={opt.key}
                    onPress={() => setPeriod(opt.key)}
                    className={`flex-1 items-center rounded-xl py-2 ${active ? 'bg-white' : ''}`}
                  >
                    <Text
                      className={`text-[13px] ${active ? 'font-poppins-semibold text-[#9810FA]' : 'font-poppins text-[#6A7282]'}`}
                    >
                      {opt.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {/* Period total card */}
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
              <View className="flex-row items-center justify-between">
                <Text className="text-[16px] font-poppins-semibold text-[#1E293B]">
                  {periodData.title}
                </Text>
                {period === 'month' && (
                  <View
                    className={`rounded-full px-3 py-1 ${
                      isPositiveGrowth ? 'bg-[#DCFCE7]' : 'bg-[#FEE2E2]'
                    }`}
                  >
                    <Text
                      className={`text-[12px] font-poppins-semibold ${
                        isPositiveGrowth ? 'text-[#00A63E]' : 'text-[#B91C1C]'
                      }`}
                    >
                      {growthPct}
                    </Text>
                  </View>
                )}
              </View>
              <Text className="mt-3 text-[34px] font-poppins-bold text-[#9A15FB]">
                {periodTotal}
              </Text>
              <Text className="mt-1 text-[13px] text-[#6A7282]">
                From {periodData.rides} completed{' '}
                {periodData.rides === 1 ? 'ride' : 'rides'}
              </Text>
            </View>

            {/* 6-month trend */}
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
              <Text className="text-[16px] font-poppins-semibold text-[#1E293B]">
                {trendTitle}
              </Text>
              <View className="mt-4 h-[140px] flex-row items-end justify-between">
                {series.map((t, i) => {
                  // Show at least a sliver (4%) for non-zero months so the
                  // user sees the bar exists; zeros stay flat.
                  const h = t.value > 0 ? Math.max(4, (t.value / maxTrend) * 100) : 0;
                  return (
                    <View key={`${t.label}-${i}`} className="items-center gap-2">
                      <View
                        className="w-7 rounded-t-lg bg-[#9A15FB]"
                        style={{ height: `${h}%` }}
                      />
                      <Text className="text-[11px] text-[#6A7282]">
                        {t.label}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </View>

            {/* Lifetime breakdown */}
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
              <Text className="text-[16px] font-poppins-semibold text-[#1E293B]">
                Earnings Breakdown
              </Text>
              <View className="mt-4 gap-3">
                <View className="flex-row justify-between">
                  <Text className="text-[14px] text-[#6A7282]">Total Earned</Text>
                  <Text className="text-[14px] font-poppins-semibold text-[#1E293B]">
                    {formatRupees(bd?.totalEarned ?? 0)}
                  </Text>
                </View>
                <View className="flex-row justify-between">
                  <Text className="text-[14px] text-[#6A7282]">
                    Platform Fee ({bd?.commissionPct ?? 0}%)
                  </Text>
                  <Text className="text-[14px] font-poppins-semibold text-[#F44336]">
                    -{formatRupees(bd?.platformFee ?? 0)}
                  </Text>
                </View>
                <View className="flex-row justify-between">
                  <Text className="text-[14px] text-[#6A7282]">
                    Fuel Allowance ({bd?.fuelPct ?? 0}%)
                  </Text>
                  <Text className="text-[14px] font-poppins-semibold text-[#00C896]">
                    +{formatRupees(bd?.fuelAllowance ?? 0)}
                  </Text>
                </View>
              </View>
              <View className="mt-4 border-t border-[#E5E7EB] pt-4">
                <View className="flex-row items-center justify-between">
                  <Text className="text-[14px] text-[#1E293B]">Net Earnings</Text>
                  <Text className="text-[19px] font-poppins-bold text-[#9A15FB]">
                    {formatRupees(bd?.netEarnings ?? 0)}
                  </Text>
                </View>
              </View>
            </View>

            {/*
             * Payment-history CTA. Lives INSIDE the ScrollView so its
             * bottomPadding clears the persistent DriverBottomNav. Before,
             * this button sat after the ScrollView and was hidden by the nav.
             */}
            <Pressable
              onPress={onViewPaymentHistory}
              className="h-[50px] items-center justify-center rounded-2xl border border-[#9810FA] bg-white"
            >
              <Text className="text-[14px] font-poppins-semibold uppercase text-[#9810FA]">
                View Payment History
              </Text>
            </Pressable>
          </>
        )}
      </ScrollView>
    </View>
  );
}

export default EarningsScreen;
