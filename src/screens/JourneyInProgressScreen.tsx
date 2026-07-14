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
import { fs, s, vs } from '../theme/responsive';

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
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      <LinearGradient
        colors={['#AD46FF', '#9810FA']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
      >
        <SafeAreaView edges={['top']}>
          <View
            className="flex-row items-center"
            style={{ paddingHorizontal: s(24), paddingBottom: vs(16), paddingTop: vs(8), gap: s(16) }}
          >
            <Pressable onPress={onBack} hitSlop={10}>
              <BackArrowIcon size={s(22)} color="white" />
            </Pressable>
            <View className="flex-1">
              <Text
                className="font-poppins-semibold text-white"
                style={{ fontSize: fs(20), lineHeight: fs(28) }}
              >
                Journey in Progress
              </Text>
              <Text
                className="text-white/80 font-poppins-regular"
                style={{ fontSize: fs(14) }}
              >
                {title}
              </Text>
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
            <RoutingIcon size={s(40)} color="#6E11B0" />
            <Text
              className="font-poppins-medium text-[#6E11B0]"
              style={{ fontSize: fs(16), marginTop: vs(8) }}
            >
              Live Tracking
            </Text>
            <Text
              className="text-[#9810FA] font-poppins-medium"
              style={{ fontSize: fs(14) }}
            >
              Navigate to next stop
            </Text>
          </View>
        </LinearGradient>

        <View
          className="absolute left-0 right-0"
          style={{ top: vs(16), paddingHorizontal: s(16) }}
        >
          <View
            className="bg-white"
            style={{
              borderRadius: s(16),
              padding: s(16),
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.1,
              shadowRadius: 6,
              elevation: 3,
            }}
          >
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center" style={{ gap: s(8) }}>
                <View className="rounded-full bg-[#9810FA]" style={{ width: s(8), height: s(8) }} />
                <Text className="font-poppins-medium text-[#6A7282]" style={{ fontSize: fs(12) }}>
                  Next Stop
                </Text>
              </View>
              <Text className="font-poppins-semibold text-[#9810FA]" style={{ fontSize: fs(14) }}>
                ETA: {etaMins} mins
              </Text>
            </View>
            <Text
              className="font-poppins-semibold text-[#1E293B]"
              style={{ fontSize: fs(16), marginTop: vs(8) }}
            >
              {currentStop.title}
            </Text>
          </View>
        </View>

        <View
          className="absolute left-0 right-0"
          style={{ bottom: vs(16), paddingHorizontal: s(16) }}
        >
          <View
            className="bg-white"
            style={{
              borderRadius: s(16),
              padding: s(16),
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.1,
              shadowRadius: 6,
              elevation: 3,
            }}
          >
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center" style={{ gap: s(12) }}>
                <UsersIcon size={s(20)} color="#9810FA" />
                <View>
                  <Text className="text-[#6A7282] font-poppins-regular" style={{ fontSize: fs(12) }}>
                    On Board
                  </Text>
                  <Text className="font-poppins-semibold text-[#1E293B]" style={{ fontSize: fs(16) }}>
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
                <Text className="font-poppins-medium text-[#9810FA]" style={{ fontSize: fs(14) }}>
                  View Details
                </Text>
              </Pressable>
            </View>
          </View>
        </View>

        <Pressable
          onPress={onSos}
          className="absolute items-center justify-center rounded-full bg-[#E7000B]"
          style={{
            bottom: vs(96),
            right: s(16),
            width: s(56),
            height: s(56),
            shadowColor: '#E7000B',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.4,
            shadowRadius: 6,
            elevation: 4,
          }}
        >
          <SOSAlertIcon size={s(24)} color="white" />
        </Pressable>
      </View>

      <View
        className="rounded-t-3xl bg-white"
        style={{
          paddingHorizontal: s(24),
          paddingBottom: vs(24),
          paddingTop: vs(20),
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.08,
          shadowRadius: 8,
          elevation: 6,
        }}
      >
        <Text
          className="font-poppins-semibold text-[#1E293B]"
          style={{ fontSize: fs(18) }}
        >
          Journey Progress
        </Text>
        <View style={{ marginTop: vs(16), maxHeight: vs(180) }}>
          <ScrollView showsVerticalScrollIndicator={false}>
            {stops.map((stop, i) => {
              const completed = stop.index < currentStopIndex;
              const active = stop.index === currentStopIndex;
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
                <View key={stop.index} className="flex-row" style={{ gap: s(12) }}>
                  <View className="items-center">
                    <View
                      className="items-center justify-center rounded-full"
                      style={{ width: s(24), height: s(24), backgroundColor: dotBg }}
                    >
                      {completed ? (
                        <CheckIcon size={s(14)} color="white" />
                      ) : active ? (
                        <View className="rounded-full bg-white" style={{ width: s(8), height: s(8) }} />
                      ) : null}
                    </View>
                    {i !== stops.length - 1 && (
                      <View className="flex-1 bg-[#E5E7EB]" style={{ marginTop: vs(4), width: s(2) }} />
                    )}
                  </View>
                  <View className="flex-1" style={{ paddingBottom: vs(12) }}>
                    <Text
                      className="font-poppins-medium"
                      style={{ fontSize: fs(14), color: textColor }}
                    >
                      {stop.title}
                    </Text>
                    <Text className="text-[#6A7282] font-poppins-regular" style={{ fontSize: fs(12) }}>
                      {stop.time}
                    </Text>
                  </View>
                </View>
              );
            })}
          </ScrollView>
        </View>

        <View style={{ marginTop: vs(16) }}>
          <Pressable
            onPress={handleNextStop}
            disabled={advancing}
            className="w-full items-center justify-center bg-[#9810FA]"
            style={{ height: s(50), borderRadius: s(16) }}
          >
            <Text className="font-poppins-medium text-white" style={{ fontSize: fs(14) }}>
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
            className="rounded-t-3xl bg-white"
            style={{
              paddingHorizontal: s(24),
              paddingBottom: vs(24),
              paddingTop: vs(20),
              shadowColor: '#000',
              shadowOffset: { width: 0, height: -4 },
              shadowOpacity: 0.12,
              shadowRadius: 10,
              elevation: 8,
            }}
          >
            <View className="flex-row items-center justify-between">
              <Text className="font-poppins-semibold text-[#1E293B]" style={{ fontSize: fs(18) }}>
                Stop Details
              </Text>
              <Pressable
                onPress={() => setShowStopDetails(false)}
                hitSlop={8}
              >
                <CloseIcon size={s(22)} color="#6A7282" />
              </Pressable>
            </View>

            <View
              className="bg-[#FAF5FF]"
              style={{ borderRadius: s(16), padding: s(16), marginTop: vs(16) }}
            >
              <View className="flex-row items-center" style={{ gap: s(8) }}>
                <LocationPinSmallIcon size={s(18)} color="#9810FA" />
                <Text className="font-poppins-semibold text-[#1E293B]" style={{ fontSize: fs(16) }}>
                  {currentStop.title}
                </Text>
              </View>
              <View className="flex-row" style={{ marginTop: vs(8), gap: s(16) }}>
                {currentStop.boarding != null && (
                  <Text className="text-[#00A63E] font-poppins-medium" style={{ fontSize: fs(13) }}>
                    ↑ Boarding {currentStop.boarding} passengers
                  </Text>
                )}
                {currentStop.dropping != null && (
                  <Text className="text-[#E7000B] font-poppins-medium" style={{ fontSize: fs(13) }}>
                    ↓ Dropping {currentStop.dropping} passengers
                  </Text>
                )}
              </View>
            </View>

            <View style={{ marginTop: vs(16), maxHeight: vs(220) }}>
              <ScrollView showsVerticalScrollIndicator={false}>
                <View style={{ gap: vs(8) }}>
                  {(currentStop.passengers ?? []).map(p => (
                    <View
                      key={p.id}
                      className="flex-row items-center justify-between bg-[#F9FAFB]"
                      style={{ borderRadius: s(16), paddingHorizontal: s(16), paddingVertical: vs(12) }}
                    >
                      <View className="flex-row items-center" style={{ gap: s(12) }}>
                        <View
                          className="items-center justify-center rounded-full bg-[#E9D4FF]"
                          style={{ width: s(40), height: s(40) }}
                        >
                          <Text className="font-poppins-semibold text-[#8200DB]" style={{ fontSize: fs(16) }}>
                            {p.initial}
                          </Text>
                        </View>
                        <Text className="font-poppins-medium text-[#1E293B]" style={{ fontSize: fs(16) }}>
                          {p.name}
                        </Text>
                      </View>
                      <Pressable
                        hitSlop={8}
                        className="items-center justify-center rounded-full bg-[#0097B3]"
                        style={{ width: s(32), height: s(32) }}
                      >
                        <PhoneIcon size={s(16)} color="white" />
                      </Pressable>
                    </View>
                  ))}
                </View>
              </ScrollView>
            </View>

            <Pressable
              onPress={() => setShowStopDetails(false)}
              className="items-center justify-center bg-[#9810FA]"
              style={{ marginTop: vs(16), height: s(50), borderRadius: s(16) }}
            >
              <Text className="font-poppins-medium text-white" style={{ fontSize: fs(14) }}>
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
