import { Pressable, ScrollView, StatusBar, Text, View } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  BackArrowIcon,
  BigCheckIcon,
  ClockSmallIcon,
} from '../components/icons/ServiceTypeIcons';

interface EmergencyDropSummaryScreenProps {
  /** The passenger dropped (real data from the request). */
  passenger?: { name?: string; seat?: number; contact?: string } | null;
  reason?: string;
  /** The recomputed fare + refund returned by the approve call. */
  result?: {
    originalFare?: number;
    partialFare?: number;
    refund?: number;
    refundMethod?: string;
    dropStopName?: string;
  } | null;
  onBack?: () => void;
  onContinue?: () => void;
}

export function EmergencyDropSummaryScreen({
  passenger,
  reason = 'Early Drop Request',
  result,
  onBack,
  onContinue,
}: EmergencyDropSummaryScreenProps) {
  const displayName = passenger?.name ?? 'Passenger';
  const displaySeat = passenger?.seat != null ? String(passenger.seat) : '—';
  const displayTime = new Date().toLocaleString('en-IN');
  const original = Math.max(0, Math.round(result?.originalFare ?? 0));
  const partial = Math.max(0, Math.round(result?.partialFare ?? 0));
  const refund = Math.max(0, Math.round(result?.refund ?? 0));
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
              Emergency Drop Complete
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
          <View className="h-20 w-20 items-center justify-center rounded-full bg-[#9810FA]">
            <BigCheckIcon size={48} color="white" />
          </View>
          <Text className="mt-4 text-[20px] font-poppins-semibold text-[#1E293B]">
            Passenger Dropped Safely
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
            Passenger Information
          </Text>
          <View className="mt-3 gap-2">
            <View className="flex-row justify-between">
              <Text className="text-[14px] text-[#6A7282]">Name</Text>
              <Text className="text-[14px] font-poppins-semibold text-[#1E293B]">
                {displayName}
              </Text>
            </View>
            <View className="flex-row justify-between">
              <Text className="text-[14px] text-[#6A7282]">Seat</Text>
              <Text className="text-[14px] font-poppins-semibold text-[#1E293B]">
                {displaySeat}
              </Text>
            </View>
            <View className="flex-row justify-between">
              <Text className="text-[14px] text-[#6A7282]">Reason</Text>
              <Text className="text-[14px] font-poppins-semibold text-[#1E293B]">
                {reason}
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
          <Text className="text-[16px] font-poppins-semibold text-[#1E293B]">
            Fare Adjustment
          </Text>
          <View className="mt-3 gap-2">
            <View className="flex-row justify-between">
              <Text className="text-[14px] text-[#6A7282]">Original fare</Text>
              <Text className="text-[14px] font-poppins-medium text-[#1E293B]">₹{original}</Text>
            </View>
            <View className="flex-row justify-between">
              <Text className="text-[14px] text-[#6A7282]">Partial fare (distance covered)</Text>
              <Text className="text-[14px] font-poppins-medium text-[#1E293B]">₹{partial}</Text>
            </View>
            <View className="my-1 h-px bg-[#EEF0F3]" />
            <View className="flex-row justify-between">
              <Text className="text-[15px] font-poppins-semibold text-[#1E293B]">Refunded to rider</Text>
              <Text className="text-[16px] font-poppins-semibold text-[#00A67E]">₹{refund}</Text>
            </View>
          </View>
          <View className="mt-3 flex-row items-center gap-2">
            <ClockSmallIcon size={16} color="#9810FA" />
            <Text className="text-[12px] text-[#6A7282]">{displayTime}</Text>
          </View>
        </View>

        <View className="rounded-2xl bg-[#E8F7F1] p-5">
          <Text className="text-[13px] text-[#0B6B52]">
            {refund > 0
              ? `The early drop for ${displayName} is recorded and ₹${refund} has been refunded${
                  result?.refundMethod === 'wallet' ? ' to their wallet' : ''
                }. Your earnings are settled on the distance actually covered.`
              : `The early drop for ${displayName} is recorded. No refund was due. The rest of the journey continues as normal.`}
          </Text>
        </View>
      </ScrollView>

      <View className="px-4 pb-6 pt-2">
        <Pressable
          onPress={onContinue}
          className="h-[56px] items-center justify-center rounded-[14px] bg-[#9810FA]"
        >
          <Text className="text-[14px] font-poppins-semibold uppercase text-white">
            Continue Journey
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

export default EmergencyDropSummaryScreen;
