import React from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { ChooseScheduledRouteScreen } from '../ChooseScheduledRouteScreen';
import { RoutePickerModal } from '../../components/RoutePickerModal';
import { checkRouteSchedule, fetchScheduledRoutes, fetchMyRouteRegistration, registerForRoute } from '../../services/api';

jest.mock('react-native', () => ({ ActivityIndicator: 'ActivityIndicator', Modal: 'Modal', Pressable: 'Pressable', ScrollView: 'ScrollView', Switch: 'Switch', Text: 'Text', TextInput: 'TextInput', View: 'View', StatusBar: 'StatusBar', Alert: { alert: jest.fn() } }));
jest.mock('react-native-css-interop/jsx-runtime', () => require('react/jsx-runtime'));
jest.mock('react-native-linear-gradient', () => 'LinearGradient');
jest.mock('react-native-safe-area-context', () => ({ SafeAreaView: 'SafeAreaView', useSafeAreaInsets: () => ({ top: 0, bottom: 0 }) }));
jest.mock('../../components/OsmMap', () => ({ OsmMap: 'OsmMap' }));
jest.mock('../../components/icons/ServiceTypeIcons', () => ({ BackArrowIcon: () => null, ChevronDownIcon: () => null }));
jest.mock('../../theme/responsive', () => ({ s: (n: number) => n, vs: (n: number) => n, fs: (n: number) => n }));
jest.mock('../../services/api', () => ({ fetchScheduledRoutes: jest.fn(), fetchMyRouteRegistration: jest.fn(), checkRouteSchedule: jest.fn(), registerForRoute: jest.fn(async () => ({})), updateRegistrationStep: jest.fn(async () => ({})) }));

const route: any = { _id: 'route', name: 'One Route', type: 'scheduled', stops: [{ name: 'A', lat: 28, lng: 77 }, { name: 'B', lat: 29, lng: 78 }], schedule: { minimumJourneyMinutes: 120, daysOfWeek: [], departures: [{ time: '15:00', stopIndex: 0 }, { time: '18:59', stopIndex: 0 }, { time: '19:00', stopIndex: 0 }, { time: '17:00', stopIndex: 1, direction: 'return' }] } };
describe('additional departure and same-route return controls', () => {
  let tree: ReactTestRenderer;
  const buttons = () => tree.root.findAll(node => node.type === ('Pressable' as any));
  const button = (text: string) => buttons().find(node => node.findAll(child => child.type === ('Text' as any)).some(child => child.props.children === text))!;
  beforeEach(() => {
    (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
    jest.clearAllMocks();
    jest.spyOn(console, 'error').mockImplementation((message: any) => { if (!String(message).includes('react-test-renderer is deprecated')) throw new Error(String(message)); });
    (fetchScheduledRoutes as jest.Mock).mockResolvedValue([route]);
    const current = { route, departureIndex: 0, status: 'approved' };
    (fetchMyRouteRegistration as jest.Mock).mockResolvedValue({ current, currentAssignments: [current], pendingRequest: null, pendingRequests: [] });
    (checkRouteSchedule as jest.Mock).mockResolvedValue(undefined);
  });
  afterEach(() => { if (tree) act(() => tree.unmount()); jest.restoreAllMocks(); });
  test('a rejected gap disables requesting; a valid extra departure keeps the same route', async () => {
    (checkRouteSchedule as jest.Mock).mockImplementation(async (_id, payload) => { if (payload.departureIndex === 1) throw new Error('Need 240 minutes between these trips'); });
    await act(async () => { tree = create(<ChooseScheduledRouteScreen isChangeRequest onRegistered={jest.fn()} />); });
    await act(async () => { button('One Route').props.onPress(); });
    await act(async () => { button('6:59 PM').props.onPress(); });
    expect(button('Request this departure').props.disabled).toBe(true);
    expect(registerForRoute).not.toHaveBeenCalled();
    await act(async () => { button('7:00 PM').props.onPress(); });
    expect(button('Request this departure').props.disabled).toBe(false);
    await act(async () => { await button('Request this departure').props.onPress(); });
    expect(registerForRoute).toHaveBeenCalledWith('route', { departureIndex: 2, replaceRoute: false });
  });
  test('registration selects an explicit return slot on the same route and cannot select another return route', async () => {
    const save = jest.fn();
    await act(async () => { tree = create(<RoutePickerModal visible onSave={save} onClose={jest.fn()} />); });
    await act(async () => { button('One Route').props.onPress(); });
    await act(async () => { button('3:00 PM').props.onPress(); });
    await act(async () => { tree.root.findByType('Switch' as any).props.onValueChange(true); });
    expect(button('Save selection').props.disabled).toBe(true);
    await act(async () => { button('5:00 PM').props.onPress(); });
    expect(checkRouteSchedule).toHaveBeenLastCalledWith('route', { departureIndex: 0, roundTrip: true, returnDepartureIndex: 3 });
    expect(buttons().some(node => node.findAll(child => child.type === ('Text' as any)).some(child => child.props.children === 'Different return route'))).toBe(false);
    act(() => button('Save selection').props.onPress());
    expect(save).toHaveBeenCalledWith(expect.objectContaining({ primary: expect.objectContaining({ routeId: 'route', departureIndex: 0 }), returnMode: 'same', sameReturnDepartureTime: '17:00', sameReturnDepartureIndex: 3 }));
  });
  test('same-clock return departures at different origins remain individually selectable', async () => {
    const published = { ...route, stops: [route.stops[0], { name: 'Middle', lat: 28.5, lng: 77.5 }, route.stops[1]], schedule: { ...route.schedule, departures: [{ time: '15:00', stopIndex: 0 }, { time: '17:00', stopIndex: 2, direction: 'return' }, { time: '17:00', stopIndex: 1, direction: 'return' }] } };
    (fetchScheduledRoutes as jest.Mock).mockResolvedValue([published]);
    const save = jest.fn();
    await act(async () => { tree = create(<RoutePickerModal visible onSave={save} onClose={jest.fn()} />); });
    await act(async () => button('One Route').props.onPress());
    await act(async () => button('3:00 PM').props.onPress());
    await act(async () => tree.root.findByType('Switch' as any).props.onValueChange(true));
    const returns = buttons().filter(node => node.findAll(child => child.type === ('Text' as any)).some(child => child.props.children === '5:00 PM'));
    expect(returns).toHaveLength(2);
    await act(async () => returns[1].props.onPress());
    expect(checkRouteSchedule).toHaveBeenLastCalledWith('route', { departureIndex: 0, roundTrip: true, returnDepartureIndex: 2 });
    act(() => button('Save selection').props.onPress());
    expect(save).toHaveBeenCalledWith(expect.objectContaining({ sameReturnDepartureIndex: 2, sameReturnFromName: 'Middle', sameReturnToName: 'A' }));
  });
});
