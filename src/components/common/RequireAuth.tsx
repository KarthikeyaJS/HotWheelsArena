import { ArrowLeft, ShieldCheck } from 'lucide-react';
import type { ReactNode } from 'react';
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

/** Google "G" mark (brand colours are Google's, required by their sign-in guidelines). */
function GoogleMark() {
  return (
    <span className="flex h-6 w-6 items-center justify-center rounded-sm bg-white">
      <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4">
        <path
          fill="#4285F4"
          d="M23.52 12.27c0-.85-.08-1.67-.22-2.45H12v4.63h6.46a5.52 5.52 0 0 1-2.4 3.62v3h3.88c2.27-2.09 3.58-5.17 3.58-8.8Z"
        />
        <path
          fill="#34A853"
          d="M12 24c3.24 0 5.96-1.07 7.94-2.9l-3.88-3.01c-1.07.72-2.45 1.15-4.06 1.15-3.13 0-5.78-2.11-6.72-4.95H1.27v3.1A12 12 0 0 0 12 24Z"
        />
        <path
          fill="#FBBC05"
          d="M5.28 14.29A7.2 7.2 0 0 1 4.9 12c0-.8.14-1.57.38-2.29v-3.1H1.27A12 12 0 0 0 0 12c0 1.94.46 3.77 1.27 5.39l4.01-3.1Z"
        />
        <path
          fill="#EA4335"
          d="M12 4.77c1.76 0 3.34.61 4.59 1.8l3.44-3.44C17.95 1.19 15.23 0 12 0A12 12 0 0 0 1.27 6.61l4.01 3.1C6.22 6.88 8.87 4.77 12 4.77Z"
        />
      </svg>
    </span>
  );
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
  const { signIn, isSigningIn } = useAuth();
  useDocumentMeta({ title: 'Pit pass required', noindex: true });

  return (
    <section
      aria-labelledby="pit-pass-title"
      className="relative isolate flex min-h-[60vh] items-center justify-center overflow-hidden px-4 py-16"
    >
      <div aria-hidden="true" className="bg-grid bg-grid-fade absolute inset-0 -z-10" />
      <div className="relative w-full max-w-lg overflow-hidden rounded-xl border border-line bg-card p-6 shadow-card sm:p-10">
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
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
          <Button
            variant="primary"
            size="lg"
            leftIcon={<GoogleMark />}
            loading={isSigningIn}
            loadingText="Opening Google…"
            onClick={() => void signIn()}
          >
            Sign in with Google
          </Button>
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
