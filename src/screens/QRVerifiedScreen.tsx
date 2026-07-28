import { Pressable, StatusBar, Text, View } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  BackArrowIcon,
  BigCheckIcon,
} from '../components/icons/ServiceTypeIcons';

interface QRVerifiedScreenProps {
  passengerName?: string;
  seat?: string;
  onBack?: () => void;
  onNext?: () => void;
}

export function QRVerifiedScreen({
  passengerName = 'Passenger',
  seat = '—',
  onBack,
  onNext,
}: QRVerifiedScreenProps) {
  const insets = useSafeAreaInsets();
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
              QR Verified
            </Text>
          </View>
        </SafeAreaView>
      </LinearGradient>

      <View className="flex-1 items-center justify-center px-6">
        <View className="h-[140px] w-[140px] items-center justify-center rounded-full bg-[#00C896]">
          <BigCheckIcon size={80} color="white" />
        </View>
        <Text className="mt-6 text-[24px] font-poppins-semibold text-[#00A63E]">
          Passenger Verified
        </Text>
        <Text className="mt-4 text-[20px] font-poppins-medium text-[#1E293B]">
          {passengerName}
        </Text>
        <Text className="mt-1 text-[14px] text-[#6A7282]">Seat: {seat}</Text>
      </View>

      {/* Edge-to-edge (SDK 36): keep the CTA above the system nav bar. */}
      <View className="px-4 pt-2" style={{ paddingBottom: Math.max(insets.bottom, 12) + 12 }}>
        <Pressable
          onPress={onNext}
          className="h-[50px] items-center justify-center rounded-2xl bg-[#9810FA]"
        >
          <Text className="text-[15px] font-poppins-medium uppercase text-white">
            Next
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

export default QRVerifiedScreen;
