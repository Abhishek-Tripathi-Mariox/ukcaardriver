import { Pressable, Text, View } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BackArrowIcon } from './icons/ServiceTypeIcons';
import LogoutButton from './LogoutButton';

interface RegistrationHeaderProps {
  currentStep: number;
  totalSteps?: number;
  onBack?: () => void;
  /** Optional logout handler — when provided, a Logout button is rendered top-right. */
  onLogout?: () => void;
  title?: string;
}

export function RegistrationHeader({
  currentStep,
  totalSteps = 6,
  onBack,
  onLogout,
  title = 'Driver Registration',
}: RegistrationHeaderProps) {
  const progressPct = `${(currentStep / totalSteps) * 100}%` as const;

  return (
    <LinearGradient
      colors={['#0097B3', '#00C896']}
      start={{ x: 0.5, y: 0 }}
      end={{ x: 0.5, y: 1 }}
    >
      <SafeAreaView edges={['top']}>
        <View className="px-6 pb-4 pt-4">
          <View className="flex-row items-center gap-4">
            {onBack ? (
              <Pressable onPress={onBack} hitSlop={12}>
                <BackArrowIcon size={24} color="white" />
              </Pressable>
            ) : null}
            <View className="flex-1">
              <Text className="text-[20px] font-semibold text-white">
                {title}
              </Text>
              <Text className="mt-0.5 text-sm text-white/80">
                Step {currentStep} of {totalSteps}
              </Text>
            </View>
            {onLogout ? (
              <LogoutButton onLoggedOut={onLogout} tint="light" />
            ) : null}
          </View>
          <View className="mt-3 h-2 w-full overflow-hidden rounded-full bg-white/30">
            <View className="h-full bg-white" style={{ width: progressPct }} />
          </View>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

export default RegistrationHeader;
