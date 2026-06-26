import { useEffect, useState } from 'react';
import { Alert, Linking, Modal, Pressable, ScrollView, StatusBar, Text, View } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  BackArrowIcon,
  PhoneIcon,
  QrCodeIcon,
  UserXIcon,
} from '../components/icons/ServiceTypeIcons';
import { checkInPassenger, fetchJourneyPassengers, markNoShow } from '../services/api';

type PassengerStatus = 'upcoming' | 'boarded' | 'no-show';

interface CheckInPassenger {
  id: string;
  name: string;
  initial: string;
  seat: string;
  route: string;
  contact?: string;
  status: PassengerStatus;
  bookingId?: string;
  seatNum?: number;
}

interface PassengerCheckInScreenProps {
  journeyKey?: string | null;
  journeyId?: string;
  boarded?: number;
  total?: number;
  passengers?: CheckInPassenger[];
  onBack?: () => void;
  onScanQr?: (id: string) => void;
  onCall?: (id: string) => void;
  onMarkAbsent?: (id: string) => void;
  onViewSummary?: () => void;
}

// Empty by default — the real manifest is fetched on mount. Until it resolves
// (or if there's no journey), the list shows the neutral empty state rather
// than placeholder names.
const DEFAULT_PASSENGERS: CheckInPassenger[] = [];

function StatusChip({ status }: { status: PassengerStatus }) {
  if (status === 'upcoming') {
    return (
      <View className="self-start rounded-full bg-[#FFF3E0] px-3 py-1">
        <Text className="text-[12px] font-medium text-[#B45309]">
          🟡 Waiting
        </Text>
      </View>
    );
  }
  if (status === 'boarded') {
    return (
      <View className="self-start rounded-full bg-[#DCFCE7] px-3 py-1">
        <Text className="text-[12px] font-medium text-[#00A63E]">
          ✓ Boarded
        </Text>
      </View>
    );
  }
  return (
    <View className="self-start rounded-full bg-[#FEE2E2] px-3 py-1">
      <Text className="text-[12px] font-medium text-[#B91C1C]">✕ No-Show</Text>
    </View>
  );
}

