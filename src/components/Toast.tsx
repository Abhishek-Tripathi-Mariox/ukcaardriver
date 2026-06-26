import { useEffect, useRef } from 'react';
import { Animated, Text, View } from 'react-native';
import { CheckIcon } from './icons/ServiceTypeIcons';

interface ToastProps {
  visible: boolean;
  message: string;
  onHide?: () => void;
  duration?: number;
}

export function Toast({ visible, message, onHide, duration = 3000 }: ToastProps) {
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) return;
    Animated.timing(opacity, {
      toValue: 1,
      duration: 200,
      useNativeDriver: true,
    }).start();

    const timer = setTimeout(() => {
      Animated.timing(opacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start(() => onHide?.());
    }, duration);

    return () => clearTimeout(timer);
  }, [visible, duration, onHide, opacity]);

  if (!visible) return null;

  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        left: 16,
        right: 16,
        bottom: 32,
        opacity,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 6,
      }}
    >
      <View className="flex-row items-center gap-3 rounded-lg border border-[#BFFCD9] bg-[#ECFDF3] px-4 py-3">
        <View className="h-5 w-5 items-center justify-center rounded-full bg-[#00C896]">
          <CheckIcon size={12} color="white" />
        </View>
        <Text className="flex-1 text-[13px] text-[#008A2E]">{message}</Text>
      </View>
    </Animated.View>
  );
}

export default Toast;
