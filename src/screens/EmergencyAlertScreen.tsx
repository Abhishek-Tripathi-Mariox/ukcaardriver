import { useState } from 'react';
import { Modal, Pressable, ScrollView, StatusBar, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  AlertCircleIcon,
  CloseIcon,
  LocationPinSmallIcon,
} from '../components/icons/ServiceTypeIcons';

interface EmergencyAlertScreenProps {
  passengerName?: string;
  seat?: string;
  phone?: string;
  requestTitle?: string;
  requestDescription?: string;
  currentLocation?: string;
  onBack?: () => void;
  onDecline?: () => void;
  onApproveSafe?: () => void;
  onWaitNextStop?: () => void;
}

export function EmergencyAlertScreen({
  passengerName = 'Ramesh Kumar',
  seat = 'A1',
  phone = '+91 98765 43210',
  requestTitle = 'Request: Early Drop',
  requestDescription = 'Passenger is requesting to be dropped off before the final destination due to personal emergency.',
  currentLocation = 'NH 48, Near Vellore (Safe Zone)',
  onBack,
  onDecline,
  onApproveSafe,
  onWaitNextStop,
}: EmergencyAlertScreenProps) {
  const [safeStopDialogOpen, setSafeStopDialogOpen] = useState(false);

  return (
    <View className="flex-1 bg-[#F9FAFB]">
      <StatusBar barStyle="light-content" />

      <View className="bg-[#F44336]">
        <SafeAreaView edges={['top']}>
          <View className="flex-row items-center gap-4 px-6 pb-4 pt-2">
            <Pressable onPress={onBack} hitSlop={10}>
              <CloseIcon size={22} color="white" />
            </Pressable>
            <Text className="text-[20px] font-semibold text-white">
              ⚠️ Emergency Alert
            </Text>
          </View>
        </SafeAreaView>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 16, gap: 16 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="flex-row items-center gap-3 rounded-2xl bg-[#FDEDED] p-4">
          <AlertCircleIcon size={22} color="#D32F2F" />
          <Text className="text-[15px] font-semibold text-[#5F2120]">
            Passenger Emergency Request
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
            Passenger Details
          </Text>
          <View className="mt-3 gap-2">
            <View className="flex-row justify-between">
              <Text className="text-[14px] text-[#6A7282]">Name</Text>
              <Text className="text-[14px] font-semibold text-[#1E293B]">
                {passengerName}
              </Text>
            </View>
            <View className="flex-row justify-between">
              <Text className="text-[14px] text-[#6A7282]">Seat</Text>
              <Text className="text-[14px] font-semibold text-[#1E293B]">
                {seat}
              </Text>
            </View>
            <View className="flex-row justify-between">
              <Text className="text-[14px] text-[#6A7282]">Phone</Text>
              <Text className="text-[14px] font-semibold text-[#1E293B]">
                {phone}
              </Text>
            </View>
          </View>
        </View>

        <View className="rounded-2xl bg-[#FFF3E0] p-5">
          <Text className="text-[16px] font-semibold text-[#9A3412]">
            {requestTitle}
          </Text>
          <Text className="mt-2 text-[13px] leading-[20px] text-[#9A3412]">
            {requestDescription}
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
          <Text className="text-[14px] text-[#6A7282]">Current Location</Text>
          <View className="mt-2 flex-row items-center gap-2">
            <LocationPinSmallIcon size={18} color="#9810FA" />
            <Text className="flex-1 text-[14px] font-semibold text-[#1E293B]">
              {currentLocation}
            </Text>
          </View>
        </View>
      </ScrollView>

      <View className="px-4 pb-6 pt-2">
        <Pressable
          onPress={() => setSafeStopDialogOpen(true)}
          className="h-[56px] items-center justify-center rounded-2xl bg-[#00C896]"
        >
          <Text className="text-[14px] font-semibold uppercase text-white">
            Approve Drop (Safe Zone)
          </Text>
        </Pressable>
        <Pressable
          onPress={onDecline}
          className="mt-3 h-[56px] items-center justify-center rounded-2xl border border-[#D32F2F] bg-white"
        >
          <Text className="text-[14px] font-semibold uppercase text-[#D32F2F]">
            Decline (Unsafe Area)
          </Text>
        </Pressable>
      </View>

      <Modal
        visible={safeStopDialogOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setSafeStopDialogOpen(false)}
      >
        <View className="flex-1 items-center justify-center bg-black/50 px-6">
          <View className="w-full rounded-3xl bg-white p-6">
            <Text className="text-[18px] font-semibold text-[#1E293B]">
              Are you at a safe location to stop?
            </Text>
            <Text className="mt-2 text-[14px] leading-[20px] text-[#6A7282]">
              Please confirm that you are currently in a safe zone and can
              stop the vehicle to drop off the passenger.
            </Text>

            <View className="mt-4 flex-row gap-3">
              <View className="flex-1 rounded-2xl bg-[#E8F8F4] p-3">
                <Text className="text-[12px] font-semibold text-[#00A63E]">
                  ✓ Safe Zone
                </Text>
                <Text className="mt-1 text-[11px] text-[#047857]">
                  Highway rest area
                </Text>
              </View>
              <View className="flex-1 rounded-2xl bg-[#FFF3E0] p-3">
                <Text className="text-[12px] font-semibold text-[#9A3412]">
                  ⚠ Wait for Stop
                </Text>
                <Text className="mt-1 text-[11px] text-[#9A3412]">
                  2 km away
                </Text>
              </View>
            </View>

            <Pressable
              onPress={() => {
                setSafeStopDialogOpen(false);
                onApproveSafe?.();
              }}
              className="mt-5 h-[50px] items-center justify-center rounded-2xl bg-[#00C896]"
            >
              <Text className="text-[14px] font-semibold uppercase text-white">
                Yes, Stop Now
              </Text>
            </Pressable>
            <Pressable
              onPress={() => {
                setSafeStopDialogOpen(false);
                onWaitNextStop?.();
              }}
              className="mt-3 h-[50px] items-center justify-center rounded-2xl border border-[#0097B3] bg-white"
            >
              <Text className="text-[14px] font-semibold uppercase text-[#0097B3]">
                Wait for Next Stop
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

export default EmergencyAlertScreen;
