import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StatusBar, Text, View } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  BackArrowIcon,
  BigCheckIcon,
  CheckCircleIcon,
  LocationPinSmallIcon,
} from '../components/icons/ServiceTypeIcons';
import { completeJourney, fetchJourney, fetchJourneyPassengers } from '../services/api';

interface DestinationReachedScreenProps {
  journeyKey?: string | null;
  destination?: string;
  totalPassengers?: number;
  boardedPassengers?: number;
  onBack?: () => void;
  onEndRide?: () => void;
}

export function DestinationReachedScreen({
  journeyKey,
  destination: destinationProp = '—',
  totalPassengers: totalProp = 0,
  boardedPassengers: boardedProp = 0,
  onBack,
  onEndRide,
}: DestinationReachedScreenProps) {
  const [ending, setEnding] = useState(false);
  const [info, setInfo] = useState<{ destination: string; boarded: number; total: number; stops: number } | null>(null);

  useEffect(() => {
    if (!journeyKey) return;
    (async () => {
      try {
        const [d, pax] = await Promise.all([
          fetchJourney(journeyKey),
          fetchJourneyPassengers(journeyKey),
        ]);
        setInfo({ destination: d.journey.to, boarded: pax.boarded, total: pax.total, stops: d.stops.length });
      } catch {
        /* keep placeholders */
      }
    })();
  }, [journeyKey]);

  const destination = info?.destination ?? destinationProp;
  const boardedPassengers = info?.boarded ?? boardedProp;
  const totalPassengers = info?.total ?? totalProp;
  const stops = info?.stops ?? 0;

  const handleEndRide = async () => {
    if (!journeyKey) {
      onEndRide?.();
      return;
    }
    setEnding(true);
    try {
      await completeJourney(journeyKey);
      onEndRide?.();
    } catch (err: any) {
      Alert.alert('Could not end journey', err?.message ?? 'Please try again.');
    } finally {
      setEnding(false);
    }
  };

  return (
    <View className="flex-1 bg-[#F9FAFB]">
      <StatusBar barStyle="light-content" />

      <LinearGradient
        colors={['#AD46FF', '#9810FA']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
      >
        <SafeAreaView edges={['top']}>
          <View className="flex-row items-center gap-4 px-6 pb-4 pt-2">
            <Pressable onPress={onBack} hitSlop={10}>
              <BackArrowIcon size={22} color="white" />
            </Pressable>
            <Text className="text-[20px] font-semibold text-white">
              Destination Reached
            </Text>
          </View>
        </SafeAreaView>
      </LinearGradient>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 16, gap: 16 }}
        showsVerticalScrollIndicator={false}
      >
        <View
          className="items-center rounded-2xl bg-white py-8"
          style={{
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.06,
            shadowRadius: 4,
            elevation: 2,
          }}
        >
          <View className="h-[100px] w-[100px] items-center justify-center rounded-full bg-[#00C896]">
            <BigCheckIcon size={56} color="white" />
          </View>
          <Text className="mt-5 text-[24px] font-bold text-[#1E293B]">
            Destination Reached!
          </Text>
          <Text className="mt-1 text-[16px] text-[#6A7282]">{destination}</Text>
          <Text className="mt-4 text-[18px] text-[#6A7282]">
            All passengers safely dropped off
          </Text>
        </View>

        <View
          className="rounded-2xl bg-white p-5"
          style={{
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.06,
            shadowRadius: 4,
            elevation: 2,
          }}
        >
          <Text className="text-[16px] font-semibold text-[#1E293B]">
            Journey Summary
          </Text>
          <View className="mt-4 gap-3">
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center gap-3">
                <CheckCircleIcon size={20} color="#00A63E" />
                <Text className="text-[14px] text-[#6A7282]">Passengers Boarded</Text>
              </View>
              <Text className="text-[14px] font-semibold text-[#1E293B]">
                {boardedPassengers}/{totalPassengers}
              </Text>
            </View>
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center gap-3">
                <LocationPinSmallIcon size={20} color="#9810FA" />
                <Text className="text-[14px] text-[#6A7282]">Stops</Text>
              </View>
              <Text className="text-[14px] font-semibold text-[#1E293B]">
                {stops}
              </Text>
            </View>
          </View>

          <View className="mt-4 border-t border-[#E9D4FF] pt-4">
            <Text className="text-center text-[13px] text-[#6A7282]">
              Tap End Ride to settle your earnings for this journey.
            </Text>
          </View>
        </View>
      </ScrollView>

      <View className="px-4 pb-6 pt-2">
        <Pressable
          onPress={handleEndRide}
          disabled={ending}
          className="h-[56px] items-center justify-center rounded-[14px] bg-[#9810FA]"
        >
          <Text className="text-[14px] font-semibold uppercase text-white">
            End Ride
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

export default DestinationReachedScreen;
