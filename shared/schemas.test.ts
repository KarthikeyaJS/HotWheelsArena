import { describe, expect, expectTypeOf, it } from 'vitest';
import type { z } from 'zod';
import { INDIAN_STATES, isValidPincode, normalizeIndianPhone } from './india.js';
import {
  AddressSchema,
  NewsletterSchema,
  PaymentResultSchema,
  PlaceOrderRequestSchema,
  ReviewFormSchema,
  SubmitReviewSchema,
} from './schemas.js';
import type {
  Address,
  NewsletterRequest,
  PaymentResult,
  PlaceOrderRequest,
  SubmitReviewRequest,
} from './types.js';

const validAddress: Address = {
  name: 'Arjun Mehta',
  phone: '9876543210',
  pincode: '560001',
  line1: '12, MG Road, Ashok Nagar',
  city: 'Bengaluru',
  state: 'Karnataka',
};

const validPayment: PaymentResult = {
  provider: 'dummy',
  status: 'success',
  transactionId: 'test_0123456789abcdef0123',
  mode: 'test',
  method: 'upi',
  amount: 677,
};

describe('schema types', () => {
  it('match the shared domain types', () => {
    expectTypeOf<z.infer<typeof AddressSchema>>().toEqualTypeOf<Address>();
    expectTypeOf<z.infer<typeof PaymentResultSchema>>().toEqualTypeOf<PaymentResult>();
    expectTypeOf<z.infer<typeof PlaceOrderRequestSchema>>().toEqualTypeOf<PlaceOrderRequest>();
    expectTypeOf<z.infer<typeof SubmitReviewSchema>>().toEqualTypeOf<SubmitReviewRequest>();
    expectTypeOf<z.infer<typeof NewsletterSchema>>().toEqualTypeOf<NewsletterRequest>();
  });
});

describe('INDIAN_STATES', () => {
  it('lists 28 states and 8 union territories', () => {
    expect(INDIAN_STATES).toHaveLength(36);
    expect(new Set(INDIAN_STATES).size).toBe(36);
  });
});

describe('AddressSchema', () => {
  it('accepts a valid Indian address and trims fields', () => {
    const parsed = AddressSchema.parse({ ...validAddress, name: '  Arjun Mehta  ', line2: '' });
    expect(parsed.name).toBe('Arjun Mehta');
    expect(parsed.line2).toBe('');
  });

  it.each([
    ['phone', '5876543210'],
    ['phone', '98765'],
    ['pincode', '060001'],
    ['pincode', '5600011'],
    ['state', 'Atlantis'],
    ['name', 'A'],
    ['line1', 'abc'],
  ])('rejects invalid %s (%s)', (field, value) => {
    const result = AddressSchema.safeParse({ ...validAddress, [field]: value });
    expect(result.success).toBe(false);
  });
});

describe('PaymentResultSchema', () => {
  it('accepts a dummy test payment and rejects bad amounts', () => {
    expect(PaymentResultSchema.safeParse(validPayment).success).toBe(true);
    expect(PaymentResultSchema.safeParse({ ...validPayment, amount: -1 }).success).toBe(false);
    expect(PaymentResultSchema.safeParse({ ...validPayment, method: 'cash' }).success).toBe(false);
  });
});

describe('PlaceOrderRequestSchema', () => {
  it('accepts a valid request', () => {
    const result = PlaceOrderRequestSchema.safeParse({
      items: [{ productId: 'p1', qty: 2 }],
      address: validAddress,
      payment: validPayment,
    });
    expect(result.success).toBe(true);
  });

  it('rejects empty carts, duplicate lines and bad quantities', () => {
    const base = { address: validAddress, payment: validPayment };
    expect(PlaceOrderRequestSchema.safeParse({ ...base, items: [] }).success).toBe(false);
    expect(
      PlaceOrderRequestSchema.safeParse({
        ...base,
        items: [
          { productId: 'p1', qty: 1 },
          { productId: 'p1', qty: 1 },
        ],
      }).success,
    ).toBe(false);
    expect(
      PlaceOrderRequestSchema.safeParse({ ...base, items: [{ productId: 'p1', qty: 11 }] }).success,
    ).toBe(false);
    expect(
      PlaceOrderRequestSchema.safeParse({ ...base, items: [{ productId: 'a/b', qty: 1 }] }).success,
    ).toBe(false);
  });

  it('rejects unknown payment providers', () => {
    const result = PlaceOrderRequestSchema.safeParse({
      items: [{ productId: 'p1', qty: 1 }],
      address: validAddress,
      payment: { ...validPayment, provider: 'stripe' },
    });
    expect(result.success).toBe(false);
  });
});

describe('SubmitReviewSchema', () => {
  it('validates rating and text length', () => {
    expect(
      SubmitReviewSchema.safeParse({ productId: 'p1', rating: 5, text: 'Beautiful casting!' })
        .success,
    ).toBe(true);
    expect(
      SubmitReviewSchema.safeParse({ productId: 'p1', rating: 0, text: 'Beautiful casting!' })
        .success,
    ).toBe(false);
    expect(
      SubmitReviewSchema.safeParse({ productId: 'p1', rating: 4.5, text: 'Beautiful casting!' })
        .success,
    ).toBe(false);
    expect(
      SubmitReviewSchema.safeParse({ productId: 'p1', rating: 4, text: 'short' }).success,
    ).toBe(false);
    expect(ReviewFormSchema.safeParse({ rating: 4, text: 'Great wheels and paint.' }).success).toBe(
      true,
    );
  });
});

describe('NewsletterSchema', () => {
  it('normalises emails', () => {
    expect(NewsletterSchema.parse({ email: '  Racer@Example.COM ' }).email).toBe(
      'racer@example.com',
    );
    expect(NewsletterSchema.safeParse({ email: 'not-an-email' }).success).toBe(false);
  });
});

describe('india helpers', () => {
  it('normalises phone input', () => {
    expect(normalizeIndianPhone('+91 98765-43210')).toBe('9876543210');
    expect(normalizeIndianPhone('09876543210')).toBe('9876543210');
  });

  it('validates pincodes', () => {
    expect(isValidPincode('110001')).toBe(true);
    expect(isValidPincode('011001')).toBe(false);
  });
});
