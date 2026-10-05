import {
  ArrowRight,
  Flag,
  Gem,
  Handshake,
  PackageCheck,
  Quote,
  Trophy,
  Warehouse,
} from 'lucide-react';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { ContentPage } from '@/components/content/ContentPage';
import { ContentSection } from '@/components/content/ContentSection';
import { CatalogueStats } from '@/components/content/about/CatalogueStats';
import { CollectorLevels } from '@/components/content/about/CollectorLevels';
import { Button } from '@/components/ui/Button';
import { BRAND_NAME, BRAND_PRODUCT_LINE, BRAND_TAGLINE, COUNTRY } from '@/config/brand';
import { ROUTES, garagePath, shopPath } from '@/config/routes';
import { buildBreadcrumbJsonLd, useDocumentMeta, useJsonLd } from '@/lib/seo';

const BREADCRUMBS = [
  { label: 'Home', to: ROUTES.home },
  { label: 'About', to: ROUTES.about },
] as const;

const PILLARS = [
  {
    id: 'collect',
    icon: Warehouse,
    title: 'Collect, don’t just consume',
    body: 'Every car you buy is parked in your virtual garage automatically. Add the ones already on your shelf, track duplicates and see which cars a series is still missing.',
  },
  {
    id: 'respect',
    icon: PackageCheck,
    title: 'Respect the casting',
    body: 'Rigid, corner-protected boxes and checked cards, so a carded car arrives the way a collector expects — crisp blister, sharp edges.',
  },
  {
    id: 'earn',
    icon: Trophy,
    title: 'Earn your stripes',
    body: 'Orders and garage milestones earn XP, levels and badges — calculated on our server, so every stripe on your profile is earned.',
  },
  {
    id: 'fair',
    icon: Handshake,
    title: 'Fair drops',
    body: 'Per-collector limits keep scalpers out, and vault counts are honest static numbers — never fake countdown timers.',
  },
] as const;

