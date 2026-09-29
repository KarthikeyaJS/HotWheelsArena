import { Search, X } from 'lucide-react';
import {
  forwardRef,
  useEffect,
  useId,
  useMemo,
  useRef,
  type FormEvent,
  type InputHTMLAttributes,
  type ReactNode,
} from 'react';
import { IconButton } from '@/components/ui/IconButton';
import { Spinner } from '@/components/ui/Spinner';
import { fieldClasses } from '@/components/ui/fieldStyles';
import { mergeRefs } from '@/components/ui/mergeRefs';
import { cn } from '@/lib/cn';

export type SearchInputSize = 'md' | 'lg';

export interface SearchInputProps extends Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'size' | 'value' | 'onChange' | 'onSubmit' | 'type' | 'autoFocus'
> {
  value: string;
  onChange: (value: string) => void;
  /** Enter / submit with the trimmed value (not called for blank input). */
  onSubmit?: (value: string) => void;
  /** Default "Search the garage…". */
  placeholder?: string;
  /** Focus on mount (implemented with an effect — no native `autofocus`). */
  autoFocus?: boolean;
  size?: SearchInputSize;
  /** `field` = bordered input (pages); `bare` = borderless (command palette header). */
  variant?: 'field' | 'bare';
  /** Accessible label (visually hidden). Default "Search the garage". */
  label?: string;
  /** Show a spinner in place of the search icon. */
  loading?: boolean;
  /** Called after the clear button empties the field (focus returns to the input). */
  onClear?: () => void;
  clearLabel?: string;
  /** Extra content inside the right edge (e.g. an `Esc` key hint). */
  trailing?: ReactNode;
  /** Classes for the `<form role="search">` wrapper. */
  formClassName?: string;
}

const HEIGHTS: Readonly<Record<SearchInputSize, string>> = {
  md: 'h-11',
  lg: 'h-14 text-base sm:text-lg',
};

/**
 * "Search the garage…" field: `<form role="search">` with a labelled `type="search"` input,
 * search icon / spinner, clear button and optional trailing slot. Forwards its ref to the input
 * and passes extra props (e.g. combobox ARIA) through to it.
 */
export const SearchInput = forwardRef<HTMLInputElement, SearchInputProps>(function SearchInput(
  {
    value,
    onChange,
    onSubmit,
    placeholder = 'Search the garage…',
    autoFocus = false,
    size = 'md',
    variant = 'field',
    label = 'Search the garage',
    loading = false,
    onClear,
    clearLabel = 'Clear search',
    trailing,
    formClassName,
    className,
    id,
    ...rest
  },
  forwardedRef,
) {
  const generatedId = useId();
  const inputId = id ?? `search-${generatedId.replace(/:/g, '')}`;
  const inputRef = useRef<HTMLInputElement>(null);
  const setRef = useMemo(() => mergeRefs(inputRef, forwardedRef), [forwardedRef]);

  useEffect(() => {
    if (!autoFocus) return;
    const frame = window.requestAnimationFrame(() => inputRef.current?.focus());
    return () => window.cancelAnimationFrame(frame);
  }, [autoFocus]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    const trimmed = value.trim();
    if (trimmed) onSubmit?.(trimmed);
  };

  const clear = (): void => {
    onChange('');
    onClear?.();
    inputRef.current?.focus();
  };

  const bare = variant === 'bare';

  return (
    <form role="search" onSubmit={handleSubmit} className={cn('relative w-full', formClassName)}>
      <label htmlFor={inputId} className="sr-only">
        {label}
      </label>
      <span
        aria-hidden="true"
        className={cn(
          'pointer-events-none absolute inset-y-0 left-0 flex items-center justify-center text-muted',
          size === 'lg' ? 'w-12' : 'w-10',
        )}
      >
        {loading ? (
          <Spinner size="sm" label="" />
        ) : (
          <Search className={size === 'lg' ? 'h-5 w-5 text-accent-ink' : 'h-4 w-4'} />
        )}
      </span>
      <input
        {...rest}
        ref={setRef}
        id={inputId}
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="none"
        spellCheck={false}
        enterKeyHint="search"
        className={cn(
          bare
            ? 'block w-full min-w-0 border-0 bg-transparent font-sans text-fg placeholder:text-muted focus-visible:outline-none'
            : fieldClasses({ size: size === 'lg' ? 'lg' : 'md' }),
          HEIGHTS[size],
          size === 'lg' ? 'pl-12' : 'pl-10',
          value || trailing ? 'pr-24' : 'pr-4',
          '[&::-webkit-search-decoration]:appearance-none',
          className,
        )}
      />
      <div className="absolute inset-y-0 right-2 flex items-center gap-1.5">
        {value ? (
          <IconButton label={clearLabel} icon={<X />} size="xs" variant="ghost" onClick={clear} />
        ) : null}
        {trailing}
      </div>
    </form>
  );
});
