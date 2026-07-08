/**
 * @format
 */

import { AppRegistry, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import messaging from '@react-native-firebase/messaging';
import notifee, {
  AndroidImportance,
  AndroidCategory,
  AndroidVisibility,
  EventType,
} from '@notifee/react-native';
import App from './App';
import { name as appName } from './app.json';

const DEFAULT_CHANNEL_ID = 'ukcaar_default';
const RIDE_ALERTS_CHANNEL_ID = 'ukcaar_ride_alerts';
// Must match PENDING_RIDE_REQUEST_KEY in src/services/fcmService.ts.
const PENDING_RIDE_REQUEST_KEY = 'pendingRideRequest';
// Stable ID so the foreground stopRideAlert() and the in-app
// 'ride:request-taken' handler can cancel whatever the background handler
// posted. Must match RIDE_ALERT_NOTIFICATION_ID in src/services/fcmService.ts.
const RIDE_ALERT_NOTIFICATION_ID = 'ukcaar-ride-alert-ring';

// Background handler runs in headless JS when the app is backgrounded or killed.
//
// Backend sends Android pushes as data-only (see backend firebase.ts). That
// keeps delivery alive on aggressive OEM ROMs (MIUI, FunTouch, ColorOS) where
// notification-payload pushes get dropped after the app is killed. The
// trade-off: WE must render the notification — the OS will not.
messaging().setBackgroundMessageHandler(async (remoteMessage) => {
  if (Platform.OS !== 'android') return;

  // Cancel the looping ride-alert notification when another driver claims
  // the request (or the customer cancels). Without this branch, a driver
  // who was paged via FCM with the socket disconnected keeps ringing
  // forever because the in-app stopRideAlert() never runs while the app
  // is killed/backgrounded.
  if (remoteMessage.data?.kind === 'ride:request-taken') {
    try {
      await notifee.cancelNotification('ukcaar-ride-alert-ring');
    } catch {}
    return;
  }

  const isRideAlert = remoteMessage.data?.kind === 'ride:new-request';

  // Recreate channels — they're process-scoped so the foreground service's
  // creation doesn't carry across to a headless cold start.
  await notifee.createChannel({
    id: DEFAULT_CHANNEL_ID,
    name: 'General notifications',
    importance: AndroidImportance.HIGH,
    sound: 'default',
    vibration: true,
  });
  await notifee.createChannel({
    id: RIDE_ALERTS_CHANNEL_ID,
    name: 'New ride requests',
    importance: AndroidImportance.HIGH,
    sound: 'default',
    vibration: true,
    vibrationPattern: [300, 500, 300, 500],
  });

  const title =
    remoteMessage.data?.title ||
    remoteMessage.notification?.title ||
    'UKCAAR';
  const body =
    remoteMessage.data?.body ||
    remoteMessage.data?.message ||
    remoteMessage.notification?.body ||
    '';
  if (!title && !body) return;

  await notifee.displayNotification({
    // Stable ID for ride alerts so a re-emit of the same request replaces
    // (not stacks) the live notification, and so the in-app cancellation
    // path (stopRideAlert / ride:request-taken) can take it down by id.
    ...(isRideAlert ? { id: RIDE_ALERT_NOTIFICATION_ID } : {}),
    title,
    body,
    data: remoteMessage.data || {},
    android: {
      channelId: isRideAlert ? RIDE_ALERTS_CHANNEL_ID : DEFAULT_CHANNEL_ID,
      pressAction: { id: 'default', launchActivity: 'default' },
      // Ride alerts behave like an incoming call: full-screen intent wakes
      // the device, category=call gets us past Doze on most OEMs, and
      // visibility=public means the lock screen shows the full content so
      // the driver doesn't have to unlock to see who/where. We keep the
      // sound looping and the notification ongoing/un-dismissable so the
      // ring continues until the driver accepts/rejects or the app
      // dismisses it via ride:request-taken — same UX as the foreground
      // buzzForRideAlert() path.
      ...(isRideAlert
        ? {
            importance: AndroidImportance.HIGH,
            category: AndroidCategory.CALL,
            visibility: AndroidVisibility.PUBLIC,
            fullScreenAction: { id: 'default', launchActivity: 'default' },
            loopSound: true,
            ongoing: true,
            autoCancel: false,
          }
        : {}),
    },
  });
});

// Notifee background/killed press handler. Registering this is REQUIRED once
// the app displays Notifee notifications from headless JS. When the driver
// taps a ride alert while the app is backgrounded-but-alive, FCM's open events
// don't fire (the notification was rendered by Notifee, not FCM) and we can't
// touch React state from here — so stash the ride payload for App.tsx to drain
// on the next foreground, which re-surfaces the RideRequestModal.
notifee.onBackgroundEvent(async ({ type, detail }) => {
  const data = detail?.notification?.data;
  if (type === EventType.PRESS && data?.kind === 'ride:new-request') {
    try {
      await AsyncStorage.setItem(
        PENDING_RIDE_REQUEST_KEY,
        JSON.stringify({ ...data, tappedAt: Date.now() }),
      );
    } catch {}
  }
});

AppRegistry.registerComponent(appName, () => App);
