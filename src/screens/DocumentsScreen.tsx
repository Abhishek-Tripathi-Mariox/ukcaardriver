import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StatusBar,
  Text,
  View,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { pickImageFromSource } from '../services/imagePicker';
import DocumentPreviewModal from '../components/DocumentPreviewModal';
import RequestDocumentChangeModal from '../components/RequestDocumentChangeModal';
import {
  BackArrowIcon,
  CheckIcon,
  EditPencilIcon,
  EyeIcon,
  HourglassIcon,
  InfoCircleIcon,
  CarIcon,
  ClipboardListIcon,
  CardAddIcon,
  TabProfileIcon,
  CheckCircleIcon,
  DocumentIcon,
} from '../components/icons/ServiceTypeIcons';
import {
  DriverDocument,
  DocumentType,
  fetchCurrentUser,
  listMySupportTickets,
  MySupportTicket,
  requestDocumentChange,
  uploadDocument,
} from '../services/api';

// UI-side status: backend's 'pending' maps to 'under-review' for display.
// 'change-requested' is purely client-side: there is an open support ticket
// asking admin to update this document.
type UiStatus =
  | 'verified'
  | 'under-review'
  | 'rejected'
  | 'missing'
  | 'change-requested';

interface DocumentItem {
  /** Backend doc.type — used as the upload key when re-uploading. */
  type: DocumentType;
  title: string;
  icon: string;
  status: UiStatus;
  url?: string;
  expiryDate?: string;
  uploadedDate?: string;
  /** Admin's reason when this doc was rejected. */
  rejectionReason?: string;
  /** True if a doc-update support ticket is currently open for this type. */
  hasOpenChangeRequest?: boolean;
}

interface DocumentsScreenProps {
  onBack?: () => void;
}

// Order + labels for the standard registration documents. Anything else the
// driver has uploaded later (PAN, etc.) gets appended below.
// icon: keys into DocTypeIcon below — vector icons only, emoji are banned.
const DOC_DISPLAY: Record<string, { title: string; icon: string }> = {
  licence: { title: 'Driving License', icon: 'card' },
  vehicle: { title: 'Vehicle RC', icon: 'car' },
  insurance: { title: 'Insurance', icon: 'clipboard' },
  'aadhaar-front': { title: 'Aadhaar (Front)', icon: 'card' },
  'aadhaar-back': { title: 'Aadhaar (Back)', icon: 'card' },
  'profile-photo': { title: 'Profile Photo', icon: 'profile' },
  pan: { title: 'PAN', icon: 'card' },
  dbs: { title: 'DBS Check', icon: 'check' },
  phv: { title: 'PHV Licence', icon: 'car' },
  puc: { title: 'Pollution Certificate (PUC)', icon: 'document' },
};

function DocTypeIcon({ kind }: { kind: string }) {
  const color = '#0097B3';
  switch (kind) {
    case 'car':
      return <CarIcon size={22} color={color} />;
    case 'clipboard':
      return <ClipboardListIcon size={22} color={color} />;
    case 'card':
      return <CardAddIcon size={22} color={color} />;
    case 'profile':
      return <TabProfileIcon size={22} color={color} />;
    case 'check':
      return <CheckCircleIcon size={22} color={color} />;
    default:
      return <DocumentIcon size={22} color={color} />;
  }
}

// Documents the driver should always see in the list, even if they were not
// captured during onboarding (older accounts may be missing RC/Insurance —
// this screen is where we prompt them to add it).
const STANDARD_TYPES: DocumentType[] = [
  'licence',
  'vehicle',
  'insurance',
  // Aadhaar is captured as two files. The old single 'aadhaar' entry always
  // showed "not uploaded" (drivers only ever upload front + back), so it was
  // a permanent phantom missing-doc — replaced with the two real ones.
  'aadhaar-front',
  'aadhaar-back',
  'profile-photo',
];

