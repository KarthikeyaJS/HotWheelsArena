import { Box, CalendarClock, PackageCheck, RotateCcw, Truck } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Callout } from '@/components/content/Callout';
import { ContentPage } from '@/components/content/ContentPage';
import { ContentSection } from '@/components/content/ContentSection';
import { FactGrid, type FactItem } from '@/components/content/FactGrid';
import { InfoTable } from '@/components/content/InfoTable';
import { PincodeChecker } from '@/components/content/shipping/PincodeChecker';
import {
  REMOTE_DELIVERY_WINDOW,
  STANDARD_DELIVERY_WINDOW,
} from '@/components/content/shipping/pincode';
import { SUPPORT_EMAIL, SUPPORT_HOURS, SUPPORT_PHONE } from '@/config/brand';
import { isTestPaymentMode } from '@/config/payment';
import { ROUTES } from '@/config/routes';
import { useSettings } from '@/hooks/useSiteSettings';
import { formatINR } from '@/lib/format';
import { buildBreadcrumbJsonLd, useDocumentMeta, useJsonLd } from '@/lib/seo';

const LAST_UPDATED = '2026-10-01';

const BREADCRUMBS = [
  { label: 'Home', to: ROUTES.home },
  { label: 'Shipping & Returns', to: ROUTES.shippingReturns },
] as const;

const SECTIONS = [
  { id: 'serviceability', label: 'Where we deliver' },
  { id: 'delivery-times', label: 'Dispatch & delivery times' },
  { id: 'shipping-charges', label: 'Shipping charges' },
  { id: 'packaging', label: 'Collector-safe packaging' },
  { id: 'tracking', label: 'Tracking your order' },
  { id: 'returns', label: 'Returns: damaged or incorrect items' },
  { id: 'raise-return', label: 'How to raise a return' },
  { id: 'refunds', label: 'Refund timeline' },
  { id: 'cancellations', label: 'Cancellations' },
] as const;

