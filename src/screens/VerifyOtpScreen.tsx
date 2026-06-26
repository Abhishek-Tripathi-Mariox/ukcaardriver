import { useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Keyboard,
  Pressable,
  StatusBar,
  Text,
  TextInput,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  IconArrowBack,
  IconLock,
  IconPhone,
  logoUkcaar,
} from '../assets/images';
import { ApiError, ApiUser, verifyOtp } from '../services/api';

interface VerifyOtpScreenProps {
  mobile: string;
  onBack: () => void;
  onVerified: (user: ApiUser) => void;
}

export function VerifyOtpScreen({
  mobile,
  onBack,
  onVerified,
}: VerifyOtpScreenProps) {
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
        // 2xx but malformed body — make this loud so we don't claim
        // "wrong OTP" when the server actually accepted it.
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
    // Only navigate after the try/catch unwinds, so a downstream throw
    // (router, store, etc.) doesn't get swallowed as an OTP failure.
    onVerified(user);
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <View className="flex-1 bg-white">
        <StatusBar barStyle="light-content" backgroundColor="#0097B3" translucent />
        <LinearGradient
          colors={['#0097B3', '#00C896']}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          className="absolute left-0 right-0 top-0 h-[276px] rounded-b-3xl"
        />
        <SafeAreaView edges={['top']} className="flex-1">
          <View className="flex-row items-center justify-between px-4 pt-2">
            <Pressable onPress={onBack} hitSlop={12} className="p-2">
              <IconArrowBack width={20} height={20} color="#FFFFFF" />
            </Pressable>
          </View>

          <View className="items-center">
            <View className="h-24 w-24 overflow-hidden rounded-full bg-white">
              <Image
                source={logoUkcaar}
                resizeMode="cover"
                className="h-full w-full"
              />
            </View>
            <Text className="mt-5 text-[30px] font-semibold text-white">
              Welcome Driver 👋
            </Text>
          </View>

          <View className="mx-6 mt-6 rounded-2xl bg-white p-6 shadow-lg shadow-black/10">
            <Text className="mb-2 text-sm font-medium text-slate-800">
              Mobile Number
            </Text>
            <View className="relative">
              <View className="absolute left-3 top-0 bottom-0 z-10 justify-center">
                <IconPhone width={20} height={20} />
              </View>
              <View className="h-12 justify-center rounded-2xl border border-slate-200 bg-[#E8F0FE] pl-12 pr-3">
                <Text className="text-base text-slate-600">{mobile}</Text>
              </View>
            </View>

            <Text className="mt-5 mb-2 text-sm font-medium text-slate-800">
              Enter OTP
            </Text>
            <View className="relative">
              <View className="absolute left-3 top-0 bottom-0 z-10 justify-center">
                <IconLock width={20} height={20} />
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
                className="h-12 rounded-2xl border border-slate-200 bg-[#F3F3F5] pl-12 pr-3 text-base text-slate-900"
              />
            </View>
            <Text className="mt-2 text-xs text-slate-500">
              OTP sent to {mobile}
            </Text>

            {error && (
              <Text className="mt-2 text-xs text-red-600">{error}</Text>
            )}

            <Pressable
              disabled={!canSubmit}
              onPress={handleSubmit}
              className={`mt-5 h-12 flex-row items-center justify-center rounded-2xl shadow-md ${
                canSubmit ? 'bg-brand-teal' : 'bg-brand-teal/60'
              }`}
            >
              {submitting ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text className="text-sm font-medium text-white">Login</Text>
              )}
            </Pressable>
          </View>

          <View className="flex-1" />
          <Text className="mb-8 text-center text-xs text-slate-400">
            By continuing, you agree to our Terms & Conditions
          </Text>
        </SafeAreaView>
      </View>
    </TouchableWithoutFeedback>
  );
}

export default VerifyOtpScreen;
