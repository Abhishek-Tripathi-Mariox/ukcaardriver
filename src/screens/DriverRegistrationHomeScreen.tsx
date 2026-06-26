import { Image, Pressable, StatusBar, Text, View } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { logoUkcaar } from '../assets/images';
import LanguageBar from '../components/LanguageBar';
import LogoutButton from '../components/LogoutButton';

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
      <StatusBar barStyle="light-content" backgroundColor="#0097B3" translucent />
      <LinearGradient
        colors={['#0097B3', '#00C896']}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
      >
        <SafeAreaView edges={['top']}>
          <View className="flex-row items-center justify-between px-4">
            <LanguageBar onPress={onOpenLanguage} tint="light" />
            <LogoutButton onLoggedOut={onLogout} tint="light" />
          </View>
          <View className="px-6 pb-5 pt-1">
            <View className="flex-row items-center justify-between">
              <Text className="text-[20px] font-semibold text-white">
                Driver Registration
              </Text>
            </View>
            <Text className="mt-1 text-sm text-white/80">
              Step {currentStep} of {totalSteps}
            </Text>
            <View className="mt-3 h-2 w-full overflow-hidden rounded-full bg-white/30">
              <View
                className="h-full bg-white"
                style={{ width: progressPct }}
              />
            </View>
          </View>
        </SafeAreaView>
      </LinearGradient>

      <View className="flex-1 items-center px-6 pt-14">
        <View className="h-24 w-24 overflow-hidden rounded-full bg-white shadow-md shadow-black/20">
          <Image
            source={logoUkcaar}
            resizeMode="cover"
            className="h-full w-full"
          />
        </View>

        <Text className="mt-9 px-4 text-center text-[24px] font-semibold leading-8 text-slate-800">
          Welcome to UKCAAR Driver Portal!
        </Text>
        <Text className="mt-3 px-4 text-center text-base leading-6 text-slate-500">
          Let's get your vehicle registered to start earning
        </Text>

        <Pressable
          onPress={onRegisterVehicle}
          className="mt-10 h-12 w-full items-center justify-center rounded-2xl bg-brand-teal shadow-md"
        >
          <Text className="text-sm font-medium text-white">Register Vehicle</Text>
        </Pressable>
      </View>
    </View>
  );
}

export default DriverRegistrationHomeScreen;
