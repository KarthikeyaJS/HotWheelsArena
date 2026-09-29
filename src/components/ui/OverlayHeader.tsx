import { X } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { IconButton } from './IconButton';

export interface OverlayHeaderProps {
  titleId: string;
  descriptionId?: string;
  title: ReactNode;
  description?: ReactNode;
  /** Mono HUD line above the title. */
  eyebrow?: ReactNode;
  onClose: () => void;
  hideCloseButton?: boolean;
  closeLabel?: string;
  className?: string;
  titleClassName?: string;
}

/** Title / description / close button row shared by `Modal` and `Drawer` (internal). */
export function OverlayHeader({
  titleId,
  descriptionId,
  title,
  description,
  eyebrow,
  onClose,
  hideCloseButton = false,
  closeLabel = 'Close',
  className,
  titleClassName,
}: OverlayHeaderProps) {
  return (
    <div className={cn('flex items-start gap-4', className)}>
      <div className="min-w-0 flex-1">
        {eyebrow ? <p className="eyebrow mb-2">{eyebrow}</p> : null}
        <h2 id={titleId} className={cn('text-lg leading-tight text-fg sm:text-xl', titleClassName)}>
          {title}
        </h2>
        {description ? (
          <p id={descriptionId} className="mt-2 text-sm text-muted">
            {description}
          </p>
        ) : null}
      </div>
      {hideCloseButton ? null : (
        <IconButton
          data-dialog-close=""
          label={closeLabel}
          icon={<X />}
          variant="ghost"
          size="sm"
          onClick={onClose}
          className="-mr-2 -mt-1"
        />
      )}
    </div>
  );
}
