import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { pickImageFromSource } from '../services/imagePicker';
import { CloseIcon, UploadIcon } from './icons/ServiceTypeIcons';
import { DocumentType, uploadDocument } from '../services/api';

interface RequestDocumentChangeModalProps {
  visible: boolean;
  /** Backend doc.type (e.g. 'licence', 'vehicle'). */
  docType: DocumentType | null;
  /** Display name shown in the read-only "Document Type" field. */
  docTitle: string | null;
  onClose: () => void;
  onSubmit: (input: { reason: string; newFileUrl?: string }) => Promise<void>;
}

const MAX_REASON = 500;

export function RequestDocumentChangeModal({
  visible,
  docType,
  docTitle,
  onClose,
  onSubmit,
}: RequestDocumentChangeModalProps) {
  const [reason, setReason] = useState('');
  const [newFileUrl, setNewFileUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Reset local state every time the modal re-opens for a different doc.
  useEffect(() => {
    if (visible) {
      setReason('');
      setNewFileUrl(null);
      setUploading(false);
      setSubmitting(false);
    }
  }, [visible, docType]);

  const canSubmit = reason.trim().length > 0 && !submitting && !uploading;

  const handlePickFile = async () => {
    if (!docType) return;
    try {
      const asset = await pickImageFromSource('Attach New File');
      if (!asset?.uri) return;

      setUploading(true);
      // Re-uploading via this flow updates the doc URL on the backend and
      // resets its status to 'pending' — same path as a normal re-upload.
      const { url } = await uploadDocument(
        { uri: asset.uri, fileName: asset.fileName, type: asset.type },
        docType,
      );
      setNewFileUrl(url);
    } catch (err: any) {
      console.warn('[request-change] upload failed:', err);
      Alert.alert('Upload failed', err?.message ?? 'Try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      await onSubmit({ reason: reason.trim(), newFileUrl: newFileUrl ?? undefined });
    } catch (err: any) {
      Alert.alert('Could not submit', err?.message ?? 'Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable
        onPress={onClose}
        className="flex-1 items-center justify-center bg-black/30 px-4"
      >
        <Pressable
          onPress={() => {}}
          className="w-full max-w-md overflow-hidden rounded-2xl bg-white"
          style={{
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 25 },
            shadowOpacity: 0.25,
            shadowRadius: 25,
            elevation: 10,
          }}
        >
          <View className="flex-row items-center justify-between border-b border-[#F3F4F6] px-6 py-4">
            <Text className="text-[18px] font-poppins-semibold text-[#101828]">
              Request Document Update
            </Text>
            <Pressable
              onPress={onClose}
              hitSlop={10}
              className="h-8 w-8 items-center justify-center rounded-full"
            >
              <CloseIcon size={20} color="#6A7282" />
            </Pressable>
          </View>

          <ScrollView
            contentContainerStyle={{ padding: 24, gap: 20 }}
            keyboardShouldPersistTaps="handled"
          >
            <View className="gap-2">
              <Text className="text-[13px] font-poppins-medium text-[#364153]">
                Document Type
              </Text>
              <View className="h-12 justify-center rounded-xl bg-[#F3F4F6] px-4">
                <Text className="text-[14px] font-poppins-medium text-[#364153]">
                  {docTitle ?? '—'}
                </Text>
              </View>
            </View>

            <View className="gap-2">
              <Text className="text-[13px] font-poppins-medium text-[#364153]">
                Reason for Change *
              </Text>
              <View className="h-28 rounded-xl border border-[#D7E1E7] px-4 py-3">
                <TextInput
                  value={reason}
                  onChangeText={t =>
                    setReason(t.length > MAX_REASON ? t.slice(0, MAX_REASON) : t)
                  }
                  placeholder="Please explain why you need to update this document..."
                  placeholderTextColor="rgba(10,10,10,0.5)"
                  multiline
                  textAlignVertical="top"
                  className="flex-1 text-[14px] text-[#101828]"
                />
              </View>
              <Text className="text-[11px] text-[#6A7282]">
                {reason.length}/{MAX_REASON} characters
              </Text>
            </View>

            <View className="gap-2">
              <Text className="text-[13px] font-poppins-medium text-[#364153]">
                Upload New File (Optional)
              </Text>
              <Pressable
                onPress={uploading ? undefined : handlePickFile}
                className="h-32 items-center justify-center rounded-xl border border-dashed border-[#D1D5DC]"
              >
                {uploading ? (
                  <ActivityIndicator color="#0097B3" />
                ) : (
                  <>
                    <UploadIcon size={28} color="#0097B3" />
                    <View className="mt-2 flex-row items-center">
                      <Text className="text-[14px] text-[#364153]">Drag & drop or </Text>
                      <Text className="text-[14px] font-poppins-medium text-[#0097B3]">
                        browse
                      </Text>
                    </View>
                    <Text className="mt-1 text-[12px] text-[#6A7282]">
                      {newFileUrl
                        ? 'Uploaded — tap to replace'
                        : 'PNG, JPG or PDF (Max 5MB)'}
                    </Text>
                  </>
                )}
              </Pressable>
            </View>

            <View className="flex-row gap-3 pt-2">
              <Pressable
                onPress={onClose}
                disabled={submitting}
                className="h-12 flex-1 items-center justify-center rounded-xl"
              >
                <Text className="text-[14px] font-poppins-medium text-[#364153]">
                  Cancel
                </Text>
              </Pressable>
              <Pressable
                onPress={handleSubmit}
                disabled={!canSubmit}
                className={`h-12 flex-1 items-center justify-center rounded-xl ${
                  canSubmit ? 'bg-[#0097B3]' : 'bg-[#0097B3]/50'
                }`}
                style={
                  canSubmit
                    ? {
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: 10 },
                        shadowOpacity: 0.1,
                        shadowRadius: 7.5,
                        elevation: 4,
                      }
                    : undefined
                }
              >
                {submitting ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text className="text-[14px] font-poppins-medium text-white">
                    Submit Request
                  </Text>
                )}
              </Pressable>
            </View>
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

export default RequestDocumentChangeModal;
