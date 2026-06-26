import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StatusBar, Text, View } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  hasCriticalDriverPermissions,
  isAggressiveOemDevice,
  isBatteryOptimizationEnabled,
  openAppSettings,
  openBatteryOptimizationSettings,
  requestAllDriverPermissions,
} from '../services/permissions';

interface PermissionsGateScreenProps {
  onAllGranted: () => void;
}

/**
 * Blocking screen the driver sees when notifications or location are not
 * granted. The dashboard cannot be entered without these — without them
 * the driver gets no rides and the customer map shows them as offline.
 *
 * Three rows, each with its own state + CTA:
 *   1. Notifications — required to ring on a ride request
 *   2. Location      — required to be dispatched
 *   3. Battery whitelist — only shown on aggressive OEMs (Xiaomi/Vivo/Oppo);
 *                          this is what lets pushes survive after the OS
 *                          kills the app in the background.
 *
 * The first two are hard-blockers (button disabled until granted). The
 * battery whitelist is strongly recommended but not strictly required to
 * proceed — the driver can finish onboarding without it but they'll miss
 * pushes after a few minutes idle.
 */
export function PermissionsGateScreen({ onAllGranted }: PermissionsGateScreenProps) {
  const [notif, setNotif] = useState(false);
  const [loc, setLoc] = useState(false);
  const [batteryWhitelisted, setBatteryWhitelisted] = useState(true);
  const [showOem, setShowOem] = useState(false);
  const [busy, setBusy] = useState(false);

  const refreshStatus = async () => {
    const status = await hasCriticalDriverPermissions();
    setNotif(status.notifications);
    setLoc(status.location);
    if (isAggressiveOemDevice()) {
      setShowOem(true);
      const optimized = await isBatteryOptimizationEnabled();
      setBatteryWhitelisted(!optimized);
    } else {
      setBatteryWhitelisted(true);
    }
    if (status.notifications && status.location) {
      onAllGranted();
    }
  };

  useEffect(() => {
    refreshStatus();
  }, []);

  // Re-check whenever the user comes back from settings (best-effort: we
  // don't get a focus event without React Navigation, so a periodic poll
  // every 1.5s while this screen is mounted handles the "left → granted →
  // came back" round trip.
  useEffect(() => {
    const id = setInterval(refreshStatus, 1500);
    return () => clearInterval(id);
  }, []);

  const requestAgain = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await requestAllDriverPermissions();
      await refreshStatus();
    } finally {
      setBusy(false);
    }
  };

  return (
    <View className="flex-1 bg-[#F5F3F8]">
      <StatusBar barStyle="light-content" backgroundColor="#0097B3" translucent />
      <LinearGradient
        colors={['#0097B3', '#00C896']}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
      >
        <SafeAreaView edges={['top']}>
          <View className="px-4 py-6">
            <Text className="text-center text-[22px] font-bold text-white">
              Enable required permissions
            </Text>
            <Text className="mt-2 text-center text-[14px] text-white/90">
              UKCAAR Driver needs these to send you ride requests.
            </Text>
          </View>
        </SafeAreaView>
      </LinearGradient>

      <ScrollView className="flex-1 px-4 pt-6">
        <PermissionRow
          title="Notifications"
          description="So your phone rings when a passenger requests a ride."
          granted={notif}
          actionLabel={notif ? 'Granted' : 'Allow notifications'}
          onPress={notif ? undefined : requestAgain}
        />

        <PermissionRow
          title="Location"
          description="So we can match you with nearby ride requests."
          granted={loc}
          actionLabel={loc ? 'Granted' : 'Allow location'}
          onPress={loc ? undefined : requestAgain}
        />

        {showOem && (
          <PermissionRow
            title="Background activity"
            description="Allow UKCAAR Driver to run in the background and receive ride requests when the app is closed. Required on this phone."
            granted={batteryWhitelisted}
            actionLabel={batteryWhitelisted ? 'Allowed' : 'Open settings'}
            onPress={
              batteryWhitelisted
                ? undefined
                : () => openBatteryOptimizationSettings()
            }
            warningTone={!batteryWhitelisted}
          />
        )}

        <Text className="mt-6 px-2 text-[12px] leading-[18px] text-[#6B7280]">
          If a button does nothing, your phone may have permanently denied the
          permission. Tap "Open app settings" below and enable Notifications
          and Location manually.
        </Text>

        <Pressable
          onPress={openAppSettings}
          className="mt-3 self-center rounded-full border border-[#0097B3] px-5 py-2"
        >
          <Text className="text-[14px] font-semibold text-[#0097B3]">
            Open app settings
          </Text>
        </Pressable>
      </ScrollView>

      <View className="border-t border-[#E5E7EB] bg-white px-4 py-4">
        <Pressable
          disabled={!notif || !loc}
          onPress={() => onAllGranted()}
          className={`items-center rounded-full py-3 ${
            notif && loc ? 'bg-[#0097B3]' : 'bg-[#CBCED4]'
          }`}
        >
          <Text className="text-[16px] font-semibold text-white">
            {notif && loc ? 'Continue to dashboard' : 'Grant permissions to continue'}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

function PermissionRow({
  title,
  description,
  granted,
  actionLabel,
  onPress,
  warningTone,
}: {
  title: string;
  description: string;
  granted: boolean;
  actionLabel: string;
  onPress?: () => void;
  warningTone?: boolean;
}) {
  return (
    <View className="mb-3 rounded-2xl bg-white p-4 shadow-sm">
      <View className="flex-row items-center justify-between">
        <Text className="text-[16px] font-semibold text-[#1F2937]">{title}</Text>
        <View
          className={`rounded-full px-2 py-0.5 ${
            granted ? 'bg-[#DCFCE7]' : warningTone ? 'bg-[#FEF3C7]' : 'bg-[#FEE2E2]'
          }`}
        >
          <Text
            className={`text-[11px] font-semibold ${
              granted
                ? 'text-[#166534]'
                : warningTone
                  ? 'text-[#92400E]'
                  : 'text-[#991B1B]'
            }`}
          >
            {granted ? 'On' : 'Off'}
          </Text>
        </View>
      </View>
      <Text className="mt-1 text-[13px] leading-[18px] text-[#6B7280]">
        {description}
      </Text>
      {onPress && (
        <Pressable
          onPress={onPress}
          className="mt-3 self-start rounded-full bg-[#0097B3] px-4 py-2"
        >
          <Text className="text-[13px] font-semibold text-white">
            {actionLabel}
          </Text>
        </Pressable>
      )}
    </View>
  );
}
