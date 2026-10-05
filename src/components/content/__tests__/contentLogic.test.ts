import { describe, expect, it } from 'vitest';
import { BADGES } from '@/config/gamification';
import { SUPPORT_EMAIL } from '@/config/brand';
import {
  ContactFormSchema,
  buildContactBody,
  buildContactMailto,
  buildContactSubject,
  type ContactFormValues,
} from '../contact/contactModel';
import { isoDateToMillis } from '../dates';
import { buildFaqGroups, faqEntryIds } from '../faq/faqData';
import { checkPincode, normalizePincode } from '../shipping/pincode';
import { idFromHash } from '../useHashScroll';

describe('contact form model', () => {
  const valid = {
    name: '  Arjun Mehta ',
    email: 'Arjun@Example.in',
    topic: 'returns',
    orderRef: '#A1B2C3D4',
    message: 'My Countach arrived with a cracked blister. Video attached.\nThanks!',
  };

  it('validates and trims a complete message', () => {
    const parsed = ContactFormSchema.parse(valid);
    expect(parsed.name).toBe('Arjun Mehta');
    expect(parsed.topic).toBe('returns');
  });

  it('rejects missing topic, short messages and bad order references', () => {
    const result = ContactFormSchema.safeParse({
      ...valid,
      topic: '',
      message: 'too short',
      orderRef: 'bad ref!',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const fields = result.error.issues.map((issue) => issue.path[0]);
      expect(fields).toEqual(expect.arrayContaining(['topic', 'message', 'orderRef']));
    }
  });

  it('accepts an empty optional order reference', () => {
    expect(ContactFormSchema.safeParse({ ...valid, orderRef: '' }).success).toBe(true);
  });

  it('composes subject, body and an RFC 6068 mailto link to support', () => {
    const values: ContactFormValues = ContactFormSchema.parse(valid);
    expect(buildContactSubject(values)).toContain('Damaged / incorrect item · #A1B2C3D4');
    const body = buildContactBody(values);
    expect(body).toContain('Reply to: Arjun@Example.in');
    expect(body).toContain('Order reference: #A1B2C3D4');

    const href = buildContactMailto(values);
    expect(href.startsWith(`mailto:${SUPPORT_EMAIL}?subject=`)).toBe(true);
    expect(href).toContain('%0D%0A');
    expect(href).not.toContain(' ');
    const url = new URL(href);
    expect(url.searchParams.get('body')).toContain('cracked blister');
  });
});

describe('FAQ data', () => {
  const groups = buildFaqGroups({
    shippingThreshold: 999,
    shippingFee: 79,
    codEnabled: false,
    maxQtyPerItem: 10,
  });

  it('has the four required groups with unique, prefixed item ids', () => {
    expect(groups.map((group) => group.title)).toEqual([
      'Orders & Shipping',
      'Payments — test mode',
      'My Garage & XP',
      'Account & Privacy',
    ]);
    const all = groups.flatMap((group) => group.items.map((item) => item.id));
    expect(new Set(all).size).toBe(all.length);
    expect(faqEntryIds(groups).size).toBe(all.length);
    expect(all.every((id) => id.startsWith('faq-'))).toBe(true);
  });

  it('interpolates live site settings and badge rules', () => {
    const text = JSON.stringify(groups);
    expect(text).toContain('₹999');
    expect(text).toContain('₹79');
    expect(text).toContain('card and UPI');
    expect(text).not.toContain('cash on delivery.');
    for (const badge of BADGES) expect(text).toContain(badge.title);
  });
});

describe('PIN code check', () => {
  it('normalises spaces and dashes', () => {
    expect(normalizePincode(' 560 001 ')).toBe('560001');
    expect(normalizePincode('110-001')).toBe('110001');
  });

  it('maps the first digit to a postal zone with the standard window', () => {
    expect(checkPincode('560001')).toMatchObject({
      status: 'ok',
      zone: 'Southern',
      remote: false,
      armyPost: false,
      deliveryWindow: '3–7 business days',
    });
    expect(checkPincode('400001')).toMatchObject({ zone: 'Western' });
  });

  it('flags remote regions and army post offices', () => {
    expect(checkPincode('781001')).toMatchObject({
      remote: true,
      deliveryWindow: '5–10 business days',
    });
    expect(checkPincode('744101')).toMatchObject({ remote: true });
    expect(checkPincode('190001')).toMatchObject({ remote: true });
    expect(checkPincode('900001')).toMatchObject({ armyPost: true, remote: false });
  });

  it('rejects malformed codes', () => {
    expect(checkPincode('056001').status).toBe('invalid');
    expect(checkPincode('5600').status).toBe('invalid');
    expect(checkPincode('abcdef').status).toBe('invalid');
  });
});

describe('small helpers', () => {
  it('parses location hashes', () => {
    expect(idFromHash('#faq-gst')).toBe('faq-gst');
    expect(idFromHash('#caf%C3%A9')).toBe('café');
    expect(idFromHash('')).toBeNull();
    expect(idFromHash('#')).toBeNull();
  });

  it('converts ISO dates at IST midnight', () => {
    expect(isoDateToMillis('2026-10-01')).toBe(Date.parse('2026-09-30T18:30:00Z'));
    expect(isoDateToMillis('01/10/2026')).toBeNull();
  });
});
