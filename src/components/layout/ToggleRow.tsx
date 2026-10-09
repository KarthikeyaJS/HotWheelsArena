import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/cn';

export interface ToggleRowProps {
  icon: LucideIcon;
  label: string;
  /** Short mono value on the right (`ON`, `DARK`, `AUTO`). */
  value: string;
  onClick: () => void;
  /** `switch` (on/off, uses `aria-checked`) or a plain `button` (cycles values). */
  kind?: 'switch' | 'button';
  checked?: boolean;
  /** Accessible name override for `button` rows (default `"<label>: <value>"`). */
  ariaLabel?: string;
  /** `menuitem` rows are rendered inside a `role="menu"`. */
  menuItem?: boolean;
  /** Force the value pill's orange "on" styling (default: checked / value ≠ `OFF`). */
  highlighted?: boolean;
  className?: string;
}

/**
 * Settings row used by the theme / scanlines toggles inside the mobile drawer and the
 * user menu: icon, label, and a mono value pill (orange when on).
 */
export function ToggleRow({
  icon: Icon,
  label,
  value,
  onClick,
  kind = 'button',
  checked = false,
  ariaLabel,
  menuItem = false,
  highlighted,
  className,
}: ToggleRowProps) {
  const isSwitch = kind === 'switch';
  const role = menuItem
    ? isSwitch
      ? 'menuitemcheckbox'
      : 'menuitem'
    : isSwitch
      ? 'switch'
      : undefined;
  const on = highlighted ?? (isSwitch ? checked : value !== 'OFF');

  return (
    <button
      type="button"
      role={role}
      aria-checked={isSwitch ? checked : undefined}
      aria-label={isSwitch ? label : (ariaLabel ?? `${label}: ${value.toLowerCase()}`)}
      tabIndex={menuItem ? -1 : undefined}
      onClick={onClick}
      className={cn(
        'group flex w-full items-center gap-3 rounded-md px-3 text-left text-sm text-fg transition-colors duration-150 hover:bg-fg/[0.06] active:bg-fg/[0.1]',
        menuItem ? 'h-10' : 'h-12',
        className,
      )}
    >
      <Icon
        aria-hidden="true"
        className="h-4 w-4 shrink-0 text-muted transition-colors group-hover:text-fg"
      />
      <span className="min-w-0 flex-1 truncate">{label}</span>
      <span
        aria-hidden="true"
        className={cn(
          'hud rounded border px-1.5 py-0.5 text-2xs transition-colors',
          on ? 'border-accent/50 bg-accent/10 text-accent-ink' : 'border-line text-muted',
        )}
      >
        {value}
      </span>
    </button>
  );
}
