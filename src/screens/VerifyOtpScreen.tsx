import { useState } from 'react';
import {
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StatusBar,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  IconArrowBack,
  IconLock,
  IconPhone,
  logoUkcaar,
} from '../assets/images';
import { ApiError, ApiUser, verifyOtp } from '../services/api';
import { PrimaryButton } from '../components/PrimaryButton';
import { fs, s, vs } from '../theme/responsive';

interface VerifyOtpScreenProps {
  mobile: string;
  onBack: () => void;
  onVerified: (user: ApiUser) => void;
  onRegister?: () => void;
}

export function VerifyOtpScreen({
  mobile,
  onBack,
  onVerified,
  onRegister,
}: VerifyOtpScreenProps) {
  const insets = useSafeAreaInsets();
  const [otp, setOtp] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const canSubmit = otp.length === 6 && !submitting;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setError(null);
    setSubmitting(true);
    let user: ApiUser | null = null;
    try {
      const res = await verifyOtp(mobile, otp);
      user = res?.data?.user ?? null;
      if (!user) {
        console.warn('[verifyOtp] 200 but no user in response:', res);
        setError('Server returned an unexpected response. Check backend logs.');
        return;
      }
    } catch (err) {
      console.warn('[verifyOtp] failed:', err);
      const message =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Could not verify OTP. Try again.';
      setError(message);
      return;
    } finally {
      setSubmitting(false);
    }
    onVerified(user);
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <View className="flex-1 bg-white">
        <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
        <LinearGradient
          colors={['#0097B3', '#00C896']}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={{ height: vs(452), borderBottomLeftRadius: s(28), borderBottomRightRadius: s(28) }}
          className="absolute left-0 right-0 top-0"
        />
        <SafeAreaView edges={['top']} className="flex-1">
        {/* Edge-to-edge + translucent status bar break Android's adjustResize,
            so without this the keyboard covered the OTP boxes. 'height' mode
            collapses the flex spacer below and slides the card up instead. */}
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View className="flex-row items-center" style={{ paddingHorizontal: s(16), paddingTop: vs(4) }}>
            <Pressable onPress={onBack} hitSlop={12} className="p-2">
              <IconArrowBack width={s(20)} height={s(20)} color="#FFFFFF" />
            </Pressable>
          </View>

          <View className="items-center" style={{ marginTop: vs(8) }}>
            <View
              className="overflow-hidden rounded-full bg-white"
              style={{ height: s(96), width: s(96) }}
            >
              <Image source={logoUkcaar} resizeMode="cover" className="h-full w-full" />
            </View>
            <Text
              className="font-poppins-bold text-white"
              style={{ marginTop: vs(18), fontSize: fs(30) }}
            >
              Welcome Driver
            </Text>
          </View>

          <View
            className="rounded-3xl bg-white shadow-lg shadow-black/10"
            style={{ marginHorizontal: s(20), marginTop: vs(32), padding: s(22) }}
          >
            <Text className="font-poppins-medium text-slate-800" style={{ marginBottom: vs(8), fontSize: fs(14) }}>
              Mobile Number
            </Text>
            <View className="relative justify-center">
              <View className="absolute left-3 z-10">
                <IconPhone width={s(20)} height={s(20)} />
              </View>
              <View
                className="justify-center rounded-2xl border border-slate-200 bg-[#E8F0FE]"
                style={{ height: vs(50), paddingLeft: s(44), paddingRight: s(12) }}
              >
                <Text
                  className="font-poppins text-slate-600"
                  style={{ fontSize: fs(15), includeFontPadding: false, textAlignVertical: 'center' }}
                >
                  {mobile}
                </Text>
              </View>
            </View>

            <Text className="font-poppins-medium text-slate-800" style={{ marginTop: vs(18), marginBottom: vs(8), fontSize: fs(14) }}>
              Enter OTP
            </Text>
            <View className="relative justify-center">
              <View className="absolute left-3 z-10">
                <IconLock width={s(20)} height={s(20)} />
              </View>
              <TextInput
                value={otp}
                onChangeText={text => {
                  setOtp(text.replace(/\D/g, '').slice(0, 6));
                  if (error) setError(null);
                }}
                placeholder="Enter 6 digit OTP"
                placeholderTextColor="#717182"
                keyboardType="number-pad"
                maxLength={6}
                editable={!submitting}
                textAlignVertical="center"
                className="rounded-2xl border border-slate-200 bg-[#F3F3F5] font-poppins text-slate-900"
                style={{
                  height: vs(50),
                  paddingLeft: s(44),
                  paddingRight: s(12),
                  paddingTop: 0,
                  paddingBottom: 0,
                  fontSize: fs(15),
                  includeFontPadding: false,
                  textAlignVertical: 'center',
                }}
              />
            </View>
            <Text className="font-poppins text-slate-500" style={{ marginTop: vs(8), fontSize: fs(12) }}>
              OTP sent to {mobile}
            </Text>

            {error && (
              <Text className="font-poppins text-red-600" style={{ marginTop: vs(8), fontSize: fs(12) }}>{error}</Text>
            )}

            <PrimaryButton
              label="Login"
              onPress={handleSubmit}
              disabled={!canSubmit}
              loading={submitting}
              className="mt-5"
            />

            {/* "New Driver? Register Now" removed — accounts are created by
                the OTP login itself; vehicle registration starts from the
                Home popup after sign-in. */}
          </View>

          <View className="flex-1" />
          <Text
            className="text-center font-poppins text-slate-400"
            // Edge-to-edge (SDK 36): keep the footer text above the nav bar.
            style={{ marginBottom: Math.max(insets.bottom, vs(16)) + vs(12), fontSize: fs(12) }}
          >
            By continuing, you agree to our Terms & Conditions
          </Text>
        </KeyboardAvoidingView>
        </SafeAreaView>
      </View>
    </TouchableWithoutFeedback>
  );
}

export default VerifyOtpScreen;
