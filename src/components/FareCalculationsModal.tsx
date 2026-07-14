import { Modal, Pressable, Text, View } from 'react-native';
import { CloseIcon } from './icons/ServiceTypeIcons';

interface FareRow {
  label: string;
  amount: string;
  plus?: boolean;
}

interface FareCalculationsModalProps {
  visible: boolean;
  onClose: () => void;
  rows?: FareRow[];
  subTotal?: string;
  roundingUp?: string;
  grandTotal?: string;
}

const DEFAULT_ROWS: FareRow[] = [
  { label: 'Driver Fee:', amount: '₹430.8', plus: true },
  { label: 'Convenience Fee:', amount: '₹111.94', plus: true },
  { label: 'GoChauffeurs Secure Fee:', amount: '₹15.0', plus: true },
  { label: 'GST:', amount: '₹22.85', plus: true },
];

export function FareCalculationsModal({
  visible,
  onClose,
  rows = DEFAULT_ROWS,
  subTotal = '₹580.59',
  roundingUp = '₹0.41',
  grandTotal = '₹581',
}: FareCalculationsModalProps) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 justify-end bg-black/20">
        <View className="items-center gap-5 pb-0">
          <Pressable
            onPress={onClose}
            className="h-[50px] w-[50px] items-center justify-center rounded-full bg-[#132235]"
          >
            <CloseIcon size={22} color="white" />
          </Pressable>

          <View className="w-full rounded-t-2xl bg-white px-4 pb-8 pt-6">
            <Text className="text-center text-[20px] font-poppins-bold text-[#132235]">
              Fare Calculations
            </Text>

            <View className="mt-8 gap-5">
              {rows.map(row => (
                <View key={row.label} className="flex-row items-center">
                  <Text className="flex-1 text-[15px] text-[#132235]">{row.label}</Text>
                  <Text className="text-[15px] font-poppins-bold text-[#132235]">
                    {row.plus ? '+ ' : ''}
                    {row.amount}
                  </Text>
                </View>
              ))}

              <View className="h-px bg-[#E1E6EF]" />

              <View className="flex-row items-center">
                <Text className="flex-1 text-[15px] font-poppins-bold text-[#132235]">Sub Total:</Text>
                <Text className="text-[17px] font-poppins-bold text-[#132235]">{subTotal}</Text>
              </View>

              <View className="flex-row items-center">
                <Text className="flex-1 text-[15px] text-[#132235]">Rounding Up:</Text>
                <Text className="text-[15px] font-poppins-bold text-[#132235]">+ {roundingUp}</Text>
              </View>

              <View className="h-px bg-[#E1E6EF]" />

              <View className="flex-row items-center">
                <Text className="flex-1 text-[17px] font-poppins-bold text-[#132235]">Grand Total:</Text>
                <Text className="text-[22px] font-poppins-bold text-[#132235]">{grandTotal}</Text>
              </View>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

export default FareCalculationsModal;
