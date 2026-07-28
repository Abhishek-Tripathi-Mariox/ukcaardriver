import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Pressable,
  StatusBar,
  Text,
  TextInput,
  View,
} from 'react-native';
import Geolocation from '@react-native-community/geolocation';
import LinearGradient from 'react-native-linear-gradient';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import EmergencySosModal from '../components/EmergencySosModal';
import {
  BackArrowIcon,
  MapPinIcon,
  PhoneIcon,
  SOSAlertIcon,
} from '../components/icons/ServiceTypeIcons';
import { OsmMap, type LatLng, type RouteInfo } from '../components/OsmMap';
import { openGoogleMapsNavigation } from '../utils/navigation';
import { updateRideStatus, verifyRideOtp } from '../services/api';

interface VerifyRideOtpScreenProps {
  rideId?: string;
  passengerName?: string;
  pickup?: string;
  drop?: string;
  /** Pickup coordinates — used to render the live map (driver→pickup route)
   *  while the driver heads to collect the passenger. */
  pickupCoord?: LatLng | null;
  onBack?: () => void;
  onVerified?: () => void;
  onSos?: () => void;
}

export function VerifyRideOtpScreen({
  rideId,
  passengerName = 'Passenger',
  pickup = '',
  drop = '',
  pickupCoord = null,
  onBack,
  onVerified,
  onSos,
}: VerifyRideOtpScreenProps) {
  const insets = useSafeAreaInsets();
  const [otp, setOtp] = useState('');
  const [sosVisible, setSosVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [driverPos, setDriverPos] = useState<LatLng | null>(null);
  // Live driving distance + ETA to the pickup, reported by the map each time
  // it (re)routes. Shown as a pill over the map so the driver knows how far
  // the rider is — previously this screen drew the route but never showed ETA.
  const [routeInfo, setRouteInfo] = useState<RouteInfo | null>(null);
  const watchIdRef = useRef<number | null>(null);
  const isValid = otp.length === 4 && !submitting;
  const displayRideId = rideId ? `#${rideId.slice(-8).toUpperCase()}` : '—';

  // Live-track the driver's own GPS for the on-screen map. Same approach as
  // RideInProgressScreen — watchPosition gives a fresh fix every few seconds
  // so the car marker moves smoothly toward the pickup pin. This is the
  // device's own location, so it works regardless of socket/backend state.
  useEffect(() => {
    Geolocation.getCurrentPosition(
      pos => setDriverPos({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      err => console.warn('[verify-otp] initial GPS failed:', err?.message),
      { enableHighAccuracy: true, timeout: 8_000, maximumAge: 30_000 },
    );
    watchIdRef.current = Geolocation.watchPosition(
      pos => setDriverPos({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      err => console.warn('[verify-otp] watch failed:', err?.message),
      { enableHighAccuracy: true, distanceFilter: 10, interval: 5_000 },
    );
    return () => {
      if (watchIdRef.current !== null) {
        Geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    };
  }, []);

  const handleVerify = async () => {
    if (!isValid) return;
    if (!rideId) {
      // No backend id (legacy demo path) — just bounce forward.
      onVerified?.();
      return;
    }
    setSubmitting(true);
    try {
      // The backend transitions us straight to 'in_progress' on a correct
      // OTP, which is the same target state as "I've started the trip" —
      // so we don't need a separate "start ride" call here.
      await verifyRideOtp(rideId, otp);
      onVerified?.();
    } catch (err: any) {
      Alert.alert('Could not verify', err?.message ?? 'Try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // Optional: let the driver mark "I've arrived at pickup" before the
  // passenger gets in. This gives the customer's tracking screen a clearer
  // banner than just "approaching". Best-effort — a 400 from the backend
  // (already past this state) is fine and we silently ignore it.
  const handleMarkArrived = async () => {
    if (!rideId) return;
    try {
      await updateRideStatus(rideId, 'driver_arrived');
    } catch (err) {
      console.warn('[verify-otp] mark arrived failed:', err);
    }
  };

  return (
    <View className="flex-1 bg-white">
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      <LinearGradient
        colors={['#0097B3', '#00C896']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
      >
        <SafeAreaView edges={['top']}>
          <View className="flex-row items-center gap-4 px-6 pb-4 pt-2">
            <Pressable onPress={onBack} hitSlop={10}>
              <BackArrowIcon size={24} color="white" />
            </Pressable>
            <View className="flex-1">
              <Text className="text-[20px] font-poppins-semibold text-white">Verify OTP</Text>
              <Text className="text-sm text-white/80">Ride ID: {displayRideId}</Text>
            </View>
            {rideId && (
              <Pressable
                onPress={handleMarkArrived}
                hitSlop={6}
                className="rounded-full bg-white/20 px-3 py-1.5"
              >
                <Text className="text-xs font-poppins-medium text-white">I've arrived</Text>
              </Pressable>
            )}
          </View>
        </SafeAreaView>
      </LinearGradient>

      <View className="flex-1">
        <LinearGradient
          colors={['#F3F4F6', '#E5E7EB']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ flex: 1 }}
        >
          <View className="mx-4 mt-4 rounded-2xl bg-white p-4 shadow-lg shadow-black/10">
            <View className="flex-row gap-3">
              <View className="items-center pt-1">
                <View className="h-3 w-3 rounded-full bg-[#00C950]" />
                <View className="my-1 h-12 w-0.5 bg-[#D1D5DC]" />
                <View className="h-3 w-3 rounded-full bg-[#FB2C36]" />
              </View>
              <View className="flex-1">
                <Text className="text-xs text-[#6A7282]">Pickup</Text>
                <Text className="text-sm font-poppins-medium text-[#1E293B]">{pickup}</Text>
                <Text className="mt-3 text-xs text-[#6A7282]">Drop</Text>
                <Text className="text-sm font-poppins-medium text-[#1E293B]">{drop}</Text>
              </View>
            </View>
          </View>

          {pickupCoord ? (
            <View className="mx-4 mb-4 mt-4 flex-1 overflow-hidden rounded-2xl">
              <OsmMap
                driver={driverPos}
                pickup={pickupCoord}
                routeTarget="pickup"
                fallbackCenter={pickupCoord}
                onRouteInfo={setRouteInfo}
              />
              {routeInfo && (
                <View
                  className="absolute left-3 top-3 flex-row items-center gap-2 rounded-full bg-white px-4 py-2"
                  pointerEvents="none"
                  style={{
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.15,
                    shadowRadius: 4,
                    elevation: 4,
                  }}
                >
                  <Text className="text-sm font-poppins-semibold text-brand-teal">
                    {Math.max(1, Math.round(routeInfo.durationMin))} min
                  </Text>
                  <Text className="text-xs text-[#6A7282]">
                    • {routeInfo.distanceKm.toFixed(1)} km to pickup
                  </Text>
                </View>
              )}
            </View>
          ) : (
            <View className="flex-1 items-center justify-center">
              <MapPinIcon size={64} color="#9CA3AF" />
              <Text className="mt-2 text-base text-[#6A7282]">Waiting for location…</Text>
            </View>
          )}
          {/* Navigate + SOS live in the normal flex flow at the bottom of the
              map column instead of floating over it. They reserve their own
              height, so they can never sit on top of the pickup/drop card. */}
          <View className="flex-row items-center justify-end gap-3 px-4 pb-4">
            {pickupCoord && (
              <Pressable
                onPress={() => openGoogleMapsNavigation(pickupCoord)}
                className="h-14 flex-1 flex-row items-center justify-center gap-2 rounded-full bg-[#0097B3] px-5 shadow-lg shadow-black/25"
              >
                <MapPinIcon size={20} color="white" />
                <Text className="text-sm font-poppins-medium text-white">Navigate</Text>
              </Pressable>
            )}

            <Pressable
              onPress={() => {
                onSos?.();
                setSosVisible(true);
              }}
              className="h-14 w-14 items-center justify-center rounded-full bg-[#E7000B] shadow-lg shadow-black/25"
            >
              <SOSAlertIcon size={24} color="white" />
            </Pressable>
          </View>
        </LinearGradient>
      </View>

      <View
        className="rounded-t-3xl bg-white px-6 pt-6"
        style={{
          // Edge-to-edge (SDK 36): keep the CTA above the system nav bar.
          paddingBottom: Math.max(insets.bottom, 20) + 12,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -10 },
          shadowOpacity: 0.15,
          shadowRadius: 20,
          elevation: 20,
        }}
      >
        <Text className="text-center text-[20px] font-poppins-semibold text-[#1E293B]">
          Verify Passenger OTP
        </Text>
        <Text className="mt-1 text-center text-sm text-[#6A7282]">
          Ask the passenger for their 4-digit OTP
        </Text>

        <View className="mt-4 flex-row items-center justify-between rounded-2xl bg-[#F9FAFB] p-4">
          <View>
            <Text className="text-sm text-[#6A7282]">Passenger</Text>
            <Text className="text-base font-poppins-semibold text-[#1E293B]">{passengerName}</Text>
          </View>
          <Pressable className="h-11 w-11 items-center justify-center rounded-full bg-brand-teal">
            <PhoneIcon size={20} color="white" />
          </Pressable>
        </View>

        <TextInput
          value={otp}
          onChangeText={t => setOtp(t.replace(/[^0-9]/g, '').slice(0, 4))}
          placeholder="Enter 4-digit OTP"
          placeholderTextColor="#717182"
          keyboardType="number-pad"
          maxLength={4}
          className="mt-4 h-14 rounded-2xl bg-[#F3F3F5] text-center text-[24px] text-[#1E293B]"
          style={{ letterSpacing: 2.4 }}
        />

        <Pressable
          onPress={handleVerify}
          disabled={!isValid}
          className="mt-4 h-14 items-center justify-center rounded-2xl bg-brand-teal"
          style={{ opacity: isValid ? 1 : 0.5 }}
        >
          {submitting ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text className="text-sm font-poppins-medium text-white">Verify & Start Ride</Text>
          )}
        </Pressable>
      </View>

      <EmergencySosModal
        visible={sosVisible}
        onClose={() => setSosVisible(false)}
        onCallEmergency={() => {
          setSosVisible(false);
          Linking.openURL('tel:100').catch(() => {});
        }}
        onCallSupport={() => {
          setSosVisible(false);
          Linking.openURL('tel:+911800123456').catch(() => {});
        }}
      />
    </View>
  );
}

export default VerifyRideOtpScreen;
