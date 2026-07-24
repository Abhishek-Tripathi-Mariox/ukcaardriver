import { Pressable, StatusBar, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BigCheckIcon } from '../components/icons/ServiceTypeIcons';

interface CashoutSuccessScreenProps {
  amount?: string;
  accountEndingDigits?: string;
  onGoToWallet?: () => void;
  onViewTransaction?: () => void;
}

export function CashoutSuccessScreen({
  amount = '₹122.00',
  accountEndingDigits = '4321',
  onGoToWallet,
  onViewTransaction,
}: CashoutSuccessScreenProps) {
  return (
    <View className="flex-1 bg-[#F5F5F5]">
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

      <SafeAreaView edges={['top', 'bottom']} className="flex-1">
        <View className="flex-1 items-center justify-center px-4">
          <View className="h-20 w-20 items-center justify-center rounded-full border-[6px] border-[#08875D]">
            <BigCheckIcon size={36} color="#08875D" />
          </View>

          <Text className="mt-6 text-center text-[24px] font-poppins-semibold text-[#101828]">
            Cashout Request Submitted
          </Text>

          <View
            className="mt-8 w-full rounded-2xl bg-white px-6 pb-6 pt-6"
            style={{
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.1,
              shadowRadius: 1.5,
              elevation: 2,
            }}
          >
            <Text className="text-center text-sm text-[#4A5565]">
              Withdrawal Amount
            </Text>
            <Text className="mt-1 text-center text-[32px] font-poppins-bold text-[#0097B3]">
              {amount}
            </Text>
            <View className="my-4 h-px bg-[#F3F4F6]" />
            <Text
              className="text-center text-sm text-[#364153]"
              style={{ lineHeight: 22.75 }}
            >
              {amount} will be transferred to your account ending{' '}
              <Text className="font-poppins-bold">{accountEndingDigits}</Text> within 24
              hours.
            </Text>
            <Text className="mt-3 text-center text-xs text-[#6A7282]">
              You can track the status under Wallet → Transactions.
            </Text>
          </View>
        </View>

        <View className="gap-3 px-4 pb-6">
          <Pressable
            onPress={onGoToWallet}
            className="h-14 items-center justify-center rounded-xl bg-[#0097B3]"
            style={{
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.1,
              shadowRadius: 7.5,
              elevation: 4,
            }}
          >
            <Text className="text-base font-poppins-medium text-white">
              Go to Wallet
            </Text>
          </Pressable>
          <Pressable
            onPress={onViewTransaction}
            className="h-12 items-center justify-center rounded-xl"
          >
            <Text className="text-sm font-poppins-medium text-[#0097B3]">
              View Transaction
            </Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </View>
  );
}

export default CashoutSuccessScreen;
