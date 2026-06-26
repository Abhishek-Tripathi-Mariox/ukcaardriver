import { Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppStore, type LanguageCode } from '../store';

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
        <View className="px-7 pt-7 pb-4 flex-row items-center justify-between">
          <Text className="text-[26px] font-bold text-slate-900">
            Choose Language
          </Text>
          <Pressable
            onPress={onClose}
            hitSlop={12}
            className="h-8 w-8 items-center justify-center rounded-full bg-brand-teal"
          >
            <Text className="text-white text-base font-semibold leading-none">
              ×
            </Text>
          </Pressable>
        </View>

        <View className="px-6 flex-row flex-wrap justify-between gap-y-3">
          {LANGUAGES.map(lang => {
            const selected = language === lang.code;
            return (
              <Pressable
                key={lang.code}
                onPress={() => setLanguage(lang.code)}
                className={`w-[48%] h-[60px] flex-row items-center rounded-2xl bg-white px-3 ${
                  selected ? 'border-2 border-brand-teal' : 'border border-slate-200'
                }`}
              >
                <View className="h-9 w-9 items-center justify-center rounded-full overflow-hidden bg-slate-100">
                  <Text className="text-[22px]">{lang.flag}</Text>
                </View>
                <Text className="ml-3 text-[17px] font-semibold text-slate-900">
                  {lang.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <View className="px-6 pt-6 pb-2">
          <Pressable
            onPress={onContinue}
            className="h-12 items-center justify-center rounded-xl bg-brand-teal"
          >
            <Text className="text-white text-base font-semibold">Continue</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </View>
  );
}

export default ChooseLanguageScreen;
