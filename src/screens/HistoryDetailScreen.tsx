import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StatusBar,
  Text,
  View,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BackArrowIcon } from '../components/icons/ServiceTypeIcons';
import { getRide, RideListItem } from '../services/api';

interface HistoryDetailScreenProps {
  rideId: string | null;
  onBack?: () => void;
}

const fmtRupees = (n?: number): string => {
  if (n === undefined || n === null) return '—';
  try {
    return `₹${new Intl.NumberFormat('en-IN').format(Math.round(n))}`;
  } catch {
    return `₹${Math.round(n)}`;
  }
};

const fmtDateTime = (iso?: string): string => {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const fmtKm = (km?: number): string => {
  if (km === undefined || km === null) return '—';
  return `${km.toFixed(2)} km`;
};

const fmtDuration = (minutes?: number): string => {
  if (minutes === undefined || minutes === null) return '—';
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  return h > 0 ? `${h}h ${m}min` : `${m}min`;
};

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row items-center">
      <Text className="flex-1 text-[15px] text-[#132235]">{label}</Text>
      <Text className="text-[15px] text-[#132235]">{value}</Text>
    </View>
  );
}

export function HistoryDetailScreen({
  rideId,
  onBack,
}: HistoryDetailScreenProps) {
  const [ride, setRide] = useState<RideListItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!rideId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    getRide(rideId)
      .then(r => {
        if (!cancelled) setRide(r);
      })
      .catch(err => {
        if (!cancelled) setError(err?.message ?? 'Could not load ride.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [rideId]);

  const tripIdShort = ride ? `#${ride._id.slice(-8).toUpperCase()}` : '—';
  const tripType = ride?.isScheduled ? 'Scheduled' : 'Instant';
  const distance = fmtKm(ride?.actualDistance ?? ride?.estimatedDistance);
  const duration = fmtDuration(ride?.actualDuration ?? ride?.estimatedDuration);
  const vehicleType = ride?.rideType
    ? ride.rideType.charAt(0).toUpperCase() + ride.rideType.slice(1)
    : '—';
  const estimatedFare = fmtRupees(ride?.estimatedFare);
  const earnedAmount = fmtRupees(ride?.driverEarnings ?? ride?.actualFare);

  return (
    <View className="flex-1 bg-[#F5F5F5]">
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      <LinearGradient
        colors={['#0097B3', '#00C896']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
      >
        <SafeAreaView edges={['top']}>
          <View className="flex-row items-center gap-4 px-6 pb-6 pt-2">
            <Pressable onPress={onBack} hitSlop={10}>
              <BackArrowIcon size={22} color="white" />
            </Pressable>
            <Text className="text-[15px] text-white">{tripIdShort}</Text>
          </View>
        </SafeAreaView>
      </LinearGradient>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 16, paddingBottom: 32, gap: 16 }}
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <View className="py-20 items-center">
            <ActivityIndicator color="#0097B3" />
          </View>
        ) : error || !ride ? (
          <View className="py-16 items-center">
            <Text className="text-sm text-[#E02D3C]">
              {error ?? 'Ride not found.'}
            </Text>
          </View>
        ) : (
          <>
            <View className="rounded-2xl border border-[#E1E6EF] bg-white p-4">
              <Text className="text-xs font-poppins-bold text-[#132234]">PICKUP & DESTINATION</Text>

              <View className="relative mt-3">
                <View className="absolute left-[9px] top-3 h-[70px] w-0.5 bg-[#E1E6EF]" />

                <View className="flex-row items-start gap-3 pb-4">
                  <View className="mt-1 h-5 w-5 items-center justify-center">
                    <View className="h-5 w-5 items-center justify-center rounded-full bg-[#00C896]/20">
                      <View className="h-2.5 w-2.5 rounded-full bg-[#00C896]" />
                    </View>
                  </View>
                  <View className="flex-1">
                    <Text className="text-[15px] font-poppins-bold text-[#132235]">
                      Started : {fmtDateTime(ride.startedAt ?? ride.createdAt)}
                    </Text>
                    <Text className="mt-1 text-[13px] text-[#132235]">
                      {ride.pickup.address}
                    </Text>
                  </View>
                </View>

                <View className="flex-row items-start gap-3 pt-2">
                  <View className="mt-1 h-5 w-5 items-center justify-center">
                    <View className="h-5 w-5 items-center justify-center rounded-full bg-[#E02D3C]/20">
                      <View className="h-2.5 w-2.5 rounded-full bg-[#E02D3C]" />
                    </View>
                  </View>
                  <View className="flex-1">
                    <Text className="text-[15px] font-poppins-bold text-[#132235]">
                      Ended : {fmtDateTime(ride.completedAt)}
                    </Text>
                    <Text className="mt-1 text-[13px] text-[#132235]">
                      {ride.dropoff.address}
                    </Text>
                  </View>
                </View>
              </View>
            </View>

            <View className="gap-4 rounded-2xl border border-[#E1E6EF] bg-white p-4">
              <Text className="text-xs font-poppins-bold text-[#132234]">BASIC DETAILS</Text>
              <View className="gap-4">
                <DetailRow label="Trip ID:" value={tripIdShort} />
                <DetailRow label="Trip Type:" value={tripType} />
                <DetailRow label="Trip Distance:" value={distance} />
                <DetailRow label="Trip Duration:" value={duration} />
                <DetailRow label="Vehicle Type:" value={vehicleType} />
                <DetailRow
                  label="Status:"
                  value={ride.status.replace(/_/g, ' ')}
                />
              </View>
            </View>

            <View className="rounded-2xl border border-[#E1E6EF] bg-white p-4">
              <Text className="text-xs font-poppins-bold text-[#132234]">FARE DETAILS</Text>
              <View className="mt-3 flex-row items-center">
                <Text className="flex-1 text-[15px] text-[#132235]">Total Fare:</Text>
                <Text className="text-[15px] text-[#132235]">{estimatedFare}</Text>
              </View>
              <View className="mt-4 h-px bg-[#E1E6EF]" />
              <Text className="mt-3 text-center text-[13px] text-[#2F6FED]">
                Earned money from trip:
              </Text>
              <Text className="mt-1 text-center text-[20px] font-poppins-bold text-[#2F6FED]">
                {earnedAmount}
              </Text>
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

export default HistoryDetailScreen;
