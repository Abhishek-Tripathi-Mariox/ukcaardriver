import { PermissionsAndroid } from 'react-native';
import Geolocation from '@react-native-community/geolocation';
import { emitDriverLocation } from '../socketService';
import { startLocationReporting, stopLocationReporting } from '../locationReporter';

jest.mock('react-native', () => ({ Platform: { OS: 'android' }, PermissionsAndroid: { request: jest.fn(), PERMISSIONS: { ACCESS_FINE_LOCATION: 'location' }, RESULTS: { GRANTED: 'granted' } } }));
jest.mock('@react-native-community/geolocation', () => ({ getCurrentPosition: jest.fn(), watchPosition: jest.fn(() => 1), clearWatch: jest.fn() }));
jest.mock('../socketService', () => ({ emitDriverLocation: jest.fn(), getSocket: () => ({ connected: true }) }));

describe('location cleanup during logout', () => {
  beforeEach(() => { jest.useFakeTimers(); jest.clearAllMocks(); });
  afterEach(() => { stopLocationReporting(); jest.useRealTimers(); });

  test('permission resolution after logout does not restart reporting', async () => {
    let grant!: (value: string) => void;
    (PermissionsAndroid.request as jest.Mock).mockReturnValue(new Promise(resolve => { grant = resolve; }));
    const pending = startLocationReporting();
    stopLocationReporting();
    grant('granted');
    await pending;
    expect(Geolocation.watchPosition).not.toHaveBeenCalled();
  });

  test('a late GPS callback after logout cannot advertise contact', async () => {
    (PermissionsAndroid.request as jest.Mock).mockResolvedValue('granted');
    await startLocationReporting();
    const reportPosition = (Geolocation.getCurrentPosition as jest.Mock).mock.calls[0][0];
    stopLocationReporting();
    reportPosition({ coords: { latitude: 28, longitude: 77, heading: null } });
    expect(emitDriverLocation).not.toHaveBeenCalled();
    jest.advanceTimersByTime(120_000);
    expect(Geolocation.getCurrentPosition).toHaveBeenCalledTimes(1);
  });

  test('a callback from a previous session cannot emit after a new session starts', async () => {
    await startLocationReporting();
    const oldCallback = (Geolocation.getCurrentPosition as jest.Mock).mock.calls[0][0];
    stopLocationReporting();
    await startLocationReporting();
    const newCallback = (Geolocation.getCurrentPosition as jest.Mock).mock.calls[1][0];
    const fix = { coords: { latitude: 28, longitude: 77, heading: null } };
    oldCallback(fix);
    expect(emitDriverLocation).not.toHaveBeenCalled();
    newCallback(fix);
    expect(emitDriverLocation).toHaveBeenCalledTimes(1);
  });
});
