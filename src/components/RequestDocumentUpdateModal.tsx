import { useState } from 'react';
import { Modal, Pressable, Text, TextInput, View } from 'react-native';
import { CloseIcon, UploadIcon } from './icons/ServiceTypeIcons';

interface RequestDocumentUpdateModalProps {
  visible: boolean;
  documentType?: string;
  onClose: () => void;
  onSubmit?: (data: { reason: string; fileName?: string }) => void;
  onBrowseFile?: () => Promise<string | undefined> | string | undefined;
}

const MAX_REASON_LENGTH = 500;

export function RequestDocumentUpdateModal({
  visible,
  documentType = 'Insurance',
  onClose,
  onSubmit,
  onBrowseFile,
}: RequestDocumentUpdateModalProps) {
  const [reason, setReason] = useState('');
  const [fileName, setFileName] = useState<string | undefined>(undefined);

  const reset = () => {
    setReason('');
    setFileName(undefined);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleSubmit = () => {
    if (!reason.trim()) return;
    onSubmit?.({ reason: reason.trim(), fileName });
    reset();
  };

  const handleBrowse = async () => {
    const picked = await onBrowseFile?.();
    if (picked) setFileName(picked);
  };

  const canSubmit = reason.trim().length > 0;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
      <View className="flex-1 items-center justify-center bg-black/20 px-4">
        <View
          className="w-full max-w-[360px] rounded-2xl bg-white"
          style={{
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 25 },
            shadowOpacity: 0.25,
            shadowRadius: 50,
            elevation: 12,
          }}
        >
          <View className="flex-row items-center justify-between border-b border-[#F3F4F6] px-6 py-4">
            <Text className="text-[18px] font-poppins-semibold text-[#101828]">
              Request Document Update
            </Text>
            <Pressable onPress={handleClose} hitSlop={10} className="h-8 w-8 items-center justify-center">
              <CloseIcon size={20} color="#6A7282" />
            </Pressable>
          </View>

          <View className="gap-5 px-6 py-6">
            <View>
              <Text className="text-[13px] font-poppins-medium text-[#364153]">Document Type</Text>
              <View className="mt-2 h-11 justify-center rounded-xl bg-[#F3F4F6] px-4">
                <Text className="text-sm font-poppins-medium text-[#364153]">{documentType}</Text>
              </View>
            </View>

            <View>
              <Text className="text-[13px] font-poppins-medium text-[#364153]">Reason for Change *</Text>
              <View className="mt-2 h-[110px] rounded-xl border border-[#D7E1E7] px-4 py-3">
                <TextInput
                  value={reason}
                  onChangeText={text => {
                    if (text.length <= MAX_REASON_LENGTH) setReason(text);
                  }}
                  placeholder="Please explain why you need to update this document..."
                  placeholderTextColor="rgba(10,10,10,0.5)"
                  multiline
                  textAlignVertical="top"
                  className="flex-1 text-sm text-[#101828]"
                  style={{ fontFamily: undefined }}
                />
              </View>
              <Text className="mt-2 text-[11px] text-[#6A7282]">
                {reason.length}/{MAX_REASON_LENGTH} characters
              </Text>
            </View>

            <View>
              <Text className="text-[13px] font-poppins-medium text-[#364153]">
                Upload New File (Optional)
              </Text>
              <Pressable
                onPress={handleBrowse}
                className="mt-2 items-center justify-center rounded-xl border border-dashed border-[#D1D5DC] px-6 py-6"
              >
                <UploadIcon size={32} color="#0097B3" />
                <View className="mt-3 flex-row items-center">
                  <Text className="text-sm text-[#364153]">Drag & drop or </Text>
                  <Text className="text-base font-poppins-medium text-[#0097B3]">browse</Text>
                </View>
                <Text className="mt-1 text-xs text-[#6A7282]">PNG, JPG or PDF (Max 5MB)</Text>
                {fileName && (
                  <Text className="mt-2 text-xs font-poppins-medium text-[#00C896]">{fileName}</Text>
                )}
              </Pressable>
            </View>

            <View className="flex-row gap-3 pt-1">
              <Pressable
                onPress={handleClose}
                className="h-12 flex-1 items-center justify-center rounded-xl"
              >
                <Text className="text-sm font-poppins-medium text-[#364153]">Cancel</Text>
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
                <Text className="text-sm font-poppins-medium text-white">Submit Request</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

export default RequestDocumentUpdateModal;
