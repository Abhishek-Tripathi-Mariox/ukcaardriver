import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  Text,
  TextInput,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { pickImageFromSource } from '../services/imagePicker';
import RegistrationHeader from '../components/RegistrationHeader';
import { UploadIcon } from '../components/icons/ServiceTypeIcons';
import RoutePickerModal, {
  type RouteSelection,
} from '../components/RoutePickerModal';
import {
  DocumentType,
  registerForRoute,
  updateRegistrationStep,
  uploadDocument,
} from '../services/api';

export interface DriverDetails {
  dlNumber: string;
  dlExpiry: string; // DD/MM/YYYY for display
  yearsExperience: string;
  // S3 URLs returned by the backend after a successful upload.
  aadhaarFrontUrl: string | null;
  aadhaarBackUrl: string | null;
  drivingLicenseUrl: string | null;
  profilePhotoUrl: string | null;
}

interface DriverDetailsScreenProps {
  onBack: () => void;
  onNext: (details: DriverDetails) => void;
  onLogout: () => void;
  initialDlNumber?: string;
  initialDlExpiryIso?: string | null;
  initialYearsExperience?: number | null;
  initialDocs?: { type: string; url: string; status: string }[];
  /** Driver's chosen service type. When 'scheduled', this screen also
   *  requires the driver to pick a route + departure (and optionally a
   *  return leg) before continuing. */
  serviceType?: 'instant' | 'private' | 'scheduled';
}

interface UploadFieldProps {
  label: string;
  prompt: string;
  uploadedUrl: string | null;
  uploading: boolean;
  status?: 'pending' | 'verified' | 'rejected';
  onPress: () => void;
}

function UploadField({
  label,
  prompt,
  uploadedUrl,
  uploading,
  status,
  onPress,
}: UploadFieldProps) {
  const hasFile = uploadedUrl !== null;
  // Status takes priority over the local 'just uploaded' indicator — once
  // the admin has reviewed it, that's what we show.
  const tone =
    status === 'verified'
      ? 'border-emerald-500 bg-emerald-50'
      : status === 'rejected'
        ? 'border-red-500 bg-red-50'
        : hasFile
          ? 'border-brand-teal bg-brand-teal/5'
          : 'border-slate-300 bg-white';
  const iconColor =
    status === 'verified'
      ? '#10B981'
      : status === 'rejected'
        ? '#EF4444'
        : hasFile
          ? '#0097B3'
          : '#99A1AF';
  const subline =
    status === 'verified'
      ? 'Verified by admin'
      : status === 'rejected'
        ? 'Rejected — please re-upload'
        : hasFile
          ? 'Uploaded — pending review'
          : prompt;

  return (
    <View className="mb-4">
      <Text className="mb-2 text-sm font-poppins-medium text-slate-800">{label}</Text>
      <Pressable
        onPress={uploading ? undefined : onPress}
        className={`h-32 items-center justify-center rounded-2xl border ${tone}`}
      >
        {uploading ? (
          <ActivityIndicator color="#0097B3" />
        ) : (
          <>
            <UploadIcon size={32} color={iconColor} />
            <Text className="mt-2 text-sm text-slate-700">{subline}</Text>
            {hasFile && status !== 'verified' && (
              <Text className="mt-0.5 text-xs text-slate-400">
                Tap to replace
              </Text>
            )}
          </>
        )}
      </Pressable>
    </View>
  );
}

