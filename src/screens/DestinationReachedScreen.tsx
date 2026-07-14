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
import { fs, s, vs } from '../theme/responsive';

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
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      <LinearGradient
        colors={['#AD46FF', '#9810FA']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
      >
        <SafeAreaView edges={['top']}>
          <View
            className="flex-row items-center"
            style={{ paddingHorizontal: s(24), paddingBottom: vs(16), paddingTop: vs(8), gap: s(16) }}
          >
            <Pressable onPress={onBack} hitSlop={10}>
              <BackArrowIcon size={s(22)} color="white" />
            </Pressable>
            <Text
              className="font-poppins-semibold text-white"
              style={{ fontSize: fs(20) }}
            >
              Destination Reached
            </Text>
          </View>
        </SafeAreaView>
      </LinearGradient>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: s(16), gap: vs(16) }}
        showsVerticalScrollIndicator={false}
      >
        <View
          className="items-center bg-white"
          style={{
            borderRadius: s(16),
            paddingVertical: vs(32),
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.06,
            shadowRadius: 4,
            elevation: 2,
          }}
        >
          <View
            className="items-center justify-center rounded-full bg-[#00C896]"
            style={{ width: s(100), height: s(100) }}
          >
            <BigCheckIcon size={s(56)} color="white" />
          </View>
          <Text
            className="font-poppins-bold text-[#1E293B]"
            style={{ fontSize: fs(24), marginTop: vs(20) }}
          >
            Destination Reached!
          </Text>
          <Text
            className="text-[#6A7282] font-poppins-regular"
            style={{ fontSize: fs(16), marginTop: vs(4) }}
          >
            {destination}
          </Text>
          <Text
            className="text-[#6A7282] font-poppins-regular"
            style={{ fontSize: fs(18), marginTop: vs(16) }}
          >
            All passengers safely dropped off
          </Text>
        </View>

        <View
          className="bg-white"
          style={{
            borderRadius: s(16),
            padding: s(20),
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.06,
            shadowRadius: 4,
            elevation: 2,
          }}
        >
          <Text
            className="font-poppins-semibold text-[#1E293B]"
            style={{ fontSize: fs(16) }}
          >
            Journey Summary
          </Text>
          <View style={{ marginTop: vs(16), gap: vs(12) }}>
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center" style={{ gap: s(12) }}>
                <CheckCircleIcon size={s(20)} color="#00A63E" />
                <Text className="text-[#6A7282] font-poppins-regular" style={{ fontSize: fs(14) }}>
                  Passengers Boarded
                </Text>
              </View>
              <Text
                className="font-poppins-semibold text-[#1E293B]"
                style={{ fontSize: fs(14) }}
              >
                {boardedPassengers}/{totalPassengers}
              </Text>
            </View>
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center" style={{ gap: s(12) }}>
                <LocationPinSmallIcon size={s(20)} color="#9810FA" />
                <Text className="text-[#6A7282] font-poppins-regular" style={{ fontSize: fs(14) }}>
                  Stops
                </Text>
              </View>
              <Text
                className="font-poppins-semibold text-[#1E293B]"
                style={{ fontSize: fs(14) }}
              >
                {stops}
              </Text>
            </View>
          </View>

          <View
            className="border-t border-[#E9D4FF]"
            style={{ marginTop: vs(16), paddingTop: vs(16) }}
          >
            <Text
              className="text-center font-poppins-regular text-[#6A7282]"
              style={{ fontSize: fs(13) }}
            >
              Tap End Ride to settle your earnings for this journey.
            </Text>
          </View>
        </View>
      </ScrollView>

      <View style={{ paddingHorizontal: s(16), paddingBottom: vs(24), paddingTop: vs(8) }}>
        <Pressable
          onPress={handleEndRide}
          disabled={ending}
          className="items-center justify-center bg-[#9810FA]"
          style={{ height: s(56), borderRadius: s(14) }}
        >
          <Text
            className="font-poppins-semibold uppercase text-white"
            style={{ fontSize: fs(14) }}
          >
            End Ride
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

export default DestinationReachedScreen;
