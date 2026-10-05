import { ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Callout } from '@/components/content/Callout';
import { ContentPage } from '@/components/content/ContentPage';
import { ContentSection } from '@/components/content/ContentSection';
import { InfoTable } from '@/components/content/InfoTable';
import {
  BRAND_NAME,
  COPYRIGHT_OWNER,
  SUPPORT_EMAIL,
  SUPPORT_HOURS,
  SUPPORT_PHONE,
} from '@/config/brand';
import { env } from '@/config/env';
import { ROUTES } from '@/config/routes';
import { buildBreadcrumbJsonLd, useDocumentMeta, useJsonLd } from '@/lib/seo';

const LAST_UPDATED = '2026-10-01';

const BREADCRUMBS = [
  { label: 'Home', to: ROUTES.home },
  { label: 'Privacy', to: ROUTES.privacy },
] as const;

const SECTIONS = [
  { id: 'overview', label: 'The short version' },
  { id: 'data-we-collect', label: 'What we collect' },
  { id: 'how-we-use', label: 'How we use it' },
  { id: 'processors', label: 'Who processes it' },
  { id: 'cookies', label: 'Cookies & browser storage' },
  { id: 'no-selling', label: 'We never sell your data' },
  { id: 'retention', label: 'How long we keep it' },
  { id: 'your-rights', label: 'Your rights (DPDP Act 2023)' },
  { id: 'security', label: 'Security' },
  { id: 'children', label: 'Children' },
  { id: 'changes', label: 'Changes to this policy' },
  { id: 'contact', label: 'Contact & grievances' },
] as const;

