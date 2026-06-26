import {
  Image,
  StatusBar,
  Text,
  View,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { illustrationPendingApproval } from '../assets/images';
import { ClockSmallIcon } from '../components/icons/ServiceTypeIcons';
import LogoutButton from '../components/LogoutButton';

interface RegistrationPendingScreenProps {
  driverName?: string;
  onLogout: () => void;
}

export function RegistrationPendingScreen({
  driverName,
  onLogout,
}: RegistrationPendingScreenProps) {
  // Fall back to a neutral greeting if /auth/me hasn't returned a name yet —
  // better than showing a placeholder that looks like real data.
  const greetingName = driverName?.trim() || 'Driver';
  return (
    <View className="flex-1 bg-[#F5F3F8]">
      <StatusBar barStyle="light-content" backgroundColor="#0097B3" translucent />
      <LinearGradient
        colors={['#0097B3', '#00C896']}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
      >
        <SafeAreaView edges={['top']}>
          <View className="flex-row items-center justify-between px-4 py-5">
            <View className="w-16" />
            <Text className="flex-1 text-center text-[20px] font-semibold text-white">
              Registration Pending Approval
            </Text>
            <View className="w-16 items-end">
              <LogoutButton onLoggedOut={onLogout} tint="light" />
            </View>
          </View>
        </SafeAreaView>
      </LinearGradient>

      <View className="flex-1 items-center px-6 pt-10">
        <Text className="text-[24px] font-semibold text-slate-800">
          Thank You, {greetingName}
        </Text>

        <View className="mt-6 h-56 w-64">
          <Image
            source={illustrationPendingApproval}
            resizeMode="contain"
            className="h-full w-full"
          />
        </View>

        <Text className="mt-6 text-center text-sm leading-6 text-slate-500">
          Your <Text className="font-semibold text-slate-700">documents</Text> have
          been successfully submitted.{'\n'}
          Our verification team is reviewing your details.{'\n'}
          You will be notified once your account is approved.
        </Text>

        <View className="mt-6 w-full flex-row items-center justify-between rounded-2xl bg-brand-teal/10 px-4 py-3">
          <View className="flex-row items-center gap-2">
            <ClockSmallIcon size={18} color="#464646" />
            <View>
              <Text className="text-sm text-slate-700">
                Estimated verification time:
              </Text>
              <Text className="text-sm text-slate-700">Within 24 hours</Text>
            </View>
          </View>
          <View className="rounded-lg bg-[#FFFDE3] px-3 py-1.5">
            <Text className="text-xs font-medium text-slate-700">
              UNDER REVIEW
            </Text>
          </View>
        </View>

        <Text className="mt-6 text-center text-xs text-slate-500">
          Once approved, you'll receive a notification and be taken to your
          dashboard automatically.
        </Text>
      </View>
    </View>
  );
}

export default RegistrationPendingScreen;
