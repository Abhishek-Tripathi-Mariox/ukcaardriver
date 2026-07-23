import { Pressable, StatusBar, Text, View } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  AlertCircleIcon,
  BackArrowIcon,
  CarIcon,
  ClipboardListIcon,
  HourglassIcon,
} from '../components/icons/ServiceTypeIcons';
import { fs, s, vs } from '../theme/responsive';

export type NotVerifiedStatus = 'none' | 'in-progress' | 'pending' | 'rejected';

interface NotVerifiedScreenProps {
  /** Where the driver's registration currently stands. */
  status: NotVerifiedStatus;
  /** Which feature the driver tried to open — shown in the title. */
  featureName?: string;
  /** Primary CTA: start/resume registration, view status, or fix documents. */
  onAction: () => void;
  onBack: () => void;
}

const COPY: Record<
  NotVerifiedStatus,
  { title: string; body: string; cta: string }
> = {
  none: {
    title: 'Register your vehicle first',
    body: 'This section unlocks once your vehicle is registered and approved. Registration takes about 10 minutes.',
    cta: 'Register Vehicle',
  },
  'in-progress': {
    title: 'Finish your registration',
    body: 'This section unlocks once your registration is complete and approved. Pick up where you left off.',
    cta: 'Continue Registration',
  },
  pending: {
    title: 'Verification in progress',
    body: 'Our team is reviewing your documents. This section unlocks as soon as your account is approved — usually within 24 hours.',
    cta: 'View Status',
  },
  rejected: {
    title: 'Action needed on your documents',
    body: 'One or more documents were rejected. Re-upload them from your profile to get back into the review queue.',
    cta: 'Fix Documents',
  },
};

/**
 * Friendly gate shown in place of money/work screens (Wallet, Earnings,
 * OnePass, Journeys…) while the driver isn't approved yet.
 *
 * Before this, those screens rendered normally and their API calls failed
 * with raw "Insufficient permissions" errors — worse, the wallet actually
 * LET an unverified driver load money.
 */
export function NotVerifiedScreen({
  status,
  featureName,
  onAction,
  onBack,
}: NotVerifiedScreenProps) {
  const copy = COPY[status];
  const Icon =
    status === 'rejected'
      ? AlertCircleIcon
      : status === 'pending'
      ? HourglassIcon
      : status === 'in-progress'
      ? ClipboardListIcon
      : CarIcon;

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
            className="flex-row items-center"
          >
            <Pressable onPress={onBack} hitSlop={12} accessibilityLabel="Back to home">
              <BackArrowIcon size={s(20)} color="#FFFFFF" />
            </Pressable>
            <Text
              style={{ fontSize: fs(19), marginLeft: s(12) }}
              className="font-poppins-semibold text-white"
            >
              {featureName ?? 'Locked'}
            </Text>
          </View>
        </SafeAreaView>
      </LinearGradient>

      <View
        style={{ paddingHorizontal: s(28), paddingTop: vs(64) }}
        className="flex-1 items-center"
      >
        <View
          style={{ height: s(112), width: s(112), borderRadius: s(56) }}
          className="items-center justify-center bg-brand-teal/10"
        >
          <Icon size={s(52)} color="#0097B3" />
        </View>

        <Text
          style={{ fontSize: fs(20), marginTop: vs(24), textAlign: 'center' }}
          className="font-poppins-semibold text-slate-800"
        >
          {copy.title}
        </Text>
        <Text
          style={{
            fontSize: fs(13.5),
            lineHeight: fs(21),
            marginTop: vs(10),
            textAlign: 'center',
          }}
          className="font-poppins text-slate-500"
        >
          {copy.body}
        </Text>

        <Pressable
          onPress={onAction}
          style={{
            marginTop: vs(28),
            paddingVertical: vs(14),
            paddingHorizontal: s(32),
            borderRadius: s(14),
          }}
          className="items-center bg-brand-teal"
        >
          <Text style={{ fontSize: fs(15) }} className="font-poppins-semibold text-white">
            {copy.cta}
          </Text>
        </Pressable>

        <Pressable onPress={onBack} style={{ marginTop: vs(14), paddingVertical: vs(8) }}>
          <Text style={{ fontSize: fs(13) }} className="font-poppins text-slate-500">
            Back to Home
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

export default NotVerifiedScreen;
