import { Pressable, Text, View } from 'react-native';
import { useAppStore, type LanguageCode } from '../store';

const LANG_META: Record<LanguageCode, { flag: string; short: string }> = {
  en: { flag: '🇬🇧', short: 'EN' },
  hi: { flag: '🇮🇳', short: 'HI' },
  es: { flag: '🇦🇷', short: 'ES' },
  ja: { flag: '🇯🇵', short: 'JA' },
  de: { flag: '🇩🇪', short: 'DE' },
  ko: { flag: '🇰🇷', short: 'KO' },
  'zh-HK': { flag: '🇨🇦', short: 'HK' },
  vi: { flag: '🇻🇳', short: 'VI' },
};

interface LanguageBarProps {
  onPress: () => void;
  tint?: 'light' | 'dark';
}

export function LanguageBar({ onPress, tint = 'light' }: LanguageBarProps) {
  const language = useAppStore(state => state.language);
  const meta = LANG_META[language];
  const isLight = tint === 'light';

  return (
    <View className="w-full flex-row justify-end px-4 pt-2">
      <Pressable
        onPress={onPress}
        hitSlop={8}
        className={`flex-row items-center rounded-full px-3 py-1.5 ${
          isLight ? 'bg-white/20' : 'bg-slate-100'
        }`}
      >
        <Text className="text-lg mr-1.5">{meta.flag}</Text>
        <Text
          className={`text-xs font-semibold ${
            isLight ? 'text-white' : 'text-slate-800'
          }`}
        >
          {meta.short}
        </Text>
      </Pressable>
    </View>
  );
}

export default LanguageBar;
