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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { pickImageFromSource } from '../services/imagePicker';
import RegistrationHeader from '../components/RegistrationHeader';
import { CarIcon, TabProfileIcon, DocumentIcon, BankIcon } from '../components/icons/ServiceTypeIcons';
import {
  DriverDocument,
  updateRegistrationStep,
  uploadDocument,
} from '../services/api';

type TabId = 'personal' | 'vehicle' | 'documents' | 'bank';

interface CompleteProfileScreenProps {
  onBack: () => void;
  onSubmit: () => void;
  onLogout: () => void;
  vehicleSummary?: VehicleSummary;
  onEditVehicle?: () => void;
  /** Pre-fill values from earlier registration steps / /auth/me. */
  initialFullName?: string;
  initialEmail?: string;
  initialDobIso?: string | null;
  initialAddress?: string;
  initialDocs?: DriverDocument[];
  initialBank?: {
    accountHolder?: string;
    bankName?: string;
    accountNumber?: string;
    ifsc?: string;
    passbookUrl?: string;
  };
}

export interface VehicleSummary {
  brandModel: string;
  registrationNo: string;
  year: string;
  seating: string;
  insurance: string;
  serviceType: string;
}

const TABS: { id: TabId; label: string }[] = [
  { id: 'personal', label: 'Personal' },
  { id: 'vehicle', label: 'Vehicle' },
  { id: 'documents', label: 'Documents' },
  { id: 'bank', label: 'Bank' },
];

/** Vector icon per tab — emoji are banned in this app's UI. */
function TabIcon({ id, active }: { id: TabId; active: boolean }) {
  const color = active ? '#0097B3' : '#6C757D';
  switch (id) {
    case 'personal':
      return <TabProfileIcon size={18} color={color} />;
    case 'vehicle':
      return <CarIcon size={18} color={color} />;
    case 'documents':
      return <DocumentIcon size={18} color={color} />;
    case 'bank':
      return <BankIcon size={18} color={color} />;
  }
}

const DEFAULT_VEHICLE: VehicleSummary = {
  brandModel: '—',
  registrationNo: '—',
  year: '—',
  seating: '—',
  insurance: '—',
  serviceType: '—',
};

interface LabelledInputProps {
  label: string;
  value: string;
  placeholder: string;
  onChangeText?: (v: string) => void;
  keyboardType?: 'default' | 'number-pad' | 'email-address';
  autoCapitalize?: 'none' | 'characters' | 'words' | 'sentences';
  maxLength?: number;
  multiline?: boolean;
}

