import { PermissionsAndroid, Platform } from 'react-native';
import Geolocation from '@react-native-community/geolocation';
import { emitDriverLocation, getSocket } from './socketService';

/**
 * Reports the driver's GPS to the backend while the driver is online. Two
 * purposes:
 *
 *   1. Dispatcher accuracy — `notifyNearbyDrivers` runs a $nearSphere on
 *      `driverProfile.currentLocation`, so a stale location means the
 *      driver gets either no requests or requests they can't reasonably
 *      take.
 *
 *   2. Customer tracking — once a ride is in flight, the customer's map
 *      pin follows the same emits (rebroadcast as `driver:location:update`
 *      to the ride room). Without this, the cab marker freezes after the
 *      driver accepts.
 *
 * Strategy: a continuous `watchPosition` with TWO triggers — emit when the
 * driver moves 100m (so a moving cab appears smooth on the customer map)
 * AND a 60s safety-net heartbeat (so a parked driver still keeps their
 * dispatch index warm and the backend knows we're alive).
 *
 * Why both filters:
 *   - distanceFilter alone: a stationary driver never emits, dispatcher's
 *     index could go stale enough to look offline.
 *   - interval alone: a fast-moving cab only updates every 60s, customer
 *     map shows the marker teleporting in 500m jumps.
 *
 * The fare doesn't change as a result of these reports — pricing is locked
 * in at ride-creation time on `estimatedFare`.
 */

const HEARTBEAT_MS = 60_000;       // emit even if stationary, every 60s
const DISTANCE_FILTER_M = 100;     // emit on every 100m of movement

let watchId: number | null = null;
let heartbeatId: ReturnType<typeof setInterval> | null = null;
let permissionGranted = false;
let lastEmittedAt = 0;

export async function ensureLocationPermission(): Promise<boolean> {
  return ensurePermission();
}

async function ensurePermission(): Promise<boolean> {
  if (permissionGranted) return true;
  if (Platform.OS === 'android') {
    const result = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      {
        title: 'Location permission',
        message:
          'UKCAAR Driver needs your location while you are online so we can match you with nearby ride requests and show passengers your ETA.',
        buttonPositive: 'Allow',
        buttonNegative: 'Deny',
      },
    );
    permissionGranted = result === PermissionsAndroid.RESULTS.GRANTED;
  } else {
    // iOS uses an Info.plist entry + the OS prompt fired on first read; we
    // optimistically mark as granted and let getCurrentPosition surface
    // any denial via its error callback.
    permissionGranted = true;
  }
  return permissionGranted;
}

/** Push the position to the backend if the socket is alive. */
function pushPosition(pos: { coords: { latitude: number; longitude: number; heading: number | null } }): void {
  const s = getSocket();
  if (!s || !s.connected) return;
  emitDriverLocation({
    lat: pos.coords.latitude,
    lng: pos.coords.longitude,
    heading:
      typeof pos.coords.heading === 'number' && pos.coords.heading >= 0
        ? pos.coords.heading
        : undefined,
  });
  lastEmittedAt = Date.now();
}

/**
 * Heartbeat fallback — fires every 60s. Only actually emits if the
 * watchPosition stream hasn't already pushed something recently. This
 * covers the "driver parked at the airport for 30 minutes" case where
 * watchPosition stays quiet because nothing crossed the 100m threshold.
 */
function heartbeat(): void {
  if (Date.now() - lastEmittedAt < HEARTBEAT_MS - 5_000) return;
  Geolocation.getCurrentPosition(
    pushPosition,
    err => {
      // Common codes: 1 (permission), 2 (position unavailable), 3 (timeout).
      // Transient — the next heartbeat or a movement event will recover.
      console.warn('[location-reporter] heartbeat fix failed:', err?.message);
    },
    { enableHighAccuracy: true, timeout: 15_000, maximumAge: 30_000 },
  );
}

/**
 * Begin location reporting. Combines watchPosition (emits on every 100m of
 * movement) with a 60s heartbeat (emits if no movement in the last minute).
 * Idempotent — safe to call repeatedly.
 */
export async function startLocationReporting(): Promise<void> {
  const granted = await ensurePermission();
  if (!granted) {
    console.warn('[location-reporter] permission denied — not starting');
    return;
  }
  if (watchId !== null) return; // already running

  // One immediate fix so the first emit doesn't wait for either trigger.
  Geolocation.getCurrentPosition(
    pushPosition,
    err => console.warn('[location-reporter] initial fix failed:', err?.message),
    { enableHighAccuracy: true, timeout: 8_000, maximumAge: 60_000 },
  );

  // Movement-based stream — emits whenever the OS detects 100m of travel.
  watchId = Geolocation.watchPosition(
    pushPosition,
    err => {
      console.warn('[location-reporter] watch error:', err?.message);
    },
    {
      enableHighAccuracy: true,
      distanceFilter: DISTANCE_FILTER_M,
      // interval/fastestInterval are Android hints for the underlying
      // FusedLocationProvider — they don't override distanceFilter, just
      // tell the OS how often to *check* for movement.
      interval: 10_000,
      fastestInterval: 5_000,
    },
  );

  // Heartbeat safety-net for stationary drivers. interval just under 60s
  // so the "5s less than HEARTBEAT_MS" check inside heartbeat() always
  // passes the first time.
  heartbeatId = setInterval(heartbeat, HEARTBEAT_MS);
}

export function stopLocationReporting(): void {
  if (watchId !== null) {
    Geolocation.clearWatch(watchId);
    watchId = null;
  }
  if (heartbeatId !== null) {
    clearInterval(heartbeatId);
    heartbeatId = null;
  }
}

export function isLocationReporting(): boolean {
  return watchId !== null;
}
