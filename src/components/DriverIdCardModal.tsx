import { Image, Modal, Pressable, Text, View } from 'react-native';
import { CloseIcon, TabProfileIcon } from './icons/ServiceTypeIcons';

interface DriverIdCardModalProps {
  visible: boolean;
  onClose: () => void;
  name?: string;
  partnerType?: string;
  partnerId?: string;
  mobileNumber?: string;
  joiningDate?: string;
  drivingLicense?: string;
  emergencyNumber?: string;
  licenseValidity?: string;
  avatarUrl?: string;
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row items-center">
      <Text className="w-[126px] text-[15px] text-[#607080]">{label}</Text>
      <Text className="w-3 text-center text-xs font-bold text-[#607080]">:</Text>
      <Text className="flex-1 text-[15px] font-semibold text-[#132235]">{value}</Text>
    </View>
  );
}

export function DriverIdCardModal({
  visible,
  onClose,
  name = '—',
  partnerType = 'UKCAAR Partner',
  partnerId = '—',
  mobileNumber = '—',
  joiningDate = '—',
  drivingLicense = '—',
  emergencyNumber = '—',
  licenseValidity = '—',
  avatarUrl,
}: DriverIdCardModalProps) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View className="flex-1 items-center justify-center bg-black/20 px-4">
        <View
          className="w-full max-w-[361px] overflow-hidden rounded-[28px] bg-white"
          style={{
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 25 },
            shadowOpacity: 0.25,
            shadowRadius: 50,
            elevation: 12,
          }}
        >
          <View className="h-[102px] bg-[#00C896]" />

          <View className="-mt-[66px] items-center">
            <View
              className="h-[132px] w-[132px] items-center justify-center overflow-hidden rounded-full border-4 border-white bg-[#E8F8F4]"
              style={{
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.1,
                shadowRadius: 8,
                elevation: 4,
              }}
            >
              {avatarUrl ? (
                <Image
                  source={{ uri: avatarUrl }}
                  className="h-[124px] w-[124px]"
                  resizeMode="cover"
                />
              ) : (
                <TabProfileIcon size={64} color="#0097B3" />
              )}
            </View>
          </View>

          <View className="mt-3 items-center px-6">
            <Text className="text-[20px] font-bold text-[#132235]">{name}</Text>
            <Text className="mt-1 text-[15px] text-[#364B63]">{partnerType}</Text>
            <Text className="text-[15px] text-[#364B63]">{partnerId}</Text>
          </View>

          <View className="mt-5 gap-3 px-8 pb-8">
            <Row label="Mobile Number" value={mobileNumber} />
            <Row label="Joining Date" value={joiningDate} />
            <Row label="Driving License" value={drivingLicense} />
            <Row label="Emergency No." value={emergencyNumber} />
            <Row label="License Validity" value={licenseValidity} />
          </View>
        </View>

        <Pressable
          onPress={onClose}
          className="mt-6 h-[50px] w-[50px] items-center justify-center rounded-full bg-[#132235]"
          style={{
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.2,
            shadowRadius: 8,
            elevation: 6,
          }}
        >
          <CloseIcon size={22} color="white" />
        </Pressable>
      </View>
    </Modal>
  );
}

export default DriverIdCardModal;
