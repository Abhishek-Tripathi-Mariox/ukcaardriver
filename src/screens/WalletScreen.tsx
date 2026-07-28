import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StatusBar,
  Text,
  View,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  BackArrowIcon,
  CardAddIcon,
  CashoutIcon,
  MoneyReceiveIcon,
  StickyNoteIcon,
} from '../components/icons/ServiceTypeIcons';
import { fetchWallet, WalletTransactionApi } from '../services/api';

interface WalletScreenProps {
  onBack?: () => void;
  onRecharge?: () => void;
  onStatement?: () => void;
  onReceived?: () => void;
  onCashout?: () => void;
}

interface UiTxn {
  id: string;
  title: string;
  reference: string;
  amount: number;
  type: 'credit' | 'debit';
  /** Backend Payment.status — drives whether to show the colored +/- amount
   *  or a muted "Pending"/"Failed" badge. Without this, a recharge that the
   *  user cancelled in Razorpay still shows as "+₹500" in the statement,
   *  which is misleading. */
  status: 'pending' | 'completed' | 'failed' | 'refunded';
}

interface UiGroup {
  label: string;
  transactions: UiTxn[];
}

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

/**
 * Map a backend Payment doc to a wallet-row UI shape. Anything credited TO
 * the driver (earnings, refunds in their favour) shows as +; anything OUT
 * (cashout, fee) shows as -. The Payment.type enum drives this.
 */
const toUiTxn = (p: WalletTransactionApi): UiTxn => {
  // Credit-style types — money landing in the wallet.
  const CREDIT_TYPES = new Set([
    'wallet_topup',
    'ride_payment', // driver earning
    'refund',
    'incentive',
    'bonus',
  ]);
  const isCredit = CREDIT_TYPES.has(p.type);
  const niceTitle = (() => {
    switch (p.type) {
      case 'ride_payment':
        return 'Ride Earning';
      case 'wallet_topup':
        return 'Wallet Top-up';
      case 'refund':
        return 'Refund';
      case 'incentive':
        return 'Incentive Reward';
      case 'bonus':
        return 'Bonus';
      case 'cashout':
        return 'Cashout';
      case 'commission':
        return 'Platform Fee';
      default:
        return p.description || p.type.replace(/_/g, ' ');
    }
  })();
  return {
    id: p._id,
    title: niceTitle,
    reference: `Reference ID: #${p._id.slice(-7).toUpperCase()}`,
    amount: Math.abs(p.amount),
    type: isCredit ? 'credit' : 'debit',
    // Default to 'pending' if the backend ever omits status — safer than
    // assuming completed and showing a fake credit.
    status: (p.status as UiTxn['status']) || 'pending',
  };
};

/**
 * Group transactions by month (e.g. "JANUARY 2026"). Backend returns newest
 * first so the months naturally appear in reverse-chronological order.
 */
const groupTxns = (txns: WalletTransactionApi[]): UiGroup[] => {
  const buckets = new Map<string, UiTxn[]>();
  for (const t of txns) {
    const d = new Date(t.createdAt);
    const label = d
      .toLocaleString('en-US', { month: 'long', year: 'numeric' })
      .toUpperCase();
    if (!buckets.has(label)) buckets.set(label, []);
    buckets.get(label)!.push(toUiTxn(t));
  }
  return Array.from(buckets.entries()).map(([label, transactions]) => ({
    label,
    transactions,
  }));
};

interface ActionButtonProps {
  icon: React.ReactNode;
  label: string;
  onPress?: () => void;
}

