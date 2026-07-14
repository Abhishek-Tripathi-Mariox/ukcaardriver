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
import { fs, s, vs } from '../theme/responsive';

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
            <View className="flex-1">
              <Text
                className="font-poppins-semibold text-white"
                style={{ fontSize: fs(20), lineHeight: fs(28) }}
              >
                {journeyTitle}
              </Text>
              <Text
                className="text-white/80 font-poppins-regular"
                style={{ fontSize: fs(14) }}
              >
                Journey ID: {journeyId}
              </Text>
            </View>
          </View>
        </SafeAreaView>
      </LinearGradient>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: s(16), gap: vs(16) }}
        showsVerticalScrollIndicator={false}
      >
        <View
          className="bg-white"
          style={{
            borderRadius: s(16),
            padding: s(16),
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.08,
            shadowRadius: 4,
            elevation: 2,
          }}
        >
          <View className="flex-row items-center" style={{ gap: s(8) }}>
            <MapPinIcon size={s(22)} color="#9810FA" />
            <Text
              className="font-poppins-medium text-[#1E293B]"
              style={{ fontSize: fs(18) }}
            >
              {routeFrom} → {routeTo}
            </Text>
          </View>
          <View style={{ marginTop: vs(12), gap: vs(8) }}>
            <View className="flex-row items-center justify-between">
              <Text className="text-[#4A5565] font-poppins-regular" style={{ fontSize: fs(14) }}>
                Departure:
              </Text>
              <Text
                className="font-poppins-semibold text-[#1E293B]"
                style={{ fontSize: fs(15) }}
              >
                {departureTime}
              </Text>
            </View>
            <View className="flex-row items-center justify-between">
              <Text className="text-[#4A5565] font-poppins-regular" style={{ fontSize: fs(14) }}>
                Stops:
              </Text>
              <Text
                className="font-poppins-semibold text-[#1E293B]"
                style={{ fontSize: fs(15) }}
              >
                {stopCount}
              </Text>
            </View>
          </View>
        </View>

        <View
          className="bg-white"
          style={{
            borderRadius: s(16),
            padding: s(16),
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.08,
            shadowRadius: 4,
            elevation: 2,
          }}
        >
          <View className="flex-row items-center" style={{ gap: s(8) }}>
            <UsersIcon size={s(22)} color="#9810FA" />
            <Text
              className="font-poppins-medium text-[#1E293B]"
              style={{ fontSize: fs(18) }}
            >
              Passenger Count
            </Text>
          </View>
          <View className="items-center" style={{ paddingTop: vs(16) }}>
            <Text
              className="font-poppins-bold text-[#9810FA]"
              style={{ fontSize: fs(56), lineHeight: fs(64) }}
            >
              {passengerCount}
            </Text>
            <Text
              className="text-[#6A7282] font-poppins-regular"
              style={{ fontSize: fs(14) }}
            >
              Total Passengers
            </Text>
          </View>
        </View>

        <View
          className="flex-row items-start bg-[#F8F0FF]"
          style={{ borderRadius: s(16), padding: s(16), gap: s(10) }}
        >
          <InfoCircleIcon size={s(22)} color="#9810FA" />
          <View className="flex-1">
            <Text
              className="font-poppins-semibold text-[#1E293B]"
              style={{ fontSize: fs(14) }}
            >
              Check-in Phase
            </Text>
            <Text
              className="text-[#6A7282] font-poppins-regular"
              style={{ fontSize: fs(12), marginTop: vs(2) }}
            >
              Available from 30 minutes before departure
            </Text>
          </View>
        </View>
      </ScrollView>

      <View style={{ gap: vs(12), paddingHorizontal: s(16), paddingBottom: vs(24), paddingTop: vs(8) }}>
        <Pressable
          onPress={() => setConfirmOpen(true)}
          className="items-center justify-center bg-[#9810FA]"
          style={{ height: s(50), borderRadius: s(16) }}
        >
          <Text
            className="font-poppins-medium uppercase text-white"
            style={{ fontSize: fs(15) }}
          >
            Start Check-In Phase
          </Text>
        </Pressable>
        <Pressable
          onPress={onViewDetails}
          className="items-center justify-center border border-[#9810FA] bg-white"
          style={{ height: s(50), borderRadius: s(16) }}
        >
          <Text
            className="font-poppins-medium uppercase text-[#9810FA]"
            style={{ fontSize: fs(15) }}
          >
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
        <View className="flex-1 items-center justify-center bg-black/50" style={{ paddingHorizontal: s(32) }}>
          <View className="w-full bg-white" style={{ borderRadius: s(16), padding: s(24) }}>
            <Text
              className="font-poppins-semibold text-[#1E293B]"
              style={{ fontSize: fs(20) }}
            >
              Start Passenger Check-In?
            </Text>
            <Text
              className="text-[#4A5565] font-poppins-regular"
              style={{ fontSize: fs(14), lineHeight: fs(20), marginTop: vs(12) }}
            >
              This will allow passengers to board and scan their QR codes. Make
              sure you're ready to begin.
            </Text>
            <View className="flex-row" style={{ marginTop: vs(24), gap: s(12) }}>
              <Pressable
                onPress={() => setConfirmOpen(false)}
                className="flex-1 items-center justify-center bg-[#F1F5F9]"
                style={{ height: s(46), borderRadius: s(14) }}
              >
                <Text
                  className="font-poppins-medium text-[#1E293B]"
                  style={{ fontSize: fs(15) }}
                >
                  Cancel
                </Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  setConfirmOpen(false);
                  onStartCheckIn?.();
                }}
                className="flex-1 items-center justify-center bg-[#9C1AFB]"
                style={{ height: s(46), borderRadius: s(14) }}
              >
                <Text
                  className="font-poppins-medium text-white"
                  style={{ fontSize: fs(15) }}
                >
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
