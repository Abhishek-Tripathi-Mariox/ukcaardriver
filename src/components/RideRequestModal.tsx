import { useEffect, useState } from 'react';
import { Modal, Pressable, Text, View } from 'react-native';
import Svg, { Circle as SvgCircle } from 'react-native-svg';
import {
  CheckIcon,
  CloseIcon,
  InstantRideIcon,
  PersonSmallIcon,
  PrivateRideIcon,
} from './icons/ServiceTypeIcons';

export type RideRequestVariant = 'instant' | 'private';

export interface RideRequest {
  /** Backend ride id — needed for the accept/reject API calls. */
  rideId?: string;
  variant: RideRequestVariant;
  passengerName: string;
  /** Phone / avatar carried through so the in-progress + chat screens
   *  can call/message the customer without an extra round-trip. */
  passengerPhone?: string;
  passengerAvatar?: string | null;
  pickup: string;
  drop: string;
  fare: string;
  distance: string;
  eta: string;
  /** Pickup/drop coords from the dispatch payload — used by the in-progress
   *  map to draw the route and pin the customer without a second geocode. */
  pickupLat?: number;
  pickupLng?: number;
  dropLat?: number;
  dropLng?: number;
}

interface RideRequestModalProps {
  visible: boolean;
  request: RideRequest;
  initialSeconds?: number;
  onAccept: () => void;
  onReject: () => void;
  onTimeout?: () => void;
}

const VARIANT_STYLES: Record<
  RideRequestVariant,
  {
    title: string;
    iconBg: string;
    ringColor: string;
    fareColor: string;
    acceptBg: string;
  }
> = {
  instant: {
    title: 'New Instant Ride Request',
    iconBg: 'rgba(0,151,179,0.13)',
    ringColor: '#0097B3',
    fareColor: '#00A63E',
    acceptBg: '#0097B3',
  },
  private: {
    title: 'New Private Ride Request',
    iconBg: 'rgba(0,200,150,0.13)',
    ringColor: '#00C896',
    fareColor: '#00A63E',
    acceptBg: '#00C896',
  },
};

function CountdownRing({
  seconds,
  total,
  color,
}: {
  seconds: number;
  total: number;
  color: string;
}) {
  const size = 80;
  const stroke = 5;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.max(0, Math.min(1, seconds / total));

  return (
    <View style={{ width: size, height: size }} className="items-center justify-center">
      <Svg width={size} height={size} style={{ transform: [{ rotate: '-90deg' }] }}>
        <SvgCircle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#E5E7EB"
          strokeWidth={stroke}
          fill="none"
        />
        <SvgCircle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={circumference * (1 - progress)}
          fill="none"
        />
      </Svg>
      <View className="absolute items-center justify-center">
        <Text className="text-[24px] font-bold text-[#1E293B]">{seconds}</Text>
      </View>
    </View>
  );
}

export function RideRequestModal({
  visible,
  request,
  initialSeconds = 27,
  onAccept,
  onReject,
  onTimeout,
}: RideRequestModalProps) {
  const [seconds, setSeconds] = useState(initialSeconds);
  const styles = VARIANT_STYLES[request.variant];

  useEffect(() => {
    if (!visible) {
      setSeconds(initialSeconds);
      return;
    }
    if (seconds <= 0) {
      onTimeout?.();
      return;
    }
    const t = setTimeout(() => setSeconds(s => s - 1), 1000);
    return () => clearTimeout(t);
  }, [visible, seconds, initialSeconds, onTimeout]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onReject}>
      <View className="flex-1 justify-end bg-black/40">
        <View className="rounded-t-3xl bg-white px-6 pb-8 pt-6">
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center gap-3">
              <View
                className="h-12 w-12 items-center justify-center rounded-full"
                style={{ backgroundColor: styles.iconBg }}
              >
                {request.variant === 'instant' ? (
                  <InstantRideIcon size={22} />
                ) : (
                  <PrivateRideIcon size={22} />
                )}
              </View>
              <View>
                <Text className="text-[18px] font-semibold text-[#1E293B]">
                  {styles.title}
                </Text>
                <Text className="text-sm text-[#6A7282]">Respond in {seconds}s</Text>
              </View>
            </View>
            <Pressable onPress={onReject} hitSlop={10}>
              <CloseIcon size={22} color="#6A7282" />
            </Pressable>
          </View>

          <View className="mt-6 items-center">
            <CountdownRing seconds={seconds} total={initialSeconds} color={styles.ringColor} />
          </View>

          <View className="mt-6 rounded-2xl bg-[#F9FAFB] p-4">
            <View className="flex-row items-center gap-3">
              <View className="h-9 w-9 items-center justify-center rounded-full bg-white">
                <PersonSmallIcon size={18} color="#0097B3" />
              </View>
              <View>
                <Text className="text-sm text-[#6A7282]">Passenger</Text>
                <Text className="text-base font-semibold text-[#1E293B]">
                  {request.passengerName}
                </Text>
              </View>
            </View>

            <View className="mt-4 flex-row gap-3">
              <View className="items-center pt-1">
                <View className="h-3 w-3 rounded-full bg-[#00C950]" />
                <View className="my-1 h-8 w-0.5 bg-[#D1D5DC]" />
                <View className="h-3 w-3 rounded-full bg-[#FB2C36]" />
              </View>
              <View className="flex-1">
                <Text className="text-sm text-[#6A7282]">Pickup</Text>
                <Text className="text-base font-medium text-[#1E293B]">
                  {request.pickup}
                </Text>
                <Text className="mt-3 text-sm text-[#6A7282]">Drop</Text>
                <Text className="text-base font-medium text-[#1E293B]">
                  {request.drop}
                </Text>
              </View>
            </View>

            <View className="mt-4 flex-row border-t border-[#E5E7EB] pt-3">
              <View className="flex-1">
                <Text className="text-xs text-[#6A7282]">Fare</Text>
                <Text
                  className="text-base font-semibold"
                  style={{ color: styles.fareColor }}
                >
                  {request.fare}
                </Text>
              </View>
              <View className="flex-1">
                <Text className="text-xs text-[#6A7282]">Distance</Text>
                <Text className="text-base font-semibold text-[#1E293B]">
                  {request.distance}
                </Text>
              </View>
              <View className="flex-1">
                <Text className="text-xs text-[#6A7282]">ETA</Text>
                <Text className="text-base font-semibold text-[#1E293B]">
                  {request.eta}
                </Text>
              </View>
            </View>
          </View>

          <View className="mt-5 flex-row gap-3">
            <Pressable
              onPress={onReject}
              className="h-14 flex-1 flex-row items-center justify-center gap-2 rounded-2xl border border-[#FFC9C9] bg-white"
            >
              <CloseIcon size={16} color="#E7000B" />
              <Text className="text-sm font-medium text-[#E7000B]">Reject</Text>
            </Pressable>
            <Pressable
              onPress={onAccept}
              className="h-14 flex-1 flex-row items-center justify-center gap-2 rounded-2xl"
              style={{ backgroundColor: styles.acceptBg }}
            >
              <CheckIcon size={16} color="white" />
              <Text className="text-sm font-medium text-white">Accept</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

export default RideRequestModal;
