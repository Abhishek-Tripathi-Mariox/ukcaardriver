import {
  Pressable,
  StatusBar,
  Text,
  View,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ClockSmallIcon, HourglassIcon } from '../components/icons/ServiceTypeIcons';
import LogoutButton from '../components/LogoutButton';
import { fs, s, vs } from '../theme/responsive';

interface RegistrationPendingScreenProps {
  driverName?: string;
  onLogout: () => void;
  /** Back to Home — under-review drivers live on the dashboard now and open
   *  this screen from the waiting-approval banner. */
  onBack?: () => void;
}

export function RegistrationPendingScreen({
  driverName,
  onLogout,
  onBack,
}: RegistrationPendingScreenProps) {
  const greetingName = driverName?.trim() || 'Driver';
  return (
    <View className="flex-1 bg-[#F5F3F8]">
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      <LinearGradient
        colors={['#0097B3', '#00C896']}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
      >
        <SafeAreaView edges={['top']}>
          <View
            style={{ paddingHorizontal: s(16), paddingVertical: vs(16) }}
            className="flex-row items-center justify-between"
          >
            <View style={{ width: s(64) }}>
              {onBack && (
                <Pressable onPress={onBack} hitSlop={10} accessibilityLabel="Back to home">
                  <Text style={{ fontSize: fs(22) }} className="text-white">←</Text>
                </Pressable>
              )}
            </View>
            <Text
              style={{ fontSize: fs(20) }}
              className="flex-1 text-center font-poppins-semibold text-white"
            >
              Registration Pending Approval
            </Text>
            <View style={{ width: s(64) }} className="items-end">
              <LogoutButton onLoggedOut={onLogout} tint="light" />
            </View>
          </View>
        </SafeAreaView>
      </LinearGradient>

      <View
        style={{ paddingHorizontal: s(24), paddingTop: vs(36) }}
        className="flex-1 items-center"
      >
        <Text
          style={{ fontSize: fs(24) }}
          className="font-poppins-semibold text-slate-800"
        >
          Thank You, {greetingName}
        </Text>

        <View
          style={{ marginTop: vs(28), height: s(140), width: s(140), borderRadius: s(70) }}
          className="items-center justify-center bg-brand-teal/10"
        >
          <HourglassIcon size={s(64)} color="#0097B3" />
        </View>

        <Text
          style={{ marginTop: vs(24), fontSize: fs(14), lineHeight: fs(24) }}
          className="text-center font-poppins text-slate-500"
        >
          Your <Text className="font-poppins-semibold text-slate-700">documents</Text> have
          been successfully submitted.{'\n'}
          Our verification team is reviewing your details.{'\n'}
          You will be notified once your account is approved.
        </Text>

        <View
          style={{ marginTop: vs(24), paddingHorizontal: s(16), paddingVertical: vs(12), borderRadius: s(16) }}
          className="w-full flex-row items-center justify-between bg-brand-teal/10"
        >
          <View className="flex-row items-center" style={{ gap: s(8) }}>
            <ClockSmallIcon size={s(18)} color="#464646" />
            <View>
              <Text style={{ fontSize: fs(14) }} className="font-poppins text-slate-700">
                Estimated verification time:
              </Text>
              <Text style={{ fontSize: fs(14) }} className="font-poppins-medium text-slate-700">Within 24 hours</Text>
            </View>
          </View>
          <View
            style={{ paddingHorizontal: s(12), paddingVertical: vs(6), borderRadius: s(8) }}
            className="bg-[#FFFDE3]"
          >
            <Text style={{ fontSize: fs(12) }} className="font-poppins-medium text-slate-700">
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
