import React from 'react';
import { act, create } from 'react-test-renderer';
import { OnePassScreen } from '../OnePassScreen';
import RazorpayCheckout from 'react-native-razorpay';
import { Alert } from 'react-native';
import { fetchOnePassPlans, fetchOnePassStatus, createOnePassOrder, verifyOnePassPayment, cancelRechargeOrder } from '../../services/api';
jest.mock('react-native', () => ({ ActivityIndicator: 'ActivityIndicator', Alert: { alert: jest.fn() }, Pressable: 'Pressable', ScrollView: 'ScrollView', StatusBar: 'StatusBar', Text: 'Text', View: 'View', StyleSheet: { create: value => value } }));
jest.mock('react-native-css-interop/jsx-runtime', () => require('react/jsx-runtime'));
jest.mock('react-native-safe-area-context', () => ({ SafeAreaView: 'SafeAreaView', useSafeAreaInsets: () => ({ top: 0, bottom: 0 }) }));
jest.mock('react-native-razorpay', () => ({ __esModule: true, default: { open: jest.fn() } }));
jest.mock('../../components/icons/ServiceTypeIcons', () => ({ BackArrowIcon: () => null }));
jest.mock('../../store', () => ({ useUserStore: selector => selector({ user: { firstName: 'Driver', phone: '123' }, hydrate: jest.fn() }) }));
jest.mock('../../services/api', () => ({ fetchOnePassPlans: jest.fn(), fetchOnePassStatus: jest.fn(), createOnePassOrder: jest.fn(), verifyOnePassPayment: jest.fn(), cancelRechargeOrder: jest.fn() }));
const plan = { key: 'scheduled_monthly', label: 'Scheduled Monthly', category: 'scheduled', price: 150, days: 30, commissionPct: 5, currency: 'INR' };
describe('category OnePass driver flow', () => {
  let tree;
  const button = fragment => tree.root.findAllByType('Pressable').find(node => node.findAllByType('Text').some(text => [text.props.children].flat(Infinity).join('').includes(fragment)));
  beforeEach(() => {
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;
    jest.clearAllMocks();
    jest.spyOn(console, 'error').mockImplementation(message => { if (!String(message).includes('react-test-renderer is deprecated')) throw new Error(String(message)); });
    fetchOnePassPlans.mockResolvedValue([plan, { ...plan, key: 'private_cheap', category: 'private', label: 'Private Cheap' }]);
    fetchOnePassStatus.mockResolvedValue({ category: 'scheduled', isActive: false, expiresAt: null, commissionPct: null, legacy: null, memberships: [] });
    createOnePassOrder.mockResolvedValue({ orderId: 'order', amount: 15000, currency: 'INR', keyId: 'key' });
    RazorpayCheckout.open.mockResolvedValue({ razorpay_payment_id: 'pay', razorpay_signature: 'signature' });
    verifyOnePassPayment.mockResolvedValue(undefined);
  });
  afterEach(() => { if (tree) act(() => tree.unmount()); tree = undefined; jest.restoreAllMocks(); });
  test('shows the current category’s plans and the configured commission benefit', async () => {
    await act(async () => { tree = create(<OnePassScreen />); });
    const shown = JSON.stringify(tree.toJSON());
    expect(shown).toContain('Scheduled Monthly'); expect(shown).not.toContain('Private Cheap');
    expect(shown).toContain('% commission');
    await act(async () => button('Buy').props.onPress());
    expect(createOnePassOrder).toHaveBeenCalledWith('scheduled_monthly', { category: 'scheduled', price: 150, days: 30, commissionPct: 5 });
    expect(verifyOnePassPayment).toHaveBeenCalledWith({ razorpay_order_id: 'order', razorpay_payment_id: 'pay', razorpay_signature: 'signature' });
    expect(Alert.alert).toHaveBeenCalledWith('OnePass purchased', expect.stringContaining('Existing validity is kept'), expect.any(Array));
  });
  test('a captured payment offers verification retry without cancelling or buying again', async () => {
    verifyOnePassPayment.mockRejectedValueOnce(new Error('network unavailable'));
    await act(async () => { tree = create(<OnePassScreen />); });
    await act(async () => button('Buy').props.onPress());
    expect(cancelRechargeOrder).not.toHaveBeenCalled();
    expect(button('Buy').props.disabled).toBe(true);
    await act(async () => button('Tap to retry verification').props.onPress());
    expect(createOnePassOrder).toHaveBeenCalledTimes(1);
    expect(verifyOnePassPayment).toHaveBeenCalledTimes(2);
  });
  test('load failure provides retry and cannot offer a stale purchase', async () => {
    fetchOnePassStatus.mockRejectedValueOnce(new Error('offline'));
    await act(async () => { tree = create(<OnePassScreen />); });
    expect(JSON.stringify(tree.toJSON())).toContain('Could not load OnePass');
    expect(button('Buy')).toBeUndefined();
  });
  test('an older backend without category support cannot sell an unclassified pass', async () => {
    fetchOnePassStatus.mockResolvedValue({ isActive: true, expiresAt: '2026-12-01' });
    fetchOnePassPlans.mockResolvedValue([{ key: 'monthly', label: 'Old Monthly', price: 99, days: 30 }]);
    await act(async () => { tree = create(<OnePassScreen />); });
    expect(JSON.stringify(tree.toJSON())).toContain('Your service category could not be verified');
    expect(button('Buy')).toBeUndefined();
    expect(createOnePassOrder).not.toHaveBeenCalled();
  });
});
