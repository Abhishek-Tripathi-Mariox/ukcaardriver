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
import { IconPhone, logoUkcaar } from '../assets/images';
import { sendOtp, ApiError } from '../services/api';

interface LoginScreenProps {
  onSendOtp: (mobile: string) => void;
}

export function LoginScreen({
  onSendOtp,
}: LoginScreenProps) {
  const [mobile, setMobile] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const canSubmit = mobile.length === 10 && !submitting;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setError(null);
    setSubmitting(true);
    try {
      await sendOtp(mobile);
      onSendOtp(mobile);
    } catch (err: any) {
      console.warn('[sendOtp] failed:', err);
      const message =
        (err && err.message) ||
        'Could not send OTP. Check your connection and try again.';
      setError(message);
    } finally {
      setSubmitting(false);
    }
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
          <View className="mt-2 items-center">
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
              <TextInput
                value={mobile}
                onChangeText={text => {
                  setMobile(text.replace(/\D/g, '').slice(0, 10));
                  if (error) setError(null);
                }}
                placeholder="Enter 10 digit mobile number"
                placeholderTextColor="#717182"
                keyboardType="number-pad"
                maxLength={10}
                editable={!submitting}
                className="h-12 rounded-2xl border border-slate-200 bg-[#F3F3F5] pl-12 pr-3 text-base text-slate-900"
              />
            </View>

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
                <Text className="text-sm font-medium text-white">Send OTP</Text>
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

export default LoginScreen;
