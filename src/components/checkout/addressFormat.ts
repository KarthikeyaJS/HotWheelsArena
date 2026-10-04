/** Address helpers (pure): display lines + form value conversion. */
import type { AddressInput } from '@shared/schemas';
import type { Address, SavedAddress } from '@/types';

/** `["Flat 4B, Sea View", "Near Metro", "Bandra West", "Mumbai, Maharashtra 400050"]`. */
export function formatAddressLines(address: Address): string[] {
  const cityLine = [address.city, [address.state, address.pincode].filter(Boolean).join(' ')]
    .filter(Boolean)
    .join(', ');
  return [
    address.line1,
    address.line2,
    address.landmark ? `Landmark: ${address.landmark}` : undefined,
    cityLine,
  ].filter((line): line is string => Boolean(line && line.trim()));
}

/** `98765 43210` for display (input stays 10 digits). */
export function formatPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  return digits.length === 10 ? `${digits.slice(0, 5)} ${digits.slice(5)}` : phone;
}

export function emptyAddressValues(name = ''): AddressInput {
  return { name, phone: '', pincode: '', line1: '', line2: '', landmark: '', city: '', state: '' };
}

export function toAddressValues(address: Address): AddressInput {
  return {
    name: address.name,
    phone: address.phone,
    pincode: address.pincode,
    line1: address.line1,
    line2: address.line2 ?? '',
    landmark: address.landmark ?? '',
    city: address.city,
    state: address.state,
  };
}

/** Validated form values → `Address` (blank optional lines omitted). */
export function toAddress(values: AddressInput): Address {
  const line2 = values.line2?.trim();
  const landmark = values.landmark?.trim();
  return {
    name: values.name.trim(),
    phone: values.phone.trim(),
    pincode: values.pincode.trim(),
    line1: values.line1.trim(),
    ...(line2 ? { line2 } : {}),
    ...(landmark ? { landmark } : {}),
    city: values.city.trim(),
    state: values.state.trim(),
  };
}

/** Saved address → plain `Address` (drops id / flags / timestamps). */
export function savedToAddress(saved: SavedAddress): Address {
  return toAddress(toAddressValues(saved));
}
