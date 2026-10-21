import AsyncStorage from '@react-native-async-storage/async-storage';
import { clearTokens, logout } from '../api';
import { stopLocationReporting } from '../locationReporter';
import { disconnectSocket } from '../socketService';
import { clearFcmToken } from '../fcmService';

jest.mock('@react-native-async-storage/async-storage', () => ({ getItem: jest.fn(), removeMany: jest.fn() }));
jest.mock('react-native', () => ({ Platform: { OS: 'android' } }));
jest.mock('@react-native-firebase/auth', () => ({ __esModule: true, default: jest.fn() }));
jest.mock('../locationReporter', () => ({ stopLocationReporting: jest.fn() }));
jest.mock('../socketService', () => ({ disconnectSocket: jest.fn() }));
jest.mock('../fcmService', () => ({ clearFcmToken: jest.fn() }));
jest.mock('../apiCache', () => ({ clearAllCache: jest.fn() }));

describe('logout presence cleanup', () => {
  const originalFetch = globalThis.fetch;
  beforeEach(() => {
    jest.clearAllMocks();
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue('test-token');
    (AsyncStorage.removeMany as jest.Mock).mockResolvedValue(undefined);
    (clearFcmToken as jest.Mock).mockResolvedValue(undefined);
    globalThis.fetch = jest.fn().mockResolvedValue({ ok: true, text: async () => '{"success":true}' });
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });
  afterEach(() => { globalThis.fetch = originalFetch; jest.restoreAllMocks(); });

  test('socket and GPS stop before waiting for FCM or the logout API', async () => {
    let releaseFcm!: () => void;
    (clearFcmToken as jest.Mock).mockImplementation(() => new Promise<void>(resolve => {
      expect(stopLocationReporting).toHaveBeenCalled();
      expect(disconnectSocket).toHaveBeenCalled();
      releaseFcm = resolve;
    }));
    const pending = logout();
    // Let dynamic module imports resolve without using a wall-clock delay.
    for (let turn = 0; turn < 20 && !releaseFcm; turn++) await Promise.resolve();
    expect(releaseFcm).toBeDefined();
    expect(globalThis.fetch).not.toHaveBeenCalled();
    releaseFcm();
    await pending;
    expect(globalThis.fetch).toHaveBeenCalledWith(expect.stringContaining('/auth/logout'), expect.objectContaining({ method: 'POST' }));
    expect(AsyncStorage.removeMany).toHaveBeenCalled();
  });

  test('a failed network logout still closes realtime contact and clears local tokens', async () => {
    (clearFcmToken as jest.Mock).mockRejectedValue(new Error('offline'));
    (globalThis.fetch as jest.Mock).mockRejectedValue(new Error('offline'));
    await logout();
    expect(stopLocationReporting).toHaveBeenCalled();
    expect(disconnectSocket).toHaveBeenCalled();
    expect(AsyncStorage.removeMany).toHaveBeenCalledWith(['auth.accessToken', 'auth.refreshToken']);
  });

  test('session expiry clears realtime contact too', async () => {
    await clearTokens();
    expect(stopLocationReporting).toHaveBeenCalled();
    expect(disconnectSocket).toHaveBeenCalled();
    expect(AsyncStorage.removeMany).toHaveBeenCalled();
  });
});
