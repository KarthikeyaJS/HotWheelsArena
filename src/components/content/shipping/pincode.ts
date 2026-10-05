/**
 * PIN-code helper for the Shipping & Returns page. India Post assigns the first digit of a PIN
 * code to a postal zone (9 = Army Postal Service); a few prefixes cover remote regions where
 * couriers need extra days. This is an estimate shown to collectors, not a live serviceability API.
 */
import { isValidPincode } from '@shared/india';

export interface PostalZone {
  zone: string;
  region: string;
}

export const POSTAL_ZONES: Readonly<Record<string, PostalZone>> = {
  '1': {
    zone: 'Northern',
    region: 'Delhi, Haryana, Punjab, Himachal Pradesh, Chandigarh, Jammu & Kashmir, Ladakh',
  },
  '2': { zone: 'Northern', region: 'Uttar Pradesh, Uttarakhand' },
  '3': {
    zone: 'Western',
    region: 'Rajasthan, Gujarat, Dadra & Nagar Haveli and Daman & Diu',
  },
  '4': { zone: 'Western', region: 'Maharashtra, Goa, Madhya Pradesh, Chhattisgarh' },
  '5': { zone: 'Southern', region: 'Andhra Pradesh, Telangana, Karnataka' },
  '6': { zone: 'Southern', region: 'Tamil Nadu, Kerala, Puducherry, Lakshadweep' },
  '7': {
    zone: 'Eastern',
    region: 'West Bengal, Odisha, Sikkim, the North-East, Andaman & Nicobar Islands',
  },
  '8': { zone: 'Eastern', region: 'Bihar, Jharkhand' },
  '9': { zone: 'Army Postal Service', region: 'APO / FPO addresses' },
};

/** Prefixes of remote regions: J&K + Ladakh, the North-East, Sikkim, Andaman & Nicobar, Lakshadweep. */
export const REMOTE_PIN_PREFIXES: readonly string[] = [
  '18',
  '19',
  '78',
  '79',
  '737',
  '744',
  '68255',
];

export const STANDARD_DELIVERY_WINDOW = '3–7 business days';
export const REMOTE_DELIVERY_WINDOW = '5–10 business days';

export type PincodeCheck =
  | { status: 'invalid'; pincode: string }
  | {
      status: 'ok';
      pincode: string;
      zone: string;
      region: string;
      remote: boolean;
      /** Army / field post office — shipped on request only. */
      armyPost: boolean;
      deliveryWindow: string;
    };

/** Strips spaces/dashes a collector may type (`560 001` → `560001`). */
export function normalizePincode(input: string): string {
  return input.replace(/[\s-]/g, '');
}

/** Postal zone + delivery estimate for a PIN code, or `invalid` when it is not 6 digits (1–9 first). */
export function checkPincode(input: string): PincodeCheck {
  const pincode = normalizePincode(input);
  const zone = POSTAL_ZONES[pincode.charAt(0)];
  if (!isValidPincode(pincode) || !zone) return { status: 'invalid', pincode };
  const armyPost = pincode.startsWith('9');
  const remote = !armyPost && REMOTE_PIN_PREFIXES.some((prefix) => pincode.startsWith(prefix));
  return {
    status: 'ok',
    pincode,
    zone: zone.zone,
    region: zone.region,
    remote,
    armyPost,
    deliveryWindow: remote ? REMOTE_DELIVERY_WINDOW : STANDARD_DELIVERY_WINDOW,
  };
}
