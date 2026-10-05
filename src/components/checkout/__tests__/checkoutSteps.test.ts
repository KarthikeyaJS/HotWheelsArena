import { describe, expect, it } from 'vitest';
import type { Address } from '@/types';
import {
  availablePaymentMethods,
  canAccessStep,
  firstIncompleteStep,
  isAddressComplete,
  isStepComplete,
  parseCheckoutStep,
  resolveCheckoutStep,
  type CheckoutProgress,
} from '../checkoutSteps';

const address: Address = {
  name: 'Arjun Mehta',
  phone: '9876543210',
  pincode: '400050',
  line1: 'Flat 7, Apex Towers',
  city: 'Mumbai',
  state: 'Maharashtra',
};
const ALL = ['card', 'upi', 'cod'] as const;
const none: CheckoutProgress = { address: null, method: null };
const withAddress: CheckoutProgress = { address, method: null };
const ready: CheckoutProgress = { address, method: 'card' };

describe('checkout steps', () => {
  it('parses the URL step (unknown → address)', () => {
    expect(parseCheckoutStep('payment')).toBe('payment');
    expect(parseCheckoutStep('review')).toBe('review');
    expect(parseCheckoutStep('teleport')).toBe('address');
    expect(parseCheckoutStep(null)).toBe('address');
  });

  it('validates the address with the shared Indian AddressSchema', () => {
    expect(isAddressComplete(address)).toBe(true);
    expect(isAddressComplete({ ...address, phone: '12345' })).toBe(false);
    expect(isAddressComplete({ ...address, pincode: '012345' })).toBe(false);
    expect(isAddressComplete({ ...address, state: 'Atlantis' })).toBe(false);
    expect(isAddressComplete(null)).toBe(false);
  });

  it('only offers COD when enabled in settings', () => {
    expect(availablePaymentMethods(ALL, true)).toEqual(['card', 'upi', 'cod']);
    expect(availablePaymentMethods(ALL, false)).toEqual(['card', 'upi']);
    expect(availablePaymentMethods(['card'], true)).toEqual(['card']);
  });

  it('marks steps complete only with valid data', () => {
    expect(isStepComplete('address', withAddress, ALL)).toBe(true);
    expect(isStepComplete('payment', withAddress, ALL)).toBe(false);
    expect(isStepComplete('payment', ready, ALL)).toBe(true);
    // COD chosen, then switched off in settings → payment is incomplete again.
    expect(isStepComplete('payment', { address, method: 'cod' }, ['card', 'upi'])).toBe(false);
    expect(isStepComplete('review', ready, ALL)).toBe(false);
  });

  it('blocks steps until every earlier step is complete', () => {
    expect(canAccessStep('address', none, ALL)).toBe(true);
    expect(canAccessStep('payment', none, ALL)).toBe(false);
    expect(canAccessStep('payment', withAddress, ALL)).toBe(true);
    expect(canAccessStep('review', withAddress, ALL)).toBe(false);
    expect(canAccessStep('review', ready, ALL)).toBe(true);
  });

  it('falls back to the first incomplete step for deep links / reloads', () => {
    expect(firstIncompleteStep(none, ALL)).toBe('address');
    expect(firstIncompleteStep(withAddress, ALL)).toBe('payment');
    expect(firstIncompleteStep(ready, ALL)).toBe('review');
    expect(resolveCheckoutStep('review', none, ALL)).toBe('address');
    expect(resolveCheckoutStep('review', withAddress, ALL)).toBe('payment');
    expect(resolveCheckoutStep('address', ready, ALL)).toBe('address'); // going back is allowed
    expect(resolveCheckoutStep('review', ready, ALL)).toBe('review');
  });
});
