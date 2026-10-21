import React from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { VehicleDetailsScreen } from '../VehicleDetailsScreen';
import { listVehicleTypes, listFuelTypes } from '../../services/api';

jest.mock('react-native', () => ({ ActivityIndicator: 'ActivityIndicator', Modal: 'Modal', Pressable: 'Pressable', ScrollView: 'ScrollView', StatusBar: 'StatusBar', Text: 'Text', TextInput: 'TextInput', View: 'View', KeyboardAvoidingView: 'KeyboardAvoidingView', TouchableWithoutFeedback: 'TouchableWithoutFeedback', Keyboard: { dismiss: jest.fn() }, Platform: { OS: 'android' }, Alert: { alert: jest.fn() } }));
jest.mock('react-native-css-interop/jsx-runtime', () => require('react/jsx-runtime'));
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0 }) }));
jest.mock('@react-native-community/datetimepicker', () => 'DateTimePicker');
jest.mock('../../components/RegistrationHeader', () => 'RegistrationHeader');
jest.mock('../../theme/responsive', () => ({ s: (n: number) => n, vs: (n: number) => n, fs: (n: number) => n }));
jest.mock('../../components/RegistrationDocumentField', () => 'RegistrationDocumentField');
jest.mock('../../components/icons/ServiceTypeIcons', () => ({ ChevronDownIcon: () => null }));
jest.mock('../../services/imagePicker', () => ({ pickImageFromSource: jest.fn() }));
jest.mock('../../services/api', () => ({ listVehicleTypes: jest.fn(), listFuelTypes: jest.fn(), updateRegistrationStep: jest.fn(), uploadDocument: jest.fn() }));

describe('vehicle picker respects the selected driver service', () => {
  let tree: ReactTestRenderer;
  const props = { onNext: jest.fn(), onBack: jest.fn(), onLogout: jest.fn(), initialVehicle: { vehicleTypeCode: 'bike' } };
  const labels = () => tree.root.findAllByType('Text' as any).flatMap(node => typeof node.props.children === 'string' ? [node.props.children] : []);
  beforeEach(() => {
    (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
    jest.clearAllMocks();
    jest.spyOn(console, 'error').mockImplementation((message: any) => { if (!String(message).includes('react-test-renderer is deprecated')) throw new Error(String(message)); });
    (listFuelTypes as jest.Mock).mockResolvedValue([]);
  });
  afterEach(() => { if (tree) act(() => tree.unmount()); jest.restoreAllMocks(); });
  test('an empty Private catalogue never falls back to all vehicle types', async () => {
    (listVehicleTypes as jest.Mock).mockResolvedValue([{ code: 'bike', name: 'Bike', tier: 'instant' }, { code: 'legacy', name: 'Legacy' }]);
    await act(async () => { tree = create(<VehicleDetailsScreen {...props} serviceType="private" />); });
    expect(labels()).toContain('No vehicle types available');
    expect(labels()).not.toContain('Bike');
    expect(labels()).not.toContain('Legacy');
  });
  test('only active Private types appear and switching service removes the stale choice', async () => {
    (listVehicleTypes as jest.Mock).mockResolvedValue([{ code: 'bike', name: 'Bike', tier: 'instant' }, { code: 'premium', name: 'Premium', tier: 'private' }, { code: 'old', name: 'Retired', tier: 'private', isActive: false }]);
    await act(async () => { tree = create(<VehicleDetailsScreen {...props} serviceType="instant" />); });
    expect(labels()).toContain('Bike');
    await act(async () => { tree.update(<VehicleDetailsScreen {...props} serviceType="private" />); });
    expect(labels()).not.toContain('Bike');
    expect(labels()).toContain('Premium');
    expect(labels()).not.toContain('Retired');
    expect(labels()).toContain('Select vehicle type');
  });
});
