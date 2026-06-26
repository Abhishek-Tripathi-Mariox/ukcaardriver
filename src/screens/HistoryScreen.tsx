import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StatusBar,
  Text,
  View,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  BackArrowIcon,
  CalendarIcon,
  CarIcon,
  ClockSmallIcon,
  MoneyIcon,
  RoutingIcon,
} from '../components/icons/ServiceTypeIcons';
import { listMyRides, RideListItem } from '../services/api';

interface HistoryScreenProps {
  onBack?: () => void;
  onOpenRide?: (rideId: string) => void;
}

interface HistoryGroup {
  label: string;
  rides: RideListItem[];
}

const fmtRupees = (n: number): string => {
  try {
    return `₹${new Intl.NumberFormat('en-IN').format(Math.round(n))}`;
  } catch {
    return `₹${Math.round(n)}`;
  }
};

const fmtKm = (km?: number): string => {
  if (km === undefined || km === null) return '—';
  return `${km.toFixed(2)}km`;
};

const fmtDuration = (minutes?: number): string => {
  if (!minutes && minutes !== 0) return '—';
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  return h > 0 ? `${h}h ${m}min` : `${m}min`;
};

const fmtDate = (iso: string): string => {
  const d = new Date(iso);
  return d.toLocaleDateString('en-GB');
};

/**
 * Bucket rides by date. Today / Yesterday / "DD MMM YYYY". Within each
 * bucket they retain backend ordering (newest first).
 */
function groupRides(rides: RideListItem[]): HistoryGroup[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const buckets = new Map<string, RideListItem[]>();
  for (const r of rides) {
    const d = new Date(r.completedAt || r.createdAt);
    d.setHours(0, 0, 0, 0);
    let label: string;
    if (d.getTime() === today.getTime()) label = 'TODAY';
    else if (d.getTime() === yesterday.getTime()) label = 'YESTERDAY';
    else
      label = d
        .toLocaleDateString('en-GB', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        })
        .toUpperCase();
    if (!buckets.has(label)) buckets.set(label, []);
    buckets.get(label)!.push(r);
  }
  return Array.from(buckets.entries()).map(([label, rides]) => ({ label, rides }));
}

function SectionLabel({ label }: { label: string }) {
  return (
    <View className="flex-row items-center gap-4">
      <View className="h-px flex-1 bg-[#E1E6EF]" />
      <Text className="text-[11px] font-bold text-[#607080]">{label}</Text>
      <View className="h-px flex-1 bg-[#E1E6EF]" />
    </View>
  );
}

function RideCard({
  ride,
  onPress,
}: {
  ride: RideListItem;
  onPress?: () => void;
}) {
  const passengerName =
    [ride.customer?.firstName, ride.customer?.lastName]
      .filter(Boolean)
      .join(' ') || 'Passenger';
  const rideId = `#${ride._id.slice(-8).toUpperCase()}`;
  const date = fmtDate(ride.completedAt || ride.createdAt);
  const tripType = ride.isScheduled ? 'Scheduled' : 'Instant';
  const distance = fmtKm(ride.actualDistance ?? ride.estimatedDistance);
  const duration = fmtDuration(ride.actualDuration ?? ride.estimatedDuration);
  // Driver earnings is the right number to surface here — what the driver got,
  // not what the customer paid.
  const fare = fmtRupees(
    ride.driverEarnings ?? ride.actualFare ?? ride.estimatedFare,
  );
  const paid = ride.paymentStatus === 'completed';

  return (
    <Pressable
      onPress={onPress}
      className="overflow-hidden rounded-2xl border border-[#E1E6EF] bg-white"
    >
      <View className="gap-3 pt-4">
        <View className="flex-row items-start gap-3 px-4">
          <View className="flex-1">
            <Text className="text-[15px] font-bold text-[#132235]">{passengerName}</Text>
            <Text className="mt-0.5 text-xs text-[#364B63]">ID: {rideId}</Text>
          </View>
          <View className="flex-row items-center gap-1.5">
            <CalendarIcon size={16} color="#364B63" />
            <Text className="text-[13px] text-[#364B63]">{date}</Text>
          </View>
        </View>

        <View className="px-4">
          <View className="flex-row items-center gap-2 border-b border-[#E1E6EF] py-2">
            <View className="h-2.5 w-2.5 rounded-full bg-[#00C896]" />
            <Text numberOfLines={1} className="flex-1 text-[15px] text-[#132235]">
              {ride.pickup.address}
            </Text>
          </View>
          <View className="flex-row items-center gap-2 py-2">
            <View className="h-2.5 w-2.5 rounded-full bg-[#E02D3C]" />
            <Text numberOfLines={1} className="flex-1 text-[15px] text-[#132235]">
              {ride.dropoff.address}
            </Text>
          </View>
        </View>

        <View className="flex-row items-center gap-3 px-4 pb-4">
          <View className="flex-row items-center gap-2">
            <CarIcon size={18} color="#364B63" />
            <Text className="text-[13px] font-bold text-[#364B63]">{tripType}</Text>
          </View>
          <View className="flex-1 flex-row items-center justify-center gap-2">
            <RoutingIcon size={18} color="#364B63" />
            <Text className="text-[13px] font-bold text-[#364B63]">{distance}</Text>
          </View>
          <View className="flex-1 flex-row items-center justify-end gap-2">
            <ClockSmallIcon size={18} color="#364B63" />
            <Text className="text-[13px] font-bold text-[#364B63]">{duration}</Text>
          </View>
        </View>
      </View>

      <View className="h-px bg-[#E9F0F7]" />
      <View
        className={`flex-row items-center justify-center gap-2 py-3 ${
          paid ? 'bg-[#0097B3]' : 'bg-[#F0F5FF]'
        }`}
      >
        <MoneyIcon size={18} color={paid ? 'white' : '#0097B3'} />
        <Text
          className="text-[17px] font-bold"
          style={{ color: paid ? 'white' : '#0097B3' }}
        >
          {fare}
        </Text>
      </View>
    </Pressable>
  );
}

export function HistoryScreen({ onBack, onOpenRide }: HistoryScreenProps) {
  const [groups, setGroups] = useState<HistoryGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await listMyRides({ page: 1, limit: 50 });
      setGroups(groupRides(res.rides));
    } catch (err) {
      console.warn('[history] fetch failed:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = () => {
    setRefreshing(true);
    load();
  };

  return (
    <View className="flex-1 bg-white">
      <StatusBar barStyle="light-content" />

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
            <Text className="text-[20px] font-semibold text-white">History</Text>
          </View>
        </SafeAreaView>
      </LinearGradient>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 16, paddingBottom: 120, gap: 16 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {loading && groups.length === 0 ? (
          <View className="py-20 items-center">
            <ActivityIndicator color="#0097B3" />
          </View>
        ) : groups.length === 0 ? (
          <View className="py-16 items-center">
            <Text className="text-base font-semibold text-[#132235]">
              No rides yet
            </Text>
            <Text className="mt-1 text-sm text-[#6A7282]">
              Your completed rides will show up here.
            </Text>
          </View>
        ) : (
          groups.map(group => (
            <View key={group.label} className="gap-4">
              <SectionLabel label={group.label} />
              {group.rides.map(ride => (
                <RideCard
                  key={ride._id}
                  ride={ride}
                  onPress={() => onOpenRide?.(ride._id)}
                />
              ))}
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

export default HistoryScreen;
