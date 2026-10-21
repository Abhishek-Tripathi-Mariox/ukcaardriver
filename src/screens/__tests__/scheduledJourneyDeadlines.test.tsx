import React from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { AppState } from 'react-native';
import { fetchJourneys, fetchJourney, fetchJourneyPassengers, startJourney, listMyRides, type JourneySummary } from '../../services/api';
import { ScheduledJourneysScreen } from '../ScheduledJourneysScreen';
import { UpcomingBookingDetailsScreen } from '../UpcomingBookingDetailsScreen';
import { HistoryScreen } from '../HistoryScreen';
import { RoutePickerModal } from '../../components/RoutePickerModal';

jest.mock('react-native', () => ({
  ActivityIndicator: 'ActivityIndicator', Pressable: 'Pressable', ScrollView: 'ScrollView',
  StatusBar: 'StatusBar', Text: 'Text', View: 'View', RefreshControl: 'RefreshControl', Alert: { alert: jest.fn() }, Linking: {},
  Modal: 'Modal', TextInput: 'TextInput', Switch: 'Switch',
  AppState: { currentState: 'active', addEventListener: jest.fn(() => ({ remove: jest.fn() })) },
}));
jest.mock('react-native-linear-gradient', () => 'LinearGradient');
// These tests exercise screen behavior with host primitives, not NativeWind.
jest.mock('react-native-css-interop/jsx-runtime', () => require('react/jsx-runtime'));
jest.mock('react-native-safe-area-context', () => ({ SafeAreaView: 'SafeAreaView', useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) }));
jest.mock('../../components/icons/ServiceTypeIcons', () => ({
  ArrowRightIcon: () => null, BackArrowIcon: () => null, CalendarIcon: () => null,
  ClockSmallIcon: () => null, LocationPinSmallIcon: () => null, UsersIcon: () => null,
  ChatBubbleIcon: () => null, PhoneIcon: () => null, RoutingIcon: () => null,
  CarIcon: () => null, MoneyIcon: () => null,
  ChevronDownIcon: () => null,
}));
jest.mock('../../theme/responsive', () => ({ fs: (n: number) => n, s: (n: number) => n, vs: (n: number) => n }));
jest.mock('../../utils/navigation', () => ({ dialPhone: jest.fn() }));
jest.mock('../../services/api', () => ({
  ApiError: class extends Error {}, fetchJourneys: jest.fn(), fetchJourney: jest.fn(),
  fetchJourneyPassengers: jest.fn(), startJourney: jest.fn(), listMyRides: jest.fn(),
  checkRouteSchedule: jest.fn(async () => {}),
  fetchScheduledRoutes: jest.fn(async () => [{ _id: 'route', name: 'Published Shuttle', stops: [{ name: 'A' }, { name: 'B' }], schedule: { departures: [{ time: '09:15' }, { time: '10:45' }] } }]),
}));

const key = '507f1f77bcf86cd799439011_0_2026-10-21';
const at = (time: string) => new Date(`2026-10-21T${time}+05:30`);
const sample: JourneySummary = {
  journeyKey: key, routeId: 'route', routeName: 'Morning Shuttle', from: 'A', to: 'B',
  departureDate: '2026-10-21', departureTime: '09:00', departureIndex: 0, status: 'scheduled',
  stopCount: 2, seatPrice: 100, totalSeats: 4, currentStopIndex: 0, passengerCount: 0,
  boardedCount: 0, bookingCount: 0, earnings: 0, startedAt: null, completedAt: null, startWindowMinutes: 30,
};