/** /privacy — what we collect, processors, storage, and rights under India's DPDP Act 2023. */
export default function PrivacyPage() {
  useDocumentMeta({
    title: 'Privacy Policy',
    description: `How ${BRAND_NAME} handles your Google profile, orders, addresses, garage and newsletter email — processors, browser storage, no selling of data and your rights under India's DPDP Act 2023.`,
  });
  useJsonLd(
    'breadcrumbs',
    buildBreadcrumbJsonLd(BREADCRUMBS.map((crumb) => ({ name: crumb.label, path: crumb.to }))),
  );

  return (
    <ContentPage
      breadcrumbs={BREADCRUMBS}
      eyebrow="Data handling · DPDP Act 2023"
      eyebrowIcon={<ShieldCheck />}
      title="Privacy Policy"
      lead={`What ${BRAND_NAME} collects, why, who helps us process it, and how to exercise your rights. Plain language, no dark patterns.`}
      lastUpdated={LAST_UPDATED}
      toc={SECTIONS}
    >
      <ContentSection id="overview" index={1} title="The short version">
        <ul>
          <li>We collect only what we need to run your account, orders and garage.</li>
          <li>Sign-in is through Google — we never see or store your password.</li>
          <li>We never sell or rent your personal data, and we run no advertising trackers.</li>
          <li>
            You can ask for a copy, a correction or deletion of your data at any time by emailing{' '}
            <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>.
          </li>
        </ul>
        <p>
          This policy is published by {COPYRIGHT_OWNER} (“we”, “us”), the data fiduciary for the
          personal data processed through {BRAND_NAME}.
        </p>
      </ContentSection>

      <ContentSection id="data-we-collect" index={2} title="What we collect">
        <InfoTable
          caption="Personal data and where it comes from"
          columns={['Data', 'Source', 'Includes']}
          rows={[
            {
              id: 'profile',
              label: 'Google profile',
              value: 'Google',
              note: 'Name, email address and profile photo when you sign in with Google',
            },
            {
              id: 'orders',
              label: 'Orders',
              value: 'You',
              note: 'Items, amounts, payment method, test-mode transaction reference, order status',
            },
            {
              id: 'addresses',
              label: 'Addresses',
              value: 'You',
              note: 'Name, phone number, PIN code and delivery addresses you save',
            },
            {
              id: 'garage',
              label: 'Garage & wishlist',
              value: 'You',
              note: 'Cars you park or wishlist, favourites, quantities, XP, level and badges',
            },
            {
              id: 'reviews',
              label: 'Reviews',
              value: 'You',
              note: 'Rating, review text and the display name/photo shown with it',
            },
            {
              id: 'newsletter',
              label: 'Newsletter',
              value: 'You',
              note: 'Your email address, only if you sign up for drop alerts',
            },
          ]}
        />
        <p>
          We do not collect card numbers, UPI IDs or bank details. While payments run in test mode
          the checkout is simulated and no payment information leaves your browser.
        </p>
      </ContentSection>

      <ContentSection id="how-we-use" index={3} title="How we use it">
        <ul>
          <li>To create and secure your account and keep you signed in.</li>
          <li>To process, deliver and support your orders, returns and refunds.</li>
          <li>To run My Garage — collection tracking, XP, levels and badges.</li>
          <li>To show your reviews with your chosen display name.</li>
          <li>To send drop alerts, only if you asked for them.</li>
          <li>To prevent fraud and abuse, and to meet legal and tax obligations.</li>
        </ul>
        <p>
          We process this data on the basis of your consent (given when you sign in, place an order
          or subscribe) and for legitimate uses permitted under the Digital Personal Data Protection
          Act, 2023. You can withdraw consent at any time — see{' '}
          <Link to={{ hash: 'your-rights' }}>Your rights</Link>.
        </p>
      </ContentSection>

      <ContentSection id="processors" index={4} title="Who processes it">
        <p>
          We use a small number of trusted service providers (data processors) who act only on our
          instructions:
        </p>
        <ul>
          <li>
            <strong>Google Firebase / Google Cloud</strong> — authentication, database, server
            functions and hosting. Our backend is configured for the Mumbai region (asia-south1).
          </li>
          <li>
            <strong>Cloudinary</strong> — delivers product images. It receives standard request data
            (such as your IP address and browser) needed to serve an image, never your account
            details.
          </li>
          <li>
            <strong>Courier partners</strong> — receive your name, phone number and delivery address
            to deliver live orders.
          </li>
          {env.enableAnalytics ? (
            <li>
              <strong>Google Analytics for Firebase</strong> — aggregated, pseudonymous usage
              statistics that help us improve the store.
            </li>
          ) : null}
        </ul>
        <p>
          Some providers may process data outside India under their own safeguards, as permitted by
          Indian law.
        </p>
      </ContentSection>

      <ContentSection id="cookies" index={5} title="Cookies & browser storage">
        <p>
          We use no advertising or cross-site tracking cookies. Your browser’s storage holds only:
        </p>
        <ul>
          <li>
            <strong>Your pit stop (cart)</strong> — saved in localStorage (<code>hwa-cart-v1</code>)
            so it survives a refresh.
          </li>
          <li>
            <strong>Display preferences</strong> — theme, engine sounds and CRT scanlines in
            localStorage (<code>hwa-prefs-v1</code>).
          </li>
          <li>
            <strong>Recent searches</strong> — in sessionStorage, cleared when you close the tab.
          </li>
          <li>
            <strong>Your sign-in session</strong> — kept by Firebase Authentication so you stay
            signed in. It is essential and never used for tracking.
          </li>
        </ul>
        <p>
          Clearing your browser’s site data removes all of it; you will simply need to sign in again
          and your cart will be emptied.
        </p>
      </ContentSection>

      <ContentSection id="no-selling" index={6} title="We never sell your data">
        <p>
          We do not sell, rent or trade your personal data, and we do not share it with advertisers
          or data brokers. Data is shared only with the processors listed above, or when the law
          requires it (for example, a valid request from a government authority).
        </p>
      </ContentSection>

      <ContentSection id="retention" index={7} title="How long we keep it">
        <ul>
          <li>Account, garage and wishlist data — while your account is active.</li>
          <li>
            Order and invoice records — as long as Indian tax and accounting law requires (usually
            up to 8 years).
          </li>
          <li>Newsletter email — until you ask us to remove it.</li>
        </ul>
        <p>When data is no longer needed, we delete or anonymise it.</p>
      </ContentSection>

      <ContentSection id="your-rights" index={8} title="Your rights (DPDP Act 2023)">
        <p>Under India’s Digital Personal Data Protection Act, 2023 you have the right to:</p>
        <ul>
          <li>
            <strong>Access</strong> — a summary of the personal data we process about you and how.
          </li>
          <li>
            <strong>Correction and completion</strong> — fix inaccurate or incomplete data.
          </li>
          <li>
            <strong>Erasure</strong> — have your data deleted when it is no longer needed or when
            you withdraw consent, subject to legal retention.
          </li>
          <li>
            <strong>Withdraw consent</strong> — as easily as you gave it.
          </li>
          <li>
            <strong>Grievance redressal</strong> — a response from us to any complaint about how we
            handle your data.
          </li>
          <li>
            <strong>Nominate</strong> — someone to exercise these rights on your behalf in case of
            death or incapacity.
          </li>
        </ul>
        <p>
          Email <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a> from the address linked to
          your account. We respond within 30 days. If you are not satisfied, you may complain to the
          Data Protection Board of India.
        </p>
      </ContentSection>

      <ContentSection id="security" index={9} title="Security">
        <p>
          Data is encrypted in transit (HTTPS) and at rest by our cloud provider. Database rules let
          you read and change only your own data; orders, XP and badges can only be written by our
          server. No system is perfectly secure, but we will notify you and the authorities as
          required by law if a breach affects your data.
        </p>
      </ContentSection>

      <ContentSection id="children" index={10} title="Children">
        <p>
          Accounts are intended for people aged 18 and over. Younger collectors are welcome to shop
          with a parent or guardian, using the adult’s account. If you believe a child has given us
          personal data, contact us and we will delete it.
        </p>
      </ContentSection>

      <ContentSection id="changes" index={11} title="Changes to this policy">
        <p>
          We will update this page when our practices change and revise the “last updated” date
          above. Significant changes will also be highlighted on the site.
        </p>
      </ContentSection>

      <ContentSection id="contact" index={12} title="Contact & grievances">
        <p>
          Questions, requests or complaints about your data go to our grievance contact at{' '}
          <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a> or {SUPPORT_PHONE} (
          {SUPPORT_HOURS}
          ).
        </p>
        <Callout title="Related">
          Read our <Link to={ROUTES.terms}>Terms of use</Link> or the{' '}
          <Link to={`${ROUTES.faq}#account-privacy`}>Account & Privacy FAQ</Link>.
        </Callout>
      </ContentSection>
    </ContentPage>
  );
}
