import { useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StatusBar,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AlertCircleIcon, CloseIcon } from '../components/icons/ServiceTypeIcons';

/** A customer-initiated early-drop request awaiting this driver's approval. */
export interface IncomingEarlyDrop {
  bookingId: string;
  customerName: string;
  contact?: string;
  seats: number[];
  reason?: string;
}

interface EmergencyAlertScreenProps {
  request: IncomingEarlyDrop | null;
  /** Human-readable current location for the "is this a safe stop?" prompt. */
  currentLocationLabel?: string;
  approving?: boolean;
  onBack?: () => void;
  /** Driver approved the drop at a safe location. Parent calls the API. */
  onApprove?: (request: IncomingEarlyDrop) => void;
  /** Driver can't safely stop — decline. Parent calls the API. */
  onDecline?: (request: IncomingEarlyDrop) => void;
}

/**
 * Emergency Alert — a rider on this driver's shuttle has REQUESTED an early
 * drop (customer-initiated). The driver reviews the passenger + request and
 * either approves it (at a safe stopping point) or declines (unsafe area). The
 * backend recomputes the partial fare and refunds the rider on approval.
 */
export function EmergencyAlertScreen({
  request,
  currentLocationLabel,
  approving = false,
  onBack,
  onApprove,
  onDecline,
}: EmergencyAlertScreenProps) {
  const [safeStopDialogOpen, setSafeStopDialogOpen] = useState(false);

  const seatLabel = request?.seats?.length
    ? request.seats.length === 1
      ? `Seat ${request.seats[0]}`
      : `Seats ${request.seats.join(', ')}`
    : 'Seat —';

  return (
    <View className="flex-1 bg-[#F9FAFB]">
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      <View className="bg-[#F44336]">
        <SafeAreaView edges={['top']}>
          <View className="flex-row items-center gap-4 px-6 pb-4 pt-2">
            <Pressable onPress={onBack} hitSlop={10}>
              <CloseIcon size={22} color="white" />
            </Pressable>
            <Text className="text-[20px] font-poppins-semibold text-white">Emergency Alert</Text>
          </View>
        </SafeAreaView>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 16, gap: 16 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="flex-row items-center gap-3 rounded-2xl bg-[#FFF4E5] p-4">
          <AlertCircleIcon size={22} color="#B45309" />
          <Text className="flex-1 text-[15px] font-poppins-semibold text-[#7C3B00]">
            Passenger Emergency Request
          </Text>
        </View>

        {!request ? (
          <View className="rounded-2xl bg-white p-6 items-center">
            <Text className="text-[15px] font-poppins-semibold text-[#1E293B]">
              No active request
            </Text>
            <Text className="mt-1 text-center text-[13px] text-[#6A7282]">
              This early-drop request is no longer waiting for your approval.
            </Text>
          </View>
        ) : (
          <>
            {/* Passenger details — delivered by the request (customer-initiated). */}
            <View className="rounded-2xl bg-white p-4">
              <Text className="text-[12px] font-poppins-semibold uppercase tracking-wide text-[#6A7282]">
                Passenger Details
              </Text>
              <View className="mt-3 gap-2">
                <DetailRow label="Name" value={request.customerName || 'Passenger'} />
                <DetailRow label="Seat" value={seatLabel} />
                {!!request.contact && <DetailRow label="Phone" value={request.contact} />}
              </View>
            </View>

            {/* The request itself. */}
            <View className="rounded-2xl bg-[#FFF4E5] p-4">
              <Text className="text-[15px] font-poppins-semibold text-[#7C3B00]">
                Request: Early Drop
              </Text>
              <Text className="mt-1 text-[13px] leading-[19px] text-[#7C3B00]">
                The passenger has requested an early drop at the next safe location. Please
                evaluate if the current area is suitable for a safe stop.
              </Text>
            </View>

            {!!currentLocationLabel && (
              <View className="rounded-2xl bg-white p-4">
                <Text className="text-[12px] font-poppins-medium uppercase text-[#6A7282]">
                  Current Location
                </Text>
                <Text className="mt-1 text-[15px] font-poppins-medium text-[#1E293B]">
                  {currentLocationLabel}
                </Text>
              </View>
            )}
          </>
        )}
      </ScrollView>

      {!!request && (
        <View className="px-4 pb-6 pt-2">
          <Pressable
            onPress={() => setSafeStopDialogOpen(true)}
            disabled={approving}
            style={{ opacity: approving ? 0.6 : 1 }}
            className="h-[56px] flex-row items-center justify-center rounded-2xl bg-[#00C896]"
          >
            {approving ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text className="text-[14px] font-poppins-medium uppercase text-white">
                Approve Drop (Safe Zone)
              </Text>
            )}
          </Pressable>
          <Pressable
            onPress={() => request && onDecline?.(request)}
            disabled={approving}
            className="mt-3 h-[56px] items-center justify-center rounded-2xl border border-[#D32F2F] bg-white"
          >
            <Text className="text-[14px] font-poppins-medium uppercase text-[#D32F2F]">
              Decline (Unsafe Area)
            </Text>
          </Pressable>
        </View>
      )}

      <Modal
        visible={safeStopDialogOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setSafeStopDialogOpen(false)}
      >
        <View className="flex-1 items-center justify-center bg-black/50 px-6">
          <View className="w-full rounded-3xl bg-white p-6">
            <Text className="text-[18px] font-poppins-semibold text-[#1E293B]">
              Are you at a safe location to stop?
            </Text>
            <Text className="mt-2 text-[14px] leading-[20px] text-[#6A7282]">
              Only approve if you are somewhere safe and legal to pull over and let{' '}
              {request?.customerName ?? 'the passenger'} off. Their fare will be adjusted and the
              unused portion refunded.
            </Text>

            <Pressable
              onPress={() => {
                setSafeStopDialogOpen(false);
                if (request) onApprove?.(request);
              }}
              className="mt-5 h-[50px] items-center justify-center rounded-2xl bg-[#00C896]"
            >
              <Text className="text-[14px] font-poppins-medium uppercase text-white">
                Yes, Stop Now
              </Text>
            </Pressable>
            <Pressable
              onPress={() => setSafeStopDialogOpen(false)}
              className="mt-3 h-[50px] items-center justify-center rounded-2xl border border-[#0097B3] bg-white"
            >
              <Text className="text-[14px] font-poppins-medium uppercase text-[#0097B3]">
                Not Yet
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row items-center justify-between">
      <Text className="text-[13px] text-[#6A7282]">{label}</Text>
      <Text className="text-[15px] font-poppins-medium text-[#1E293B]" numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

export default EmergencyAlertScreen;
