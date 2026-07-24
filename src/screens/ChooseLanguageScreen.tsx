import { Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppStore, type LanguageCode } from '../store';
import { fs, s, vs } from '../theme/responsive';

interface LanguageOption {
  code: LanguageCode;
  label: string;
  flag: string;
}

const LANGUAGES: LanguageOption[] = [
  { code: 'en', label: 'English', flag: '🇬🇧' },
  { code: 'hi', label: 'Hindi', flag: '🇮🇳' },
  { code: 'es', label: 'Spanish', flag: '🇦🇷' },
  { code: 'ja', label: 'Japanese', flag: '🇯🇵' },
  { code: 'de', label: 'German', flag: '🇩🇪' },
  { code: 'ko', label: 'Korean', flag: '🇰🇷' },
  { code: 'zh-HK', label: 'Cantonese', flag: '🇨🇦' },
  { code: 'vi', label: 'Vietnamese', flag: '🇻🇳' },
];

interface ChooseLanguageScreenProps {
  onContinue?: () => void;
  onClose?: () => void;
}

export function ChooseLanguageScreen({
  onContinue,
  onClose,
}: ChooseLanguageScreenProps) {
  const language = useAppStore(state => state.language);
  const setLanguage = useAppStore(state => state.setLanguage);

  return (
    <View className="flex-1 bg-black/40 justify-end">
      <SafeAreaView edges={['bottom']} className="bg-[#E8F7FA] rounded-t-3xl">
        <View
          style={{ paddingHorizontal: s(28), paddingTop: vs(28), paddingBottom: vs(16) }}
          className="flex-row items-center justify-between"
        >
          <Text
            style={{ fontSize: fs(26) }}
            className="font-poppins-bold text-slate-900"
          >
            Choose Language
          </Text>
          <Pressable
            onPress={onClose}
            hitSlop={12}
            style={{ height: s(32), width: s(32) }}
            className="items-center justify-center rounded-full bg-brand-teal"
          >
            <Text
              style={{ fontSize: fs(18) }}
              className="font-poppins-semibold leading-none text-white"
            >
              ×
            </Text>
          </Pressable>
        </View>

        <View
          style={{ paddingHorizontal: s(24), gap: vs(12) }}
          className="flex-row flex-wrap justify-between"
        >
          {LANGUAGES.map(lang => {
            const selected = language === lang.code;
            return (
              <Pressable
                key={lang.code}
                onPress={() => setLanguage(lang.code)}
                style={{ height: vs(60), paddingHorizontal: s(12), borderRadius: s(16) }}
                className={`w-[48%] flex-row items-center bg-white ${
                  selected ? 'border-2 border-brand-teal' : 'border border-slate-200'
                }`}
              >
                <View
                  style={{ height: s(36), width: s(36) }}
                  className="items-center justify-center overflow-hidden rounded-full bg-slate-100"
                >
                  <Text style={{ fontSize: fs(22) }}>{lang.flag}</Text>
                </View>
                <Text
                  style={{ marginLeft: s(12), fontSize: fs(17) }}
                  className="font-poppins-semibold text-slate-900"
                >
                  {lang.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <View
          style={{ paddingHorizontal: s(24), paddingTop: vs(24), paddingBottom: vs(8) }}
        >
          <Pressable
            onPress={onContinue}
            style={{ height: vs(54), borderRadius: s(16) }}
            className="items-center justify-center bg-brand-teal"
          >
            <Text
              style={{ fontSize: fs(17) }}
              className="font-poppins-medium text-white"
            >
              Continue
            </Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </View>
  );
}

export default ChooseLanguageScreen;
