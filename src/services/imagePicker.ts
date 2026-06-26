import { Alert } from 'react-native';
import {
  Asset,
  CameraType,
  launchCamera,
  launchImageLibrary,
} from 'react-native-image-picker';
import { openAppSettings, requestCameraPermission } from './permissions';

/**
 * Single source chooser for every document / photo upload in the app.
 *
 * Each upload flow used to inline its own `launchImageLibrary` call, which
 * meant (a) gallery was the only option and (b) the camera-permission gotcha
 * had to be re-solved per screen. This helper centralises both: it shows a
 * Camera / Gallery action sheet, requests the runtime CAMERA permission when
 * needed (see services/permissions.ts), surfaces picker errors, and resolves
 * with the chosen asset — or null if the user cancelled / something failed.
 */

async function fromGallery(): Promise<Asset | null> {
  const result = await launchImageLibrary({
    mediaType: 'photo',
    quality: 0.8,
    selectionLimit: 1,
  });
  if (result.didCancel) return null;
  if (result.errorCode) {
    Alert.alert('Could not open gallery', result.errorMessage ?? 'Unknown error');
    return null;
  }
  return result.assets?.[0] ?? null;
}

async function fromCamera(cameraType: CameraType): Promise<Asset | null> {
  // CAMERA is declared in the manifest, so react-native-image-picker won't
  // request it for us — we must hold the runtime grant before launching.
  const granted = await requestCameraPermission();
  if (!granted) {
    Alert.alert(
      'Camera permission needed',
      'Please allow camera access to take a photo. You can enable it in Settings.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Open settings', onPress: openAppSettings },
      ],
    );
    return null;
  }
  const result = await launchCamera({
    mediaType: 'photo',
    quality: 0.8,
    cameraType,
    saveToPhotos: false,
  });
  if (result.didCancel) return null;
  if (result.errorCode) {
    Alert.alert(
      'Could not open camera',
      result.errorMessage ?? 'Camera permission may be denied.',
    );
    return null;
  }
  return result.assets?.[0] ?? null;
}

export interface PickImageOptions {
  /** Which camera to default to. Use 'front' for selfie/profile shots. */
  cameraType?: CameraType;
}

/**
 * Show a Camera / Gallery prompt and resolve with the picked image asset,
 * or null if the user cancelled or an error occurred. The returned asset is
 * ready to hand straight to `uploadDocument`.
 */
export function pickImageFromSource(
  title = 'Upload document',
  options: PickImageOptions = {},
): Promise<Asset | null> {
  const cameraType: CameraType = options.cameraType ?? 'back';
  return new Promise(resolve => {
    Alert.alert(
      title,
      'Choose a source',
      [
        { text: 'Camera', onPress: () => fromCamera(cameraType).then(resolve) },
        { text: 'Gallery', onPress: () => fromGallery().then(resolve) },
        { text: 'Cancel', style: 'cancel', onPress: () => resolve(null) },
      ],
      // Tapping outside the sheet (Android) dismisses without a button —
      // resolve(null) so callers never hang. resolve is idempotent.
      { cancelable: true, onDismiss: () => resolve(null) },
    );
  });
}
