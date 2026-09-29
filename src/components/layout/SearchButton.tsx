import { Search } from 'lucide-react';
import { useState } from 'react';
import { IconButton } from '@/components/ui/IconButton';
import { Kbd } from '@/components/ui/Kbd';
import { PALETTE_HOTKEY } from '@/components/search/CommandPalette';
import { hotkeyAria, hotkeyLabels, isMacPlatform } from '@/hooks/useHotkey';
import { cn } from '@/lib/cn';
import { useUiStore } from '@/store/uiStore';

export interface SearchButtonProps {
  /**
   * `pill` = field-like trigger with text + shortcut hint; `compact` = icon + shortcut hint;
   * `icon`; `row` = full-width (drawer).
   */
  variant?: 'pill' | 'compact' | 'icon' | 'row';
  className?: string;
}

/**
 * Opens the command palette ("Search the garage…"). Shows the platform shortcut (Ctrl K / ⌘K)
 * and exposes it via `aria-keyshortcuts`.
 */
export function SearchButton({ variant = 'pill', className }: SearchButtonProps) {
  const openSearch = useUiStore((state) => state.openSearch);
  const [isMac] = useState(isMacPlatform);
  const shortcut = hotkeyAria(PALETTE_HOTKEY, isMac);
  const keys = hotkeyLabels(PALETTE_HOTKEY, isMac);

  if (variant === 'icon') {
    return (
      <IconButton
        label="Search the garage"
        icon={<Search />}
        onClick={openSearch}
        aria-haspopup="dialog"
        aria-keyshortcuts={shortcut}
        className={className}
      />
    );
  }

  if (variant === 'compact') {
    return (
      <button
        type="button"
        onClick={openSearch}
        aria-haspopup="dialog"
        aria-keyshortcuts={shortcut}
        aria-label="Search the garage"
        title="Search the garage"
        className={cn(
          'group flex h-10 items-center gap-2 rounded-md border border-line bg-card/70 px-2.5 text-muted transition-[color,border-color,background-color] duration-200 ease-race hover:border-accent/60 hover:bg-card hover:text-fg active:bg-card-hover',
          className,
        )}
      >
        <Search
          aria-hidden="true"
          className="h-4 w-4 shrink-0 transition-colors group-hover:text-accent-ink"
        />
        <span aria-hidden="true" className="flex shrink-0 items-center gap-1">
          {keys.map((key) => (
            <Kbd key={key}>{key}</Kbd>
          ))}
        </span>
      </button>
    );
  }

  const row = variant === 'row';
  return (
    <button
      type="button"
      onClick={openSearch}
      aria-haspopup="dialog"
      aria-keyshortcuts={shortcut}
      className={cn(
        'group flex items-center gap-2.5 rounded-md border border-line bg-card/70 text-left text-muted transition-[color,border-color,background-color,box-shadow] duration-200 ease-race hover:border-accent/60 hover:bg-card hover:text-fg active:bg-card-hover',
        row ? 'h-12 w-full px-4 text-base' : 'h-10 w-56 px-3 text-sm',
        className,
      )}
    >
      <Search
        aria-hidden="true"
        className="h-4 w-4 shrink-0 transition-colors group-hover:text-accent-ink"
      />
      <span className="min-w-0 flex-1 truncate">Search the garage…</span>
      {row ? null : (
        <span aria-hidden="true" className="flex shrink-0 items-center gap-1">
          {keys.map((key) => (
            <Kbd key={key}>{key}</Kbd>
          ))}
        </span>
      )}
    </button>
  );
}
