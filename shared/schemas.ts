/**
 * Zod schemas shared by client forms (react-hook-form + zodResolver) and callable
 * Cloud Functions (server-side validation). Inferred types match `types.ts` exactly
 * (asserted in schemas.test.ts).
 */
import { z } from 'zod';
import { MAX_ORDER_LINES, MAX_QTY_PER_ITEM } from './commerce.js';
import { INDIAN_PHONE_REGEX, INDIAN_PINCODE_REGEX, isIndianState } from './india.js';
import { PAYMENT_METHODS, PAYMENT_MODES, PAYMENT_PROVIDER_IDS, PAYMENT_STATUSES } from './types.js';

/** Firestore document id: 1–128 chars, no `/`. */
export const DocIdSchema = z
  .string()
  .trim()
  .min(1, 'Missing id')
  .max(128, 'Id is too long')
  .regex(/^[^/]+$/, 'Invalid id');

export const AddressSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Enter the full name (at least 2 characters)')
    .max(80, 'Name must be 80 characters or fewer'),
  phone: z
    .string()
    .trim()
    .regex(INDIAN_PHONE_REGEX, 'Enter a valid 10-digit mobile number starting with 6–9'),
  pincode: z.string().trim().regex(INDIAN_PINCODE_REGEX, 'Enter a valid 6-digit PIN code'),
  line1: z
    .string()
    .trim()
    .min(5, 'Enter house / flat number and street')
    .max(120, 'Address line must be 120 characters or fewer'),
  line2: z.string().trim().max(120, 'Address line must be 120 characters or fewer').optional(),
  landmark: z.string().trim().max(80, 'Landmark must be 80 characters or fewer').optional(),
  city: z.string().trim().min(2, 'Enter your city').max(60, 'City must be 60 characters or fewer'),
  state: z
    .string()
    .trim()
    .refine((value): boolean => isIndianState(value), 'Select your state or union territory'),
});

export const PaymentResultSchema = z.object({
  provider: z.enum(PAYMENT_PROVIDER_IDS),
  status: z.enum(PAYMENT_STATUSES),
  transactionId: z.string().trim().min(1).max(128),
  mode: z.enum(PAYMENT_MODES),
  method: z.enum(PAYMENT_METHODS),
  amount: z.number().finite().nonnegative(),
  message: z.string().max(300).optional(),
});

export const PlaceOrderItemSchema = z.object({
  productId: DocIdSchema,
  qty: z
    .number()
    .int('Quantity must be a whole number')
    .min(1, 'Quantity must be at least 1')
    .max(MAX_QTY_PER_ITEM, `Max ${MAX_QTY_PER_ITEM} per collector`),
});

export const PlaceOrderRequestSchema = z.object({
  items: z
    .array(PlaceOrderItemSchema)
    .min(1, 'Your pit stop is empty')
    .max(MAX_ORDER_LINES, `An order can hold at most ${MAX_ORDER_LINES} different cars`)
    .refine(
      (items) => new Set(items.map((item) => item.productId)).size === items.length,
      'Each car can only appear once per order',
    ),
  address: AddressSchema,
  payment: PaymentResultSchema,
});

export const REVIEW_TEXT_MIN = 10;
export const REVIEW_TEXT_MAX = 1000;

export const SubmitReviewSchema = z.object({
  productId: DocIdSchema,
  rating: z
    .number()
    .int('Pick a star rating')
    .min(1, 'Pick a star rating')
    .max(5, 'Ratings go up to 5 stars'),
  text: z
    .string()
    .trim()
    .min(
      REVIEW_TEXT_MIN,
      `Tell other collectors a bit more (at least ${REVIEW_TEXT_MIN} characters)`,
    )
    .max(REVIEW_TEXT_MAX, `Keep it under ${REVIEW_TEXT_MAX} characters`),
});

/** Client review form (productId comes from the page). */
export const ReviewFormSchema = SubmitReviewSchema.omit({ productId: true });

export const NewsletterSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .min(1, 'Enter your email address')
    .max(254, 'Email is too long')
    .email('Enter a valid email address'),
});

export type AddressInput = z.infer<typeof AddressSchema>;
export type PaymentResultInput = z.infer<typeof PaymentResultSchema>;
export type PlaceOrderRequestInput = z.infer<typeof PlaceOrderRequestSchema>;
export type SubmitReviewInput = z.infer<typeof SubmitReviewSchema>;
export type ReviewFormValues = z.infer<typeof ReviewFormSchema>;
export type NewsletterInput = z.infer<typeof NewsletterSchema>;
