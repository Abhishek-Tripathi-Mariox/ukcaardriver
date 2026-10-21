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
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
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
  const insets = useSafeAreaInsets();

  const [plans, setPlans] = useState<OnePassPlan[]>([]);
  const [status, setStatus] = useState<OnePassStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [buying, setBuying] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [pendingVerification, setPendingVerification] = useState<{ razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string } | null>(null);

  const load = async () => {
    setLoadError(null);
    try {
      const [p, s] = await Promise.all([fetchOnePassPlans(), fetchOnePassStatus()]);
      setStatus(s);
      if (!['instant', 'private', 'scheduled'].includes(s.category ?? '')) {
        setPlans([]);
        setLoadError('Your service category could not be verified. Refresh or contact support before purchasing.');
        return;
      }
      setPlans(p);
    } catch {
      setLoadError('Could not load OnePass. Please retry before purchasing.');
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
    if (buying || pendingVerification) return;
    setBuying(plan.key);
    let createdOrderId: string | null = null;
    let capturedPayment = false;
    try {
      let currentUser = user;
      if (!currentUser) currentUser = await hydrateUser();

      // 1. Create a Razorpay order on the backend (price is server-side).
      const order = await createOnePassOrder(plan.key, { category: plan.category, price: plan.price, days: plan.days, commissionPct: plan.commissionPct });
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
      capturedPayment = true;
      const verification = { razorpay_order_id: order.orderId, razorpay_payment_id: paymentData.razorpay_payment_id, razorpay_signature: paymentData.razorpay_signature };
      setPendingVerification(verification);

      // 3. Verify server-side — backend activates OnePass on success.
      await verifyOnePassPayment({
        razorpay_order_id: order.orderId,
        razorpay_payment_id: paymentData.razorpay_payment_id,
        razorpay_signature: paymentData.razorpay_signature,
      });
      setPendingVerification(null);

      await load();
      Alert.alert('OnePass purchased', `Your ${plan.category} ${plan.label} pass has been added. Existing validity is kept; renewal starts after it ends.`, [
        { text: 'OK', onPress: () => onBack?.() },
      ]);
    } catch (err: any) {
      const code = err?.code;
      const desc = (err?.description || err?.message || '').toLowerCase();
      const isCancel =
        code === 0 || code === '0' || code === 2 || code === '2' ||
        desc.includes('cancel') || desc.includes('dismiss') ||
        (!err?.description && !err?.message);
      // Once checkout returns a payment, retry verification without buying again.
      if (capturedPayment) {
        Alert.alert('Verification pending', 'Payment checkout completed. Retry verification here instead of buying another pass.');
        return;
      }
      if (createdOrderId) cancelRechargeOrder(createdOrderId);
      if (isCancel) {
        Alert.alert('Checkout closed', 'Refresh your OnePass status before trying again.');
      } else {
        if (err?.status === 409) await load();
        Alert.alert('Purchase failed', err?.description || err?.message || 'Please try again.');
      }
    } finally {
      setBuying(null);
    }
  };

  const expiryLabel =
    status?.isActive && status.expiresAt
      ? new Date(status.expiresAt).toLocaleDateString('en-IN', {
          day: 'numeric', month: 'short', year: 'numeric',
          timeZone: 'Asia/Kolkata',
        })
      : null;
  const applicablePlans = plans.filter(plan => !!status?.category && plan.category === status.category);
  const retryVerification = async () => {
    if (!pendingVerification || buying) return;
    setBuying('verification');
    try { await verifyOnePassPayment(pendingVerification); setPendingVerification(null); await load(); Alert.alert('Payment verified', 'Your purchased pass has been added.'); }
    catch { Alert.alert('Verification pending', 'Please retry verification. Do not purchase another pass for this payment.'); }
    finally { setBuying(null); }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      <View style={styles.header}>
        <Pressable onPress={onBack} hitSlop={10} style={styles.backBtn}>
          <BackArrowIcon size={22} color="#1B1D21" />
        </Pressable>
        <Text
          style={styles.headerTitle}
          numberOfLines={1}
          ellipsizeMode="tail"
          maxFontSizeMultiplier={1.3}
        >
          UKCAAR OnePass
        </Text>
        <View style={{ width: 32 }} />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={PRIMARY} />
        </View>
      ) : (
        <ScrollView
          // Edge-to-edge (SDK 36): last Buy button must clear the nav bar.
          contentContainerStyle={[styles.content, { paddingBottom: 16 + insets.bottom }]}
        >
          {/* Status banner */}
          <View style={[styles.statusCard, status?.isActive ? styles.statusActive : styles.statusInactive]}>
            <Text style={styles.statusTitle}>
              {status?.category ? `${status.category[0].toUpperCase()}${status.category.slice(1)} OnePass` : 'OnePass'} · {status?.isActive ? 'Active' : 'Inactive'}
            </Text>
            <Text style={styles.statusSub}>
              {status?.isActive && expiryLabel
                ? status.commissionPct == null ? `Your existing pass is valid until ${expiryLabel}. Refresh to verify its service category.` : `Current benefit: ${status.commissionPct}% commission, valid until ${expiryLabel}. Renewals keep their purchased terms and start after existing validity.`
                : 'Subscribe for the commission benefit configured for your service.'}
            </Text>
          </View>
          <Pressable accessibilityRole="button" disabled={!!buying} onPress={load}><Text style={styles.statusSub}>Refresh OnePass status</Text></Pressable>
          {loadError && <Pressable accessibilityRole="button" onPress={load}><Text style={styles.empty}>{loadError}</Text></Pressable>}
          {pendingVerification && <Pressable accessibilityRole="button" disabled={!!buying} onPress={retryVerification}><Text style={styles.empty}>Payment verification pending. Tap to retry verification.</Text></Pressable>}
          {status?.legacy && <Text style={styles.statusSub}>Your existing pass keeps its current benefits until expiry. New purchases cover only their named service category.</Text>}
          {(status?.memberships ?? []).map((period, index) => <View key={`${period.category}_${period.startsAt}_${index}`} style={styles.statusCard}>
            <Text style={styles.planLabel}>{period.category} · {period.label}</Text>
            <Text style={styles.planMeta}>{new Date(period.startsAt) > new Date() ? 'Starts' : 'Started'} {new Date(period.startsAt).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' })} · Expires {new Date(period.expiresAt).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' })} · {Math.round(period.commissionRate * 10000) / 100}% commission</Text>
          </View>)}

          <Text style={styles.sectionTitle}>Plans for your {status?.category ?? 'registered'} service</Text>
          <Text style={styles.statusSub}>A pass stays with its purchased category when you change service. Other categories need their own pass.</Text>
          <Text style={styles.statusSub}>Commission benefits apply to rides settled during your pass’s validity.</Text>
          {applicablePlans.length === 0 ? (
            <Text style={styles.empty}>No plans available right now.</Text>
          ) : (
            applicablePlans.map((plan) => (
              <View key={plan.key} style={styles.planCard}>
                <View style={styles.planInfo}>
                  <Text
                    style={styles.planLabel}
                    numberOfLines={2}
                    ellipsizeMode="tail"
                    maxFontSizeMultiplier={1.3}
                  >
                    {plan.label}
                  </Text>
                  <Text
                    style={styles.planMeta}
                    numberOfLines={1}
                    ellipsizeMode="tail"
                    maxFontSizeMultiplier={1.3}
                  >
                    {plan.days} {plan.days === 1 ? 'day' : 'days'} · {plan.currency} {plan.price.toFixed(2)}
                  </Text>
                  <Text style={styles.planMeta}>{plan.category} · {plan.commissionPct}% commission</Text>
                </View>
                <Pressable
                  style={[styles.buyBtn, buying === plan.key && styles.buyBtnDisabled]}
                  onPress={() => purchase(plan)}
                  disabled={!!buying || !!loadError || !!pendingVerification}
                >
                  {buying === plan.key ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text
                      style={styles.buyText}
                      numberOfLines={1}
                      maxFontSizeMultiplier={1.2}
                    >
                      Buy ₹{plan.price.toFixed(0)}
                    </Text>
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
  headerTitle: {
    fontSize: 18, fontWeight: '700', color: '#1B1D21',
    flex: 1, textAlign: 'center', marginHorizontal: 8,
  },
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
    padding: 16, marginBottom: 12, gap: 12,
  },
  // Text column: grows into the free space AND is allowed to shrink (minWidth: 0)
  // so a long admin-configured plan label can never push the amount off the card.
  planInfo: { flex: 1, minWidth: 0, flexShrink: 1 },
  planLabel: { fontSize: 16, fontWeight: '600', color: '#1B1D21' },
  planMeta: { fontSize: 13, color: '#7D8A95', marginTop: 4 },
  buyBtn: {
    backgroundColor: PRIMARY, borderRadius: 10,
    paddingHorizontal: 16, paddingVertical: 11,
    // Amount never shrinks or truncates; capped so a large price can't starve the label.
    flexShrink: 0, minWidth: 96, maxWidth: '46%', minHeight: 44,
    alignItems: 'center', justifyContent: 'center',
  },
  buyBtnDisabled: { opacity: 0.6 },
  buyText: { color: '#fff', fontSize: 14, fontFamily: 'Poppins-Medium' },
});
