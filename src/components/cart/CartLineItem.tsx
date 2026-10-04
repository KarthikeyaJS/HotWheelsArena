import { AlertTriangle, ArrowDownRight, ArrowUpRight, Trash2 } from 'lucide-react';
import { memo, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { CarImage } from '@/components/product/CarImage';
import { StockStatus } from '@/components/product/StockStatus';
import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { IconButton } from '@/components/ui/IconButton';
import { QuantityStepper } from '@/components/ui/QuantityStepper';
import { RarityChip } from '@/components/ui/RarityChip';
import { productPath } from '@/config/routes';
import { cn } from '@/lib/cn';
import { formatCollectionNumber, formatINR } from '@/lib/format';
import { isLowStock, productHudLine } from '@/lib/product';
import type { ReconciledCartLine } from './reconcile';

export interface CartLineItemProps {
  line: ReconciledCartLine;
  onQtyChange: (productId: string, qty: number) => void;
  onRemove: (line: ReconciledCartLine) => void;
  /** Move keyboard focus to this line's name on mount (e.g. after an undo). */
  focusOnMount?: boolean;
  headingAs?: 'h2' | 'h3';
  className?: string;
}

/** `SERIES 03 · #142` (falls back to the snapshot's series name when unverified). */
function hudLabel(line: ReconciledCartLine): string {
  if (line.product) {
    const hud = productHudLine(line.product);
    return `${hud.series} · ${hud.collection}`;
  }
  const parts = [
    line.item.seriesName?.toUpperCase(),
    line.item.collectionNumber !== undefined
      ? formatCollectionNumber(line.item.collectionNumber)
      : undefined,
  ].filter((part): part is string => Boolean(part));
  return parts.join(' · ');
}

const BLOCKED_COPY = {
  'sold-out': { chip: 'SOLD OUT', text: 'This car sold out since you added it.' },
  unavailable: { chip: 'UNAVAILABLE', text: 'This car is no longer in the garage.' },
} as const;

/** One pit-stop line: thumbnail, HUD line, name, unit price, quantity, line total, remove. */
export const CartLineItem = memo(function CartLineItem({
  line,
  onQtyChange,
  onRemove,
  focusOnMount = false,
  headingAs: Heading = 'h3',
  className,
}: CartLineItemProps) {
  const { item, status, previousPrice, previousQty } = line;
  const blocked = status !== 'ok';
  const nameRef = useRef<HTMLAnchorElement>(null);
  const focusOnMountRef = useRef(focusOnMount);

  useEffect(() => {
    if (focusOnMountRef.current) nameRef.current?.focus();
  }, []);

  const hud = hudLabel(line);
  const href = productPath(item.slug);
  const lineTotal = item.price * item.qty;
  const priceWentUp = previousPrice !== null && item.price > previousPrice;

  return (
    <article
      aria-label={item.name}
      data-status={status}
      className={cn(
        'group relative flex gap-3 overflow-hidden rounded-xl border bg-card p-3 shadow-card transition-colors duration-200 ease-race sm:gap-5 sm:p-4',
        blocked ? 'border-danger/40' : 'border-line hover:bg-card-hover',
        className,
      )}
    >
      <span
        aria-hidden="true"
        className={cn('racing-stripe racing-stripe-left', blocked && 'hidden')}
      />

      <Link
        to={href}
        tabIndex={-1}
        aria-hidden="true"
        className="relative block w-24 shrink-0 self-start overflow-hidden rounded-lg border border-line bg-surface sm:w-40"
      >
        <span aria-hidden="true" className="bg-grid absolute inset-0 opacity-60" />
        <CarImage
          src={item.image}
          alt=""
          width={160}
          height={100}
          className={cn('relative', blocked && 'opacity-40 grayscale')}
          imgClassName="transition-transform duration-300 ease-race group-hover:scale-105"
        />
      </Link>

      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
          {hud ? <p className="hud text-muted">{hud}</p> : null}
          {line.product && !blocked ? <RarityChip rarity={line.product.rarity} size="sm" /> : null}
          {blocked ? (
            <Chip tone="danger" variant="solid" size="sm" icon={<AlertTriangle />}>
              {BLOCKED_COPY[status].chip}
            </Chip>
          ) : null}
          {!blocked && previousPrice !== null ? (
            <Chip
              tone={priceWentUp ? 'danger' : 'success'}
              variant="soft"
              size="sm"
              icon={priceWentUp ? <ArrowUpRight /> : <ArrowDownRight />}
            >
              {priceWentUp ? 'PRICE UP' : 'PRICE DROP'}
            </Chip>
          ) : null}
        </div>

        <Heading className="font-display text-sm font-bold normal-case leading-snug tracking-normal sm:text-base">
          <Link
            ref={nameRef}
            to={href}
            className="rounded-sm text-fg transition-colors duration-150 hover:text-accent-ink"
          >
            {item.name}
          </Link>
        </Heading>

        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 text-xs">
          <p className="text-muted">
            <span className="font-mono text-sm font-semibold tabular-nums text-fg">
              {formatINR(item.price)}
            </span>{' '}
            each
            {previousPrice !== null ? (
              <>
                {' '}
                <s className="font-mono tabular-nums">
                  <span className="sr-only">was </span>
                  {formatINR(previousPrice)}
                </s>
              </>
            ) : null}
          </p>
          {!blocked && isLowStock(item.stock) ? <StockStatus stock={item.stock} size="sm" /> : null}
          {previousQty !== null ? (
            <p className="text-danger-ink">
              Quantity lowered from <span className="font-mono">{previousQty}</span> — only{' '}
              <span className="font-mono">{line.maxQty}</span> available
            </p>
          ) : null}
        </div>

        {blocked ? (
          <div className="mt-1 flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-danger-ink">
              {BLOCKED_COPY[status].text} Remove it to start your engine.
            </p>
            <Button
              variant="outline"
              size="sm"
              leftIcon={<Trash2 />}
              onClick={() => onRemove(line)}
              aria-label={`Remove ${item.name} from your pit stop`}
            >
              Remove
            </Button>
          </div>
        ) : (
          <div className="mt-auto flex flex-wrap items-center justify-between gap-x-4 gap-y-3 pt-1">
            <QuantityStepper
              size="sm"
              value={item.qty}
              min={1}
              max={Math.max(1, line.maxQty)}
              label={`Quantity of ${item.name}`}
              onChange={(qty) => onQtyChange(item.productId, qty)}
            />
            <div className="ml-auto flex items-center gap-2 sm:gap-3">
              <p className="text-right">
                <span className="sr-only">Line total: </span>
                <span className="font-mono text-base font-bold tabular-nums text-fg sm:text-lg">
                  {formatINR(lineTotal)}
                </span>
              </p>
              <IconButton
                label={`Remove ${item.name} from your pit stop`}
                icon={<Trash2 />}
                variant="ghost"
                size="sm"
                onClick={() => onRemove(line)}
                className="text-muted hover:text-danger-ink"
              />
            </div>
          </div>
        )}
      </div>
    </article>
  );
});
