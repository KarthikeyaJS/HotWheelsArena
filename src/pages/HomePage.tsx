import { useMemo, type ReactNode } from 'react';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { HeroSection } from '@/components/hero/HeroSection';
import { AboutSection } from '@/components/home/AboutSection';
import { AchievementsSection } from '@/components/home/AchievementsSection';
import { ChooseYourRide } from '@/components/home/ChooseYourRide';
import { FeaturedSection } from '@/components/home/FeaturedSection';
import { GarageTeaserSection } from '@/components/home/GarageTeaserSection';
import { buildHomeJsonLd } from '@/components/home/homeJsonLd';
import { NewArrivalsSection } from '@/components/home/NewArrivalsSection';
import { VaultSection } from '@/components/home/VaultSection';
import { ScrollTrack } from '@/components/scrolltrack/ScrollTrack';
import { SCROLL_TRACK_QUERY } from '@/components/scrolltrack/trackGeometry';
import { Container } from '@/components/ui/Container';
import { ErrorState } from '@/components/ui/ErrorState';
import { BRAND_DESCRIPTION } from '@/config/brand';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { useDocumentMeta, useJsonLd } from '@/lib/seo';

/** Section-level boundary: one stalled section never takes the rest of the home page down. */
function SectionBoundary({ label, children }: { label: string; children: ReactNode }) {
  return (
    <ErrorBoundary
      label={label}
      fallback={({ error, reset }) => (
        <Container className="py-12">
          <ErrorState compact title={`${label} stalled`} error={error} onRetry={reset} />
        </Container>
      )}
    >
      {children}
    </ErrorBoundary>
  );
}

/**
 * Home — the Digital Collector's Garage (spec §5.1): hero with the GSAP scroll sequence, then
 * Choose Your Ride, Just Off The Track, Featured Collection, The Collector's Vault, Build Your
 * Garage, Collector Achievements and the pit-crew newsletter; plus the page scroll-track on wide
 * desktops. The footer comes from the layout.
 */
export default function HomePage() {
  useDocumentMeta({ description: BRAND_DESCRIPTION });
  const jsonLd = useMemo(() => buildHomeJsonLd(), []);
  useJsonLd('home', jsonLd);

  const reducedMotion = useReducedMotion();
  const wideDesktop = useMediaQuery(SCROLL_TRACK_QUERY);
  const showScrollTrack = wideDesktop && !reducedMotion;

  return (
    <div className="overflow-x-clip">
      <SectionBoundary label="Garage hero">
        <HeroSection />
      </SectionBoundary>
      <SectionBoundary label="Choose your ride">
        <ChooseYourRide />
      </SectionBoundary>
      <SectionBoundary label="New arrivals">
        <NewArrivalsSection />
      </SectionBoundary>
      <SectionBoundary label="Featured collection">
        <FeaturedSection />
      </SectionBoundary>
      <SectionBoundary label="The vault">
        <VaultSection />
      </SectionBoundary>
      <SectionBoundary label="Garage preview">
        <GarageTeaserSection />
      </SectionBoundary>
      <SectionBoundary label="Achievements">
        <AchievementsSection />
      </SectionBoundary>
      <SectionBoundary label="Newsletter">
        <AboutSection />
      </SectionBoundary>
      {showScrollTrack ? <ScrollTrack /> : null}
    </div>
  );
}
