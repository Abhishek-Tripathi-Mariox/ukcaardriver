import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  AppState,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StatusBar,
  Text,
  View,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import LinearGradient from 'react-native-linear-gradient';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  BackArrowIcon,
  CalendarIcon,
  ClockSmallIcon,
  InfoCircleIcon,
  UsersIcon,
} from '../components/icons/ServiceTypeIcons';
import {
  fetchDriverAvailability,
  setDepartureAvailability,
  type AvailabilitySlot,
  type DriverAvailabilityData,
} from '../services/api';
import { fs, s, vs } from '../theme/responsive';

// One request loads 60 days, close to the backend's per-request limit. The
// calendar moves the window to any later date, so drivers can plan beyond
// the booking window and before customer bookings open.
const WINDOW_DAYS = 60;
// Bookings can land while the page is open; refresh quietly so a stale
// "Mark unavailable" doesn't linger, without flashing spinners or buttons.
const POLL_MS = 30_000;
const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const istToday = () => new Date(Date.now() + 330 * 60000).toISOString().slice(0, 10);
const pickerDate = (date: string) => new Date(`${date}T12:00:00`);
const pad = (n: number) => String(n).padStart(2, '0');
const addDays = (date: string, days: number) => {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
};
const dayParts = (date: string) => {
  const d = new Date(`${date}T12:00:00Z`);
  return { weekday: WEEKDAYS[d.getUTCDay()], day: d.getUTCDate(), month: MONTHS[d.getUTCMonth()] };
};
const longDate = (date: string) => {
  const { weekday, day, month } = dayParts(date);
  return `${weekday}, ${day} ${month}`;
};
const slotId = (slot: AvailabilitySlot) => `${slot.routeId}-${slot.departureIndex}-${slot.departureDate}`;
const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

type SlotState = 'running' | 'departed' | 'unavailable' | 'booked' | 'open';
const slotState = (slot: AvailabilitySlot): SlotState =>
  slot.running ? 'running'
    : !slot.canChange ? 'departed'
      : !slot.available ? 'unavailable'
        : slot.bookings > 0 ? 'booked'
          : 'open';

const PILLS: Record<SlotState, { label: string; bg: string; fg: string }> = {
  running: { label: 'Running', bg: '#FEF3C7', fg: '#B45309' },
  departed: { label: 'Departed', bg: '#F3F4F6', fg: '#6A7282' },
  unavailable: { label: 'Unavailable', bg: '#FFE2E2', fg: '#E7000B' },
  booked: { label: 'Available', bg: '#DCFCE7', fg: '#00A63E' },
  open: { label: 'Available', bg: '#DCFCE7', fg: '#00A63E' },
};

function DayChip({ date, selected, blocked, onPress }: {
  date: string; selected: boolean; blocked: boolean; onPress: () => void;
}) {
  const { weekday, day, month } = dayParts(date);
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="tab"
      accessibilityState={{ selected }}
      accessibilityLabel={`${longDate(date)}${blocked ? ', has blocked departures' : ''}`}
      className={`items-center border ${selected ? 'border-[#9810FA] bg-[#9810FA]' : 'border-[#E9D4FF] bg-[#FAF5FF]'}`}
      style={{ width: s(60), paddingVertical: vs(10), borderRadius: s(16) }}
    >
      <Text
        className={`font-poppins-medium ${selected ? 'text-white' : 'text-[#8200DB]'}`}
        style={{ fontSize: fs(12) }}
      >
        {weekday.slice(0, 3)}
      </Text>
      <Text
        className={`font-poppins-semibold ${selected ? 'text-white' : 'text-[#1E293B]'}`}
        style={{ fontSize: fs(20), lineHeight: fs(26) }}
      >
        {day}
      </Text>
      <Text
        className={`font-poppins-regular ${selected ? 'text-white/80' : 'text-[#6A7282]'}`}
        style={{ fontSize: fs(11) }}
      >
        {month}
      </Text>
      <View
        className={blocked ? 'bg-[#FB2C36]' : 'bg-transparent'}
        style={{
          width: s(6),
          height: s(6),
          borderRadius: s(3),
          marginTop: vs(4),
          borderWidth: blocked && selected ? 1 : 0,
          borderColor: 'white',
        }}
      />
    </Pressable>
  );
}

