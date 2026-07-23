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
import {
  BackArrowIcon,
  BellIcon,
  CheckIcon,
  TabProfileIcon,
} from '../components/icons/ServiceTypeIcons';
import {
  fetchNotifications,
  markAllNotificationsRead,
  NotificationApi,
} from '../services/api';

interface NotificationsScreenProps {
  onBack?: () => void;
}

/** Friendly relative timestamp like the Figma "13min" / "1 hr". */
function relativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '';
  const diffMs = Date.now() - then;
  const mins = Math.max(0, Math.floor(diffMs / 60_000));
  if (mins < 1) return 'now';
  if (mins < 60) return `${mins}min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hr`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d`;
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `${weeks}w`;
  const months = Math.floor(days / 30);
  return `${months}mo`;
}

/** Group label for the section headers ("Today", "Yesterday", "Earlier"). */
function bucketFor(iso: string): 'Today' | 'Yesterday' | 'Earlier' {
  const d = new Date(iso);
  const now = new Date();
  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();
  if (sameDay) return 'Today';
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday =
    d.getFullYear() === yesterday.getFullYear() &&
    d.getMonth() === yesterday.getMonth() &&
    d.getDate() === yesterday.getDate();
  if (isYesterday) return 'Yesterday';
  return 'Earlier';
}

function NotificationThumb({ type }: { type: NotificationApi['type'] }) {
  if (type === 'payment') {
    return (
      <View className="h-[70px] w-[70px] items-center justify-center rounded-2xl bg-[#E1F4E5]">
        <View className="h-9 w-9 items-center justify-center rounded-full bg-[#00C896]">
          <CheckIcon size={18} color="white" />
        </View>
      </View>
    );
  }
  if (type === 'ride') {
    return (
      <View className="h-[70px] w-[70px] items-center justify-center rounded-2xl bg-[#DCE3F5]">
        <TabProfileIcon size={36} color="#5B6B8F" />
      </View>
    );
  }
  if (type === 'promo') {
    return (
      <View className="h-[70px] w-[70px] items-center justify-center rounded-2xl bg-[#F4E1E1]">
        <BellIcon size={28} color="#0097B3" />
      </View>
    );
  }
  // 'safety' / 'system' fall through to the bell.
  return (
    <View className="h-[70px] w-[70px] items-center justify-center rounded-2xl bg-[#EEEEF7]">
      <BellIcon size={32} color="#0097B3" />
    </View>
  );
}

function NotificationRow({ item }: { item: NotificationApi }) {
  return (
    <View
      className="flex-row items-start gap-4 border-b border-[#F3F4F6] px-6 py-4"
      style={{ backgroundColor: item.isRead ? 'white' : '#F0F9FB' }}
    >
      <NotificationThumb type={item.type} />
      <View className="flex-1">
        <View className="flex-row items-start justify-between">
          <Text className="flex-1 pr-2 text-sm font-poppins-bold text-[#171717]">
            {item.title}
          </Text>
          <Text className="text-xs text-[#D9D9D9]">
            {relativeTime(item.createdAt)}
          </Text>
        </View>
        <Text className="mt-1 text-sm leading-[20px] text-[#8F92A1]">
          {item.body}
        </Text>
      </View>
    </View>
  );
}

type Row =
  | { kind: 'header'; key: string; label: string }
  | { kind: 'notif'; key: string; notif: NotificationApi };

const buildRows = (items: NotificationApi[]): Row[] => {
  const rows: Row[] = [];
  let currentBucket = '';
  for (const n of items) {
    const bucket = bucketFor(n.createdAt);
    if (bucket !== currentBucket) {
      rows.push({ kind: 'header', key: `h-${bucket}`, label: bucket });
      currentBucket = bucket;
    }
    rows.push({ kind: 'notif', key: n._id, notif: n });
  }
  return rows;
};

export function NotificationsScreen({ onBack }: NotificationsScreenProps) {
  const [items, setItems] = useState<NotificationApi[]>([]);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const load = useCallback(async (pageToLoad: number, reset = false) => {
    try {
      const res = await fetchNotifications(pageToLoad, 30);
      setPage(res.pagination.page);
      setPages(res.pagination.pages);
      setItems(prev =>
        reset ? res.notifications : [...prev, ...res.notifications],
      );
    } catch (err) {
      console.warn('[notifications] fetch failed:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  }, []);

  // On mount: load the first page, then mark everything as read so the
  // dashboard's bell badge clears next time it polls.
  useEffect(() => {
    load(1, true).then(() => {
      markAllNotificationsRead().catch(() => {
        // Non-fatal — backend will keep them as unread, the next poll just
        // shows them again. We don't need to surface the error.
      });
    });
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
      <StatusBar barStyle="light-content" />

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
            <Text className="text-[20px] font-poppins-semibold text-white">
              Notification
            </Text>
          </View>
        </SafeAreaView>
      </LinearGradient>

      {loading && items.length === 0 ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#0097B3" />
        </View>
      ) : items.length === 0 ? (
        <View className="flex-1 items-center justify-center px-8">
          <BellIcon size={48} color="#D9D9D9" />
          <Text className="mt-4 text-center text-base font-poppins-semibold text-[#1B1D21]">
            No notifications yet
          </Text>
          <Text className="mt-2 text-center text-sm text-[#8F92A1]">
            New ride alerts, payments, and updates will show up here.
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
              <>
                <View className="px-6 pb-3 pt-6">
                  <Text className="text-base font-poppins-bold text-[#1B1D21]">
                    {item.label}
                  </Text>
                </View>
                <View className="h-px bg-[#F3F4F6]" />
              </>
            ) : (
              <NotificationRow item={item.notif} />
            )
          }
        />
      )}
    </View>
  );
}

export default NotificationsScreen;
