import { ScanLine } from 'lucide-react';
import { IconButton, type IconButtonSize } from '@/components/ui/IconButton';
import { cn } from '@/lib/cn';
import { useScanlinesActive, useUiStore } from '@/store/uiStore';
import type { ScanlineMode } from '@/types';
import { ToggleRow } from './ToggleRow';

export interface ScanlinesToggleProps {
  /** `icon` (navbar), `row` (drawer), `menuitem` (user menu), `text` (footer chip). */
  variant?: 'icon' | 'row' | 'menuitem' | 'text';
  size?: IconButtonSize;
  className?: string;
}

const MODE_LABEL: Readonly<Record<ScanlineMode, string>> = {
  auto: 'Auto',
  on: 'On',
  off: 'Off',
};

const NEXT_MODE: Readonly<Record<ScanlineMode, ScanlineMode>> = {
  auto: 'on',
  on: 'off',
  off: 'auto',
};

/**
 * CRT scanlines preference: cycles auto (dark theme only) → on → off. The accessible name
 * states the current mode and the next one.
 */
export function ScanlinesToggle({
  variant = 'icon',
  size = 'md',
  className,
}: ScanlinesToggleProps) {
  const mode = useUiStore((state) => state.scanlines);
  const cycle = useUiStore((state) => state.cycleScanlines);
  const active = useScanlinesActive();
  const name = `CRT scanlines: ${MODE_LABEL[mode].toLowerCase()}. Switch to ${MODE_LABEL[
    NEXT_MODE[mode]
  ].toLowerCase()}`;

  if (variant === 'row' || variant === 'menuitem') {
    return (
      <ToggleRow
        icon={ScanLine}
        label="CRT scanlines"
        value={MODE_LABEL[mode].toUpperCase()}
        highlighted={mode !== 'off' && active}
        ariaLabel={name}
        menuItem={variant === 'menuitem'}
        onClick={cycle}
        className={className}
      />
    );
  }

  if (variant === 'text') {
    return (
      <button
        type="button"
        onClick={cycle}
        aria-label={name}
        className={cn(
          'hud inline-flex h-8 items-center gap-2 rounded-md border border-line px-2.5 text-[10px] text-muted transition-colors hover:border-accent/60 hover:text-fg',
          className,
        )}
      >
        <ScanLine aria-hidden="true" className="h-3.5 w-3.5" />
        Scanlines · {MODE_LABEL[mode]}
      </button>
    );
  }

  return (
    <IconButton
      label={name}
      title={`CRT scanlines: ${MODE_LABEL[mode]}`}
      size={size}
      onClick={cycle}
      className={className}
      icon={<ScanLine />}
    />
  );
}
