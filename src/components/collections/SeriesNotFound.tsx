import { ArrowLeft, Layers, Search } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Container } from '@/components/ui/Container';
import { EmptyState } from '@/components/ui/EmptyState';
import { ROUTES } from '@/config/routes';
import { useUiStore } from '@/store/uiStore';

export interface SeriesNotFoundProps {
  slug?: string;
}

/** Friendly panel for an unknown or retired series slug (the page's h1). */
export function SeriesNotFound({ slug }: SeriesNotFoundProps) {
  const openSearch = useUiStore((state) => state.openSearch);
  return (
    <Container className="py-16 lg:py-24">
      <EmptyState
        size="lg"
        icon={<Layers />}
        titleAs="h2"
        title="This series isn’t on the grid"
        description={
          <>
            We couldn’t find a collection called{' '}
            <span className="font-mono text-fg">“{slug ?? 'unknown'}”</span>. It may have been
            retired or the link is mistyped.
          </>
        }
        action={
          <>
            <Button to={ROUTES.collections} leftIcon={<ArrowLeft />}>
              All collections
            </Button>
            <Button variant="secondary" leftIcon={<Search />} onClick={openSearch}>
              Search the garage
            </Button>
          </>
        }
      />
    </Container>
  );
}