function ActionButton({ icon, label, onPress }: ActionButtonProps) {
  return (
    <Pressable onPress={onPress} className="flex-1 items-center gap-2 py-1">
      <View className="h-[52px] w-[52px] items-center justify-center rounded-full bg-[#364B63]">
        {icon}
      </View>
      <Text
        className="text-center text-[12px] font-poppins-bold text-[#364B63]"
        style={{ lineHeight: 16 }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function TransactionRow({ transaction }: { transaction: UiTxn }) {
  const isCredit = transaction.type === 'credit';
  const isCompleted = transaction.status === 'completed';
  const isFailed = transaction.status === 'failed';
  const isPending = transaction.status === 'pending';

  // Status badge config — only shown for non-completed rows. Completed
  // transactions don't need a badge because the colored amount already
  // signals "this happened".
  const badge = isFailed
    ? { label: 'Failed', color: '#E02D3C', bg: '#FEE2E2' }
    : isPending
      ? { label: 'Pending', color: '#B45309', bg: '#FEF3C7' }
      : null;

  return (
    <View className="flex-row items-center border-b border-[#E9F0F7] py-3">
      {/* Text column shrinks; the amount never does. Long descriptions used to
          push the status badge out of the row and run under the amount. */}
      <View className="min-w-0 flex-1">
        <View className="flex-row items-center gap-2">
          <Text
            className="flex-1 text-[15px] font-poppins-semibold"
            numberOfLines={1}
            ellipsizeMode="tail"
            style={{
              color: isCompleted ? '#132235' : '#6A7282',
              // Strike-through failed rows so the eye dismisses them.
              textDecorationLine: isFailed ? 'line-through' : 'none',
            }}
          >
            {transaction.title}
          </Text>
          {badge && (
            <View
              className="shrink-0 rounded-full px-2 py-0.5"
              style={{ backgroundColor: badge.bg }}
            >
              <Text
                className="text-[10px] font-poppins-bold uppercase"
                style={{ color: badge.color }}
              >
                {badge.label}
              </Text>
            </View>
          )}
        </View>
        <Text
          className="mt-0.5 text-xs text-[#6A7282]"
          numberOfLines={1}
          ellipsizeMode="middle"
        >
          {transaction.reference}
        </Text>
      </View>
      {isCompleted ? (
        <Text
          className="shrink-0 pl-3 text-[15px] font-poppins-bold"
          numberOfLines={1}
          style={{ color: isCredit ? '#08875D' : '#E02D3C' }}
        >
          {isCredit ? '+ ' : '- '}
          {fmtRupees(transaction.amount)}
        </Text>
      ) : (
        // For pending / failed rows we show the *attempted* amount in grey
        // with no sign, so the driver knows what was tried but doesn't
        // mistake it for a successful credit.
        <Text
          className="shrink-0 pl-3 text-[15px] font-poppins-medium text-[#9CA3AF]"
          numberOfLines={1}
        >
          {fmtRupees(transaction.amount)}
        </Text>
      )}
    </View>
  );
}

export function WalletScreen({
  onBack,
  onRecharge,
  onStatement,
  onReceived,
  onCashout,
}: WalletScreenProps) {
  const insets = useSafeAreaInsets();
  const [balance, setBalance] = useState<number | null>(null);
  const [groups, setGroups] = useState<UiGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetchWallet();
      setBalance(res.wallet.balance);
      setGroups(groupTxns(res.recentTransactions ?? []));
    } catch (err) {
      console.warn('[wallet] fetch failed:', err);
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

  return (
    <View className="flex-1 bg-white">
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      <LinearGradient
        colors={['#0097B3', '#00C896']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
      >
        <SafeAreaView edges={['top']}>
          <View className="flex-row items-center gap-4 px-6 pb-6 pt-2">
            <Pressable onPress={onBack} hitSlop={10}>
              <BackArrowIcon size={22} color="white" />
            </Pressable>
            <Text className="text-[20px] font-poppins-semibold text-white">My Wallet</Text>
          </View>
        </SafeAreaView>
      </LinearGradient>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 16, paddingBottom: 32 + insets.bottom, gap: 20 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View className="overflow-hidden rounded-2xl bg-[#0097B3] px-6 py-5">
          <Text className="text-center text-sm font-poppins-semibold text-[#D3DDE7]">
            Total balance
          </Text>
          {loading && balance === null ? (
            <ActivityIndicator color="white" className="mt-3" />
          ) : (
            <Text className="mt-1 text-center text-[36px] font-extrabold text-white">
              {fmtRupees(balance ?? 0)}
            </Text>
          )}
          <View className="absolute right-0 top-0 h-full w-32 opacity-20">
            <View className="absolute right-2 top-3 h-24 w-24 rounded-full border-2 border-white" />
            <View className="absolute right-10 top-10 h-16 w-16 rounded-full border-2 border-white" />
          </View>
        </View>

        <View className="flex-row items-start justify-between gap-1">
          <ActionButton
            icon={<CardAddIcon size={22} color="white" />}
            label={'Recharge\nWallet'}
            onPress={onRecharge}
          />
          <ActionButton
            icon={<StickyNoteIcon size={22} color="white" />}
            label={'Wallet\nStatement'}
            onPress={onStatement}
          />
          <ActionButton
            icon={<MoneyReceiveIcon size={22} color="white" />}
            label={'Received\nAmount'}
            onPress={onReceived}
          />
          <ActionButton
            icon={<CashoutIcon size={22} color="white" />}
            label={'Cashout\nAmount'}
            onPress={onCashout}
          />
        </View>

        {loading && groups.length === 0 ? (
          <View className="py-8 items-center">
            <ActivityIndicator color="#0097B3" />
          </View>
        ) : groups.length === 0 ? (
          <View className="py-12 items-center">
            <Text className="text-sm text-[#6A7282]">No transactions yet.</Text>
          </View>
        ) : (
          <View className="gap-2">
            {groups.map(group => (
              <View key={group.label}>
                <Text className="py-2 text-[11px] font-poppins-bold text-[#607080]">
                  {group.label}
                </Text>
                {group.transactions.map(t => (
                  <TransactionRow key={t.id} transaction={t} />
                ))}
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

export default WalletScreen;
