import type { ComponentType } from 'react';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronRightIcon, CloseIcon } from './icons/ServiceTypeIcons';
import { fs, s, vs } from '../theme/responsive';

export interface DriverMenuItem {
  key: string;
  label: string;
  Icon: ComponentType<{ size?: number; color?: string }>;
  onPress?: () => void;
  /** Optional count badge (e.g. unread notifications). */
  badge?: number;
  /** Renders in red (e.g. Logout). */
  danger?: boolean;
}

/**
 * Slide-up menu opened by the header hamburger and the bottom "Menu" tab.
 * Hosts the destinations that don't have a dedicated bottom tab (Wallet,
 * Notifications, Documents, Bank, Refer & Earn, OnePass, Help, Logout).
 */
export function DriverMenuSheet({
  visible,
  onClose,
  items,
}: {
  visible: boolean;
  onClose: () => void;
  items: DriverMenuItem[];
}) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable className="flex-1 bg-black/40" onPress={onClose} />
      <View
        className="absolute bottom-0 left-0 right-0 rounded-t-3xl bg-white"
        style={{ maxHeight: '82%' }}
      >
        <View style={{ paddingBottom: Math.max(insets.bottom, 12) + 12 }}>
          <View className="items-center" style={{ paddingTop: vs(10) }}>
            <View style={{ width: s(40), height: 4, borderRadius: 2 }} className="bg-[#E5E7EB]" />
          </View>
          <View
            className="flex-row items-center justify-between"
            style={{ paddingHorizontal: s(20), paddingVertical: vs(12) }}
          >
            <Text className="font-poppins-semibold text-[#1E293B]" style={{ fontSize: fs(18) }}>
              Menu
            </Text>
            <Pressable onPress={onClose} hitSlop={8} accessibilityLabel="Close menu">
              <CloseIcon size={s(22)} color="#6A7282" />
            </Pressable>
          </View>
          <ScrollView style={{ paddingHorizontal: s(12) }} showsVerticalScrollIndicator={false}>
            {items.map(item => (
              <Pressable
                key={item.key}
                onPress={() => {
                  onClose();
                  item.onPress?.();
                }}
                className="flex-row items-center"
                style={{ paddingHorizontal: s(12), paddingVertical: vs(14), gap: s(14) }}
              >
                <View
                  className="items-center justify-center rounded-full bg-[#F0F0FA]"
                  style={{ width: s(40), height: s(40) }}
                >
                  <item.Icon size={s(20)} color={item.danger ? '#E7000B' : '#0097B3'} />
                </View>
                <Text
                  className={`flex-1 font-poppins-medium ${
                    item.danger ? 'text-[#E7000B]' : 'text-[#1E293B]'
                  }`}
                  style={{ fontSize: fs(15) }}
                  numberOfLines={1}
                >
                  {item.label}
                </Text>
                {item.badge ? (
                  <View
                    className="rounded-full bg-[#E02D3C]"
                    style={{ paddingHorizontal: s(7), paddingVertical: vs(2) }}
                  >
                    <Text className="font-poppins-bold text-white" style={{ fontSize: fs(11) }}>
                      {item.badge > 99 ? '99+' : item.badge}
                    </Text>
                  </View>
                ) : (
                  <ChevronRightIcon size={s(18)} color="#9CA3AF" />
                )}
              </Pressable>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

export default DriverMenuSheet;
