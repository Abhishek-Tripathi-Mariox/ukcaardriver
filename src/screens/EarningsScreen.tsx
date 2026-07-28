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
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, {
  Circle,
  Line as SvgLine,
  Polyline,
  Text as SvgText,
} from 'react-native-svg';
import {
  ArrowRightIcon,
  BackArrowIcon,
  CashoutIcon,
  DownloadIcon,
  StarIcon,
} from '../components/icons/ServiceTypeIcons';
import { DriverEarnings, fetchCurrentUser, fetchMyEarnings } from '../services/api';
import { driverRatingText } from '../utils/driverRating';

interface EarningsScreenProps {
  onBack?: () => void;
  onViewPaymentHistory?: () => void;
  /** Opens the statement / export flow. */
  onExport?: () => void;
  /** Opens the cashout flow. */
  onWithdraw?: () => void;
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

// Line-chart layout, in SVG units (= px). PLOT_H is the drawable band between
// the top padding and the x-axis label strip; PAD_L reserves room for the
// y-axis tick labels.
const CHART_H = 180;
const CHART_PAD_T = 12;
const CHART_PAD_B = 26;
const CHART_PAD_L = 42;
const CHART_PAD_R = 16;
const CHART_PLOT_H = CHART_H - CHART_PAD_T - CHART_PAD_B;

export function EarningsScreen({
  onBack,
  onViewPaymentHistory,
  onExport,
  onWithdraw,
}: EarningsScreenProps) {
  const insets = useSafeAreaInsets();
  const [data, setData] = useState<DriverEarnings | null>(null);
  // driverProfile.rating — same field the dashboard and profile read, so the
  // three screens can never disagree.
  const [profileRating, setProfileRating] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Measured by onLayout — the SVG chart needs a concrete pixel width.
  const [chartW, setChartW] = useState(0);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [fresh, me] = await Promise.all([
        fetchMyEarnings(),
        fetchCurrentUser().catch(() => null),
      ]);
      setData(fresh);
      setProfileRating(me?.driverProfile?.rating ?? null);
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
  // Stat row on the gradient card. Avg fare is derived from figures already on
  // screen; rating comes from the API when present and falls back to an em
  // dash rather than a made-up number.
  const avgFare =
    data && periodData.rides > 0
      ? formatRupees(Math.round(periodData.total / periodData.rides))
      : '—';
  // Read the rating from driverProfile — the SAME value the dashboard and
  // profile show. It used to come from an earnings-API field that isn't on the
  // deployed backend, so it fell back to 5.0 while the dashboard showed the
  // real 4.0.
  const ratingLabel = driverRatingText(profileRating);
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
  // Cap the denominator at 1 so a brand-new account (all zeros) doesn't
  // produce NaN coordinates and crash the layout.
  const maxTrend = Math.max(1, ...series.map(t => t.value));
  // Y axis is scaled to 4 "nice" ticks (rounded up to the next 50) so the
  // labels read 450/900/1350/1800 rather than raw maxima.
  const chartStep = Math.max(50, Math.ceil(maxTrend / 4 / 50) * 50);
  const chartMax = chartStep * 4;
  const plotW = Math.max(0, chartW - CHART_PAD_L - CHART_PAD_R);
  const pointX = (i: number) =>
    series.length <= 1
      ? CHART_PAD_L + plotW / 2
      : CHART_PAD_L + (plotW * i) / (series.length - 1);
  const pointY = (v: number) =>
    CHART_PAD_T + CHART_PLOT_H * (1 - Math.min(1, Math.max(0, v) / chartMax));
  const trendTitle =
    period === 'today' ? "Today's Earnings" : period === 'week' ? 'This Week' : '6-Month Trend';

  const bd = data?.breakdown;

  return (
    <View className="flex-1 bg-[#F9FAFB]">
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      <LinearGradient
        colors={['#0097B3', '#00C896']}
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
        // Bottom padding so the last card / button clears the persistent
        // DriverBottomNav (~88px) plus the edge-to-edge nav-bar inset.
        contentContainerStyle={{ padding: 16, paddingBottom: 120 + insets.bottom, gap: 16 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {loading && !data ? (
          <View className="py-20 items-center">
            <ActivityIndicator color="#0097B3" />
          </View>
        ) : error && !data ? (
          <View className="py-10 items-center">
            <Text className="text-[14px] text-[#F44336]">{error}</Text>
            <Pressable
              onPress={load}
              className="mt-3 rounded-2xl bg-[#0097B3] px-5 py-2"
            >
              <Text className="text-sm font-poppins-medium text-white">Retry</Text>
            </Pressable>
          </View>
        ) : (
          <>
            {/* Period filter — Daily / Weekly / Monthly. */}
            <View className="flex-row rounded-2xl bg-[#F1F5F9] p-1">
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
                      className={`text-[13px] ${active ? 'font-poppins-semibold text-[#0097B3]' : 'font-poppins text-[#6A7282]'}`}
                    >
                      {opt.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {/* Period total card — brand gradient hero, per the reference. */}
            <LinearGradient
              colors={['#0097B3', '#00C896']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{ borderRadius: 16, padding: 20 }}
            >
              <View className="flex-row items-center justify-between">
                <Text className="text-[13px] font-poppins-medium text-white/80">
                  Total Earnings {periodData.title}
                </Text>
                {period === 'month' && (
                  <View
                    className={`rounded-full px-3 py-1 ${
                      isPositiveGrowth ? 'bg-white/25' : 'bg-[#FEE2E2]'
                    }`}
                  >
                    <Text
                      className={`text-[12px] font-poppins-semibold ${
                        isPositiveGrowth ? 'text-white' : 'text-[#B91C1C]'
                      }`}
                    >
                      {growthPct}
                    </Text>
                  </View>
                )}
              </View>
              <Text className="mt-2 text-[34px] font-poppins-bold text-white">
                {periodTotal}
              </Text>

              <View className="mt-5 flex-row border-t border-white/25 pt-4">
                <View className="flex-1 items-center">
                  <Text className="text-[18px] font-poppins-semibold text-white">
                    {periodData.rides}
                  </Text>
                  <Text className="mt-0.5 text-[11px] font-poppins text-white/80">
                    Rides
                  </Text>
                </View>
                <View className="w-px bg-white/25" />
                <View className="flex-1 items-center">
                  <Text className="text-[18px] font-poppins-semibold text-white">
                    {avgFare}
                  </Text>
                  <Text className="mt-0.5 text-[11px] font-poppins text-white/80">
                    Avg Fare
                  </Text>
                </View>
                <View className="w-px bg-white/25" />
                <View className="flex-1 items-center">
                  <View className="flex-row items-center gap-1">
                    <StarIcon size={13} color="#FFD54A" />
                    <Text className="text-[18px] font-poppins-semibold text-white">
                      {ratingLabel}
                    </Text>
                  </View>
                  <Text className="mt-0.5 text-[11px] font-poppins text-white/80">
                    Rating
                  </Text>
                </View>
              </View>
            </LinearGradient>

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
              <View
                className="mt-4"
                onLayout={e => setChartW(e.nativeEvent.layout.width)}
              >
                {chartW > 0 && series.length > 0 ? (
                  <Svg width={chartW} height={CHART_H}>
                    {/* Horizontal grid — baseline darker than the inner rules. */}
                    {[0, 1, 2, 3, 4].map(i => (
                      <SvgLine
                        key={`grid-${i}`}
                        x1={CHART_PAD_L}
                        x2={chartW - CHART_PAD_R}
                        y1={CHART_PAD_T + CHART_PLOT_H * (1 - i / 4)}
                        y2={CHART_PAD_T + CHART_PLOT_H * (1 - i / 4)}
                        stroke={i === 0 ? '#E5E7EB' : '#F1F5F9'}
                        strokeWidth={1}
                      />
                    ))}
                    {/* Y-axis tick labels (0 is implied by the baseline). */}
                    {[1, 2, 3, 4].map(i => (
                      <SvgText
                        key={`tick-${i}`}
                        x={CHART_PAD_L - 8}
                        y={CHART_PAD_T + CHART_PLOT_H * (1 - i / 4) + 3}
                        fontSize={10}
                        fill="#9CA3AF"
                        textAnchor="end"
                      >
                        {String(chartStep * i)}
                      </SvgText>
                    ))}
                    <Polyline
                      points={series
                        .map((t, i) => `${pointX(i)},${pointY(t.value)}`)
                        .join(' ')}
                      fill="none"
                      stroke="#0097B3"
                      strokeWidth={2.5}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    {series.map((t, i) => (
                      <Circle
                        key={`dot-${t.label}-${i}`}
                        cx={pointX(i)}
                        cy={pointY(t.value)}
                        r={4}
                        fill="#0097B3"
                        stroke="#FFFFFF"
                        strokeWidth={2}
                      />
                    ))}
                    {series.map((t, i) => (
                      <SvgText
                        key={`lbl-${t.label}-${i}`}
                        x={pointX(i)}
                        y={CHART_H - 8}
                        fontSize={10}
                        fill="#6A7282"
                        textAnchor="middle"
                      >
                        {t.label}
                      </SvgText>
                    ))}
                  </Svg>
                ) : (
                  <View style={{ height: CHART_H }} />
                )}
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
                  <Text className="text-[19px] font-poppins-bold text-[#0097B3]">
                    {formatRupees(bd?.netEarnings ?? 0)}
                  </Text>
                </View>
              </View>
            </View>

            {/* Recent Rides — renders only once the API supplies the list. */}
            {(data?.recentRides?.length ?? 0) > 0 && (
              <View className="gap-3">
                <Text className="text-[16px] font-poppins-semibold text-[#1E293B]">
                  Recent Rides
                </Text>
                {data!.recentRides!.map(r => (
                  <View
                    key={r.id}
                    className="flex-row items-center justify-between rounded-2xl bg-white p-4"
                    style={{
                      shadowColor: '#000',
                      shadowOffset: { width: 0, height: 2 },
                      shadowOpacity: 0.06,
                      shadowRadius: 4,
                      elevation: 2,
                    }}
                  >
                    <View className="flex-1 pr-3">
                      <Text className="text-[13px] font-poppins-semibold text-[#1E293B]">
                        {r.id}
                      </Text>
                      <View className="mt-0.5 flex-row items-center gap-1">
                        <Text
                          className="shrink text-[12px] font-poppins text-[#6A7282]"
                          numberOfLines={1}
                        >
                          {r.from}
                        </Text>
                        <ArrowRightIcon size={11} color="#9CA3AF" />
                        <Text
                          className="shrink text-[12px] font-poppins text-[#6A7282]"
                          numberOfLines={1}
                        >
                          {r.to}
                        </Text>
                      </View>
                      <Text className="mt-0.5 text-[11px] font-poppins text-[#9CA3AF]">
                        {r.time}
                      </Text>
                    </View>
                    <Text className="text-[15px] font-poppins-bold text-[#00C896]">
                      {formatRupees(r.amount)}
                    </Text>
                  </View>
                ))}
              </View>
            )}

            {/*
             * Bottom actions. Live INSIDE the ScrollView so the 120px
             * bottomPadding clears the persistent DriverBottomNav. Before,
             * this row sat after the ScrollView and was hidden by the nav.
             */}
            <View className="flex-row gap-3">
              <Pressable
                onPress={onExport}
                className="h-[50px] flex-1 flex-row items-center justify-center gap-2 rounded-2xl border border-[#0097B3] bg-white"
              >
                <DownloadIcon size={16} color="#0097B3" />
                <Text className="text-[14px] font-poppins-semibold text-[#0097B3]">
                  Export
                </Text>
              </Pressable>
              <Pressable
                onPress={onWithdraw}
                className="h-[50px] flex-1 flex-row items-center justify-center gap-2 rounded-2xl bg-[#0097B3]"
              >
                <CashoutIcon size={16} color="white" />
                <Text className="text-[14px] font-poppins-semibold text-white">
                  Withdraw
                </Text>
              </Pressable>
            </View>

            <Pressable
              onPress={onViewPaymentHistory}
              className="items-center py-1"
            >
              <Text className="text-[13px] font-poppins-semibold text-[#0097B3]">
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
