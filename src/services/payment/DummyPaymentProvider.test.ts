import { describe, expect, it } from 'vitest';
import { DUMMY_TRANSACTION_ID_REGEX } from '@shared/constants';
import { DummyPaymentProvider, generateTestTransactionId } from './DummyPaymentProvider';
import { PaymentAbortedError, type PaymentRequest } from './PaymentProvider';

const request = (overrides: Partial<PaymentRequest> = {}): PaymentRequest => ({
  amount: 777,
  currency: 'INR',
  method: 'card',
  customer: { name: 'Arjun', email: 'arjun@example.com', phone: '9876543210' },
  reference: 'hwa_test_1',
  ...overrides,
});

describe('DummyPaymentProvider', () => {
  it('approves card / UPI payments at successRate 1 with a test transaction id', async () => {
    const provider = new DummyPaymentProvider({ processingMs: 0, successRate: 1 });
    const result = await provider.createPayment(request({ method: 'upi' }));
    expect(result).toMatchObject({
      provider: 'dummy',
      status: 'success',
      mode: 'test',
      method: 'upi',
      amount: 777,
    });
    expect(result.transactionId).toMatch(DUMMY_TRANSACTION_ID_REGEX);
  });

  it('declines card payments at successRate 0 (resolves, does not throw)', async () => {
    const provider = new DummyPaymentProvider({ processingMs: 0, successRate: 0 });
    const result = await provider.createPayment(request());
    expect(result.status).toBe('failed');
    expect(result.message).toMatch(/declined/i);
  });

  it('always succeeds for cash on delivery', async () => {
    const provider = new DummyPaymentProvider({ processingMs: 0, successRate: 0 });
    expect((await provider.createPayment(request({ method: 'cod' }))).status).toBe('success');
  });

  it('uses the injected RNG against the success rate', async () => {
    const lucky = new DummyPaymentProvider({
      processingMs: 0,
      successRate: 0.9,
      random: () => 0.5,
    });
    const unlucky = new DummyPaymentProvider({
      processingMs: 0,
      successRate: 0.9,
      random: () => 0.95,
    });
    expect((await lucky.createPayment(request())).status).toBe('success');
    expect((await unlucky.createPayment(request())).status).toBe('failed');
  });

  it('can be aborted while processing', async () => {
    const provider = new DummyPaymentProvider({ processingMs: 5000, successRate: 1 });
    const controller = new AbortController();
    const pending = provider.createPayment(request({ signal: controller.signal }));
    controller.abort();
    await expect(pending).rejects.toBeInstanceOf(PaymentAbortedError);
  });

  it('rejects invalid amounts', async () => {
    const provider = new DummyPaymentProvider({ processingMs: 0 });
    await expect(provider.createPayment(request({ amount: 0 }))).rejects.toThrow(/positive/);
  });

  it('generates ids the server verifier accepts', () => {
    for (let i = 0; i < 20; i += 1)
      expect(generateTestTransactionId()).toMatch(DUMMY_TRANSACTION_ID_REGEX);
  });
});
