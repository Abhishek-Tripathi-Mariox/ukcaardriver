import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StatusBar,
  Text,
  View,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { BackArrowIcon } from '../components/icons/ServiceTypeIcons';
import { OsmMap, type LatLng } from '../components/OsmMap';
import {
  fetchMyRouteRegistration,
  fetchScheduledRoutes,
  registerForRoute,
  checkRouteSchedule,
  type MyRouteRegistration,
  updateRegistrationStep,
  type ScheduledRouteApi,
} from '../services/api';

interface ChooseScheduledRouteScreenProps {
  isChangeRequest?: boolean;
  onBack?: () => void;
  /** Called once the driver has successfully registered for a route +
   *  departure. Parent should advance the registration funnel to the next
   *  step (owner details). */
  onRegistered: () => void;
}

const fmtTime = (hhmm: string): string => {
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(hhmm)) return 'Needs departure selection';
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
  isChangeRequest,
  onBack,
  onRegistered,
}: ChooseScheduledRouteScreenProps) {
  const [routes, setRoutes] = useState<ScheduledRouteApi[] | null>(null);
  // Current (approved) route + any pending change request — shown on the
  // change screen so the driver can see what they're switching FROM, and
  // which card in the list is already theirs.
  const [myReg, setMyReg] = useState<{
    current: MyRouteRegistration | null;
    pendingRequest: MyRouteRegistration | null;
    currentAssignments?: MyRouteRegistration[];
    pendingRequests?: MyRouteRegistration[];
  } | null>(null);
  const [loadingError, setLoadingError] = useState<string | null>(null);
  const [selectedRoute, setSelectedRoute] = useState<ScheduledRouteApi | null>(null);
  const [selectedDepartureIdx, setSelectedDepartureIdx] = useState<number | null>(null);
  const [scheduleChecking, setScheduleChecking] = useState(false);
  const [scheduleAllowed, setScheduleAllowed] = useState(false);
  const [scheduleError, setScheduleError] = useState<string | null>(null);
  const [scheduleAttempt, setScheduleAttempt] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (isChangeRequest) {
      fetchMyRouteRegistration()
        .then(setMyReg)
        .catch(() => {}); // banner is informational — the list still works
    }
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
  };

  const replacesRoute = !!isChangeRequest && !!myReg?.current && myReg.current.route._id !== selectedRoute?._id &&
    !(myReg.currentAssignments ?? []).some(reg => reg.route._id === selectedRoute?._id);
  // The displayed slot travels with its index, so an admin edit made since the
  // list loaded is refused ("timetable changed") instead of booking another trip.
  const selectedSlot = (route: ScheduledRouteApi, index: number) => {
    const slot = route.schedule?.departures?.[index];
    return { departureIndex: index, ...(slot ? { departureTime: slot.time, direction: slot.direction ?? 'outbound', stopIndex: slot.stopIndex } : {}) };
  };
  // Retrying reloads the published timetable; a slot that changed is deselected
  // so the driver picks again from the current times.
  const refreshAndRetry = () => {
    fetchScheduledRoutes()
      .then(rs => {
        setRoutes(rs);
        const fresh = rs.find(r => r._id === selectedRoute?._id);
        if (!fresh || !selectedRoute || selectedDepartureIdx === null) return;
        const same = JSON.stringify(selectedSlot(fresh, selectedDepartureIdx)) === JSON.stringify(selectedSlot(selectedRoute, selectedDepartureIdx));
        setSelectedRoute(fresh);
        if (!same) setSelectedDepartureIdx(null);
      })
      .catch(() => {})
      .finally(() => setScheduleAttempt(attempt => attempt + 1));
  };
  useEffect(() => {
    setScheduleAllowed(false); setScheduleError(null);
    if (!selectedRoute || selectedDepartureIdx === null) return;
    let cancelled = false;
    setScheduleChecking(true);
    checkRouteSchedule(selectedRoute._id, { ...selectedSlot(selectedRoute, selectedDepartureIdx), replaceRoute: replacesRoute })
      .then(() => { if (!cancelled) setScheduleAllowed(true); })
      .catch(error => { if (!cancelled) setScheduleError(error?.message ?? 'Could not check this departure. Please retry.'); })
      .finally(() => { if (!cancelled) setScheduleChecking(false); });
    return () => { cancelled = true; };
  }, [selectedRoute, selectedDepartureIdx, replacesRoute, scheduleAttempt]);

  const handleSubmit = async () => {
    if (!selectedRoute || selectedDepartureIdx === null || submitting || !scheduleAllowed) return;
    setSubmitting(true);
    try {
      await registerForRoute(selectedRoute._id, {
        ...selectedSlot(selectedRoute, selectedDepartureIdx),
        replaceRoute: replacesRoute,
      });
      if (!isChangeRequest) {
        // Advance the backend registrationStep so a re-login resumes at
        // owner-details rather than re-prompting for route selection.
        // Best-effort — the route registration above is the real success
        // condition; this is just persistence of the funnel position.
        try {
          await updateRegistrationStep('owner-details');
        } catch (stepErr) {
          console.warn('[choose-route] step advance failed:', stepErr);
        }
      }
      Alert.alert(
        replacesRoute ? 'Route change requested' : 'Departure requested',
        isChangeRequest
          ? replacesRoute ? 'Your current route stays in place until approval and the new route’s first service date.' : 'This departure is awaiting approval. Your other approved departures stay in place.'
          : 'Your route registration is pending admin approval. You can continue with the rest of your profile while we review it.',
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
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
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
            <Text className="flex-1 text-[18px] font-poppins-semibold text-white">
              {selectedRoute
                ? selectedRoute.name
                : isChangeRequest
                ? 'Manage route & departures'
                : 'Choose your route'}
            </Text>
          </View>
        </SafeAreaView>
      </LinearGradient>

      {selectedRoute ? (
        <RouteDetail
          route={selectedRoute}
          selectedDepartureIdx={selectedDepartureIdx}
          onSelectDeparture={setSelectedDepartureIdx}
          scheduleAllowed={scheduleAllowed}
          scheduleChecking={scheduleChecking}
          scheduleError={scheduleError}
          onRetrySchedule={refreshAndRetry}
          onSubmit={handleSubmit}
          submitting={submitting}
        />
      ) : (
        <RouteList
          routes={routes}
          loadingError={loadingError}
          onPickRoute={handlePickRoute}
          myReg={isChangeRequest ? myReg : null}
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
  myReg,
}: {
  routes: ScheduledRouteApi[] | null;
  loadingError: string | null;
  onPickRoute: (r: ScheduledRouteApi) => void;
  myReg: {
    current: MyRouteRegistration | null;
    pendingRequest: MyRouteRegistration | null;
    currentAssignments?: MyRouteRegistration[];
    pendingRequests?: MyRouteRegistration[];
  } | null;
}) {
  const insets = useSafeAreaInsets();
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
        <Text className="text-base font-poppins-semibold text-[#1E293B]">
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
    <ScrollView
      contentContainerClassName="px-4 pt-4 gap-3"
      // pb-8 (32) + nav-bar inset — this step has no bottom footer overlay.
      contentContainerStyle={{ paddingBottom: 32 + insets.bottom }}
    >
      {myReg?.current && (
        <View className="rounded-2xl bg-[#E0F7FA] px-4 py-3">
          <Text className="text-xs font-poppins-medium text-[#00647A]">Your current route</Text>
          <Text className="mt-1 font-poppins-semibold text-[#0097B3]" numberOfLines={1}>
            {myReg.current.route.name}
            {/* fmtTime, not the raw "17:30" the API stores — the picker on the
                next screen shows 12-hour times, so the two disagreed and the
                driver read their slot as a different time. */}
            {myReg.current.route.schedule?.departures?.[myReg.current.departureIndex ?? -1]?.time
              ? ` · ${fmtTime(
                  myReg.current.route.schedule.departures[myReg.current.departureIndex!].time,
                )}`
              : ''}
          </Text>
          <Text className="mt-1 text-xs text-[#00647A]">
            Approved departures: {(myReg.currentAssignments ?? [myReg.current]).filter(reg => reg.route._id === myReg.current!.route._id).map(reg => fmtTime(reg.route.schedule?.departures?.[reg.departureIndex ?? -1]?.time ?? '')).join(', ')}
          </Text>
          <Text className="mt-1 text-xs text-[#00647A]">
            Add departures on this route, or request a change. Only one route is active at a time.
          </Text>
        </View>
      )}
      {myReg?.pendingRequest && (
        <View className="rounded-2xl bg-[#FEF3C7] px-4 py-3">
          <Text className="text-xs font-poppins-medium text-[#92400E]">
            Change already requested · awaiting approval
          </Text>
          <Text className="mt-1 font-poppins-semibold text-[#B45309]" numberOfLines={1}>
            {myReg.pendingRequest.route.name}
          </Text>
          <Text className="mt-1 text-xs text-[#92400E]">
            Pending departures: {(myReg.pendingRequests ?? [myReg.pendingRequest]).map(reg => fmtTime(reg.route.schedule?.departures?.[reg.departureIndex ?? -1]?.time ?? '')).join(', ')}
          </Text>
          <Text className="mt-1 text-xs text-[#92400E]">
            Each requested departure is reviewed separately. Approved trips stay in place.
          </Text>
        </View>
      )}
      {(myReg?.currentAssignments ?? []).filter(reg => reg.route._id !== myReg?.current?.route._id).map(reg => <View key={`${reg.route._id}_${reg.departureIndex}`} className="rounded-2xl bg-[#E0F7FA] px-4 py-3">
        <Text className="text-xs text-[#00647A]">Approved route change · begins {reg.firstServiceDate}</Text>
        <Text className="mt-1 font-poppins-medium text-[#0097B3]">{reg.route.name} · {fmtTime(reg.route.schedule?.departures?.[reg.departureIndex ?? -1]?.time ?? '')}</Text>
      </View>)}
      <Text className="px-2 text-xs text-[#6A7282]">
        Pick the route you'd like to drive. You'll choose a departure time on
        the next screen.
      </Text>
      {routes.map(r => {
        const first = r.stops[0];
        const last = r.stops[r.stops.length - 1];
        const slots = r.schedule?.departures?.length ?? 0;
        const isCurrent = myReg?.current?.route._id === r._id;
        const isRequested = myReg?.pendingRequest?.route._id === r._id;
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
            <View className="flex-row items-center justify-between gap-2">
              <Text className="flex-1 text-base font-poppins-bold text-[#1E293B]" numberOfLines={1}>
                {r.name}
              </Text>
              {isCurrent && (
                <View className="rounded-full bg-[#E0F7FA] px-2.5 py-1">
                  <Text className="text-[10px] font-poppins-semibold uppercase text-[#0097B3]">
                    Current
                  </Text>
                </View>
              )}
              {isRequested && (
                <View className="rounded-full bg-[#FEF3C7] px-2.5 py-1">
                  <Text className="text-[10px] font-poppins-semibold uppercase text-[#B45309]">
                    Requested
                  </Text>
                </View>
              )}
            </View>
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
  scheduleAllowed,
  scheduleChecking,
  scheduleError,
  onRetrySchedule,
  onSubmit,
  submitting,
}: {
  route: ScheduledRouteApi;
  selectedDepartureIdx: number | null;
  onSelectDeparture: (i: number) => void;
  scheduleAllowed: boolean;
  scheduleChecking: boolean;
  scheduleError: string | null;
  onRetrySchedule: () => void;
  onSubmit: () => void;
  submitting: boolean;
}) {
  const insets = useSafeAreaInsets();
  // The map shows ALL stops along the route. We pass the first as pickup,
  // the last as dropoff (so OsmMap draws its standard pickup/drop pins),
  // and use intermediate stops as the "polyline anchors". The driver gets
  // a clear visual of where they'll go.
  const first = route.stops[0];
  const last = route.stops[route.stops.length - 1];
  const pickup: LatLng = { lat: first.lat, lng: first.lng };
  const dropoff: LatLng = { lat: last.lat, lng: last.lng };

  const departures = route.schedule?.departures ?? [];
  const canSubmit = selectedDepartureIdx !== null && !submitting && scheduleAllowed && !scheduleChecking;

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
        <Text className="text-base font-poppins-bold text-[#1E293B]">Stops</Text>
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

        <Text className="mt-6 text-base font-poppins-bold text-[#1E293B]">
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
                    className="text-base font-poppins-bold"
                    style={{ color: isSelected ? '#0097B3' : '#1E293B' }}
                  >
                    {fmtTime(d.time)}
                  </Text>
                  <Text className="mt-0.5 text-[10px] text-[#6A7282]">
                    {d.direction === 'return' ? 'Return' : 'Outward'} · from {stop?.name ?? `Stop ${d.stopIndex + 1}`}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        )}

        <Text className="mt-4 text-xs text-[#6A7282]">Minimum one-way journey: {route.schedule?.minimumJourneyMinutes ?? 'admin setup required'} minutes. Turnaround gap: {Math.max(route.schedule?.turnaroundMinutes ?? 0, route.schedule?.minRestMinutes ?? 0)} minutes. Return departures must be on this same route.</Text>
        {scheduleChecking && <Text className="mt-3 text-sm text-[#00647A]">Checking your other departures…</Text>}
        {scheduleError && <Pressable onPress={onRetrySchedule}><Text accessibilityRole="alert" className="mt-3 text-sm text-red-600">{scheduleError} Tap to check again.</Text></Pressable>}
      </View>

      <View className="absolute bottom-0 left-0 right-0 bg-white px-4 pt-3"
        style={{
          paddingBottom: Math.max(insets.bottom, 12) + 12,
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
            <Text className="text-base font-poppins-medium text-white">
              Request this departure
            </Text>
          )}
        </Pressable>
      </View>
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
        <Text className="text-sm font-poppins-semibold text-[#1E293B]">{label}</Text>
        {address ? (
          <Text className="mt-0.5 text-xs text-[#6A7282]">{address}</Text>
        ) : null}
      </View>
    </View>
  );
}

export default ChooseScheduledRouteScreen;
