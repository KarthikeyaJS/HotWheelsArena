import { ArrowLeft, ShieldCheck } from 'lucide-react';
import type { ReactNode } from 'react';
import { GoogleSignInButton } from '@/components/auth/GoogleSignInButton';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { ROUTES } from '@/config/routes';
import { useAuth } from '@/hooks/useAuth';
import { useDocumentMeta } from '@/lib/seo';

export interface RequireAuthProps {
  children: ReactNode;
  /** Why a pit pass is needed on this page (shown in the panel). */
  reason?: string;
}

function AuthGateSkeleton() {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      className="mx-auto flex min-h-[50vh] max-w-content items-center justify-center px-4"
    >
      <span className="sr-only">Checking your pit pass…</span>
      <div className="w-full max-w-md space-y-4">
        <Skeleton className="h-3 w-32 rounded-sm" />
        <Skeleton className="h-9 w-3/4 rounded-md" />
        <Skeleton variant="text" lines={2} />
        <Skeleton className="h-12 w-56 rounded-md" />
      </div>
    </div>
  );
}

function PitPassRequired({ reason }: { reason?: string }) {
  useDocumentMeta({ title: 'Pit pass required', noindex: true });

  return (
    <section
      aria-labelledby="pit-pass-title"
      className="relative isolate flex min-h-[60vh] items-center justify-center overflow-hidden px-4 py-16"
    >
      <div aria-hidden="true" className="bg-grid bg-grid-fade absolute inset-0 -z-10" />
      <div className="relative w-full max-w-xl overflow-hidden rounded-xl border border-line bg-card p-6 shadow-card sm:p-10">
        <span aria-hidden="true" className="racing-stripe is-active" />
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-lg border border-line bg-surface">
            <ShieldCheck aria-hidden="true" className="h-5 w-5 text-accent-ink" />
          </span>
          <p className="hud text-muted">ACCESS CONTROL · CREW ONLY</p>
        </div>
        <h1 id="pit-pass-title" className="mt-6 text-2xl text-fg sm:text-3xl">
          PIT PASS REQUIRED
        </h1>
        <p className="mt-3 text-muted">
          {reason ?? 'Sign in with Google to open this part of the garage. It takes one click.'}
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
          <GoogleSignInButton variant="primary" size="lg" />
          <Button variant="ghost" to={ROUTES.shop} leftIcon={<ArrowLeft />}>
            Keep browsing
          </Button>
        </div>
      </div>
    </section>
  );
}

/**
 * Route guard for /garage, /checkout, /orders, /wishlist. Shows a skeleton while auth resolves
 * and an inline PIT PASS REQUIRED panel (no redirect) when signed out; the page renders in place
 * right after sign-in.
 */
export function RequireAuth({ children, reason }: RequireAuthProps) {
  const { status } = useAuth();
  if (status === 'loading') return <AuthGateSkeleton />;
  if (status === 'signed-out') return <PitPassRequired {...(reason ? { reason } : {})} />;
  return <>{children}</>;
}
