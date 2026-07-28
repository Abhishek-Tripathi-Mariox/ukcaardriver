import { useEffect, useRef } from 'react';
import { Animated, Easing, Image, StatusBar, Text, View } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { logoUkcaar } from '../assets/images';
import { fs, s, vs } from '../theme/responsive';

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
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      <LinearGradient
        colors={['#0097B3', '#00C896']}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        className="flex-1 items-center justify-center"
      >
        <View className="items-center">
          {/* LogoGlow removed: it is a solid `fill="white"` circle (see
              logo-glow.svg) positioned at cy=95.5 in a 241 viewBox — i.e. off
              centre — and stretched by preserveAspectRatio="none". It was meant
              to sit behind a TRANSPARENT logo, but logo-ukcaar.png is opaque
              with a baked-in teal background, so the glow only ever showed as a
              misaligned white ring around it. The artwork already carries its
              own circular design, so the image stands alone. */}
          <View
            style={{ height: s(180), width: s(180) }}
            className="items-center justify-center overflow-hidden rounded-full"
          >
            <Image
              source={logoUkcaar}
              resizeMode="cover"
              style={{ height: s(180), width: s(180) }}
            />
          </View>

          <View style={{ marginTop: vs(48) }} className="items-center">
            <Text
              style={{ fontSize: fs(36), lineHeight: fs(40) }}
              className="font-poppins-bold text-white"
            >
              UKCAAR
            </Text>
            <Text
              style={{ fontSize: fs(20), lineHeight: fs(28), marginTop: vs(8) }}
              className="font-poppins-light text-white/90"
            >
              Drive Smarter. Earn Better.
            </Text>
          </View>

          <View
            style={{ marginTop: vs(32), height: vs(8), width: s(240) }}
            className="overflow-hidden rounded-full bg-white/30"
          >
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
