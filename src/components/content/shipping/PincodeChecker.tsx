import { MapPin, PackageCheck, Search } from 'lucide-react';
import { useId, useRef, useState, type FormEvent } from 'react';
import { HudPanel } from '@/components/effects/HudPanel';
import { Button } from '@/components/ui/Button';
import { FormField } from '@/components/ui/FormField';
import { Input } from '@/components/ui/Input';
import { SUPPORT_EMAIL } from '@/config/brand';
import { cn } from '@/lib/cn';
import { checkPincode, type PincodeCheck } from './pincode';

export interface PincodeCheckerProps {
  className?: string;
}

function Result({ result }: { result: PincodeCheck }) {
  if (result.status === 'invalid') return null;
  if (result.armyPost) {
    return (
      <p className="flex items-start gap-2 text-sm text-fg">
        <MapPin aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-accent-ink" />
        <span>
          <strong className="font-semibold">{result.pincode}</strong> is an Army Postal Service (APO
          / FPO) code. We ship there on request — email{' '}
          <a
            href={`mailto:${SUPPORT_EMAIL}`}
            className="font-medium text-accent-ink underline underline-offset-4"
          >
            {SUPPORT_EMAIL}
          </a>{' '}
          before ordering.
        </span>
      </p>
    );
  }
  return (
    <div className="flex items-start gap-3 text-sm text-fg">
      <PackageCheck aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-success" />
      <div className="flex flex-col gap-1">
        <p>
          <strong className="font-semibold">{result.pincode}</strong> · {result.zone} zone — we
          deliver here.
        </p>
        <p className="text-muted">{result.region}</p>
        <p className="hud mt-1 text-fg">
          Est. delivery <span className="text-accent-ink">{result.deliveryWindow}</span> after
          dispatch{result.remote ? ' · remote area' : ''}
        </p>
      </div>
    </div>
  );
}

/**
 * PIN-code serviceability check (postal zone + delivery estimate). Purely client-side; the exact
 * date is confirmed by the courier at dispatch.
 */
export function PincodeChecker({ className }: PincodeCheckerProps) {
  const inputId = `pincode-${useId().replace(/:/g, '')}`;
  const [value, setValue] = useState('');
  const [result, setResult] = useState<PincodeCheck | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const next = checkPincode(value);
    setResult(next);
    // Send focus back to the field so its (described-by) error is announced.
    if (next.status === 'invalid') inputRef.current?.focus();
  };

  return (
    <HudPanel title="PIN code check" meta="All India" className={cn('bg-card', className)}>
      <form noValidate onSubmit={onSubmit} aria-label="Check delivery to your PIN code">
        <FormField
          label="Your PIN code"
          htmlFor={inputId}
          hint="6 digits, e.g. 560001"
          error={
            result?.status === 'invalid'
              ? 'That isn’t a valid PIN code — enter the 6 digits from your address (it never starts with 0).'
              : undefined
          }
        >
          {(field) => (
            /* Below 360px the CHECK button drops under the field so the PIN stays readable (CA-11). */
            <div className="flex gap-2 max-[359px]:flex-col">
              <Input
                ref={inputRef}
                id={field.id}
                inputMode="numeric"
                autoComplete="postal-code"
                maxLength={7}
                placeholder="560001"
                leftIcon={<MapPin />}
                value={value}
                onChange={(event) => {
                  setValue(event.target.value);
                  if (result) setResult(null);
                }}
                aria-describedby={field.describedBy}
                invalid={field.invalid}
                containerClassName="min-w-0 flex-1"
                className="font-mono tracking-[0.2em]"
              />
              <Button
                type="submit"
                variant="secondary"
                leftIcon={<Search />}
                className="shrink-0 max-[359px]:w-full"
              >
                Check
              </Button>
            </div>
          )}
        </FormField>
        <div
          aria-live="polite"
          aria-atomic="true"
          className={cn(result?.status === 'ok' && 'mt-4')}
        >
          {result ? <Result result={result} /> : null}
        </div>
      </form>
    </HudPanel>
  );
}
