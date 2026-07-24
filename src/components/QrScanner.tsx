import React, { useEffect, useRef } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import {
  Camera,
  useCameraDevice,
  useCameraPermission,
  useCodeScanner,
} from 'react-native-vision-camera';

interface QrScannerProps {
  /** Only scans while active (lets the parent pause it after a hit). */
  active: boolean;
  onScanned: (value: string) => void;
}

/**
 * Live QR scanner backed by react-native-vision-camera's built-in code
 * scanner. Renders inside an error boundary in QRVerificationScreen so a
 * missing/unbuilt native module degrades to manual entry instead of crashing.
 */
export function QrScanner({ active, onScanned }: QrScannerProps) {
  const device = useCameraDevice('back');
  const { hasPermission, requestPermission } = useCameraPermission();
  // One scan per activation — avoids firing verify a dozen times for one code.
  const lock = useRef(false);

  useEffect(() => {
    if (!hasPermission) requestPermission();
  }, [hasPermission, requestPermission]);

  useEffect(() => {
    if (active) lock.current = false;
  }, [active]);

  const codeScanner = useCodeScanner({
    codeTypes: ['qr'],
    onCodeScanned: (codes) => {
      if (lock.current || !active) return;
      const value = codes.find((c) => !!c.value)?.value;
      if (!value) return;
      lock.current = true;
      onScanned(value);
    },
  });

  if (!hasPermission) {
    return (
      <View style={styles.fallback}>
        <Text style={styles.fallbackText}>Camera permission is required to scan tickets.</Text>
        <Pressable onPress={() => Linking.openSettings()} style={styles.fallbackBtn}>
          <Text style={styles.fallbackBtnText}>Open Settings</Text>
        </Pressable>
      </View>
    );
  }

  if (!device) {
    return (
      <View style={styles.fallback}>
        <Text style={styles.fallbackText}>No camera available on this device.</Text>
      </View>
    );
  }

  return (
    <Camera
      style={StyleSheet.absoluteFill}
      device={device}
      isActive={active}
      codeScanner={codeScanner}
    />
  );
}

const styles = StyleSheet.create({
  fallback: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 },
  fallbackText: { color: '#1E293B', textAlign: 'center', fontSize: 14, marginBottom: 12 },
  fallbackBtn: { backgroundColor: '#9810FA', borderRadius: 10, paddingHorizontal: 18, paddingVertical: 10 },
  fallbackBtnText: { color: '#fff', fontFamily: 'Poppins-Medium' },
});

export default QrScanner;
