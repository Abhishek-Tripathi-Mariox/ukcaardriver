import { Linking, NativeModules, PermissionsAndroid, Platform, Alert } from 'react-native';
import messaging from '@react-native-firebase/messaging';
import notifee from '@notifee/react-native';

/**
 * Single source of truth for permission prompts. The driver app needs FOUR
 * things to function correctly as a ride-hailing service:
 *
 *   1. POST_NOTIFICATIONS  → so the OS lets us show ride-request alerts.
 *   2. ACCESS_FINE_LOCATION → so dispatch can find the driver and the
 *      customer's tracking screen has a pin to follow.
 *   3. ACCESS_BACKGROUND_LOCATION → so GPS keeps flowing when the driver
 *      minimizes the app or locks the phone mid-ride. Android requires this
 *      to be requested AFTER fine has already been granted, in a separate
 *      prompt, otherwise the OS silently denies it.
 *   4. CALL_PHONE → so the driver can one-tap dial the customer from the
 *      in-ride screen.
 *
 * We bundle them into a single `requestAllDriverPermissions()` so the
 * onboarding flow can run them in the right order and surface a single
 * "open settings" CTA if anything got permanently denied.
 */

export interface PermissionStatus {
  notifications: boolean;
  location: boolean;
  backgroundLocation: boolean;
  callPhone: boolean;
}

export async function requestNotificationPermission(): Promise<boolean> {
  if (Platform.OS === 'ios') {
    const status = await messaging().requestPermission();
    return (
      status === messaging.AuthorizationStatus.AUTHORIZED ||
      status === messaging.AuthorizationStatus.PROVISIONAL
    );
  }
  // Android <13 grants notifications by default; nothing to ask.
  if (Platform.Version < 33) return true;
  const result = await PermissionsAndroid.request(
    PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
    {
      title: 'Allow notifications',
      message:
        'UKCAAR Driver needs notifications so we can alert you the moment a new ride request comes in. Without this you will miss rides.',
      buttonPositive: 'Allow',
      buttonNegative: 'Deny',
    },
  );
  return result === PermissionsAndroid.RESULTS.GRANTED;
}

async function requestForegroundLocation(): Promise<boolean> {
  if (Platform.OS !== 'android') return true;
  const result = await PermissionsAndroid.request(
    PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
    {
      title: 'Allow precise location',
      message:
        'We use your location to match you with nearby ride requests and to show passengers an accurate ETA. This is required to receive rides.',
      buttonPositive: 'Allow',
      buttonNegative: 'Deny',
    },
  );
  return result === PermissionsAndroid.RESULTS.GRANTED;
}

async function requestBackgroundLocation(): Promise<boolean> {
  if (Platform.OS !== 'android') return true;
  // Pre-Android 10 there's no separate background-location permission; FINE
  // covers both. From Android 10 (API 29) onward we have to ask separately.
  if (Platform.Version < 29) return true;
  const result = await PermissionsAndroid.request(
    // Older typings may not include this constant — fall back to the raw string.
    (PermissionsAndroid.PERMISSIONS as Record<string, string>)
      .ACCESS_BACKGROUND_LOCATION ?? 'android.permission.ACCESS_BACKGROUND_LOCATION',
    {
      title: 'Allow location all the time',
      message:
        'On the next screen, please choose "Allow all the time" so we can keep your location updated for the customer while you are mid-ride, even if you switch apps or lock your phone.',
      buttonPositive: 'Open settings',
      buttonNegative: 'Not now',
    },
  );
  return result === PermissionsAndroid.RESULTS.GRANTED;
}

async function requestCallPhone(): Promise<boolean> {
  if (Platform.OS !== 'android') return true;
  const result = await PermissionsAndroid.request(
    PermissionsAndroid.PERMISSIONS.CALL_PHONE,
    {
      title: 'Allow phone calls',
      message:
        'Lets you tap the call button to ring the passenger directly from the ride screen.',
      buttonPositive: 'Allow',
      buttonNegative: 'Deny',
    },
  );
  return result === PermissionsAndroid.RESULTS.GRANTED;
}

/**
 * Camera permission for capturing document / profile photos.
 *
 * Because `android.permission.CAMERA` is declared in AndroidManifest.xml,
 * react-native-image-picker will NOT request it for us — Android requires a
 * runtime grant first, otherwise `launchCamera` fails with an error. So we
 * must ask here before opening the camera. (iOS handles its own prompt via
 * NSCameraUsageDescription the first time the camera is launched.)
 */
export async function requestCameraPermission(): Promise<boolean> {
  if (Platform.OS !== 'android') return true;
  // Already granted from a previous capture — don't re-prompt.
  if (await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.CAMERA)) {
    return true;
  }
  const result = await PermissionsAndroid.request(
    PermissionsAndroid.PERMISSIONS.CAMERA,
    {
      title: 'Allow camera access',
      message:
        'UKCAAR Driver needs the camera so you can photograph your documents (RC, insurance) and profile picture.',
      buttonPositive: 'Allow',
      buttonNegative: 'Deny',
    },
  );
  return result === PermissionsAndroid.RESULTS.GRANTED;
}

