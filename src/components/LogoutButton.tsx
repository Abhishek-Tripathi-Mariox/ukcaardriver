import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, Text } from 'react-native';
import { logout } from '../services/api';

interface LogoutButtonProps {
  onLoggedOut: () => void;
  /** Override the default confirmation message. */
  confirmMessage?: string;
  /** Light tint = white text (for gradient headers). Dark = teal text. */
  tint?: 'light' | 'dark';
}

export function LogoutButton({
  onLoggedOut,
  confirmMessage = 'Sign out and return to the login screen? Your progress so far is saved.',
  tint = 'light',
}: LogoutButtonProps) {
  const [pending, setPending] = useState(false);

  const handlePress = () => {
    Alert.alert('Log out', confirmMessage, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log out',
        style: 'destructive',
        onPress: async () => {
          setPending(true);
          try {
            await logout();
          } finally {
            setPending(false);
            onLoggedOut();
          }
        },
      },
    ]);
  };

  const textColor = tint === 'light' ? 'text-white' : 'text-brand-teal';

  return (
    <Pressable
      onPress={handlePress}
      disabled={pending}
      hitSlop={12}
      className="flex-row items-center gap-1 px-2 py-1"
    >
      {pending ? (
        <ActivityIndicator
          size="small"
          color={tint === 'light' ? '#FFFFFF' : '#0097B3'}
        />
      ) : (
        <Text className={`text-sm font-medium ${textColor}`}>Logout</Text>
      )}
    </Pressable>
  );
}

export default LogoutButton;
