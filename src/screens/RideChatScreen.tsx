import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Linking,
  Platform,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  joinRideRoom,
  sendChatMessage,
  setSocketListeners,
} from '../services/socketService';
import { fetchChatHistory } from '../services/api';
import { useUserStore } from '../store/userStore';

interface RideChatScreenProps {
  rideId: string;
  customer: {
    name?: string;
    phone?: string;
    avatar?: string | null;
  };
  onBack: () => void;
}

interface ChatRow {
  id: string;
  text: string;
  sender: 'me' | 'them';
  time: string;
}

const fmt = (d: Date) =>
  d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });

/**
 * Driver-side chat with the current customer. Reuses the same socket
 * `chat:message` / `chat:new-message` channel the customer app uses, so
 * a message from either side surfaces on the other in real time. The
 * backend persists every send and pushes the recipient via FCM so the
 * thread survives reload and reaches a backgrounded counterpart.
 */
export function RideChatScreen({ rideId, customer, onBack }: RideChatScreenProps) {
  const myId = useUserStore(s => s.user?.id);
  const [messages, setMessages] = useState<ChatRow[]>([]);
  const [input, setInput] = useState('');
  const listRef = useRef<FlatList>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const chat = await fetchChatHistory(rideId);
        if (cancelled) return;
        const msgs = (chat?.messages ?? []) as Array<{
          _id?: string;
          sender: any;
          content: string;
          createdAt: string;
        }>;
        setMessages(
          msgs.map((m, idx) => ({
            id: m._id ?? `h-${idx}`,
            text: m.content,
            sender:
              String((m.sender && m.sender._id) || m.sender) === String(myId)
                ? 'me'
                : 'them',
            time: fmt(new Date(m.createdAt)),
          })),
        );
      } catch {
        /* fresh chat */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [rideId, myId]);

  useEffect(() => {
    joinRideRoom(rideId);
    setSocketListeners({
      onChatMessage: payload => {
        if (payload.rideId !== rideId) return;
        const fromMe = String(payload.sender) === String(myId);
        setMessages(prev => [
          ...prev,
          {
            id: `${payload.timestamp}-${payload.sender}`,
            text: payload.message,
            sender: fromMe ? 'me' : 'them',
            time: fmt(new Date(payload.timestamp)),
          },
        ]);
      },
    });
  }, [rideId, myId]);

  const send = () => {
    const t = input.trim();
    if (!t) return;
    sendChatMessage(rideId, t);
    setInput('');
  };

  const callCustomer = async () => {
    const phone = (customer.phone || '').replace(/\s+/g, '');
    if (!phone) {
      Alert.alert('Phone not available', "We don't have the rider's number.");
      return;
    }
    const url = `tel:${phone}`;
    if (!(await Linking.canOpenURL(url))) {
      Alert.alert('Cannot place call', 'This device cannot make phone calls.');
      return;
    }
    Linking.openURL(url);
  };

  const initials = useMemo(
    () =>
      (customer.name || 'R')
        .split(' ')
        .map(s => s[0])
        .join('')
        .slice(0, 2)
        .toUpperCase(),
    [customer.name],
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <SafeAreaView edges={['top']} style={styles.headerBar}>
        <TouchableOpacity onPress={onBack} style={styles.iconBtn}>
          <Text style={{ fontSize: 20, color: '#0D1217' }}>←</Text>
        </TouchableOpacity>
        <View style={styles.userInfo}>
          {customer.avatar ? (
            <Image source={{ uri: customer.avatar }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarFallback]}>
              <Text style={styles.avatarText}>{initials}</Text>
            </View>
          )}
          <View>
            <Text style={styles.userName}>{customer.name || 'Rider'}</Text>
            {!!customer.phone && <Text style={styles.userPhone}>{customer.phone}</Text>}
          </View>
        </View>
        <TouchableOpacity onPress={callCustomer} style={styles.iconBtn}>
          <Text style={{ fontSize: 18 }}>📞</Text>
        </TouchableOpacity>
      </SafeAreaView>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={r => r.id}
          contentContainerStyle={styles.list}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
          ListEmptyComponent={
            <Text style={styles.empty}>Say hi to your rider — messages are private.</Text>
          }
          renderItem={({ item }) => {
            const isMe = item.sender === 'me';
            return (
              <View style={[styles.row, isMe ? styles.rowMe : styles.rowThem]}>
                <View style={[styles.bubble, isMe ? styles.bubbleMe : styles.bubbleThem]}>
                  <Text style={[styles.text, isMe && styles.textMe]}>{item.text}</Text>
                  <Text style={[styles.time, isMe && styles.timeMe]}>{item.time}</Text>
                </View>
              </View>
            );
          }}
        />

        <SafeAreaView edges={['bottom']} style={styles.composer}>
          <TextInput
            style={styles.input}
            value={input}
            onChangeText={setInput}
            placeholder="Type a message..."
            placeholderTextColor="#9AA3AC"
            multiline
            onSubmitEditing={send}
          />
          <TouchableOpacity style={styles.sendBtn} onPress={send}>
            <Text style={{ color: '#fff', fontSize: 16 }}>➤</Text>
          </TouchableOpacity>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F0F0F3' },
  headerBar: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  userInfo: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatar: { width: 42, height: 42, borderRadius: 21 },
  avatarFallback: {
    backgroundColor: '#0097B3',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: '#fff', fontFamily: 'Inter-SemiBold', fontSize: 16 },
  userName: { fontFamily: 'Inter-SemiBold', fontSize: 16, color: '#0D1217' },
  userPhone: { fontFamily: 'Inter-Regular', fontSize: 12, color: '#686A8A' },
  list: { paddingHorizontal: 20, paddingVertical: 16, gap: 12 },
  empty: { textAlign: 'center', color: '#686A8A', marginTop: 60, paddingHorizontal: 24 },
  row: { flexDirection: 'row' },
  rowThem: { justifyContent: 'flex-start' },
  rowMe: { justifyContent: 'flex-end' },
  bubble: { maxWidth: '80%', padding: 12, borderRadius: 14 },
  bubbleThem: { backgroundColor: '#fff', borderBottomLeftRadius: 4 },
  bubbleMe: { backgroundColor: '#0097B3', borderBottomRightRadius: 4 },
  text: { fontSize: 15, color: '#2C2D3A' },
  textMe: { color: '#fff' },
  time: { fontSize: 11, color: '#9AA3AC', marginTop: 4, textAlign: 'right' },
  timeMe: { color: 'rgba(255,255,255,0.85)' },
  composer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  input: {
    flex: 1,
    minHeight: 42,
    maxHeight: 100,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'ios' ? 10 : 6,
    borderWidth: 1,
    borderColor: '#D0D1DB',
    borderRadius: 10,
    fontSize: 15,
    color: '#2C2D3A',
  },
  sendBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#0097B3',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
