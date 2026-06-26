import { Pressable, ScrollView, StatusBar, Text, View } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  BackArrowIcon,
  BigCheckIcon,
  ClockSmallIcon,
  LocationPinSmallIcon,
} from '../components/icons/ServiceTypeIcons';

interface EmergencyDropSummaryScreenProps {
  passengerName?: string;
  seat?: string;
  reason?: string;
  dropLocation?: string;
  timestamp?: string;
  onBack?: () => void;
  onContinue?: () => void;
}

export function EmergencyDropSummaryScreen({
  passengerName = 'Ramesh Kumar',
  seat = 'A1',
  reason = 'Early Drop Request',
  dropLocation = 'NH 48, Near Vellore - Safe Zone',
  timestamp = '24/01/2026, 11:21:04',
  onBack,
  onContinue,
}: EmergencyDropSummaryScreenProps) {
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
            <Text className="text-[20px] font-semibold text-white">
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
          <Text className="mt-4 text-[20px] font-semibold text-[#1E293B]">
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
          <Text className="text-[16px] font-semibold text-[#1E293B]">
            Passenger Information
          </Text>
          <View className="mt-3 gap-2">
            <View className="flex-row justify-between">
              <Text className="text-[14px] text-[#6A7282]">Name</Text>
              <Text className="text-[14px] font-semibold text-[#1E293B]">
                {passengerName}
              </Text>
            </View>
            <View className="flex-row justify-between">
              <Text className="text-[14px] text-[#6A7282]">Seat</Text>
              <Text className="text-[14px] font-semibold text-[#1E293B]">
                {seat}
              </Text>
            </View>
            <View className="flex-row justify-between">
              <Text className="text-[14px] text-[#6A7282]">Reason</Text>
              <Text className="text-[14px] font-semibold text-[#1E293B]">
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
          <Text className="text-[16px] font-semibold text-[#1E293B]">
            Event Details
          </Text>
          <View className="mt-3 gap-3">
            <View className="flex-row items-start gap-3">
              <LocationPinSmallIcon size={18} color="#9810FA" />
              <View className="flex-1">
                <Text className="text-[12px] text-[#6A7282]">Drop Location</Text>
                <Text className="text-[14px] font-medium text-[#1E293B]">
                  {dropLocation}
                </Text>
              </View>
            </View>
            <View className="flex-row items-start gap-3">
              <ClockSmallIcon size={18} color="#9810FA" />
              <View className="flex-1">
                <Text className="text-[12px] text-[#6A7282]">Timestamp</Text>
                <Text className="text-[14px] font-medium text-[#1E293B]">
                  {timestamp}
                </Text>
              </View>
            </View>
          </View>
        </View>

        <View className="rounded-2xl bg-[#E3F2FD] p-5">
          <Text className="text-[13px] text-[#1E40AF]">
            ✓ Event logged and passenger notified
          </Text>
          <Text className="mt-2 text-[13px] text-[#1E40AF]">
            ✓ Admin has been alerted
          </Text>
          <Text className="mt-2 text-[13px] text-[#1E40AF]">
            ✓ GPS coordinates recorded
          </Text>
        </View>
      </ScrollView>

      <View className="px-4 pb-6 pt-2">
        <Pressable
          onPress={onContinue}
          className="h-[56px] items-center justify-center rounded-[14px] bg-[#9810FA]"
        >
          <Text className="text-[14px] font-semibold uppercase text-white">
            Continue Journey
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

export default EmergencyDropSummaryScreen;
