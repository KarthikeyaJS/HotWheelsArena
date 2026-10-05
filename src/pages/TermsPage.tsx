import { Scale } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Callout } from '@/components/content/Callout';
import { ContentPage } from '@/components/content/ContentPage';
import { ContentSection } from '@/components/content/ContentSection';
import {
  BRAND_NAME,
  BRAND_PRODUCT_LINE,
  COPYRIGHT_OWNER,
  FOOTER_DISCLAIMER,
  SUPPORT_EMAIL,
} from '@/config/brand';
import { isTestPaymentMode } from '@/config/payment';
import { ROUTES } from '@/config/routes';
import { useSettings } from '@/hooks/useSiteSettings';
import { formatINR } from '@/lib/format';
import { buildBreadcrumbJsonLd, useDocumentMeta, useJsonLd } from '@/lib/seo';

const LAST_UPDATED = '2026-10-01';

const BREADCRUMBS = [
  { label: 'Home', to: ROUTES.home },
  { label: 'Terms', to: ROUTES.terms },
] as const;

const SECTIONS = [
  { id: 'about', label: 'Who we are' },
  { id: 'trademarks', label: 'Trademark notice' },
  { id: 'accounts', label: 'Accounts & eligibility' },
  { id: 'test-mode', label: 'Test-mode payments' },
  { id: 'orders-pricing', label: 'Orders & pricing' },
  { id: 'limited-editions', label: 'Limited editions' },
  { id: 'themed-specs', label: 'Themed specifications' },
  { id: 'reviews', label: 'Reviews policy' },
  { id: 'garage-xp', label: 'My Garage, XP & badges' },
  { id: 'acceptable-use', label: 'Acceptable use' },
  { id: 'liability', label: 'Liability' },
  { id: 'governing-law', label: 'Governing law' },
  { id: 'changes', label: 'Changes & contact' },
] as const;

