import { useState } from 'react';
import { Pressable, StatusBar, Text, View } from 'react-native';
import {
  InstantRideIcon,
  PrivateRideIcon,
  ScheduledRideIcon,
} from '../components/icons/ServiceTypeIcons';
import { updateRegistrationStep } from '../services/api';
import RegistrationHeader from '../components/RegistrationHeader';
import { PrimaryButton } from '../components/PrimaryButton';
import { fs, s, vs } from '../theme/responsive';

type ServiceType = 'instant' | 'private' | 'scheduled';

interface ChooseServiceTypeScreenProps {
  onBack: () => void;
  onNext: (serviceType: ServiceType) => void;
  onLogout: () => void;
  currentStep?: number;
  totalSteps?: number;
}

interface ServiceOption {
  id: ServiceType;
  title: string;
  description: string;
  bgColor: string;
  Icon: React.ComponentType<{ size?: number }>;
}

const SERVICE_OPTIONS: ServiceOption[] = [
  {
    id: 'instant',
    title: 'Instant Ride',
    description: 'Get immediate ride requests from nearby passengers',
    bgColor: '#0097B3',
    Icon: InstantRideIcon,
  },
  {
    id: 'private',
    title: 'Private Ride',
    description: 'Premium rides with higher fares and exclusive clients',
    bgColor: '#00C896',
    Icon: PrivateRideIcon,
  },
  {
    id: 'scheduled',
    title: 'Scheduled Ride',
    description: 'Pre-planned journeys with multiple stops and passengers',
    bgColor: '#AD46FF',
    Icon: ScheduledRideIcon,
  },
];

export function ChooseServiceTypeScreen({
  onBack,
  onNext,
  onLogout,
  currentStep = 2,
  totalSteps = 6,
}: ChooseServiceTypeScreenProps) {
  const [selected, setSelected] = useState<ServiceType | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const canProceed = selected !== null && !submitting;

  const handleNext = async () => {
    if (!selected || submitting) return;
    setError(null);
    setSubmitting(true);
    try {
      // All service types advance straight to owner-details. Scheduled
      // drivers used to have an extra route-selection step here, but that
      // is no longer part of the registration funnel.
      await updateRegistrationStep('owner-details', {
        serviceType: selected,
      });
      onNext(selected);
    } catch (err: any) {
      console.warn('[service-type] save failed:', err);
      setError(err?.message ?? 'Could not save selection. Try again.');
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

      <View className="flex-1" style={{ paddingHorizontal: s(24), paddingTop: vs(26) }}>
        <Text className="font-poppins-semibold text-slate-800" style={{ fontSize: fs(20) }}>
          Choose Service Type
        </Text>

        <View style={{ marginTop: vs(16), gap: vs(16) }}>
          {SERVICE_OPTIONS.map(option => {
            const isSelected = selected === option.id;
            return (
              <Pressable
                key={option.id}
                onPress={() => setSelected(option.id)}
                className={`rounded-2xl border bg-white ${
                  isSelected ? 'border-brand-teal' : 'border-slate-200'
                }`}
                style={{ padding: s(18) }}
              >
                <View className="flex-row items-start" style={{ gap: s(16) }}>
                  <View
                    className="items-center justify-center rounded-full"
                    style={{ height: s(48), width: s(48), backgroundColor: option.bgColor }}
                  >
                    <option.Icon size={s(24)} />
                  </View>
                  <View className="flex-1">
                    <Text className="font-poppins-semibold text-slate-800" style={{ fontSize: fs(16) }}>
                      {option.title}
                    </Text>
                    <Text className="font-poppins text-slate-500" style={{ marginTop: vs(4), fontSize: fs(13), lineHeight: fs(20) }}>
                      {option.description}
                    </Text>
                  </View>
                </View>
              </Pressable>
            );
          })}
        </View>

        {error && (
          <Text className="font-poppins text-red-600" style={{ marginTop: vs(16), fontSize: fs(12) }}>{error}</Text>
        )}

        <PrimaryButton
          label="Next"
          onPress={handleNext}
          disabled={!canProceed}
          loading={submitting}
          className="mt-6"
        />
      </View>
    </View>
  );
}

export default ChooseServiceTypeScreen;
