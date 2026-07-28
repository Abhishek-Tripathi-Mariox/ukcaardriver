import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  Share,
  StatusBar,
  Text,
  View,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  BackArrowIcon,
  CopyIcon,
  GiftIcon,
} from '../components/icons/ServiceTypeIcons';
import { fetchCurrentUser, fetchAppSettings } from '../services/api';

interface ReferAndEarnScreenProps {
  onBack?: () => void;
}

export function ReferAndEarnScreen({ onBack }: ReferAndEarnScreenProps) {
  const insets = useSafeAreaInsets();
  const [referralCode, setReferralCode] = useState<string | null>(null);
  const [referralCount, setReferralCount] = useState<number>(0);
  // Amounts are admin-configured and differ per side: the referring driver
  // earns `driverReward`, the friend who joins gets `joinerBonus`. Never
  // hardcode them (they used to both read a flat ₹200).
  const [driverReward, setDriverReward] = useState<number | null>(null);
  const [joinerBonus, setJoinerBonus] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const [u, settings] = await Promise.all([
        fetchCurrentUser(),
        fetchAppSettings(),
      ]);
      setReferralCode(u?.referralCode ?? null);
      setReferralCount(u?.referralCount ?? 0);
      if (settings) {
        setDriverReward(settings.referrerRewardDriver);
        setJoinerBonus(settings.referralBonus);
      }
    } catch (err) {
      console.warn('[refer] fetch failed:', err);
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

  const handleShare = async () => {
    if (!referralCode) return;
    try {
      await Share.share({
        message: `Join UKCAAR with my referral code ${referralCode} and we both earn rewards!`,
      });
    } catch (err) {
      console.warn('[refer] share failed:', err);
    }
  };

  // No Clipboard module installed yet — show the code in an alert that the
  // user can long-press to copy. Cheap until we add @react-native-clipboard.
  const handleCopy = () => {
    if (!referralCode) return;
    Alert.alert(
      'Your referral code',
      `${referralCode}\n\nLong-press the code to copy, or tap Share Code below.`,
    );
  };

  // The driver's total earned so far = successful referrals × their per-referral
  // reward. Amounts render as a placeholder until settings load, so we never
  // flash a wrong hardcoded figure.
  const earnings = referralCount * (driverReward ?? 0);
  const rewardText = driverReward != null ? `₹${driverReward}` : '₹…';
  const bonusText = joinerBonus != null ? `₹${joinerBonus}` : '₹…';

  return (
    <View className="flex-1 bg-[#FFF2EA]">
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      <LinearGradient
        colors={['#0097B3', '#00C896']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
      >
        <SafeAreaView edges={['top']}>
          <View className="flex-row items-center gap-4 px-6 pb-6 pt-2">
            <Pressable onPress={onBack} hitSlop={10}>
              <BackArrowIcon size={22} color="white" />
            </Pressable>
            <Text className="text-[18px] font-poppins-semibold text-white">
              Refer & Earn
            </Text>
          </View>
        </SafeAreaView>
      </LinearGradient>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 32 + insets.bottom }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <Text className="mt-6 px-6 text-center text-[24px] font-poppins-semibold text-black">
          Invite your friends &{'\n'}Earn {rewardText}
        </Text>

        <View className="mt-6 items-center px-6">
          <View className="h-40 w-40 items-center justify-center rounded-full bg-[#FEF6E4]">
            <View className="h-24 w-24 items-center justify-center rounded-full bg-[#FFD966]">
              <GiftIcon size={48} color="#0097B3" />
            </View>
          </View>
          <Text className="mt-4 text-[24px] font-poppins-bold text-black">
            {rewardText}
          </Text>
          <Text className="mt-1 text-[13px] font-poppins-medium text-black/60">
            Your friend gets {bonusText}
          </Text>
        </View>

        <View className="mt-6 px-5">
          <View className="flex-row items-center rounded-[10px] border border-white bg-[#0097B3] px-6 py-4">
            <View className="flex-1 items-center">
              <Text className="text-[24px] font-poppins-semibold text-[#FEF6E4]">
                {String(referralCount).padStart(2, '0')}
              </Text>
              <Text className="text-[14px] font-poppins-semibold text-[#FEF6E4]">
                Referrals
              </Text>
            </View>
            <View className="h-12 w-px bg-[#FEF6E4]/40" />
            <View className="flex-1 items-center">
              <Text className="text-[24px] font-poppins-semibold text-[#FEF6E4]">
                ₹{earnings}
              </Text>
              <Text className="text-[14px] font-poppins-semibold text-[#FEF6E4]">
                Earnings
              </Text>
            </View>
          </View>
        </View>

        <View className="mt-6 rounded-t-3xl bg-white px-5 pb-8 pt-5">
          <Text className="text-[18px] font-poppins-semibold text-[#0B0A08]">
            How it works?
          </Text>

          <View className="mt-5 flex-row items-start gap-3">
            <View className="h-[22px] w-[22px] items-center justify-center rounded-full bg-[#0097B3]">
              <Text className="text-[14px] font-poppins-semibold text-white">1</Text>
            </View>
            <View className="flex-1">
              <Text className="text-[14px] font-poppins-medium leading-5 text-[#0B0A08]">
                Share your referral code with a friend
              </Text>
              <Text className="mt-1 text-[14px] font-poppins-light leading-5 text-[#0B0A08]/60">
                They sign up with the code at registration
              </Text>
            </View>
          </View>

          <View className="mt-5 flex-row items-start gap-3">
            <View className="h-[22px] w-[22px] items-center justify-center rounded-full bg-[#0097B3]">
              <Text className="text-[14px] font-poppins-semibold text-white">2</Text>
            </View>
            <View className="flex-1">
              <Text className="text-[14px] font-poppins-medium leading-5 text-[#0B0A08]">
                You earn {rewardText} per successful referral
              </Text>
              <Text className="mt-1 text-[14px] font-poppins-light leading-5 text-[#0B0A08]/60">
                Your friend gets {bonusText}. Your reward is credited after they
                complete their first ride.
              </Text>
            </View>
          </View>

          <Pressable
            onPress={handleCopy}
            disabled={!referralCode}
            className="mt-6 flex-row items-center rounded-md bg-[#0097B3]/10 px-3 py-2"
          >
            <Text className="flex-1 text-[14px] font-poppins-medium text-[#0B0A08]">
              Referral Code:{' '}
              {loading
                ? '…'
                : referralCode ?? 'Not available yet'}
            </Text>
            <CopyIcon size={16} color="#0B0A08" />
            <Text className="ml-1 text-[14px] font-poppins-medium text-[#0B0A08]/40">
              Copy
            </Text>
          </Pressable>

          <Pressable
            onPress={handleShare}
            disabled={!referralCode}
            className={`mt-6 self-center rounded-[10px] px-10 py-3 ${
              referralCode ? 'bg-[#0097B3]' : 'bg-[#0097B3]/50'
            }`}
          >
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text className="text-[14px] font-poppins-medium text-white">
                Share Code
              </Text>
            )}
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

export default ReferAndEarnScreen;
