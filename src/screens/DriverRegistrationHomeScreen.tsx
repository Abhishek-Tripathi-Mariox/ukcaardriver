import { Image, StatusBar, Text, View } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { logoUkcaar } from '../assets/images';
import LanguageBar from '../components/LanguageBar';
import LogoutButton from '../components/LogoutButton';
import { PrimaryButton } from '../components/PrimaryButton';
import { fs, s, vs } from '../theme/responsive';

interface DriverRegistrationHomeScreenProps {
  onRegisterVehicle: () => void;
  onOpenLanguage: () => void;
  onLogout: () => void;
  currentStep?: number;
  totalSteps?: number;
}

export function DriverRegistrationHomeScreen({
  onRegisterVehicle,
  onOpenLanguage,
  onLogout,
  currentStep = 1,
  totalSteps = 6,
}: DriverRegistrationHomeScreenProps) {
  const progressPct = `${(currentStep / totalSteps) * 100}%` as const;

  return (
    <View className="flex-1 bg-white">
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      <LinearGradient
        colors={['#0097B3', '#00C896']}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
      >
        <SafeAreaView edges={['top']}>
          {/* Language + Logout share one padded row. LanguageBar is now
              layout-neutral (see LanguageBar.tsx), so the padding lives here
              and lines up with the title block below — the pill used to sit
              jammed into the top-right corner under the status bar. */}
          <View
            className="flex-row items-center justify-end"
            style={{ paddingHorizontal: s(20), paddingTop: vs(10), gap: s(12) }}
          >
            <LanguageBar onPress={onOpenLanguage} tint="light" />
            <LogoutButton onLoggedOut={onLogout} tint="light" />
          </View>
          <View style={{ paddingHorizontal: s(20), paddingBottom: vs(18), paddingTop: vs(12) }}>
            <Text
              className="font-poppins-bold text-white"
              style={{ fontSize: fs(23), lineHeight: fs(27) }}
            >
              Driver Registration
            </Text>
            <Text
              className="font-poppins text-white/90"
              style={{ marginTop: 0, fontSize: fs(13), lineHeight: fs(16) }}
            >
              Step {currentStep} of {totalSteps}
            </Text>
            <View
              className="w-full overflow-hidden rounded-full bg-white/30"
              style={{ marginTop: vs(12), height: vs(6) }}
            >
              <View className="h-full rounded-full bg-white" style={{ width: progressPct }} />
            </View>
          </View>
        </SafeAreaView>
      </LinearGradient>

      <View className="flex-1 items-center" style={{ paddingHorizontal: s(24), paddingTop: vs(56) }}>
        <View
          className="overflow-hidden rounded-full bg-white shadow-md shadow-black/20"
          style={{ height: s(96), width: s(96) }}
        >
          <Image source={logoUkcaar} resizeMode="cover" className="h-full w-full" />
        </View>

        <Text
          className="text-center font-poppins-bold text-slate-800"
          style={{ marginTop: vs(36), fontSize: fs(24), lineHeight: fs(32), paddingHorizontal: s(16) }}
        >
          Welcome to UKCAAR Driver Portal!
        </Text>
        <Text
          className="text-center font-poppins text-slate-500"
          style={{ marginTop: vs(12), fontSize: fs(15), lineHeight: fs(24), paddingHorizontal: s(16) }}
        >
          Let's get your vehicle registered to start earning
        </Text>

        <PrimaryButton
          label="Register Vehicle"
          onPress={onRegisterVehicle}
          className="mt-10"
          labelClassName="font-poppins"
        />
      </View>
    </View>
  );
}

export default DriverRegistrationHomeScreen;