/**
 * Run the full permission gauntlet in the right order. Safe to call
 * multiple times — Android won't re-prompt for things already decided.
 *
 * Returns a per-permission status so the UI can decide what to do:
 *   - All true → proceed to dashboard.
 *   - Notifications or foreground location false → show a "must enable"
 *     screen with an "Open settings" button.
 *   - Background location false → show a soft warning ("rides will pause
 *     when you minimize the app"). Don't block — many drivers grant it
 *     later when they see the prompt mid-ride.
 */
export async function requestAllDriverPermissions(): Promise<PermissionStatus> {
  const notifications = await requestNotificationPermission();
  const location = await requestForegroundLocation();
  // Background is a follow-up prompt to foreground; only ask if we already
  // got foreground (Android won't show it otherwise — the OS rule is that
  // the user must already trust us with location-while-using before we ask
  // for location-always).
  const backgroundLocation = location ? await requestBackgroundLocation() : false;
  const callPhone = await requestCallPhone();
  return { notifications, location, backgroundLocation, callPhone };
}

/** Open the OS-level app settings so the user can grant permissions that
 *  were permanently denied (Android shows "Don't ask again" after the
 *  second deny). */
export function openAppSettings(): void {
  Linking.openSettings().catch(() => {
    Alert.alert(
      'Could not open settings',
      'Please open Settings → Apps → UKCAAR Driver → Permissions and enable Location and Notifications.',
    );
  });
}

/**
 * Read-only check for the permissions we cannot run the app without.
 * Returns true only when:
 *   - notifications: OS will let us show ride-request alerts
 *   - location:      dispatch can find the driver
 *
 * Background location and CALL_PHONE are *important* but the app degrades
 * gracefully without them (background → rides pause when app is minimized;
 * CALL_PHONE → driver uses dialler app instead of in-app one-tap), so they
 * don't block the dashboard.
 */
export async function hasCriticalDriverPermissions(): Promise<{
  notifications: boolean;
  location: boolean;
}> {
  let notifications = true;
  if (Platform.OS === 'ios') {
    const status = await messaging().hasPermission();
    notifications =
      status === messaging.AuthorizationStatus.AUTHORIZED ||
      status === messaging.AuthorizationStatus.PROVISIONAL;
  } else if ((Platform.Version as number) >= 33) {
    notifications = await PermissionsAndroid.check(
      PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
    );
  }

  let location = true;
  if (Platform.OS === 'android') {
    location = await PermissionsAndroid.check(
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
    );
  }

  return { notifications, location };
}

/**
 * Some OEMs (Xiaomi/MIUI, Vivo/FunTouch, Oppo/ColorOS, Realme) ship an
 * extra "battery optimization / autostart" gate that silently kills our
 * background JS process and prevents FCM delivery — even when the user
 * has granted notifications. We can't bypass this programmatically (Google
 * forbids it), but we *can* deep-link the user into the right OEM settings
 * page and let them whitelist the app in two taps.
 *
 * `notifee.openBatteryOptimizationSettings()` opens the standard Android
 * battery-optimization screen; it's the best cross-OEM entry point. If the
 * device manufacturer has a more specific setting (MIUI's "Autostart"),
 * the user usually has to navigate one more level — but starting here is
 * way more discoverable than asking them to find it themselves.
 */
export async function isBatteryOptimizationEnabled(): Promise<boolean> {
  if (Platform.OS !== 'android') return false;
  try {
    const level = await notifee.getPowerManagerInfo();
    // `activity` present means the OS has a power-manager intent we can
    // open to disable optimization. If it's not present, the device is
    // already off the optimizer.
    return !!level.activity;
  } catch {
    return false;
  }
}

export async function openBatteryOptimizationSettings(): Promise<void> {
  if (Platform.OS !== 'android') return;
  try {
    await notifee.openPowerManagerSettings();
  } catch {
    try {
      await notifee.openBatteryOptimizationSettings();
    } catch {
      Linking.openSettings().catch(() => {});
    }
  }
}

/** True if the device manufacturer is on the aggressive-killer list and
 *  the user is most likely to need the battery whitelist instructions. */
export function isAggressiveOemDevice(): boolean {
  if (Platform.OS !== 'android') return false;
  const brand = String(
    (NativeModules.PlatformConstants as any)?.Brand ??
      (NativeModules.PlatformConstants as any)?.Manufacturer ??
      '',
  ).toLowerCase();
  return /xiaomi|redmi|poco|vivo|iqoo|oppo|realme|oneplus|honor|huawei/.test(
    brand,
  );
}
