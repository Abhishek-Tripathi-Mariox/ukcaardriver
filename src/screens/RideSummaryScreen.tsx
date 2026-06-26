import { useMemo, useRef, useState } from 'react';
import {
  Animated,
  PanResponder,
  Pressable,
  ScrollView,
  StatusBar,
  Text,
  View,
} from 'react-native';
import Svg, { Rect } from 'react-native-svg';
import { SafeAreaView } from 'react-native-safe-area-context';
import FareCalculationsModal from '../components/FareCalculationsModal';
import {
  BackArrowIcon,
  DoubleChevronRightIcon,
  InfoCircleIcon,
  PhoneIcon,
  TicketIcon,
} from '../components/icons/ServiceTypeIcons';

interface RideSummaryScreenProps {
  amount?: string;
  duration?: string;
  onBack?: () => void;
  onContact?: () => void;
  onRaiseTicket?: () => void;
  onCollectedCash?: () => void;
}

function QrPlaceholder({ size = 200 }: { size?: number }) {
  const cells = 21;
  const cell = size / cells;
  const pattern = useMemo(() => {
    const p: boolean[][] = [];
    let seed = 1337;
    const rand = () => {
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280;
    };
    for (let y = 0; y < cells; y++) {
      const row: boolean[] = [];
      for (let x = 0; x < cells; x++) {
        row.push(rand() > 0.55);
      }
      p.push(row);
    }
    const drawFinder = (cx: number, cy: number) => {
      for (let dy = 0; dy < 7; dy++) {
        for (let dx = 0; dx < 7; dx++) {
          const onBorder = dy === 0 || dy === 6 || dx === 0 || dx === 6;
          const onInner = dy >= 2 && dy <= 4 && dx >= 2 && dx <= 4;
          p[cy + dy][cx + dx] = onBorder || onInner;
        }
      }
    };
    drawFinder(0, 0);
    drawFinder(cells - 7, 0);
    drawFinder(0, cells - 7);
    return p;
  }, []);

  return (
    <Svg width={size} height={size}>
      <Rect x={0} y={0} width={size} height={size} fill="white" />
      {pattern.map((row, y) =>
        row.map((on, x) =>
          on ? (
            <Rect
              key={`${x}-${y}`}
              x={x * cell}
              y={y * cell}
              width={cell}
              height={cell}
              fill="#000000"
            />
          ) : null,
        ),
      )}
    </Svg>
  );
}

/**
 * Slide-to-confirm control. The driver drags the white handle to the right;
 * once it passes ~70% of the track it locks in and fires `onConfirm`,
 * otherwise it springs back. Prevents accidental cash-collection taps.
 */
function SlideToConfirm({
  label,
  onConfirm,
}: {
  label: string;
  onConfirm?: () => void;
}) {
  const HANDLE_W = 56;
  const EDGE = 4; // matches the track's inner padding
  const translateX = useRef(new Animated.Value(0)).current;
  const maxXRef = useRef(0);
  const confirmedRef = useRef(false);

  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 3,
      onPanResponderMove: (_, g) => {
        const x = Math.min(Math.max(0, g.dx), maxXRef.current);
        translateX.setValue(x);
      },
      onPanResponderRelease: (_, g) => {
        const max = maxXRef.current;
        const x = Math.min(Math.max(0, g.dx), max);
        if (max > 0 && x >= max * 0.7 && !confirmedRef.current) {
          confirmedRef.current = true;
          Animated.timing(translateX, {
            toValue: max,
            duration: 120,
            useNativeDriver: false,
          }).start(() => onConfirm?.());
        } else {
          Animated.spring(translateX, {
            toValue: 0,
            useNativeDriver: false,
          }).start();
        }
      },
    }),
  ).current;

  return (
    <View
      onLayout={e => {
        maxXRef.current = Math.max(
          0,
          e.nativeEvent.layout.width - HANDLE_W - EDGE * 2,
        );
      }}
      className="h-12 justify-center rounded-xl bg-[#0097B3] px-1"
    >
      <Text className="text-center text-[17px] font-bold text-white">{label}</Text>
      <Animated.View
        {...pan.panHandlers}
        style={{
          position: 'absolute',
          left: EDGE,
          transform: [{ translateX }],
          height: 44,
          width: HANDLE_W,
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 10,
          backgroundColor: '#ffffff',
        }}
      >
        <DoubleChevronRightIcon size={24} color="#0097B3" />
      </Animated.View>
    </View>
  );
}

