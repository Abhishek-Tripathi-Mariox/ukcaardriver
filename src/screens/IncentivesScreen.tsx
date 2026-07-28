import { useEffect, useState, useCallback } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { BackArrowIcon } from '../components/icons/ServiceTypeIcons';
import {
  fetchIncentives,
  fetchIncentiveHistory,
  type IncentiveRule,
  type IncentiveProgress,
} from '../services/api';

interface IncentivesScreenProps {
  onBack?: () => void;
}

const PRIMARY = '#0097B3';

type ActiveItem = { incentive: IncentiveRule; progress: IncentiveProgress | null };

function rewardLabel(type?: string, amount?: number): string {
  if (amount == null) return '';
  return type === 'percentage' ? `${amount}% bonus` : `₹${amount} bonus`;
}

export function IncentivesScreen({ onBack }: IncentivesScreenProps) {
  const insets = useSafeAreaInsets();
  const [active, setActive] = useState<ActiveItem[]>([]);
  const [history, setHistory] = useState<IncentiveProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const [a, h] = await Promise.all([fetchIncentives(), fetchIncentiveHistory()]);
      setActive(a);
      setHistory(h);
    } catch {
      // empty states handle it
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      <View style={styles.header}>
        <Pressable onPress={onBack} hitSlop={10} style={styles.backBtn}>
          <BackArrowIcon size={22} color="#1B1D21" />
        </Pressable>
        <Text style={styles.headerTitle}>Incentives</Text>
        <View style={{ width: 32 }} />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={PRIMARY} />
        </View>
      ) : (
        <ScrollView
          // Edge-to-edge (SDK 36): last rows must clear the nav bar.
          contentContainerStyle={[styles.content, { paddingBottom: 16 + insets.bottom }]}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                load();
              }}
            />
          }
        >
          <Text style={styles.sectionTitle}>Active Incentives</Text>
          {active.length === 0 ? (
            <Text style={styles.empty}>No incentives available for you right now.</Text>
          ) : (
            active.map(({ incentive, progress }) => {
              const current = progress?.progress ?? 0;
              const threshold = incentive.threshold || 1;
              const pct = Math.min(100, Math.round((current / threshold) * 100));
              const done = current >= threshold;
              return (
                <View key={incentive._id} style={styles.card}>
                  <View style={styles.cardTop}>
                    <Text style={styles.cardTitle}>{incentive.name}</Text>
                    <Text style={styles.reward}>{rewardLabel(incentive.rewardType, incentive.rewardAmount)}</Text>
                  </View>
                  {!!incentive.description && <Text style={styles.cardDesc}>{incentive.description}</Text>}
                  <View style={styles.progressTrack}>
                    <View style={[styles.progressFill, { width: `${pct}%` }, done && { backgroundColor: '#4CAF50' }]} />
                  </View>
                  <Text style={styles.progressText}>
                    {current} / {threshold} {incentive.target === 'earnings' ? '₹ earned' : 'rides'}
                    {done ? ' · target reached' : ''}
                  </Text>
                </View>
              );
            })
          )}

          <Text style={[styles.sectionTitle, { marginTop: 24 }]}>History</Text>
          {history.length === 0 ? (
            <Text style={styles.empty}>No past incentive periods yet.</Text>
          ) : (
            history.map((h, i) => (
              <View key={h._id ?? i} style={styles.historyRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.historyName}>{h.incentive?.name ?? 'Incentive'}</Text>
                  <Text style={styles.historyMeta}>
                    {h.periodKey ?? ''} · {h.progress ?? 0}/{h.threshold ?? 0}
                  </Text>
                </View>
                <View style={styles.historyRight}>
                  <Text style={styles.historyAmount}>₹{(h.rewardAmount ?? 0).toFixed(0)}</Text>
                  <Text style={[styles.payBadge, h.paidOut ? styles.paid : styles.unpaid]}>
                    {h.paidOut ? 'Paid' : 'Pending'}
                  </Text>
                </View>
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

  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#1B1D21', marginBottom: 12 },
  empty: { fontSize: 14, color: '#9AA5AD', paddingVertical: 10 },

  card: { borderWidth: 1, borderColor: '#EEE', borderRadius: 14, padding: 16, marginBottom: 12 },
  cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  cardTitle: { flex: 1, fontSize: 16, fontWeight: '600', color: '#1B1D21' },
  reward: { fontSize: 13, fontWeight: '700', color: PRIMARY },
  cardDesc: { fontSize: 13, color: '#7D8A95', marginTop: 4, lineHeight: 19 },
  progressTrack: { height: 8, borderRadius: 4, backgroundColor: '#EEF1F3', marginTop: 12, overflow: 'hidden' },
  progressFill: { height: 8, borderRadius: 4, backgroundColor: PRIMARY },
  progressText: { fontSize: 12, color: '#5B6770', marginTop: 6 },

  historyRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F2F4F5',
  },
  historyName: { fontSize: 15, fontWeight: '600', color: '#1B1D21' },
  historyMeta: { fontSize: 12, color: '#7D8A95', marginTop: 2 },
  historyRight: { alignItems: 'flex-end' },
  historyAmount: { fontSize: 15, fontWeight: '700', color: '#1B1D21' },
  payBadge: { fontSize: 11, fontWeight: '700', marginTop: 2 },
  paid: { color: '#4CAF50' },
  unpaid: { color: '#FF9800' },
});
