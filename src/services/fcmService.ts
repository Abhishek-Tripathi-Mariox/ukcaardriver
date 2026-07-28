import { Platform, PermissionsAndroid, Vibration } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import messaging, {
  FirebaseMessagingTypes,
} from '@react-native-firebase/messaging';
import notifee, {
  AndroidImportance,
  AndroidCategory,
  AndroidVisibility,
  EventType,
} from '@notifee/react-native';
import { API_BASE_URL } from './api';

// Where the headless background handler (index.js) stashes a ride-request
// notification the driver tapped while the app was backgrounded-but-alive.
// App.tsx drains this on the next foreground so the modal re-surfaces.
// Must match PENDING_RIDE_REQUEST_KEY in index.js.
export const PENDING_RIDE_REQUEST_KEY = 'pendingRideRequest';

const FCM_TOKEN_KEY = 'fcmToken';
const FCM_TOKEN_SYNCED_KEY = 'fcmTokenSynced';
// In-memory note of the token last POSTed in this JS process. Used by
// `syncTokenToBackend` to short-circuit duplicate POSTs of the same token
// when both `messaging().onTokenRefresh` and `resyncFcmTokenIfPending`
// race on cold start. The persistent FCM_TOKEN_SYNCED_KEY flag handles
// cross-restart dedupe; this handles within-process dedupe.
let lastSyncedTokenInProcess: string | null = null;
let inflightTokenSync: Promise<void> | null = null;
const DEFAULT_CHANNEL_ID = 'ukcaar_default';
// Dedicated channel for new ride requests. We need MAX importance + a
// custom vibration pattern so the alert cuts through Do-Not-Disturb on the
// driver's phone — same UX Uber/Ola use to wake an idle driver.
const RIDE_ALERTS_CHANNEL_ID = 'ukcaar_ride_alerts';
let channelEnsured = false;
let rideChannelEnsured = false;

async function ensureNotificationChannel(): Promise<void> {
  if (channelEnsured || Platform.OS !== 'android') return;
  await notifee.createChannel({
    id: DEFAULT_CHANNEL_ID,
    name: 'General notifications',
    importance: AndroidImportance.HIGH,
    sound: 'default',
    vibration: true,
  });
  channelEnsured = true;
}

/** Heads-up alert channel — used when a new ride request lands. */
async function ensureRideAlertsChannel(): Promise<void> {
  if (rideChannelEnsured || Platform.OS !== 'android') return;
  await notifee.createChannel({
    id: RIDE_ALERTS_CHANNEL_ID,
    name: 'New ride requests',
    importance: AndroidImportance.HIGH,
    sound: 'default',
    vibration: true,
    vibrationPattern: [300, 500, 300, 500],
  });
  rideChannelEnsured = true;
}

/**
 * Starts a looping ride-alert "ring": vibration pattern + a Notifee
 * notification on the high-importance ride channel that loops the system
 * sound (loopSound:true). On Android this triggers the channel's default
 * tone in a continuous ring — same UX as an incoming call. Stays going
 * until `stopRideAlert()` cancels it (accept/reject/timeout/request-taken).
 *
 * We use Notifee instead of `react-native-sound` so we don't have to ship
 * a sound asset or a new native dep — the channel sound is whatever the
 * driver has set as their default notification tone.
 */
const RIDE_ALERT_NOTIFICATION_ID = 'ukcaar-ride-alert-ring';
let alertActive = false;

export function buzzForRideAlert(): void {
  Vibration.cancel();
  Vibration.vibrate([0, 400, 200, 400, 200, 400, 600], true);
  if (Platform.OS !== 'android') return;
  if (alertActive) return;
  alertActive = true;
  // Fire-and-forget — channel creation is idempotent.
  (async () => {
    try {
      await ensureRideAlertsChannel();
      await notifee.displayNotification({
        id: RIDE_ALERT_NOTIFICATION_ID,
        title: 'New ride request',
        body: 'A passenger is waiting — open the app to accept.',
        android: {
          channelId: RIDE_ALERTS_CHANNEL_ID,
          importance: AndroidImportance.HIGH,
          category: AndroidCategory.CALL,
          visibility: AndroidVisibility.PUBLIC,
          loopSound: true,
          ongoing: true,
          autoCancel: false,
          pressAction: { id: 'default', launchActivity: 'default' },
          fullScreenAction: { id: 'default', launchActivity: 'default' },
        },
      });
    } catch (err) {
      console.warn('[fcm] ride-alert ring failed:', err);
    }
  })();
}

