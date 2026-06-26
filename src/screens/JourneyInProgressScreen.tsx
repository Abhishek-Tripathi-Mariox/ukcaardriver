import { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StatusBar, Text, View } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  AlertCircleIcon,
  BackArrowIcon,
  CheckIcon,
  CloseIcon,
  LocationPinSmallIcon,
  PhoneIcon,
  RoutingIcon,
  SOSAlertIcon,
  UsersIcon,
} from '../components/icons/ServiceTypeIcons';

interface JourneyStop {
  index: number;
  title: string;
  time: string;
  boarding?: number;
  dropping?: number;
  passengers?: { id: string; name: string; initial: string }[];
}

interface JourneyInProgressScreenProps {
  journeyKey?: string | null;
  title?: string;
  currentStopIndex?: number;
  etaMins?: number;
  onBoardCount?: number;
  stops?: JourneyStop[];
  onBack?: () => void;
  onNextStop?: () => void;
  onEmergencyStop?: () => void;
  onSos?: () => void;
  onViewOnBoardDetails?: () => void;
}

// Neutral fallback — real stops are fetched on mount.
const DEFAULT_STOPS: JourneyStop[] = [];

export function JourneyInProgressScreen({
  journeyKey,
  title: titleProp = 'Scheduled Journey',
  currentStopIndex: currentStopIndexProp = 0,
  etaMins = 0,
  onBoardCount: onBoardCountProp = 0,
  stops: stopsProp = DEFAULT_STOPS,
  onBack,
  onNextStop,
  onEmergencyStop,
  onSos,
  onViewOnBoardDetails,
}: JourneyInProgressScreenProps) {
  const [showStopDetails, setShowStopDetails] = useState(false);
  const [detail, setDetail] = useState<{ stops: JourneyStop[]; current: number; title: string; boarded: number } | null>(null);
  const [advancing, setAdvancing] = useState(false);

  useEffect(() => {
    if (!journeyKey) return;
    // Lazy import keeps the screen's import list small; both calls are cheap.
    (async () => {
      try {
        const api = await import('../services/api');
        const [d, pax] = await Promise.all([
          api.fetchJourney(journeyKey),
          api.fetchJourneyPassengers(journeyKey),
        ]);
        setDetail({
          title: d.journey.routeName,
          current: d.journey.currentStopIndex,
          boarded: pax.boarded,
          stops: d.stops.map((s) => ({ index: s.index, title: s.name, time: '' })),
        });
      } catch {
        /* keep placeholder */
      }
    })();
  }, [journeyKey]);

  const title = detail?.title ?? titleProp;
  const stops = detail?.stops ?? stopsProp;
  const currentStopIndex = detail?.current ?? currentStopIndexProp;
  const onBoardCount = detail?.boarded ?? onBoardCountProp;
  // Neutral fallback so this never crashes while stops are still loading (empty).
  const currentStop: JourneyStop =
    stops.find(s => s.index === currentStopIndex) ??
    stops[0] ?? { index: currentStopIndex, title: '—', time: '' };

  const handleNextStop = async () => {
    if (!journeyKey) {
      onNextStop?.();
      return;
    }
    setAdvancing(true);
    try {
      const api = await import('../services/api');
      const res = await api.advanceJourney(journeyKey);
      setDetail((d) => (d ? { ...d, current: res.currentStopIndex } : d));
      if (res.atDestination) onNextStop?.();
    } catch (err: any) {
      Alert.alert('Could not advance', err?.message ?? 'Please try again.');
    } finally {
      setAdvancing(false);
    }
  };

  return (
    <View className="flex-1 bg-[#F9FAFB]">
      <StatusBar barStyle="light-content" />

      <LinearGradient
        colors={['#AD46FF', '#9810FA']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
      >
        <SafeAreaView edges={['top']}>
          <View className="flex-row items-center gap-4 px-6 pb-4 pt-2">
            <Pressable onPress={onBack} hitSlop={10}>
              <BackArrowIcon size={22} color="white" />
            </Pressable>
            <View className="flex-1">
              <Text className="text-[20px] font-semibold text-white">
                Journey in Progress
              </Text>
              <Text className="text-[14px] text-white/80">{title}</Text>
            </View>
          </View>
        </SafeAreaView>
      </LinearGradient>

      <View className="relative flex-1">
        <LinearGradient
          colors={['#F3E8FF', '#E9D4FF']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ flex: 1 }}
        >
          <View className="flex-1 items-center justify-center">
            <RoutingIcon size={40} color="#6E11B0" />
            <Text className="mt-2 text-base font-medium text-[#6E11B0]">
              Live Tracking
            </Text>
            <Text className="text-[14px] text-[#9810FA]">
              Navigate to next stop
            </Text>
          </View>
        </LinearGradient>

        <View className="absolute left-4 right-4 top-4">
          <View
            className="rounded-2xl bg-white p-4"
            style={{
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.1,
              shadowRadius: 6,
              elevation: 3,
            }}
          >
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center gap-2">
                <View className="h-2 w-2 rounded-full bg-[#9810FA]" />
                <Text className="text-[12px] font-medium text-[#6A7282]">
                  Next Stop
                </Text>
              </View>
              <Text className="text-[14px] font-semibold text-[#9810FA]">
                ETA: {etaMins} mins
              </Text>
            </View>
            <Text className="mt-2 text-base font-semibold text-[#1E293B]">
              {currentStop.title}
            </Text>
          </View>
        </View>

        <View className="absolute bottom-4 left-4 right-4">
          <View
            className="rounded-2xl bg-white p-4"
            style={{
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.1,
              shadowRadius: 6,
              elevation: 3,
            }}
          >
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center gap-3">
                <UsersIcon size={20} color="#9810FA" />
                <View>
                  <Text className="text-[12px] text-[#6A7282]">On Board</Text>
                  <Text className="text-base font-semibold text-[#1E293B]">
                    {onBoardCount} Passengers
                  </Text>
                </View>
              </View>
              <Pressable
                onPress={() => {
                  setShowStopDetails(true);
                  onViewOnBoardDetails?.();
                }}
              >
                <Text className="text-[14px] font-medium text-[#9810FA]">
                  View Details
                </Text>
              </Pressable>
            </View>
          </View>
        </View>

        <Pressable
          onPress={onSos}
          className="absolute bottom-24 right-4 h-14 w-14 items-center justify-center rounded-full bg-[#E7000B]"
          style={{
            shadowColor: '#E7000B',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.4,
            shadowRadius: 6,
            elevation: 4,
          }}
        >
          <SOSAlertIcon size={24} color="white" />
        </Pressable>
      </View>

      <View
        className="rounded-t-3xl bg-white px-6 pb-6 pt-5"
        style={{
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.08,
          shadowRadius: 8,
          elevation: 6,
        }}
      >
        <Text className="text-[18px] font-semibold text-[#1E293B]">
          Journey Progress
        </Text>
        <View className="mt-4 max-h-[180px]">
          <ScrollView showsVerticalScrollIndicator={false}>
            {stops.map((s, i) => {
              const completed = s.index < currentStopIndex;
              const active = s.index === currentStopIndex;
              const dotBg = completed
                ? '#00A63E'
                : active
                  ? '#9810FA'
                  : '#E5E7EB';
              const textColor = active
                ? '#1E293B'
                : completed
                  ? '#1E293B'
                  : '#6A7282';
              return (
                <View key={s.index} className="flex-row gap-3">
                  <View className="items-center">
                    <View
                      className="h-6 w-6 items-center justify-center rounded-full"
                      style={{ backgroundColor: dotBg }}
                    >
                      {completed ? (
                        <CheckIcon size={14} color="white" />
                      ) : active ? (
                        <View className="h-2 w-2 rounded-full bg-white" />
                      ) : null}
                    </View>
                    {i !== stops.length - 1 && (
                      <View className="mt-1 w-[2px] flex-1 bg-[#E5E7EB]" />
                    )}
                  </View>
                  <View className="flex-1 pb-3">
                    <Text
                      className="text-[14px] font-medium"
                      style={{ color: textColor }}
                    >
                      {s.title}
                    </Text>
                    <Text className="text-[12px] text-[#6A7282]">
                      {s.time}
                    </Text>
                  </View>
                </View>
              );
            })}
          </ScrollView>
        </View>

        <View className="mt-4 flex-row gap-3">
          <Pressable
            onPress={onEmergencyStop}
            className="h-[50px] flex-1 flex-row items-center justify-center gap-2 rounded-2xl border border-[#FFC9C9] bg-white"
          >
            <AlertCircleIcon size={18} color="#E7000B" />
            <Text className="text-[14px] font-medium text-[#E7000B]">
              Emergency Stop
            </Text>
          </Pressable>
          <Pressable
            onPress={handleNextStop}
            disabled={advancing}
            className="h-[50px] flex-1 items-center justify-center rounded-2xl bg-[#9810FA]"
          >
            <Text className="text-[14px] font-medium text-white">
              Next Stop
            </Text>
          </Pressable>
        </View>
      </View>

      {showStopDetails && (
        <View className="absolute inset-0 bg-black/40">
          <Pressable
            className="flex-1"
            onPress={() => setShowStopDetails(false)}
          />
          <View
            className="rounded-t-3xl bg-white px-6 pb-6 pt-5"
            style={{
              shadowColor: '#000',
              shadowOffset: { width: 0, height: -4 },
              shadowOpacity: 0.12,
              shadowRadius: 10,
              elevation: 8,
            }}
          >
            <View className="flex-row items-center justify-between">
              <Text className="text-[18px] font-semibold text-[#1E293B]">
                Stop Details
              </Text>
              <Pressable
                onPress={() => setShowStopDetails(false)}
                hitSlop={8}
              >
                <CloseIcon size={22} color="#6A7282" />
              </Pressable>
            </View>

            <View className="mt-4 rounded-2xl bg-[#FAF5FF] p-4">
              <View className="flex-row items-center gap-2">
                <LocationPinSmallIcon size={18} color="#9810FA" />
                <Text className="text-base font-semibold text-[#1E293B]">
                  {currentStop.title}
                </Text>
              </View>
              <View className="mt-2 flex-row gap-4">
                {currentStop.boarding != null && (
                  <Text className="text-[13px] text-[#00A63E]">
                    ↑ Boarding {currentStop.boarding} passengers
                  </Text>
                )}
                {currentStop.dropping != null && (
                  <Text className="text-[13px] text-[#E7000B]">
                    ↓ Dropping {currentStop.dropping} passengers
                  </Text>
                )}
              </View>
            </View>

            <View className="mt-4 max-h-[220px]">
              <ScrollView showsVerticalScrollIndicator={false}>
                <View className="gap-2">
                  {(currentStop.passengers ?? []).map(p => (
                    <View
                      key={p.id}
                      className="flex-row items-center justify-between rounded-2xl bg-[#F9FAFB] px-4 py-3"
                    >
                      <View className="flex-row items-center gap-3">
                        <View className="h-10 w-10 items-center justify-center rounded-full bg-[#E9D4FF]">
                          <Text className="text-base font-semibold text-[#8200DB]">
                            {p.initial}
                          </Text>
                        </View>
                        <Text className="text-base font-medium text-[#1E293B]">
                          {p.name}
                        </Text>
                      </View>
                      <Pressable
                        hitSlop={8}
                        className="h-8 w-8 items-center justify-center rounded-full bg-[#0097B3]"
                      >
                        <PhoneIcon size={16} color="white" />
                      </Pressable>
                    </View>
                  ))}
                </View>
              </ScrollView>
            </View>

            <Pressable
              onPress={() => setShowStopDetails(false)}
              className="mt-4 h-[50px] items-center justify-center rounded-2xl bg-[#9810FA]"
            >
              <Text className="text-[14px] font-medium text-white">
                Back to Journey
              </Text>
            </Pressable>
          </View>
        </View>
      )}
    </View>
  );
}

export default JourneyInProgressScreen;