function LabelledInput({
  label,
  value,
  placeholder,
  onChangeText,
  keyboardType = 'default',
  autoCapitalize = 'sentences',
  maxLength,
  multiline = false,
}: LabelledInputProps) {
  return (
    <View className="mb-4">
      <Text className="mb-2 text-sm font-poppins-medium text-slate-800">{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#717182"
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        maxLength={maxLength}
        multiline={multiline}
        className={`${
          multiline ? 'min-h-[80px] py-3' : 'h-12'
        } rounded-2xl bg-[#F3F3F5] px-3 text-base text-slate-900`}
      />
    </View>
  );
}

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

const STATUS_TONE: Record<string, { bg: string; text: string; label: string }> = {
  verified: { bg: 'bg-emerald-100', text: 'text-emerald-700', label: 'Verified' },
  rejected: { bg: 'bg-red-100', text: 'text-red-700', label: 'Rejected' },
  pending: { bg: 'bg-amber-100', text: 'text-amber-700', label: 'Pending review' },
};

const DOC_LABELS: Record<string, string> = {
  aadhaar: 'Aadhaar',
  licence: 'Driving License',
  'profile-photo': 'Profile Photo',
};

export function CompleteProfileScreen({
  onBack,
  onSubmit,
  onLogout,
  vehicleSummary = DEFAULT_VEHICLE,
  onEditVehicle,
  initialFullName,
  initialEmail,
  initialDobIso,
  initialAddress,
  initialDocs,
  initialBank,
}: CompleteProfileScreenProps) {
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<TabId>('personal');

  const initialDob = isoToDate(initialDobIso ?? null);

  const [personal, setPersonal] = useState({
    fullName: initialFullName ?? '',
    email: initialEmail ?? '',
    dob: initialDob ? ddmmyyyy(initialDob) : '',
    address: initialAddress ?? '',
  });
  const [dobPickerOpen, setDobPickerOpen] = useState(false);

  const [bank, setBank] = useState({
    accountHolder: initialBank?.accountHolder ?? '',
    bankName: initialBank?.bankName ?? '',
    accountNumber: initialBank?.accountNumber ?? '',
    ifsc: initialBank?.ifsc ?? '',
    passbookUrl: initialBank?.passbookUrl ?? null,
  });
  const [uploadingPassbook, setUploadingPassbook] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const docs = initialDocs ?? [];

  // Aadhaar is uploaded in the previous step as two separate docs
  // ('aadhaar-front' + 'aadhaar-back'); older accounts may instead carry a
  // single legacy 'aadhaar'. Collapse them into one display row — otherwise a
  // freshly-uploaded Aadhaar shows as "Not uploaded" here, because it never
  // matched the bare 'aadhaar' type. Status is the worst of the two sides so a
  // rejected/missing half isn't masked by a verified one.
  const aadhaarDoc = ((): DriverDocument | undefined => {
    const legacy = docs.find(d => d.type === 'aadhaar');
    if (legacy) return legacy;
    const front = docs.find(d => d.type === 'aadhaar-front');
    const back = docs.find(d => d.type === 'aadhaar-back');
    if (!front && !back) return undefined;
    const sides = [front, back];
    const status: DriverDocument['status'] = sides.some(
      s => s?.status === 'rejected',
    )
      ? 'rejected'
      : sides.some(s => !s || s.status === 'pending')
        ? 'pending'
        : 'verified';
    return { ...(front ?? back)!, type: 'aadhaar', status };
  })();

  const docsForDisplay = [
    { type: 'aadhaar', label: DOC_LABELS.aadhaar, doc: aadhaarDoc },
    {
      type: 'licence',
      label: DOC_LABELS.licence,
      doc: docs.find(d => d.type === 'licence'),
    },
    {
      type: 'profile-photo',
      label: DOC_LABELS['profile-photo'],
      doc: docs.find(d => d.type === 'profile-photo'),
    },
  ];

  const pickPassbook = async () => {
    try {
      const asset = await pickImageFromSource('Upload Bank Passbook');
      if (!asset?.uri) return;
      setUploadingPassbook(true);
      // Reuse the same /uploads endpoint with a passbook type. The backend
      // routes anything not in the driver-doc set to a generic folder, but
      // we want it under the driver tree, so we tag it as 'phv' for now —
      // it lands in driver/{id}/docs/phv/ on S3.
      // (If you want a dedicated 'passbook' type later, add it to
      // DRIVER_DOC_TYPES in uploadController.ts.)
      const { url } = await uploadDocument(
        { uri: asset.uri, fileName: asset.fileName, type: asset.type },
        'phv' as any,
      );
      setBank(b => ({ ...b, passbookUrl: url }));
    } catch (err: any) {
      Alert.alert('Upload failed', err?.message ?? 'Try again.');
    } finally {
      setUploadingPassbook(false);
    }
  };

  const goToNextTab = async () => {
    const idx = TABS.findIndex(t => t.id === activeTab);
    if (idx < TABS.length - 1) {
      setActiveTab(TABS[idx + 1].id);
      return;
    }
    // Last tab → final submit. Persist everything and advance to 'pending'.
    setError(null);
    setSubmitting(true);
    try {
      const dobIso = ddmmyyyyToIso(personal.dob);
      const trimmed = personal.fullName.trim();
      const [firstName, ...rest] = trimmed.split(/\s+/);
      const lastName = rest.join(' ');
      await updateRegistrationStep('pending', {
        firstName: firstName || '',
        lastName: lastName || '',
        email: personal.email.trim() || undefined,
        dob: dobIso,
        ownerAddress: personal.address.trim() || undefined,
        bankDetails: {
          accountHolder: bank.accountHolder.trim(),
          bankName: bank.bankName.trim(),
          accountNumber: bank.accountNumber.trim(),
          ifsc: bank.ifsc.trim().toUpperCase(),
          passbookUrl: bank.passbookUrl ?? undefined,
        },
      });
      onSubmit();
    } catch (err: any) {
      console.warn('[complete-profile] save failed:', err);
      setError(err?.message ?? 'Could not save. Try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View className="flex-1 bg-white">
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      <RegistrationHeader currentStep={6} onBack={onBack} onLogout={onLogout} />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <ScrollView
          className="flex-1"
          contentContainerClassName="px-6 pt-6"
          // pb-10 (40) + nav-bar inset so the Save button clears the system bar.
          contentContainerStyle={{ paddingBottom: 40 + insets.bottom }}
          keyboardShouldPersistTaps="handled"
        >
          <Text className="mb-4 text-[20px] font-poppins-semibold text-slate-800">
            Complete Your Profile
          </Text>

          <View className="mb-6 flex-row rounded-2xl bg-[#ECECF0] p-1">
            {TABS.map(tab => {
              const isActive = activeTab === tab.id;
              return (
                <Pressable
                  key={tab.id}
                  onPress={() => setActiveTab(tab.id)}
                  className={`flex-1 items-center justify-center rounded-xl py-2 ${
                    isActive ? 'bg-white' : ''
                  }`}
                >
                  <TabIcon id={tab.id} active={isActive} />
                </Pressable>
              );
            })}
          </View>

          {activeTab === 'personal' && (
            <View>
              <LabelledInput
                label="Full Name"
                value={personal.fullName}
                placeholder="Enter full name"
                onChangeText={v => setPersonal(p => ({ ...p, fullName: v }))}
              />
              <LabelledInput
                label="Email"
                value={personal.email}
                placeholder="email@example.com"
                onChangeText={v => setPersonal(p => ({ ...p, email: v }))}
                keyboardType="email-address"
                autoCapitalize="none"
              />
              <View className="mb-4">
                <Text className="mb-2 text-sm font-poppins-medium text-slate-800">
                  Date of Birth
                </Text>
                <Pressable
                  onPress={() => setDobPickerOpen(true)}
                  className="h-12 rounded-2xl bg-[#F3F3F5] px-3 justify-center"
                >
                  <Text
                    className={`text-base ${
                      personal.dob ? 'text-slate-900' : 'text-slate-400'
                    }`}
                  >
                    {personal.dob || 'DD/MM/YYYY'}
                  </Text>
                </Pressable>
              </View>
              <LabelledInput
                label="Address"
                value={personal.address}
                placeholder="Full address"
                onChangeText={v => setPersonal(p => ({ ...p, address: v }))}
                multiline
              />
            </View>
          )}

          {activeTab === 'vehicle' && (
            <View>
              <View className="mb-4 h-12 justify-center rounded-2xl bg-[#F3F3F5] px-4">
                <Text className="text-base font-poppins text-slate-500">
                  Vehicle details already captured
                </Text>
              </View>

              <View className="rounded-2xl bg-[#EAF3FB] p-5">
                <View className="flex-row items-center gap-3">
                  <View className="h-12 w-12 items-center justify-center rounded-full bg-white">
                    <CarIcon size={24} color="#0097B3" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-base font-poppins-semibold text-slate-800">
                      {vehicleSummary.brandModel}
                    </Text>
                    <Text className="text-sm text-slate-500">
                      {vehicleSummary.registrationNo}
                    </Text>
                  </View>
                </View>

                <View className="mt-5 flex-row">
                  <View className="flex-1">
                    <Text className="text-xs text-slate-500">Year</Text>
                    <Text className="mt-0.5 text-sm font-poppins-semibold text-slate-800">
                      {vehicleSummary.year}
                    </Text>
                  </View>
                  <View className="flex-1">
                    <Text className="text-xs text-slate-500">Seating</Text>
                    <Text className="mt-0.5 text-sm font-poppins-semibold text-slate-800">
                      {vehicleSummary.seating}
                    </Text>
                  </View>
                </View>

                <View className="mt-4 flex-row">
                  <View className="flex-1">
                    <Text className="text-xs text-slate-500">Insurance</Text>
                    <Text className="mt-0.5 text-sm font-poppins-semibold text-slate-800">
                      {vehicleSummary.insurance}
                    </Text>
                  </View>
                  <View className="flex-1">
                    <Text className="text-xs text-slate-500">Service Type</Text>
                    <Text className="mt-0.5 text-sm font-poppins-semibold text-slate-800">
                      {vehicleSummary.serviceType}
                    </Text>
                  </View>
                </View>
              </View>

            </View>
          )}

          {activeTab === 'documents' && (
            <View>
              <Text className="mb-4 text-sm text-slate-500">
                These were uploaded in the previous step. Tap "Back" to replace
                a rejected document.
              </Text>
              {docsForDisplay.map(({ type, label, doc }) => {
                const status = (doc?.status ?? 'missing') as
                  | 'pending'
                  | 'verified'
                  | 'rejected'
                  | 'missing';
                const tone =
                  status === 'missing'
                    ? { bg: 'bg-slate-100', text: 'text-slate-500', label: 'Not uploaded' }
                    : STATUS_TONE[status];
                return (
                  <View
                    key={type}
                    className="mb-3 flex-row items-center justify-between rounded-2xl border border-slate-200 px-4 py-3"
                  >
                    <Text className="text-sm font-poppins-medium text-slate-800">
                      {label}
                    </Text>
                    <View
                      className={`rounded-full px-3 py-1 ${tone.bg}`}
                    >
                      <Text className={`text-xs font-poppins-medium ${tone.text}`}>
                        {tone.label}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>
          )}

          {activeTab === 'bank' && (
            <View>
              <LabelledInput
                label="Account Holder Name"
                value={bank.accountHolder}
                placeholder="As per bank records"
                onChangeText={v => setBank(b => ({ ...b, accountHolder: v }))}
              />
              <LabelledInput
                label="Bank Name"
                value={bank.bankName}
                placeholder="Bank name"
                onChangeText={v => setBank(b => ({ ...b, bankName: v }))}
              />
              <LabelledInput
                label="Account Number"
                value={bank.accountNumber}
                placeholder="Account number"
                onChangeText={v =>
                  setBank(b => ({ ...b, accountNumber: v.replace(/\D/g, '') }))
                }
                keyboardType="number-pad"
              />
              <LabelledInput
                label="IFSC Code"
                value={bank.ifsc}
                placeholder="IFSC code"
                onChangeText={v => setBank(b => ({ ...b, ifsc: v.toUpperCase() }))}
                autoCapitalize="characters"
              />
              <View className="mb-4">
                <Text className="mb-2 text-sm font-poppins-medium text-slate-800">
                  Upload Passbook/Cheque
                </Text>
                <Pressable
                  onPress={uploadingPassbook ? undefined : pickPassbook}
                  className={`h-12 flex-row items-center justify-between rounded-2xl border px-3 ${
                    bank.passbookUrl ? 'border-brand-teal bg-brand-teal/5' : 'border-slate-300'
                  }`}
                >
                  {uploadingPassbook ? (
                    <ActivityIndicator color="#0097B3" />
                  ) : (
                    <Text
                      className={`text-base ${
                        bank.passbookUrl ? 'text-brand-teal' : 'text-slate-400'
                      }`}
                    >
                      {bank.passbookUrl ? 'Uploaded — tap to replace' : 'Upload passbook/cheque'}
                    </Text>
                  )}
                </Pressable>
              </View>
            </View>
          )}

          {error && <Text className="mb-2 text-xs text-red-600">{error}</Text>}

          <Pressable
            onPress={goToNextTab}
            disabled={submitting}
            className={`mt-2 h-12 items-center justify-center rounded-2xl ${
              submitting ? 'bg-brand-teal/50' : 'bg-brand-teal'
            }`}
          >
            {submitting ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text className="text-sm font-poppins-medium text-white">
                {activeTab === 'bank' ? 'Save & Submit' : 'Save & Continue'}
              </Text>
            )}
          </Pressable>

          {/* Edit Detail renders BELOW Save — the primary action comes first.
              Hoisted out of the vehicle tab block, which forced it above. */}
          {activeTab === 'vehicle' && onEditVehicle ? (
            <Pressable
              onPress={onEditVehicle}
              className="mt-3 h-12 items-center justify-center rounded-2xl border border-slate-300"
            >
              <Text className="text-sm font-poppins-medium text-slate-700">
                Edit Detail
              </Text>
            </Pressable>
          ) : null}
        </ScrollView>
      </TouchableWithoutFeedback>
      </KeyboardAvoidingView>

      {dobPickerOpen && (
        <DateTimePicker
          value={
            personal.dob
              ? (() => {
                  const [d, m, y] = personal.dob.split('/');
                  return new Date(`${y}-${m}-${d}T00:00:00`);
                })()
              : new Date(2000, 0, 1)
          }
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          maximumDate={new Date()}
          onChange={(event, selected) => {
            setDobPickerOpen(false);
            if (event.type === 'set' && selected) {
              setPersonal(p => ({ ...p, dob: ddmmyyyy(selected) }));
            }
          }}
        />
      )}
    </View>
  );
}

export default CompleteProfileScreen;
