import { zodResolver } from '@hookform/resolvers/zod';
import { AlertTriangle, ArrowRight, CheckCircle2, Mail, Radio } from 'lucide-react';
import { useId } from 'react';
import { useForm } from 'react-hook-form';
import { NewsletterSchema } from '@shared/schemas';
import { GridBackground } from '@/components/effects/GridBackground';
import { Button } from '@/components/ui/Button';
import { FormField } from '@/components/ui/FormField';
import { Input } from '@/components/ui/Input';
import { useSubscribeNewsletter } from '@/hooks/useNewsletter';
import { cn } from '@/lib/cn';
import { getFriendlyErrorMessage } from '@/lib/errors';
import type { NewsletterInput } from '@/types';

export type NewsletterVariant = 'section' | 'inline';

export interface NewsletterFormProps {
  /** `section` = big home-page block with heading; `inline` = compact footer form. Default `section`. */
  variant?: NewsletterVariant;
  /** Section variant copy. */
  eyebrow?: string;
  title?: string;
  description?: string;
  /** Heading level for the section variant (default `h2`). */
  headingAs?: 'h2' | 'h3';
  className?: string;
}

type Status =
  | { kind: 'idle' }
  | { kind: 'subscribed' }
  | { kind: 'already-subscribed' }
  | { kind: 'error'; message: string };

function statusFrom(
  data: { status: 'subscribed' | 'already-subscribed' } | undefined,
  error: Error | null,
): Status {
  if (error) {
    return {
      kind: 'error',
      message: getFriendlyErrorMessage(error, "Couldn't sign you up — try again in a moment."),
    };
  }
  if (data?.status === 'subscribed') return { kind: 'subscribed' };
  if (data?.status === 'already-subscribed') return { kind: 'already-subscribed' };
  return { kind: 'idle' };
}

function StatusMessage({ status, compact }: { status: Status; compact: boolean }) {
  if (status.kind === 'idle') return null;
  const success = status.kind !== 'error';
  const Icon = success ? CheckCircle2 : AlertTriangle;
  const text =
    status.kind === 'subscribed'
      ? "You're on the grid! Watch your inbox for the next drop."
      : status.kind === 'already-subscribed'
        ? "You're already on the list — drop alerts are headed your way."
        : status.message;
  return (
    <span
      className={cn(
        'flex items-start gap-2 font-medium',
        compact ? 'text-xs' : 'text-sm',
        success ? 'text-success' : 'text-danger-ink',
      )}
    >
      <Icon
        aria-hidden="true"
        className={cn('mt-0.5 shrink-0', compact ? 'h-3.5 w-3.5' : 'h-4 w-4')}
      />
      <span>{text}</span>
    </span>
  );
}

/**
 * Newsletter sign-up ("drop alerts") via the `subscribeNewsletter` callable. React Hook Form +
 * `NewsletterSchema`; inline validation, loading button, and a polite live region announcing
 * subscribed / already-subscribed / error states.
 */
export function NewsletterForm({
  variant = 'section',
  eyebrow = 'Pit wall radio',
  title = 'Get drop alerts first',
  description = 'New castings, vault drops and restocks — straight to your inbox. No spam, unsubscribe anytime.',
  headingAs: Heading = 'h2',
  className,
}: NewsletterFormProps) {
  const baseId = useId();
  const inputId = `newsletter-${baseId.replace(/:/g, '')}`;
  const headingId = `${inputId}-title`;
  const mutation = useSubscribeNewsletter();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<NewsletterInput>({
    resolver: zodResolver(NewsletterSchema),
    defaultValues: { email: '' },
  });

  const status = statusFrom(mutation.data, mutation.error);
  const inline = variant === 'inline';

  const onSubmit = handleSubmit((values) => {
    mutation.mutate(
      { email: values.email },
      {
        onSuccess: () => reset({ email: '' }),
      },
    );
  });

  const form = (
    <form
      noValidate
      onSubmit={(event) => void onSubmit(event)}
      aria-labelledby={inline ? undefined : headingId}
      aria-label={inline ? 'Newsletter sign-up' : undefined}
      className="w-full"
    >
      <FormField
        label={inline ? 'Drop alerts' : 'Email address'}
        htmlFor={inputId}
        error={errors.email?.message}
        hint={inline ? 'New castings & vault drops. No spam.' : undefined}
      >
        {(field) => (
          <div className={cn('flex gap-2', inline ? 'flex-row' : 'flex-col sm:flex-row')}>
            <Input
              id={field.id}
              type="email"
              inputMode="email"
              autoComplete="email"
              placeholder="you@garage.in"
              size={inline ? 'md' : 'lg'}
              leftIcon={<Mail />}
              aria-describedby={field.describedBy}
              invalid={field.invalid}
              readOnly={mutation.isPending}
              containerClassName="min-w-0 flex-1"
              {...register('email', {
                onChange: () => {
                  if (mutation.isError || mutation.isSuccess) mutation.reset();
                },
              })}
            />
            <Button
              type="submit"
              variant="primary"
              size={inline ? 'md' : 'lg'}
              loading={mutation.isPending}
              loadingText={inline ? 'Joining…' : 'Joining the grid…'}
              rightIcon={inline ? undefined : <ArrowRight />}
              className="shrink-0"
            >
              {inline ? 'Join' : 'Join the grid'}
            </Button>
          </div>
        )}
      </FormField>
      <div
        aria-live="polite"
        aria-atomic="true"
        className={cn(inline ? 'mt-2 min-h-4' : 'mt-3 min-h-5')}
      >
        <StatusMessage status={status} compact={inline} />
      </div>
    </form>
  );

  if (inline) return <div className={cn('w-full', className)}>{form}</div>;

  return (
    <div
      className={cn(
        'relative isolate overflow-hidden rounded-2xl border border-line bg-surface p-6 shadow-card sm:p-10',
        className,
      )}
    >
      <span aria-hidden="true" className="racing-stripe is-active" />
      <GridBackground className="-z-10 opacity-70" />
      <div
        aria-hidden="true"
        className="absolute -right-24 -top-24 -z-10 h-72 w-72 rounded-full bg-[radial-gradient(circle,rgb(var(--accent)/0.16),transparent_70%)]"
      />
      <div className="grid items-center gap-8 lg:grid-cols-12 lg:gap-12">
        <div className="lg:col-span-6">
          <p className="eyebrow inline-flex items-center gap-2">
            <Radio aria-hidden="true" className="h-3.5 w-3.5" />
            {eyebrow}
          </p>
          <Heading id={headingId} className="mt-3 text-2xl text-fg sm:text-3xl lg:text-4xl">
            {title}
          </Heading>
          <p className="mt-3 max-w-prose text-muted">{description}</p>
          <p className="hud mt-5 flex flex-wrap gap-x-4 gap-y-1 text-muted">
            <span>Freq · new drops only</span>
            <span aria-hidden="true">/</span>
            <span>Channel · email</span>
          </p>
        </div>
        <div className="lg:col-span-6">{form}</div>
      </div>
    </div>
  );
}
