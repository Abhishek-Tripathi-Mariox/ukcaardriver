import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, AppState, Platform, Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BackArrowIcon } from '../components/icons/ServiceTypeIcons';
import { fetchDriverAvailability, setDepartureAvailability, type DriverAvailabilityData, type AvailabilitySlot } from '../services/api';

const istToday = () => new Date(Date.now() + 330 * 60000).toISOString().slice(0, 10);
const pickerDate = (date: string) => new Date(`${date}T12:00:00`);

export function AvailabilityScreen({ onBack, onOpenSupport }: { onBack: () => void; onOpenSupport?: () => void }) {
  const [date, setDate] = useState(istToday);
  const [routeId, setRouteId] = useState('');
  const [picker, setPicker] = useState(false);
  const [data, setData] = useState<DriverAvailabilityData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const generation = useRef(0);
  const load = useCallback(async () => {
    const requestId = ++generation.current;
    setLoading(true);
    try {
      const result = await fetchDriverAvailability(date);
      if (requestId === generation.current) { setData(result); setError(null); }
    } catch (err: any) {
      if (requestId === generation.current) { setError(err.message || 'Could not load availability.'); setData(null); }
    } finally { if (requestId === generation.current) setLoading(false); }
  }, [date]);
  useEffect(() => {
    setData(null);
    load();
    const sub = AppState.addEventListener('change', state => { if (state === 'active') load(); });
    const timer = setInterval(load, 15000);
    return () => { generation.current++; sub.remove(); clearInterval(timer); };
  }, [load]);
  const routes = [...new Map((data?.assignments ?? []).map(assignment => [assignment.routeId, assignment])).values()];
  const selectedRoute = routes.some(route => route.routeId === routeId) ? routeId : routes[0]?.routeId;
  const showConflict = (message: string) => {
    if (onOpenSupport) Alert.alert('Contact support', message, [{ text: 'Close', style: 'cancel' }, { text: 'Contact support', onPress: onOpenSupport }]);
    else Alert.alert('Contact support', message);
  };
  const save = async (slot: AvailabilitySlot) => {
    setSaving(true);
    try {
      await setDepartureAvailability(slot, !slot.available);
      await load();
    } catch (err: any) {
      if (err.status === 409) showConflict(err.message);
      else Alert.alert('Availability not changed', err.message || 'Please refresh and try again.');
      await load();
    }
    finally { setSaving(false); }
  };
  const confirm = (slot: AvailabilitySlot) => {
    if (slot.available && (slot.bookings > 0 || slot.running)) {
      showConflict(slot.running ? 'Finish this running journey first.' : `${slot.bookings} confirmed booking(s) must be resolved by support first.`); return;
    }
    Alert.alert(slot.available ? 'Mark unavailable?' : 'Make available?',
      `${slot.routeName}\n${slot.departureDate} at ${slot.departureTime} IST`,
      [{ text: 'Cancel', style: 'cancel' }, { text: 'Confirm', onPress: () => save(slot) }]);
  };
  return <SafeAreaView className="flex-1 bg-[#F8FAFC]">
    <View className="flex-row items-center gap-4 bg-white p-5">
      <Pressable accessibilityLabel="Back" onPress={onBack}><BackArrowIcon size={24} color="#0097B3" /></Pressable>
      <Text className="text-xl font-poppins-semibold text-slate-900">Availability</Text>
    </View>
    <ScrollView contentContainerStyle={{ padding: 20 }} refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}>
      <Text className="mb-4 text-sm text-slate-600">Choose the route, date and departure you cannot operate. All times are IST. Confirmed bookings must be resolved by support first.</Text>
      <Text className="mb-2 font-poppins-semibold text-slate-900">Route</Text>
      {routes.map(route => <Pressable key={route.routeId} disabled={saving} onPress={() => setRouteId(route.routeId)} accessibilityRole="radio" accessibilityState={{ checked: selectedRoute === route.routeId }} className={`mb-2 rounded-xl border p-4 ${selectedRoute === route.routeId ? 'border-brand-teal bg-cyan-50' : 'border-slate-200 bg-white'}`}>
        <Text className="font-poppins-medium text-slate-900">{route.routeName}</Text>
      </Pressable>)}
      {!loading && !error && !routes.length && <Text className="mb-4 text-slate-600">Your approved scheduled routes will appear here after approval.</Text>}
      <Text className="mb-2 mt-3 font-poppins-semibold text-slate-900">Date</Text>
      <Pressable accessibilityRole="button" accessibilityLabel="Choose availability date" disabled={saving} onPress={() => setPicker(true)} className="mb-4 rounded-xl border border-slate-200 bg-white p-4"><Text className="text-slate-900">{date} · IST</Text></Pressable>
      {picker && <>
        <DateTimePicker value={pickerDate(date)} mode="date" minimumDate={pickerDate(istToday())} onChange={(_, picked) => {
          if (Platform.OS !== 'ios') setPicker(false);
          if (picked) { setData(null); setDate(`${picked.getFullYear()}-${String(picked.getMonth() + 1).padStart(2, '0')}-${String(picked.getDate()).padStart(2, '0')}`); }
        }} />
        {Platform.OS === 'ios' && <Pressable onPress={() => setPicker(false)}><Text className="p-3 text-brand-teal">Done</Text></Pressable>}
      </>}
      {loading && !data && <ActivityIndicator color="#0097B3" />}
      {error && <Text accessibilityRole="alert" className="mb-4 text-red-600">{error}</Text>}
      <Text className="mb-3 font-poppins-semibold text-slate-900">Published departures</Text>
      {(data?.slots ?? []).filter(slot => slot.routeId === selectedRoute).map(slot => <View key={`${slot.routeId}-${slot.departureIndex}-${slot.departureDate}`} className="mb-3 rounded-2xl border border-slate-200 bg-white p-4">
        <Text className="text-lg font-poppins-semibold text-slate-900">{slot.departureTime} IST</Text>
        <Text className="my-2 text-slate-600">{slot.available ? 'Available' : 'Unavailable'} · {slot.bookedSeats} booked seat(s)</Text>
        {slot.running && <Text className="mb-2 text-amber-700">Journey running</Text>}
        <Pressable accessibilityRole="button" disabled={saving || loading || !slot.canChange} onPress={() => confirm(slot)} className={`rounded-xl p-3 ${saving || loading || !slot.canChange ? 'bg-slate-200' : 'bg-brand-teal'}`}>
          <Text className="text-center font-poppins-medium text-white">{slot.canChange ? slot.available ? 'Mark unavailable' : 'Make available' : 'Changes closed'}</Text>
        </Pressable>
      </View>)}
      {!loading && data && !data.slots.some(slot => slot.routeId === selectedRoute) && <Text className="text-slate-600">No assigned departures operate on this date. Choose another operating date after your route registration day.</Text>}
      <Text className="mt-4 text-xs text-slate-500">Making a departure available restores normal booking eligibility. It does not change your online status.</Text>
    </ScrollView>
  </SafeAreaView>;
}