/** /about — the story, the garage philosophy, live catalogue stats and how collector levels work. */
export default function AboutPage() {
  useDocumentMeta({
    title: 'About',
    description: `${BRAND_NAME} is an independent store for ${BRAND_PRODUCT_LINE} collectors in ${COUNTRY}: every car is a collectible machine, not just a product. Our story, garage philosophy and collector levels.`,
  });
  useJsonLd(
    'breadcrumbs',
    buildBreadcrumbJsonLd(BREADCRUMBS.map((crumb) => ({ name: crumb.label, path: crumb.to }))),
  );

  return (
    <ContentPage
      breadcrumbs={BREADCRUMBS}
      eyebrow="About the arena"
      eyebrowIcon={<Flag />}
      title={`About ${BRAND_NAME}`}
      lead={`An independent garage for ${BRAND_PRODUCT_LINE} collectors across ${COUNTRY} — built by collectors, for collectors.`}
      headerMeta={
        <div className="flex flex-wrap gap-3">
          <Button to={shopPath()} rightIcon={<ArrowRight />}>
            Explore the collection
          </Button>
          <Button to={ROUTES.vault} variant="secondary" leftIcon={<Gem />}>
            Visit the vault
          </Button>
        </div>
      }
      width="wide"
    >
      <ContentSection id="story" index={1} title="The story" prose={false}>
        <div className="grid gap-8 lg:grid-cols-12 lg:gap-12">
          <figure className="relative overflow-hidden rounded-2xl border border-line bg-surface p-6 shadow-card sm:p-8 lg:col-span-7">
            <span aria-hidden="true" className="racing-stripe is-active" />
            <div aria-hidden="true" className="bg-grid bg-grid-fade absolute inset-0 opacity-60" />
            <Quote aria-hidden="true" className="relative h-8 w-8 text-accent" />
            <blockquote className="relative mt-4">
              <p className="font-display text-2xl font-bold uppercase leading-tight tracking-display text-fg sm:text-3xl lg:text-4xl">
                Every {BRAND_PRODUCT_LINE} car is a collectible machine, not just a product.
              </p>
            </blockquote>
            <figcaption className="hud relative mt-6 text-muted">
              The {BRAND_NAME} creed · {BRAND_TAGLINE}
            </figcaption>
          </figure>
          <div className="flex max-w-[70ch] flex-col gap-4 text-[15px] leading-7 text-fg/85 sm:text-base lg:col-span-5">
            <p>
              Collectors in {COUNTRY} know the drill: refreshing listings at midnight, cards crushed
              in a poly mailer, “limited” editions that never seem to run out. We wanted a store
              that treats a 1:64 casting the way you do.
            </p>
            <p>
              So {BRAND_NAME} is built like an underground racing garage instead of a template shop.
              Every car carries its series and collector number, rarity is front and centre, and
              numbered vault runs show exactly how many are left.
            </p>
            <p>
              Shopping becomes collecting: what you buy lands in your garage, completes your series
              and levels up your collector profile.
            </p>
          </div>
        </div>
      </ContentSection>

      <ContentSection id="philosophy" index={2} title="The garage philosophy" prose={false}>
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {PILLARS.map((pillar) => (
            <li
              key={pillar.id}
              className="group relative flex flex-col gap-3 overflow-hidden rounded-xl border border-line bg-card p-5 shadow-card transition-colors duration-200 hover:bg-card-hover"
            >
              <span aria-hidden="true" className="racing-stripe" />
              <span
                aria-hidden="true"
                className="grid h-11 w-11 place-items-center rounded-lg border border-line bg-surface text-accent-ink"
              >
                <pillar.icon className="h-5 w-5" />
              </span>
              <h3 className="text-sm leading-snug text-fg">{pillar.title}</h3>
              <p className="text-sm leading-6 text-muted">{pillar.body}</p>
            </li>
          ))}
        </ul>
      </ContentSection>

      <ContentSection id="catalogue" index={3} title="The garage today" prose={false}>
        <p className="mb-6 max-w-2xl text-[15px] leading-7 text-muted sm:text-base">
          Live numbers from the catalogue — they change with every drop.
        </p>
        <ErrorBoundary label="Catalogue stats">
          <CatalogueStats />
        </ErrorBoundary>
        <div className="mt-6 flex flex-wrap gap-3">
          <Button to={ROUTES.collections} variant="outline" rightIcon={<ArrowRight />}>
            Browse collections
          </Button>
          <Button to={shopPath({ view: 'new' })} variant="ghost" rightIcon={<ArrowRight />}>
            See new drops
          </Button>
        </div>
      </ContentSection>

      <ContentSection id="levels" index={4} title="How collector levels work" prose={false}>
        <p className="mb-8 max-w-2xl text-[15px] leading-7 text-muted sm:text-base">
          Your collector profile grows with your garage. XP is awarded by our server when you place
          an order or hit a garage milestone — it can’t be bought, only earned.
        </p>
        <ErrorBoundary label="Collector levels">
          <CollectorLevels />
        </ErrorBoundary>
      </ContentSection>

      <section
        aria-labelledby="about-cta-title"
        className="relative isolate overflow-hidden rounded-2xl border border-line bg-surface p-6 shadow-card sm:p-10"
      >
        <span aria-hidden="true" className="racing-stripe is-active" />
        <div
          aria-hidden="true"
          className="bg-grid bg-grid-fade absolute inset-0 -z-10 opacity-70"
        />
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="eyebrow">Lights out</p>
            <h2 id="about-cta-title" className="mt-2 text-2xl text-fg sm:text-3xl">
              Start your engine
            </h2>
            <p className="mt-2 max-w-xl text-muted">
              Find your next casting, then park it in your garage.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button to={shopPath()} size="lg" rightIcon={<ArrowRight />}>
              Explore the collection
            </Button>
            <Button to={garagePath()} size="lg" variant="secondary" leftIcon={<Warehouse />}>
              My Garage
            </Button>
          </div>
        </div>
      </section>
    </ContentPage>
  );
}
