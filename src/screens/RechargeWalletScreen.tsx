import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StatusBar,
  Text,
  TextInput,
  View,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import RazorpayCheckout from 'react-native-razorpay';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BackArrowIcon } from '../components/icons/ServiceTypeIcons';
import {
  cancelRechargeOrder,
  createRechargeOrder,
  fetchWallet,
  verifyRechargePayment,
} from '../services/api';
import { useUserStore } from '../store';

interface RechargeWalletScreenProps {
  onBack?: () => void;
  /** Called once the recharge has completed AND the wallet balance has been
   *  refreshed, so the parent can navigate back to the wallet screen and
   *  show the updated balance immediately. */
  onLaunched?: () => void;
}

const QUICK_AMOUNTS = [250, 500, 750, 1000];

const fmtRupees = (n: number): string => {
  try {
    return `₹${new Intl.NumberFormat('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(n)}`;
  } catch {
    return `₹${n.toFixed(2)}`;
  }
};

export function RechargeWalletScreen({
  onBack,
  onLaunched,
}: RechargeWalletScreenProps) {
  const [balance, setBalance] = useState<number | null>(null);
  const [amountText, setAmountText] = useState<string>('500');
  const [submitting, setSubmitting] = useState(false);

  // Pull the logged-in driver from the global store. App.tsx hydrates
  // this on first dashboard mount so it should already be populated by
  // the time we get here. If not, hydrate() inside onRechargeNow handles
  // the fallback fetch.
  const user = useUserStore(s => s.user);
  const hydrateUser = useUserStore(s => s.hydrate);

  useEffect(() => {
    let cancelled = false;
    // Wallet balance is screen-specific so we fetch it here. The user
    // profile lives in the global store and is hydrated from App.tsx.
    fetchWallet()
      .then(res => {
        if (!cancelled) setBalance(res.wallet.balance);
      })
      .catch(() => {
        // silently fall back to '—' — user can still recharge.
      });
    // Defensive: kick off a hydrate in case App.tsx hasn't yet (e.g. a
    // direct deep-link to this screen). hydrate() is idempotent.
    if (!user) hydrateUser();
    return () => {
      cancelled = true;
    };
  }, [user, hydrateUser]);

  const numericAmount = Math.floor(Number(amountText)) || 0;
  const valid = numericAmount >= 1;

  const onRechargeNow = async () => {
    if (!valid || submitting) return;
    setSubmitting(true);
    console.log('[recharge] starting flow, amount=', numericAmount);
    console.log('[recharge] RazorpayCheckout module:', typeof RazorpayCheckout, RazorpayCheckout);

    // Hydrate the global store if it wasn't ready (e.g. user navigated
    // here straight from a deep-link before App.tsx had a chance).
    let currentUser = user;
    if (!currentUser) {
      console.log('[recharge] user not in store, hydrating...');
      currentUser = await hydrateUser();
    }
    console.log('[recharge] user for prefill:', {
      firstName: currentUser?.firstName,
      phone: currentUser?.phone,
      countryCode: currentUser?.countryCode,
      email: currentUser?.email,
    });
    // Captured here so the catch block can mark the order as failed if the
    // user dismisses the Razorpay sheet (otherwise it sits as 'pending'
    // forever in the wallet statement).
    let createdOrderId: string | null = null;
    try {
      // 1. Create a Razorpay order on the backend (returns orderId + keyId).
      const order = await createRechargeOrder(numericAmount);
      createdOrderId = order.orderId;
      console.log('[recharge] order created:', order.orderId, 'amount(paise)=', order.amount);

      // 2. Open the native Razorpay sheet (in-app, no browser jump). The
      //    customer app uses this exact flow — see WalletTopUpScreen.tsx.
      //    The SDK resolves with razorpay_payment_id + signature, or
      //    rejects with err.code=2 if the user cancelled.
      // Mirror the customer app's working WalletTopUpScreen exactly: pass
      // user.phone directly as `prefill.contact`, no normalisation, no
      // readonly/hidden flags. The customer app proves this is the
      // pattern Razorpay's RN SDK responds to.
      const fullName = currentUser
        ? `${currentUser.firstName ?? ''} ${currentUser.lastName ?? ''}`.trim()
        : '';

      const options = {
        description: 'UKCAAR Driver Wallet Top-up',
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
        theme: { color: '#0097B3' },
      };
      console.log('[recharge] opening Razorpay with options:', JSON.stringify(options));

      const paymentData = await RazorpayCheckout.open(options);
      console.log('[recharge] Razorpay returned payment_id=', paymentData?.razorpay_payment_id);

      // 3. Verify server-side. Backend HMAC-checks the signature, marks the
      //    Payment record completed, and credits the wallet atomically.
      //    Returns the fresh wallet so we can update locally without a
      //    second GET.
      console.log('[recharge] calling verify-payment...');
      const result = await verifyRechargePayment({
        razorpay_order_id: order.orderId,
        razorpay_payment_id: paymentData.razorpay_payment_id,
        razorpay_signature: paymentData.razorpay_signature,
      });
      console.log('[recharge] verify success, new balance=', result.wallet.balance);

      // 4. Reflect the new balance in this screen, then bounce to the
      //    wallet screen which will re-fetch and confirm.
      setBalance(result.wallet.balance);
      Alert.alert(
        'Recharge successful',
        `₹${numericAmount} added. New balance: ₹${result.wallet.balance.toFixed(2)}`,
        [{ text: 'OK', onPress: () => onLaunched?.() }],
      );
    } catch (err: any) {
      // Log EVERY error so we can see exactly what Razorpay returns.
      console.warn('[recharge] failed:', {
        code: err?.code,
        message: err?.message,
        description: err?.description,
        full: err,
      });

      // Razorpay RN SDK signals user-cancellation in several different
      // shapes depending on platform + version:
      //   - Android:  code: 0, code: '0', or { error: { code: 'BAD_REQUEST_ERROR', description: 'Payment processing cancelled by user' } }
      //   - iOS:      code: 2 / '2'
      //   - Sheet just dismissed: description undefined, generic "bad request"
      // We treat all of these as cancellations rather than failures, so the
      // driver doesn't see a scary "Recharge failed" message for an action
      // they intentionally took.
      const code = err?.code;
      const desc = (err?.description || err?.message || '').toLowerCase();
      const isCancel =
        code === 0 || code === '0' ||
        code === 2 || code === '2' ||
        desc.includes('cancel') ||
        desc.includes('dismiss') ||
        // The infamous "bad request" + undefined description combo that
        // happens when the sheet closes without producing a payment.
        (desc === '' && err?.code === 'BAD_REQUEST_ERROR') ||
        (!err?.description && !err?.message);

      // Mark the pending order as failed so the wallet statement shows a
      // proper "Failed" badge instead of a dangling "Pending" row. Both
      // cancel and real-failure paths get this treatment — either way no
      // money landed and the row should reflect that.
      if (createdOrderId) {
        cancelRechargeOrder(createdOrderId);
      }

      if (isCancel) {
        Alert.alert(
          'Recharge cancelled',
          'You closed the payment sheet. No money was charged.',
        );
      } else {
        Alert.alert(
          'Recharge failed',
          err?.description || err?.message || 'Please try again.',
        );
      }
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
          <View className="flex-row items-center gap-4 px-6 pb-4 pt-2">
            <Pressable onPress={onBack} hitSlop={10}>
              <BackArrowIcon size={22} color="white" />
            </Pressable>
            <Text className="text-[20px] font-poppins-semibold text-white">
              Recharge Wallet
            </Text>
          </View>
        </SafeAreaView>
      </LinearGradient>

      <View className="items-center bg-[#0097B3] px-6 py-2">
        <Text className="text-xs text-white/90">Available Balance</Text>
        <Text className="mt-0.5 text-[20px] font-poppins-bold text-white">
          {balance === null ? '—' : fmtRupees(balance)}
        </Text>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
      <View className="flex-1 px-6">
        <View className="items-center justify-center py-12">
          <View className="flex-row items-center rounded-xl border border-[#E1E6EF] bg-white px-6 py-3">
            <Text className="text-[22px] font-normal text-[#132235]">₹</Text>
            <TextInput
              value={amountText}
              onChangeText={t => setAmountText(t.replace(/[^0-9]/g, ''))}
              keyboardType="number-pad"
              maxLength={6}
              placeholder="0"
              placeholderTextColor="#99A1AF"
              className="ml-1 min-w-[60px] text-center text-[34px] font-poppins-bold text-[#132235]"
              style={{ letterSpacing: -0.4 }}
            />
          </View>
          <Text className="mt-2 text-xs text-[#6A7282]">Enter amount</Text>
        </View>

        <View className="flex-row gap-2">
          {QUICK_AMOUNTS.map(value => {
            const selected = value === numericAmount;
            return (
              <Pressable
                key={value}
                onPress={() => setAmountText(String(value))}
                className="flex-1 items-center rounded-xl border bg-white py-2"
                style={{
                  borderColor: selected ? '#0097B3' : '#D3DDE7',
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: 0.05,
                  shadowRadius: 3,
                  elevation: 1,
                }}
              >
                <Text
                  className={`text-[13px] ${selected ? 'font-poppins-bold' : ''}`}
                  style={{ color: selected ? '#0097B3' : '#132235' }}
                >
                  ₹{value}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <SafeAreaView edges={['bottom']} className="bg-white px-4 pb-4">
        <Pressable
          onPress={onRechargeNow}
          disabled={!valid || submitting}
          className="h-14 items-center justify-center rounded-2xl"
          style={{ backgroundColor: valid && !submitting ? '#0097B3' : '#9DD7E0' }}
        >
          {submitting ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text className="text-base font-poppins-bold text-white">Recharge Now</Text>
          )}
        </Pressable>
      </SafeAreaView>
      </KeyboardAvoidingView>
    </View>
  );
}

export default RechargeWalletScreen;
