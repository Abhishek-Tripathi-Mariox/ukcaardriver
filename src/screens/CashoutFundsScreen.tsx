import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  Text,
  TextInput,
  View,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  BackArrowIcon,
  EditPencilIcon,
  InfoCircleIcon,
} from '../components/icons/ServiceTypeIcons';
import {
  fetchCurrentUser,
  fetchWallet,
  requestCashout,
} from '../services/api';

interface CashoutFundsScreenProps {
  onBack?: () => void;
  /** Called with the confirmed amount + destination so the parent can
   *  navigate to the success screen. */
  onConfirmed?: (info: {
    amount: number;
    accountEndingDigits: string;
    bankLabel: string;
  }) => void;
  onEditBank?: () => void;
}

type PayoutMethod = 'bank' | 'upi';

const MIN_WITHDRAWAL = 100;
const TXN_FEE = 5;

const fmtRupees = (n: number): string => {
  try {
    return `₹${new Intl.NumberFormat('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(n)}`;
  } catch {
    return `₹${n.toFixed(2)}`;
  }
};

function RadioDot({ selected }: { selected: boolean }) {
  return (
    <View
      className={`h-5 w-5 items-center justify-center rounded-full border-[1.5px] ${
        selected ? 'border-[#0097B3]' : 'border-[#D1D5DC]'
      }`}
    >
      {selected && <View className="h-3 w-3 rounded-full bg-[#0097B3]" />}
    </View>
  );
}

