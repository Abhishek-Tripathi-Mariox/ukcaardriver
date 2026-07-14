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
import { SafeAreaView } from 'react-native-safe-area-context';
import { BackArrowIcon } from '../components/icons/ServiceTypeIcons';
import {
  fetchReceivedAmounts,
  ReceivedAmountItem,
} from '../services/api';

interface ReceivedAmountScreenProps {
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

type Row =
  | { kind: 'header'; key: string; label: string }
  | { kind: 'ride'; key: string; ride: ReceivedAmountItem };

const buildRows = (rides: ReceivedAmountItem[]): Row[] => {
  const rows: Row[] = [];
  let currentLabel = '';
  for (const r of rides) {
    const d = new Date(r.at);
    const label = d
      .toLocaleString('en-US', { month: 'long', year: 'numeric' })
      .toUpperCase();
    if (label !== currentLabel) {
      rows.push({ kind: 'header', key: `h-${label}`, label });
      currentLabel = label;
    }
    rows.push({ kind: 'ride', key: r._id, ride: r });
  }
  return rows;
};

/**
 * Each ride is rendered as TWO lines so the driver sees both the gross fare
 * the rider paid (top) and the net amount that landed in their wallet after
 * the platform commission was cut (bottom). Matches the Figma 188:7888 layout.
 */
function RideEntry({ ride }: { ride: ReceivedAmountItem }) {
  const ref = ride._id.slice(-8).toUpperCase();
  return (
    <View className="px-4">
      <View className="flex-row items-center border-b border-[#E9F0F7] py-3">
        <View className="flex-1">
          <Text className="text-[15px] font-poppins-bold text-[#132235]">
            Fare Collected
          </Text>
          <Text className="mt-0.5 text-xs text-[#364B63]">
            Reference ID: {ref}
          </Text>
        </View>
        <Text className="text-[17px] font-poppins-bold text-[#08875D]">
          + {fmtRupees(ride.grossFare)}
        </Text>
      </View>
      <View className="flex-row items-center border-b border-[#E9F0F7] py-3">
        <View className="flex-1">
          <Text className="text-[15px] font-poppins-bold text-[#132235]">
            Net Earning (after commission)
          </Text>
          <Text className="mt-0.5 text-xs text-[#364B63]">
            Commission: {fmtRupees(ride.commission)} · Ref: {ref}
          </Text>
        </View>
        <Text className="text-[17px] font-poppins-bold text-[#08875D]">
          + {fmtRupees(ride.netEarnings)}
        </Text>
      </View>
    </View>
  );
}

export function ReceivedAmountScreen({ onBack }: ReceivedAmountScreenProps) {
  const [items, setItems] = useState<ReceivedAmountItem[]>([]);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const load = useCallback(
    async (pageToLoad: number, reset = false) => {
      try {
        const res = await fetchReceivedAmounts(pageToLoad, 30);
        setPage(res.pagination.page);
        setPages(res.pagination.pages);
        setItems(prev => (reset ? res.items : [...prev, ...res.items]));
      } catch (err) {
        console.warn('[received-amount] fetch failed:', err);
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
              Received Amount
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
          <Text className="text-sm text-[#6A7282]">
            No completed rides yet.
          </Text>
        </View>
      ) : (
        <FlatList
          data={rows}
          keyExtractor={r => r.key}
          contentContainerStyle={{ paddingBottom: 32 }}
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
          renderItem={({ item }) =>
            item.kind === 'header' ? (
              <View className="flex-row items-center gap-4 px-4 pb-2 pt-4">
                <View className="h-px flex-1 bg-[#E1E6EF]" />
                <Text className="text-[11px] font-poppins-bold text-[#607080]">
                  {item.label}
                </Text>
                <View className="h-px flex-1 bg-[#E1E6EF]" />
              </View>
            ) : (
              <RideEntry ride={item.ride} />
            )
          }
        />
      )}
    </View>
  );
}

export default ReceivedAmountScreen;
