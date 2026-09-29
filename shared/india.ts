/** Indian states (28) and union territories (8), alphabetical within each group. */
export const INDIAN_STATES = [
  'Andhra Pradesh',
  'Arunachal Pradesh',
  'Assam',
  'Bihar',
  'Chhattisgarh',
  'Goa',
  'Gujarat',
  'Haryana',
  'Himachal Pradesh',
  'Jharkhand',
  'Karnataka',
  'Kerala',
  'Madhya Pradesh',
  'Maharashtra',
  'Manipur',
  'Meghalaya',
  'Mizoram',
  'Nagaland',
  'Odisha',
  'Punjab',
  'Rajasthan',
  'Sikkim',
  'Tamil Nadu',
  'Telangana',
  'Tripura',
  'Uttar Pradesh',
  'Uttarakhand',
  'West Bengal',
  'Andaman and Nicobar Islands',
  'Chandigarh',
  'Dadra and Nagar Haveli and Daman and Diu',
  'Delhi',
  'Jammu and Kashmir',
  'Ladakh',
  'Lakshadweep',
  'Puducherry',
] as const;

export type IndianState = (typeof INDIAN_STATES)[number];

/** 10-digit Indian mobile number starting 6–9 (no +91 / leading 0). */
export const INDIAN_PHONE_REGEX = /^[6-9]\d{9}$/;

/** 6-digit PIN code, first digit 1–9. */
export const INDIAN_PINCODE_REGEX = /^[1-9]\d{5}$/;

export function isIndianState(value: string): value is IndianState {
  return (INDIAN_STATES as readonly string[]).includes(value);
}

export function isValidIndianPhone(value: string): boolean {
  return INDIAN_PHONE_REGEX.test(value);
}

export function isValidPincode(value: string): boolean {
  return INDIAN_PINCODE_REGEX.test(value);
}

/**
 * Normalises user-typed phone input to 10 digits: strips spaces, dashes,
 * a leading `+91`/`91` country code or a leading trunk `0`.
 * Returns the cleaned string (validate with `isValidIndianPhone`).
 */
export function normalizeIndianPhone(value: string): string {
  let digits = value.replace(/[^\d]/g, '');
  if (digits.length === 12 && digits.startsWith('91')) digits = digits.slice(2);
  if (digits.length === 11 && digits.startsWith('0')) digits = digits.slice(1);
  return digits;
}
