import { ArrowRight, Gem, ShieldCheck, Truck, type LucideIcon } from 'lucide-react';
import { NewsletterForm } from '@/components/newsletter/NewsletterForm';
import { Button } from '@/components/ui/Button';
import { BRAND_DESCRIPTION, BRAND_NAME } from '@/config/brand';
import { ROUTES } from '@/config/routes';
import { useSettings } from '@/hooks/useSiteSettings';
import { formatINR } from '@/lib/format';
import { HomeSection } from './HomeSection';
import { HOME_SECTION_IDS, sectionHeadingId } from './homeSections';

/** Visible heading text of the newsletter block (also the section's accessible name). */
const NEWSLETTER_TITLE = 'Join the pit crew';

interface AboutPoint {
  icon: LucideIcon;
  title: string;
  text: string;
}

/**
 * NEWSLETTER / ABOUT (`#about`, the last scroll-track station) — "JOIN THE PIT CREW" drop-alert
 * sign-up (NewsletterForm → `subscribeNewsletter` callable) plus a short about strip.
 */
export function AboutSection() {
  const settings = useSettings();
  const headingId = sectionHeadingId(HOME_SECTION_IDS.about);

  const points: readonly AboutPoint[] = [
    {
      icon: Truck,
      title: `Free shipping over ${formatINR(settings.shippingThreshold)}`,
      text: 'Collector-safe packing on every order, shipped across India.',
    },
    {
      icon: Gem,
      title: 'Numbered vault editions',
      text: 'Limited runs with edition numbers — once they are gone, they are gone.',
    },
    {
      icon: ShieldCheck,
      title: 'One-tap Google sign-in',
      text: 'Your garage, wishlist and XP sync across devices. No passwords.',
    },
  ];

  return (
    <HomeSection id={HOME_SECTION_IDS.about} className="pb-20 lg:pb-28">
      {/* The NewsletterForm heading carries the section heading id (HomeSection aria-labelledby). */}
      <NewsletterForm
        variant="section"
        eyebrow="Pit crew radio · 08"
        title={NEWSLETTER_TITLE}
        description="Drop alerts, vault restocks and collector news, straight to your inbox. No spam — unsubscribe anytime."
        headingAs="h2"
        headingId={headingId}
      />
      <div className="mt-10 grid gap-8 border-t border-line pt-10 lg:grid-cols-12 lg:gap-12">
        <div className="lg:col-span-5">
          <p className="eyebrow">About {BRAND_NAME}</p>
          <p className="mt-3 text-muted">{BRAND_DESCRIPTION}</p>
          <Button variant="link" to={ROUTES.about} rightIcon={<ArrowRight />} className="mt-4">
            Our story
          </Button>
        </div>
        <ul className="grid gap-6 sm:grid-cols-3 lg:col-span-7">
          {points.map((item) => (
            <li key={item.title} className="flex flex-col gap-2">
              <span
                aria-hidden="true"
                className="grid h-10 w-10 place-items-center rounded-lg border border-line bg-surface text-accent-ink"
              >
                <item.icon className="h-5 w-5" />
              </span>
              <span className="font-semibold text-fg">{item.title}</span>
              <span className="text-sm text-muted">{item.text}</span>
            </li>
          ))}
        </ul>
      </div>
    </HomeSection>
  );
}
