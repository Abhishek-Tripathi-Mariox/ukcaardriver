import React, { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StatusBar, Text, TextInput, View } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BackArrowIcon } from '../components/icons/ServiceTypeIcons';
import { QrScanner } from '../components/QrScanner';
import { verifyJourneyQr } from '../services/api';

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
      <StatusBar barStyle="light-content" />

      <LinearGradient colors={['#AD46FF', '#9810FA']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
        <SafeAreaView edges={['top']}>
          <View className="flex-row items-center gap-4 px-6 pb-4 pt-2">
            <Pressable onPress={onBack} hitSlop={10}>
              <BackArrowIcon size={22} color="white" />
            </Pressable>
            <View className="flex-1">
              <Text className="text-[20px] font-semibold text-white">QR Verification</Text>
              <Text className="text-[14px] text-white/80">Journey ID: {journeyId}</Text>
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
            <View className="h-[240px] w-[240px] rounded-[40px] border-[3px] border-white/90" />
          </View>

          <View className="absolute left-0 right-0 top-3 items-center" pointerEvents="none">
            <View className="rounded-full bg-black/60 px-4 py-2">
              <Text className="text-[13px] font-medium text-white">
                {verifying ? 'Verifying…' : 'Point the camera at the rider’s ticket QR'}
              </Text>
            </View>
          </View>

          <View className="absolute bottom-0 left-0 right-0 px-4 pb-6">
            <Pressable
              onPress={() => setMode('manual')}
              className="h-[48px] items-center justify-center rounded-2xl bg-white/15"
            >
              <Text className="text-[14px] font-medium text-white">Enter code manually</Text>
            </Pressable>
          </View>
        </View>
      ) : (
        <View className="flex-1 bg-[#F9FAFB] px-6 pt-10">
          <View className="rounded-2xl border border-[#E5E7EB] bg-white p-5">
            <Text className="mb-2 text-[14px] font-semibold text-[#1E293B]">Ticket reference</Text>
            <TextInput
              value={code}
              onChangeText={setCode}
              placeholder="e.g. A1B2C3D4"
              placeholderTextColor="#B0B0B0"
              autoCapitalize="characters"
              autoCorrect={false}
              className="rounded-2xl border border-[#E5E7EB] bg-white px-4 py-3 text-[15px] text-[#1E293B]"
            />
            <Pressable
              onPress={() => verify(code)}
              disabled={verifying}
              className="mt-4 h-[50px] items-center justify-center rounded-2xl bg-[#9810FA]"
              style={verifying ? { opacity: 0.6 } : undefined}
            >
              {verifying ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text className="text-[15px] font-medium uppercase text-white">Verify & Board</Text>
              )}
            </Pressable>
          </View>

          <Pressable onPress={() => setMode('camera')} className="mt-4 items-center py-2">
            <Text className="text-[14px] font-medium text-[#9810FA]">Scan with camera instead</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

export default QRVerificationScreen;
