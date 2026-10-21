import AsyncStorage from '@react-native-async-storage/async-storage';
import auth from '@react-native-firebase/auth';
import { USE_FIREBASE_PHONE_AUTH } from '../authConfig';
import { ApiError, sendOtp, verifyOtp } from '../api';

jest.mock('@react-native-async-storage/async-storage', () => ({ setMany: jest.fn() }));
jest.mock('react-native', () => ({ Platform: { OS: 'android' } }));
jest.mock('@react-native-firebase/auth', () => ({ __esModule: true, default: jest.fn() }));

describe('driver testing OTP', () => {
  const originalFetch = globalThis.fetch;
  const reply = (body, status = 200) => ({ ok: status < 400, status, text: async () => JSON.stringify(body) });
  beforeEach(() => {
    jest.clearAllMocks();
    globalThis.fetch = jest.fn();
  });
  afterEach(() => { globalThis.fetch = originalFetch; });

  test('login and resend use the backend without invoking Firebase', async () => {
    expect(USE_FIREBASE_PHONE_AUTH).toBe(false);
    globalThis.fetch.mockResolvedValue(reply({ success: true }));
    await sendOtp('98765 43210', '+91');
    await sendOtp('98765 43210', '+91', true);
    expect(globalThis.fetch).toHaveBeenCalledTimes(2);
    for (const [url, options] of globalThis.fetch.mock.calls) {
      expect(url).toMatch(/\/auth\/send-otp$/);
      expect(JSON.parse(options.body)).toEqual({ phone: '9876543210', countryCode: '+91' });
    }
    expect(auth).not.toHaveBeenCalled();
  });

  test('default OTP is verified server-side and the session is persisted without a Firebase handle', async () => {
    const result = { success: true, data: { user: { id: 'driver', role: 'driver' }, tokens: { accessToken: 'access', refreshToken: 'refresh' } } };
    globalThis.fetch.mockResolvedValue(reply(result));
    await expect(verifyOtp('9876543210', '115566', '+91')).resolves.toEqual(result);
    expect(globalThis.fetch).toHaveBeenCalledWith(expect.stringMatching(/\/auth\/verify-otp$/), expect.objectContaining({
      method: 'POST', body: JSON.stringify({ phone: '9876543210', countryCode: '+91', otp: '115566' }),
    }));
    expect(AsyncStorage.setMany).toHaveBeenCalledWith({ 'auth.accessToken': 'access', 'auth.refreshToken': 'refresh' });
    expect(auth).not.toHaveBeenCalled();
  });

  test('an invalid OTP does not store a session or fall back to Firebase', async () => {
    globalThis.fetch.mockResolvedValue(reply({ message: 'Invalid or expired OTP' }, 400));
    await expect(verifyOtp('9876543210', '000000')).rejects.toBeInstanceOf(ApiError);
    expect(AsyncStorage.setMany).not.toHaveBeenCalled();
    expect(auth).not.toHaveBeenCalled();
  });

  test('suspended-account rejection from send-otp is preserved', async () => {
    globalThis.fetch.mockResolvedValue(reply({ message: 'Your account has been suspended.' }, 403));
    await expect(sendOtp('9876543210')).rejects.toMatchObject({ status: 403, message: 'Your account has been suspended.' });
    expect(auth).not.toHaveBeenCalled();
  });
});