/** /shipping-returns — Indian delivery, packaging and the 7-day damaged/incorrect returns policy. */
export default function ShippingReturnsPage() {
  useDocumentMeta({
    title: 'Shipping & Returns',
    description:
      'Pan-India delivery to serviceable PIN codes: dispatch in 1–2 business days, delivery in 3–7, free shipping above the threshold, collector-safe packaging and 7-day returns for damaged items.',
  });
  useJsonLd(
    'breadcrumbs',
    buildBreadcrumbJsonLd(BREADCRUMBS.map((crumb) => ({ name: crumb.label, path: crumb.to }))),
  );

  const settings = useSettings();
  const threshold = formatINR(settings.shippingThreshold);
  const fee = formatINR(settings.shippingFee);
  const testMode = isTestPaymentMode();

  const facts: FactItem[] = [
    {
      id: 'dispatch',
      label: 'Dispatch',
      value: '1–2 days',
      detail: 'Business days, Mon–Sat',
      icon: <Box />,
    },
    {
      id: 'delivery',
      label: 'Delivery',
      value: '3–7 days',
      detail: 'Most PIN codes after dispatch',
      icon: <Truck />,
    },
    {
      id: 'free-shipping',
      label: 'Free shipping',
      value: threshold,
      detail: `Orders at or above · else ${fee}`,
      icon: <PackageCheck />,
    },
    {
      id: 'returns',
      label: 'Returns',
      value: '7 days',
      detail: 'Damaged or incorrect items',
      icon: <RotateCcw />,
    },
  ];

  return (
    <ContentPage
      breadcrumbs={BREADCRUMBS}
      eyebrow="Logistics · pan-India"
      eyebrowIcon={<Truck />}
      title="Shipping & Returns"
      lead="From our garage to your shelf — how we pack, ship and deliver across India, and what happens if a car arrives damaged."
      lastUpdated={LAST_UPDATED}
      toc={SECTIONS}
    >
      <FactGrid items={facts} label="Shipping at a glance" />

      <ContentSection id="serviceability" index={1} title="Where we deliver">
        <p>
          We ship to every serviceable PIN code in India through trusted courier partners — metros,
          towns and most rural post offices. Enter your PIN code below to see its postal zone and
          the usual delivery window. The courier confirms the exact date once your parcel leaves the
          garage.
        </p>
        <PincodeChecker />
        <p>
          International shipping isn’t available yet. Army Postal Service (APO / FPO) addresses are
          handled on request — write to us before ordering.
        </p>
      </ContentSection>

      <ContentSection id="delivery-times" index={2} title="Dispatch & delivery times">
        <p>
          Orders are picked, checked and packed within <strong>1–2 business days</strong> (Monday to
          Saturday, excluding public holidays). Delivery then usually takes{' '}
          <strong>3–7 business days</strong>.
        </p>
        <InfoTable
          caption="Typical delivery windows after dispatch"
          columns={['Destination', 'Window', 'Notes']}
          rows={[
            {
              id: 'metro',
              label: 'Metros & major cities',
              value: '3–5 days',
              note: 'Delhi NCR, Mumbai, Bengaluru, Chennai, Hyderabad, Kolkata, Pune…',
            },
            {
              id: 'rest',
              label: 'Rest of India',
              value: STANDARD_DELIVERY_WINDOW.replace(' business days', ' days'),
              note: 'Most towns and serviceable rural PIN codes',
            },
            {
              id: 'remote',
              label: 'Remote regions',
              value: REMOTE_DELIVERY_WINDOW.replace(' business days', ' days'),
              note: 'North-East, J&K, Ladakh, Andaman & Nicobar, Lakshadweep',
            },
          ]}
        />
        <p>
          Big drops, festive sales and weather disruptions can add a day or two. We will always tell
          you if something holds your order up.
        </p>
      </ContentSection>

      <ContentSection id="shipping-charges" index={3} title="Shipping charges">
        <p>
          Shipping is <strong>free on orders of {threshold} or more</strong>. Orders below that
          carry a flat <strong>{fee}</strong> shipping fee, shown in your pit stop before you pay.
          Your <Link to={ROUTES.cart}>pit stop</Link> tracks how far you are from free shipping.
        </p>
        <p>
          All prices are in Indian rupees and include GST. There are no extra cash-on-delivery or
          packaging charges.
        </p>
      </ContentSection>

      <ContentSection id="packaging" index={4} title="Collector-safe packaging">
        <p>We pack like collectors, because we are collectors:</p>
        <ul>
          <li>
            Carded cars ride in rigid, corner-protected boxes so blisters and card edges arrive
            crisp — never in a loose poly mailer.
          </li>
          <li>Every car is checked for casting and card damage before it is sealed.</li>
          <li>Bubble wrap and void fill stop anything from rattling around in transit.</li>
          <li>
            Numbered vault editions travel double-boxed, with the edition card sleeved separately.
          </li>
          <li>A tamper-evident seal makes your unboxing video meaningful.</li>
        </ul>
      </ContentSection>

      <ContentSection id="tracking" index={5} title="Tracking your order">
        <p>
          Sign in and open <Link to={ROUTES.orders}>Orders</Link> to follow every order as it moves
          from <strong>placed</strong> to <strong>processing</strong>, <strong>shipped</strong> and{' '}
          <strong>delivered</strong>. Each order shows its items, delivery address and payment
          details.
        </p>
      </ContentSection>

      <ContentSection id="returns" index={6} title="Returns: damaged or incorrect items">
        <p>
          If your car arrives damaged, or you receive the wrong car, report it within{' '}
          <strong>7 days of delivery</strong> together with an <strong>unboxing video</strong>.
        </p>
        <h3>What qualifies</h3>
        <ul>
          <li>The car is broken, has missing parts or the blister is crushed in transit.</li>
          <li>You received a different car, colour or quantity from what you ordered.</li>
          <li>An item from your order is missing from the parcel.</li>
        </ul>
        <h3>What doesn’t</h3>
        <ul>
          <li>Change-of-mind returns — collectible cars are sold as final sale.</li>
          <li>Reports made more than 7 days after delivery.</li>
          <li>Claims without an unedited unboxing video showing the sealed parcel being opened.</li>
          <li>
            Cars removed from their blister after delivery, unless the defect is in the casting.
          </li>
        </ul>
        <Callout title="Record the unboxing">
          Start recording before you cut the tape: show the sealed parcel and its label, open it in
          one continuous take, and show the car and its packaging clearly. It is the fastest way for
          us to approve a claim.
        </Callout>
      </ContentSection>

      <ContentSection id="raise-return" index={7} title="How to raise a return">
        <ol>
          <li>
            Email <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a> (or call {SUPPORT_PHONE},{' '}
            {SUPPORT_HOURS}) within 7 days of delivery.
          </li>
          <li>Include your order reference, photos of the damage and the unboxing video link.</li>
          <li>
            We reply within one business day. If a pickup is needed, we arrange it free of charge —
            pack the car back in its original packaging.
          </li>
          <li>
            We send a replacement when stock allows; otherwise you receive a full refund, including
            any shipping you paid.
          </li>
        </ol>
      </ContentSection>

      <ContentSection id="refunds" index={8} title="Refund timeline">
        <InfoTable
          caption="From approval to money back"
          columns={['Step', 'Time', 'Details']}
          rows={[
            {
              id: 'review',
              label: 'Claim review',
              value: '1–2 days',
              note: 'After we receive your video (or the returned car)',
            },
            {
              id: 'initiate',
              label: 'Refund initiated',
              value: '≤ 2 days',
              note: 'Business days after approval',
            },
            {
              id: 'upi',
              label: 'UPI',
              value: '1–3 days',
              note: 'Back to the UPI account you paid from',
            },
            {
              id: 'card',
              label: 'Credit / debit card',
              value: '5–7 days',
              note: 'Depends on your bank’s processing time',
            },
            {
              id: 'cod',
              label: 'Cash on delivery',
              value: '3–5 days',
              note: 'By bank transfer or UPI to details you share with us',
            },
          ]}
        />
        {testMode ? (
          <Callout tone="test" title="Payments are in test mode">
            Checkout currently runs on a payment simulator: no real money is charged, so no real
            refunds are issued. The timeline above applies once live payments are switched on.
          </Callout>
        ) : null}
      </ContentSection>

      <ContentSection id="cancellations" index={9} title="Cancellations">
        <p>
          Changed your mind before dispatch? Email us with your order reference as soon as possible
          and we will cancel it and refund you in full. Once an order has shipped it can no longer
          be cancelled.
        </p>
        <p>
          Questions about a specific order? Visit the <Link to={ROUTES.faq}>FAQ</Link> or{' '}
          <Link to={ROUTES.contact}>contact the pit crew</Link>.
        </p>
        <p className="hud flex items-center gap-2 text-muted">
          <CalendarClock aria-hidden="true" className="h-3.5 w-3.5 text-accent-ink" />
          Business days exclude Sundays and national holidays
        </p>
      </ContentSection>
    </ContentPage>
  );
}
