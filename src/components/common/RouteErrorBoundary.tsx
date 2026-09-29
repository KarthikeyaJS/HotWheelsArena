import { Home, RotateCcw } from 'lucide-react';
import { useEffect } from 'react';
import { isRouteErrorResponse, useRouteError } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { ROUTES } from '@/config/routes';
import { getFriendlyErrorMessage, isChunkLoadError } from '@/lib/errors';
import { useDocumentMeta } from '@/lib/seo';

/**
 * react-router `errorElement` for every route. Renders inside the layout for page errors and
 * standalone for root errors. Handles 404 responses, stale-deploy chunk failures and crashes.
 */
export function RouteErrorBoundary() {
  const error = useRouteError();
  const isNotFound = isRouteErrorResponse(error) && error.status === 404;
  const isStaleBuild = isChunkLoadError(error);

  useDocumentMeta({ title: isNotFound ? 'Wrong turn' : 'Engine trouble', noindex: true });

  useEffect(() => {
    if (!isNotFound) console.error('[route error]', error);
  }, [error, isNotFound]);

  const title = isNotFound
    ? 'WRONG TURN'
    : isStaleBuild
      ? 'NEW BUILD ON THE GRID'
      : 'ENGINE TROUBLE';
  const message = isNotFound
    ? "This road doesn't lead anywhere. Let's get you back to the garage."
    : isStaleBuild
      ? 'A fresh version of the garage was just deployed. Reload to jump back in.'
      : getFriendlyErrorMessage(error);

  return (
    <section
      aria-labelledby="route-error-title"
      className="relative isolate flex min-h-[60vh] w-full items-center justify-center overflow-hidden bg-bg px-4 py-20 text-fg"
    >
      <div aria-hidden="true" className="bg-grid bg-grid-fade absolute inset-0 -z-10" />
      <div className="mx-auto flex max-w-xl flex-col items-center text-center">
        <p className="eyebrow">
          {isNotFound ? 'ERROR 404 · OFF TRACK' : 'PIT LANE · SYSTEM ALERT'}
        </p>
        <h1 id="route-error-title" className="mt-4 text-3xl text-fg sm:text-4xl">
          {title}
        </h1>
        <p className="mt-4 text-muted">{message}</p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          {isNotFound ? null : (
            <Button
              variant="primary"
              leftIcon={<RotateCcw />}
              onClick={() => window.location.reload()}
            >
              Reload page
            </Button>
          )}
          <Button
            variant={isNotFound ? 'primary' : 'secondary'}
            to={ROUTES.home}
            leftIcon={<Home />}
          >
            Back to the garage
          </Button>
        </div>
      </div>
    </section>
  );
}
