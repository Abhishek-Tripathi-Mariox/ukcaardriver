import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { CheckCircleIcon, UploadIcon } from './icons/ServiceTypeIcons';

interface Props {
  label: string;
  prompt: string;
  uploadedUrl: string | null;
  uploading: boolean;
  status?: string;
  onPress: () => void;
}

/** Completed uploads are status rows. Rejected or missing files need an action. */
export default function RegistrationDocumentField({ label, prompt, uploadedUrl, uploading, status, onPress }: Props) {
  const complete = Boolean(uploadedUrl) && status !== 'rejected';
  const content = uploading ? <ActivityIndicator color="#0097B3" /> : <>
    {complete ? <CheckCircleIcon size={28} color="#0097B3" /> : <UploadIcon size={28} color={status === 'rejected' ? '#EF4444' : '#99A1AF'} />}
    <Text className="mt-2 text-sm text-slate-700">
      {complete ? (status === 'verified' ? 'Verified by admin' : 'Uploaded — pending review') : status === 'rejected' ? 'Rejected — upload a replacement' : prompt}
    </Text>
  </>;
  const className = `min-h-[96px] items-center justify-center rounded-2xl border p-4 ${complete ? 'border-brand-teal bg-brand-teal/5' : status === 'rejected' ? 'border-red-500 bg-red-50' : 'border-slate-300 bg-white'}`;
  return <View className="mb-4">
    <Text className="mb-2 text-sm font-poppins-medium text-slate-800">{complete ? label.replace(/^Upload\s+/i, '') : label}</Text>
    {complete ? <View className={className}>{content}</View> : <Pressable accessibilityRole="button" accessibilityLabel={label} disabled={uploading} onPress={onPress} className={className}>{content}</Pressable>}
  </View>;
}
