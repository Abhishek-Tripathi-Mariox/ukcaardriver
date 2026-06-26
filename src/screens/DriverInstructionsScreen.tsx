import { useState } from 'react';
import { Pressable, ScrollView, StatusBar, Text, View } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  BackArrowIcon,
  CarOutlineIcon,
  CheckIcon,
  ClockSmallIcon,
  DocumentIcon,
  PhoneIcon,
  WalletIcon,
} from '../components/icons/ServiceTypeIcons';

interface DriverInstructionsScreenProps {
  onBack?: () => void;
  onAgree?: () => void;
}

interface InstructionItem {
  icon: React.ReactNode;
  text: string;
}

const INSTRUCTIONS: InstructionItem[] = [
  {
    icon: <ClockSmallIcon size={22} color="#0097B3" />,
    text: 'Be on time for every pickup',
  },
  {
    icon: <CarOutlineIcon size={22} color="#0097B3" />,
    text: 'Keep your vehicle clean and ready',
  },
  {
    icon: <DocumentIcon size={22} color="#0097B3" />,
    text: 'Handle parcels carefully',
  },
  {
    icon: <WalletIcon size={22} color="#0097B3" />,
    text: 'Encourage cashless payments',
  },
  {
    icon: <PhoneIcon size={22} color="#0097B3" />,
    text: 'Call customer only when necessary',
  },
];

export function DriverInstructionsScreen({
  onBack,
  onAgree,
}: DriverInstructionsScreenProps) {
  const [agreed, setAgreed] = useState(false);

  return (
    <View className="flex-1 bg-[#FDFEFD]">
      <StatusBar barStyle="light-content" />

      <LinearGradient
        colors={['#0097B3', '#00C896']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
      >
        <SafeAreaView edges={['top']}>
          <View className="flex-row items-center gap-5 px-4 pb-4 pt-2">
            <Pressable onPress={onBack} hitSlop={10}>
              <BackArrowIcon size={22} color="white" />
            </Pressable>
            <Text className="text-[18px] font-semibold text-white">
              Driver Instructions
            </Text>
          </View>
        </SafeAreaView>
      </LinearGradient>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 20, paddingBottom: 32, gap: 16 }}
        showsVerticalScrollIndicator={false}
      >
        <Text className="text-[14px] text-[#4A5565]">
          Please read the instructions carefully before starting your rides or
          deliveries.
        </Text>

        <View className="gap-3">
          {INSTRUCTIONS.map((item, i) => (
            <View
              key={i}
              className="flex-row items-center gap-4 rounded-2xl border border-[#E1E6EF] bg-white p-4"
            >
              <View className="h-10 w-10 items-center justify-center rounded-full bg-[#0097B3]/10">
                {item.icon}
              </View>
              <Text className="flex-1 text-[15px] font-medium text-[#132235]">
                {item.text}
              </Text>
            </View>
          ))}
        </View>
      </ScrollView>

      <SafeAreaView edges={['bottom']} className="bg-white px-4 pb-4">
        <Pressable
          onPress={() => setAgreed(v => !v)}
          className="mb-4 flex-row items-center gap-3"
        >
          <View
            className={`h-5 w-5 items-center justify-center rounded border ${
              agreed
                ? 'border-[#0097B3] bg-[#0097B3]'
                : 'border-[#99A1AF] bg-white'
            }`}
          >
            {agreed && <CheckIcon size={14} color="white" />}
          </View>
          <Text className="text-[14px] text-[#132235]">
            I have read and understood all instructions
          </Text>
        </Pressable>
        <Pressable
          disabled={!agreed}
          onPress={onAgree}
          className="h-14 items-center justify-center rounded-2xl"
          style={{ backgroundColor: agreed ? '#0097B3' : '#D1D5DC' }}
        >
          <Text className="text-[17px] font-bold text-white">Agree</Text>
        </Pressable>
      </SafeAreaView>
    </View>
  );
}

export default DriverInstructionsScreen;