const formatHHMM = (hhmm: string): string => {
  // 24h "HH:mm" → 12h "h:mm AM/PM" for display in the route summary card.
  const [h, m] = hhmm.split(':').map(Number);
  if (Number.isNaN(h)) return hhmm;
  const period = h >= 12 ? 'PM' : 'AM';
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${h12}:${String(m).padStart(2, '0')} ${period}`;
};

const ddmmyyyy = (d: Date) => {
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  return `${dd}/${mm}/${d.getFullYear()}`;
};

const isoToDate = (iso: string | null | undefined): Date | null => {
  if (!iso) return null;
  const d = new Date(iso);
  return isNaN(d.getTime()) ? null : d;
};

const ddmmyyyyToIso = (s: string): string | null => {
  const m = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!m) return null;
  const [, dd, mm, yyyy] = m;
  return new Date(`${yyyy}-${mm}-${dd}T00:00:00.000Z`).toISOString();
};

export function DriverDetailsScreen({
  onBack,
  onNext,
  onLogout,
  initialDlNumber,
  initialDlExpiryIso,
  initialYearsExperience,
  initialDocs,
  serviceType,
}: DriverDetailsScreenProps) {
  const isScheduled = serviceType === 'scheduled';
  const findDoc = (t: string) => initialDocs?.find(d => d.type === t);
  // Aadhaar is now split into front + back. Legacy drivers may have a single
  // 'aadhaar' doc from before the split — surface it as the front so they
  // don't get blocked re-uploading.
  const initialAadhaarFront = findDoc('aadhaar-front') ?? findDoc('aadhaar');
  const initialAadhaarBack = findDoc('aadhaar-back');
  const initialLicence = findDoc('licence');
  const initialPhoto = findDoc('profile-photo');

  const initialExpiry = isoToDate(initialDlExpiryIso ?? null);

  const [details, setDetails] = useState<DriverDetails>({
    dlNumber: initialDlNumber ?? '',
    dlExpiry: initialExpiry ? ddmmyyyy(initialExpiry) : '',
    yearsExperience:
      initialYearsExperience !== null && initialYearsExperience !== undefined
        ? String(initialYearsExperience)
        : '',
    aadhaarFrontUrl: initialAadhaarFront?.url ?? null,
    aadhaarBackUrl: initialAadhaarBack?.url ?? null,
    drivingLicenseUrl: initialLicence?.url ?? null,
    profilePhotoUrl: initialPhoto?.url ?? null,
  });
  const [docStatus, setDocStatus] = useState<{
    [k in DocumentType]?: 'pending' | 'verified' | 'rejected';
  }>({
    'aadhaar-front': initialAadhaarFront?.status as any,
    'aadhaar-back': initialAadhaarBack?.status as any,
    licence: initialLicence?.status as any,
    'profile-photo': initialPhoto?.status as any,
  });
  const [uploading, setUploading] = useState<{ [k in DocumentType]?: boolean }>({});
  const [expiryPickerOpen, setExpiryPickerOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [routePickerOpen, setRoutePickerOpen] = useState(false);
  const [routeSelection, setRouteSelection] = useState<RouteSelection | null>(null);

  const update = <K extends keyof DriverDetails>(key: K, value: DriverDetails[K]) =>
    setDetails(prev => ({ ...prev, [key]: value }));

  const pickAndUpload = async (type: DocumentType): Promise<string | null> => {
    try {
      const titles: Partial<Record<DocumentType, string>> = {
        'aadhaar-front': 'Upload Aadhaar (front)',
        'aadhaar-back': 'Upload Aadhaar (back)',
        licence: 'Upload Driving Licence',
        'profile-photo': 'Upload Profile Photo',
      };
      const asset = await pickImageFromSource(titles[type] ?? 'Upload document', {
        cameraType: type === 'profile-photo' ? 'front' : 'back',
      });
      if (!asset?.uri) return null;

      setUploading(prev => ({ ...prev, [type]: true }));
      const { url } = await uploadDocument(
        { uri: asset.uri, fileName: asset.fileName, type: asset.type },
        type,
      );
      // Replacing a previously rejected doc resets status back to 'pending'
      // (the backend already does this; mirror it locally so the UI updates).
      setDocStatus(prev => ({ ...prev, [type]: 'pending' }));
      if (type === 'aadhaar-front') update('aadhaarFrontUrl', url);
      if (type === 'aadhaar-back') update('aadhaarBackUrl', url);
      if (type === 'licence') update('drivingLicenseUrl', url);
      if (type === 'profile-photo') update('profilePhotoUrl', url);
      return url;
    } catch (err: any) {
      console.warn('[upload]', type, 'failed:', err);
      Alert.alert('Upload failed', err?.message ?? 'Try again.');
      return null;
    } finally {
      setUploading(prev => ({ ...prev, [type]: false }));
    }
  };

  // Aadhaar requires two photos. We upload the front first, then immediately
  // prompt the driver to pick the back — fewer taps than two independent
  // buttons, and prevents people from forgetting the back side.
  const startAadhaarUpload = async () => {
    const frontUrl = await pickAndUpload('aadhaar-front');
    if (!frontUrl) return;
    // Small confirmation so the driver knows what's coming next. The
    // gallery picker fires off Alert.onPress synchronously.
    Alert.alert(
      'Front uploaded',
      'Now upload the back side of your Aadhaar.',
      [
        { text: 'Later', style: 'cancel' },
        { text: 'Pick back', onPress: () => pickAndUpload('aadhaar-back') },
      ],
    );
  };

  const canProceed =
    details.dlNumber.trim().length > 0 &&
    details.dlExpiry.length === 10 &&
    details.yearsExperience.length > 0 &&
    details.aadhaarFrontUrl !== null &&
    details.aadhaarBackUrl !== null &&
    details.drivingLicenseUrl !== null &&
    details.profilePhotoUrl !== null &&
    (!isScheduled || routeSelection !== null) &&
    !submitting;

  const handleNext = async () => {
    if (!canProceed) return;
    setError(null);
    setSubmitting(true);
    try {
      // Scheduled drivers: register the route(s) first. If this fails we
      // surface the error and don't advance — the driver hasn't actually
      // locked in their schedule yet, so moving on would be misleading.
      if (isScheduled && routeSelection) {
        await registerForRoute(routeSelection.primary.routeId, {
          departureTime: routeSelection.primary.departureTime,
          roundTrip: routeSelection.returnMode === 'same',
        });
        if (
          routeSelection.returnMode === 'different' &&
          routeSelection.returnRoute
        ) {
          await registerForRoute(routeSelection.returnRoute.routeId, {
            departureTime: routeSelection.returnRoute.departureTime,
            roundTrip: false,
          });
        }
      }
      const expiryIso = ddmmyyyyToIso(details.dlExpiry);
      await updateRegistrationStep('complete-profile', {
        licenceNumber: details.dlNumber.trim(),
        licenceExpiry: expiryIso,
        yearsExperience: Number(details.yearsExperience),
      });
      onNext(details);
    } catch (err: any) {
      console.warn('[driver-details] save failed:', err);
      setError(err?.message ?? 'Could not save. Try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View className="flex-1 bg-white">
      <StatusBar barStyle="light-content" backgroundColor="#0097B3" translucent />
      <RegistrationHeader currentStep={5} onBack={onBack} onLogout={onLogout} />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <ScrollView
          className="flex-1"
          contentContainerClassName="px-6 pt-6 pb-10"
          keyboardShouldPersistTaps="handled"
        >
          <Text className="mb-4 text-[20px] font-poppins-semibold text-slate-800">
            Driver Details
          </Text>

          {isScheduled && (
            <View className="mb-4">
              <Text className="mb-2 text-sm font-poppins-medium text-slate-800">
                Scheduled Route
              </Text>
              {routeSelection ? (
                <View className="rounded-2xl border border-brand-teal/40 bg-brand-teal/5 p-4">
                  <View className="flex-row items-start justify-between gap-3">
                    <View className="flex-1">
                      <Text className="text-sm font-poppins-bold text-slate-800">
                        {routeSelection.primary.routeName}
                      </Text>
                      <Text className="mt-0.5 text-xs text-slate-600">
                        {routeSelection.primary.fromName} →{' '}
                        {routeSelection.primary.toName}
                      </Text>
                      <Text className="mt-1 text-xs text-slate-500">
                        Departs {formatHHMM(routeSelection.primary.departureTime)}
                      </Text>
                    </View>
                    <Pressable onPress={() => setRoutePickerOpen(true)}>
                      <Text className="text-xs font-poppins-medium text-brand-teal">
                        Change
                      </Text>
                    </Pressable>
                  </View>
                  {routeSelection.returnMode === 'same' && (
                    <View className="mt-3 border-t border-brand-teal/30 pt-3">
                      <Text className="text-xs font-poppins-medium text-slate-700">
                        Return: same route reversed
                      </Text>
                      <Text className="mt-0.5 text-xs text-slate-500">
                        {routeSelection.primary.toName} →{' '}
                        {routeSelection.primary.fromName}
                        {routeSelection.sameReturnDepartureTime
                          ? ` · Departs ${formatHHMM(
                              routeSelection.sameReturnDepartureTime,
                            )}`
                          : ''}
                      </Text>
                    </View>
                  )}
                  {routeSelection.returnMode === 'different' &&
                    routeSelection.returnRoute && (
                      <View className="mt-3 border-t border-brand-teal/30 pt-3">
                        <Text className="text-xs font-poppins-medium text-slate-700">
                          Return: {routeSelection.returnRoute.routeName}
                        </Text>
                        <Text className="mt-0.5 text-xs text-slate-500">
                          {routeSelection.returnRoute.fromName} →{' '}
                          {routeSelection.returnRoute.toName} · Departs{' '}
                          {formatHHMM(routeSelection.returnRoute.departureTime)}
                        </Text>
                      </View>
                    )}
                </View>
              ) : (
                <Pressable
                  onPress={() => setRoutePickerOpen(true)}
                  className="h-12 flex-row items-center justify-between rounded-2xl bg-[#F3F3F5] px-3"
                >
                  <Text className="text-base text-[#717182]">
                    Tap to pick your route
                  </Text>
                  <Text className="text-xs font-poppins-medium text-brand-teal">
                    Pick
                  </Text>
                </Pressable>
              )}
            </View>
          )}

          <View className="mb-4">
            <Text className="mb-2 text-sm font-poppins-medium text-slate-800">
              Driving License Number
            </Text>
            <TextInput
              value={details.dlNumber}
              onChangeText={v => update('dlNumber', v.toUpperCase())}
              placeholder="DL Number"
              placeholderTextColor="#717182"
              autoCapitalize="characters"
              className="h-12 rounded-2xl bg-[#F3F3F5] px-3 text-base text-slate-900"
            />
          </View>

          <View className="mb-4">
            <Text className="mb-2 text-sm font-poppins-medium text-slate-800">
              DL Expiry Date
            </Text>
            <Pressable
              onPress={() => setExpiryPickerOpen(true)}
              className="h-12 rounded-2xl bg-[#F3F3F5] px-3 justify-center"
            >
              <Text
                className={`text-base ${
                  details.dlExpiry ? 'text-slate-900' : 'text-slate-400'
                }`}
              >
                {details.dlExpiry || 'DD/MM/YYYY'}
              </Text>
            </Pressable>
          </View>

          <View className="mb-4">
            <Text className="mb-2 text-sm font-poppins-medium text-slate-800">
              Years of Experience
            </Text>
            <TextInput
              value={details.yearsExperience}
              onChangeText={v =>
                update('yearsExperience', v.replace(/\D/g, '').slice(0, 2))
              }
              placeholder="e.g., 5"
              placeholderTextColor="#717182"
              keyboardType="number-pad"
              maxLength={2}
              className="h-12 rounded-2xl bg-[#F3F3F5] px-3 text-base text-slate-900"
            />
          </View>

          <UploadField
            label="Upload Aadhaar (Front)"
            prompt="Click to upload front side"
            uploadedUrl={details.aadhaarFrontUrl}
            uploading={!!uploading['aadhaar-front']}
            status={docStatus['aadhaar-front']}
            onPress={
              // Fresh upload: chain front → back. Re-uploading just the
              // front (e.g. after rejection) doesn't need to re-prompt.
              details.aadhaarFrontUrl
                ? () => pickAndUpload('aadhaar-front')
                : startAadhaarUpload
            }
          />
          <UploadField
            label="Upload Aadhaar (Back)"
            prompt="Click to upload back side"
            uploadedUrl={details.aadhaarBackUrl}
            uploading={!!uploading['aadhaar-back']}
            status={docStatus['aadhaar-back']}
            onPress={() => pickAndUpload('aadhaar-back')}
          />
          <UploadField
            label="Upload Driving License"
            prompt="Click to upload DL"
            uploadedUrl={details.drivingLicenseUrl}
            uploading={!!uploading.licence}
            status={docStatus.licence}
            onPress={() => pickAndUpload('licence')}
          />
          <UploadField
            label="Upload Profile Photo"
            prompt="Click to upload photo"
            uploadedUrl={details.profilePhotoUrl}
            uploading={!!uploading['profile-photo']}
            status={docStatus['profile-photo']}
            onPress={() => pickAndUpload('profile-photo')}
          />

          {error && <Text className="mb-2 text-xs text-red-600">{error}</Text>}

          <Pressable
            disabled={!canProceed}
            onPress={handleNext}
            className={`mt-2 h-12 items-center justify-center rounded-2xl ${
              canProceed ? 'bg-brand-teal' : 'bg-brand-teal/50'
            }`}
          >
            {submitting ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text className="text-sm font-poppins-medium text-white">Next</Text>
            )}
          </Pressable>
        </ScrollView>
      </TouchableWithoutFeedback>
      </KeyboardAvoidingView>

      {expiryPickerOpen && (
        <DateTimePicker
          value={
            details.dlExpiry
              ? (() => {
                  const [d, m, y] = details.dlExpiry.split('/');
                  return new Date(`${y}-${m}-${d}T00:00:00`);
                })()
              : new Date()
          }
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          minimumDate={new Date()}
          onChange={(event, selected) => {
            setExpiryPickerOpen(false);
            if (event.type === 'set' && selected) {
              update('dlExpiry', ddmmyyyy(selected));
            }
          }}
        />
      )}

      {isScheduled && (
        <RoutePickerModal
          visible={routePickerOpen}
          initial={routeSelection}
          onClose={() => setRoutePickerOpen(false)}
          onSave={sel => {
            setRouteSelection(sel);
            setRoutePickerOpen(false);
          }}
        />
      )}
    </View>
  );
}

export default DriverDetailsScreen;
