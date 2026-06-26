import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StatusBar,
  Switch,
  Text,
  View,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BackArrowIcon } from '../components/icons/ServiceTypeIcons';
import { OsmMap, type LatLng } from '../components/OsmMap';
import {
  fetchScheduledRoutes,
  registerForRoute,
  updateRegistrationStep,
  type ScheduledRouteApi,
} from '../services/api';

interface ChooseScheduledRouteScreenProps {
  onBack?: () => void;
  /** Called once the driver has successfully registered for a route +
   *  departure. Parent should advance the registration funnel to the next
   *  step (owner details). */
  onRegistered: () => void;
}

const fmtTime = (hhmm: string): string => {
  // Convert 24h HH:mm to 12h with am/pm for display.
  const [h, m] = hhmm.split(':').map(Number);
  if (Number.isNaN(h)) return hhmm;
  const period = h >= 12 ? 'PM' : 'AM';
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${h12}:${String(m).padStart(2, '0')} ${period}`;
};

const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const fmtDays = (days: number[]): string => {
  if (!days || days.length === 0) return 'Daily';
  if (days.length === 7) return 'Daily';
  // Common shortcuts.
  if (
    days.length === 5 &&
    [1, 2, 3, 4, 5].every(d => days.includes(d))
  )
    return 'Weekdays';
  if (days.length === 2 && days.includes(0) && days.includes(6)) return 'Weekends';
  return days
    .slice()
    .sort((a, b) => a - b)
    .map(d => dayNames[d])
    .join(', ');
};

export function ChooseScheduledRouteScreen({
  onBack,
  onRegistered,
}: ChooseScheduledRouteScreenProps) {
  const [routes, setRoutes] = useState<ScheduledRouteApi[] | null>(null);
  const [loadingError, setLoadingError] = useState<string | null>(null);
  const [selectedRoute, setSelectedRoute] = useState<ScheduledRouteApi | null>(null);
  const [selectedDepartureIdx, setSelectedDepartureIdx] = useState<number | null>(null);
  const [roundTrip, setRoundTrip] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetchScheduledRoutes()
      .then(rs => {
        if (cancelled) return;
        setRoutes(rs);
      })
      .catch(err => {
        if (cancelled) return;
        console.warn('[choose-route] fetch failed:', err);
        setLoadingError(err?.message ?? 'Could not load routes');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const handlePickRoute = (r: ScheduledRouteApi) => {
    setSelectedRoute(r);
    // Default to the first departure so the submit button is enabled
    // immediately if there's only one slot.
    setSelectedDepartureIdx(r.schedule?.departures?.length ? 0 : null);
    setRoundTrip(false);
  };

  const handleSubmit = async () => {
    if (!selectedRoute || selectedDepartureIdx === null || submitting) return;
    setSubmitting(true);
    try {
      await registerForRoute(selectedRoute._id, {
        departureIndex: selectedDepartureIdx,
        roundTrip,
      });
      // Advance the backend registrationStep so a re-login resumes at
      // owner-details rather than re-prompting for route selection.
      // Best-effort — the route registration above is the real success
      // condition; this is just persistence of the funnel position.
      try {
        await updateRegistrationStep('owner-details');
      } catch (stepErr) {
        console.warn('[choose-route] step advance failed:', stepErr);
      }
      Alert.alert(
        'Registration submitted',
        'Your route registration is pending admin approval. You can continue with the rest of your profile while we review it.',
        [{ text: 'Continue', onPress: () => onRegistered() }],
      );
    } catch (err: any) {
      console.warn('[choose-route] register failed:', err);
      Alert.alert(
        'Registration failed',
        err?.message ?? 'Could not submit. Please try again.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View className="flex-1 bg-[#F9FAFB]">
      <StatusBar barStyle="light-content" backgroundColor="#0097B3" translucent />
      <LinearGradient
        colors={['#0097B3', '#00C896']}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
      >
        <SafeAreaView edges={['top']}>
          <View className="flex-row items-center gap-3 px-4 pb-3 pt-2">
            <Pressable
              onPress={selectedRoute ? () => setSelectedRoute(null) : onBack}
              hitSlop={10}
            >
              <BackArrowIcon size={22} color="white" />
            </Pressable>
            <Text className="flex-1 text-[18px] font-semibold text-white">
              {selectedRoute ? selectedRoute.name : 'Choose your route'}
            </Text>
          </View>
        </SafeAreaView>
      </LinearGradient>

      {selectedRoute ? (
        <RouteDetail
          route={selectedRoute}
          selectedDepartureIdx={selectedDepartureIdx}
          onSelectDeparture={setSelectedDepartureIdx}
          roundTrip={roundTrip}
          onRoundTripChange={setRoundTrip}
          onSubmit={handleSubmit}
          submitting={submitting}
        />
      ) : (
        <RouteList
          routes={routes}
          loadingError={loadingError}
          onPickRoute={handlePickRoute}
        />
      )}
    </View>
  );
}

// ────────────────── Route list ──────────────────

function RouteList({
  routes,
  loadingError,
  onPickRoute,
}: {
  routes: ScheduledRouteApi[] | null;
  loadingError: string | null;
  onPickRoute: (r: ScheduledRouteApi) => void;
}) {
  if (loadingError) {
    return (
      <View className="flex-1 items-center justify-center px-6">
        <Text className="text-base text-[#E02D3C]">{loadingError}</Text>
      </View>
    );
  }
  if (routes === null) {
    return (
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator color="#0097B3" />
      </View>
    );
  }
  if (routes.length === 0) {
    return (
      <View className="flex-1 items-center justify-center px-6">
        <Text className="text-base font-semibold text-[#1E293B]">
          No routes available yet
        </Text>
        <Text className="mt-2 text-center text-sm text-[#6A7282]">
          The admin team is still setting up routes for your area. Please check
          back soon.
        </Text>
      </View>
    );
  }
  return (
    <ScrollView contentContainerClassName="px-4 pb-8 pt-4 gap-3">
      <Text className="px-2 text-xs text-[#6A7282]">
        Pick the route you'd like to drive. You'll choose a departure time on
        the next screen.
      </Text>
      {routes.map(r => {
        const first = r.stops[0];
        const last = r.stops[r.stops.length - 1];
        const slots = r.schedule?.departures?.length ?? 0;
        return (
          <Pressable
            key={r._id}
            onPress={() => onPickRoute(r)}
            className="rounded-2xl border border-[#EBEBEB] bg-white p-4"
            style={{
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.05,
              shadowRadius: 3,
              elevation: 1,
            }}
          >
            <Text className="text-base font-bold text-[#1E293B]">{r.name}</Text>
            {r.description ? (
              <Text className="mt-1 text-xs text-[#6A7282]">{r.description}</Text>
            ) : null}
            <View className="mt-3 flex-row items-start gap-3">
              <View className="items-center pt-1">
                <View className="h-2.5 w-2.5 rounded-full bg-[#00C950]" />
                <View className="my-1 h-6 w-0.5 bg-[#D1D5DC]" />
                <View className="h-2.5 w-2.5 rounded-full bg-[#FB2C36]" />
              </View>
              <View className="flex-1">
                <Text className="text-sm font-medium text-[#1E293B]">
                  {first?.name}
                </Text>
                <Text className="mt-3 text-sm font-medium text-[#1E293B]">
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
              <View className="h-3 w-px bg-[#D1D5DC]" />
              <Text className="text-xs text-[#6A7282]">
                {fmtDays(r.schedule?.daysOfWeek ?? [])}
              </Text>
            </View>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

// ────────────────── Route detail ──────────────────

function RouteDetail({
  route,
  selectedDepartureIdx,
  onSelectDeparture,
  roundTrip,
  onRoundTripChange,
  onSubmit,
  submitting,
}: {
  route: ScheduledRouteApi;
  selectedDepartureIdx: number | null;
  onSelectDeparture: (i: number) => void;
  roundTrip: boolean;
  onRoundTripChange: (v: boolean) => void;
  onSubmit: () => void;
  submitting: boolean;
}) {
  // The map shows ALL stops along the route. We pass the first as pickup,
  // the last as dropoff (so OsmMap draws its standard pickup/drop pins),
  // and use intermediate stops as the "polyline anchors". The driver gets
  // a clear visual of where they'll go.
  const first = route.stops[0];
  const last = route.stops[route.stops.length - 1];
  const pickup: LatLng = { lat: first.lat, lng: first.lng };
  const dropoff: LatLng = { lat: last.lat, lng: last.lng };

  const departures = route.schedule?.departures ?? [];
  const canSubmit = selectedDepartureIdx !== null && !submitting;

  const intermediateStops = useMemo(
    () => route.stops.slice(1, -1),
    [route.stops],
  );

  return (
    <ScrollView contentContainerClassName="pb-32">
      {/* Map preview */}
      <View style={{ height: 240 }}>
        <OsmMap pickup={pickup} dropoff={dropoff} routeTarget="dropoff" />
      </View>

      <View className="px-4 pt-4">
        <Text className="text-base font-bold text-[#1E293B]">Stops</Text>
        <View className="mt-3 rounded-2xl border border-[#EBEBEB] bg-white p-4">
          <StopRow
            label={first.name}
            address={first.address}
            kind="start"
          />
          {intermediateStops.map(s => (
            <StopRow
              key={s.sequence}
              label={s.name}
              address={s.address}
              kind="mid"
            />
          ))}
          <StopRow
            label={last.name}
            address={last.address}
            kind="end"
          />
        </View>

        <Text className="mt-6 text-base font-bold text-[#1E293B]">
          Pick a departure time
        </Text>
        <Text className="mt-1 text-xs text-[#6A7282]">
          {fmtDays(route.schedule?.daysOfWeek ?? [])}
        </Text>
        {departures.length === 0 ? (
          <View className="mt-3 rounded-xl bg-[#FEF3C7] p-3">
            <Text className="text-sm text-[#92400E]">
              This route doesn't have departure times set yet. Pick another route
              or check back later.
            </Text>
          </View>
        ) : (
          <View className="mt-3 flex-row flex-wrap gap-2">
            {departures.map((d, i) => {
              const stop = route.stops[d.stopIndex];
              const isSelected = selectedDepartureIdx === i;
              return (
                <Pressable
                  key={`${d.stopIndex}-${d.time}-${i}`}
                  onPress={() => onSelectDeparture(i)}
                  className="rounded-xl border-2 px-4 py-2"
                  style={{
                    borderColor: isSelected ? '#0097B3' : '#D3DDE7',
                    backgroundColor: isSelected ? 'rgba(0,151,179,0.08)' : 'white',
                  }}
                >
                  <Text
                    className="text-base font-bold"
                    style={{ color: isSelected ? '#0097B3' : '#1E293B' }}
                  >
                    {fmtTime(d.time)}
                  </Text>
                  <Text className="mt-0.5 text-[10px] text-[#6A7282]">
                    from {stop?.name ?? `Stop ${d.stopIndex + 1}`}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        )}

        <View className="mt-6 flex-row items-center justify-between rounded-2xl border border-[#EBEBEB] bg-white p-4">
          <View className="flex-1 pr-3">
            <Text className="text-sm font-semibold text-[#1E293B]">
              I'll do the return trip too
            </Text>
            <Text className="mt-1 text-xs text-[#6A7282]">
              Tick this if you'll also drive back from the end stop to the start
              at the matching return time.
            </Text>
          </View>
          <Switch
            value={roundTrip}
            onValueChange={onRoundTripChange}
            trackColor={{ false: '#CBCED4', true: '#0097B3' }}
          />
        </View>
      </View>

      <SafeAreaView edges={['bottom']} className="absolute bottom-0 left-0 right-0 bg-white px-4 pb-4 pt-3"
        style={{
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.05,
          shadowRadius: 4,
          elevation: 8,
        }}
      >
        <Pressable
          onPress={onSubmit}
          disabled={!canSubmit}
          className="h-14 items-center justify-center rounded-2xl"
          style={{ backgroundColor: canSubmit ? '#0097B3' : '#9DD7E0' }}
        >
          {submitting ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text className="text-base font-bold text-white">
              Register for this route
            </Text>
          )}
        </Pressable>
      </SafeAreaView>
    </ScrollView>
  );
}

function StopRow({
  label,
  address,
  kind,
}: {
  label: string;
  address?: string;
  kind: 'start' | 'mid' | 'end';
}) {
  const dotColor =
    kind === 'start' ? '#00C950' : kind === 'end' ? '#FB2C36' : '#94A3B8';
  return (
    <View className="flex-row items-start gap-3 py-2">
      <View
        className="mt-1.5 h-3 w-3 rounded-full"
        style={{ backgroundColor: dotColor }}
      />
      <View className="flex-1">
        <Text className="text-sm font-semibold text-[#1E293B]">{label}</Text>
        {address ? (
          <Text className="mt-0.5 text-xs text-[#6A7282]">{address}</Text>
        ) : null}
      </View>
    </View>
  );
}

export default ChooseScheduledRouteScreen;