/** /terms — store terms: trademark notice, test-mode payments, pricing, editions, reviews, law. */
export default function TermsPage() {
  useDocumentMeta({
    title: 'Terms of Use',
    description: `The terms for shopping at ${BRAND_NAME}: an independent collector store — test-mode payments, GST-inclusive pricing, limited editions, reviews and Indian governing law.`,
  });
  useJsonLd(
    'breadcrumbs',
    buildBreadcrumbJsonLd(BREADCRUMBS.map((crumb) => ({ name: crumb.label, path: crumb.to }))),
  );

  const settings = useSettings();
  const testMode = isTestPaymentMode();

  return (
    <ContentPage
      breadcrumbs={BREADCRUMBS}
      eyebrow="Rules of the track"
      eyebrowIcon={<Scale />}
      title="Terms of Use"
      lead={`The ground rules for using ${BRAND_NAME} — please read them before you place an order. Using the site means you accept them.`}
      lastUpdated={LAST_UPDATED}
      toc={SECTIONS}
    >
      <ContentSection id="about" index={1} title="Who we are">
        <p>
          {BRAND_NAME} is an independent online store for {BRAND_PRODUCT_LINE} collectors in India,
          operated by {COPYRIGHT_OWNER} (“we”, “us”). These terms apply to the website, your
          account, My Garage and every order you place.
        </p>
      </ContentSection>

      <ContentSection id="trademarks" index={2} title="Trademark notice">
        <Callout title="Independent collector store">{FOOTER_DISCLAIMER}</Callout>
        <p>
          Car makes, models and logos mentioned on the site are used only to describe the
          collectible being sold. Product photos and renders may be illustrative placeholders.
        </p>
      </ContentSection>

      <ContentSection id="accounts" index={3} title="Accounts & eligibility">
        <ul>
          <li>You sign in with a Google account; keep it secure — actions on it count as yours.</li>
          <li>
            You must be 18 or older to hold an account and place orders, or shop with a parent or
            guardian’s account.
          </li>
          <li>
            Provide accurate delivery details. We may suspend accounts used for fraud, abuse or bulk
            reselling.
          </li>
        </ul>
      </ContentSection>

      <ContentSection id="test-mode" index={4} title="Test-mode payments">
        {testMode ? (
          <Callout tone="test" title="Payments are in test mode">
            Checkout currently uses a payment simulator. No money is charged, no card or UPI details
            are collected, and test orders are demonstration orders that are not dispatched.
          </Callout>
        ) : null}
        <p>
          While test mode is on, card, UPI and cash-on-delivery options are simulated, and around
          one in ten card or UPI payments is declined on purpose so the failure flow can be tried
          safely. Test orders still appear in your order history and earn XP and badges, which may
          be reset when live payments launch.
        </p>
        <p>
          When live payments are enabled, this section will be updated and a real payment gateway
          will process your payment under its own terms.
        </p>
      </ContentSection>

      <ContentSection id="orders-pricing" index={5} title="Orders & pricing">
        <ul>
          <li>
            Prices are in Indian rupees (INR) and <strong>include GST</strong>. The GST portion is
            shown as an informational line; it is never added on top.
          </li>
          <li>
            Shipping is free on orders of {formatINR(settings.shippingThreshold)} or more; otherwise
            a flat {formatINR(settings.shippingFee)} applies. See{' '}
            <Link to={ROUTES.shippingReturns}>Shipping & Returns</Link>.
          </li>
          <li>
            Every order is verified on our server against current prices and stock. If anything
            changed since you added it to your pit stop, we ask you to review before paying.
          </li>
          <li>
            Up to {settings.maxQtyPerItem} units of each car per order. We may cancel orders that
            look like bulk reselling and refund them in full.
          </li>
          <li>
            An order is accepted when you see its confirmation page. If we cannot fulfil it (for
            example after a pricing error), we cancel it and refund you in full.
          </li>
        </ul>
      </ContentSection>

      <ContentSection id="limited-editions" index={6} title="Limited editions">
        <p>
          Vault cars are numbered runs, shown as <code>#001/500</code> — the edition number and the
          size of the run. “Only 37 remaining” style counts are{' '}
          <strong>static figures updated by our team</strong>; they do not update in real time.
        </p>
        <p>
          A listing does not guarantee availability: an edition is yours only once your order is
          confirmed. We do not restock a numbered run once it is sold out.
        </p>
      </ContentSection>

      <ContentSection id="themed-specs" index={7} title="Themed specifications">
        <p>
          “Meet the Machine” stats such as top speed, power, rarity and collector scores are themed
          for fun. They are not claims about the die-cast toy or the real vehicle.
        </p>
      </ContentSection>

      <ContentSection id="reviews" index={8} title="Reviews policy">
        <ul>
          <li>Signed-in collectors can post one review per car, and edit it later.</li>
          <li>
            Reviews must be honest and about the product — no profanity, hate, spam, links, personal
            data or reviews written in exchange for payment.
          </li>
          <li>Reviews from people who bought the car here carry a “verified buyer” mark.</li>
          <li>
            We may remove reviews that break these rules. We never edit a review to change its
            meaning.
          </li>
          <li>
            By posting, you let us display your review, rating, display name and photo on the site.
          </li>
        </ul>
      </ContentSection>

      <ContentSection id="garage-xp" index={9} title="My Garage, XP & badges">
        <p>
          My Garage, XP, levels and badges are a free collector feature. They have no cash value,
          cannot be transferred or exchanged, and we may adjust the rules, recalculate totals or
          correct mistakes. See <Link to={`${ROUTES.about}#levels`}>how collector levels work</Link>
          .
        </p>
      </ContentSection>

      <ContentSection id="acceptable-use" index={10} title="Acceptable use">
        <p>
          Don’t misuse the site: no scraping, automated ordering bots, attempts to break security,
          or interfering with other collectors. Content on the site (text, design, graphics) belongs
          to us or our licensors and may not be copied for commercial use.
        </p>
      </ContentSection>

      <ContentSection id="liability" index={11} title="Liability">
        <p>
          We take care to describe every car accurately, but colours and details can vary slightly
          from photos. To the extent permitted by law, our total liability for any order is limited
          to the amount you paid for it. Nothing in these terms limits your rights under the
          Consumer Protection Act, 2019 or other Indian law.
        </p>
      </ContentSection>

      <ContentSection id="governing-law" index={12} title="Governing law">
        <p>
          These terms are governed by the laws of India. Any dispute will be handled by the courts
          of Bengaluru, Karnataka — though we will always try to sort things out with you directly
          first.
        </p>
      </ContentSection>

      <ContentSection id="changes" index={13} title="Changes & contact">
        <p>
          We may update these terms; the “last updated” date above shows the latest version, and
          continued use of the site means you accept the update. Questions? Email{' '}
          <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a> or read our{' '}
          <Link to={ROUTES.privacy}>Privacy Policy</Link>.
        </p>
      </ContentSection>
    </ContentPage>
  );
}