function SlotCard({ slot, saving, disabled, onToggle, onSupport }: {
  slot: AvailabilitySlot;
  saving: boolean;
  disabled: boolean;
  onToggle: () => void;
  onSupport?: () => void;
}) {
  const state = slotState(slot);
  const pill = PILLS[state];
  const helper =
    state === 'running' ? 'This journey is running. Finish it before changing availability.'
      : state === 'departed' ? 'This departure has left, so it can no longer be changed.'
        : state === 'booked' ? `${plural(slot.bookings, 'confirmed booking')} on this trip. Support has to resolve ${slot.bookings === 1 ? 'it' : 'them'} before you can block it.`
          : state === 'unavailable' ? 'Customers cannot book this departure with you.'
            : null;
  const card = (
    <>
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center" style={{ gap: s(8) }}>
          <ClockSmallIcon size={s(18)} color={state === 'departed' ? '#6A7282' : '#8200DB'} />
          <Text
            className="font-poppins-semibold text-[#1E293B]"
            style={{ fontSize: fs(20), lineHeight: fs(26) }}
          >
            {slot.departureTime}
          </Text>
          <Text className="font-poppins-medium text-[#6A7282]" style={{ fontSize: fs(12) }}>
            IST
          </Text>
        </View>
        <View
          className="rounded-full"
          style={{ backgroundColor: pill.bg, paddingHorizontal: s(12), paddingVertical: vs(4) }}
        >
          <Text className="font-poppins-semibold" style={{ fontSize: fs(12), color: pill.fg }}>
            {pill.label}
          </Text>
        </View>
      </View>

      <View className="flex-row items-center" style={{ gap: s(6), marginTop: vs(10) }}>
        <UsersIcon size={s(14)} color="#4A5565" />
        <Text className="font-poppins-medium text-[#4A5565]" style={{ fontSize: fs(14) }}>
          {plural(slot.bookedSeats, 'seat')} booked
        </Text>
      </View>

      {helper && (
        <Text
          className="font-poppins-regular text-[#4A5565]"
          style={{ fontSize: fs(13), lineHeight: fs(19), marginTop: vs(8) }}
        >
          {helper}
        </Text>
      )}

      {(state === 'open' || state === 'unavailable') && (
        <Pressable
          onPress={onToggle}
          disabled={disabled}
          accessibilityRole="button"
          accessibilityState={{ disabled, busy: saving }}
          className={`items-center justify-center ${
            state === 'open' ? 'border border-[#FFA2A2] bg-white' : 'bg-[#9810FA]'
          }`}
          style={{ height: s(48), borderRadius: s(14), marginTop: vs(14), opacity: disabled && !saving ? 0.5 : 1 }}
        >
          {saving ? (
            <ActivityIndicator color={state === 'open' ? '#E7000B' : 'white'} />
          ) : (
            <Text
              className={`font-poppins-medium ${state === 'open' ? 'text-[#E7000B]' : 'text-white'}`}
              style={{ fontSize: fs(15) }}
            >
              {state === 'open' ? 'Mark unavailable' : 'Make available'}
            </Text>
          )}
        </Pressable>
      )}

      {state === 'booked' && onSupport && (
        <Pressable
          onPress={onSupport}
          accessibilityRole="button"
          className="items-center justify-center border border-[#E9D4FF] bg-white"
          style={{ height: s(48), borderRadius: s(14), marginTop: vs(14) }}
        >
          <Text className="font-poppins-medium text-[#8200DB]" style={{ fontSize: fs(15) }}>
            Contact support
          </Text>
        </Pressable>
      )}
    </>
  );

  const frame = { borderRadius: s(16), padding: s(18) };
  if (state === 'unavailable') {
    return <View className="border border-[#FFC9C9] bg-[#FEF2F2]" style={frame}>{card}</View>;
  }
  if (state === 'departed') {
    return <View className="bg-[#F9FAFB]" style={frame}>{card}</View>;
  }
  return (
    <LinearGradient colors={['#FAF5FF', '#F3E8FF']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={frame}>
      {card}
    </LinearGradient>
  );
}

export function AvailabilityScreen({ onBack, onOpenSupport }: { onBack: () => void; onOpenSupport?: () => void }) {
  const insets = useSafeAreaInsets();
  const [data, setData] = useState<DriverAvailabilityData | null>(null);
  const [error, setError] = useState<string | null>(null);
  // `loading` is the first fetch only and `refreshing` is a pull-to-refresh.
  // Background polls set neither, so the list and buttons stay still.
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [routeId, setRouteId] = useState<string | null>(null);
  const [pickedDate, setPickedDate] = useState<string | null>(null);
  // First day of the loaded window: today, unless the calendar jumped ahead.
  const [anchor, setAnchor] = useState(istToday);
  const [range, setRange] = useState<{ from: string; to: string } | null>(null);
  const [picker, setPicker] = useState(false);
  const generation = useRef(0);
  const savingRef = useRef(false);

  const load = useCallback(async () => {
    const requestId = ++generation.current;
    const today = istToday();
    const from = anchor < today ? today : anchor;
    const to = addDays(from, WINDOW_DAYS - 1);
    try {
      const result = await fetchDriverAvailability(from, to);
      if (requestId === generation.current) { setData(result); setRange({ from, to }); setError(null); }
    } catch (err: any) {
      // Keep whatever is already on screen; the banner says it is stale.
      if (requestId === generation.current) setError(err?.message || 'Could not load availability.');
    } finally {
      if (requestId === generation.current) { setLoading(false); setRefreshing(false); }
    }
  }, [anchor]);

  useEffect(() => {
    load();
    const timer = setInterval(() => {
      if (AppState.currentState === 'active' && !savingRef.current) load();
    }, POLL_MS);
    const sub = AppState.addEventListener('change', state => {
      if (state === 'active' && !savingRef.current) load();
    });
    return () => { clearInterval(timer); sub.remove(); };
  }, [load]);

  const routes = useMemo(
    () => [...new Map((data?.assignments ?? []).map(a => [String(a.routeId), a.routeName])).entries()]
      .map(([id, name]) => ({ id, name })),
    [data],
  );
  const activeRoute = routes.find(route => route.id === routeId) ?? routes[0];

  const slotsByDate = useMemo(() => {
    const map = new Map<string, AvailabilitySlot[]>();
    for (const slot of data?.slots ?? []) {
      if (slot.routeId !== activeRoute?.id) continue;
      const list = map.get(slot.departureDate) ?? [];
      list.push(slot);
      map.set(slot.departureDate, list);
    }
    for (const list of map.values()) list.sort((a, b) => a.departureTime.localeCompare(b.departureTime));
    return map;
  }, [data, activeRoute?.id]);

  // Only dates the driver can still act on; a day whose departures have all
  // left has nothing to change.
  const days = useMemo(
    () => [...slotsByDate.keys()].filter(date => slotsByDate.get(date)!.some(slot => slot.canChange)).sort(),
    [slotsByDate],
  );
  // A calendar pick is kept even when nothing runs that day, so the driver
  // sees why instead of silently landing on another date.
  const selectedDate = pickedDate ?? days[0];
  const daySlots = selectedDate ? slotsByDate.get(selectedDate) ?? [] : [];
  const blockedCount = days.reduce(
    (n, date) => n + slotsByDate.get(date)!.filter(slot => slot.canChange && !slot.available).length,
    0,
  );
  const rangeLabel = !range || range.from === istToday()
    ? `in the next ${WINDOW_DAYS} days`
    : `from ${longDate(range.from)} to ${longDate(range.to)}`;

  const onPickDate = (_event: unknown, picked?: Date) => {
    if (Platform.OS !== 'ios') setPicker(false);
    if (!picked) return;
    const date = `${picked.getFullYear()}-${pad(picked.getMonth() + 1)}-${pad(picked.getDate())}`;
    setPickedDate(date);
    if (!range || date < range.from || date > range.to) {
      setData(null);
      setLoading(true);
      setAnchor(date);
    }
  };

  const contactSupport = (message: string) => {
    Alert.alert(
      'Contact support',
      message,
      onOpenSupport
        ? [{ text: 'Close', style: 'cancel' }, { text: 'Contact support', onPress: onOpenSupport }]
        : undefined,
    );
  };

  const save = async (slot: AvailabilitySlot) => {
    savingRef.current = true;
    setSavingId(slotId(slot));
    // A poll already in flight may predate this change; drop its result.
    generation.current++;
    try {
      await setDepartureAvailability(slot, !slot.available);
    } catch (err: any) {
      // A 409 is either confirmed bookings (support resolves them) or a
      // journey that started meanwhile (finish it first); only the first
      // belongs with support.
      if (err?.status === 409 && err?.payload?.code !== 'JOURNEY_RUNNING') contactSupport(err.message);
      else Alert.alert('Availability not changed', err?.message || 'Please try again.');
    } finally {
      await load();
      savingRef.current = false;
      setSavingId(null);
    }
  };

  const confirm = (slot: AvailabilitySlot) => {
    const when = `${slot.routeName}\n${longDate(slot.departureDate)} · ${slot.departureTime} IST`;
    if (slot.available) {
      Alert.alert('Mark unavailable?', `${when}\n\nCustomers won't be able to book this departure with you.`, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Mark unavailable', style: 'destructive', onPress: () => save(slot) },
      ]);
    } else {
      Alert.alert('Make available?', `${when}\n\nCustomers will be able to book this departure with you again.`, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Make available', onPress: () => save(slot) },
      ]);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    load();
  };

  const body = () => {
    if (loading && !data) {
      return <ActivityIndicator color="#9810FA" style={{ marginTop: vs(48) }} />;
    }
    if (!data) {
      return (
        <View className="items-center" style={{ marginTop: vs(48), gap: vs(12) }}>
          <Text className="text-center font-poppins-regular text-[#B91C1C]" style={{ fontSize: fs(14) }}>
            {error ?? 'Could not load availability.'}
          </Text>
          <Pressable onPress={onRefresh} hitSlop={8} accessibilityRole="button">
            <Text className="font-poppins-semibold text-[#9810FA]" style={{ fontSize: fs(14) }}>
              Try again
            </Text>
          </Pressable>
        </View>
      );
    }
    if (!activeRoute) {
      return (
        <View className="items-center" style={{ marginTop: vs(48), gap: vs(6) }}>
          <Text className="font-poppins-semibold text-[#1E293B]" style={{ fontSize: fs(16) }}>
            No approved route yet
          </Text>
          <Text className="text-center font-poppins-regular text-[#6A7282]" style={{ fontSize: fs(14) }}>
            Your scheduled route's departures will appear here once it is approved.
          </Text>
        </View>
      );
    }
    return (
      <>
        <LinearGradient
          colors={['#FAF5FF', '#F3E8FF']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ borderRadius: s(16), padding: s(18) }}
        >
          <Text className="font-poppins-medium text-[#8200DB]" style={{ fontSize: fs(13) }}>
            {routes.length > 1 ? 'Your routes' : 'Your route'}
          </Text>
          {routes.length > 1 ? (
            <View className="flex-row flex-wrap" style={{ gap: s(8), marginTop: vs(10) }}>
              {routes.map(route => {
                const selected = route.id === activeRoute.id;
                return (
                  <Pressable
                    key={route.id}
                    onPress={() => { setRouteId(route.id); setPickedDate(null); }}
                    disabled={savingId !== null}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: selected }}
                    className={`rounded-full ${selected ? 'bg-[#9810FA]' : 'bg-white'}`}
                    style={{ paddingHorizontal: s(14), paddingVertical: vs(8) }}
                  >
                    <Text
                      className={`font-poppins-medium ${selected ? 'text-white' : 'text-[#1E293B]'}`}
                      style={{ fontSize: fs(14) }}
                    >
                      {route.name}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          ) : (
            <Text
              className="font-poppins-semibold text-[#1E293B]"
              style={{ fontSize: fs(16), lineHeight: fs(22), marginTop: vs(2) }}
              numberOfLines={2}
            >
              {activeRoute.name}
            </Text>
          )}
          <Text
            className="border-t border-[#E9D4FF] font-poppins-medium text-[#4A5565]"
            style={{ fontSize: fs(13), marginTop: vs(14), paddingTop: vs(12) }}
          >
            {blockedCount > 0
              ? `${plural(blockedCount, 'departure')} blocked ${rangeLabel}`
              : `All departures ${rangeLabel} are open for booking`}
          </Text>
        </LinearGradient>

        <View style={{ marginTop: vs(24) }}>
          <View className="flex-row items-center justify-between" style={{ marginBottom: vs(12) }}>
            <Text className="font-poppins-semibold text-[#1E293B]" style={{ fontSize: fs(16) }}>
              Choose a date
            </Text>
            <Pressable
              onPress={() => setPicker(true)}
              disabled={savingId !== null}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Choose availability date"
              className="flex-row items-center"
              style={{ gap: s(6) }}
            >
              <CalendarIcon size={s(16)} color="#8200DB" />
              <Text className="font-poppins-semibold text-[#8200DB]" style={{ fontSize: fs(14) }}>
                Pick a date
              </Text>
            </Pressable>
          </View>
          {days.length > 0 ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: s(10), paddingHorizontal: s(24) }}
              style={{ marginHorizontal: -s(24) }}
            >
              {days.map(date => (
                <DayChip
                  key={date}
                  date={date}
                  selected={date === selectedDate}
                  blocked={slotsByDate.get(date)!.some(slot => slot.canChange && !slot.available)}
                  onPress={() => setPickedDate(date)}
                />
              ))}
            </ScrollView>
          ) : (
            <Text className="font-poppins-regular text-[#6A7282]" style={{ fontSize: fs(14), lineHeight: fs(20) }}>
              No departures you can change {rangeLabel}. Use Pick a date to look further ahead.
            </Text>
          )}
        </View>

        {picker && (
          <>
            <DateTimePicker
              value={pickerDate(selectedDate ?? istToday())}
              mode="date"
              minimumDate={pickerDate(istToday())}
              onChange={onPickDate}
            />
            {Platform.OS === 'ios' && (
              <Pressable onPress={() => setPicker(false)} accessibilityRole="button">
                <Text className="font-poppins-semibold text-[#9810FA]" style={{ fontSize: fs(14), paddingVertical: vs(10) }}>
                  Done
                </Text>
              </Pressable>
            )}
          </>
        )}

        {selectedDate && (
          <View style={{ marginTop: vs(24), gap: vs(12) }}>
            <View className="flex-row items-baseline justify-between">
              <Text className="font-poppins-semibold text-[#1E293B]" style={{ fontSize: fs(16) }}>
                {longDate(selectedDate)}
              </Text>
              <Text className="font-poppins-regular text-[#6A7282]" style={{ fontSize: fs(12) }}>
                All times IST
              </Text>
            </View>
            {daySlots.length === 0 ? (
              <Text className="font-poppins-regular text-[#6A7282]" style={{ fontSize: fs(14), lineHeight: fs(20) }}>
                Nothing to change on this date. Your route may not run that day, or it is before your first service day (the day after registration).
              </Text>
            ) : daySlots.map(slot => {
              const id = slotId(slot);
              return (
                <SlotCard
                  key={id}
                  slot={slot}
                  saving={savingId === id}
                  disabled={savingId !== null}
                  onToggle={() => confirm(slot)}
                  onSupport={onOpenSupport}
                />
              );
            })}
          </View>
        )}

        <View className="flex-row" style={{ gap: s(10), marginTop: vs(24) }}>
          <InfoCircleIcon size={s(18)} color="#8200DB" />
          <Text
            className="flex-1 font-poppins-regular text-[#6A7282]"
            style={{ fontSize: fs(12), lineHeight: fs(18) }}
          >
            Blocking a departure stops new bookings with you for that trip only. It doesn't change your online status. Trips with confirmed bookings can only be released by support.
          </Text>
        </View>
      </>
    );
  };

  return (
    <View className="flex-1 bg-white">
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      <LinearGradient colors={['#AD46FF', '#9810FA']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
        <SafeAreaView edges={['top']}>
          <View
            className="flex-row items-center"
            style={{ paddingHorizontal: s(24), paddingBottom: vs(16), paddingTop: vs(8), gap: s(16) }}
          >
            <Pressable onPress={onBack} hitSlop={10} accessibilityRole="button" accessibilityLabel="Back">
              <BackArrowIcon size={s(22)} color="white" />
            </Pressable>
            <View className="flex-1">
              <Text className="font-poppins-semibold text-white" style={{ fontSize: fs(20), lineHeight: fs(28) }}>
                Availability
              </Text>
              <Text className="font-poppins-regular text-white/80" style={{ fontSize: fs(14) }}>
                Block departures you can't run
              </Text>
            </View>
          </View>
        </SafeAreaView>
      </LinearGradient>

      {error && data && (
        <View
          className="flex-row items-center bg-[#FEF3C7]"
          style={{ marginHorizontal: s(24), marginTop: vs(12), borderRadius: s(12), paddingHorizontal: s(12), paddingVertical: vs(8), gap: s(8) }}
        >
          <Text className="flex-1 font-poppins-regular text-[#92400E]" style={{ fontSize: fs(12), lineHeight: fs(17) }}>
            Couldn't refresh. What you see may be out of date.
          </Text>
          <Pressable onPress={onRefresh} hitSlop={8} accessibilityRole="button">
            <Text className="font-poppins-semibold text-[#9810FA]" style={{ fontSize: fs(13) }}>
              Retry
            </Text>
          </Pressable>
        </View>
      )}

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: s(24), paddingBottom: vs(32) + insets.bottom }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#9810FA']} tintColor="#9810FA" />
        }
      >
        {body()}
      </ScrollView>
    </View>
  );
}
