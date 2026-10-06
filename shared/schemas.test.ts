import { describe, expect, expectTypeOf, it } from 'vitest';
import type { z } from 'zod';
import { INDIAN_STATES, isValidPincode, normalizeIndianPhone } from './india.js';
import {
  AddressSchema,
  DocIdSchema,
  HIDDEN_CHARACTERS_MESSAGE,
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

describe('AddressSchema hidden characters', () => {
  it.each([
    ['NUL', 'U+0000'],
    ['RLO', 'U+202E'],
    ['ZWSP', 'U+200B'],
  ])('rejects line1 containing %s (%s)', (_name, codePoint) => {
    const char = String.fromCodePoint(Number.parseInt(codePoint.slice(2), 16));
    const result = AddressSchema.safeParse({ ...validAddress, line1: `12, MG ${char}Road` });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe(HIDDEN_CHARACTERS_MESSAGE);
    expect(result.error?.issues[0]?.path).toEqual(['line1']);
  });

  it.each(['name', 'line1', 'line2', 'landmark', 'city'] as const)(
    'checks %s for control / bidi / zero-width characters',
    (field) => {
      const result = AddressSchema.safeParse({
        ...validAddress,
        [field]: 'Bengaluru\u2066x\u2069',
      });
      expect(result.success).toBe(false);
      expect(result.error?.issues[0]?.path).toEqual([field]);
    },
  );

  it('accepts ordinary and Hindi address text', () => {
    expect(AddressSchema.safeParse({ ...validAddress, line1: 'Flat 4, MG Road' }).success).toBe(
      true,
    );
    expect(
      AddressSchema.safeParse({
        ...validAddress,
        name: 'अर्जुन मेहता',
        line1: 'फ्लैट 4, एमजी रोड',
        landmark: 'मंदिर के पास',
        city: 'बेंगलुरु',
      }).success,
    ).toBe(true);
  });
});

describe('AddressSchema joiners (ZWNJ / ZWJ are allowed)', () => {
  it('accepts a Marathi eyelash-ra, a Malayalam chillu and a ZWNJ half form', () => {
    const result = AddressSchema.safeParse({
      ...validAddress,
      name: 'दर्\u200Dया पाटील',
      line1: 'फ्लैट 4, क्\u200Cष रोड',
      landmark: 'അവന്\u200D സ്കൂൾ',
      city: 'पुणे',
    });
    expect(result.success).toBe(true);
  });

  it('still rejects bidi marks next to a joiner', () => {
    const result = AddressSchema.safeParse({ ...validAddress, line1: 'दर्\u200Dया \u200ERoad' });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe(HIDDEN_CHARACTERS_MESSAGE);
  });
});

describe('DocIdSchema', () => {
  it.each([
    '.',
    '..',
    '__x__',
    '__',
    '___',
    '__a__',
    'a/b',
    'a b',
    'a.b',
    '',
    '   ',
    'x'.repeat(129),
  ])('rejects %j', (id) => {
    expect(DocIdSchema.safeParse(id).success).toBe(false);
  });

  it.each(['porsche-911-gt3-rs', 'As5rVIGx77iXmitTi3vh', '_draft', 'a__b', '__a', 'x'.repeat(128)])(
    'accepts %j',
    (id) => {
      expect(DocIdSchema.safeParse(id).success).toBe(true);
    },
  );

  it('trims before validating', () => {
    expect(DocIdSchema.parse('  porsche-911-gt3-rs ')).toBe('porsche-911-gt3-rs');
  });

  it('guards the callable product ids', () => {
    const base = { address: validAddress, payment: validPayment };
    for (const productId of ['__x__', '.']) {
      expect(
        PlaceOrderRequestSchema.safeParse({ ...base, items: [{ productId, qty: 1 }] }).success,
      ).toBe(false);
      expect(
        SubmitReviewSchema.safeParse({ productId, rating: 4, text: 'Beautiful casting!' }).success,
      ).toBe(false);
    }
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
