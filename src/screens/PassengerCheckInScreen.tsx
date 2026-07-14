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
import { fs, s, vs } from '../theme/responsive';

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
      <View
        className="self-start rounded-full bg-[#FFF3E0]"
        style={{ paddingHorizontal: s(12), paddingVertical: vs(4) }}
      >
        <Text className="font-poppins-medium text-[#B45309]" style={{ fontSize: fs(12) }}>
          🟡 Waiting
        </Text>
      </View>
    );
  }
  if (status === 'boarded') {
    return (
      <View
        className="self-start rounded-full bg-[#DCFCE7]"
        style={{ paddingHorizontal: s(12), paddingVertical: vs(4) }}
      >
        <Text className="font-poppins-medium text-[#00A63E]" style={{ fontSize: fs(12) }}>
          ✓ Boarded
        </Text>
      </View>
    );
  }
  return (
    <View
      className="self-start rounded-full bg-[#FEE2E2]"
      style={{ paddingHorizontal: s(12), paddingVertical: vs(4) }}
    >
      <Text className="font-poppins-medium text-[#B91C1C]" style={{ fontSize: fs(12) }}>
        ✕ No-Show
      </Text>
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
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      <LinearGradient
        colors={['#AD46FF', '#9810FA']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
      >
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
                Passenger Check-In
              </Text>
              <Text
                className="text-white/80 font-poppins-regular"
                style={{ fontSize: fs(14) }}
              >
                Journey ID: {journeyId}
              </Text>
            </View>
            <Pressable
              onPress={() => onScanQr?.('')}
              className="items-center justify-center rounded-full bg-white/20"
              style={{ width: s(40), height: s(40) }}
            >
              <QrCodeIcon size={s(20)} color="white" />
            </Pressable>
          </View>
        </SafeAreaView>
      </LinearGradient>

      <View style={{ paddingHorizontal: s(16), paddingTop: vs(16) }}>
        <View
          className="items-center rounded-2xl bg-[#F8EEFF]"
          style={{ paddingVertical: vs(20) }}
        >
          <Text
            className="font-poppins-bold text-[#9D1CFB]"
            style={{ fontSize: fs(34), lineHeight: fs(42) }}
          >
            {boarded} / {total}
          </Text>
          <Text
            className="text-[#6A7282] font-poppins-regular"
            style={{ fontSize: fs(14), marginTop: vs(4) }}
          >
            Passengers Boarded
          </Text>
        </View>
      </View>

      <View style={{ paddingHorizontal: s(16), paddingTop: vs(16) }}>
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
                className="flex-1 items-center"
                style={[
                  { paddingBottom: vs(12) },
                  active ? { borderBottomWidth: 2, borderColor: '#0097B3' } : undefined,
                ]}
              >
                <Text
                  className="font-poppins-medium"
                  style={{ fontSize: fs(14), color: active ? '#0097B3' : '#6A7282' }}
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
        contentContainerStyle={{ padding: s(16), gap: vs(12) }}
        showsVerticalScrollIndicator={false}
      >
        {items.length === 0 ? (
          <Text
            className="text-center font-poppins-regular text-[#6A7282]"
            style={{ marginTop: vs(40), fontSize: fs(14) }}
          >
            No passengers in this tab.
          </Text>
        ) : (
          items.map(p => (
            <View
              key={p.id}
              className="bg-white"
              style={{
                borderRadius: s(16),
                padding: s(16),
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.06,
                shadowRadius: 4,
                elevation: 2,
              }}
            >
              <View className="flex-row items-center" style={{ gap: s(12) }}>
                <View
                  className="items-center justify-center rounded-full bg-[#9D1CFB]"
                  style={{ width: s(48), height: s(48) }}
                >
                  <Text
                    className="font-poppins-semibold text-white"
                    style={{ fontSize: fs(16) }}
                  >
                    {p.initial}
                  </Text>
                </View>
                <View className="flex-1 pr-2">
                  <Text
                    className="font-poppins-semibold text-[#1E293B]"
                    style={{ fontSize: fs(16) }}
                    numberOfLines={1}
                  >
                    {p.name}
                  </Text>
                  <Text
                    className="text-[#6A7282] font-poppins-regular"
                    style={{ fontSize: fs(13), marginTop: vs(2) }}
                    numberOfLines={2}
                  >
                    Seat: {p.seat} • {p.route}
                  </Text>
                </View>
              </View>
              <View
                className="flex-row items-center justify-between"
                style={{ marginTop: vs(12) }}
              >
                <StatusChip status={p.status} />
                {p.status === 'upcoming' && (
                  <View className="flex-row" style={{ gap: s(8) }}>
                    <Pressable
                      onPress={() => handleCheckIn(p)}
                      className="items-center justify-center rounded-full bg-[#F3E8FF]"
                      style={{ height: s(36), paddingHorizontal: s(12) }}
                    >
                      <Text
                        className="font-poppins-semibold text-[#9810FA]"
                        style={{ fontSize: fs(12) }}
                      >
                        Check In
                      </Text>
                    </Pressable>
                    <Pressable
                      onPress={() => {
                        onCall?.(p.id);
                        handleCall(p);
                      }}
                      className="items-center justify-center rounded-full bg-[#E0F7FA]"
                      style={{ width: s(36), height: s(36) }}
                    >
                      <PhoneIcon size={s(16)} color="#0097B3" />
                    </Pressable>
                    <Pressable
                      onPress={() => setAbsentTarget(p)}
                      className="items-center justify-center rounded-full bg-[#FEE2E2]"
                      style={{ width: s(36), height: s(36) }}
                    >
                      <UserXIcon size={s(18)} color="#D32F2F" />
                    </Pressable>
                  </View>
                )}
              </View>
            </View>
          ))
        )}
      </ScrollView>

      <View style={{ paddingHorizontal: s(16), paddingBottom: vs(24), paddingTop: vs(8) }}>
        <Pressable
          onPress={onViewSummary}
          className="items-center justify-center bg-[#9810FA]"
          style={{ height: s(50), borderRadius: s(16) }}
        >
          <Text
            className="font-poppins-medium uppercase text-white"
            style={{ fontSize: fs(15) }}
          >
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
        <View className="flex-1 items-center justify-center bg-black/50" style={{ paddingHorizontal: s(32) }}>
          <View className="w-full bg-white" style={{ borderRadius: s(16), padding: s(24) }}>
            <Text
              className="font-poppins-semibold text-[#1E293B]"
              style={{ fontSize: fs(20) }}
            >
              Mark as Absent?
            </Text>
            <Text
              className="text-[#4A5565] font-poppins-regular"
              style={{ fontSize: fs(14), lineHeight: fs(20), marginTop: vs(12) }}
            >
              Passenger{' '}
              <Text className="font-poppins-semibold text-[#1E293B]">
                {absentTarget?.name}
              </Text>{' '}
              has not arrived yet. Do you want to mark them as Absent?
            </Text>
            <Text
              className="text-[#6A7282] font-poppins-regular"
              style={{ fontSize: fs(12), lineHeight: fs(16), marginTop: vs(12) }}
            >
              This marks the seat as no-show and excludes it from your trip
              earnings. Any fare refund is reviewed by admin.
            </Text>
            <View className="flex-row" style={{ marginTop: vs(24), gap: s(12) }}>
              <Pressable
                onPress={() => setAbsentTarget(null)}
                className="flex-1 items-center justify-center bg-[#F1F5F9]"
                style={{ height: s(46), borderRadius: s(14) }}
              >
                <Text
                  className="font-poppins-medium text-[#0097B3]"
                  style={{ fontSize: fs(15) }}
                >
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
                className="flex-1 items-center justify-center bg-[#D32F2F]"
                style={{ height: s(46), borderRadius: s(14) }}
              >
                <Text
                  className="font-poppins-medium text-white"
                  style={{ fontSize: fs(15) }}
                >
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
