import { useState } from 'react';
import { Modal, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { CloseIcon, UploadIcon } from './icons/ServiceTypeIcons';

interface BankUpdateData {
  accountHolder: string;
  bankName: string;
  accountNumber: string;
  ifscCode: string;
  fileName?: string;
}

interface RequestBankDetailsUpdateModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit?: (data: BankUpdateData) => void;
  onBrowseFile?: () => Promise<string | undefined> | string | undefined;
}

export function RequestBankDetailsUpdateModal({
  visible,
  onClose,
  onSubmit,
  onBrowseFile,
}: RequestBankDetailsUpdateModalProps) {
  const [accountHolder, setAccountHolder] = useState('');
  const [bankName, setBankName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [ifscCode, setIfscCode] = useState('');
  const [fileName, setFileName] = useState<string | undefined>(undefined);

  const reset = () => {
    setAccountHolder('');
    setBankName('');
    setAccountNumber('');
    setIfscCode('');
    setFileName(undefined);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const canSubmit =
    accountHolder.trim().length > 0 &&
    bankName.trim().length > 0 &&
    accountNumber.trim().length > 0 &&
    ifscCode.trim().length > 0;

  const handleSubmit = () => {
    if (!canSubmit) return;
    onSubmit?.({
      accountHolder: accountHolder.trim(),
      bankName: bankName.trim(),
      accountNumber: accountNumber.trim(),
      ifscCode: ifscCode.trim(),
      fileName,
    });
    reset();
  };

  const handleBrowse = async () => {
    const picked = await onBrowseFile?.();
    if (picked) setFileName(picked);
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
      <View className="flex-1 items-center justify-center bg-black/20 px-4">
        <View
          className="w-full max-w-[340px] overflow-hidden rounded-2xl bg-white"
          style={{
            maxHeight: '90%',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 25 },
            shadowOpacity: 0.25,
            shadowRadius: 50,
            elevation: 12,
          }}
        >
          <View className="flex-row items-start justify-between border-b border-[#F3F4F6] px-6 py-4">
            <Text className="flex-1 text-[18px] font-semibold text-[#101828]">
              Request Bank Details Update
            </Text>
            <Pressable
              onPress={handleClose}
              hitSlop={10}
              className="h-8 w-8 items-center justify-center"
            >
              <CloseIcon size={20} color="#6A7282" />
            </Pressable>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ padding: 24, gap: 16 }}
          >
            <Field
              label="Account Holder Name *"
              value={accountHolder}
              onChangeText={setAccountHolder}
              placeholder="Enter account holder name"
            />
            <Field
              label="Bank Name *"
              value={bankName}
              onChangeText={setBankName}
              placeholder="Enter bank name"
            />
            <Field
              label="Account Number *"
              value={accountNumber}
              onChangeText={setAccountNumber}
              placeholder="Enter account number"
              keyboardType="number-pad"
            />
            <Field
              label="IFSC Code *"
              value={ifscCode}
              onChangeText={text => setIfscCode(text.toUpperCase())}
              placeholder="Enter IFSC code"
              autoCapitalize="characters"
            />

            <View>
              <Text className="text-[13px] font-medium text-[#364153]">
                Upload Passbook/Cancelled Cheque
              </Text>
              <Pressable
                onPress={handleBrowse}
                className="mt-2 items-center justify-center rounded-xl border border-dashed border-[#D1D5DC] px-6 py-6"
              >
                <UploadIcon size={32} color="#0097B3" />
                <View className="mt-3 flex-row items-center">
                  <Text className="text-sm text-[#364153]">Drag & drop or </Text>
                  <Text className="text-base font-medium text-[#0097B3]">browse</Text>
                </View>
                <Text className="mt-1 text-xs text-[#6A7282]">PNG, JPG or PDF (Max 5MB)</Text>
                {fileName && (
                  <Text className="mt-2 text-xs font-medium text-[#00C896]">{fileName}</Text>
                )}
              </Pressable>
            </View>

            <View className="rounded-xl bg-[#FFF3E0] p-3">
              <Text className="text-[11px] leading-[17px] text-[#364153]">
                ⚠️ All changes will be verified by the admin team before they take effect. You
                will be notified once approved.
              </Text>
            </View>

            <View className="flex-row gap-3 pt-1">
              <Pressable
                onPress={handleClose}
                className="h-12 flex-1 items-center justify-center rounded-xl"
              >
                <Text className="text-sm font-semibold text-[#364153]">Cancel</Text>
              </Pressable>
              <Pressable
                onPress={handleSubmit}
                disabled={!canSubmit}
                className="h-12 flex-1 items-center justify-center rounded-xl bg-[#0097B3]"
                style={{
                  opacity: canSubmit ? 1 : 0.5,
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 10 },
                  shadowOpacity: 0.1,
                  shadowRadius: 15,
                  elevation: 4,
                }}
              >
                <Text className="text-sm font-semibold text-white">Submit Request</Text>
              </Pressable>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

interface FieldProps {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  keyboardType?: 'default' | 'number-pad';
  autoCapitalize?: 'none' | 'characters' | 'words' | 'sentences';
}

function Field({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType = 'default',
  autoCapitalize = 'none',
}: FieldProps) {
  return (
    <View>
      <Text className="text-[13px] font-medium text-[#364153]">{label}</Text>
      <View className="mt-2 h-12 justify-center rounded-xl border border-[#E5E7EB] px-4">
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="rgba(10,10,10,0.5)"
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          className="text-sm text-[#101828]"
        />
      </View>
    </View>
  );
}

export default RequestBankDetailsUpdateModal;
