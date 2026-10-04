import { Chip, type ChipSize, type ChipTone } from '@/components/ui/Chip';
import { ORDER_STATUS_META, type OrderStatusTone } from '@/lib/order';
import { cn } from '@/lib/cn';
import type { OrderStatus } from '@/types';

const TONES: Readonly<Record<OrderStatusTone, ChipTone>> = {
  neutral: 'neutral',
  accent: 'accent',
  success: 'success',
  danger: 'danger',
};

const DOTS: Readonly<Record<OrderStatusTone, string>> = {
  neutral: 'bg-muted',
  accent: 'bg-accent',
  success: 'bg-success',
  danger: 'bg-danger',
};

export interface OrderStatusChipProps {
  status: OrderStatus;
  size?: ChipSize;
  className?: string;
}

/** `PLACED` / `PROCESSING` / `SHIPPED` / `DELIVERED` / `CANCELLED` status chip. */
export function OrderStatusChip({ status, size = 'md', className }: OrderStatusChipProps) {
  const meta = ORDER_STATUS_META[status];
  return (
    <Chip
      tone={TONES[meta.tone]}
      variant="soft"
      size={size}
      className={className}
      icon={<span className={cn('h-1.5 w-1.5 rounded-full', DOTS[meta.tone])} />}
    >
      <span className="sr-only">Status: </span>
      {meta.label}
    </Chip>
  );
}
