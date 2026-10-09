import { Suspense } from 'react';
import { Outlet } from 'react-router-dom';
import { SignInPrompt } from '@/components/auth/SignInPrompt';
import { RouteFallback } from '@/components/common/RouteFallback';
import { ScanlinesOverlay } from '@/components/effects/ScanlinesOverlay';
import { BadgeWatcher } from '@/components/gamification/BadgeWatcher';
import { CommandPalette } from '@/components/search/CommandPalette';
import { Toaster } from '@/components/ui/Toaster';
import { Footer } from './Footer';
import { MobileDrawer } from './MobileDrawer';
import { Navbar } from './Navbar';
import { PageBackdrop } from './PageBackdrop';
import { SkipLink } from './SkipLink';

/**
 * The app shell (root route element via core's RootLayout): skip link → sticky Navbar (with the
 * scroll-progress line) → `<main id="main-content">` + routed page → Footer, over a faint garage
 * backdrop. Global overlays are mounted exactly once here: MobileDrawer, CommandPalette,
 * SignInPrompt, Toaster, BadgeWatcher and the CRT ScanlinesOverlay.
 */
export function AppLayout() {
  return (
    <div className="relative isolate flex min-h-screen min-h-[100svh] flex-col bg-bg text-fg">
      <PageBackdrop />
      <SkipLink />
      <Navbar />

      {/* The viewport-tall min-height keeps the footer below the fold while a lazy page,
          auth gate or data skeleton is pending, so it never jumps down when the page lands
          (CLS). Browsers without `svh` drop the declaration and keep flex-1 behaviour. */}
      <main
        id="main-content"
        tabIndex={-1}
        className="relative min-h-[calc(100svh-var(--header-height))] flex-1 focus:outline-none"
      >
        <Suspense fallback={<RouteFallback />}>
          <Outlet />
        </Suspense>
      </main>

      <Footer />

      <MobileDrawer />
      <CommandPalette />
      <SignInPrompt />
      <Toaster />
      <BadgeWatcher />
      <ScanlinesOverlay />
    </div>
  );
}
