import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import RazorpayCheckout from 'react-native-razorpay';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BackArrowIcon } from '../components/icons/ServiceTypeIcons';
import {
  createOnePassOrder,
  cancelRechargeOrder,
  fetchOnePassPlans,
  fetchOnePassStatus,
  verifyOnePassPayment,
  type OnePassPlan,
  type OnePassStatus,
} from '../services/api';
import { useUserStore } from '../store';

interface OnePassScreenProps {
  onBack?: () => void;
}

const PRIMARY = '#0097B3';

export function OnePassScreen({ onBack }: OnePassScreenProps) {
  const user = useUserStore(s => s.user);
  const hydrateUser = useUserStore(s => s.hydrate);

  const [plans, setPlans] = useState<OnePassPlan[]>([]);
  const [status, setStatus] = useState<OnePassStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [buying, setBuying] = useState<string | null>(null);

  const load = async () => {
    try {
      const [p, s] = await Promise.all([fetchOnePassPlans(), fetchOnePassStatus()]);
      setPlans(p);
      setStatus(s);
    } catch {
      // empty/error states handle it
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    if (!user) hydrateUser();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const purchase = async (plan: OnePassPlan) => {
    if (buying) return;
    setBuying(plan.key);
    let createdOrderId: string | null = null;
    try {
      let currentUser = user;
      if (!currentUser) currentUser = await hydrateUser();

      // 1. Create a Razorpay order on the backend (price is server-side).
      const order = await createOnePassOrder(plan.key);
      createdOrderId = order.orderId;

      const fullName = currentUser
        ? `${currentUser.firstName ?? ''} ${currentUser.lastName ?? ''}`.trim()
        : '';

      // 2. Open the native Razorpay sheet (same flow as wallet recharge).
      const options = {
        description: `UKCAAR OnePass — ${plan.label}`,
        currency: order.currency,
        key: order.keyId,
        amount: String(order.amount),
        name: 'UKCAAR',
        order_id: order.orderId,
        prefill: {
          name: fullName,
          contact: currentUser?.phone || '',
          email: currentUser?.email || '',
        },
        theme: { color: PRIMARY },
      };
      const paymentData = await RazorpayCheckout.open(options);

      // 3. Verify server-side — backend activates OnePass on success.
      await verifyOnePassPayment({
        razorpay_order_id: order.orderId,
        razorpay_payment_id: paymentData.razorpay_payment_id,
        razorpay_signature: paymentData.razorpay_signature,
      });

      await load();
      Alert.alert('OnePass activated', `Your ${plan.label} OnePass is now active.`, [
        { text: 'OK', onPress: () => onBack?.() },
      ]);
    } catch (err: any) {
      const code = err?.code;
      const desc = (err?.description || err?.message || '').toLowerCase();
      const isCancel =
        code === 0 || code === '0' || code === 2 || code === '2' ||
        desc.includes('cancel') || desc.includes('dismiss') ||
        (!err?.description && !err?.message);
      if (createdOrderId) cancelRechargeOrder(createdOrderId);
      if (isCancel) {
        Alert.alert('Payment cancelled', 'You closed the payment sheet. No money was charged.');
      } else {
        Alert.alert('Purchase failed', err?.description || err?.message || 'Please try again.');
      }
    } finally {
      setBuying(null);
    }
  };

  const expiryLabel =
    status?.isActive && status.expiresAt
      ? new Date(status.expiresAt).toLocaleDateString(undefined, {
          day: 'numeric', month: 'short', year: 'numeric',
        })
      : null;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <View style={styles.header}>
        <Pressable onPress={onBack} hitSlop={10} style={styles.backBtn}>
          <BackArrowIcon size={22} color="#1B1D21" />
        </Pressable>
        <Text style={styles.headerTitle}>UKCAAR OnePass</Text>
        <View style={{ width: 32 }} />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={PRIMARY} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          {/* Status banner */}
          <View style={[styles.statusCard, status?.isActive ? styles.statusActive : styles.statusInactive]}>
            <Text style={styles.statusTitle}>
              {status?.isActive ? '✅ OnePass Active' : 'OnePass Inactive'}
            </Text>
            <Text style={styles.statusSub}>
              {status?.isActive && expiryLabel
                ? `Valid until ${expiryLabel}. Buying again extends from this date.`
                : 'Subscribe to keep a lower commission on your rides.'}
            </Text>
          </View>

          <Text style={styles.sectionTitle}>Choose a plan</Text>
          {plans.length === 0 ? (
            <Text style={styles.empty}>No plans available right now.</Text>
          ) : (
            plans.map((plan) => (
              <View key={plan.key} style={styles.planCard}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.planLabel}>{plan.label}</Text>
                  <Text style={styles.planMeta}>
                    {plan.days} days · {plan.currency} {plan.price.toFixed(2)}
                  </Text>
                </View>
                <Pressable
                  style={[styles.buyBtn, buying === plan.key && styles.buyBtnDisabled]}
                  onPress={() => purchase(plan)}
                  disabled={!!buying}
                >
                  {buying === plan.key ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text style={styles.buyText}>Buy ₹{plan.price.toFixed(0)}</Text>
                  )}
                </Pressable>
              </View>
            ))
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
  },
  backBtn: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#1B1D21' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { padding: 16 },

  statusCard: { borderRadius: 14, padding: 16, marginBottom: 20 },
  statusActive: { backgroundColor: '#E8F5E9' },
  statusInactive: { backgroundColor: '#F2F4F5' },
  statusTitle: { fontSize: 16, fontWeight: '700', color: '#1B1D21' },
  statusSub: { fontSize: 13, color: '#5B6770', marginTop: 6, lineHeight: 19 },

  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#1B1D21', marginBottom: 12 },
  empty: { fontSize: 14, color: '#9AA5AD', paddingVertical: 12 },

  planCard: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1, borderColor: '#EEE', borderRadius: 14,
    padding: 16, marginBottom: 12,
  },
  planLabel: { fontSize: 16, fontWeight: '600', color: '#1B1D21' },
  planMeta: { fontSize: 13, color: '#7D8A95', marginTop: 4 },
  buyBtn: {
    backgroundColor: PRIMARY, borderRadius: 10,
    paddingHorizontal: 18, paddingVertical: 11, minWidth: 96, alignItems: 'center',
  },
  buyBtnDisabled: { opacity: 0.6 },
  buyText: { color: '#fff', fontSize: 14, fontWeight: '700' },
});
