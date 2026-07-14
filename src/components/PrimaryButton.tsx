import { ActivityIndicator, Pressable, Text } from 'react-native';
import { fs, s, vs } from '../theme/responsive';

interface PrimaryButtonProps {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  /** Extra NativeWind classes for spacing/layout at the call site. */
  className?: string;
}

/**
 * The teal call-to-action button used across the driver app (Send OTP, Login,
 * Continue, Save …). Matches the Figma design: full-width, ~56dp tall, 16dp
 * radius, teal `#0097B3`, white Poppins-SemiBold label. Sizes scale via the
 * responsive helpers so it looks right on any device.
 */
export function PrimaryButton({
  label,
  onPress,
  disabled,
  loading,
  className = '',
}: PrimaryButtonProps) {
  const inactive = disabled || loading;
  return (
    <Pressable
      onPress={onPress}
      disabled={inactive}
      style={{ height: vs(54), borderRadius: s(16), opacity: inactive ? 0.6 : 1 }}
      className={`w-full flex-row items-center justify-center bg-brand-teal ${className}`}
    >
      {loading ? (
        <ActivityIndicator color="#FFFFFF" />
      ) : (
        <Text
          style={{ fontSize: fs(17) }}
          className="font-poppins-semibold text-white"
        >
          {label}
        </Text>
      )}
    </Pressable>
  );
}

export default PrimaryButton;
