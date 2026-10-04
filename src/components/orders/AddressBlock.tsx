import { formatAddressLines, formatPhone } from '@/components/checkout/addressFormat';
import { cn } from '@/lib/cn';
import type { Address } from '@/types';

export interface AddressBlockProps {
  address: Address;
  className?: string;
}

/** A delivery address as an `<address>` block (name, lines, phone). */
export function AddressBlock({ address, className }: AddressBlockProps) {
  return (
    <address className={cn('flex flex-col gap-0.5 text-sm not-italic text-muted', className)}>
      <span className="font-semibold text-fg">{address.name}</span>
      {formatAddressLines(address).map((line) => (
        <span key={line}>{line}</span>
      ))}
      <span className="mt-1 font-mono text-xs text-fg">+91 {formatPhone(address.phone)}</span>
    </address>
  );
}
