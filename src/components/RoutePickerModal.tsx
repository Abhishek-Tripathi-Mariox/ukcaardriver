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
  type ScheduledRouteApi,
} from '../services/api';

export type ReturnMode = 'none' | 'same' | 'different';

export interface RouteSelection {
  primary: {
    routeId: string;
    routeName: string;
    fromName: string;
    toName: string;
    /** 24h "HH:mm" — the hour the driver picked. The backend reuses an
     *  existing admin departure at this time if one exists, otherwise it
     *  appends a new slot. */
    departureTime: string;
  };
  returnMode: ReturnMode;
  /** Set when returnMode === 'same' — return departure time on the same
   *  route. */
  sameReturnDepartureTime?: string;
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

// Format an integer hour (0–23) as "9 AM" / "12 PM" style label.
const fmtHourLabel = (hour: number): string => {
  const period = hour >= 12 ? 'PM' : 'AM';
  const h12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  return `${h12} ${period}`;
};

// Parse the leading hour out of an "HH:mm" departure time string.
const hourOf = (hhmm: string): number => {
  const [h] = hhmm.split(':').map(Number);
  return Number.isNaN(h) ? -1 : h;
};

type Step = 'pick-primary' | 'pick-return';

export function RoutePickerModal({
  visible,
  onClose,
  onSave,
  initial,
}: RoutePickerModalProps) {
  const insets = useSafeAreaInsets();
  const [routes, setRoutes] = useState<ScheduledRouteApi[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [fromQuery, setFromQuery] = useState('');
  const [toQuery, setToQuery] = useState('');
  const [step, setStep] = useState<Step>('pick-primary');
  // Page through the filtered route list 10 at a time so we don't render
  // dozens of cards eagerly. Resets whenever the filter inputs change.
  const PAGE_SIZE = 10;
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  // Primary leg selection — `Hour` values are 0..23 (free-form, NOT
  // constrained to admin-defined slots). The backend creates a new slot
  // for any hour not already in the route's schedule.
  const [primaryRoute, setPrimaryRoute] = useState<ScheduledRouteApi | null>(null);
  const [primaryDepartureHour, setPrimaryDepartureHour] = useState<number | null>(null);
  const [returnMode, setReturnMode] = useState<ReturnMode>('none');
  const [sameReturnDepartureHour, setSameReturnDepartureHour] = useState<number | null>(null);

  // Different return route selection
  const [returnRoute, setReturnRoute] = useState<ScheduledRouteApi | null>(null);
  const [returnDepartureHour, setReturnDepartureHour] = useState<number | null>(null);

  // Reset pagination whenever filters change OR the user switches between
  // primary and return-route picking screens.
  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [fromQuery, toQuery, step]);

  // Reset state whenever the modal opens. If there's a prior selection we
  // re-hydrate from it; otherwise everything starts blank.
  useEffect(() => {
    if (!visible) return;
    if (initial) {
      // Hydrate primary leg. We need the full route object — wait until
      // routes are fetched (handled in the next effect) and match by id.
      setReturnMode(initial.returnMode);
      setSameReturnDepartureHour(
        initial.sameReturnDepartureTime
          ? hourOf(initial.sameReturnDepartureTime)
          : null,
      );
    } else {
      setPrimaryRoute(null);
      setPrimaryDepartureHour(null);
      setReturnMode('none');
      setSameReturnDepartureHour(null);
      setReturnRoute(null);
      setReturnDepartureHour(null);
    }
    setStep('pick-primary');
    setFromQuery('');
    setToQuery('');
  }, [visible, initial]);

  // Fetch routes once when the modal first opens.
  useEffect(() => {
    if (!visible || routes !== null) return;
    let cancelled = false;
    fetchScheduledRoutes()
      .then(rs => {
        if (cancelled) return;
        setRoutes(rs);
      })
      .catch(err => {
        if (cancelled) return;
        console.warn('[RoutePickerModal] fetch failed:', err);
        setLoadError(err?.message ?? 'Could not load routes');
      });
    return () => {
      cancelled = true;
    };
  }, [visible, routes]);

  // Once routes are loaded, hydrate the saved selection's route objects.
  useEffect(() => {
    if (!routes || !initial) return;
    const pri = routes.find(r => r._id === initial.primary.routeId) ?? null;
    setPrimaryRoute(pri);
    setPrimaryDepartureHour(
      pri && initial.primary.departureTime
        ? hourOf(initial.primary.departureTime)
        : null,
    );
    if (initial.returnMode === 'different' && initial.returnRoute) {
      const ret = routes.find(r => r._id === initial.returnRoute!.routeId) ?? null;
      setReturnRoute(ret);
      setReturnDepartureHour(
        ret && initial.returnRoute.departureTime
          ? hourOf(initial.returnRoute.departureTime)
          : null,
      );
    }
  }, [routes, initial]);

  const filtered = useMemo(() => {
    if (!routes) return [];
    const f = fromQuery.trim().toLowerCase();
    const t = toQuery.trim().toLowerCase();
    if (!f && !t) return routes;
    // A query is treated as a pincode lookup if it's all digits. A digit
    // query in "From" matches the start stop's pincode OR ANY stop along
    // the route (so drivers can find a route by an intermediate PIN too).
    // "To" digit query matches the end stop or any stop. Non-digit queries
    // continue to substring-match against stop name / route name.
    const isDigits = (s: string) => /^\d+$/.test(s);
    return routes.filter(r => {
      const stops = r.stops ?? [];
      const first = stops[0];
      const last = stops[stops.length - 1];
      const routeName = r.name.toLowerCase();
      const fromOk = !f
        ? true
        : isDigits(f)
          ? (first?.pincode?.startsWith(f) ?? false) ||
            stops.some(s => s.pincode?.startsWith(f))
          : (first?.name?.toLowerCase().includes(f) ?? false) ||
            routeName.includes(f);
      const toOk = !t
        ? true
        : isDigits(t)
          ? (last?.pincode?.startsWith(t) ?? false) ||
            stops.some(s => s.pincode?.startsWith(t))
          : (last?.name?.toLowerCase().includes(t) ?? false) ||
            routeName.includes(t);
      return fromOk && toOk;
    });
  }, [routes, fromQuery, toQuery]);

  const hourToHHMM = (h: number) => `${String(h).padStart(2, '0')}:00`;

  const handleSave = () => {
    if (!primaryRoute || primaryDepartureHour === null) return;
    if (returnMode === 'same' && sameReturnDepartureHour === null) return;
    if (
      returnMode === 'different' &&
      (!returnRoute || returnDepartureHour === null)
    ) {
      return;
    }
    const primaryFirst = primaryRoute.stops[0];
    const primaryLast = primaryRoute.stops[primaryRoute.stops.length - 1];

    const selection: RouteSelection = {
      primary: {
        routeId: primaryRoute._id,
        routeName: primaryRoute.name,
        fromName: primaryFirst?.name ?? '',
        toName: primaryLast?.name ?? '',
        departureTime: hourToHHMM(primaryDepartureHour),
      },
      returnMode,
    };
    if (returnMode === 'same' && sameReturnDepartureHour !== null) {
      selection.sameReturnDepartureTime = hourToHHMM(sameReturnDepartureHour);
    }
    if (
      returnMode === 'different' &&
      returnRoute &&
      returnDepartureHour !== null
    ) {
      const rFirst = returnRoute.stops[0];
      const rLast = returnRoute.stops[returnRoute.stops.length - 1];
      selection.returnRoute = {
        routeId: returnRoute._id,
        routeName: returnRoute.name,
        fromName: rFirst?.name ?? '',
        toName: rLast?.name ?? '',
        departureTime: hourToHHMM(returnDepartureHour),
      };
    }
    onSave(selection);
  };

  const canSave =
    !!primaryRoute &&
    primaryDepartureHour !== null &&
    (returnMode === 'none' ||
      (returnMode === 'same' && sameReturnDepartureHour !== null) ||
      (returnMode === 'different' &&
        !!returnRoute &&
        returnDepartureHour !== null));

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
      transparent={false}
    >
      <View className="flex-1 bg-white">
        <SafeAreaView edges={['top']} className="bg-[#0097B3]">
          <View className="flex-row items-center gap-3 px-4 pb-3 pt-2">
            <Pressable onPress={onClose} hitSlop={10}>
              <BackArrowIcon size={22} color="white" />
            </Pressable>
            <Text className="flex-1 text-[18px] font-poppins-semibold text-white">
              {step === 'pick-return' ? 'Pick return route' : 'Pick your route'}
            </Text>
          </View>
        </SafeAreaView>

        {step === 'pick-primary' && !primaryRoute && (
          <RouteSearchList
            routes={filtered}
            allRoutes={routes}
            loadError={loadError}
            fromQuery={fromQuery}
            toQuery={toQuery}
            onFromChange={setFromQuery}
            onToChange={setToQuery}
            visibleCount={visibleCount}
            onLoadMore={() => setVisibleCount(c => c + PAGE_SIZE)}
            onPick={r => {
              setPrimaryRoute(r);
              setPrimaryDepartureHour(null);
            }}
          />
        )}

        {step === 'pick-primary' && primaryRoute && (
          <RouteDetailPane
            route={primaryRoute}
            selectedHour={primaryDepartureHour}
            onSelectHour={setPrimaryDepartureHour}
            onBackToList={() => {
              setPrimaryRoute(null);
              setPrimaryDepartureHour(null);
            }}
            footer={
              <ReturnTripSection
                route={primaryRoute}
                returnMode={returnMode}
                onChangeMode={setReturnMode}
                sameReturnHour={sameReturnDepartureHour}
                onChangeSameReturnHour={setSameReturnDepartureHour}
                returnRoute={returnRoute}
                onPickDifferentReturn={() => setStep('pick-return')}
                onClearDifferentReturn={() => {
                  setReturnRoute(null);
                  setReturnDepartureHour(null);
                }}
                returnHour={returnDepartureHour}
                onChangeReturnHour={setReturnDepartureHour}
              />
            }
          />
        )}

        {step === 'pick-return' && !returnRoute && (
          <RouteSearchList
            routes={filtered}
            allRoutes={routes}
            loadError={loadError}
            fromQuery={fromQuery}
            toQuery={toQuery}
            onFromChange={setFromQuery}
            onToChange={setToQuery}
            visibleCount={visibleCount}
            onLoadMore={() => setVisibleCount(c => c + PAGE_SIZE)}
            onPick={r => {
              setReturnRoute(r);
              setReturnDepartureHour(null);
              setStep('pick-primary');
            }}
            hint="Pick the route you'll drive on the way back."
          />
        )}

        {/* Save bar (only on pick-primary). */}
        {step === 'pick-primary' && (
          <View
            className="border-t border-[#EBEBEB] bg-white px-4 pt-3"
            style={{ paddingBottom: Math.max(insets.bottom, 12) + 12 }}
          >
            <Pressable
              disabled={!canSave}
              onPress={handleSave}
              className="h-12 items-center justify-center rounded-2xl"
              style={{ backgroundColor: canSave ? '#0097B3' : '#9DD7E0' }}
            >
              <Text className="text-base font-poppins-medium text-white">Save selection</Text>
            </Pressable>
          </View>
        )}
      </View>
    </Modal>
  );
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
 * 24-hour chip grid. Every hour is selectable — the driver picks any time
 * that suits them, regardless of what the admin pre-scheduled. The chosen
 * hour is sent to the backend as `departureTime: "HH:00"`; the backend
 * either reuses a matching admin slot or appends a new one.
 */
function HourlyDepartureGrid({
  selectedHour,
  onSelectHour,
}: {
  selectedHour: number | null;
  onSelectHour: (h: number) => void;
}) {
  return (
    <View className="mt-2 flex-row flex-wrap gap-2">
      {Array.from({ length: 24 }, (_, hour) => {
        const isSelected = selectedHour === hour;
        return (
          <Pressable
            key={hour}
            onPress={() => onSelectHour(hour)}
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
              {fmtHourLabel(hour)}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function RouteDetailPane({
  route,
  selectedHour,
  onSelectHour,
  onBackToList,
  footer,
}: {
  route: ScheduledRouteApi;
  selectedHour: number | null;
  onSelectHour: (h: number) => void;
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
        <HourlyDepartureGrid
          selectedHour={selectedHour}
          onSelectHour={onSelectHour}
        />
      </View>

      {footer}
    </ScrollView>
  );
}

function ReturnTripSection({
  route,
  returnMode,
  onChangeMode,
  sameReturnHour,
  onChangeSameReturnHour,
  returnRoute,
  onPickDifferentReturn,
  onClearDifferentReturn,
  returnHour,
  onChangeReturnHour,
}: {
  route: ScheduledRouteApi;
  returnMode: ReturnMode;
  onChangeMode: (m: ReturnMode) => void;
  sameReturnHour: number | null;
  onChangeSameReturnHour: (h: number) => void;
  returnRoute: ScheduledRouteApi | null;
  onPickDifferentReturn: () => void;
  onClearDifferentReturn: () => void;
  returnHour: number | null;
  onChangeReturnHour: (h: number) => void;
}) {
  return (
    <View className="gap-3">
      <View className="rounded-2xl border border-[#EBEBEB] bg-white p-4">
        <View className="flex-row items-center justify-between">
          <View className="flex-1 pr-3">
            <Text className="text-sm font-poppins-semibold text-[#1E293B]">
              I'll do a return trip
            </Text>
            <Text className="mt-1 text-xs text-[#6A7282]">
              Toggle on if you'll also drive a return leg.
            </Text>
          </View>
          <Switch
            value={returnMode !== 'none'}
            onValueChange={v => onChangeMode(v ? 'same' : 'none')}
            trackColor={{ false: '#CBCED4', true: '#0097B3' }}
          />
        </View>

        {returnMode !== 'none' && (
          <View className="mt-4 gap-2">
            <Pressable
              onPress={() => onChangeMode('same')}
              className="flex-row items-center gap-3 rounded-xl border p-3"
              style={{
                borderColor: returnMode === 'same' ? '#0097B3' : '#D3DDE7',
                backgroundColor:
                  returnMode === 'same' ? 'rgba(0,151,179,0.05)' : 'white',
              }}
            >
              <Radio selected={returnMode === 'same'} />
              <View className="flex-1">
                <Text className="text-sm font-poppins-medium text-[#1E293B]">
                  Same route, reversed
                </Text>
                <Text className="mt-0.5 text-xs text-[#6A7282]">
                  {route.stops[route.stops.length - 1]?.name} →{' '}
                  {route.stops[0]?.name}
                </Text>
              </View>
            </Pressable>

            <Pressable
              onPress={() => onChangeMode('different')}
              className="flex-row items-center gap-3 rounded-xl border p-3"
              style={{
                borderColor: returnMode === 'different' ? '#0097B3' : '#D3DDE7',
                backgroundColor:
                  returnMode === 'different' ? 'rgba(0,151,179,0.05)' : 'white',
              }}
            >
              <Radio selected={returnMode === 'different'} />
              <View className="flex-1">
                <Text className="text-sm font-poppins-medium text-[#1E293B]">
                  Different return route
                </Text>
                <Text className="mt-0.5 text-xs text-[#6A7282]">
                  Pick a separate route for the return leg.
                </Text>
              </View>
            </Pressable>
          </View>
        )}
      </View>

      {returnMode === 'same' && (
        <View className="rounded-2xl border border-[#EBEBEB] bg-white p-4">
          <Text className="text-sm font-poppins-bold text-[#1E293B]">
            Return departure time
          </Text>
          <Text className="mt-1 text-xs text-[#6A7282]">
            Pick the time you'll start the return leg.
          </Text>
          <HourlyDepartureGrid
            selectedHour={sameReturnHour}
            onSelectHour={onChangeSameReturnHour}
          />
        </View>
      )}

      {returnMode === 'different' && (
        <View className="rounded-2xl border border-[#EBEBEB] bg-white p-4">
          <Text className="text-sm font-poppins-bold text-[#1E293B]">
            Return route
          </Text>
          {!returnRoute ? (
            <Pressable
              onPress={onPickDifferentReturn}
              className="mt-3 h-12 flex-row items-center justify-between rounded-xl border border-[#D3DDE7] px-3"
            >
              <Text className="text-sm text-[#717182]">
                Search for a return route
              </Text>
              <ChevronDownIcon size={14} />
            </Pressable>
          ) : (
            <View className="mt-3 gap-2">
              <View className="flex-row items-start justify-between gap-3">
                <View className="flex-1">
                  <Text className="text-sm font-poppins-semibold text-[#1E293B]">
                    {returnRoute.name}
                  </Text>
                  <Text className="mt-0.5 text-xs text-[#6A7282]">
                    {returnRoute.stops[0]?.name} →{' '}
                    {returnRoute.stops[returnRoute.stops.length - 1]?.name}
                  </Text>
                </View>
                <Pressable onPress={onClearDifferentReturn}>
                  <Text className="text-xs font-poppins-medium text-[#0097B3]">
                    Change
                  </Text>
                </Pressable>
              </View>
              <Text className="mt-2 text-xs font-poppins-medium text-[#1E293B]">
                Pick a return departure time
              </Text>
              <HourlyDepartureGrid
                selectedHour={returnHour}
                onSelectHour={onChangeReturnHour}
              />
            </View>
          )}
        </View>
      )}
    </View>
  );
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
