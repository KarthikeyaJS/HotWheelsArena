import { motion } from 'framer-motion';
import { Check, Trash2, Warehouse } from 'lucide-react';
import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { Button, type ButtonSize } from '@/components/ui';
import { useUid } from '@/hooks/useAuth';
import { useGarageActions } from '@/hooks/useGarageActions';
import { cn } from '@/lib/cn';
import { useGarageQuantity, useIsInGarage } from '@/store/garageStore';
import type { Product } from '@/types';
import { useEngineShake } from './useEngineShake';

export interface AddToGarageButtonProps {
  product: Pick<Product, 'id' | 'name'>;
  size?: ButtonSize;
  fullWidth?: boolean;
  /** Idle style (default `secondary`). */
  variant?: 'secondary' | 'outline' | 'primary';
  className?: string;
}

/** How long the "confirm remove" step stays armed. */
const CONFIRM_WINDOW_MS = 4000;

/**
 * ADD TO GARAGE (collection, not cart). Uses `useGarageActions` — optimistic, auth-gated (opens
 * the sign-in prompt and parks the car right after sign-in). Parking runs an engine shake.
 * Parked state: "IN YOUR GARAGE ✓" (×n for duplicates); pressing it
 * arms a "Confirm remove?" step (4s, Escape/blur cancels) and a second press removes the car.
 */
export function AddToGarageButton({
  product,
  size = 'md',
  fullWidth = false,
  variant = 'secondary',
  className,
}: AddToGarageButtonProps) {
  const uid = useUid();
  const inGarage = useIsInGarage(product.id);
  const quantity = useGarageQuantity(product.id);
  const { addToGarage, removeFromGarage, pendingProductId } = useGarageActions();
  const { controls, variants, shake } = useEngineShake();
  const [confirming, setConfirming] = useState(false);
  const [lastAction, setLastAction] = useState<'add' | 'remove'>('add');
  const [announcement, setAnnouncement] = useState('');
  const confirmTimer = useRef<number | null>(null);

  const clearConfirmTimer = (): void => {
    if (confirmTimer.current !== null) {
      window.clearTimeout(confirmTimer.current);
      confirmTimer.current = null;
    }
  };

  useEffect(() => clearConfirmTimer, []);

  // Leaving the garage (from anywhere) disarms the confirm step.
  const isConfirming = confirming && inGarage;

  const pending = pendingProductId === product.id;

  const cancelConfirm = (): void => {
    clearConfirmTimer();
    setConfirming(false);
  };

  const handleClick = (): void => {
    if (pending) return;

    if (!inGarage) {
      setLastAction('add');
      setAnnouncement('');
      addToGarage({ id: product.id, name: product.name });
      if (uid) shake();
      return;
    }

    if (!isConfirming) {
      setConfirming(true);
      setAnnouncement(
        `Press again to remove ${product.name} from your garage, or press Escape to keep it.`,
      );
      clearConfirmTimer();
      confirmTimer.current = window.setTimeout(() => {
        confirmTimer.current = null;
        setConfirming(false);
        setAnnouncement('');
      }, CONFIRM_WINDOW_MS);
      return;
    }

    cancelConfirm();
    setLastAction('remove');
    setAnnouncement('');
    removeFromGarage({ id: product.id, name: product.name });
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLElement>): void => {
    if (event.key === 'Escape' && isConfirming) {
      event.stopPropagation();
      cancelConfirm();
      setAnnouncement(`${product.name} stays in your garage.`);
    }
  };

  let content: ReactNode;
  let accessibleName: string;
  let leftIcon: ReactNode = null;
  let rightIcon: ReactNode = null;
  let resolvedVariant: 'secondary' | 'outline' | 'primary' | 'danger' = variant;
  let stateClasses: string | undefined;

  if (isConfirming) {
    content = 'Confirm remove?';
    accessibleName = `Confirm: remove ${product.name} from your garage`;
    leftIcon = <Trash2 />;
    resolvedVariant = 'danger';
  } else if (inGarage) {
    content = (
      <>
        In your garage
        {quantity > 1 ? (
          <span className="ml-1.5 font-mono tabular-nums tracking-normal" aria-hidden="true">
            ×{quantity}
          </span>
        ) : null}
      </>
    );
    accessibleName = `In your garage${quantity > 1 ? ` (${quantity} copies)` : ''} – ${product.name}. Press to remove`;
    rightIcon = <Check />;
    resolvedVariant = 'outline';
    stateClasses = 'border-success/60 text-success hover:border-success hover:text-success';
  } else {
    content = 'Add to garage';
    accessibleName = `Add to garage – ${product.name}`;
    leftIcon = <Warehouse />;
  }

  return (
    <motion.span
      className={cn('relative inline-flex', fullWidth && 'flex w-full', className)}
      initial="idle"
      animate={controls}
      variants={variants}
    >
      <Button
        variant={resolvedVariant}
        size={size}
        fullWidth={fullWidth}
        leftIcon={leftIcon}
        rightIcon={rightIcon}
        loading={pending}
        loadingText={lastAction === 'remove' ? 'Removing…' : 'Parking…'}
        aria-label={pending ? undefined : accessibleName}
        data-state={isConfirming ? 'confirm' : inGarage ? 'in-garage' : 'idle'}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        onBlur={isConfirming ? cancelConfirm : undefined}
        className={stateClasses}
      >
        {content}
      </Button>
      <span className="sr-only" role="status" aria-live="polite">
        {announcement}
      </span>
    </motion.span>
  );
}