export function stopRideAlert(): void {
  Vibration.cancel();
  alertActive = false;
  if (Platform.OS !== 'android') return;
  notifee
    .cancelNotification(RIDE_ALERT_NOTIFICATION_ID)
    .catch(() => {});
}

export async function displayRemoteMessage(
  remoteMessage: FirebaseMessagingTypes.RemoteMessage,
): Promise<void> {
  // Cancellation pings are silent — they exist solely to stop the ring on
  // dispatched-loser drivers. Don't pop a new notification for them.
  if (remoteMessage.data?.kind === 'ride:request-taken') {
    stopRideAlert();
    return;
  }
  await ensureNotificationChannel();
  await ensureRideAlertsChannel();
  const title =
    remoteMessage.notification?.title ??
    (remoteMessage.data?.title as string | undefined) ??
    'UKCAAR';
  const body =
    remoteMessage.notification?.body ??
    (remoteMessage.data?.body as string | undefined) ??
    (remoteMessage.data?.message as string | undefined) ??
    '';
  // Ride requests use a separate high-priority channel with a custom
  // vibration pattern. Falls back to the default channel for everything else.
  const isRideAlert = remoteMessage.data?.kind === 'ride:new-request';
  await notifee.displayNotification({
    title,
    body,
    data: (remoteMessage.data as Record<string, string>) ?? {},
    android: {
      channelId: isRideAlert ? RIDE_ALERTS_CHANNEL_ID : DEFAULT_CHANNEL_ID,
      pressAction: { id: 'default', launchActivity: 'default' },
      // Ride alerts: incoming-call-style full-screen intent so the alert
      // wakes the device past Doze and lock-screen on aggressive OEM ROMs.
      ...(isRideAlert
        ? {
            importance: AndroidImportance.HIGH,
            category: AndroidCategory.CALL,
            visibility: AndroidVisibility.PUBLIC,
            fullScreenAction: { id: 'default', launchActivity: 'default' },
            autoCancel: true,
          }
        : {}),
    },
  });
}

async function hasAndroidNotificationPermission(): Promise<boolean> {
  if (Platform.OS !== 'android' || Platform.Version < 33) return true;
  return PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS);
}

async function hasIosPermission(): Promise<boolean> {
  const status = await messaging().hasPermission();
  return (
    status === messaging.AuthorizationStatus.AUTHORIZED ||
    status === messaging.AuthorizationStatus.PROVISIONAL
  );
}

const ACCESS_TOKEN_KEY = 'auth.accessToken';

/**
 * Cache the FCM token locally and POST it to the backend so the user record
 * gets the token added to its `fcmTokens` array. Without this step
 * `sendPushToUser(userId, ...)` on the backend has nothing to send to and
 * the driver never gets pushes.
 *
 * If the user isn't logged in yet (no access token in storage), we skip the
 * POST and rely on `resyncFcmTokenIfPending()` to retry post-login.
 */