export function RideSummaryScreen({
  amount = '₹489.56',
  duration = '1 Hr 58 Mins',
  onBack,
  onContact,
  onRaiseTicket,
  onCollectedCash,
}: RideSummaryScreenProps) {
  const [fareVisible, setFareVisible] = useState(false);

  return (
    <View className="flex-1 bg-white">
      <StatusBar barStyle="light-content" />

      <View className="bg-[#0097B3]">
        <SafeAreaView edges={['top']}>
          <View className="flex-row items-center gap-5 px-4 py-4">
            <Pressable onPress={onBack} hitSlop={10}>
              <BackArrowIcon size={24} color="white" />
            </Pressable>
            <Text className="flex-1 text-[20px] font-bold text-white">Summary</Text>
          </View>
        </SafeAreaView>
      </View>

      <View className="items-center bg-[#00C896] py-4">
        <Text className="text-[13px] font-bold text-white">Amount to be Collected</Text>
        <Pressable
          onPress={() => setFareVisible(true)}
          className="mt-1 flex-row items-center gap-1"
        >
          <Text
            className="text-[28px] font-bold text-white"
            style={{ letterSpacing: -0.4 }}
          >
            {amount}
          </Text>
          <InfoCircleIcon size={20} color="white" />
        </Pressable>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerClassName="px-4 pb-6 pt-4"
        showsVerticalScrollIndicator={false}
      >
        <View className="rounded-2xl border border-[#0097B3] bg-[#F0F5FF] p-4">
          <Text className="text-center text-[13px] text-[#0097B3]">DURATION OF USE</Text>
          <Text className="text-center text-[17px] font-bold text-[#0097B3]">{duration}</Text>
        </View>

        <View className="mt-10 items-center">
          <Text className="text-[20px] font-bold text-[#132235]">QR Code</Text>
          <Text className="mt-1 text-[15px] text-[#364B63]">Scan & Pay</Text>
          <View className="mt-4">
            <QrPlaceholder size={200} />
          </View>
        </View>
      </ScrollView>

      <View className="border-t border-[#E1E6EF] bg-white px-4 pt-4">
        <View className="flex-row gap-3">
          <Pressable
            onPress={onContact}
            className="flex-1 flex-row items-center justify-center gap-2 rounded-2xl border border-[#E1E6EF] bg-white p-3"
            style={{
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.05,
              shadowRadius: 3,
              elevation: 1,
            }}
          >
            <PhoneIcon size={18} color="#0097B3" />
            <Text className="text-[13px] text-[#0097B3]">Contact</Text>
          </Pressable>
          <Pressable
            onPress={onRaiseTicket}
            className="flex-1 flex-row items-center justify-center gap-2 rounded-2xl border border-[#E1E6EF] bg-white p-3"
            style={{
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.05,
              shadowRadius: 3,
              elevation: 1,
            }}
          >
            <TicketIcon size={18} color="#E02D3C" />
            <Text className="text-[13px] text-[#E02D3C]">Raise Ticket</Text>
          </Pressable>
        </View>

        <SafeAreaView edges={['bottom']}>
          <View className="mb-2 mt-3">
            <SlideToConfirm label="Slide to confirm cash" onConfirm={onCollectedCash} />
          </View>
        </SafeAreaView>
      </View>

      <FareCalculationsModal visible={fareVisible} onClose={() => setFareVisible(false)} />
    </View>
  );
}

export default RideSummaryScreen;
