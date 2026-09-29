import { FlaskConical, Mail, Phone } from 'lucide-react';
import { Suspense, lazy } from 'react';
import { Link } from 'react-router-dom';
import { GridBackground } from '@/components/effects/GridBackground';
import { Container } from '@/components/ui/Container';
import { Skeleton } from '@/components/ui/Skeleton';
import {
  BRAND_DESCRIPTION,
  BRAND_TAGLINE,
  COPYRIGHT_OWNER,
  FOOTER_DISCLAIMER,
  SUPPORT_EMAIL,
  SUPPORT_HOURS,
  SUPPORT_PHONE,
  SUPPORT_PHONE_E164,
} from '@/config/brand';
import { FOOTER_LINK_GROUPS } from '@/config/nav';
import { isTestPaymentMode } from '@/config/payment';
import { Logo } from './Logo';
import { ScanlinesToggle } from './ScanlinesToggle';
import { SocialLinks } from './SocialLinks';
import { SoundToggle } from './SoundToggle';
import { ThemeToggle } from './ThemeToggle';

/* The form (react-hook-form + zod resolver) is below the fold on every page — keep it out of the
   entry chunk. The fallback reserves the same height, so nothing shifts when it arrives. */
const NewsletterForm = lazy(() =>
  import('@/components/newsletter/NewsletterForm').then((module) => ({
    default: module.NewsletterForm,
  })),
);

function NewsletterFallback() {
  return (
    <div aria-hidden="true" className="space-y-2">
      <Skeleton className="h-4 w-24 rounded-sm" />
      <Skeleton className="h-11 w-full rounded-md" />
      <Skeleton className="h-3 w-48 rounded-sm" />
    </div>
  );
}

const HUD_DETAILS: readonly string[] = ['Scale 1:64', 'Ships pan-India', 'Prices in ₹ INR'];

/**
 * Site footer: brand block (logo, tagline, description, socials, support contact), link groups
 * (`FOOTER_LINK_GROUPS`), inline newsletter, garage settings chips, HUD details, disclaimer,
 * copyright and the TEST MODE payments note.
 */
export function Footer() {
  const year = new Date().getFullYear();
  const testMode = isTestPaymentMode();

  return (
    <footer className="relative isolate overflow-hidden border-t border-line bg-surface">
      <span aria-hidden="true" className="racing-stripe is-active h-[3px]" />
      <GridBackground className="-z-10 opacity-40" />

      <Container className="py-14 lg:py-16">
        <div className="grid gap-12 lg:grid-cols-12 lg:gap-8">
          <div className="lg:col-span-4">
            <Logo size="md" />
            <p className="eyebrow mt-4">{BRAND_TAGLINE}</p>
            <p className="mt-3 max-w-sm text-sm leading-relaxed text-muted">{BRAND_DESCRIPTION}</p>
            <SocialLinks className="mt-6" />
            <address className="mt-6 space-y-2 text-sm not-italic">
              <a
                href={`mailto:${SUPPORT_EMAIL}`}
                className="flex w-fit items-center gap-2 text-muted transition-colors hover:text-fg"
              >
                <Mail aria-hidden="true" className="h-4 w-4 shrink-0" />
                {SUPPORT_EMAIL}
              </a>
              <a
                href={`tel:${SUPPORT_PHONE_E164}`}
                className="flex w-fit items-center gap-2 text-muted transition-colors hover:text-fg"
              >
                <Phone aria-hidden="true" className="h-4 w-4 shrink-0" />
                <span className="font-mono tabular-nums">{SUPPORT_PHONE}</span>
              </a>
              <p className="hud pl-6 text-[10px] text-muted">{SUPPORT_HOURS}</p>
            </address>
          </div>

          <nav aria-label="Footer" className="lg:col-span-8">
            <div className="grid grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-4">
              {FOOTER_LINK_GROUPS.map((group) => (
                <div key={group.title}>
                  <h2 className="hud flex items-center gap-2 text-fg">
                    <span aria-hidden="true" className="h-1.5 w-1.5 rounded-[1px] bg-accent" />
                    {group.title}
                  </h2>
                  <ul className="mt-4 space-y-2.5">
                    {group.links.map((link) => (
                      <li key={link.to + link.label}>
                        <Link
                          to={link.to}
                          className="group inline-flex items-center gap-1.5 text-sm text-muted transition-colors duration-150 hover:text-fg"
                        >
                          <span
                            aria-hidden="true"
                            className="h-px w-0 bg-accent transition-[width] duration-200 ease-race group-hover:w-2.5"
                          />
                          {link.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </nav>
        </div>

        <div className="mt-14 grid gap-10 border-t border-line pt-10 lg:grid-cols-12 lg:gap-8">
          <div className="lg:col-span-5">
            <Suspense fallback={<NewsletterFallback />}>
              <NewsletterForm variant="inline" />
            </Suspense>
          </div>
          <div className="flex flex-col gap-5 lg:col-span-7 lg:items-end">
            <div>
              <p className="hud mb-2 text-[10px] text-muted lg:text-right">Garage settings</p>
              <div className="flex flex-wrap gap-2 lg:justify-end">
                <ThemeToggle variant="text" />
                <SoundToggle variant="text" />
                <ScanlinesToggle variant="text" />
              </div>
            </div>
            <ul className="hud flex flex-wrap items-center gap-x-4 gap-y-2 text-[10px] text-muted lg:justify-end">
              <li className="inline-flex items-center gap-2">
                <span aria-hidden="true" className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-60 motion-reduce:hidden" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-success" />
                </span>
                Garage online
              </li>
              {HUD_DETAILS.map((detail) => (
                <li key={detail} className="inline-flex items-center gap-4">
                  <span aria-hidden="true" className="hidden text-line sm:inline">
                    /
                  </span>
                  {detail}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Container>

      <div className="border-t border-line bg-bg/50">
        <Container className="flex flex-col gap-5 py-6 lg:flex-row lg:items-start lg:justify-between lg:gap-10">
          <p className="max-w-3xl text-xs leading-relaxed text-muted">{FOOTER_DISCLAIMER}</p>
          <div className="flex shrink-0 flex-col gap-2 lg:items-end">
            <p className="hud text-[10px] text-muted">
              © {year} {COPYRIGHT_OWNER}
            </p>
            {testMode ? (
              <p className="hud inline-flex w-fit items-center gap-1.5 rounded border border-line px-2 py-1 text-[10px] text-muted">
                <FlaskConical aria-hidden="true" className="h-3 w-3" />
                Payments are in test mode · no real charges
              </p>
            ) : null}
          </div>
        </Container>
      </div>
    </footer>
  );
}