describe('open driver screens at the departure deadline', () => {
  let tree: ReactTestRenderer | undefined;
  beforeEach(() => {
    (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
    jest.useFakeTimers().setSystemTime(at('08:59:59'));
    jest.clearAllMocks();
    (AppState as any).currentState = 'active';
    (fetchJourneys as jest.Mock).mockImplementation(scope => Promise.resolve(scope === 'upcoming' ? [sample] : []));
    (fetchJourney as jest.Mock).mockResolvedValue({ journey: sample, stops: [] });
    (fetchJourneyPassengers as jest.Mock).mockResolvedValue({ passengers: [] });
    (startJourney as jest.Mock).mockResolvedValue({ status: 'active', currentStopIndex: 0 });
    (listMyRides as jest.Mock).mockResolvedValue({ rides: [] });
    // React 19 emits a deprecation notice for its test renderer.
    jest.spyOn(console, 'error').mockImplementation((message: any, ...args: any[]) => {
      if (!String(message).includes('react-test-renderer is deprecated')) throw new Error([message, ...args].join(' '));
    });
  });
  afterEach(() => {
    if (tree) act(() => tree!.unmount());
    tree = undefined;
    jest.useRealTimers();
    jest.restoreAllMocks();
  });
  const texts = () => tree!.root.findAll(node => node.type === ('Text' as any)).map(node => String(node.props.children)).join(' ');
  const button = (label: string) => tree!.root.findAll(node => node.type === ('Pressable' as any)).find(node =>
    node.findAll(child => child.type === ('Text' as any)).some(child => child.props.children === label),
  )!;

  test('Upcoming moves a cached missed departure to Past without another API call', async () => {
    await act(async () => { tree = create(<ScheduledJourneysScreen />); });
    expect(texts()).toContain('Morning Shuttle');
    await act(async () => { jest.advanceTimersByTime(1_000); });
    expect(texts()).not.toContain('Morning Shuttle');
    act(() => button('Past').props.onPress());
    expect(texts()).toContain('Morning Shuttle');
    expect(texts()).toContain('Missed');
    expect(fetchJourneys).toHaveBeenCalledTimes(2);
  });

  test('foregrounding after departure updates a suspended list immediately', async () => {
    await act(async () => { tree = create(<ScheduledJourneysScreen />); });
    (AppState as any).currentState = 'background';
    jest.setSystemTime(at('10:00:00'));
    (AppState as any).currentState = 'active';
    const foreground = (AppState.addEventListener as jest.Mock).mock.calls[0][1];
    await act(async () => { foreground('active'); });
    expect(texts()).not.toContain('Morning Shuttle');
    act(() => button('Past').props.onPress());
    expect(texts()).toContain('Missed');
  });

  test('Start disables itself when the screen stays open through departure', async () => {
    await act(async () => { tree = create(<UpcomingBookingDetailsScreen journeyKey={key} />); });
    expect(button('Start Journey').props.disabled).toBe(false);
    await act(async () => { jest.advanceTimersByTime(1_000); });
    expect(button('Start Journey').props.disabled).toBe(true);
    expect(texts()).toContain('departure time has passed');
    expect(startJourney).not.toHaveBeenCalled();
  });

  test('a stale enabled button cannot send a start request after the deadline', async () => {
    await act(async () => { tree = create(<UpcomingBookingDetailsScreen journeyKey={key} />); });
    const staleButton = button('Start Journey');
    expect(staleButton.props.disabled).toBe(false);
    // Change the clock without allowing the UI interval to render first.
    jest.setSystemTime(at('09:00:00'));
    await act(async () => { await staleButton.props.onPress(); });
    expect(startJourney).not.toHaveBeenCalled();
    expect(button('Start Journey').props.disabled).toBe(true);
  });

  test('a started journey stays resumable after its departure time', async () => {
    jest.setSystemTime(at('10:00:00'));
    (fetchJourney as jest.Mock).mockResolvedValue({ journey: { ...sample, status: 'active' }, stops: [] });
    const resume = jest.fn();
    await act(async () => { tree = create(<UpcomingBookingDetailsScreen journeyKey={key} onStartJourney={resume} />); });
    expect(button('Start Journey').props.disabled).toBe(false);
    await act(async () => { await button('Start Journey').props.onPress(); });
    expect(startJourney).toHaveBeenCalledWith(key);
    expect(resume).toHaveBeenCalledTimes(1);
  });

  test('scheduled drivers open Past from Rides, then can access upcoming journey details', async () => {
    const past = { ...sample, journeyKey: 'past-key', routeName: 'Finished Shuttle', status: 'completed', departureDate: '2026-10-20' };
    (fetchJourneys as jest.Mock).mockImplementation(scope => Promise.resolve(scope === 'past' ? [past] : [sample]));
    const openPast = jest.fn();
    const openUpcoming = jest.fn();
    await act(async () => { tree = create(<HistoryScreen serviceType="scheduled" onOpenPast={openPast} onOpenUpcoming={openUpcoming} />); });
    expect(texts()).toContain('Finished Shuttle');
    expect(texts()).not.toContain('Morning Shuttle');
    expect(listMyRides).not.toHaveBeenCalled();
    act(() => button('Finished Shuttle').props.onPress());
    expect(openPast).toHaveBeenCalledWith('past-key');
    act(() => button('Upcoming').props.onPress());
    expect(texts()).toContain('Morning Shuttle');
    act(() => button('Morning Shuttle').props.onPress());
    expect(openUpcoming).toHaveBeenCalledWith(key, 'scheduled');
  });

  test('drivers can switch between ordinary rides and scheduled history', async () => {
    await act(async () => { tree = create(<HistoryScreen serviceType="instant" />); });
    expect(listMyRides).toHaveBeenCalledTimes(1);
    await act(async () => { button('Scheduled').props.onPress(); });
    expect(fetchJourneys).toHaveBeenCalledWith('past');
    expect(fetchJourneys).toHaveBeenCalledWith('upcoming');
    await act(async () => { button('Instant / Private').props.onPress(); });
    expect(listMyRides).toHaveBeenCalledTimes(2);
  });

  test('running scheduled journeys keep their resume status when opened from history', async () => {
    (fetchJourneys as jest.Mock).mockImplementation(scope => Promise.resolve(scope === 'upcoming' ? [{ ...sample, status: 'in_progress' }] : []));
    const resume = jest.fn();
    await act(async () => { tree = create(<HistoryScreen serviceType="scheduled" onOpenUpcoming={resume} />); });
    act(() => button('Upcoming').props.onPress());
    act(() => button('Morning Shuttle').props.onPress());
    expect(resume).toHaveBeenCalledWith(key, 'in_progress');
  });

  test('registration offers published departure times and preserves minute offsets', async () => {
    const save = jest.fn();
    await act(async () => { tree = create(<RoutePickerModal visible onClose={() => {}} onSave={save} />); });
    act(() => button('Published Shuttle').props.onPress());
    expect(button('9:15 AM')).toBeDefined();
    expect(button('10:45 AM')).toBeDefined();
    expect(button('9:00 AM')).toBeUndefined();
    await act(async () => { button('9:15 AM').props.onPress(); });
    act(() => button('Save selection').props.onPress());
    expect(save).toHaveBeenCalledWith(expect.objectContaining({ primary: expect.objectContaining({ routeId: 'route', departureTime: '09:15' }) }));
  });
});
