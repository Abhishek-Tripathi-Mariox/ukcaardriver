import { useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, StatusBar, Text, View } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  BackArrowIcon,
  InfoCircleIcon,
  MapPinIcon,
  UsersIcon,
} from '../components/icons/ServiceTypeIcons';
import { fetchJourney } from '../services/api';

interface RideActivationScreenProps {
  journeyKey?: string | null;
  journeyTitle?: string;
  journeyId?: string;
  routeFrom?: string;
  routeTo?: string;
  departureTime?: string;
  passengerCount?: number;
  onBack?: () => void;
  onStartCheckIn?: () => void;
  onViewDetails?: () => void;
}

export function RideActivationScreen({
  journeyKey,
  journeyTitle: journeyTitleProp = 'Scheduled Journey',
  journeyId: journeyIdProp = 'SCH001',
  routeFrom: routeFromProp = '—',
  routeTo: routeToProp = '—',
  departureTime: departureTimeProp = '—',
  passengerCount: passengerCountProp = 0,
  onBack,
  onStartCheckIn,
  onViewDetails,
}: RideActivationScreenProps) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [detail, setDetail] = useState<Awaited<ReturnType<typeof fetchJourney>> | null>(null);

  useEffect(() => {
    if (!journeyKey) return;
    fetchJourney(journeyKey).then(setDetail).catch(() => {});
  }, [journeyKey]);

  const j = detail?.journey;
  const journeyTitle = j?.routeName ?? journeyTitleProp;
  const journeyId = journeyKey ? journeyKey.split('_')[0].slice(-6).toUpperCase() : journeyIdProp;
  const routeFrom = j?.from ?? routeFromProp;
  const routeTo = j?.to ?? routeToProp;
  const departureTime = j
    ? `${j.departureDate}${j.departureTime ? `, ${j.departureTime}` : ''}`
    : departureTimeProp;
  const passengerCount = j?.passengerCount ?? passengerCountProp;
  const stopCount = detail?.stops?.length ?? j?.stopCount ?? 0;

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
            <View className="flex-1">
              <Text className="text-[20px] font-semibold text-white">
                {journeyTitle}
              </Text>
              <Text className="text-[14px] text-white/80">
                Journey ID: {journeyId}
              </Text>
            </View>
          </View>
        </SafeAreaView>
      </LinearGradient>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 16, gap: 16 }}
        showsVerticalScrollIndicator={false}
      >
        <View
          className="rounded-2xl bg-white p-4"
          style={{
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.08,
            shadowRadius: 4,
            elevation: 2,
          }}
        >
          <View className="flex-row items-center gap-2">
            <MapPinIcon size={22} color="#9810FA" />
            <Text className="text-[20px] font-medium text-[#1E293B]">
              {routeFrom} → {routeTo}
            </Text>
          </View>
          <View className="mt-3 gap-2">
            <View className="flex-row items-center justify-between">
              <Text className="text-base text-[#4A5565]">Departure:</Text>
              <Text className="text-base font-semibold text-[#1E293B]">
                {departureTime}
              </Text>
            </View>
            <View className="flex-row items-center justify-between">
              <Text className="text-base text-[#4A5565]">Stops:</Text>
              <Text className="text-base font-semibold text-[#1E293B]">
                {stopCount}
              </Text>
            </View>
          </View>
        </View>

        <View
          className="rounded-2xl bg-white p-4"
          style={{
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.08,
            shadowRadius: 4,
            elevation: 2,
          }}
        >
          <View className="flex-row items-center gap-2">
            <UsersIcon size={22} color="#9810FA" />
            <Text className="text-[20px] font-medium text-[#1E293B]">
              Passenger Count
            </Text>
          </View>
          <View className="items-center pt-4">
            <Text className="text-[60px] font-bold leading-[72px] text-[#9810FA]">
              {passengerCount}
            </Text>
            <Text className="text-[14px] text-[#6A7282]">Total Passengers</Text>
          </View>
        </View>

        <View className="flex-row items-start gap-2 rounded-2xl bg-[#F8F0FF] p-4">
          <InfoCircleIcon size={22} color="#9810FA" />
          <View className="flex-1">
            <Text className="text-[14px] font-semibold text-[#1E293B]">
              Check-in Phase
            </Text>
            <Text className="text-[12px] text-[#6A7282]">
              Available from 30 minutes before departure
            </Text>
          </View>
        </View>
      </ScrollView>

      <View className="gap-3 px-4 pb-6 pt-2">
        <Pressable
          onPress={() => setConfirmOpen(true)}
          className="h-[50px] items-center justify-center rounded-2xl bg-[#9810FA]"
        >
          <Text className="text-[15px] font-medium uppercase text-white">
            Start Check-In Phase
          </Text>
        </Pressable>
        <Pressable
          onPress={onViewDetails}
          className="h-[50px] items-center justify-center rounded-2xl border border-[#9810FA] bg-white"
        >
          <Text className="text-[15px] font-medium uppercase text-[#9810FA]">
            View Details
          </Text>
        </Pressable>
      </View>

      <Modal
        visible={confirmOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setConfirmOpen(false)}
      >
        <View className="flex-1 items-center justify-center bg-black/50 px-8">
          <View className="w-full rounded-2xl bg-white p-6">
            <Text className="text-[20px] font-semibold text-[#1E293B]">
              Start Passenger Check-In?
            </Text>
            <Text className="mt-3 text-[14px] leading-5 text-[#4A5565]">
              This will allow passengers to board and scan their QR codes. Make
              sure you're ready to begin.
            </Text>
            <View className="mt-6 flex-row gap-3">
              <Pressable
                onPress={() => setConfirmOpen(false)}
                className="h-[46px] flex-1 items-center justify-center rounded-2xl bg-[#F1F5F9]"
              >
                <Text className="text-[15px] font-medium text-[#1E293B]">
                  Cancel
                </Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  setConfirmOpen(false);
                  onStartCheckIn?.();
                }}
                className="h-[46px] flex-1 items-center justify-center rounded-2xl bg-[#9C1AFB]"
              >
                <Text className="text-[15px] font-medium text-white">
                  Start Check-In
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

export default RideActivationScreen;
