import { useState } from 'react';
import { ActivityIndicator, Pressable, StatusBar, Text, View } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  BackArrowIcon,
  InstantRideIcon,
  PrivateRideIcon,
  ScheduledRideIcon,
} from '../components/icons/ServiceTypeIcons';
import { updateRegistrationStep } from '../services/api';
import LogoutButton from '../components/LogoutButton';

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
  const progressPct = `${(currentStep / totalSteps) * 100}%` as const;
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
              <View
                className="h-full bg-white"
                style={{ width: progressPct }}
              />
            </View>
          </View>
        </SafeAreaView>
      </LinearGradient>

      <View className="flex-1 px-6 pt-7">
        <Text className="text-[20px] font-semibold text-slate-800">
          Choose Service Type
        </Text>

        <View className="mt-4 gap-4">
          {SERVICE_OPTIONS.map(option => {
            const isSelected = selected === option.id;
            return (
              <Pressable
                key={option.id}
                onPress={() => setSelected(option.id)}
                className={`rounded-2xl border bg-white p-5 ${
                  isSelected ? 'border-brand-teal' : 'border-slate-200'
                }`}
              >
                <View className="flex-row items-start gap-4">
                  <View
                    className="h-12 w-12 items-center justify-center rounded-full"
                    style={{ backgroundColor: option.bgColor }}
                  >
                    <option.Icon size={24} />
                  </View>
                  <View className="flex-1">
                    <Text className="text-base font-semibold text-slate-800">
                      {option.title}
                    </Text>
                    <Text className="mt-1 text-sm leading-5 text-slate-500">
                      {option.description}
                    </Text>
                  </View>
                </View>
              </Pressable>
            );
          })}
        </View>

        {error && (
          <Text className="mt-4 text-xs text-red-600">{error}</Text>
        )}

        <Pressable
          disabled={!canProceed}
          onPress={handleNext}
          className={`mt-6 h-12 flex-row items-center justify-center rounded-2xl ${
            canProceed ? 'bg-brand-teal' : 'bg-brand-teal/50'
          }`}
        >
          {submitting ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text className="text-sm font-medium text-white">Next</Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}

export default ChooseServiceTypeScreen;
