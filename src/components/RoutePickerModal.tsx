import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  BackArrowIcon,
  ChevronDownIcon,
} from './icons/ServiceTypeIcons';
import {
  fetchScheduledRoutes,
  checkRouteSchedule,
  type ScheduledRouteApi,
} from '../services/api';

export type ReturnMode = 'none' | 'same' | 'different';

export interface RouteSelection {
  primary: {
    routeId: string;
    routeName: string;
    fromName: string;
    toName: string;
    /** Exact admin-published HH:mm departure time. */
    departureTime: string;
    departureIndex?: number;
  };
  returnMode: ReturnMode;
  /** Set when returnMode === 'same' — return departure time on the same
   *  route. */
  sameReturnDepartureTime?: string;
  sameReturnDepartureIndex?: number;
  sameReturnFromName?: string;
  sameReturnToName?: string;
  /** Set when returnMode === 'different' — driver picked a separate route
   * for the return leg. */
  returnRoute?: {
    routeId: string;
    routeName: string;
    fromName: string;
    toName: string;
    departureTime: string;
  };
}

interface RoutePickerModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (selection: RouteSelection) => void;
  /** Existing selection to pre-fill when re-opening (for "Change route"). */
  initial?: RouteSelection | null;
}

// Format a published time without losing its minutes.
const fmtDepartureLabel = (time: string): string => {
  const [hour, minute] = time.split(':').map(Number);
  const period = hour >= 12 ? 'PM' : 'AM';
  const h12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  return `${h12}:${String(minute).padStart(2, '0')} ${period}`;
};

// Validate saved departure labels before hydrating the picker.
const publishedTime = (hhmm: string): string | null => /^([01]\d|2[0-3]):[0-5]\d$/.test(hhmm) ? hhmm : null;

type Step = 'pick-primary' | 'pick-return';

