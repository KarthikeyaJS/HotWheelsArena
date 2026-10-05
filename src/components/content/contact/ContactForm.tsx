import { zodResolver } from '@hookform/resolvers/zod';
import {
  CheckCircle2,
  ClipboardCopy,
  Hash,
  Info,
  Mail,
  MailOpen,
  RotateCcw,
  Send,
  User,
} from 'lucide-react';
import { useId, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/Button';
import { FormField } from '@/components/ui/FormField';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { SUPPORT_EMAIL } from '@/config/brand';
import { toast } from '@/store/toastStore';
import {
  CONTACT_FORM_DEFAULTS,
  CONTACT_MESSAGE_MAX,
  CONTACT_TOPICS,
  ContactFormSchema,
  buildContactBody,
  buildContactMailto,
  buildContactSubject,
  type ContactFormInput,
} from './contactModel';

interface ComposedEmail {
  href: string;
  subject: string;
  body: string;
}

export interface ContactFormProps {
  /** Opens the composed `mailto:` link (default: navigates the window to it). */
  onCompose?: (href: string) => void;
  className?: string;
}

const openMailto = (href: string): void => {
  window.location.href = href;
};

const TOPIC_OPTIONS = CONTACT_TOPICS.map((topic) => ({ value: topic.value, label: topic.label }));

/**
 * Zod-validated contact form that composes a prefilled email to the support inbox. Nothing is
 * sent to or stored on our servers — the collector sends the draft from their own mail app.
 */
export function ContactForm({ onCompose = openMailto, className }: ContactFormProps) {
  const prefix = `contact-${useId().replace(/:/g, '')}`;
  const ids = {
    name: `${prefix}-name`,
    email: `${prefix}-email`,
    topic: `${prefix}-topic`,
    orderRef: `${prefix}-order`,
    message: `${prefix}-message`,
  };
  const [composed, setComposed] = useState<ComposedEmail | null>(null);
  const resultRef = useRef<HTMLDivElement>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ContactFormInput>({
    resolver: zodResolver(ContactFormSchema),
    defaultValues: CONTACT_FORM_DEFAULTS,
    mode: 'onTouched',
  });

  const onSubmit = handleSubmit((raw) => {
    const values = ContactFormSchema.parse(raw);
    const email: ComposedEmail = {
      href: buildContactMailto(values),
      subject: buildContactSubject(values),
      body: buildContactBody(values),
    };
    setComposed(email);
    onCompose(email.href);
    window.requestAnimationFrame(() => resultRef.current?.focus());
  });

  const copyDraft = async () => {
    if (!composed) return;
    const text = `To: ${SUPPORT_EMAIL}\nSubject: ${composed.subject}\n\n${composed.body}`;
    try {
      if (!navigator.clipboard) throw new Error('Clipboard unavailable');
      await navigator.clipboard.writeText(text);
      toast.success('Message copied', `Paste it into an email to ${SUPPORT_EMAIL}.`);
    } catch {
      toast.error("Couldn't copy the message", `Select the text and email ${SUPPORT_EMAIL}.`);
    }
  };

  if (composed) {
    return (
      <div
        ref={resultRef}
        tabIndex={-1}
        role="status"
        aria-live="polite"
        className={
          className ??
          'relative overflow-hidden rounded-2xl border border-success/40 bg-card p-6 shadow-card sm:p-8'
        }
      >
        <span aria-hidden="true" className="absolute inset-x-0 top-0 h-1 bg-success" />
        <p className="hud flex items-center gap-2 text-success">
          <CheckCircle2 aria-hidden="true" className="h-4 w-4" />
          Draft ready
        </p>
        <h2 className="mt-3 text-xl text-fg sm:text-2xl">Your email is ready to send</h2>
        <p className="mt-3 max-w-prose text-sm leading-6 text-muted sm:text-base">
          Your email app should have opened with the message filled in — just hit send. Nothing was
          sent or stored by this site. If no app opened, use one of the options below.
        </p>
        <div className="mt-5 rounded-xl border border-line bg-surface p-4">
          <p className="hud text-muted">Subject</p>
          <p className="mt-1 break-words text-sm font-semibold text-fg">{composed.subject}</p>
          <p className="hud mt-4 text-muted">To</p>
          <p className="mt-1 break-all font-mono text-sm text-fg">{SUPPORT_EMAIL}</p>
        </div>
        <div className="mt-6 flex flex-wrap gap-3">
          <Button href={composed.href} leftIcon={<MailOpen />}>
            Open email draft
          </Button>
          <Button variant="secondary" leftIcon={<ClipboardCopy />} onClick={() => void copyDraft()}>
            Copy message
          </Button>
          <Button
            variant="ghost"
            leftIcon={<RotateCcw />}
            onClick={() => {
              setComposed(null);
              reset(CONTACT_FORM_DEFAULTS);
            }}
          >
            Write another
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form
      noValidate
      aria-labelledby={`${prefix}-title`}
      onSubmit={(event) => void onSubmit(event)}
      className={
        className ??
        'relative overflow-hidden rounded-2xl border border-line bg-card p-5 shadow-card sm:p-8'
      }
    >
      <span aria-hidden="true" className="racing-stripe is-active" />
      <h2 id={`${prefix}-title`} className="text-xl text-fg sm:text-2xl">
        Write to the pit crew
      </h2>
      <p className="mt-3 flex items-start gap-2 rounded-lg border border-line bg-surface p-3 text-sm leading-6 text-muted">
        <Info aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-accent-ink" />
        <span>
          <strong className="font-semibold text-fg">No message is sent from this page.</strong>{' '}
          “Compose email” opens a pre-filled draft to {SUPPORT_EMAIL} in your own email app — we
          don’t store anything you type here.
        </span>
      </p>

      <div className="mt-6 grid gap-5 sm:grid-cols-2">
        <FormField label="Your name" htmlFor={ids.name} required error={errors.name?.message}>
          {(field) => (
            <Input
              id={field.id}
              autoComplete="name"
              leftIcon={<User />}
              aria-describedby={field.describedBy}
              aria-required="true"
              invalid={field.invalid}
              {...register('name')}
            />
          )}
        </FormField>
        <FormField label="Email" htmlFor={ids.email} required error={errors.email?.message}>
          {(field) => (
            <Input
              id={field.id}
              type="email"
              inputMode="email"
              autoComplete="email"
              placeholder="you@garage.in"
              leftIcon={<Mail />}
              aria-describedby={field.describedBy}
              aria-required="true"
              invalid={field.invalid}
              {...register('email')}
            />
          )}
        </FormField>
        <FormField label="Topic" htmlFor={ids.topic} required error={errors.topic?.message}>
          {(field) => (
            <Select
              id={field.id}
              placeholder="Choose a topic"
              options={TOPIC_OPTIONS}
              aria-describedby={field.describedBy}
              aria-required="true"
              invalid={field.invalid}
              {...register('topic')}
            />
          )}
        </FormField>
        <FormField
          label="Order reference"
          htmlFor={ids.orderRef}
          optional
          hint="From your order page, e.g. #A1B2C3D4"
          error={errors.orderRef?.message}
        >
          {(field) => (
            <Input
              id={field.id}
              leftIcon={<Hash />}
              autoComplete="off"
              spellCheck={false}
              className="font-mono"
              aria-describedby={field.describedBy}
              invalid={field.invalid}
              {...register('orderRef')}
            />
          )}
        </FormField>
        <FormField
          label="Message"
          htmlFor={ids.message}
          required
          error={errors.message?.message}
          className="sm:col-span-2"
        >
          {(field) => (
            <Textarea
              id={field.id}
              rows={6}
              maxLength={CONTACT_MESSAGE_MAX}
              showCount
              placeholder="Tell us what happened — the more detail, the faster we can help."
              aria-describedby={field.describedBy}
              aria-required="true"
              invalid={field.invalid}
              {...register('message')}
            />
          )}
        </FormField>
      </div>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="hud text-muted">Opens your email app · nothing is stored</p>
        <Button
          type="submit"
          size="lg"
          rightIcon={<Send />}
          loading={isSubmitting}
          loadingText="Composing…"
        >
          Compose email
        </Button>
      </div>
    </form>
  );
}
