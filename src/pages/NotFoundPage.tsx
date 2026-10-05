import { ArrowRight, Car, Gem, Home, Layers, Search, Sparkles, Warehouse } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { WrongTurnScene } from '@/components/content/notfound/WrongTurnScene';
import { PALETTE_HOTKEY } from '@/components/search/CommandPalette';
import { Button } from '@/components/ui/Button';
import { Container } from '@/components/ui/Container';
import { Kbd } from '@/components/ui/Kbd';
import { ROUTES, garagePath, shopPath } from '@/config/routes';
import { hotkeyAria, hotkeyLabels } from '@/hooks/useHotkey';
import { useDocumentMeta } from '@/lib/seo';
import { useUiStore } from '@/store/uiStore';

const POPULAR_LINKS = [
  {
    id: 'shop',
    to: shopPath(),
    icon: Car,
    title: 'Shop all cars',
    description: 'Every casting in the garage',
  },
  {
    id: 'vault',
    to: ROUTES.vault,
    icon: Gem,
    title: 'The Vault',
    description: 'Numbered limited editions',
  },
  {
    id: 'new-drops',
    to: shopPath({ view: 'new' }),
    icon: Sparkles,
    title: 'New drops',
    description: 'Just off the track',
  },
  {
    id: 'my-garage',
    to: garagePath(),
    icon: Warehouse,
    title: 'My Garage',
    description: 'Your collection, XP & badges',
  },
  {
    id: 'collections',
    to: ROUTES.collections,
    icon: Layers,
    title: 'Collections',
    description: 'Series & sets to complete',
  },
] as const;

/** 404 — "Wrong turn — back to the garage": skid-mark scene, search, popular links. noindex. */
export default function NotFoundPage() {
  useDocumentMeta({
    title: 'Wrong turn',
    description: "This road doesn't lead anywhere. Head back to the garage.",
    noindex: true,
  });

  const { pathname } = useLocation();
  const openSearch = useUiStore((state) => state.openSearch);
  const keys = hotkeyLabels(PALETTE_HOTKEY);

  return (
    <section
      aria-labelledby="not-found-title"
      className="relative isolate overflow-hidden border-b border-line"
    >
      <div aria-hidden="true" className="bg-grid bg-grid-fade absolute inset-0 -z-10 opacity-70" />
      <div
        aria-hidden="true"
        className="absolute -left-32 top-10 -z-10 h-80 w-80 rounded-full bg-accent/10 blur-3xl"
      />

      <Container className="grid gap-10 py-14 lg:grid-cols-12 lg:items-center lg:gap-12 lg:py-20">
        <div className="min-w-0 lg:col-span-7">
          <p className="eyebrow flex items-center gap-3">
            <span aria-hidden="true" className="flex items-center gap-1">
              <span className="h-0.5 w-6 bg-accent" />
              <span className="h-0.5 w-1.5 bg-accent/60" />
            </span>
            Error 404 · off track
          </p>
          <h1
            id="not-found-title"
            className="mt-4 text-[clamp(1.75rem,8vw,2.25rem)] text-fg sm:text-5xl xl:text-6xl"
          >
            <span className="sm:whitespace-nowrap">Wrong turn —</span>{' '}
            <span className="sm:block">back to the garage</span>
          </h1>
          <p className="mt-5 max-w-xl text-base text-muted sm:text-lg">
            This road doesn’t lead anywhere. The page may have moved, been retired, or the link took
            a corner too fast.
          </p>
          <p className="hud mt-5 flex min-w-0 flex-wrap items-center gap-2 text-muted">
            <span>Route</span>
            <code className="max-w-full truncate rounded border border-line bg-card px-2 py-1 text-fg">
              {pathname}
            </code>
            <span className="text-danger-ink">not found</span>
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button to={ROUTES.home} size="lg" leftIcon={<Home />}>
              Back to the garage
            </Button>
            <Button
              variant="secondary"
              size="lg"
              leftIcon={<Search />}
              onClick={openSearch}
              aria-haspopup="dialog"
              aria-keyshortcuts={hotkeyAria(PALETTE_HOTKEY)}
            >
              Search the garage
              <span aria-hidden="true" className="ml-1 hidden items-center gap-1 sm:inline-flex">
                {keys.map((key) => (
                  <Kbd key={key}>{key}</Kbd>
                ))}
              </span>
            </Button>
          </div>
        </div>
        <div className="min-w-0 lg:col-span-5">
          <WrongTurnScene />
        </div>
      </Container>

      <Container className="pb-16 lg:pb-24">
        <h2 className="hud text-muted">Popular pit stops</h2>
        <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {POPULAR_LINKS.map((link) => (
            <li key={link.id}>
              <Link
                to={link.to}
                className="group relative flex h-full items-center gap-3 overflow-hidden rounded-xl border border-line bg-card p-4 shadow-card transition-colors duration-200 hover:bg-card-hover active:scale-[0.99] lg:flex-col lg:items-start"
              >
                <span aria-hidden="true" className="racing-stripe" />
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
                  className="h-4 w-4 shrink-0 text-muted transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-accent-ink lg:hidden"
                />
              </Link>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}
