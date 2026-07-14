import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
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
  ChevronDownIcon,
} from '../components/icons/ServiceTypeIcons';
import { createSupportTicket, fetchFaqs } from '../services/api';

interface HelpSupportScreenProps {
  faqs?: { question: string; answer: string }[];
  subjects?: { label: string; category: string }[];
  onBack?: () => void;
}

// FAQ content lives client-side for now — short list, doesn't change often.
// Move to a backend `/support/faqs` endpoint when product wants admin-managed.
const DEFAULT_FAQS: { question: string; answer: string }[] = [
  {
    question: 'How long does it take for my account to be approved?',
    answer:
      'Most applications are reviewed within 24 hours. You will get a push notification when approved or if any document needs to be re-uploaded.',
  },
  {
    question: 'Can I reject a ride request? Will it affect my rating?',
    answer:
      "You can reject a request without affecting your rating. Repeatedly rejecting may lower your acceptance rate, which is shown to admins but doesn't directly affect star ratings.",
  },
  {
    question: 'How do I update my bank details?',
    answer:
      'Go to Profile → Bank Details → Request Bank Details Update. Admin will review and approve the change.',
  },
  {
    question: "What should I do if the passenger doesn't show up?",
    answer:
      'Wait at the pickup location for 5 minutes, try contacting the passenger via the in-app call. If they still don\'t arrive, you can cancel the ride from the active-ride screen.',
  },
];

// Subject options shown in the dropdown. Each maps to the backend's
// TicketCategory enum so the ticket gets routed to the right queue.
const DEFAULT_SUBJECTS: { label: string; category: string }[] = [
  { label: 'Account & Verification', category: 'account' },
  { label: 'Payments & Payouts', category: 'payment' },
  { label: 'Ride Issues', category: 'ride_issue' },
  { label: 'App Technical Issue', category: 'app_bug' },
  { label: 'Other', category: 'other' },
];

function FaqRow({
  question,
  answer,
  expanded,
  onToggle,
}: {
  question: string;
  answer: string;
  expanded: boolean;
  onToggle: () => void;
}) {
  return (
    <Pressable
      onPress={onToggle}
      className="rounded-md border border-[#0097B3] bg-white p-3"
    >
      <View className="flex-row items-center gap-3">
        <Text className="flex-1 text-[14px] leading-5 text-black">
          {question}
        </Text>
        <View style={{ transform: [{ rotate: expanded ? '180deg' : '0deg' }] }}>
          <ChevronDownIcon size={16} color="#0097B3" />
        </View>
      </View>
      {expanded && (
        <Text className="mt-2 text-[13px] leading-5 text-[#6A7282]">
          {answer}
        </Text>
      )}
    </Pressable>
  );
}

