import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState } from 'react-native';
import { io } from 'socket.io-client';
import { connectSocket, disconnectSocket, emitDriverLocation, joinRideRoom, subscribeDriverStatus } from '../socketService';

jest.mock('@react-native-async-storage/async-storage', () => ({ getItem: jest.fn() }));
jest.mock('react-native', () => ({ AppState: { currentState: 'active', addEventListener: jest.fn(() => ({ remove: jest.fn() })) } }));
jest.mock('socket.io-client', () => ({ io: jest.fn() }));
jest.mock('../api', () => ({ API_BASE_URL: 'https://example.test/api/v1' }));
jest.mock('../apiCache', () => ({ CACHE_KEYS: { CURRENT_USER: 'user', DASHBOARD: 'dashboard' }, invalidate: jest.fn() }));

describe('driver socket presence', () => {
  let handlers: Record<string, (...args: any[]) => void>;
  let socket: any;
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    handlers = {};
    socket = { connected: true, on: jest.fn((event, callback) => { handlers[event] = callback; }), emit: jest.fn(), disconnect: jest.fn() };
    (io as jest.Mock).mockReturnValue(socket);
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue('test-token');
    (AppState as any).currentState = 'active';
  });
  afterEach(() => { disconnectSocket(); jest.useRealTimers(); });

  test('reports presence immediately and every 30s without needing a GPS fix', async () => {
    await connectSocket();
    handlers.connect();
    expect(socket.emit).toHaveBeenCalledWith('driver:heartbeat', expect.any(Function));
    jest.advanceTimersByTime(90_000);
    expect(socket.emit.mock.calls.filter((call: any[]) => call[0] === 'driver:heartbeat')).toHaveLength(4);
  });

  test('backgrounded apps stop heartbeat/GPS contact and foregrounding reports again', async () => {
    await connectSocket();
    (AppState as any).currentState = 'background';
    jest.advanceTimersByTime(120_000);
    emitDriverLocation({ lat: 28, lng: 77 });
    expect(socket.emit).not.toHaveBeenCalled();
    (AppState as any).currentState = 'active';
    const stateListener = (AppState.addEventListener as jest.Mock).mock.calls[0][1];
    stateListener('active');
    expect(socket.emit).toHaveBeenCalledWith('driver:heartbeat', expect.any(Function));
  });

  test('no contact is buffered while the phone has no connection', async () => {
    await connectSocket();
    socket.connected = false;
    jest.advanceTimersByTime(120_000);
    emitDriverLocation({ lat: 28, lng: 77 });
    expect(socket.emit).not.toHaveBeenCalled();
  });

  test('logout stops timers, closes the socket and removes the lifecycle listener', async () => {
    await connectSocket();
    const subscription = (AppState.addEventListener as jest.Mock).mock.results[0].value;
    disconnectSocket();
    jest.advanceTimersByTime(120_000);
    expect(socket.disconnect).toHaveBeenCalledTimes(1);
    expect(subscription.remove).toHaveBeenCalledTimes(1);
    expect(socket.emit).not.toHaveBeenCalled();
  });

  test('a connect awaiting token storage cannot finish after logout', async () => {
    let resolveToken!: (token: string) => void;
    (AsyncStorage.getItem as jest.Mock).mockReturnValue(new Promise(resolve => { resolveToken = resolve; }));
    const pending = connectSocket();
    disconnectSocket();
    resolveToken('old-token');
    expect(await pending).toBeNull();
    expect(io).not.toHaveBeenCalled();
  });

  test('navigation reuses a reconnecting socket and keeps a single heartbeat timer', async () => {
    await connectSocket();
    socket.connected = false;
    await connectSocket();
    expect(io).toHaveBeenCalledTimes(1);
    socket.connected = true;
    jest.advanceTimersByTime(30_000);
    expect(socket.emit).toHaveBeenCalledTimes(1);
  });

  test('heartbeat responses reconcile the displayed status with server expiry', async () => {
    const statuses: boolean[] = [];
    const unsubscribe = subscribeDriverStatus(online => statuses.push(online));
    await connectSocket();
    handlers.connect();
    const ack = socket.emit.mock.calls.find((call: any[]) => call[0] === 'driver:heartbeat')[1];
    ack({ isOnline: false });
    handlers['driver:status']({ isOnline: true });
    expect(statuses).toEqual([false, true]);
    unsubscribe();
  });

  test('logout does not replay the previous driver\'s ride rooms on next login', async () => {
    await connectSocket();
    joinRideRoom('old-ride');
    disconnectSocket();
    socket.emit.mockClear();
    await connectSocket();
    handlers.connect();
    expect(socket.emit).not.toHaveBeenCalledWith('ride:join', 'old-ride');
  });
});
