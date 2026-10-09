import { Moon, Sun } from 'lucide-react';
import { IconButton, type IconButtonSize } from '@/components/ui/IconButton';
import { cn } from '@/lib/cn';
import { useUiStore } from '@/store/uiStore';
import { ToggleRow } from './ToggleRow';

export interface ThemeToggleProps {
  /** `icon` (navbar), `row` (drawer settings), `text` (compact footer chip). */
  variant?: 'icon' | 'row' | 'text';
  size?: IconButtonSize;
  className?: string;
}

/**
 * Dark ⇄ light theme switch. The button name describes the action ("Switch to light theme");
 * the choice is persisted (`uiStore.setTheme`) and applied to `<html>` by ThemeSync.
 */
export function ThemeToggle({ variant = 'icon', size = 'md', className }: ThemeToggleProps) {
  const theme = useUiStore((state) => state.theme);
  const toggleTheme = useUiStore((state) => state.toggleTheme);
  const dark = theme === 'dark';
  const actionLabel = dark ? 'Switch to light theme' : 'Switch to dark theme';

  if (variant === 'row') {
    return (
      <ToggleRow
        icon={dark ? Moon : Sun}
        label="Theme"
        value={dark ? 'DARK' : 'LIGHT'}
        highlighted={false}
        ariaLabel={`Theme: ${theme}. ${actionLabel}`}
        onClick={toggleTheme}
        className={className}
      />
    );
  }

  if (variant === 'text') {
    return (
      <button
        type="button"
        onClick={toggleTheme}
        aria-label={`Theme: ${theme}. ${actionLabel}`}
        className={cn(
          'hud inline-flex h-9 items-center gap-2 rounded-md border border-line px-3 text-2xs text-muted transition-colors hover:border-accent/60 hover:text-fg touch:h-11',
          className,
        )}
      >
        {dark ? (
          <Moon aria-hidden="true" className="h-3.5 w-3.5" />
        ) : (
          <Sun aria-hidden="true" className="h-3.5 w-3.5" />
        )}
        Theme · {dark ? 'Dark' : 'Light'}
      </button>
    );
  }

  return (
    <IconButton
      label={actionLabel}
      size={size}
      onClick={toggleTheme}
      className={className}
      icon={dark ? <Sun /> : <Moon />}
    />
  );
}
