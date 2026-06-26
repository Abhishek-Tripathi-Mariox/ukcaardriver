import { create } from 'zustand';

export type LanguageCode =
  | 'en'
  | 'hi'
  | 'es'
  | 'ja'
  | 'de'
  | 'ko'
  | 'zh-HK'
  | 'vi';

interface AppState {
  language: LanguageCode;
  hasOnboarded: boolean;
  setLanguage: (language: LanguageCode) => void;
  completeOnboarding: () => void;
}

export const useAppStore = create<AppState>(set => ({
  language: 'en',
  hasOnboarded: false,
  setLanguage: language => set({ language }),
  completeOnboarding: () => set({ hasOnboarded: true }),
}));