async function syncTokenToBackend(token: string): Promise<void> {
  // Within-process dedupe. Two listeners (resync-on-login and
  // onTokenRefresh) frequently fire near-simultaneously on cold start; we
  // were POSTing the same token twice in a row. If the same token is
  // already being synced, join that promise instead of starting a new
  // request.
  if (inflightTokenSync && lastSyncedTokenInProcess === token) {
    return inflightTokenSync;
  }
  // Already synced this exact token earlier in this JS process? Skip the
  // network call entirely.
  if (
    lastSyncedTokenInProcess === token &&
    (await AsyncStorage.getItem(FCM_TOKEN_SYNCED_KEY)) === '1'
  ) {
    return;
  }

  inflightTokenSync = (async () => {
    await AsyncStorage.setItem(FCM_TOKEN_KEY, token);
    await AsyncStorage.removeItem(FCM_TOKEN_SYNCED_KEY);

    const authToken = await AsyncStorage.getItem(ACCESS_TOKEN_KEY);
    if (!authToken) return; // resyncFcmTokenIfPending() will retry after login

    try {
      const res = await fetch(`${API_BASE_URL}/notifications/fcm-token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          token,
          platform: Platform.OS === 'ios' ? 'ios' : 'android',
        }),
      });
      if (res.ok) {
        await AsyncStorage.setItem(FCM_TOKEN_SYNCED_KEY, '1');
        lastSyncedTokenInProcess = token;
      } else {
        console.warn('[fcm] register failed:', res.status, await res.text());
      }
    } catch (err) {
      console.warn('[fcm] register error (will retry post-login):', err);
    }
  })();

  try {
    await inflightTokenSync;
  } finally {
    inflightTokenSync = null;
  }
}

let listenersInstalled = false;

/**
 * Sets up FCM message listeners and channels. Does NOT ask for permission
 * and does NOT call getToken() — those happen later via
 * `ensureFcmTokenRegistered()` once the user has explicitly granted
 * notifications through the centralized permissions flow on the dashboard.
 *
 * Safe to call multiple times — listeners are installed only once per JS
 * process (re-binding `onMessage` would fire callbacks twice for the same
 * push).
 */
export async function initFcm(
  onMessage?: (msg: FirebaseMessagingTypes.RemoteMessage) => void,
): Promise<void> {
  if (listenersInstalled) return;
  listenersInstalled = true;

  await ensureNotificationChannel();
  await ensureRideAlertsChannel();

  messaging().onTokenRefresh(syncTokenToBackend);

  // Foreground: FCM never auto-displays these; show via Notifee + run callback.
  // For ride-request pushes we also kick the ringtone immediately so a
  // driver whose socket happens to be disconnected at dispatch time still
  // hears the alert. The app callback (see App.tsx) is responsible for
  // populating `incomingRequest` and the modal; we just handle the wake
  // signal here.
  messaging().onMessage(async (remoteMessage) => {
    // Logged-out guard, mirroring the background handler in index.js. A push
    // can still arrive after logout (token removal is best-effort and the
    // server may already have queued the message) — never surface a ride
    // alert to someone who is signed out.
    if (!(await AsyncStorage.getItem(ACCESS_TOKEN_KEY))) return;
    await displayRemoteMessage(remoteMessage);
    if (remoteMessage.data?.kind === 'ride:new-request') {
      buzzForRideAlert();
    }
    if (onMessage) onMessage(remoteMessage);
  });

  // Background → user taps the notification → app comes to foreground.
  // We get the message but it was NOT shown by us, so don't re-display;
  // just let the app react to the data payload (route to dashboard, etc).
  messaging().onNotificationOpenedApp(async (remoteMessage) => {
    if (!(await AsyncStorage.getItem(ACCESS_TOKEN_KEY))) return;
    if (remoteMessage && onMessage) onMessage(remoteMessage);
  });

  // --- Notifee event bridge -------------------------------------------------
  // Android ride/data-only pushes are rendered by Notifee (in index.js's
  // background handler and displayRemoteMessage), NOT by FCM. That means
  // FCM's onNotificationOpenedApp / getInitialNotification NEVER fire for
  // them — so tapping a ride alert (or the full-screen intent launching the
  // app) would land on the dashboard with no modal. Bridge Notifee's own
  // press + launch events back into the same `onMessage` handler so the
  // RideRequestModal re-surfaces. `{ data }` matches the shape the App.tsx
  // callback reads (msg.data.kind === 'ride:new-request').
  notifee.onForegroundEvent(({ type, detail }) => {
    const data = detail.notification?.data;
    if (type === EventType.PRESS && data && onMessage) {
      onMessage({ data } as FirebaseMessagingTypes.RemoteMessage);
    }
  });

  // App fully killed → tap/full-screen-intent launches it. Prefer the Notifee
  // launch notification (covers our data-only alerts); fall back to FCM's for
  // any server-rendered notification-payload messages.
  const initialNotifee = await notifee.getInitialNotification();
  if (initialNotifee?.notification?.data && onMessage) {
    onMessage({
      data: initialNotifee.notification.data,
    } as FirebaseMessagingTypes.RemoteMessage);
  } else {
    const initial = await messaging().getInitialNotification();
    if (initial && onMessage) onMessage(initial);
  }

  // Warm-background tap: index.js's onBackgroundEvent can't touch React state,
  // so it stashes the ride to AsyncStorage. Drain anything already waiting
  // from a tap that happened just before this listener was installed.
  try {
    const stashed = await AsyncStorage.getItem(PENDING_RIDE_REQUEST_KEY);
    if (stashed && onMessage) {
      await AsyncStorage.removeItem(PENDING_RIDE_REQUEST_KEY);
      const data = JSON.parse(stashed);
      onMessage({ data } as FirebaseMessagingTypes.RemoteMessage);
    }
  } catch {}
}

/**
 * Fetches the FCM token from Firebase and syncs it to the backend. Call
 * this after the user has granted notification permission via the
 * centralized permissions flow.
 *
 * Without this step `sendPushToUser(userId, ...)` on the backend has
 * nothing to send to and the driver never gets pushes.
 */
export async function ensureFcmTokenRegistered(): Promise<string | null> {
  const granted =
    Platform.OS === 'ios'
      ? await hasIosPermission()
      : await hasAndroidNotificationPermission();
  if (!granted) {
    console.warn('[fcm] permission not granted; skipping token registration');
    return null;
  }

  await ensureNotificationChannel();
  await ensureRideAlertsChannel();

  try {
    const token = await messaging().getToken();
    if (token) await syncTokenToBackend(token);
    return token ?? null;
  } catch (err) {
    console.warn('[fcm] getToken failed:', err);
    return null;
  }
}

/**
 * Re-syncs the FCM token with the backend after the user logs in.
 *
 * Always POSTs (no `synced` short-circuit) because the backend wipes the
 * user's `fcmTokens` array on every successful login (single-device login
 * policy). Without an unconditional re-POST here, a returning user on the
 * same install would never re-register their token and the backend would
 * have nothing to send pushes to.
 *
 * Order of preference:
 *   1. Cached token in AsyncStorage → POST it directly (fast).
 *   2. Otherwise fetch a fresh token from FCM (gated on notification
 *      permission having been granted; permissions gate is the next stop
 *      if it isn't).
 */
export async function resyncFcmTokenIfPending(): Promise<void> {
  // Force a re-POST: clear both the persistent and in-process markers so
  // syncTokenToBackend actually hits the network. The backend wipes
  // fcmTokens on every login (single-device policy), so the previous
  // synced state on this device is meaningless to the new user record.
  await AsyncStorage.removeItem(FCM_TOKEN_SYNCED_KEY);
  lastSyncedTokenInProcess = null;
  const cached = await AsyncStorage.getItem(FCM_TOKEN_KEY);
  if (cached) {
    await syncTokenToBackend(cached);
    return;
  }
  await ensureFcmTokenRegistered();
}

export async function getStoredFcmToken(): Promise<string | null> {
  return AsyncStorage.getItem(FCM_TOKEN_KEY);
}

/**
 * Logout cleanup. Removes this device's token from the user's `fcmTokens`
 * array SERVER-SIDE, then deletes the Firebase token locally.
 *
 * The server call is the important half: dispatch reads `user.fcmTokens`, so
 * a token left behind there keeps ringing ride requests on a phone whose
 * driver has logged out. Clearing only local state (what this used to do)
 * never touched the user record.
 *
 * MUST run before the auth tokens are cleared — the DELETE needs the still
 * valid access token. See `logout()` in api.ts for the ordering.
 */
export async function clearFcmToken(serverSide = true): Promise<void> {
  try {
    const token = await AsyncStorage.getItem(FCM_TOKEN_KEY);
    const authToken = await AsyncStorage.getItem(ACCESS_TOKEN_KEY);
    // serverSide=false is used when the access token is already dead (session
    // expiry / deleted account) — the DELETE could only 401, so skip straight
    // to invalidating the Firebase token, which is what stops delivery.
    if (serverSide && token && authToken) {
      // Own try/catch so a network failure here still lets deleteToken() run.
      try {
        const res = await fetch(`${API_BASE_URL}/notifications/fcm-token`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${authToken}`,
          },
          body: JSON.stringify({ token }),
        });
        if (!res.ok) {
          console.warn('[fcm] unregister failed:', res.status, await res.text());
        }
      } catch (err) {
        console.warn('[fcm] unregister error:', err);
      }
    } else if (serverSide && token && !authToken) {
      console.warn(
        '[fcm] unregister skipped: auth token already cleared — server still holds this device token',
      );
    }
    // Invalidate the device token itself so a re-login mints a fresh one and
    // re-registers cleanly (and so any push already in flight is rejected).
    await messaging().deleteToken();
  } finally {
    // Drop the in-process dedupe marker too, otherwise syncTokenToBackend
    // could short-circuit the re-POST for the next user on this device.
    lastSyncedTokenInProcess = null;
    await Promise.all([
      AsyncStorage.removeItem(FCM_TOKEN_KEY),
      AsyncStorage.removeItem(FCM_TOKEN_SYNCED_KEY),
    ]);
  }
}
