import React from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { DriverDetailsScreen } from '../DriverDetailsScreen';
import { registerForRoute, updateRegistrationStep } from '../../services/api';

jest.mock('react-native', () => ({
  ActivityIndicator: 'ActivityIndicator', Pressable: 'Pressable', ScrollView: 'ScrollView',
  StatusBar: 'StatusBar', Text: 'Text', TextInput: 'TextInput', View: 'View',
  KeyboardAvoidingView: 'KeyboardAvoidingView', TouchableWithoutFeedback: 'TouchableWithoutFeedback',
  Keyboard: { dismiss: jest.fn() }, Platform: { OS: 'android' }, Alert: { alert: jest.fn() },
}));
jest.mock('react-native-css-interop/jsx-runtime', () => require('react/jsx-runtime'));
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0 }) }));
jest.mock('@react-native-community/datetimepicker', () => 'DateTimePicker');
jest.mock('../../components/RegistrationHeader', () => 'RegistrationHeader');
jest.mock('../../components/RoutePickerModal', () => 'RoutePickerModal');
jest.mock('../../components/icons/ServiceTypeIcons', () => ({ UploadIcon: () => null, CheckCircleIcon: () => null }));
jest.mock('../../services/imagePicker', () => ({ pickImageFromSource: jest.fn() }));
jest.mock('../../services/api', () => ({ registerForRoute: jest.fn(async () => ({})), updateRegistrationStep: jest.fn(async () => ({})), uploadDocument: jest.fn() }));

describe('route selection during driver registration', () => {
  let tree: ReactTestRenderer;
  beforeEach(() => {
    (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
    jest.clearAllMocks();
    jest.spyOn(console, 'error').mockImplementation((message: any, ...args: any[]) => {
      if (!String(message).includes('react-test-renderer is deprecated')) throw new Error([message, ...args].join(' '));
    });
  });
  afterEach(() => { if (tree) act(() => tree.unmount()); jest.restoreAllMocks(); });
  const next = () => tree.root.findAll(node => node.type === ('Pressable' as any)).find(node => node.findAll(child => child.type === ('Text' as any)).some(child => child.props.children === 'Next'))!;
  const fields = {
    initialDlNumber: 'DL123', initialDlExpiryIso: '2028-12-31T00:00:00Z', initialYearsExperience: 2,
    initialDocs: ['aadhaar-front', 'aadhaar-back', 'licence', 'profile-photo'].map(type => ({ type, url: `https://example.test/${type}`, status: 'pending' })),
    onBack: () => {}, onLogout: () => {},
  };
  test('scheduled drivers must choose and submit their route before advancing', async () => {
    const advance = jest.fn();
    await act(async () => { tree = create(<DriverDetailsScreen {...fields} serviceType="scheduled" onNext={advance} />); });
    expect(next().props.disabled).toBe(true);
    const openPicker = tree.root.findAll(node => node.type === ('Pressable' as any)).find(node => node.findAll(child => child.type === ('Text' as any)).some(child => child.props.children === 'Tap to pick your route'))!;
    act(() => openPicker.props.onPress());
    const picker = tree.root.findByType('RoutePickerModal' as any);
    expect(picker.props.visible).toBe(true);
    act(() => picker.props.onSave({ primary: { routeId: 'route', routeName: 'Shuttle', fromName: 'A', toName: 'B', departureTime: '09:15' }, returnMode: 'none' }));
    expect(next().props.disabled).toBe(false);
    await act(async () => { await next().props.onPress(); });
    expect(registerForRoute).toHaveBeenCalledWith('route', { departureTime: '09:15', roundTrip: false });
    expect(updateRegistrationStep).toHaveBeenCalledWith('complete-profile', expect.anything());
    expect(advance).toHaveBeenCalledTimes(1);
    expect((registerForRoute as jest.Mock).mock.invocationCallOrder[0]).toBeLessThan((updateRegistrationStep as jest.Mock).mock.invocationCallOrder[0]);
  });
  test('instant drivers do not have a scheduled-route requirement', async () => {
    await act(async () => { tree = create(<DriverDetailsScreen {...fields} serviceType="instant" onNext={() => {}} />); });
    expect(tree.root.findAllByType('RoutePickerModal' as any)).toHaveLength(0);
    expect(next().props.disabled).toBe(false);
    expect(registerForRoute).not.toHaveBeenCalled();
  });
});
