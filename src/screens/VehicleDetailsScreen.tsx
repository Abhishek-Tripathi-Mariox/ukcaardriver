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
import LinearGradient from 'react-native-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import { pickImageFromSource } from '../services/imagePicker';
import {
  BackArrowIcon,
  ChevronDownIcon,
  UploadIcon,
} from '../components/icons/ServiceTypeIcons';
import LogoutButton from '../components/LogoutButton';
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
}

interface VehicleDetailsScreenProps {
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
      <Text className="mb-2 text-sm font-medium text-slate-800">{label}</Text>
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
      className="h-12 rounded-2xl bg-[#F3F3F5] px-3 text-base text-slate-900"
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
      className="h-12 flex-row items-center justify-between rounded-2xl bg-[#F3F3F5] px-3"
    >
      <Text className={`text-base ${isEmpty ? 'text-[#717182]' : 'text-slate-900'}`}>
        {isEmpty ? placeholder : value}
      </Text>
      <ChevronDownIcon size={14} />
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

interface DocUploadFieldProps {
  label: string;
  prompt: string;
  uploadedUrl: string | null;
  uploading: boolean;
  onPress: () => void;
}

function DocUploadField({
  label,
  prompt,
  uploadedUrl,
  uploading,
  onPress,
}: DocUploadFieldProps) {
  const hasFile = uploadedUrl !== null;
  return (
    <View className="mb-4">
      <Text className="mb-2 text-sm font-medium text-slate-800">{label}</Text>
      <Pressable
        onPress={uploading ? undefined : onPress}
        className={`h-28 items-center justify-center rounded-2xl border ${
          hasFile ? 'border-brand-teal bg-brand-teal/5' : 'border-slate-300 bg-white'
        }`}
      >
        {uploading ? (
          <ActivityIndicator color="#0097B3" />
        ) : (
          <>
            <UploadIcon size={28} color={hasFile ? '#0097B3' : '#99A1AF'} />
            <Text className="mt-2 text-sm text-slate-700">
              {hasFile ? 'Uploaded — tap to replace' : prompt}
            </Text>
          </>
        )}
      </Pressable>
    </View>
  );
}

function PickerModal({ visible, title, options, onSelect, onClose }: PickerModalProps) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable onPress={onClose} className="flex-1 bg-black/40 justify-end">
        <Pressable className="rounded-t-3xl bg-white p-5" style={{ maxHeight: '70%' }}>
          <Text className="mb-3 text-lg font-semibold text-slate-800">{title}</Text>
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
            <Text className="text-sm font-medium text-slate-600">Cancel</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

export function VehicleDetailsScreen({
  onBack,
  onNext,
  onLogout,
  currentStep = 4,
  totalSteps = 6,
  initialDocs,
}: VehicleDetailsScreenProps) {
  const initialRc = initialDocs?.find(d => d.type === 'vehicle');
  const initialInsurance = initialDocs?.find(d => d.type === 'insurance');

  const [details, setDetails] = useState<VehicleDetails>({
    brand: '',
    model: '',
    vehicleType: '',
    vehicleTypeCode: '',
    fuelType: '',
    fuelTypeCode: '',
    color: '',
    year: '',
    seating: '',
    registrationNo: '',
    insuranceNo: '',
    insuranceExpiry: '',
    vehicleRcUrl: initialRc?.url ?? null,
    insuranceUrl: initialInsurance?.url ?? null,
  });
  const [uploading, setUploading] = useState<{ [k in DocumentType]?: boolean }>({});
  const [typePickerOpen, setTypePickerOpen] = useState(false);
  const [fuelPickerOpen, setFuelPickerOpen] = useState(false);
  const [colorPickerOpen, setColorPickerOpen] = useState(false);
  const [yearPickerOpen, setYearPickerOpen] = useState(false);
  const [expiryPickerOpen, setExpiryPickerOpen] = useState(false);

  const [vehicleTypes, setVehicleTypes] = useState<CatalogueType[]>([]);
  const [fuelTypes, setFuelTypes] = useState<CatalogueType[]>([]);
  const [catalogueError, setCatalogueError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Fetch admin-managed vehicle / fuel types when the screen mounts.
  // We don't block rendering on this — the user just can't tap the
  // type pickers until they've loaded.
  useEffect(() => {
    let cancelled = false;
    Promise.all([listVehicleTypes(), listFuelTypes()])
      .then(([vts, fts]) => {
        if (cancelled) return;
        setVehicleTypes(vts);
        setFuelTypes(fts);
      })
      .catch(err => {
        console.warn('[vehicle-details] catalogue fetch failed:', err);
        if (!cancelled) {
          setCatalogueError('Could not load vehicle / fuel types. Pull to retry.');
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const progressPct = `${(currentStep / totalSteps) * 100}%` as const;
  const update = <K extends keyof VehicleDetails>(key: K, value: VehicleDetails[K]) =>
    setDetails(prev => ({ ...prev, [key]: value }));

  const canProceed =
    details.brand.trim().length > 0 &&
    details.model.trim().length > 0 &&
    details.vehicleTypeCode.length > 0 &&
    details.fuelTypeCode.length > 0 &&
    details.color.length > 0 &&
    details.year.length === 4 &&
    details.seating.length > 0 &&
    details.registrationNo.trim().length > 0 &&
    details.insuranceNo.trim().length > 0 &&
    details.insuranceExpiry.trim().length > 0 &&
    details.vehicleRcUrl !== null &&
    details.insuranceUrl !== null &&
    !submitting;

  // Upload a picked asset (from camera or gallery) and stash the returned
  // S3 URL against the right field. Shared by both source pickers below.
  const uploadAsset = async (
    type: 'vehicle' | 'insurance',
    asset: { uri?: string; fileName?: string; type?: string } | undefined,
  ) => {
    if (!asset?.uri) return;
    try {
      setUploading(prev => ({ ...prev, [type]: true }));
      const { url } = await uploadDocument(
        { uri: asset.uri, fileName: asset.fileName, type: asset.type },
        type,
      );
      if (type === 'vehicle') update('vehicleRcUrl', url);
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
  const chooseUploadSource = async (type: 'vehicle' | 'insurance') => {
    if (uploading[type]) return;
    const label = type === 'vehicle' ? 'Vehicle RC' : 'Insurance Certificate';
    const asset = await pickImageFromSource(`Upload ${label}`);
    if (asset) await uploadAsset(type, asset);
  };

  const handleNext = async () => {
    if (!canProceed) return;
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
        plateNumber: details.registrationNo,
        insuranceNumber: details.insuranceNo,
        insuranceExpiry: expiryIso,
        vehicleTypeCode: details.vehicleTypeCode,
        fuelTypeCode: details.fuelTypeCode,
      });
      onNext(details);
    } catch (err: any) {
      console.warn('[vehicle-details] save failed:', err);
      setCatalogueError(err?.message ?? 'Could not save. Try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View className="flex-1 bg-white">
      <StatusBar barStyle="light-content" backgroundColor="#0097B3" translucent />
      <LinearGradient
        colors={['#0097B3', '#00C896']}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
      >
        <SafeAreaView edges={['top']}>
          <View className="px-6 pb-4 pt-4">
            <View className="flex-row items-center gap-4">
              <Pressable onPress={onBack} hitSlop={12}>
                <BackArrowIcon size={24} color="white" />
              </Pressable>
              <View className="flex-1">
                <Text className="text-[20px] font-semibold text-white">
                  Driver Registration
                </Text>
                <Text className="mt-0.5 text-sm text-white/80">
                  Step {currentStep} of {totalSteps}
                </Text>
              </View>
              <LogoutButton onLoggedOut={onLogout} tint="light" />
            </View>
            <View className="mt-3 h-2 w-full overflow-hidden rounded-full bg-white/30">
              <View className="h-full bg-white" style={{ width: progressPct }} />
            </View>
          </View>
        </SafeAreaView>
      </LinearGradient>

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
          <Text className="mb-4 text-[20px] font-semibold text-slate-800">
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
              value={details.vehicleType}
              placeholder={
                vehicleTypes.length === 0 ? 'Loading…' : 'e.g., 2 Wheeler'
              }
              onPress={() => vehicleTypes.length > 0 && setTypePickerOpen(true)}
            />
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
            <SelectField
              value={details.color}
              placeholder="e.g., Red"
              onPress={() => setColorPickerOpen(true)}
            />
          </Field>

          <View className="mb-4 flex-row gap-4">
            <View className="flex-1">
              <Text className="mb-2 text-sm font-medium text-slate-800">Year</Text>
              <SelectField
                value={details.year}
                placeholder="2023"
                onPress={() => setYearPickerOpen(true)}
              />
            </View>
            <View className="flex-1">
              <Text className="mb-2 text-sm font-medium text-slate-800">Seating</Text>
              <TextField
                value={details.seating}
                placeholder="7"
                onChangeText={v => update('seating', v.replace(/\D/g, '').slice(0, 2))}
                keyboardType="number-pad"
                maxLength={2}
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
            onPress={() => chooseUploadSource('vehicle')}
          />

          <DocUploadField
            label="Upload Insurance Certificate"
            prompt="Click to upload insurance"
            uploadedUrl={details.insuranceUrl}
            uploading={!!uploading.insurance}
            onPress={() => chooseUploadSource('insurance')}
          />

          {catalogueError && (
            <Text className="mb-2 text-xs text-red-600">{catalogueError}</Text>
          )}

          <Pressable
            disabled={!canProceed}
            onPress={handleNext}
            className={`mt-2 h-12 flex-row items-center justify-center rounded-2xl ${
              canProceed ? 'bg-brand-teal' : 'bg-brand-teal/50'
            }`}
          >
            {submitting ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text className="text-sm font-medium text-white">Next</Text>
            )}
          </Pressable>
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
