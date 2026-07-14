import React, { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StatusBar, Text, TextInput, View } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BackArrowIcon } from '../components/icons/ServiceTypeIcons';
import { QrScanner } from '../components/QrScanner';
import { verifyJourneyQr } from '../services/api';
import { fs, s, vs } from '../theme/responsive';

interface QRVerificationScreenProps {
  journeyKey?: string | null;
  journeyId?: string;
  onBack?: () => void;
  /** Called once a ticket is successfully verified + boarded, with the
   *  boarded passenger so the confirmation screen shows real details. */
  onVerified?: (passenger?: { name?: string; seat?: string }) => void;
}

/**
 * Catches a missing/unbuilt vision-camera native module so the screen falls
 * back to manual ticket entry instead of red-screening the whole app.
 */
class ScannerBoundary extends React.Component<
  { onFail: () => void; children: React.ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch() {
    this.props.onFail();
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

export function QRVerificationScreen({
  journeyKey,
  journeyId = 'SCH001',
  onBack,
  onVerified,
}: QRVerificationScreenProps) {
  const [mode, setMode] = useState<'camera' | 'manual'>('camera');
  const [code, setCode] = useState('');
  const [verifying, setVerifying] = useState(false);

  const verify = async (value: string) => {
    const v = value.trim();
    if (!v) {
      Alert.alert('Enter a ticket code', 'Type the ticket reference from the rider’s ticket.');
      return;
    }
    if (!journeyKey || verifying) return;
    setVerifying(true);
    try {
      const res = await verifyJourneyQr(journeyKey, v);
      if (res.valid) {
        const pax = res.passenger;
        const who = pax?.name ? `${pax.name} ` : '';
        const seatStr = Array.isArray(pax?.boardedSeats) && pax.boardedSeats.length
          ? pax.boardedSeats.join(', ')
          : Array.isArray(pax?.seats)
            ? pax.seats.join(', ')
            : undefined;
        Alert.alert('Ticket verified', `${who}has been boarded.`, [
          { text: 'Scan next', onPress: () => setCode('') },
          { text: 'Done', onPress: () => onVerified?.({ name: pax?.name, seat: seatStr }) },
        ]);
      } else {
        Alert.alert('Invalid ticket', res.message ?? 'This ticket is not valid for this journey.');
      }
    } finally {
      setVerifying(false);
    }
  };

  return (
    <View className="flex-1 bg-[#0B0B0F]">
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      <LinearGradient colors={['#AD46FF', '#9810FA']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
        <SafeAreaView edges={['top']}>
          <View
            className="flex-row items-center"
            style={{ paddingHorizontal: s(24), paddingBottom: vs(16), paddingTop: vs(8), gap: s(16) }}
          >
            <Pressable onPress={onBack} hitSlop={10}>
              <BackArrowIcon size={s(22)} color="white" />
            </Pressable>
            <View className="flex-1">
              <Text
                className="font-poppins-semibold text-white"
                style={{ fontSize: fs(20), lineHeight: fs(28) }}
              >
                QR Verification
              </Text>
              <Text
                className="text-white/80 font-poppins-regular"
                style={{ fontSize: fs(14) }}
              >
                Journey ID: {journeyId}
              </Text>
            </View>
          </View>
        </SafeAreaView>
      </LinearGradient>

      {mode === 'camera' ? (
        <View className="flex-1">
          {/* Live camera fills the area; pause while a verify is in flight. */}
          <ScannerBoundary onFail={() => setMode('manual')}>
            <QrScanner active={!verifying} onScanned={verify} />
          </ScannerBoundary>

          {/* Aiming frame overlay */}
          <View pointerEvents="none" className="absolute inset-0 items-center justify-center">
            <View
              className="border-[3px] border-white/90"
              style={{ width: s(240), height: s(240), borderRadius: s(40) }}
            />
          </View>

          <View
            className="absolute left-0 right-0 items-center"
            style={{ top: vs(12) }}
            pointerEvents="none"
          >
            <View
              className="rounded-full bg-black/60"
              style={{ paddingHorizontal: s(16), paddingVertical: vs(8) }}
            >
              <Text
                className="font-poppins-medium text-white"
                style={{ fontSize: fs(13) }}
              >
                {verifying ? 'Verifying…' : 'Point the camera at the rider’s ticket QR'}
              </Text>
            </View>
          </View>

          <View className="absolute bottom-0 left-0 right-0" style={{ paddingHorizontal: s(16), paddingBottom: vs(24) }}>
            <Pressable
              onPress={() => setMode('manual')}
              className="items-center justify-center bg-white/15"
              style={{ height: s(48), borderRadius: s(16) }}
            >
              <Text
                className="font-poppins-medium text-white"
                style={{ fontSize: fs(14) }}
              >
                Enter code manually
              </Text>
            </Pressable>
          </View>
        </View>
      ) : (
        <View className="flex-1 bg-[#F9FAFB]" style={{ paddingHorizontal: s(24), paddingTop: vs(40) }}>
          <View className="border border-[#E5E7EB] bg-white" style={{ borderRadius: s(16), padding: s(20) }}>
            <Text
              className="font-poppins-semibold text-[#1E293B]"
              style={{ fontSize: fs(14), marginBottom: vs(8) }}
            >
              Ticket reference
            </Text>
            <TextInput
              value={code}
              onChangeText={setCode}
              placeholder="e.g. A1B2C3D4"
              placeholderTextColor="#B0B0B0"
              autoCapitalize="characters"
              autoCorrect={false}
              className="border border-[#E5E7EB] bg-white text-[#1E293B]"
              style={{
                borderRadius: s(16),
                paddingHorizontal: s(16),
                paddingVertical: vs(12),
                fontSize: fs(15),
              }}
            />
            <Pressable
              onPress={() => verify(code)}
              disabled={verifying}
              className="items-center justify-center bg-[#9810FA]"
              style={[
                { marginTop: vs(16), height: s(50), borderRadius: s(16) },
                verifying ? { opacity: 0.6 } : undefined,
              ]}
            >
              {verifying ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text
                  className="font-poppins-medium uppercase text-white"
                  style={{ fontSize: fs(15) }}
                >
                  Verify & Board
                </Text>
              )}
            </Pressable>
          </View>

          <Pressable
            onPress={() => setMode('camera')}
            className="items-center"
            style={{ marginTop: vs(16), paddingVertical: vs(8) }}
          >
            <Text
              className="font-poppins-medium text-[#9810FA]"
              style={{ fontSize: fs(14) }}
            >
              Scan with camera instead
            </Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

export default QRVerificationScreen;
