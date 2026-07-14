import { Pressable, Text, View } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BackArrowIcon } from './icons/ServiceTypeIcons';
import { fs, s, vs } from '../theme/responsive';

interface GradientHeaderProps {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  rightElement?: React.ReactNode;
  /** Set to true if header should have curved bottom corners per Figma Welcome/Dashboard */
  curvedBottom?: boolean;
}

export function GradientHeader({
  title,
  subtitle,
  onBack,
  rightElement,
  curvedBottom = false,
}: GradientHeaderProps) {
  return (
    <LinearGradient
      colors={['#0097B3', '#00C896']}
      start={{ x: 0.5, y: 0 }}
      end={{ x: 0.5, y: 1 }}
      style={
        curvedBottom
          ? {
              borderBottomLeftRadius: s(32),
              borderBottomRightRadius: s(32),
              overflow: 'hidden',
            }
          : undefined
      }
    >
      <SafeAreaView edges={['top']}>
        <View
          style={{
            paddingHorizontal: s(20),
            paddingTop: vs(14),
            paddingBottom: curvedBottom ? vs(32) : vs(16),
          }}
        >
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center flex-1" style={{ gap: s(12) }}>
              {onBack ? (
                <Pressable onPress={onBack} hitSlop={12}>
                  <BackArrowIcon size={s(24)} color="white" />
                </Pressable>
              ) : null}
              <View className="flex-1">
                <Text
                  className="font-poppins-semibold text-white"
                  style={{ fontSize: fs(20) }}
                  numberOfLines={1}
                >
                  {title}
                </Text>
                {subtitle ? (
                  <Text
                    className="font-poppins text-white/90"
                    style={{ fontSize: fs(14), marginTop: vs(2) }}
                    numberOfLines={1}
                  >
                    {subtitle}
                  </Text>
                ) : null}
              </View>
            </View>
            {rightElement ? <View>{rightElement}</View> : null}
          </View>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

export default GradientHeader;
