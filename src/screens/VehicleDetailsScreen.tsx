import DocUploadField from '../components/RegistrationDocumentField';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { pickImageFromSource } from '../services/imagePicker';
import {
  ChevronDownIcon,
} from '../components/icons/ServiceTypeIcons';
import RegistrationHeader from '../components/RegistrationHeader';
import { PrimaryButton } from '../components/PrimaryButton';
import { fs, s, vs } from '../theme/responsive';
import {
  CatalogueType,
  DocumentType,
  listFuelTypes,
  listVehicleTypes,
  updateRegistrationStep,
  uploadDocument,
} from '../services/api';

export interface VehicleDetails {
  brand: string;
  model: string;
  vehicleType: string;
  vehicleTypeCode: string;
  fuelType: string;
  fuelTypeCode: string;
  color: string;
  year: string;
  seating: string;
  registrationNo: string;
  insuranceNo: string;
  insuranceExpiry: string;
  // S3 URLs for the vehicle RC and insurance certificate. Both are
  // mandatory at this step so admins have proof against the numbers above.
  vehicleRcUrl: string | null;
  insuranceUrl: string | null;
  /** Exterior photo of the vehicle with the number plate visible. */
  vehiclePhotoUrl: string | null;
  /** Pollution Under Control certificate — optional at submit. */
  pucUrl: string | null;
}

interface VehicleDetailsScreenProps {
  initialVehicle?: {
    vehicleMake?: string; vehicleModel?: string; vehicleTypeCode?: string;
    fuelTypeCode?: string; vehicleColor?: string; vehicleYear?: string;
    seatingCapacity?: number; plateNumber?: string; insuranceNumber?: string;
    insuranceExpiry?: string | null;
  };
  /** Driver's chosen service (instant | private | scheduled) — vehicle
   *  types are filtered to the admin-defined tier for it. */
  serviceType?: string;
  onBack: () => void;
  onNext: (details: VehicleDetails) => void;
  onLogout: () => void;
  currentStep?: number;
  totalSteps?: number;
  initialDocs?: { type: string; url: string; status: string }[];
}

const VEHICLE_COLORS = ['White', 'Black', 'Silver', 'Grey', 'Red', 'Blue', 'Yellow'];

function formatDate(d: Date): string {
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  return `${dd}/${mm}/${d.getFullYear()}`;
}

interface FieldProps {
  label: string;
  children: React.ReactNode;
}

function Field({ label, children }: FieldProps) {
  return (
    <View className="mb-4">
      <Text className="mb-2 text-sm font-poppins-medium text-slate-800">{label}</Text>
      {children}
    </View>
  );
}

interface TextFieldProps {
  value: string;
  placeholder: string;
  onChangeText: (v: string) => void;
  keyboardType?: 'default' | 'number-pad';
  maxLength?: number;
  autoCapitalize?: 'none' | 'characters' | 'words';
}

function TextField({
  value,
  placeholder,
  onChangeText,
  keyboardType = 'default',
  maxLength,
  autoCapitalize = 'words',
}: TextFieldProps) {
  return (
    <TextInput
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor="#717182"
      keyboardType={keyboardType}
      maxLength={maxLength}
      autoCapitalize={autoCapitalize}
      className="rounded-2xl bg-[#F3F3F5] font-poppins text-slate-900"
      // fontFamily pinned explicitly: Android drops the className font on
      // number-pad inputs (the Seating field rendered in the system font).
      style={{ height: vs(50), paddingHorizontal: s(14), fontSize: fs(15), fontFamily: 'Poppins-Regular' }}
    />
  );
}

interface SelectFieldProps {
  value: string;
  placeholder: string;
  onPress: () => void;
}

function SelectField({ value, placeholder, onPress }: SelectFieldProps) {
  const isEmpty = value.length === 0;
  return (
    <Pressable
      onPress={onPress}
      className="flex-row items-center justify-between rounded-2xl bg-[#F3F3F5]"
      style={{ height: vs(50), paddingHorizontal: s(14) }}
    >
      <Text
        className={`font-poppins ${isEmpty ? 'text-[#717182]' : 'text-slate-900'}`}
        style={{ fontSize: fs(15) }}
      >
        {isEmpty ? placeholder : value}
      </Text>
      <ChevronDownIcon size={s(14)} />
    </Pressable>
  );
}

interface PickerModalProps {
  visible: boolean;
  title: string;
  options: string[];
  onSelect: (value: string) => void;
  onClose: () => void;
}