export function RoutePickerModal({ visible, onClose, onSave, initial }: RoutePickerModalProps) {
  const insets = useSafeAreaInsets();
  const [routes, setRoutes] = useState<ScheduledRouteApi[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [primaryRoute, setPrimaryRoute] = useState<ScheduledRouteApi | null>(null);
  const [primaryIndex, setPrimaryIndex] = useState(-1);
  const [returnMode, setReturnMode] = useState<'none' | 'same'>('none');
  const [returnIndex, setReturnIndex] = useState(-1);
  const [fromQuery, setFromQuery] = useState('');
  const [toQuery, setToQuery] = useState('');
  const [visibleCount, setVisibleCount] = useState(10);
  const [checking, setChecking] = useState(false);
  const [allowed, setAllowed] = useState(false);
  const [checkError, setCheckError] = useState<string | null>(null);
  const [checkAttempt, setCheckAttempt] = useState(0);
  useEffect(() => {
    if (!visible) return;
    let cancelled = false;
    setLoadError(null); setRoutes(null); setPrimaryRoute(null); setPrimaryIndex(-1);
    setReturnMode('none'); setReturnIndex(-1); setFromQuery(''); setToQuery('');
    fetchScheduledRoutes().then(result => {
      if (cancelled) return;
      setRoutes(result);
      const saved = result.find(route => route._id === initial?.primary.routeId);
      if (saved && initial) {
        const restore = (index: number | undefined, time: string | undefined, returning: boolean) => {
          const slots = saved.schedule?.departures ?? [];
          if (index !== undefined && slots[index]?.time === time && (slots[index].direction === 'return') === returning) return index;
          const matches = slots.map((slot, i) => slot.time === time && (slot.direction === 'return') === returning ? i : -1).filter(i => i >= 0);
          return matches.length === 1 ? matches[0] : -1;
        };
        setPrimaryRoute(saved); setPrimaryIndex(restore(initial.primary.departureIndex, initial.primary.departureTime, false));
        if (initial.returnMode === 'same') { setReturnMode('same'); setReturnIndex(restore(initial.sameReturnDepartureIndex, initial.sameReturnDepartureTime, true)); }
      }
    }).catch(error => { if (!cancelled) setLoadError(error?.message ?? 'Could not load routes.'); });
    return () => { cancelled = true; };
  }, [visible, initial]);
  useEffect(() => setVisibleCount(10), [fromQuery, toQuery]);
  const filtered = useMemo(() => (routes ?? []).filter(route => {
    const matches = (query: string) => {
      const value = query.trim().toLowerCase();
      return !value || route.name.toLowerCase().includes(value) || route.stops.some(stop => /^\d+$/.test(value)
        ? stop.pincode?.startsWith(value) : stop.name.toLowerCase().includes(value));
    };
    return matches(fromQuery) && matches(toQuery);
  }), [routes, fromQuery, toQuery]);
  const primaryTime = primaryRoute?.schedule?.departures[primaryIndex]?.time;
  const returnTime = primaryRoute?.schedule?.departures[returnIndex]?.time;
  const complete = !!primaryRoute && primaryIndex >= 0 && (returnMode === 'none' || returnIndex >= 0);
  useEffect(() => {
    setAllowed(false); setCheckError(null);
    if (!visible || !complete || !primaryRoute) return;
    let cancelled = false;
    setChecking(true);
    checkRouteSchedule(primaryRoute._id, { departureIndex: primaryIndex, roundTrip: returnMode === 'same',
      ...(returnMode === 'same' ? { returnDepartureIndex: returnIndex } : {}) })
      .then(() => { if (!cancelled) setAllowed(true); })
      .catch(error => { if (!cancelled) setCheckError(error?.message ?? 'Could not check these departures.'); })
      .finally(() => { if (!cancelled) setChecking(false); });
    return () => { cancelled = true; };
  }, [visible, complete, primaryRoute, primaryIndex, returnIndex, returnMode, checkAttempt]);
  const save = () => {
    if (!complete || !allowed || checking || !primaryRoute || !primaryTime) return;
    onSave({ primary: { routeId: primaryRoute._id, routeName: primaryRoute.name,
      fromName: primaryRoute.stops[primaryRoute.schedule!.departures[primaryIndex].stopIndex]?.name ?? '', toName: primaryRoute.stops[primaryRoute.stops.length - 1]?.name ?? '',
      departureTime: primaryTime, departureIndex: primaryIndex }, returnMode,
      ...(returnMode === 'same' ? { sameReturnDepartureTime: returnTime!, sameReturnDepartureIndex: returnIndex,
        sameReturnFromName: primaryRoute.stops[primaryRoute.schedule!.departures[returnIndex].stopIndex]?.name ?? '', sameReturnToName: primaryRoute.stops[0]?.name ?? '' } : {}) });
  };
  return <Modal visible={visible} animationType="slide" onRequestClose={onClose} transparent={false}>
    <View className="flex-1 bg-white">
      <SafeAreaView edges={['top']} className="bg-[#0097B3]">
        <View className="flex-row items-center gap-3 px-4 pb-3 pt-2">
          <Pressable onPress={onClose} hitSlop={10}><BackArrowIcon size={22} color="white" /></Pressable>
          <Text className="flex-1 text-[18px] font-poppins-semibold text-white">Pick your route & departures</Text>
        </View>
      </SafeAreaView>
      {!primaryRoute ? <RouteSearchList routes={filtered} allRoutes={routes} loadError={loadError} fromQuery={fromQuery} toQuery={toQuery}
        onFromChange={setFromQuery} onToChange={setToQuery} visibleCount={visibleCount} onLoadMore={() => setVisibleCount(value => value + 10)}
        onPick={route => { setPrimaryRoute(route); setPrimaryIndex(-1); setReturnMode('none'); setReturnIndex(-1); }} />
        : <RouteDetailPane route={primaryRoute} selectedIndex={primaryIndex} onSelectIndex={setPrimaryIndex}
          onBackToList={() => { setPrimaryRoute(null); setPrimaryIndex(-1); }} footer={<>
            <Text className="text-xs text-[#6A7282]">Minimum one-way journey: {primaryRoute.schedule?.minimumJourneyMinutes ?? 'admin setup required'} minutes. Turnaround gap: {primaryRoute.schedule?.turnaroundMinutes ?? 0} minutes.</Text>
            <ReturnTripSection route={primaryRoute} returnMode={returnMode} onChangeMode={mode => setReturnMode(mode === 'same' ? 'same' : 'none')}
              sameReturnIndex={returnIndex} onChangeSameReturnIndex={setReturnIndex} />
          </>} />}
      <View className="border-t border-[#EBEBEB] bg-white px-4 pt-3" style={{ paddingBottom: Math.max(insets.bottom, 12) + 12 }}>
        {checking && complete && <Text className="mb-2 text-sm text-[#00647A]">Checking your timetable…</Text>}
        {checkError && <Pressable onPress={() => setCheckAttempt(value => value + 1)}><Text accessibilityRole="alert" className="mb-2 text-sm text-red-600">{checkError} Tap to check again.</Text></Pressable>}
        <Pressable disabled={!complete || !allowed || checking} onPress={save} className="h-12 items-center justify-center rounded-2xl"
          style={{ backgroundColor: complete && allowed && !checking ? '#0097B3' : '#9DD7E0' }}>
          <Text className="text-base font-poppins-medium text-white">Save selection</Text>
        </Pressable>
      </View>
    </View>
  </Modal>;
}
// ────────────────── Sub-components ──────────────────

function RouteSearchList({
  routes,
  allRoutes,
  loadError,
  fromQuery,
  toQuery,
  onFromChange,
  onToChange,
  onPick,
  hint,
  visibleCount,
  onLoadMore,
}: {
  routes: ScheduledRouteApi[];
  allRoutes: ScheduledRouteApi[] | null;
  loadError: string | null;
  fromQuery: string;
  toQuery: string;
  onFromChange: (v: string) => void;
  onToChange: (v: string) => void;
  onPick: (r: ScheduledRouteApi) => void;
  hint?: string;
  /** How many filtered routes the parent has asked us to render. */
  visibleCount: number;
  /** Called once when the user scrolls within ~80px of the bottom and
   *  there are more routes available beyond the current `visibleCount`. */
  onLoadMore: () => void;
}) {
  const visible = routes.slice(0, visibleCount);
  const hasMore = routes.length > visible.length;
  return (
    <View className="flex-1">
      <View className="gap-2 border-b border-[#EBEBEB] bg-white px-4 py-3">
        <TextInput
          value={fromQuery}
          onChangeText={onFromChange}
          placeholder="From (start point)"
          placeholderTextColor="#717182"
          className="h-11 rounded-xl bg-[#F3F3F5] px-3 text-sm text-slate-900"
        />
        <TextInput
          value={toQuery}
          onChangeText={onToChange}
          placeholder="To (end point)"
          placeholderTextColor="#717182"
          className="h-11 rounded-xl bg-[#F3F3F5] px-3 text-sm text-slate-900"
        />
      </View>

      {loadError ? (
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-base text-[#E02D3C]">{loadError}</Text>
        </View>
      ) : allRoutes === null ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#0097B3" />
        </View>
      ) : routes.length === 0 ? (
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-base font-poppins-semibold text-[#1E293B]">
            No matching routes
          </Text>
          <Text className="mt-2 text-center text-sm text-[#6A7282]">
            Try clearing the search or check back later.
          </Text>
        </View>
      ) : (
        <ScrollView
          contentContainerClassName="px-4 pb-6 pt-3 gap-3"
          onScroll={({ nativeEvent }) => {
            // Trigger pagination once we're within ~80px of the bottom.
            // Using onScroll (not onMomentumScrollEnd) so slow drags also
            // load — important on Android where momentum events are rarer.
            if (!hasMore) return;
            const { layoutMeasurement, contentOffset, contentSize } = nativeEvent;
            const distanceFromBottom =
              contentSize.height -
              (contentOffset.y + layoutMeasurement.height);
            if (distanceFromBottom < 80) onLoadMore();
          }}
          scrollEventThrottle={200}
        >
          {hint ? (
            <Text className="px-1 text-xs text-[#6A7282]">{hint}</Text>
          ) : null}
          {visible.map(r => {
            const first = r.stops[0];
            const last = r.stops[r.stops.length - 1];
            const slots = r.schedule?.departures?.length ?? 0;
            return (
              <Pressable
                key={r._id}
                onPress={() => onPick(r)}
                className="rounded-2xl border border-[#EBEBEB] bg-white p-4"
              >
                <Text className="text-base font-poppins-bold text-[#1E293B]">{r.name}</Text>
                <View className="mt-3 flex-row items-start gap-3">
                  <View className="items-center pt-1">
                    <View className="h-2.5 w-2.5 rounded-full bg-[#00C950]" />
                    <View className="my-1 h-6 w-0.5 bg-[#D1D5DC]" />
                    <View className="h-2.5 w-2.5 rounded-full bg-[#FB2C36]" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-sm font-poppins-medium text-[#1E293B]">
                      {first?.name}
                    </Text>
                    <Text className="mt-3 text-sm font-poppins-medium text-[#1E293B]">
                      {last?.name}
                    </Text>
                  </View>
                </View>
                <View className="mt-3 flex-row items-center gap-3 border-t border-[#F3F4F6] pt-3">
                  <Text className="text-xs text-[#6A7282]">
                    {r.stops.length} stops
                  </Text>
                  <View className="h-3 w-px bg-[#D1D5DC]" />
                  <Text className="text-xs text-[#6A7282]">
                    {slots} departure{slots === 1 ? '' : 's'}
                  </Text>
                </View>
              </Pressable>
            );
          })}
          {hasMore && (
            <View className="items-center py-3">
              <ActivityIndicator color="#0097B3" />
              <Text className="mt-1 text-[11px] text-[#6A7282]">
                Loading more routes…
              </Text>
            </View>
          )}
          {!hasMore && routes.length > PAGE_SIZE_HINT && (
            <Text className="py-2 text-center text-[11px] text-[#9CA3AF]">
              That's everything.
            </Text>
          )}
        </ScrollView>
      )}
    </View>
  );
}

const PAGE_SIZE_HINT = 10;

/**
 * Only admin-published departure times can be selected.
 */
function DepartureGrid({
  departures,
  selectedIndex,
  onSelectIndex,
}: {
  departures: { index: number; time: string; origin?: string }[];
  selectedIndex: number;
  onSelectIndex: (index: number) => void;
}) {
  return (
    <View className="mt-2 flex-row flex-wrap gap-2">
      {[...departures].sort((a, b) => a.time.localeCompare(b.time)).map(({ index, time, origin }) => {
        const isSelected = selectedIndex === index;
        return (
          <Pressable
            key={index}
            onPress={() => onSelectIndex(index)}
            className="rounded-xl border-2 px-3 py-2"
            style={{
              borderColor: isSelected ? '#0097B3' : '#D3DDE7',
              backgroundColor: isSelected ? 'rgba(0,151,179,0.08)' : 'white',
            }}
          >
            <Text
              className="text-sm font-poppins-bold"
              style={{ color: isSelected ? '#0097B3' : '#1E293B' }}
            >
              {fmtDepartureLabel(time)}
            </Text>
            <Text className="text-xs text-[#6A7282]">From {origin}</Text>
          </Pressable>
        );
      })}
      {departures.length === 0 && <Text className="text-sm text-[#6A7282]">No departure times published. Contact support.</Text>}
    </View>
  );
}

function RouteDetailPane({
  route,
  selectedIndex,
  onSelectIndex,
  onBackToList,
  footer,
}: {
  route: ScheduledRouteApi;
  selectedIndex: number;
  onSelectIndex: (index: number) => void;
  onBackToList: () => void;
  footer: React.ReactNode;
}) {
  const first = route.stops[0];
  const last = route.stops[route.stops.length - 1];

  return (
    <ScrollView contentContainerClassName="px-4 py-4 gap-4">
      <Pressable onPress={onBackToList} className="self-start">
        <Text className="text-xs font-poppins-medium text-[#0097B3]">
          ← Pick a different route
        </Text>
      </Pressable>

      <View>
        <Text className="text-base font-poppins-bold text-[#1E293B]">{route.name}</Text>
        <View className="mt-3 flex-row items-start gap-3">
          <View className="items-center pt-1">
            <View className="h-2.5 w-2.5 rounded-full bg-[#00C950]" />
            <View className="my-1 h-6 w-0.5 bg-[#D1D5DC]" />
            <View className="h-2.5 w-2.5 rounded-full bg-[#FB2C36]" />
          </View>
          <View className="flex-1">
            <Text className="text-sm font-poppins-medium text-[#1E293B]">
              {first?.name}
            </Text>
            <Text className="mt-3 text-sm font-poppins-medium text-[#1E293B]">
              {last?.name}
            </Text>
          </View>
        </View>
      </View>

      <View>
        <Text className="text-sm font-poppins-bold text-[#1E293B]">
          Pick a departure time
        </Text>
        <DepartureGrid
          departures={(route.schedule?.departures ?? []).map((slot, index) => ({ ...slot, index, origin: route.stops[slot.stopIndex]?.name })).filter(slot => slot.direction !== 'return')}
          selectedIndex={selectedIndex}
          onSelectIndex={onSelectIndex}
        />
      </View>

      {footer}
    </ScrollView>
  );
}

function ReturnTripSection({ route, returnMode, onChangeMode, sameReturnIndex, onChangeSameReturnIndex }: {
  route: ScheduledRouteApi; returnMode: ReturnMode; onChangeMode: (mode: ReturnMode) => void;
  sameReturnIndex: number; onChangeSameReturnIndex: (index: number) => void;
}) {
  return <View className="gap-3">
    <View className="rounded-2xl border border-[#EBEBEB] p-4">
      <View className="flex-row items-center justify-between">
        <Text className="flex-1 text-sm font-poppins-medium text-[#1E293B]">Add a return departure on this route</Text>
        <Switch value={returnMode === 'same'} onValueChange={value => onChangeMode(value ? 'same' : 'none')} />
      </View>
      <Text className="mt-2 text-xs text-[#6A7282]">Only one route is allowed. Return trips use this route’s published return departures.</Text>
    </View>
    {returnMode === 'same' && <View className="rounded-2xl border border-[#EBEBEB] p-4">
      <Text className="text-sm font-poppins-medium text-[#1E293B]">Return departure time</Text>
      <DepartureGrid departures={(route.schedule?.departures ?? []).map((slot, index) => ({ ...slot, index, origin: route.stops[slot.stopIndex]?.name })).filter(slot => slot.direction === 'return')}
        selectedIndex={sameReturnIndex} onSelectIndex={onChangeSameReturnIndex} />
    </View>}
  </View>;
}
function Radio({ selected }: { selected: boolean }) {
  return (
    <View
      className="h-5 w-5 items-center justify-center rounded-full border-2"
      style={{ borderColor: selected ? '#0097B3' : '#D3DDE7' }}
    >
      {selected && (
        <View
          className="h-2.5 w-2.5 rounded-full"
          style={{ backgroundColor: '#0097B3' }}
        />
      )}
    </View>
  );
}

export default RoutePickerModal;
