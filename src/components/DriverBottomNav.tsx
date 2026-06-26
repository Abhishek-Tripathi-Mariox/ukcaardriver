import { Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  TabEarningsIcon,
  TabHomeIcon,
  TabProfileIcon,
  TabRidesIcon,
} from './icons/ServiceTypeIcons';

export type DriverTab = 'home' | 'rides' | 'earnings' | 'profile';

interface DriverBottomNavProps {
  active: DriverTab;
  onChange: (tab: DriverTab) => void;
}

/**
 * Persistent bottom nav shared by the top-level driver screens (Home, Rides,
 * Earnings, Profile, Menu). Owns its own SafeAreaView so the bar always sits
 * above the system gesture area, regardless of the host screen.
 *
 * NOTE: when a host screen has a ScrollView, that ScrollView's content needs
 * `pb-28` (~112px) so its last items aren't hidden under this bar. The bar
 * itself is ~70px + bottom safe-area inset.
 */
export function DriverBottomNav({ active, onChange }: DriverBottomNavProps) {
  const tabs = [
    { id: 'home' as const, label: 'Home', Icon: TabHomeIcon },
    { id: 'rides' as const, label: 'Rides', Icon: TabRidesIcon },
    { id: 'earnings' as const, label: 'Earnings', Icon: TabEarningsIcon },
    { id: 'profile' as const, label: 'Profile', Icon: TabProfileIcon },
  ];

  return (
    <SafeAreaView edges={['bottom']} className="border-t border-[#E5E7EB] bg-white">
      <View className="flex-row items-center justify-between px-2 pt-3">
        {tabs.map(({ id, label, Icon }) => {
          const isActive = active === id;
          return (
            <Pressable
              key={id}
              onPress={() => onChange(id)}
              className={`flex-1 items-center justify-center rounded-2xl py-2 ${
                isActive ? 'bg-brand-teal/10' : ''
              }`}
            >
              <Icon size={20} color={isActive ? '#0097B3' : '#6A7282'} />
              <Text
                className={`mt-1 text-[12px] font-medium ${
                  isActive ? 'text-brand-teal' : 'text-[#6A7282]'
                }`}
              >
                {label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </SafeAreaView>
  );
}

export default DriverBottomNav;
