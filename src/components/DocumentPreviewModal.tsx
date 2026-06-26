import { Modal, Pressable, Text, View } from 'react-native';
import {
  CheckIcon,
  CloseIcon,
  DownloadIcon,
  ShareIcon,
} from './icons/ServiceTypeIcons';

interface DocumentPreviewModalProps {
  visible: boolean;
  title?: string;
  expiryDate?: string;
  uploadDate?: string;
  status?: 'verified' | 'under-review';
  onClose: () => void;
  onDownload?: () => void;
  onShare?: () => void;
}

export function DocumentPreviewModal({
  visible,
  title = 'Driving License',
  expiryDate = '12 Mar 2027',
  uploadDate = '15 Jan 2026',
  status = 'verified',
  onClose,
  onDownload,
  onShare,
}: DocumentPreviewModalProps) {
  const statusLabel = status === 'verified' ? 'Verified' : 'Under Review';
  const statusColor = status === 'verified' ? '#00C896' : '#FFA726';

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View className="flex-1 items-center justify-center bg-black/20 px-4">
        <View
          className="w-full max-w-[360px] overflow-hidden rounded-2xl bg-white"
          style={{
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 25 },
            shadowOpacity: 0.25,
            shadowRadius: 50,
            elevation: 12,
          }}
        >
          <View className="flex-row items-start justify-between border-b border-[#F3F4F6] px-6 py-4">
            <View className="flex-1">
              <Text className="text-[18px] font-semibold text-[#101828]">{title}</Text>
              <View className="mt-1 flex-row items-center gap-2">
                <View
                  className="flex-row items-center rounded-full px-3 py-1"
                  style={{ backgroundColor: status === 'verified' ? '#E8F8F4' : '#FFF3E0' }}
                >
                  <CheckIcon size={12} color={statusColor} />
                  <Text
                    className="ml-1 text-xs font-medium"
                    style={{ color: statusColor }}
                  >
                    {statusLabel}
                  </Text>
                </View>
                {expiryDate && (
                  <Text className="text-xs text-[#4A5565]">• Expires: {expiryDate}</Text>
                )}
              </View>
            </View>
            <Pressable
              onPress={onClose}
              hitSlop={10}
              className="h-10 w-10 items-center justify-center"
            >
              <CloseIcon size={20} color="#6A7282" />
            </Pressable>
          </View>

          <View className="gap-5 px-6 pt-6">
            <View className="h-[280px] items-center justify-center rounded-xl bg-[#F3F4F6]">
              <Text className="text-[64px]">📄</Text>
              <Text className="mt-3 text-sm text-[#4A5565]">{title}</Text>
              <Text className="mt-2 text-xs text-[#6A7282]">Document Preview</Text>
              <Text className="text-xs text-[#6A7282]">(Full resolution in production)</Text>
            </View>

            <View className="gap-3 rounded-xl bg-[#F9FAFB] p-4">
              <View className="flex-row items-center justify-between">
                <Text className="text-[13px] text-[#4A5565]">Document Type</Text>
                <Text className="text-sm font-medium text-[#101828]">{title}</Text>
              </View>
              <View className="flex-row items-center justify-between">
                <Text className="text-[13px] text-[#4A5565]">Upload Date</Text>
                <Text className="text-sm font-medium text-[#101828]">{uploadDate}</Text>
              </View>
              {expiryDate && (
                <View className="flex-row items-center justify-between">
                  <Text className="text-[13px] text-[#4A5565]">Expiry Date</Text>
                  <Text className="text-sm font-medium text-[#101828]">{expiryDate}</Text>
                </View>
              )}
              <View className="flex-row items-center justify-between">
                <Text className="text-[13px] text-[#4A5565]">Status</Text>
                <Text className="text-sm font-medium" style={{ color: statusColor }}>
                  {statusLabel}
                </Text>
              </View>
            </View>
          </View>

          <View className="mt-5 flex-row gap-3 border-t border-[#F3F4F6] px-6 py-4">
            <Pressable
              onPress={onDownload}
              className="h-12 flex-1 flex-row items-center justify-center gap-2 rounded-xl border border-[#0097B3]"
            >
              <DownloadIcon size={18} color="#0097B3" />
              <Text className="text-sm font-medium text-[#0097B3]">Download</Text>
            </Pressable>
            <Pressable
              onPress={onShare}
              className="h-12 flex-1 flex-row items-center justify-center gap-2 rounded-xl bg-[#0097B3]"
            >
              <ShareIcon size={18} color="white" />
              <Text className="text-sm font-medium text-white">Share</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

export default DocumentPreviewModal;
