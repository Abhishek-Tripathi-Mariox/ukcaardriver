import { Pressable, Text, View } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BackArrowIcon } from './icons/ServiceTypeIcons';
import LogoutButton from './LogoutButton';
import { fs, s, vs } from '../theme/responsive';

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
        <View style={{ paddingHorizontal: s(20), paddingTop: vs(18), paddingBottom: vs(16) }}>
          <View className="flex-row items-center" style={{ gap: s(14) }}>
            {onBack ? (
              <Pressable onPress={onBack} hitSlop={12}>
                <BackArrowIcon size={s(24)} color="white" />
              </Pressable>
            ) : null}
            <View className="flex-1">
              {/* lineHeight pinned on both lines: RN's default line box on
                  Poppins-Bold @ fs(23) is what created the dead space under
                  the title — a margin tweak alone can't remove it. */}
              <Text
                className="font-poppins-bold text-white"
                style={{ fontSize: fs(23), lineHeight: fs(27) }}
              >
                {title}
              </Text>
              <Text
                className="font-poppins text-white/90"
                style={{ marginTop: 0, fontSize: fs(13), lineHeight: fs(16) }}
              >
                Step {currentStep} of {totalSteps}
              </Text>
            </View>
            {onLogout ? (
              <LogoutButton onLoggedOut={onLogout} tint="light" />
            ) : null}
          </View>
          <View
            className="w-full overflow-hidden rounded-full bg-white/30"
            style={{ marginTop: vs(12), height: vs(6) }}
          >
            <View className="h-full rounded-full bg-white" style={{ width: progressPct }} />
          </View>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

export default RegistrationHeader;