export function PassengerCheckInScreen({
  journeyKey,
  journeyId = 'SCH001',
  boarded: boardedProp = 0,
  total: totalProp = 0,
  passengers: passengersProp = DEFAULT_PASSENGERS,
  onBack,
  onScanQr,
  onCall,
  onMarkAbsent,
  onViewSummary,
}: PassengerCheckInScreenProps) {
  const [tab, setTab] = useState<PassengerStatus>('upcoming');
  const [absentTarget, setAbsentTarget] = useState<CheckInPassenger | null>(null);
  const [fetched, setFetched] = useState<CheckInPassenger[] | null>(null);

  const reload = () => {
    if (!journeyKey) return;
    fetchJourneyPassengers(journeyKey)
      .then((r) =>
        setFetched(
          r.passengers.map((p) => ({
            id: `${p.bookingId}-${p.seat}`,
            name: p.name,
            initial: (p.name?.[0] ?? '?').toUpperCase(),
            seat: String(p.seat),
            route: p.contact || '',
            contact: p.contact || '',
            status: p.noShow
              ? ('no-show' as const)
              : p.boarded
                ? ('boarded' as const)
                : ('upcoming' as const),
            bookingId: p.bookingId,
            seatNum: p.seat,
          })),
        ),
      )
      .catch(() => {});
  };

  useEffect(reload, [journeyKey]);

  const handleCall = (p: CheckInPassenger) => {
    const phone = (p.contact || '').replace(/\s/g, '');
    if (!phone) {
      Alert.alert('No phone number', 'This passenger has no contact number on file.');
      return;
    }
    Linking.openURL(`tel:${phone}`).catch(() =>
      Alert.alert('Could not place call', 'Dialer is unavailable on this device.'),
    );
  };

  const handleNoShow = async (p: CheckInPassenger) => {
    if (!journeyKey || !p.bookingId || p.seatNum == null) return;
    try {
      await markNoShow(journeyKey, p.bookingId, [p.seatNum]);
      reload();
    } catch (err: any) {
      Alert.alert('Could not mark no-show', err?.message ?? 'Please try again.');
    }
  };

  const passengers = fetched ?? passengersProp;
  const boarded = fetched ? fetched.filter((p) => p.status === 'boarded').length : boardedProp;
  const total = fetched ? fetched.length : totalProp;

  const handleCheckIn = async (p: CheckInPassenger) => {
    if (!journeyKey || !p.bookingId || p.seatNum == null) return;
    try {
      await checkInPassenger(journeyKey, p.bookingId, [p.seatNum]);
      reload();
    } catch (err: any) {
      Alert.alert('Check-in failed', err?.message ?? 'Please try again.');
    }
  };

  const counts = {
    upcoming: passengers.filter(p => p.status === 'upcoming').length,
    boarded: passengers.filter(p => p.status === 'boarded').length,
    'no-show': passengers.filter(p => p.status === 'no-show').length,
  };

  const items = passengers.filter(p => p.status === tab);

  return (
    <View className="flex-1 bg-[#F9FAFB]">
      <StatusBar barStyle="light-content" />

      <LinearGradient
        colors={['#AD46FF', '#9810FA']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
      >
        <SafeAreaView edges={['top']}>
          <View className="flex-row items-center gap-4 px-6 pb-4 pt-2">
            <Pressable onPress={onBack} hitSlop={10}>
              <BackArrowIcon size={22} color="white" />
            </Pressable>
            <View className="flex-1">
              <Text className="text-[20px] font-semibold text-white">
                Passenger Check-In
              </Text>
              <Text className="text-[14px] text-white/80">
                Journey ID: {journeyId}
              </Text>
            </View>
            <Pressable
              onPress={() => onScanQr?.('')}
              className="h-10 w-10 items-center justify-center rounded-full bg-white/20"
            >
              <QrCodeIcon size={20} color="white" />
            </Pressable>
          </View>
        </SafeAreaView>
      </LinearGradient>

      <View className="px-4 pt-4">
        <View className="items-center rounded-2xl bg-[#F8EEFF] py-5">
          <Text className="text-[34px] font-bold text-[#9D1CFB]">
            {boarded} / {total}
          </Text>
          <Text className="mt-1 text-[14px] text-[#6A7282]">
            Passengers Boarded
          </Text>
        </View>
      </View>

      <View className="px-4 pt-4">
        <View className="flex-row border-b border-[#E5E7EB]">
          {(
            [
              ['upcoming', 'Upcoming'],
              ['boarded', 'Boarded'],
              ['no-show', 'No-Show'],
            ] as const
          ).map(([key, label]) => {
            const active = tab === key;
            return (
              <Pressable
                key={key}
                onPress={() => setTab(key)}
                className="flex-1 items-center pb-3"
                style={
                  active
                    ? { borderBottomWidth: 2, borderColor: '#0097B3' }
                    : undefined
                }
              >
                <Text
                  className="text-[14px] font-medium"
                  style={{ color: active ? '#0097B3' : '#6A7282' }}
                >
                  {label} ({counts[key]})
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 16, gap: 12 }}
        showsVerticalScrollIndicator={false}
      >
        {items.length === 0 ? (
          <Text className="mt-10 text-center text-sm text-[#6A7282]">
            No passengers in this tab.
          </Text>
        ) : (
          items.map(p => (
            <View
              key={p.id}
              className="rounded-2xl bg-white p-4"
              style={{
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.06,
                shadowRadius: 4,
                elevation: 2,
              }}
            >
              <View className="flex-row items-center gap-3">
                <View className="h-12 w-12 items-center justify-center rounded-full bg-[#9D1CFB]">
                  <Text className="text-base font-semibold text-white">
                    {p.initial}
                  </Text>
                </View>
                <View className="flex-1">
                  <Text className="text-base font-semibold text-[#1E293B]">
                    {p.name}
                  </Text>
                  <Text className="mt-0.5 text-[13px] text-[#6A7282]">
                    Seat: {p.seat} • {p.route}
                  </Text>
                </View>
              </View>
              <View className="mt-3 flex-row items-center justify-between">
                <StatusChip status={p.status} />
                {p.status === 'upcoming' && (
                  <View className="flex-row gap-2">
                    <Pressable
                      onPress={() => handleCheckIn(p)}
                      className="h-9 items-center justify-center rounded-full bg-[#F3E8FF] px-3"
                    >
                      <Text className="text-[12px] font-semibold text-[#9810FA]">Check In</Text>
                    </Pressable>
                    <Pressable
                      onPress={() => {
                        onCall?.(p.id);
                        handleCall(p);
                      }}
                      className="h-9 w-9 items-center justify-center rounded-full bg-[#E0F7FA]"
                    >
                      <PhoneIcon size={16} color="#0097B3" />
                    </Pressable>
                    <Pressable
                      onPress={() => setAbsentTarget(p)}
                      className="h-9 w-9 items-center justify-center rounded-full bg-[#FEE2E2]"
                    >
                      <UserXIcon size={18} color="#D32F2F" />
                    </Pressable>
                  </View>
                )}
              </View>
            </View>
          ))
        )}
      </ScrollView>

      <View className="px-4 pb-6 pt-2">
        <Pressable
          onPress={onViewSummary}
          className="h-[50px] items-center justify-center rounded-2xl bg-[#9810FA]"
        >
          <Text className="text-[15px] font-medium uppercase text-white">
            View Boarding Summary
          </Text>
        </Pressable>
      </View>

      <Modal
        visible={absentTarget != null}
        transparent
        animationType="fade"
        onRequestClose={() => setAbsentTarget(null)}
      >
        <View className="flex-1 items-center justify-center bg-black/50 px-8">
          <View className="w-full rounded-2xl bg-white p-6">
            <Text className="text-[20px] font-semibold text-[#1E293B]">
              Mark as Absent?
            </Text>
            <Text className="mt-3 text-[14px] leading-5 text-[#4A5565]">
              Passenger{' '}
              <Text className="font-semibold text-[#1E293B]">
                {absentTarget?.name}
              </Text>{' '}
              has not arrived yet. Do you want to mark them as Absent?
            </Text>
            <Text className="mt-3 text-[12px] leading-4 text-[#6A7282]">
              This marks the seat as no-show and excludes it from your trip
              earnings. Any fare refund is reviewed by admin.
            </Text>
            <View className="mt-6 flex-row gap-3">
              <Pressable
                onPress={() => setAbsentTarget(null)}
                className="h-[46px] flex-1 items-center justify-center rounded-2xl bg-[#F1F5F9]"
              >
                <Text className="text-[15px] font-medium text-[#0097B3]">
                  Cancel
                </Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  if (absentTarget) {
                    onMarkAbsent?.(absentTarget.id);
                    handleNoShow(absentTarget);
                  }
                  setAbsentTarget(null);
                }}
                className="h-[46px] flex-1 items-center justify-center rounded-2xl bg-[#D32F2F]"
              >
                <Text className="text-[15px] font-medium text-white">
                  Mark Absent
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

export default PassengerCheckInScreen;
