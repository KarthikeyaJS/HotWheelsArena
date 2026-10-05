/**
 * Contact form model. There is no contact backend: a valid form composes a prefilled `mailto:`
 * link to the support inbox — nothing is sent to or stored on our servers.
 */
import { z } from 'zod';
import { BRAND_NAME, SUPPORT_EMAIL } from '@/config/brand';

export const CONTACT_TOPICS = [
  { value: 'order', label: 'An existing order' },
  { value: 'shipping', label: 'Shipping & delivery' },
  { value: 'returns', label: 'Damaged / incorrect item' },
  { value: 'payments', label: 'Payments (test mode)' },
  { value: 'garage', label: 'My Garage, XP & badges' },
  { value: 'privacy', label: 'Account & privacy request' },
  { value: 'other', label: 'Something else' },
] as const;

export type ContactTopic = (typeof CONTACT_TOPICS)[number]['value'];

const TOPIC_VALUES = CONTACT_TOPICS.map((topic) => topic.value) as [
  ContactTopic,
  ...ContactTopic[],
];

export const CONTACT_MESSAGE_MIN = 20;
/** Keeps the composed mailto URL well under common client limits (~2,000 chars encoded). */
export const CONTACT_MESSAGE_MAX = 1200;

/** Optional order reference such as `#A1B2C3D4` or the raw order id. */
const ORDER_REF_REGEX = /^#?[A-Za-z0-9-]{4,40}$/;

export const ContactFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Tell us your name (at least 2 characters)')
    .max(80, 'Keep your name under 80 characters'),
  email: z
    .string()
    .trim()
    .min(1, 'Enter your email address')
    .max(254, 'That email address is too long')
    .email('Enter a valid email address'),
  topic: z.enum(TOPIC_VALUES, {
    errorMap: () => ({ message: 'Choose what your message is about' }),
  }),
  orderRef: z
    .string()
    .trim()
    .max(41, 'That order reference is too long')
    .refine((value) => value === '' || ORDER_REF_REGEX.test(value), {
      message: 'Use the reference from your order, e.g. #A1B2C3D4',
    }),
  message: z
    .string()
    .trim()
    .min(
      CONTACT_MESSAGE_MIN,
      `Add a little more detail (at least ${CONTACT_MESSAGE_MIN} characters)`,
    )
    .max(CONTACT_MESSAGE_MAX, `Keep it under ${CONTACT_MESSAGE_MAX} characters`),
});

/** Raw form state (topic starts empty until the collector picks one). */
export interface ContactFormInput {
  name: string;
  email: string;
  topic: ContactTopic | '';
  orderRef: string;
  message: string;
}

export type ContactFormValues = z.infer<typeof ContactFormSchema>;

export const CONTACT_FORM_DEFAULTS: ContactFormInput = {
  name: '',
  email: '',
  topic: '',
  orderRef: '',
  message: '',
};

export function contactTopicLabel(topic: ContactTopic): string {
  return CONTACT_TOPICS.find((entry) => entry.value === topic)?.label ?? 'Something else';
}

/** Email subject: `[HotWheelsArena] Damaged / incorrect item · #A1B2C3D4`. */
export function buildContactSubject(values: ContactFormValues): string {
  const ref = values.orderRef ? ` · ${values.orderRef}` : '';
  return `[${BRAND_NAME}] ${contactTopicLabel(values.topic)}${ref}`;
}

/** Plain-text email body with the message and a small details block. */
export function buildContactBody(values: ContactFormValues): string {
  const lines = [
    values.message,
    '',
    '—',
    `Name: ${values.name}`,
    `Reply to: ${values.email}`,
    `Topic: ${contactTopicLabel(values.topic)}`,
  ];
  if (values.orderRef) lines.push(`Order reference: ${values.orderRef}`);
  return lines.join('\n');
}

/**
 * `mailto:` link to the support inbox with subject + body prefilled (RFC 6068: spaces as `%20`,
 * line breaks as `%0D%0A`).
 */
export function buildContactMailto(values: ContactFormValues, to: string = SUPPORT_EMAIL): string {
  const encode = (text: string): string => encodeURIComponent(text.replace(/\r?\n/g, '\r\n'));
  return `mailto:${to}?subject=${encode(buildContactSubject(values))}&body=${encode(
    buildContactBody(values),
  )}`;
}
