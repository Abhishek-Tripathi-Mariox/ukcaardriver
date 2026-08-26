import { Alert, Linking } from 'react-native';

/**
 * Dial a passenger. Every call site used to be
 * `Linking.openURL(...).catch(() => {})`, which swallowed the failure — a tap
 * that could not open the dialler did nothing at all and left no trace, which
 * is indistinguishable from a dead button.
 *
 * Strips spaces (numbers are stored as "+91 98765 43210" in some records) and
 * surfaces both failure modes: no number on file, and no app able to dial.
 */
export async function dialPhone(raw?: string | null): Promise<void> {
  const phone = (raw ?? '').replace(/[\s-()]/g, '');
  if (!phone) {
    Alert.alert('No phone number', 'This passenger has no contact number on file.');
    return;
  }
  try {
    await Linking.openURL(`tel:${phone}`);
  } catch (err) {
    console.warn('[dial] failed for', phone, err);
    Alert.alert(
      'Could not start the call',
      `Dial ${phone} manually — this device did not open the phone app.`,
    );
  }
}

/**
 * Hand off turn-by-turn navigation to the device's Google Maps app, routing
 * to `dest` from the driver's current location (Google Maps uses the live GPS
 * as the origin automatically). The navigation happens inside the Maps app —
 * we never call the Directions API, so there's zero cost/quota usage.
 *
 * Prefers the `google.navigation:` intent, which jumps straight into driving
 * navigation. If Google Maps isn't available to handle it, falls back to the
 * universal Maps URL (opens the route with a "Start" button), and finally to
 * a `geo:` intent for any other maps app.
 */
export async function openGoogleMapsNavigation(dest: {
  lat: number;
  lng: number;
}): Promise<void> {
  const nav = `google.navigation:q=${dest.lat},${dest.lng}&mode=d`;
  const web = `https://www.google.com/maps/dir/?api=1&destination=${dest.lat},${dest.lng}&travelmode=driving`;
  const geo = `geo:${dest.lat},${dest.lng}?q=${dest.lat},${dest.lng}`;
  for (const url of [nav, web, geo]) {
    try {
      await Linking.openURL(url);
      return;
    } catch {
      // Try the next fallback.
    }
  }
  console.warn('[nav] no maps app could handle navigation to', dest);
}
