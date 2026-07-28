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
import {
  BackArrowIcon,
  StarIcon,
} from '../components/icons/ServiceTypeIcons';
import { fetchMyRatings, type DriverRatings } from '../services/api';
import { driverRatingText } from '../utils/driverRating';

interface FeedbackRatingsScreenProps {
  onBack?: () => void;
  onGoDashboard?: () => void;
  onViewEarnings?: () => void;
}

const CARD_SHADOW = {
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.06,
  shadowRadius: 4,
  elevation: 2,
} as const;

const MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

/** "Today" / "Yesterday" / "4 days ago" for the last week, then "12 Mar 2026". */
function formatReviewDate(iso?: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const startOf = (x: Date) => {
    const c = new Date(x);
    c.setHours(0, 0, 0, 0);
    return c.getTime();
  };
  const dayMs = 24 * 60 * 60 * 1000;
  const diffDays = Math.round((startOf(new Date()) - startOf(d)) / dayMs);
  if (diffDays <= 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

/** Row of 5 stars, filled up to `stars`, the rest muted. */
function StarRow({ stars, size = 14 }: { stars: number; size?: number }) {
  return (
    <View className="flex-row items-center gap-1">
      {[1, 2, 3, 4, 5].map(i => (
        <StarIcon key={i} size={size} color={i <= stars ? '#FFB100' : '#E5E7EB'} />
      ))}
    </View>
  );
}

export function FeedbackRatingsScreen({
  onBack,
  onGoDashboard,
  onViewEarnings,
}: FeedbackRatingsScreenProps) {
  const insets = useSafeAreaInsets();
  // Real rider feedback from GET /drivers/me/ratings. Nothing on this page is
  // fabricated — every section renders only what the backend returned.
  const [data, setData] = useState<DriverRatings | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const fresh = await fetchMyRatings();
      setData(fresh);
    } catch (err: any) {
      console.warn('[ratings] fetch failed:', err);
      setError(err?.message ?? 'Could not load your reviews.');
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

  const totalReviews = data?.totalRides ?? 0;
  // Display rule (utils/driverRating): a driver nobody has rated shows a
  // neutral 5.0, never 0.0 — same value the dashboard and Earnings show.
  const ratingLabel = driverRatingText(data?.overallRating);
  const ratingStars = Math.round(Number(ratingLabel));
  const comments = data?.comments ?? [];
  const tags = data?.metrics ?? [];

  // Per-star breakdown from the reviews the API actually sent (its most recent
  // window), so the bars always agree with the list below them.
  const starCounts = [5, 4, 3, 2, 1].map(
    s => comments.filter(c => c.stars === s).length,
  );
  const breakdownTotal = starCounts.reduce((a, b) => a + b, 0);

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
              Reviews & Ratings
            </Text>
          </View>
        </SafeAreaView>
      </LinearGradient>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{
          padding: 16,
          gap: 16,
          // Clears the pinned CTA footer; the footer itself absorbs the
          // edge-to-edge bottom inset (Math.max(insets.bottom, ...) below).
          paddingBottom: 24 + insets.bottom,
        }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#0097B3']}
            tintColor="#0097B3"
          />
        }
      >
        {loading && !data ? (
          <View className="items-center py-20">
            <ActivityIndicator size="large" color="#0097B3" />
          </View>
        ) : error && !data ? (
          <View className="items-center py-10">
            <Text className="text-center text-[14px] font-poppins text-[#F44336]">
              {error}
            </Text>
            <Pressable
              onPress={load}
              className="mt-3 rounded-2xl bg-[#0097B3] px-5 py-2"
            >
              <Text className="text-sm font-poppins-medium text-white">Retry</Text>
            </Pressable>
          </View>
        ) : (
          <>
            {/* Summary — overall average, stars, count, per-star breakdown. */}
            <View className="rounded-2xl bg-white p-5" style={CARD_SHADOW}>
              <View className="items-center">
                <Text className="text-[52px] font-poppins-bold leading-[60px] text-[#1E293B]">
                  {ratingLabel}
                </Text>
                <View className="mt-1">
                  <StarRow stars={ratingStars} size={22} />
                </View>
                <Text className="mt-2 text-[12px] font-poppins text-[#6A7282]">
                  {totalReviews > 0
                    ? `Based on ${totalReviews} rider ${totalReviews === 1 ? 'review' : 'reviews'}`
                    : 'No ratings yet'}
                </Text>
              </View>

              {breakdownTotal > 0 && (
                <View className="mt-5 gap-2 border-t border-[#F1F5F9] pt-4">
                  {[5, 4, 3, 2, 1].map((star, idx) => {
                    const count = starCounts[idx];
                    const pct = (count / breakdownTotal) * 100;
                    return (
                      <View key={star} className="flex-row items-center gap-2">
                        <Text className="w-3 text-right text-[12px] font-poppins-medium text-[#1E293B]">
                          {star}
                        </Text>
                        <StarIcon size={12} color="#FFB100" />
                        <View className="h-2 flex-1 overflow-hidden rounded-full bg-[#F1F5F9]">
                          <View
                            className="h-2 rounded-full bg-[#0097B3]"
                            style={{ width: `${pct}%` }}
                          />
                        </View>
                        <Text className="w-7 text-right text-[11px] font-poppins text-[#6A7282]">
                          {count}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              )}
            </View>

            {/* Feedback tags riders picked most often (only when present). */}
            {tags.length > 0 && (
              <View className="rounded-2xl bg-white p-5" style={CARD_SHADOW}>
                <Text className="text-[16px] font-poppins-semibold text-[#1E293B]">
                  What Riders Mention
                </Text>
                <View className="mt-3 flex-row flex-wrap gap-2">
                  {tags.map(t => (
                    <View
                      key={t.label}
                      className="rounded-full bg-[#E0F4F8] px-3 py-1.5"
                    >
                      <Text className="text-[12px] font-poppins-medium text-[#0097B3]">
                        {t.label}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* Review list — or a friendly empty state. */}
            <View className="rounded-2xl bg-white p-5" style={CARD_SHADOW}>
              <Text className="text-[16px] font-poppins-semibold text-[#1E293B]">
                Recent Reviews
              </Text>

              {comments.length === 0 ? (
                <View className="items-center py-8">
                  <StarIcon size={36} color="#CBD5E1" />
                  <Text className="mt-3 text-[14px] font-poppins-medium text-[#1E293B]">
                    No reviews yet
                  </Text>
                  <Text className="mt-1 text-center text-[12px] font-poppins text-[#6A7282]">
                    Ratings from your riders will appear here
                  </Text>
                </View>
              ) : (
                <View className="mt-3 gap-3">
                  {comments.map(c => {
                    const name = c.reviewerName?.trim() || 'Rider';
                    const dateLabel = formatReviewDate(c.date);
                    return (
                      <View key={c.id} className="rounded-2xl bg-[#F9FAFB] p-4">
                        <View className="flex-row items-center">
                          <View className="h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#E0F4F8]">
                            <Text className="text-[15px] font-poppins-semibold text-[#0097B3]">
                              {name.charAt(0).toUpperCase()}
                            </Text>
                          </View>
                          <View className="ml-3 min-w-0 flex-1">
                            <Text
                              className="text-[14px] font-poppins-semibold text-[#1E293B]"
                              numberOfLines={1}
                            >
                              {name}
                            </Text>
                            {dateLabel ? (
                              <Text className="mt-0.5 text-[11px] font-poppins text-[#6A7282]">
                                {dateLabel}
                              </Text>
                            ) : null}
                          </View>
                          <View className="ml-2 shrink-0">
                            <StarRow stars={c.stars} size={13} />
                          </View>
                        </View>
                        {c.text ? (
                          <Text className="mt-3 text-[13px] font-poppins leading-5 text-[#334155]">
                            {c.text}
                          </Text>
                        ) : null}
                      </View>
                    );
                  })}
                </View>
              )}
            </View>
          </>
        )}
      </ScrollView>

      {/* Edge-to-edge (SDK 36): keep the CTAs above the system nav bar. */}
      <View
        className="px-4 pt-2"
        style={{ paddingBottom: Math.max(insets.bottom, 12) + 12 }}
      >
        <Pressable
          onPress={onGoDashboard}
          className="h-[50px] items-center justify-center rounded-2xl bg-[#0097B3]"
        >
          <Text className="text-[14px] font-poppins-medium uppercase text-white">
            Go to Dashboard
          </Text>
        </Pressable>
        <Pressable
          onPress={onViewEarnings}
          className="mt-3 h-[50px] items-center justify-center rounded-2xl border border-[#0097B3] bg-white"
        >
          <Text className="text-[14px] font-poppins-medium uppercase text-[#0097B3]">
            View Earnings
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

export default FeedbackRatingsScreen;
