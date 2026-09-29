import { AlertTriangle, RotateCcw } from 'lucide-react';
import { Component, type ErrorInfo, type ReactNode } from 'react';
import { getFriendlyErrorMessage } from '@/lib/errors';

export interface ErrorBoundaryFallbackProps {
  error: Error;
  /** Clears the error and re-renders the children. */
  reset: () => void;
}

export interface ErrorBoundaryProps {
  children: ReactNode;
  /** Custom fallback element or render function. Defaults to a compact section error panel. */
  fallback?: ReactNode | ((props: ErrorBoundaryFallbackProps) => ReactNode);
  /** Section name used in the default fallback ("Featured collection stalled"). */
  label?: string;
  onError?: (error: Error, info: ErrorInfo) => void;
  onReset?: () => void;
  /** When any value changes (shallow), a caught error is reset automatically. */
  resetKeys?: readonly unknown[];
}

interface ErrorBoundaryState {
  error: Error | null;
}

const keysChanged = (a: readonly unknown[] = [], b: readonly unknown[] = []): boolean =>
  a.length !== b.length || a.some((value, index) => !Object.is(value, b[index]));

/**
 * Section-level error boundary: one broken widget must never take down the page.
 * Route-level errors are handled by `RouteErrorBoundary` (react-router errorElement).
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  override state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: unknown): ErrorBoundaryState {
    return { error: error instanceof Error ? error : new Error(String(error)) };
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('[ErrorBoundary]', error, info.componentStack);
    this.props.onError?.(error, info);
  }

  override componentDidUpdate(previousProps: ErrorBoundaryProps): void {
    if (this.state.error && keysChanged(previousProps.resetKeys, this.props.resetKeys)) {
      this.reset();
    }
  }

  reset = (): void => {
    this.props.onReset?.();
    this.setState({ error: null });
  };

  override render(): ReactNode {
    const { error } = this.state;
    if (!error) return this.props.children;

    const { fallback, label } = this.props;
    if (typeof fallback === 'function') return fallback({ error, reset: this.reset });
    if (fallback !== undefined) return fallback;

    return (
      <div
        role="alert"
        className="flex flex-col items-start gap-4 rounded-lg border border-line bg-card p-6 text-left sm:flex-row sm:items-center"
      >
        <AlertTriangle aria-hidden="true" className="h-6 w-6 shrink-0 text-danger-ink" />
        <div className="flex-1">
          <p className="font-semibold text-fg">
            {label ? `${label} stalled` : 'This section stalled'}
          </p>
          <p className="mt-1 text-sm text-muted">{getFriendlyErrorMessage(error)}</p>
        </div>
        <button
          type="button"
          onClick={this.reset}
          className="inline-flex items-center gap-2 rounded-md border border-line px-4 py-2 font-mono text-xs font-bold uppercase tracking-hud text-fg transition-colors hover:border-accent hover:text-accent-ink active:scale-[0.98]"
        >
          <RotateCcw aria-hidden="true" className="h-4 w-4" />
          Try again
        </button>
      </div>
    );
  }
}