function PickerModal({ visible, title, options, onSelect, onClose }: PickerModalProps) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable onPress={onClose} className="flex-1 bg-black/40 justify-end">
        <Pressable
          className="rounded-t-3xl bg-white p-5"
          // Edge-to-edge (SDK 36): keep the Cancel button above the nav bar.
          style={{ maxHeight: '70%', paddingBottom: Math.max(insets.bottom, 12) + 8 }}
        >
          <Text className="mb-3 text-lg font-poppins-semibold text-slate-800">{title}</Text>
          <ScrollView showsVerticalScrollIndicator={false}>
            {options.map(option => (
              <Pressable
                key={option}
                onPress={() => {
                  onSelect(option);
                  onClose();
                }}
                className="border-b border-slate-100 py-3"
              >
                <Text className="text-base text-slate-700">{option}</Text>
              </Pressable>
            ))}
          </ScrollView>
          <Pressable onPress={onClose} className="mt-4 h-12 items-center justify-center rounded-2xl bg-slate-100">
            <Text className="text-sm font-poppins-medium text-slate-600">Cancel</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

export function VehicleDetailsScreen({
  serviceType,
  onBack,
  onNext,
  onLogout,
  currentStep = 4,
  totalSteps = 6,
  initialDocs,
  initialVehicle,
}: VehicleDetailsScreenProps) {
  const insets = useSafeAreaInsets();
  const initialRc = initialDocs?.find(d => d.type === 'vehicle');
  const initialInsurance = initialDocs?.find(d => d.type === 'insurance');

  const [details, setDetails] = useState<VehicleDetails>({
    brand: initialVehicle?.vehicleMake ?? '',
    model: initialVehicle?.vehicleModel ?? '',
    vehicleType: '',
    vehicleTypeCode: initialVehicle?.vehicleTypeCode ?? '',
    fuelType: '',
    fuelTypeCode: initialVehicle?.fuelTypeCode ?? '',
    color: initialVehicle?.vehicleColor ?? '',
    year: initialVehicle?.vehicleYear ?? '',
    seating: initialVehicle?.seatingCapacity ? String(initialVehicle.seatingCapacity) : '',
    registrationNo: initialVehicle?.plateNumber ?? '',
    insuranceNo: initialVehicle?.insuranceNumber ?? '',
    insuranceExpiry: initialVehicle?.insuranceExpiry ? formatDate(new Date(initialVehicle.insuranceExpiry)) : '',
    vehicleRcUrl: initialRc?.url ?? null,
    insuranceUrl: initialInsurance?.url ?? null,
    vehiclePhotoUrl: initialDocs?.find(d => d.type === 'vehicle-photo')?.url ?? null,
    pucUrl: initialDocs?.find(d => d.type === 'puc')?.url ?? null,
  });
  const [docStatus, setDocStatus] = useState<Record<string, string>>(Object.fromEntries((initialDocs ?? []).map(doc => [doc.type, doc.status])));
  const [uploading, setUploading] = useState<{ [k in DocumentType]?: boolean }>({});
  const [typePickerOpen, setTypePickerOpen] = useState(false);
  const [fuelPickerOpen, setFuelPickerOpen] = useState(false);
  const [colorPickerOpen, setColorPickerOpen] = useState(false);
  const [yearPickerOpen, setYearPickerOpen] = useState(false);
  const [expiryPickerOpen, setExpiryPickerOpen] = useState(false);

  const [vehicleTypes, setVehicleTypes] = useState<CatalogueType[]>([]);
  const [fuelTypes, setFuelTypes] = useState<CatalogueType[]>([]);
  const [catalogueError, setCatalogueError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [catalogueLoading, setCatalogueLoading] = useState(true);
  const [catalogueAttempt, setCatalogueAttempt] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  // Fetch admin-managed vehicle / fuel types when the screen mounts.
  // We don't block rendering on this — the user just can't tap the
  // type pickers until they've loaded.
  useEffect(() => {
    let cancelled = false;
    setCatalogueLoading(true);
    setCatalogueError(null);
    setVehicleTypes([]);
    setTypePickerOpen(false);
    Promise.all([listVehicleTypes(), listFuelTypes()])
      .then(([vts, fts]) => {
        if (cancelled) return;
        // Instant and Private each have their own admin-defined vehicle types
        // (VehicleType.tier). Showing every type let a driver register e.g. a
        // Private-tier car under Instant. Legacy types belong to Instant.
        const tierFiltered =
          serviceType === 'instant' || serviceType === 'private'
            ? vts.filter(t => t.isActive !== false && (t.tier ?? 'instant') === serviceType)
            : vts.filter(t => t.isActive !== false);
        setVehicleTypes(tierFiltered);
        setFuelTypes(fts);
        setDetails(previous => ({ ...previous,
          vehicleType: tierFiltered.find(type => type.code === previous.vehicleTypeCode)?.name ?? '',
          vehicleTypeCode: tierFiltered.some(type => type.code === previous.vehicleTypeCode) ? previous.vehicleTypeCode : '',
          fuelType: fts.find(type => type.code === previous.fuelTypeCode)?.name ?? previous.fuelType,
        }));
      })
      .catch(err => {
        console.warn('[vehicle-details] catalogue fetch failed:', err);
        if (!cancelled) {
          setCatalogueError('Could not load vehicle / fuel types. Please retry.');
        }
      }).finally(() => { if (!cancelled) setCatalogueLoading(false); });
    return () => {
      cancelled = true;
    };
  }, [serviceType, catalogueAttempt]);

  const update = <K extends keyof VehicleDetails>(key: K, value: VehicleDetails[K]) =>
    setDetails(prev => ({ ...prev, [key]: value }));

  const canProceed =
    details.brand.trim().length > 0 &&
    details.model.trim().length > 0 &&
    !catalogueLoading && vehicleTypes.some(type => type.code === details.vehicleTypeCode) &&
    details.fuelTypeCode.length > 0 &&
    details.color.length > 0 &&
    details.year.length === 4 &&
    Number.isInteger(Number(details.seating)) && Number(details.seating) >= 1 && Number(details.seating) <= 100 &&
    details.registrationNo.trim().length > 0 &&
    details.insuranceNo.trim().length > 0 &&
    details.insuranceExpiry.trim().length > 0 &&
    details.vehicleRcUrl !== null &&
    details.vehiclePhotoUrl !== null &&
    details.insuranceUrl !== null &&
    !submitting;

  // Upload a picked asset (from camera or gallery) and stash the returned
  // S3 URL against the right field. Shared by both source pickers below.
  const uploadAsset = async (
    type: 'vehicle' | 'vehicle-photo' | 'insurance' | 'puc',
    asset: { uri?: string; fileName?: string; type?: string } | undefined,
  ) => {
    if (!asset?.uri) return;
    try {
      setUploading(prev => ({ ...prev, [type]: true }));
      const { url } = await uploadDocument(
        { uri: asset.uri, fileName: asset.fileName, type: asset.type },
        type,
      );
      setDocStatus(previous => ({ ...previous, [type]: 'pending' }));
      if (type === 'vehicle') update('vehicleRcUrl', url);
      else if (type === 'vehicle-photo') update('vehiclePhotoUrl', url);
      else if (type === 'puc') update('pucUrl', url);
      else update('insuranceUrl', url);
    } catch (err: any) {
      console.warn('[vehicle-details] upload', type, 'failed:', err);
      Alert.alert('Upload failed', err?.message ?? 'Try again.');
    } finally {
      setUploading(prev => ({ ...prev, [type]: false }));
    }
  };

  // Tapping an upload tile offers Camera (capture a photo) or Gallery
  // (pick an existing document image) via the shared source chooser.
  const chooseUploadSource = async (
    type: 'vehicle' | 'vehicle-photo' | 'insurance' | 'puc',
  ) => {
    if (uploading[type]) return;
    const label =
      type === 'vehicle'
        ? 'Vehicle RC'
        : type === 'vehicle-photo'
        ? 'Vehicle Photo'
        : type === 'puc'
        ? 'Pollution Certificate (PUC)'
        : 'Insurance Certificate';
    const asset = await pickImageFromSource(`Upload ${label}`);
    if (asset) await uploadAsset(type, asset);
  };

  const handleNext = async () => {
    if (!canProceed) return;
    setSaveError(null);
    setSubmitting(true);
    try {
      // Convert DD/MM/YYYY → ISO so the backend stores a real Date.
      const [dd, mm, yyyy] = details.insuranceExpiry.split('/');
      const expiryIso = new Date(`${yyyy}-${mm}-${dd}T00:00:00.000Z`).toISOString();

      await updateRegistrationStep('driver-details', {
        vehicleMake: details.brand,
        vehicleModel: details.model,
        vehicleYear: details.year,
        vehicleColor: details.color,
        seatingCapacity: Number(details.seating) || undefined,
        plateNumber: details.registrationNo,
        insuranceNumber: details.insuranceNo,
        insuranceExpiry: expiryIso,
        vehicleTypeCode: details.vehicleTypeCode,
        fuelTypeCode: details.fuelTypeCode,
      });
      onNext(details);
    } catch (err: any) {
      console.warn('[vehicle-details] save failed:', err);
      setSaveError(err?.message ?? 'Could not save. Try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View className="flex-1 bg-white">
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      <RegistrationHeader
        title="Driver Registration"
        currentStep={currentStep}
        totalSteps={totalSteps}
        onBack={onBack}
        onLogout={onLogout}
      />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <ScrollView
          className="flex-1"
          contentContainerClassName="px-6 pt-6"
          // pb-10 (40) + nav-bar inset so the Next button clears the system bar.
          contentContainerStyle={{ paddingBottom: 40 + insets.bottom }}
          keyboardShouldPersistTaps="handled"
        >
          <Text className="font-poppins-semibold text-slate-800" style={{ marginBottom: vs(16), fontSize: fs(20) }}>
            Vehicle Details
          </Text>

          <Field label="Brand">
            <TextField
              value={details.brand}
              placeholder="e.g., Toyota"
              onChangeText={v => update('brand', v)}
            />
          </Field>

          <Field label="Model">
            <TextField
              value={details.model}
              placeholder="e.g., Innova Crysta"
              onChangeText={v => update('model', v)}
            />
          </Field>

          <Field label="Vehicle type">
            <SelectField
              value={catalogueLoading ? '' : vehicleTypes.find(type => type.code === details.vehicleTypeCode)?.name ?? ''}
              placeholder={
                catalogueLoading ? 'Loading…' : vehicleTypes.length === 0 ? 'No vehicle types available' : 'Select vehicle type'
              }
              onPress={() => vehicleTypes.length > 0 && setTypePickerOpen(true)}
            />
            {!catalogueLoading && !catalogueError && vehicleTypes.length === 0 && <Text className="mt-2 text-sm text-amber-700">No vehicle types are configured for this service. Contact support.</Text>}
            {catalogueError && <Pressable accessibilityRole="button" onPress={() => setCatalogueAttempt(attempt => attempt + 1)}><Text className="mt-2 text-sm text-red-600">{catalogueError} Tap to retry.</Text></Pressable>}
          </Field>

          <Field label="Fuel type">
            <SelectField
              value={details.fuelType}
              placeholder={
                fuelTypes.length === 0 ? 'Loading…' : 'e.g., Petrol'
              }
              onPress={() => fuelTypes.length > 0 && setFuelPickerOpen(true)}
            />
          </Field>

          <Field label="Color of vehicle">
            {/* Free-text + preset picker: the fixed list couldn't describe
                two-tone or uncommon colors, so typing is now allowed too. */}
            <View className="flex-row" style={{ gap: s(8) }}>
              <View className="flex-1">
                <TextField
                  value={details.color}
                  placeholder="Type color, e.g. Pearl White"
                  onChangeText={v => update('color', v)}
                />
              </View>
              <Pressable
                onPress={() => setColorPickerOpen(true)}
                className="items-center justify-center rounded-2xl bg-[#F3F3F5]"
                style={{ height: vs(50), width: vs(50) }}
                accessibilityLabel="Pick from common colors"
              >
                <ChevronDownIcon size={s(20)} color="#717182" />
              </Pressable>
            </View>
          </Field>

          <View className="mb-4 flex-row gap-4">
            <View className="flex-1">
              <Text className="mb-2 text-sm font-poppins-medium text-slate-800">Year</Text>
              <SelectField
                value={details.year}
                placeholder="2023"
                onPress={() => setYearPickerOpen(true)}
              />
            </View>
            <View className="flex-1">
              <Text className="mb-2 text-sm font-poppins-medium text-slate-800">Passenger seats (excludes driver)</Text>
              <TextField
                value={details.seating}
                placeholder="7"
                onChangeText={v => update('seating', v.replace(/\D/g, '').slice(0, 3))}
                keyboardType="number-pad"
                maxLength={3}
              />
            </View>
          </View>

          <Field label="Registration No">
            <TextField
              value={details.registrationNo}
              placeholder="KA-01-AB-1234"
              onChangeText={v => update('registrationNo', v.toUpperCase())}
              autoCapitalize="characters"
            />
          </Field>

          <Field label="Insurance No">
            <TextField
              value={details.insuranceNo}
              placeholder="Enter insurance number"
              onChangeText={v => update('insuranceNo', v)}
              autoCapitalize="characters"
            />
          </Field>

          <Field label="Insurance Expiry Date">
            <SelectField
              value={details.insuranceExpiry}
              placeholder="DD/MM/YYYY"
              onPress={() => setExpiryPickerOpen(true)}
            />
          </Field>

          <DocUploadField
            label="Upload Vehicle RC"
            prompt="Click to upload RC certificate"
            uploadedUrl={details.vehicleRcUrl}
            uploading={!!uploading.vehicle}
            status={docStatus['vehicle']}
            onPress={() => chooseUploadSource('vehicle')}
          />

          <DocUploadField
            label="Upload Vehicle Photo"
            prompt="Click to upload a photo of your vehicle (number plate visible)"
            uploadedUrl={details.vehiclePhotoUrl}
            uploading={!!uploading['vehicle-photo']}
            status={docStatus['vehicle-photo']}
            onPress={() => chooseUploadSource('vehicle-photo')}
          />

          <DocUploadField
            label="Upload Insurance Certificate"
            prompt="Click to upload insurance"
            uploadedUrl={details.insuranceUrl}
            uploading={!!uploading.insurance}
            status={docStatus['insurance']}
            onPress={() => chooseUploadSource('insurance')}
          />

          <DocUploadField
            label="Upload Pollution Certificate (PUC)"
            prompt="Click to upload PUC certificate"
            uploadedUrl={details.pucUrl}
            uploading={!!uploading.puc}
            status={docStatus['puc']}
            onPress={() => chooseUploadSource('puc')}
          />

          {saveError && (
            <Text className="font-poppins text-red-600" style={{ marginBottom: vs(8), fontSize: fs(12) }}>{saveError}</Text>
          )}

          <PrimaryButton
            label="Next"
            onPress={handleNext}
            disabled={!canProceed}
            loading={submitting}
            className="mt-2"
          />
        </ScrollView>
      </TouchableWithoutFeedback>
      </KeyboardAvoidingView>

      <PickerModal
        visible={typePickerOpen}
        title="Select vehicle type"
        options={vehicleTypes.map(t => t.name)}
        onSelect={name => {
          const match = vehicleTypes.find(t => t.name === name);
          update('vehicleType', name);
          update('vehicleTypeCode', match?.code ?? '');
        }}
        onClose={() => setTypePickerOpen(false)}
      />
      <PickerModal
        visible={fuelPickerOpen}
        title="Select fuel type"
        options={fuelTypes.map(t => t.name)}
        onSelect={name => {
          const match = fuelTypes.find(t => t.name === name);
          update('fuelType', name);
          update('fuelTypeCode', match?.code ?? '');
        }}
        onClose={() => setFuelPickerOpen(false)}
      />
      <PickerModal
        visible={colorPickerOpen}
        title="Select color"
        options={VEHICLE_COLORS}
        onSelect={v => update('color', v)}
        onClose={() => setColorPickerOpen(false)}
      />
      <PickerModal
        visible={yearPickerOpen}
        title="Select manufacturing year"
        // Show a 30-year range, newest first.
        options={Array.from({ length: 30 }, (_, i) =>
          String(new Date().getFullYear() - i),
        )}
        onSelect={v => update('year', v)}
        onClose={() => setYearPickerOpen(false)}
      />

      {expiryPickerOpen && (
        <DateTimePicker
          value={
            details.insuranceExpiry
              ? (() => {
                  const [d, m, y] = details.insuranceExpiry.split('/');
                  return new Date(`${y}-${m}-${d}T00:00:00`);
                })()
              : new Date()
          }
          mode="date"
          minimumDate={new Date()}
          onChange={(event, selected) => {
            // On Android the picker auto-dismisses; on iOS it's inline so
            // we close it manually after a value lands.
            setExpiryPickerOpen(Platform.OS === 'ios');
            if (event.type === 'set' && selected) {
              update('insuranceExpiry', formatDate(selected));
            }
          }}
        />
      )}
    </View>
  );
}

export default VehicleDetailsScreen;
