import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StatusBar,
  Text,
  View,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import RequestBankDetailsUpdateModal from '../components/RequestBankDetailsUpdateModal';
import Toast from '../components/Toast';
import {
  BackArrowIcon,
  CheckIcon,
  DocumentIcon,
  EditPencilIcon,
  InfoCircleIcon,
} from '../components/icons/ServiceTypeIcons';
import { fetchCurrentUser, requestBankDetailsUpdate } from '../services/api';

interface BankDetailsScreenProps {
  onBack?: () => void;
  onViewStatement?: () => void;
}

/**
 * Mask all but the last 4 digits of an account number for display:
 * "123456789012" -> "**** 9012". Returns "—" when missing.
 */
const maskAccount = (n?: string): string => {
  if (!n) return '—';
  const digits = n.replace(/\D/g, '');
  if (digits.length <= 4) return digits;
  return `**** ${digits.slice(-4)}`;
};

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row items-center justify-between py-3">
      <Text className="text-[13px] text-[#4A5565]">{label}</Text>
      <Text className="text-[13px] font-poppins-medium text-[#101828]">{value}</Text>
    </View>
  );
}

export function BankDetailsScreen({ onBack, onViewStatement }: BankDetailsScreenProps) {
  const insets = useSafeAreaInsets();
  const [info, setInfo] = useState<{
    accountHolder: string;
    bankName: string;
    accountNumber: string;
    ifscCode: string;
    upiId: string;
    linkedMobile: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [requestOpen, setRequestOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [submittingUpdate, setSubmittingUpdate] = useState(false);

  const load = useCallback(async () => {
    try {
      const u = await fetchCurrentUser();
      const bd = u?.driverProfile?.bankDetails;
      setInfo({
        accountHolder: bd?.accountHolder || '—',
        bankName: bd?.bankName || '—',
        accountNumber: maskAccount(bd?.accountNumber),
        ifscCode: bd?.ifsc || '—',
        upiId: '—', // not yet captured anywhere; TODO when product adds it
        linkedMobile: u?.phone || '—',
      });
    } catch (err) {
      console.warn('[bank-details] fetch failed:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = () => {
    setRefreshing(true);
    load();
  };

  const handleSubmit = async (data: {
    accountHolder: string;
    bankName: string;
    accountNumber: string;
    ifscCode: string;
    fileName?: string;
  }) => {
    setSubmittingUpdate(true);
    try {
      // Bank-detail change requests go through the support-ticket pipeline
      // so admin reviews them in the same place as other escalations.
      await requestBankDetailsUpdate({
        newAccountHolder: data.accountHolder,
        newBankName: data.bankName,
        newAccountNumber: data.accountNumber,
        newIfsc: data.ifscCode,
      });
      setRequestOpen(false);
      setToastMessage('Update request sent for admin approval.');
    } catch (err: any) {
      setToastMessage(err?.message ?? 'Could not submit request.');
    } finally {
      setSubmittingUpdate(false);
    }
  };

  // Has the driver actually filled in bank details? Used to switch the top
  // banner from "verified" to "missing".
  const hasBankInfo =
    info && (info.accountHolder !== '—' || info.bankName !== '—');

  return (
    <View className="flex-1 bg-[#F5F5F5]">
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      <LinearGradient
        colors={['#0097B3', '#00C896']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
      >
        <SafeAreaView edges={['top']}>
          <View className="flex-row items-center gap-4 px-6 pb-4 pt-2">
            <Pressable onPress={onBack} hitSlop={10}>
              <BackArrowIcon size={22} color="white" />
            </Pressable>
            <Text className="text-[20px] font-poppins-semibold text-white">Bank Details</Text>
          </View>
        </SafeAreaView>
      </LinearGradient>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 16, paddingBottom: 32 + insets.bottom }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {loading && !info ? (
          <View className="py-20 items-center">
            <ActivityIndicator color="#0097B3" />
          </View>
        ) : (
          <>
            {hasBankInfo ? (
              <View className="mb-4 flex-row items-center gap-3 rounded-2xl border border-[#BFFCD9] bg-[#E8F8F4] p-4">
                <View className="h-10 w-10 items-center justify-center rounded-full bg-[#00C896]">
                  <CheckIcon size={18} color="white" />
                </View>
                <View className="flex-1">
                  <Text className="text-sm font-poppins-semibold text-[#008A2E]">
                    Bank Account on File
                  </Text>
                  <Text className="mt-0.5 text-xs text-[#008A2E]">
                    Used for ride payouts and earnings.
                  </Text>
                </View>
              </View>
            ) : (
              <View className="mb-4 flex-row items-center gap-3 rounded-2xl border border-[#FED7AA] bg-[#FFEDD5] p-4">
                <View className="h-10 w-10 items-center justify-center rounded-full bg-[#F59E0B]">
                  <InfoCircleIcon size={18} color="white" />
                </View>
                <View className="flex-1">
                  <Text className="text-sm font-poppins-semibold text-[#92400E]">
                    No bank details yet
                  </Text>
                  <Text className="mt-0.5 text-xs text-[#92400E]">
                    Add your bank info during registration to receive payouts.
                  </Text>
                </View>
              </View>
            )}

            <View
              className="rounded-2xl bg-white p-5"
              style={{
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.1,
                shadowRadius: 3,
                elevation: 2,
              }}
            >
              <Text className="text-base font-poppins-semibold text-[#101828]">
                Registered Bank Information
              </Text>
              <View className="mt-2">
                <InfoRow label="Account Holder" value={info!.accountHolder} />
                <View className="h-px bg-[#F3F4F6]" />
                <InfoRow label="Bank Name" value={info!.bankName} />
                <View className="h-px bg-[#F3F4F6]" />
                <InfoRow label="Account Number" value={info!.accountNumber} />
                <View className="h-px bg-[#F3F4F6]" />
                <InfoRow label="IFSC Code" value={info!.ifscCode} />
                <View className="h-px bg-[#F3F4F6]" />
                <InfoRow label="Linked Mobile" value={info!.linkedMobile} />
              </View>
            </View>

            <View className="mt-4 gap-3">
              <Pressable
                onPress={() => setRequestOpen(true)}
                className="h-12 flex-row items-center justify-center gap-2 rounded-xl bg-[#0097B3]"
                style={{
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 10 },
                  shadowOpacity: 0.1,
                  shadowRadius: 15,
                  elevation: 4,
                }}
              >
                <EditPencilIcon size={16} color="white" />
                <Text className="text-sm font-poppins-medium text-white">
                  Request Bank Details Update
                </Text>
              </Pressable>
              <Pressable
                onPress={onViewStatement}
                className="h-12 flex-row items-center justify-center gap-2 rounded-xl border border-[#0097B3] bg-white"
              >
                <DocumentIcon size={16} color="#0097B3" />
                <Text className="text-sm font-poppins-medium text-[#0097B3]">
                  View Transaction Statement
                </Text>
              </Pressable>
            </View>

            <View className="mt-4 flex-row items-start gap-3 rounded-2xl border border-[#0097B3]/20 bg-[#E3F2FD] p-4">
              <InfoCircleIcon size={20} color="#0097B3" />
              <Text className="flex-1 text-xs leading-[19px] text-[#364153]">
                Any change in bank details will be reviewed by the admin team
                before being approved. You will be notified once your update is
                processed.
              </Text>
            </View>
          </>
        )}
      </ScrollView>

      <RequestBankDetailsUpdateModal
        visible={requestOpen}
        onClose={() => setRequestOpen(false)}
        onSubmit={handleSubmit}
      />

      <Toast
        visible={toastMessage !== null}
        message={toastMessage ?? ''}
        onHide={() => setToastMessage(null)}
      />
      {submittingUpdate && (
        <View
          pointerEvents="none"
          className="absolute inset-0 items-center justify-center bg-black/10"
        >
          <ActivityIndicator color="#0097B3" />
        </View>
      )}
    </View>
  );
}

export default BankDetailsScreen;
