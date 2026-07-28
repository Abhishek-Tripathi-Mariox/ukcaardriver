import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StatusBar,
  Text,
  View,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { BackArrowIcon } from '../components/icons/ServiceTypeIcons';
import {
  fetchWalletStatement,
  WalletTransactionApi,
} from '../services/api';

interface WalletStatementScreenProps {
  onBack?: () => void;
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

const CREDIT_TYPES = new Set([
  'wallet_topup',
  'ride_payment',
  'refund',
  'incentive',
  'bonus',
  'tip',
]);

const niceTitle = (t: WalletTransactionApi): string => {
  switch (t.type) {
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
    case 'tip':
      return 'Tip';
    case 'cancellation_fee':
      return 'Cancellation Fee';
    default:
      return t.description || t.type.replace(/_/g, ' ');
  }
};

type Row =
  | { kind: 'header'; key: string; label: string }
  | { kind: 'txn'; key: string; txn: WalletTransactionApi };

/**
 * Flatten paginated transactions into [header, txn, txn, header, ...] rows
 * grouped by month, ready for FlatList rendering.
 */
const buildRows = (txns: WalletTransactionApi[]): Row[] => {
  const rows: Row[] = [];
  let currentLabel = '';
  for (const t of txns) {
    const d = new Date(t.createdAt);
    const label = d
      .toLocaleString('en-US', { month: 'long', year: 'numeric' })
      .toUpperCase();
    if (label !== currentLabel) {
      rows.push({ kind: 'header', key: `h-${label}`, label });
      currentLabel = label;
    }
    rows.push({ kind: 'txn', key: t._id, txn: t });
  }
  return rows;
};

export function WalletStatementScreen({ onBack }: WalletStatementScreenProps) {
  const insets = useSafeAreaInsets();
  const [items, setItems] = useState<WalletTransactionApi[]>([]);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const load = useCallback(
    async (pageToLoad: number, reset = false) => {
      try {
        const res = await fetchWalletStatement(pageToLoad, 30);
        setPage(res.pagination.page);
        setPages(res.pagination.pages);
        setItems(prev => (reset ? res.items : [...prev, ...res.items]));
      } catch (err) {
        console.warn('[wallet-statement] fetch failed:', err);
      } finally {
        setLoading(false);
        setRefreshing(false);
        setLoadingMore(false);
      }
    },
    [],
  );

  useEffect(() => {
    load(1, true);
  }, [load]);

  const onRefresh = () => {
    setRefreshing(true);
    load(1, true);
  };

  const onEndReached = () => {
    if (loadingMore || page >= pages) return;
    setLoadingMore(true);
    load(page + 1);
  };

  const rows = buildRows(items);

  return (
    <View className="flex-1 bg-white">
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      <LinearGradient
        colors={['#0097B3', '#00C896']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
      >
        <SafeAreaView edges={['top']}>
          <View className="flex-row items-center gap-4 px-4 pb-4 pt-2">
            <Pressable onPress={onBack} hitSlop={10}>
              <BackArrowIcon size={22} color="white" />
            </Pressable>
            <Text className="text-[20px] font-poppins-semibold text-white">
              Wallet Statement
            </Text>
          </View>
        </SafeAreaView>
      </LinearGradient>

      {loading && items.length === 0 ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#0097B3" />
        </View>
      ) : items.length === 0 ? (
        <View className="flex-1 items-center justify-center">
          <Text className="text-sm text-[#6A7282]">No transactions yet.</Text>
        </View>
      ) : (
        <FlatList
          data={rows}
          keyExtractor={r => r.key}
          contentContainerStyle={{ paddingBottom: 32 + insets.bottom }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          onEndReached={onEndReached}
          onEndReachedThreshold={0.4}
          ListFooterComponent={
            loadingMore ? (
              <View className="py-6 items-center">
                <ActivityIndicator color="#0097B3" />
              </View>
            ) : null
          }
          renderItem={({ item }) => {
            if (item.kind === 'header') {
              return (
                <View className="flex-row items-center gap-4 px-4 pb-2 pt-4">
                  <View className="h-px flex-1 bg-[#E1E6EF]" />
                  <Text className="text-[11px] font-poppins-bold text-[#607080]">
                    {item.label}
                  </Text>
                  <View className="h-px flex-1 bg-[#E1E6EF]" />
                </View>
              );
            }
            const t = item.txn;
            const isCredit = CREDIT_TYPES.has(t.type);
            const isCompleted = t.status === 'completed';
            const isFailed = t.status === 'failed';
            const isPending = t.status === 'pending';
            const badge = isFailed
              ? { label: 'Failed', color: '#E02D3C', bg: '#FEE2E2' }
              : isPending
                ? { label: 'Pending', color: '#B45309', bg: '#FEF3C7' }
                : null;
            return (
              <View className="flex-row items-center gap-3 border-b border-[#E9F0F7] px-4 py-3">
                {/* Text column shrinks, amount never does — long titles used
                    to shove the badge out and run under the amount. */}
                <View className="min-w-0 flex-1">
                  <View className="flex-row items-center gap-2">
                    <Text
                      className="flex-1 text-[15px] font-poppins-bold"
                      numberOfLines={1}
                      ellipsizeMode="tail"
                      style={{
                        color: isCompleted ? '#132235' : '#6A7282',
                        textDecorationLine: isFailed ? 'line-through' : 'none',
                      }}
                    >
                      {niceTitle(t)}
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
                    className="mt-0.5 text-xs text-[#364B63]"
                    numberOfLines={1}
                    ellipsizeMode="middle"
                  >
                    Reference ID: {t._id.slice(-8).toUpperCase()}
                  </Text>
                </View>
                {isCompleted ? (
                  <Text
                    className="shrink-0 text-[17px] font-poppins-bold"
                    numberOfLines={1}
                    style={{ color: isCredit ? '#08875D' : '#E02D3C' }}
                  >
                    {isCredit ? '+ ' : '- '}
                    {fmtRupees(Math.abs(t.amount))}
                  </Text>
                ) : (
                  // Pending / failed: show the *attempted* amount in muted
                  // grey with no sign, so it's clear no money moved.
                  <Text
                    className="shrink-0 text-[17px] font-poppins-medium text-[#9CA3AF]"
                    numberOfLines={1}
                  >
                    {fmtRupees(Math.abs(t.amount))}
                  </Text>
                )}
              </View>
            );
          }}
        />
      )}
    </View>
  );
}

export default WalletStatementScreen;
