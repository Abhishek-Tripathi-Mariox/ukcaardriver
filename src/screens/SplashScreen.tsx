import { useEffect, useRef } from 'react';
import { Animated, Easing, Image, StatusBar, Text, View } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { LogoGlow, logoUkcaar } from '../assets/images';

interface SplashScreenProps {
  onFinish?: () => void;
  duration?: number;
}

export function SplashScreen({ onFinish, duration = 2500 }: SplashScreenProps) {
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(progress, {
      toValue: 1,
      duration,
      easing: Easing.inOut(Easing.ease),
      useNativeDriver: false,
    }).start(({ finished }) => {
      if (finished) {
        onFinish?.();
      }
    });
  }, [duration, onFinish, progress]);

  const progressWidth = progress.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <View className="flex-1">
      <StatusBar barStyle="light-content" backgroundColor="#0097B3" translucent />
      <LinearGradient
        colors={['#0097B3', '#00C896']}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        className="flex-1 items-center justify-center"
      >
        <View className="items-center">
          <View className="h-[215px] w-[215px] items-center justify-center">
            <View className="absolute h-[215px] w-[215px]">
              <LogoGlow width="100%" height="100%" />
            </View>
            <View className="h-[160px] w-[160px] items-center justify-center overflow-hidden rounded-full bg-white">
              <Image
                source={logoUkcaar}
                resizeMode="cover"
                className="h-[160px] w-[160px]"
              />
            </View>
          </View>

          <View className="mt-14 items-center">
            <Text className="text-[36px] font-bold leading-[40px] text-white">
              UKCAAR
            </Text>
            <Text className="mt-2 text-[20px] font-light leading-7 text-white/90">
              Drive Smarter. Earn Better.
            </Text>
          </View>

          <View className="mt-8 h-2 w-64 overflow-hidden rounded-full bg-white/30">
            <Animated.View
              style={{ width: progressWidth }}
              className="h-full bg-brand-teal"
            />
          </View>
        </View>
      </LinearGradient>
    </View>
  );
}

export default SplashScreen;