const fmtDate = (iso?: string): string | undefined => {
  if (!iso) return undefined;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return undefined;
  return d.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

function StatusBadge({ status }: { status: UiStatus }) {
  if (status === 'verified') {
    return (
      <View className="flex-row items-center self-start rounded-full bg-[#E8F8F4] px-3 py-1">
        <CheckIcon size={12} color="#00C896" />
        <Text className="ml-1 text-xs font-poppins-medium text-[#00C896]">Verified</Text>
      </View>
    );
  }
  if (status === 'rejected') {
    return (
      <View className="flex-row items-center self-start rounded-full bg-[#FEE2E2] px-3 py-1">
        <Text className="text-xs font-poppins-medium text-[#B91C1C]">Rejected — re-upload</Text>
      </View>
    );
  }
  if (status === 'missing') {
    return (
      <View className="flex-row items-center self-start rounded-full bg-[#F3F4F6] px-3 py-1">
        <Text className="text-xs font-poppins-medium text-[#6A7282]">Not uploaded</Text>
      </View>
    );
  }
  if (status === 'change-requested') {
    return (
      <View className="flex-row items-center self-start rounded-full bg-[#E0F2FE] px-3 py-1">
        <HourglassIcon size={12} color="#0369A1" />
        <Text className="ml-1 text-xs font-poppins-medium text-[#0369A1]">
          Change Requested
        </Text>
      </View>
    );
  }
  return (
    <View className="flex-row items-center self-start rounded-full bg-[#FFF3E0] px-3 py-1">
      <HourglassIcon size={12} color="#FFA726" />
      <Text className="ml-1 text-xs font-poppins-medium text-[#FFA726]">Under Review</Text>
    </View>
  );
}

function DocumentCard({
  item,
  uploading,
  onView,
  onUpload,
  onRequestChange,
}: {
  item: DocumentItem;
  uploading: boolean;
  onView?: () => void;
  onUpload?: () => void;
  onRequestChange?: () => void;
}) {
  const canView = !!item.url;
  // If the doc isn't uploaded yet (missing or rejected), show a direct
  // Upload action instead of "Request Change" — admin doesn't need a ticket
  // for a doc that doesn't exist; the driver just needs to send it in.
  const showUploadAction = item.status === 'missing' || item.status === 'rejected';
  const showRequestChange =
    !showUploadAction && !item.hasOpenChangeRequest && item.url;

  return (
    <View
      className="rounded-2xl bg-white p-4"
      style={{
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
        elevation: 2,
      }}
    >
      <View className="flex-row items-start gap-3">
        <View className="h-12 w-12 items-center justify-center rounded-xl bg-[#0097B3]/10">
          <DocTypeIcon kind={item.icon} />
        </View>
        <View className="flex-1">
          <Text className="text-base font-poppins-semibold text-[#101828]">{item.title}</Text>
          <View className="mt-1">
            <StatusBadge status={item.status} />
          </View>
          {item.status === 'rejected' && !!item.rejectionReason && (
            <View className="mt-2 rounded-lg bg-[#FEF2F2] px-3 py-2">
              <Text className="text-[12px] font-poppins-medium text-[#B91C1C]">
                Reason: {item.rejectionReason}
              </Text>
            </View>
          )}
        </View>
      </View>

      {(item.expiryDate || item.uploadedDate) && (
        <View className="mt-3 gap-2">
          {item.expiryDate && (
            <View className="flex-row items-center justify-between">
              <Text className="text-[13px] text-[#4A5565]">Expiry Date:</Text>
              <Text className="text-[13px] font-poppins-medium text-[#101828]">{item.expiryDate}</Text>
            </View>
          )}
          {item.uploadedDate && (
            <View className="flex-row items-center justify-between">
              <Text className="text-[13px] text-[#4A5565]">Uploaded:</Text>
              <Text className="text-[13px] font-poppins-medium text-[#101828]">{item.uploadedDate}</Text>
            </View>
          )}
        </View>
      )}

      <View className="mt-3 flex-row gap-2">
        <Pressable
          disabled={!canView}
          onPress={onView}
          className={`flex-1 flex-row items-center justify-center gap-2 rounded-xl py-4 ${
            canView ? 'bg-[#0097B3]/10' : 'bg-[#F3F4F6]'
          }`}
        >
          <EyeIcon size={14} color={canView ? '#0097B3' : '#99A1AF'} />
          <Text
            className={`text-sm font-poppins-medium ${
              canView ? 'text-[#0097B3]' : 'text-[#99A1AF]'
            }`}
          >
            View Document
          </Text>
        </Pressable>

        {showUploadAction && (
          <Pressable
            disabled={uploading}
            onPress={onUpload}
            className="flex-1 flex-row items-center justify-center gap-2 rounded-xl border border-[#0097B3] py-4"
          >
            {uploading ? (
              <ActivityIndicator size="small" color="#0097B3" />
            ) : (
              <>
                <EditPencilIcon size={14} color="#0097B3" />
                <Text className="text-sm font-poppins-medium text-[#0097B3]">
                  {item.status === 'rejected' ? 'Re-upload' : 'Upload'}
                </Text>
              </>
            )}
          </Pressable>
        )}

        {showRequestChange && (
          <Pressable
            onPress={onRequestChange}
            className="flex-1 flex-row items-center justify-center gap-2 rounded-xl border border-[#0097B3] py-4"
          >
            <EditPencilIcon size={14} color="#0097B3" />
            <Text className="text-sm font-poppins-medium text-[#0097B3]">
              Request Change
            </Text>
          </Pressable>
        )}

        {item.hasOpenChangeRequest && !showUploadAction && (
          <View className="flex-1 items-center justify-center rounded-xl border border-[#0097B3]/30 py-4">
            <Text className="text-xs font-poppins-medium text-[#0097B3]">
              Awaiting admin
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}

export function DocumentsScreen({ onBack }: DocumentsScreenProps) {
  const [docs, setDocs] = useState<DocumentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [uploadingType, setUploadingType] = useState<DocumentType | null>(null);
  const [previewFor, setPreviewFor] = useState<DocumentItem | null>(null);
  const [requestFor, setRequestFor] = useState<DocumentItem | null>(null);

  /**
   * Build the merged list of doc items from (a) docs the driver has uploaded
   * and (b) any open doc-update support tickets — each ticket carries
   * `metadata.docType` so we can pin a "change requested" pill on the right
   * card. Tickets in resolved/closed states no longer count.
   */
  const buildDocItems = (
    raw: DriverDocument[],
    tickets: MySupportTicket[],
  ): DocumentItem[] => {
    const byType = new Map(raw.map(d => [d.type, d]));
    const openRequestTypes = new Set(
      tickets
        .filter(t => t.status !== 'resolved' && t.status !== 'closed')
        .filter(t => (t.tags ?? []).includes('doc-update'))
        .map(t => t.metadata?.docType)
        .filter((t): t is string => !!t),
    );

    const items: DocumentItem[] = [];

    // Standard set first, in fixed order. Missing docs are surfaced so the
    // driver knows what's still owed.
    for (const t of STANDARD_TYPES) {
      const display = DOC_DISPLAY[t] ?? { title: t, icon: 'document' };
      const found = byType.get(t);
      const hasOpenChangeRequest = openRequestTypes.has(t);
      const baseStatus: UiStatus = found
        ? found.status === 'verified'
          ? 'verified'
          : found.status === 'rejected'
            ? 'rejected'
            : 'under-review'
        : 'missing';
      items.push({
        type: t,
        title: display.title,
        icon: display.icon,
        // Show "change requested" only for docs that exist — for missing /
        // rejected ones the user should just upload instead.
        status:
          hasOpenChangeRequest && (baseStatus === 'verified' || baseStatus === 'under-review')
            ? 'change-requested'
            : baseStatus,
        url: found?.url,
        expiryDate: fmtDate(found?.expiry),
        uploadedDate: undefined,
        rejectionReason: found?.rejectionReason,
        hasOpenChangeRequest,
      });
      byType.delete(t);
    }

    // Anything else the driver has uploaded (PAN, DBS, etc.).
    for (const [type, d] of byType) {
      const display = DOC_DISPLAY[type] ?? { title: type, icon: 'document' };
      const hasOpenChangeRequest = openRequestTypes.has(type);
      const baseStatus: UiStatus =
        d.status === 'verified'
          ? 'verified'
          : d.status === 'rejected'
            ? 'rejected'
            : 'under-review';
      items.push({
        type: type as DocumentType,
        title: display.title,
        icon: display.icon,
        status:
          hasOpenChangeRequest && (baseStatus === 'verified' || baseStatus === 'under-review')
            ? 'change-requested'
            : baseStatus,
        url: d.url,
        expiryDate: fmtDate(d.expiry),
        uploadedDate: undefined,
        hasOpenChangeRequest,
      });
    }

    return items;
  };

  const load = useCallback(async () => {
    try {
      const [u, tickets] = await Promise.all([
        fetchCurrentUser(),
        // Tickets is best-effort; failure shouldn't break the screen.
        listMySupportTickets().catch(err => {
          console.warn('[documents] tickets fetch failed:', err);
          return [] as MySupportTicket[];
        }),
      ]);
      setDocs(buildDocItems(u?.driverProfile?.documents ?? [], tickets));
    } catch (err) {
      console.warn('[documents] fetch failed:', err);
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

  const handleUpload = async (item: DocumentItem) => {
    try {
      const asset = await pickImageFromSource(`Upload ${item.title}`, {
        cameraType: item.type === 'profile-photo' ? 'front' : 'back',
      });
      if (!asset?.uri) return;

      setUploadingType(item.type);
      await uploadDocument(
        { uri: asset.uri, fileName: asset.fileName, type: asset.type },
        item.type,
      );
      await load();
      Alert.alert(
        'Uploaded',
        `${item.title} sent for review. We'll notify you once it's verified.`,
      );
    } catch (err: any) {
      console.warn('[documents] upload failed:', err);
      Alert.alert('Upload failed', err?.message ?? 'Try again.');
    } finally {
      setUploadingType(null);
    }
  };

  const handleSubmitRequest = async (input: {
    reason: string;
    newFileUrl?: string;
  }) => {
    if (!requestFor) return;
    await requestDocumentChange({
      docType: requestFor.type,
      docTitle: requestFor.title,
      reason: input.reason,
      newFileUrl: input.newFileUrl,
    });
    setRequestFor(null);
    await load();
    Alert.alert(
      'Request submitted',
      'Your update request has been sent for admin review. You will be notified once it is processed.',
    );
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
          <View className="flex-row items-center gap-4 px-6 pb-4 pt-2">
            <Pressable onPress={onBack} hitSlop={10}>
              <BackArrowIcon size={22} color="white" />
            </Pressable>
            <Text className="text-[20px] font-poppins-semibold text-white">Documents</Text>
          </View>
        </SafeAreaView>
      </LinearGradient>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View className="mb-4 flex-row items-start gap-3 rounded-2xl border border-[#0097B3]/20 bg-[#E3F2FD] p-4">
          <InfoCircleIcon size={20} color="#0097B3" />
          <Text className="flex-1 text-xs leading-[19px] text-[#364153]">
            Your documents are verified by the UKCAAR admin team. You can
            request a change if any document is outdated or incorrect.
          </Text>
        </View>

        {loading && docs.length === 0 ? (
          <View className="py-20 items-center">
            <ActivityIndicator color="#0097B3" />
          </View>
        ) : docs.length === 0 ? (
          <View className="py-12 items-center">
            <Text className="text-sm text-[#6A7282]">No documents yet.</Text>
          </View>
        ) : (
          <View className="gap-3">
            {docs.map(item => (
              <DocumentCard
                key={item.type}
                item={item}
                uploading={uploadingType === item.type}
                onView={item.url ? () => setPreviewFor(item) : undefined}
                onUpload={() => handleUpload(item)}
                onRequestChange={() => setRequestFor(item)}
              />
            ))}
          </View>
        )}
      </ScrollView>

      <DocumentPreviewModal
        visible={previewFor !== null}
        title={previewFor?.title}
        expiryDate={previewFor?.expiryDate}
        uploadDate={previewFor?.uploadedDate}
        // Modal only knows verified | under-review; map other states to
        // under-review for the badge. Real preview is gated on `url` so
        // missing docs never reach this modal anyway.
        status={
          previewFor?.status === 'verified' ? 'verified' : 'under-review'
        }
        onClose={() => setPreviewFor(null)}
      />

      <RequestDocumentChangeModal
        visible={requestFor !== null}
        docType={requestFor?.type ?? null}
        docTitle={requestFor?.title ?? null}
        onClose={() => setRequestFor(null)}
        onSubmit={handleSubmitRequest}
      />
    </View>
  );
}

export default DocumentsScreen;