export function CashoutFundsScreen({
  onBack,
  onConfirmed,
  onEditBank,
}: CashoutFundsScreenProps) {
  const [method, setMethod] = useState<PayoutMethod>('bank');
  const [amountText, setAmountText] = useState('');
  const [upiId, setUpiId] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [balance, setBalance] = useState<number | null>(null);
  const [bankName, setBankName] = useState<string>('');
  const [accountLast4, setAccountLast4] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    Promise.all([fetchWallet(), fetchCurrentUser()])
      .then(([w, u]) => {
        if (cancelled) return;
        setBalance(w.wallet.balance);
        const bd = u?.driverProfile?.bankDetails;
        setBankName(bd?.bankName || '');
        setAccountLast4(
          bd?.accountNumber ? bd.accountNumber.slice(-4) : '',
        );
      })
      .catch(() => {
        // leave as defaults — error surfaces on submit if needed.
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const numericAmount = Number(amountText) || 0;
  const balanceOk =
    balance === null ? true : numericAmount + TXN_FEE <= balance;
  const validAmount = numericAmount >= MIN_WITHDRAWAL && balanceOk;
  const validBank = method === 'bank' ? !!accountLast4 : !!upiId;
  const valid = validAmount && validBank;

  const onProceed = () => {
    if (!valid) return;
    setConfirmOpen(true);
  };

  const onConfirm = async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      await requestCashout({
        amount: numericAmount,
        method,
        upiId: method === 'upi' ? upiId : undefined,
      });
      setConfirmOpen(false);
      onConfirmed?.({
        amount: numericAmount,
        accountEndingDigits:
          method === 'bank' ? accountLast4 : upiId.slice(-4),
        bankLabel: method === 'bank' ? bankName || 'Bank' : 'UPI',
      });
    } catch (err: any) {
      setConfirmOpen(false);
      Alert.alert('Cashout failed', err?.message ?? 'Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View className="flex-1 bg-[#F5F5F5]">
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      <LinearGradient
        colors={['#0097B3', '#00C896']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
      >
        <SafeAreaView edges={['top']}>
          <View className="flex-row items-center gap-4 px-4 pb-4 pt-2">
            <Pressable onPress={onBack} hitSlop={10}>
              <BackArrowIcon size={22} color="white" />
            </Pressable>
            <Text className="text-[20px] font-poppins-semibold text-white">
              Cashout Funds
            </Text>
          </View>
        </SafeAreaView>
      </LinearGradient>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 16, paddingBottom: 32, gap: 24 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View
          className="items-center rounded-2xl bg-white px-6 pb-5 pt-6"
          style={{
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.1,
            shadowRadius: 1.5,
            elevation: 2,
          }}
        >
          <Text className="text-sm text-[#4A5565]">Available Balance</Text>
          {loading ? (
            <ActivityIndicator color="#0097B3" className="mt-3" />
          ) : (
            <Text className="mt-1 text-[36px] font-poppins-bold text-[#0097B3]">
              {fmtRupees(balance ?? 0)}
            </Text>
          )}
        </View>

        <View className="gap-3">
          <Text className="text-sm font-poppins-semibold text-[#101828]">
            Select Payout Method
          </Text>

          <Pressable
            onPress={() => setMethod('bank')}
            className="flex-row items-center gap-3 rounded-2xl border-[1.2px] p-4"
            style={{
              borderColor: method === 'bank' ? '#0097B3' : '#E5E7EB',
              backgroundColor:
                method === 'bank' ? 'rgba(0,151,179,0.05)' : 'white',
            }}
          >
            <RadioDot selected={method === 'bank'} />
            <View className="flex-1">
              <Text className="text-sm font-poppins-semibold text-[#101828]">
                Bank Account
              </Text>
              <Text className="text-xs text-[#6A7282]">
                Transfer to linked bank
              </Text>
            </View>
          </Pressable>

          <Pressable
            onPress={() => setMethod('upi')}
            className="flex-row items-center gap-3 rounded-2xl border-[1.2px] p-4"
            style={{
              borderColor: method === 'upi' ? '#0097B3' : '#E5E7EB',
              backgroundColor:
                method === 'upi' ? 'rgba(0,151,179,0.05)' : 'white',
            }}
          >
            <RadioDot selected={method === 'upi'} />
            <View className="flex-1">
              <Text className="text-sm font-poppins-semibold text-[#101828]">UPI ID</Text>
              <Text className="text-xs text-[#6A7282]">Transfer to UPI</Text>
            </View>
          </Pressable>
        </View>

        {method === 'bank' && (
          <View
            className="flex-row items-center justify-between rounded-2xl bg-white p-4"
            style={{
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.1,
              shadowRadius: 1.5,
              elevation: 2,
            }}
          >
            <View className="flex-1">
              <Text className="text-xs text-[#6A7282]">Linked Bank Account</Text>
              <Text className="mt-0.5 text-sm font-poppins-semibold text-[#101828]">
                {accountLast4
                  ? `${bankName || 'Bank'} •••• ${accountLast4}`
                  : 'No bank linked'}
              </Text>
            </View>
            <Pressable
              onPress={onEditBank}
              hitSlop={10}
              className="h-10 w-10 items-center justify-center"
            >
              <EditPencilIcon size={18} color="#0097B3" />
            </Pressable>
          </View>
        )}

        {method === 'upi' && (
          <View className="gap-2">
            <Text className="text-sm font-poppins-semibold text-[#101828]">UPI ID</Text>
            <View className="rounded-xl border-[1.2px] border-[#E5E7EB] bg-white px-4 py-3">
              <TextInput
                value={upiId}
                onChangeText={setUpiId}
                placeholder="name@bank"
                placeholderTextColor="#99A1AF"
                autoCapitalize="none"
                className="text-base text-[#101828]"
              />
            </View>
          </View>
        )}

        <View className="gap-2">
          <Text className="text-sm font-poppins-semibold text-[#101828]">
            Enter Amount
          </Text>
          <View className="flex-row items-center rounded-xl border-[1.2px] border-[#E5E7EB] bg-white px-4 py-4">
            <Text className="text-[20px] font-poppins-semibold text-[#101828]">₹</Text>
            <TextInput
              value={amountText}
              onChangeText={t => setAmountText(t.replace(/[^0-9]/g, ''))}
              keyboardType="number-pad"
              placeholder="0"
              placeholderTextColor="rgba(10,10,10,0.5)"
              className="ml-2 flex-1 text-[20px] font-poppins-semibold text-[#101828]"
            />
          </View>
          {amountText.length > 0 && numericAmount < MIN_WITHDRAWAL && (
            <Text className="text-xs text-[#E74C3C]">
              Minimum withdrawal amount is ₹{MIN_WITHDRAWAL}
            </Text>
          )}
          {amountText.length > 0 && !balanceOk && (
            <Text className="text-xs text-[#E74C3C]">
              Insufficient balance (including ₹{TXN_FEE} fee).
            </Text>
          )}
        </View>

        <View className="flex-row items-start gap-3 rounded-xl bg-[#FFF3E0] p-4">
          <InfoCircleIcon size={18} color="#F59E0B" />
          <Text className="flex-1 text-xs text-[#364153]" style={{ lineHeight: 19.5 }}>
            Minimum withdrawal ₹{MIN_WITHDRAWAL}. Transaction fee ₹{TXN_FEE} per
            withdrawal.
          </Text>
        </View>

        <Pressable
          disabled={!valid}
          onPress={onProceed}
          className="h-14 items-center justify-center rounded-xl"
          style={{
            backgroundColor: valid ? '#0097B3' : '#D1D5DC',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.1,
            shadowRadius: 7.5,
            elevation: 4,
          }}
        >
          <Text className="text-base font-poppins-medium text-white">
            Proceed to Cashout
          </Text>
        </Pressable>
      </ScrollView>
      </KeyboardAvoidingView>

      <Modal
        visible={confirmOpen}
        transparent
        animationType="fade"
        onRequestClose={() => !submitting && setConfirmOpen(false)}
      >
        <View className="flex-1 items-center justify-center bg-black/40 px-4">
          <View className="w-full rounded-2xl bg-white p-6">
            <Text className="text-[20px] font-poppins-semibold text-[#101828]">
              Confirm Withdrawal
            </Text>
            <Text className="mt-3 text-sm text-[#364153]">
              You're about to withdraw{' '}
              <Text className="font-poppins-semibold text-[#0097B3]">
                {fmtRupees(numericAmount)}
              </Text>
              .
            </Text>
            <Text className="mt-2 text-sm text-[#364153]">
              {method === 'bank'
                ? `Amount will be credited to your linked account ending `
                : `Amount will be sent to your UPI `}
              <Text className="font-poppins-bold">
                {method === 'bank' ? accountLast4 : upiId}
              </Text>
              .
            </Text>
            <View className="mt-6 flex-row gap-3">
              <Pressable
                onPress={() => !submitting && setConfirmOpen(false)}
                disabled={submitting}
                className="flex-1 items-center justify-center py-3"
              >
                <Text className="text-sm font-poppins-medium text-[#364153]">
                  Cancel
                </Text>
              </Pressable>
              <Pressable
                onPress={onConfirm}
                disabled={submitting}
                className="flex-1 items-center justify-center rounded-xl bg-[#0097B3] py-3"
              >
                {submitting ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text className="text-sm font-poppins-medium text-white">
                    Confirm
                  </Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

export default CashoutFundsScreen;