export function HelpSupportScreen({
  faqs: faqsProp,
  subjects = DEFAULT_SUBJECTS,
  onBack,
}: HelpSupportScreenProps) {
  // Live admin-managed FAQs, falling back to the bundled list if the caller
  // supplied none and the request fails or returns nothing.
  const [faqs, setFaqs] = useState(faqsProp ?? DEFAULT_FAQS);

  useEffect(() => {
    if (faqsProp) return; // caller passed an explicit list — respect it
    let cancelled = false;
    fetchFaqs()
      .then((items) => {
        if (cancelled || !items.length) return;
        setFaqs(items.map((f) => ({ question: f.question, answer: f.answer })));
      })
      .catch(() => {
        /* keep bundled fallback */
      });
    return () => {
      cancelled = true;
    };
  }, [faqsProp]);

  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  const [subjectOpen, setSubjectOpen] = useState(false);
  const [subjectIdx, setSubjectIdx] = useState<number | null>(null);
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const subjectLabel =
    subjectIdx !== null ? subjects[subjectIdx]?.label ?? '' : '';
  const canSubmit = !!subjectLabel && message.trim().length > 0 && !submitting;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    const sel = subjects[subjectIdx!];
    setSubmitting(true);
    try {
      await createSupportTicket({
        subject: sel.label,
        description: message.trim(),
        category: sel.category,
      });
      Alert.alert(
        'Ticket submitted',
        'Our support team will get back to you shortly.',
      );
      setMessage('');
      setSubjectIdx(null);
    } catch (err: any) {
      Alert.alert(
        'Could not submit',
        err?.message ?? 'Please try again in a moment.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View className="flex-1 bg-white">
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      <LinearGradient
        colors={['#0097B3', '#00C896']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
      >
        <SafeAreaView edges={['top']}>
          <View className="flex-row items-center gap-3 px-4 pb-6 pt-2">
            <Pressable onPress={onBack} hitSlop={10} className="flex-row items-center gap-1">
              <BackArrowIcon size={20} color="white" />
              <Text className="text-[16px] text-white">Back</Text>
            </Pressable>
            <Text className="flex-1 text-center text-[18px] font-poppins-medium text-white">
              Help & Support
            </Text>
            <View className="w-16" />
          </View>
        </SafeAreaView>
      </LinearGradient>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 16, paddingBottom: 32, gap: 16 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View className="gap-1">
          <Text className="text-[16px] text-[#3F3F3F]">Read FAQ's</Text>
          <View className="gap-2 rounded-[10px] bg-[#FDFDFD] p-2">
            {faqs.map((f, i) => (
              <FaqRow
                key={i}
                question={f.question}
                answer={f.answer}
                expanded={expandedIndex === i}
                onToggle={() =>
                  setExpandedIndex(expandedIndex === i ? null : i)
                }
              />
            ))}
          </View>
        </View>

        <View className="gap-1">
          <Text className="text-[16px] text-[#3F3F3F]">Raise Ticket</Text>
          <View className="gap-2 rounded-[10px] border border-[#0097B3] bg-white p-2">
            <Pressable
              onPress={() => setSubjectOpen(v => !v)}
              className="rounded-md border border-[#E8E8E8] bg-white p-3"
            >
              <View className="flex-row items-center gap-3">
                <Text
                  className="flex-1 text-[14px]"
                  style={{ color: subjectLabel ? '#132235' : '#000080' }}
                >
                  {subjectLabel || 'Subject'}
                </Text>
                <View
                  style={{
                    transform: [{ rotate: subjectOpen ? '180deg' : '0deg' }],
                  }}
                >
                  <ChevronDownIcon size={16} color="#000080" />
                </View>
              </View>
            </Pressable>

            {subjectOpen && (
              <View className="rounded-md border border-[#E8E8E8] bg-white">
                {subjects.map((s, i) => (
                  <Pressable
                    key={s.category}
                    onPress={() => {
                      setSubjectIdx(i);
                      setSubjectOpen(false);
                    }}
                    className={`p-3 ${i !== subjects.length - 1 ? 'border-b border-[#F1F5F9]' : ''}`}
                  >
                    <Text className="text-[14px] text-[#132235]">{s.label}</Text>
                  </Pressable>
                ))}
              </View>
            )}

            <View className="h-40 rounded-2xl bg-[#F3FAFF] p-3">
              <TextInput
                value={message}
                onChangeText={setMessage}
                placeholder="Describe your issue..."
                placeholderTextColor="#99A1AF"
                multiline
                textAlignVertical="top"
                className="flex-1 text-[14px] text-[#132235]"
              />
            </View>
          </View>
        </View>
      </ScrollView>

      <SafeAreaView edges={['bottom']} className="bg-white px-4 pb-4">
        <Pressable
          onPress={handleSubmit}
          disabled={!canSubmit}
          className={`h-14 items-center justify-center rounded-2xl ${
            canSubmit ? 'bg-[#0097B3]' : 'bg-[#0097B3]/50'
          }`}
        >
          {submitting ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text className="text-[17px] font-poppins-bold text-white">Submit</Text>
          )}
        </Pressable>
      </SafeAreaView>
      </KeyboardAvoidingView>
    </View>
  );
}

export default HelpSupportScreen;
