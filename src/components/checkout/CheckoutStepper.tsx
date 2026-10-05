import { Check } from 'lucide-react';
import { cn } from '@/lib/cn';
import { padNumber } from '@/lib/format';
import { CHECKOUT_STEPS, CHECKOUT_STEP_META, stepIndex, type CheckoutStep } from './checkoutSteps';

export interface CheckoutStepperProps {
  current: CheckoutStep;
  isComplete: (step: CheckoutStep) => boolean;
  isAccessible: (step: CheckoutStep) => boolean;
  onSelect: (step: CheckoutStep) => void;
  /** Lock navigation (order in flight). */
  disabled?: boolean;
  className?: string;
}

/**
 * HUD stepper: `01 ADDRESS — 02 PAYMENT — 03 REVIEW`. Reachable steps are buttons; the current
 * one carries `aria-current="step"`.
 */
export function CheckoutStepper({
  current,
  isComplete,
  isAccessible,
  onSelect,
  disabled = false,
  className,
}: CheckoutStepperProps) {
  const currentIndex = stepIndex(current);

  return (
    <nav aria-label="Checkout progress" className={className}>
      <ol className="flex items-stretch gap-2 sm:gap-3">
        {CHECKOUT_STEPS.map((step, index) => {
          const meta = CHECKOUT_STEP_META[step];
          const isCurrent = step === current;
          const complete = isComplete(step) && !isCurrent;
          const reachable = !disabled && !isCurrent && isAccessible(step);
          const state = isCurrent ? 'current' : complete ? 'complete' : 'upcoming';

          const content = (
            <>
              <span
                aria-hidden="true"
                className={cn(
                  'grid h-8 w-8 shrink-0 place-items-center rounded-md border font-mono text-xs font-bold tabular-nums transition-colors duration-200',
                  state === 'current' &&
                    'border-accent bg-accent text-on-accent shadow-glow-accent',
                  state === 'complete' && 'border-accent/50 bg-accent/10 text-accent-ink',
                  state === 'upcoming' && 'border-line bg-surface text-muted',
                )}
              >
                {complete ? <Check className="h-4 w-4" strokeWidth={3} /> : padNumber(index + 1)}
              </span>
              <span className="flex min-w-0 flex-col items-start text-left">
                <span className="hud hidden text-[10px] text-muted sm:block">{meta.lap}</span>
                <span
                  className={cn(
                    'font-display text-[11px] font-bold uppercase tracking-display sm:text-xs',
                    state === 'upcoming' ? 'text-muted' : 'text-fg',
                  )}
                >
                  {meta.label}
                </span>
              </span>
              <span className="sr-only">
                {state === 'current' ? ' (current step)' : state === 'complete' ? ' (done)' : ''}
              </span>
            </>
          );

          return (
            <li key={step} className="flex min-w-0 flex-1 flex-col gap-2">
              {reachable ? (
                <button
                  type="button"
                  onClick={() => onSelect(step)}
                  className="group flex min-w-0 items-center gap-2.5 rounded-md py-1 pr-2 transition-colors duration-150 hover:text-accent-ink sm:gap-3"
                >
                  {content}
                </button>
              ) : (
                <span
                  aria-current={isCurrent ? 'step' : undefined}
                  className="flex min-w-0 items-center gap-2.5 py-1 pr-2 sm:gap-3"
                >
                  {content}
                </span>
              )}
              <span
                aria-hidden="true"
                className="relative h-1 overflow-hidden rounded-full bg-line"
              >
                <span
                  className={cn(
                    'absolute inset-y-0 left-0 rounded-full bg-accent transition-[width] duration-500 ease-race motion-reduce:transition-none',
                    index < currentIndex ? 'w-full' : index === currentIndex ? 'w-1/2' : 'w-0',
                  )}
                />
              </span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
