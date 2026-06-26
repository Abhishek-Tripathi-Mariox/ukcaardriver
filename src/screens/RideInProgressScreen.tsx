import { useEffect, useRef, useState } from 'react';
import { Pressable, StatusBar, Text, View } from 'react-native';
import Geolocation from '@react-native-community/geolocation';
import LinearGradient from 'react-native-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  BackArrowIcon,
  MapPinIcon,
  PhoneIcon,
} from '../components/icons/ServiceTypeIcons';
import { OsmMap, type LatLng, type RouteInfo } from '../components/OsmMap';
import { openGoogleMapsNavigation } from '../utils/navigation';

interface RideInProgressScreenProps {
  title?: string;
  eta?: string;
  distance?: string;
  statusText?: string;
  /** Customer pickup point — drawn as a blue dot. */
  pickup?: LatLng | null;
  /** Final dropoff — drawn as a green dot. The polyline routes here while
   *  this screen is mounted (driver has already verified OTP and is en
   *  route to drop the customer). */
  dropoff?: LatLng | null;
  onBack?: () => void;
  onCall?: () => void;
  onChat?: () => void;
  onComplete?: () => void;
}

export function RideInProgressScreen({
  title = 'Private Ride Confirmed',
  eta = '2 min',
  distance = '0.5 mi',
  statusText = 'On the way to drop',
  pickup = null,
  dropoff = null,
  onBack,
  onCall,
  onChat,
  onComplete,
}: RideInProgressScreenProps) {
  const [canComplete, setCanComplete] = useState(false);
  const [driverPos, setDriverPos] = useState<LatLng | null>(null);
  const [routeInfo, setRouteInfo] = useState<RouteInfo | null>(null);
  const watchIdRef = useRef<number | null>(null);

  // Live distance/ETA from the actual route the map computes — falls back to
  // the props (or their defaults) until the first route fix arrives.
  const liveEta = routeInfo
    ? `${Math.max(1, Math.round(routeInfo.durationMin))} min`
    : eta;
  const liveDistance = routeInfo
    ? `${routeInfo.distanceKm.toFixed(1)} km`
    : distance;

  useEffect(() => {
    const t = setTimeout(() => setCanComplete(true), 2500);
    return () => clearTimeout(t);
  }, []);

  // Live-track the driver's position for the on-screen map. The 60s
  // backend reporter is too coarse for a smooth marker — watchPosition
  // gives us a fresh fix every few seconds with no extra network cost.
  useEffect(() => {
    Geolocation.getCurrentPosition(
      pos => setDriverPos({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      err => console.warn('[ride-in-progress] initial GPS failed:', err?.message),
      { enableHighAccuracy: true, timeout: 8_000, maximumAge: 30_000 },
    );

    watchIdRef.current = Geolocation.watchPosition(
      pos => setDriverPos({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      err => console.warn('[ride-in-progress] watch failed:', err?.message),
      { enableHighAccuracy: true, distanceFilter: 10, interval: 5_000 },
    );

    return () => {
      if (watchIdRef.current !== null) {
        Geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    };
  }, []);

  return (
    <View className="flex-1 bg-[#F9FAFB]">
      <StatusBar barStyle="light-content" />

      <View className="bg-[#0097B3]">
        <SafeAreaView edges={['top']}>
          <View className="flex-row items-center gap-3 px-4 pb-3 pt-2">
            <Pressable onPress={onBack} hitSlop={10}>
              <BackArrowIcon size={22} color="white" />
            </Pressable>
            <Text className="flex-1 text-[18px] font-semibold text-white">{title}</Text>
          </View>
        </SafeAreaView>
      </View>

      <View className="flex-1">
        {dropoff || pickup ? (
          <OsmMap
            driver={driverPos}
            pickup={pickup ?? undefined}
            dropoff={dropoff ?? undefined}
            routeTarget={dropoff ? 'dropoff' : 'pickup'}
            onRouteInfo={setRouteInfo}
          />
        ) : (
          // No coords arrived with this ride — show a soft fallback rather
          // than rendering an empty grey rectangle.
          <LinearGradient
            colors={['#E8F4F8', '#D4E9F0']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ flex: 1 }}
          >
            <View className="flex-1 items-center justify-center">
              <Text className="text-sm text-[#6A7282]">Waiting for location…</Text>
            </View>
          </LinearGradient>
        )}

        {(dropoff || pickup) && (
          <Pressable
            onPress={() => openGoogleMapsNavigation((dropoff ?? pickup)!)}
            className="absolute right-4 bottom-4 h-14 flex-row items-center gap-2 rounded-full bg-[#0097B3] px-5 shadow-lg shadow-black/25"
          >
            <MapPinIcon size={20} color="white" />
            <Text className="text-sm font-semibold text-white">Navigate</Text>
          </Pressable>
        )}
      </View>

      <View
        className="rounded-t-[20px] bg-white px-6 pb-8 pt-6"
        style={{
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.1,
          shadowRadius: 3,
          elevation: 10,
        }}
      >
        <View className="flex-row items-center justify-between">
          <View className="flex-1 items-center">
            <View className="flex-row items-center gap-2">
              <Text className="text-[18px] font-extrabold text-[#282F39]">{liveEta}</Text>
              <View className="h-5 w-5 items-center justify-center rounded-full bg-[#FFD60A]">
                <Text className="text-[10px] font-bold text-[#282F39]">$</Text>
              </View>
              <Text className="text-[18px] font-extrabold text-[#282F39]">{liveDistance}</Text>
            </View>
            <Text className="mt-1 text-base text-[#7F7F7F]">{statusText}</Text>
          </View>
          <View className="flex-row items-center gap-2">
            <Pressable
              onPress={onChat}
              className="h-11 w-11 items-center justify-center rounded-full bg-[#0097B3]/10"
            >
              <Text className="text-base">💬</Text>
            </Pressable>
            <Pressable
              onPress={onCall}
              className="h-11 w-11 items-center justify-center rounded-full bg-[#0097B3]/10"
            >
              <PhoneIcon size={18} color="#E7000B" />
            </Pressable>
          </View>
        </View>

        <Pressable
          onPress={canComplete ? onComplete : undefined}
          disabled={!canComplete}
          className="mt-5 h-12 items-center justify-center rounded-xl"
          style={{
            backgroundColor: canComplete ? '#219EBC' : '#E5E7EB',
          }}
        >
          <Text
            className="text-sm font-bold tracking-[0.28px]"
            style={{ color: canComplete ? 'white' : '#9CA3AF' }}
          >
            COMPLETE
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

export default RideInProgressScreen;
