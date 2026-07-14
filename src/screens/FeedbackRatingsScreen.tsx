import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StatusBar, Text, View } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  BackArrowIcon,
  StarIcon,
} from '../components/icons/ServiceTypeIcons';
import { fetchMyRatings, type DriverRatings } from '../services/api';

interface Metric {
  label: string;
  value: number;
  color?: string;
}

interface Comment {
  id: string;
  stars: number;
  text: string;
  source: string;
}

interface FeedbackRatingsScreenProps {
  overallRating?: number;
  totalRides?: number;
  metrics?: Metric[];
  weeklyTrend?: number[];
  comments?: Comment[];
  onBack?: () => void;
  onGoDashboard?: () => void;
  onViewEarnings?: () => void;
}

const TREND_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export function FeedbackRatingsScreen({
  onBack,
  onGoDashboard,
  onViewEarnings,
}: FeedbackRatingsScreenProps) {
  // Real rider feedback from the backend. Until it loads we show neutral
  // zeros/empties rather than fabricated sample data.
  const [data, setData] = useState<DriverRatings | null>(null);
  useEffect(() => {
    fetchMyRatings()
      .then(setData)
      .catch(() => {});
  }, []);

  const overallRating = data?.overallRating ?? 0;
  const totalRides = data?.totalRides ?? 0;
  const metrics = data?.metrics ?? [];
  const weeklyTrend = data?.weeklyTrend?.length ? data.weeklyTrend : [0, 0, 0, 0, 0, 0, 0];
  const comments = data?.comments ?? [];
  const maxTrend = Math.max(...weeklyTrend, 5);

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
              Feedback & Ratings
            </Text>
          </View>
        </SafeAreaView>
      </LinearGradient>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 16, gap: 16 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="items-center rounded-2xl bg-[#FBF5FF] py-8">
          <Text className="text-[64px] font-poppins-bold leading-[68px] text-[#9A15FB]">
            {overallRating}
          </Text>
          <View className="mt-2 flex-row gap-1">
            {[1, 2, 3, 4, 5].map(i => (
              <StarIcon key={i} size={20} color="#FFB100" />
            ))}
          </View>
          <Text className="mt-2 text-[12px] text-[#6A7282]">
            Based on {totalRides} rides
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
          <Text className="text-[16px] font-poppins-semibold text-[#1E293B]">
            Performance Metrics
          </Text>
          <View className="mt-4 gap-4">
            {metrics.map(m => {
              const pct = Math.min(100, (m.value / 5) * 100);
              const fill = m.color ?? '#9A15FB';
              return (
                <View key={m.label}>
                  <View className="flex-row items-center justify-between">
                    <Text className="text-[14px] text-[#1E293B]">{m.label}</Text>
                    <Text className="text-[14px] font-poppins-semibold text-[#1E293B]">
                      {m.value.toFixed(1)}/5
                    </Text>
                  </View>
                  <View className="mt-2 h-2 rounded-full bg-[#9ED7E2]">
                    <View
                      className="h-2 rounded-full"
                      style={{ width: `${pct}%`, backgroundColor: fill }}
                    />
                  </View>
                </View>
              );
            })}
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
          <Text className="text-[16px] font-poppins-semibold text-[#1E293B]">
            Weekly Trend
          </Text>
          <View className="mt-4 h-[120px] flex-row items-end justify-between">
            {weeklyTrend.map((v, i) => {
              const h = (v / maxTrend) * 100;
              return (
                <View key={TREND_LABELS[i]} className="items-center gap-2">
                  <View
                    className="w-6 rounded-t-lg bg-[#9A15FB]"
                    style={{ height: `${h}%` }}
                  />
                  <Text className="text-[11px] text-[#6A7282]">
                    {TREND_LABELS[i]}
                  </Text>
                </View>
              );
            })}
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
          <Text className="text-[16px] font-poppins-semibold text-[#1E293B]">
            Recent Comments
          </Text>
          <View className="mt-3 gap-3">
            {comments.map(c => (
              <View key={c.id} className="rounded-2xl bg-[#F9FAFB] p-4">
                <View className="flex-row gap-1">
                  {Array.from({ length: c.stars }).map((_, i) => (
                    <StarIcon key={i} size={14} color="#FFB100" />
                  ))}
                </View>
                <Text className="mt-2 text-[14px] italic text-[#1E293B]">
                  "{c.text}"
                </Text>
                <Text className="mt-2 text-[12px] text-[#6A7282]">
                  - {c.source}
                </Text>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>

      <View className="px-4 pb-6 pt-2">
        <Pressable
          onPress={onGoDashboard}
          className="h-[50px] items-center justify-center rounded-2xl bg-[#9810FA]"
        >
          <Text className="text-[14px] font-poppins-semibold uppercase text-white">
            Go to Dashboard
          </Text>
        </Pressable>
        <Pressable
          onPress={onViewEarnings}
          className="mt-3 h-[50px] items-center justify-center rounded-2xl border border-[#0097B3] bg-white"
        >
          <Text className="text-[14px] font-poppins-semibold uppercase text-[#0097B3]">
            View Earnings
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

export default FeedbackRatingsScreen;
