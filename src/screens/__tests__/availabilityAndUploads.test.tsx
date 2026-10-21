import React from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { Alert } from 'react-native';
import RegistrationDocumentField from '../../components/RegistrationDocumentField';
import { mergeRegistrationDocuments } from '../../utils/registrationDocuments';
import { AvailabilityScreen } from '../AvailabilityScreen';
import { fetchDriverAvailability, setDepartureAvailability } from '../../services/api';

jest.mock('react-native', () => ({ ActivityIndicator: 'ActivityIndicator', Pressable: 'Pressable', ScrollView: 'ScrollView', Text: 'Text', View: 'View', RefreshControl: 'RefreshControl', Platform: { OS: 'android' }, Alert: { alert: jest.fn() }, AppState: { addEventListener: jest.fn(() => ({ remove: jest.fn() })) } }));
jest.mock('react-native-css-interop/jsx-runtime', () => require('react/jsx-runtime'));
jest.mock('react-native-safe-area-context', () => ({ SafeAreaView: 'SafeAreaView' }));
jest.mock('@react-native-community/datetimepicker', () => 'DateTimePicker');
jest.mock('../../components/icons/ServiceTypeIcons', () => ({ UploadIcon: 'UploadIcon', CheckCircleIcon: 'CheckCircleIcon', BackArrowIcon: 'BackArrowIcon' }));
jest.mock('../../services/api', () => ({ fetchDriverAvailability: jest.fn(), setDepartureAvailability: jest.fn(async () => {}) }));

describe('registration uploads and scheduled availability controls', () => {
  let tree: ReactTestRenderer;
  beforeEach(() => {
    (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
    jest.clearAllMocks();
    jest.spyOn(console, 'error').mockImplementation((message: any, ...args: any[]) => {
      if (!String(message).includes('react-test-renderer is deprecated')) throw new Error([message, ...args].join(' '));
    });
  });
  afterEach(() => { if (tree) act(() => tree.unmount()); jest.restoreAllMocks(); });
  const buttons = () => tree.root.findAll(node => node.type === ('Pressable' as any));
  const button = (text: string) => buttons().find(node => node.findAll(child => child.type === ('Text' as any)).some(child => child.props.children === text))!;
  const field = (status?: string, url: string | null = 'saved') => <RegistrationDocumentField label="Upload Licence" prompt="Choose a file" uploadedUrl={url} status={status} uploading={false} onPress={jest.fn()} />;

  test.each(['pending', 'verified', undefined])('a saved %s document shows status without an upload action', async status => {
    await act(async () => { tree = create(field(status)); });
    expect(buttons()).toHaveLength(0);
    expect(tree.root.findAllByType('UploadIcon' as any)).toHaveLength(0);
    expect(tree.root.findAllByType('CheckCircleIcon' as any)).toHaveLength(1);
  });
  test.each([['pending', null], ['rejected', 'old']])('missing/rejected files retain an upload action', async (status, url) => {
    await act(async () => { tree = create(field(status, url)); });
    expect(buttons()).toHaveLength(1);
    expect(buttons()[0].props.disabled).toBe(false);
    await act(async () => { tree.update(field('pending', 'new-file')); });
    expect(buttons()).toHaveLength(0);
  });
  test('registration handoff preserves verification and replaces rejection metadata only for a new file', () => {
    expect(mergeRegistrationDocuments([{ type: 'licence', url: 'verified', status: 'verified' }, { type: 'vehicle', url: 'rejected', status: 'rejected', rejectionReason: 'Blurred' }], { licence: 'verified', vehicle: 'new', insurance: 'insurance' })).toEqual([
      { type: 'licence', url: 'verified', status: 'verified' }, { type: 'vehicle', url: 'new', status: 'pending' }, { type: 'insurance', url: 'insurance', status: 'pending' },
    ]);
  });
  const slot = { routeId: 'route', routeName: 'Outbound', departureDate: '2026-10-22', departureIndex: 1, departureKey: 'stable-key', departureTime: '11:00', available: true, bookings: 0, bookedSeats: 0, running: false, canChange: true };
  const data = (overrides: any = {}) => ({ assignments: [{ routeId: 'route', routeName: 'Outbound' }], slots: [{ ...slot, ...overrides }], exceptions: [] });
  test('driver chooses a published slot and confirms unavailability with its exact identity', async () => {
    (fetchDriverAvailability as jest.Mock).mockResolvedValue(data());
    await act(async () => { tree = create(<AvailabilityScreen onBack={jest.fn()} />); });
    act(() => button('Mark unavailable').props.onPress());
    expect(setDepartureAvailability).not.toHaveBeenCalled();
    const actions = (Alert.alert as jest.Mock).mock.calls[0][2];
    await act(async () => { await actions[1].onPress(); });
    expect(setDepartureAvailability).toHaveBeenCalledWith(slot, false);
  });
  test.each([{ bookings: 1, bookedSeats: 2 }, { running: true }])('confirmed commitments cannot be silently cancelled: %j', async overrides => {
    (fetchDriverAvailability as jest.Mock).mockResolvedValue(data(overrides));
    await act(async () => { tree = create(<AvailabilityScreen onBack={jest.fn()} />); });
    act(() => button('Mark unavailable').props.onPress());
    expect(Alert.alert).toHaveBeenCalledWith('Contact support', expect.any(String));
    expect(setDepartureAvailability).not.toHaveBeenCalled();
  });
  test('an unavailable slot offers Make available', async () => {
    (fetchDriverAvailability as jest.Mock).mockResolvedValue(data({ available: false }));
    await act(async () => { tree = create(<AvailabilityScreen onBack={jest.fn()} />); });
    act(() => button('Make available').props.onPress());
    await act(async () => { await (Alert.alert as jest.Mock).mock.calls[0][2][1].onPress(); });
    expect(setDepartureAvailability).toHaveBeenCalledWith(expect.objectContaining({ departureKey: 'stable-key' }), true);
  });
  test('booking conflicts offer a direct support action', async () => {
    (fetchDriverAvailability as jest.Mock).mockResolvedValue(data({ bookings: 1 }));
    const support = jest.fn();
    await act(async () => { tree = create(<AvailabilityScreen onBack={jest.fn()} onOpenSupport={support} />); });
    act(() => button('Mark unavailable').props.onPress());
    const actions = (Alert.alert as jest.Mock).mock.calls[0][2];
    act(() => actions.find((action: any) => action.text === 'Contact support').onPress());
    expect(support).toHaveBeenCalledTimes(1);
    expect(setDepartureAvailability).not.toHaveBeenCalled();
  });
  test('calendar planning is not limited to the current customer booking window', async () => {
    (fetchDriverAvailability as jest.Mock).mockResolvedValue(data());
    await act(async () => { tree = create(<AvailabilityScreen onBack={jest.fn()} />); });
    act(() => buttons().find(node => node.props.accessibilityLabel === 'Choose availability date')!.props.onPress());
    const picker = tree.root.findByType('DateTimePicker' as any);
    expect(picker.props.maximumDate).toBeUndefined();
    await act(async () => { picker.props.onChange({ type: 'set' }, new Date(2027, 0, 1, 12)); });
    expect(fetchDriverAvailability).toHaveBeenLastCalledWith('2027-01-01');
  });
});
