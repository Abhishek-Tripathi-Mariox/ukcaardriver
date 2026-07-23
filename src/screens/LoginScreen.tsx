import { useState } from 'react';
import {
  Image,
  Keyboard,
  StatusBar,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { IconPhone, logoUkcaar } from '../assets/images';
import { sendOtp } from '../services/api';
import { PrimaryButton } from '../components/PrimaryButton';
import { fs, s, vs } from '../theme/responsive';

interface LoginScreenProps {
  onSendOtp: (mobile: string) => void;
  /** "New Driver? Register Now" tap — optional (renders the link regardless). */
  onRegister?: () => void;
}

export function LoginScreen({ onSendOtp, onRegister }: LoginScreenProps) {
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
      setError(
        (err && err.message) ||
          'Could not send OTP. Check your connection and try again.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <View className="flex-1 bg-white">
        <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
        {/* Full teal→green gradient header with a rounded bottom; the white
            card overlaps its lower edge (matches Figma). */}
        <LinearGradient
          colors={['#0097B3', '#00C896']}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={{ height: vs(452), borderBottomLeftRadius: s(28), borderBottomRightRadius: s(28) }}
          className="absolute left-0 right-0 top-0"
        />

        <SafeAreaView edges={['top']} className="flex-1">
          <View className="items-center" style={{ marginTop: vs(56) }}>
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
            style={{ marginHorizontal: s(20), marginTop: vs(40), padding: s(22) }}
          >
            <Text
              className="font-poppins-medium text-slate-800"
              style={{ marginBottom: vs(8), fontSize: fs(14) }}
            >
              Mobile Number
            </Text>
            <View className="relative justify-center">
              <View className="absolute left-3 z-10">
                <IconPhone width={s(20)} height={s(20)} />
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
                className="rounded-2xl border border-slate-200 bg-[#F3F3F5] font-poppins text-slate-900"
                style={{ height: vs(50), paddingLeft: s(44), paddingRight: s(12), fontSize: fs(15) }}
              />
            </View>

            {error && (
              <Text className="font-poppins text-red-600" style={{ marginTop: vs(8), fontSize: fs(12) }}>
                {error}
              </Text>
            )}

            <PrimaryButton
              label="Send OTP"
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
            style={{ marginBottom: vs(28), fontSize: fs(12) }}
          >
            By continuing, you agree to our Terms & Conditions
          </Text>
        </SafeAreaView>
      </View>
    </TouchableWithoutFeedback>
  );
}

export default LoginScreen;
