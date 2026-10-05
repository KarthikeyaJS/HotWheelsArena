import {
  ArrowRight,
  CircleHelp,
  Headset,
  PackageSearch,
  RotateCcw,
  ShieldCheck,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { SupportCard } from '@/components/content/SupportCard';
import { ContentPage } from '@/components/content/ContentPage';
import { ContactForm } from '@/components/content/contact/ContactForm';
import { BRAND_NAME, SUPPORT_HOURS } from '@/config/brand';
import { ROUTES } from '@/config/routes';
import { buildBreadcrumbJsonLd, useDocumentMeta, useJsonLd } from '@/lib/seo';

const BREADCRUMBS = [
  { label: 'Home', to: ROUTES.home },
  { label: 'Contact', to: ROUTES.contact },
] as const;

const QUICK_LINKS = [
  {
    to: ROUTES.orders,
    icon: PackageSearch,
    title: 'Track an order',
    description: 'Live status for every order in your account.',
  },
  {
    to: `${ROUTES.shippingReturns}#returns`,
    icon: RotateCcw,
    title: 'Damaged or wrong car?',
    description: '7-day returns with an unboxing video.',
  },
  {
    to: ROUTES.faq,
    icon: CircleHelp,
    title: 'Browse the FAQ',
    description: 'Shipping, test-mode payments, XP and more.',
  },
  {
    to: `${ROUTES.privacy}#your-rights`,
    icon: ShieldCheck,
    title: 'Data requests',
    description: 'Access, correct or delete your data.',
  },
] as const;

/** /contact — support details from brand.ts and a mailto-composing contact form. */
export default function ContactPage() {
  useDocumentMeta({
    title: 'Contact',
    description: `Talk to the ${BRAND_NAME} pit crew — email, phone and hours (${SUPPORT_HOURS}) for orders, shipping, returns and your garage.`,
  });
  useJsonLd(
    'breadcrumbs',
    buildBreadcrumbJsonLd(BREADCRUMBS.map((crumb) => ({ name: crumb.label, path: crumb.to }))),
  );

  return (
    <ContentPage
      breadcrumbs={BREADCRUMBS}
      eyebrow="Pit crew radio"
      eyebrowIcon={<Headset />}
      title="Contact us"
      lead="Questions about an order, a damaged parcel or your garage? Real collectors answer every message, usually within one business day."
      headerAside={<SupportCard showContactLink={false} />}
      width="wide"
    >
      <div className="grid gap-8 lg:grid-cols-12 lg:gap-10">
        <div className="min-w-0 lg:col-span-8">
          <ContactForm />
        </div>
        <aside aria-labelledby="contact-quick-help" className="min-w-0 lg:col-span-4">
          <h2 id="contact-quick-help" className="hud text-muted">
            Faster answers
          </h2>
          <ul className="mt-4 flex flex-col gap-3">
            {QUICK_LINKS.map((link) => (
              <li key={link.to}>
                <Link
                  to={link.to}
                  className="group relative flex items-start gap-4 overflow-hidden rounded-xl border border-line bg-card p-4 shadow-card transition-colors duration-200 hover:bg-card-hover active:scale-[0.99]"
                >
                  <span aria-hidden="true" className="racing-stripe racing-stripe-left" />
                  <span
                    aria-hidden="true"
                    className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-line bg-surface text-accent-ink"
                  >
                    <link.icon className="h-5 w-5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold text-fg">{link.title}</span>
                    <span className="mt-0.5 block text-sm text-muted">{link.description}</span>
                  </span>
                  <ArrowRight
                    aria-hidden="true"
                    className="mt-1 h-4 w-4 shrink-0 text-muted transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-accent-ink"
                  />
                </Link>
              </li>
            ))}
          </ul>
        </aside>
      </div>
    </ContentPage>
  );
}
