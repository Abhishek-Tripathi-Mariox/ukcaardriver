import { useState } from 'react';
import {
  ActivityIndicator,
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
import RegistrationHeader from '../components/RegistrationHeader';
import AddressAutocomplete from '../components/AddressAutocomplete';
import { updateRegistrationStep, AddressHit } from '../services/api';

export interface OwnerDetails {
  ownerName: string;
  contactNumber: string;
  address: string;
  /** Lat/lng + structured parts captured when the user picks a suggestion. */
  addressMeta?: AddressHit | null;
}

interface OwnerDetailsScreenProps {
  onBack: () => void;
  onNext: (details: OwnerDetails) => void;
  onLogout: () => void;
  /**
   * The phone number from the verified-OTP user record. We pre-fill this
   * because the driver already proved ownership by completing OTP login;
   * the field is locked to avoid mismatches between login phone and
   * registered owner phone.
   */
  loggedInPhone?: string;
  /** Pre-fill from the user's existing profile when resuming. */
  initialOwnerName?: string;
  initialOwnerAddress?: string;
}

interface FieldProps {
  label: string;
  value: string;
  placeholder: string;
  onChangeText?: (v: string) => void;
  keyboardType?: 'default' | 'number-pad';
  maxLength?: number;
  /** Locked = read-only display, dimmed style. Used for the owner's phone. */
  locked?: boolean;
}

function Field({
  label,
  value,
  placeholder,
  onChangeText,
  keyboardType = 'default',
  maxLength,
  locked = false,
}: FieldProps) {
  return (
    <View className="mb-4">
      <Text className="mb-2 text-sm font-medium text-slate-800">{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#717182"
        keyboardType={keyboardType}
        maxLength={maxLength}
        editable={!locked}
        className={`h-12 rounded-2xl px-3 text-base ${
          locked ? 'bg-[#E8F0FE] text-slate-600' : 'bg-[#F3F3F5] text-slate-900'
        }`}
      />
    </View>
  );
}

export function OwnerDetailsScreen({
  onBack,
  onNext,
  onLogout,
  loggedInPhone,
  initialOwnerName,
  initialOwnerAddress,
}: OwnerDetailsScreenProps) {
  // Pull the local digits out of the stored phone (e.g. '+919876543210'
  // → '9876543210'). We:
  //   1. drop everything that isn't a digit (handles '+', spaces, dashes)
  //   2. strip the leading 2-digit country code if the result is > 10 long
  // If the stored value has fewer than 10 digits (older test accounts),
  // we leave the field UNLOCKED so the user can finish typing — otherwise
  // they'd be stuck with a partial number and a disabled Next button.
  const rawDigits = (loggedInPhone ?? '').replace(/\D/g, '');
  const initialContact = rawDigits.length > 10 ? rawDigits.slice(-10) : rawDigits;
  const phoneLocked = initialContact.length === 10;

  const [details, setDetails] = useState<OwnerDetails>({
    ownerName: initialOwnerName ?? '',
    contactNumber: initialContact,
    address: initialOwnerAddress ?? '',
    addressMeta: null,
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const update = <K extends keyof OwnerDetails>(key: K, value: OwnerDetails[K]) =>
    setDetails(prev => ({ ...prev, [key]: value }));

  const canProceed =
    details.ownerName.trim().length > 0 &&
    details.contactNumber.length === 10 &&
    details.address.trim().length > 0 &&
    !submitting;

  const handleNext = async () => {
    if (!canProceed) return;
    setError(null);
    setSubmitting(true);
    try {
      // After owner details we go to vehicle-details (the new order).
      await updateRegistrationStep('vehicle-details', {
        ownerName: details.ownerName.trim(),
        ownerContact: details.contactNumber,
        ownerAddress: details.address.trim(),
      });
      onNext(details);
    } catch (err: any) {
      console.warn('[owner-details] save failed:', err);
      setError(err?.message ?? 'Could not save. Try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View className="flex-1 bg-white">
      <StatusBar barStyle="light-content" backgroundColor="#0097B3" translucent />
      <RegistrationHeader currentStep={3} onBack={onBack} onLogout={onLogout} />

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
          <Text className="mb-1 text-[20px] font-semibold text-slate-800">
            Owner Details
          </Text>
          <Text className="mb-4 text-sm text-slate-500">
            {phoneLocked
              ? "We'll use your verified mobile number as the owner contact."
              : 'Enter your details below.'}
          </Text>

          <Field
            label="Owner Name"
            value={details.ownerName}
            placeholder="Full name"
            onChangeText={v => update('ownerName', v)}
          />
          <Field
            label="Contact Number"
            value={details.contactNumber}
            placeholder="10 digit mobile"
            keyboardType="number-pad"
            maxLength={10}
            onChangeText={
              phoneLocked ? undefined : v => update('contactNumber', v.replace(/\D/g, ''))
            }
            locked={phoneLocked}
          />
          <AddressAutocomplete
            label="Address"
            value={details.address}
            placeholder="Search your address"
            onChangeText={v =>
              setDetails(prev => ({ ...prev, address: v, addressMeta: null }))
            }
            onSelect={hit =>
              setDetails(prev => ({ ...prev, address: hit.address, addressMeta: hit }))
            }
          />

          {error && (
            <Text className="mb-2 text-xs text-red-600">{error}</Text>
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
    </View>
  );
}

export default OwnerDetailsScreen;
