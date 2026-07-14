import { Modal, Pressable, Text, View } from 'react-native';
import {
  AlertCircleIcon,
  CloseIcon,
  PhoneIcon,
} from './icons/ServiceTypeIcons';

interface EmergencySosModalProps {
  visible: boolean;
  onClose: () => void;
  onCallEmergency?: () => void;
  onCallSupport?: () => void;
}

export function EmergencySosModal({
  visible,
  onClose,
  onCallEmergency,
  onCallSupport,
}: EmergencySosModalProps) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View className="flex-1 items-center justify-center bg-black/40 px-6">
        <View className="w-full max-w-[340px] rounded-3xl bg-white px-6 pb-6 pt-8">
          <Pressable
            onPress={onClose}
            hitSlop={10}
            className="absolute right-4 top-4"
          >
            <CloseIcon size={22} color="#6A7282" />
          </Pressable>

          <View className="items-center">
            <View className="h-20 w-20 items-center justify-center rounded-full bg-[#FEE2E2]">
              <AlertCircleIcon size={40} color="#E7000B" />
            </View>

            <Text className="mt-5 text-[20px] font-poppins-semibold text-[#1E293B]">
              Emergency SOS
            </Text>
            <Text className="mt-2 text-center text-sm text-[#6A7282]">
              Need immediate help? Contact emergency services or UKCAAR support.
            </Text>
          </View>

          <Pressable
            onPress={onCallEmergency}
            className="mt-6 h-14 flex-row items-center justify-center gap-2 rounded-2xl bg-[#E7000B]"
          >
            <PhoneIcon size={18} color="white" />
            <Text className="text-base font-poppins-medium text-white">Call Emergency (100)</Text>
          </Pressable>

          <Pressable
            onPress={onCallSupport}
            className="mt-3 h-14 flex-row items-center justify-center gap-2 rounded-2xl border border-brand-teal bg-white"
          >
            <PhoneIcon size={18} color="#0097B3" />
            <Text className="text-base font-poppins-medium text-brand-teal">Call UKCAAR Support</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

export default EmergencySosModal;
