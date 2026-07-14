import { Pressable, StatusBar, Text, View } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import LogoutButton from '../components/LogoutButton';

interface AccountRejectedScreenProps {
  driverName?: string;
  rejectionReason?: string;
  onReupload: () => void;
  onContactSupport: () => void;
  onLogout: () => void;
}

export function AccountRejectedScreen({
  driverName = 'Ravi',
  rejectionReason = 'Your driving license image was unclear.',
  onReupload,
  onContactSupport,
  onLogout,
}: AccountRejectedScreenProps) {
  return (
    <View className="flex-1 bg-[#F5F3F8]">
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      <LinearGradient
        colors={['#0097B3', '#00C896']}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
      >
        <SafeAreaView edges={['top']}>
          <View className="flex-row items-center justify-between px-4 py-5">
            <View className="w-16" />
            <Text className="flex-1 text-center text-[20px] font-poppins-semibold text-white">
              Account Rejected
            </Text>
            <View className="w-16 items-end">
              <LogoutButton onLoggedOut={onLogout} tint="light" />
            </View>
          </View>
        </SafeAreaView>
      </LinearGradient>

      <View className="flex-1 px-6 pt-8">
        <Text className="text-center text-[24px] font-poppins-semibold text-slate-800">
          Hello, {driverName}
        </Text>
        <Text className="mt-4 text-center text-sm leading-6 text-slate-500">
          Unfortunately, your verification was not approved.{'\n'}
          Please review and re-upload the required documents{'\n'}
          to complete your registration.
        </Text>

        <View className="flex-1" />

        <View className="rounded-2xl bg-[#E7EEF5] p-4">
          <Text className="text-sm font-poppins-semibold text-slate-800">
            Rejection Reason:
          </Text>
          <Text className="mt-1 text-sm text-slate-600">{rejectionReason}</Text>
        </View>

        <Pressable
          onPress={onReupload}
          className="mt-5 h-12 items-center justify-center rounded-2xl bg-brand-teal"
        >
          <Text className="text-sm font-poppins-medium text-white">Re-upload Documents</Text>
        </Pressable>

        <Pressable
          onPress={onContactSupport}
          className="mt-3 h-12 items-center justify-center rounded-2xl border border-slate-300 bg-white"
        >
          <Text className="text-sm font-poppins-medium text-slate-700">Contact Support</Text>
        </Pressable>

        <Text className="mb-6 mt-4 text-center text-xs text-slate-500">
          Once approved, you'll receive a notification and{'\n'}can access your dashboard
        </Text>
      </View>
    </View>
  );
}

export default AccountRejectedScreen;
