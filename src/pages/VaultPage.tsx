import { ArrowDown, BellRing, Gem, Lock, RotateCcw } from 'lucide-react';
import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { DataState } from '@/components/common/DataState';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { PageHeader } from '@/components/content/PageHeader';
import { useHashScroll } from '@/components/content/useHashScroll';
import { Button } from '@/components/ui/Button';
import { Container } from '@/components/ui/Container';
import { EmptyState } from '@/components/ui/EmptyState';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { EditionExplainer } from '@/components/vault/EditionExplainer';
import { VaultDropAlerts } from '@/components/vault/VaultDropAlerts';
import { VaultGrid } from '@/components/vault/VaultGrid';
import { VaultGridSkeleton } from '@/components/vault/VaultGridSkeleton';
import { VaultStatusPanel } from '@/components/vault/VaultStatusPanel';
import { VaultToolbar } from '@/components/vault/VaultToolbar';
import {
  DEFAULT_VAULT_FILTER,
  DEFAULT_VAULT_SORT,
  filterVaultProducts,
  parseVaultFilter,
  parseVaultSort,
  sortVaultProducts,
  vaultCounts,
  vaultSummary,
  type VaultFilter,
  type VaultSort,
} from '@/components/vault/vaultFilters';
import { ROUTES } from '@/config/routes';
import { productSelectors, useProducts } from '@/hooks/useProducts';
import { buildBreadcrumbJsonLd, useDocumentMeta, useJsonLd } from '@/lib/seo';

const BREADCRUMBS = [
  { label: 'Home', to: ROUTES.home },
  { label: 'The Vault', to: ROUTES.vault },
] as const;

const EDITIONS_ID = 'vault-editions';
const EXPLAINER_ID = 'how-editions-work';
const ALERTS_ID = 'drop-alerts';

/** /vault — numbered limited editions: filter, sort by remaining, explainer and drop alerts. */
export default function VaultPage() {
  useDocumentMeta({
    title: 'The Vault — Limited Editions',
    description:
      'Numbered limited-edition die-cast cars with fixed run sizes like #001/500. See how many remain, how editions work and get drop alerts — once they are gone, they are gone.',
  });
  useJsonLd(
    'breadcrumbs',
    buildBreadcrumbJsonLd(BREADCRUMBS.map((crumb) => ({ name: crumb.label, path: crumb.to }))),
  );

  const vaultQuery = useProducts(productSelectors.vault);
  const vault = vaultQuery.data;
  // `#drop-alerts` / `#how-editions-work` deep links: scroll once the grid has its final height.
  useHashScroll(!vaultQuery.isPending);
  const [params, setParams] = useSearchParams();
  const filter = parseVaultFilter(params.get('filter'));
  const sort = parseVaultSort(params.get('sort'));

  const updateParam = useCallback(
    (key: 'filter' | 'sort', value: VaultFilter | VaultSort, fallback: string) => {
      setParams(
        (previous) => {
          const next = new URLSearchParams(previous);
          if (value === fallback) next.delete(key);
          else next.set(key, value);
          return next;
        },
        { replace: true, preventScrollReset: true },
      );
    },
    [setParams],
  );

  const counts = useMemo(() => (vault ? vaultCounts(vault) : null), [vault]);
  const summary = useMemo(() => (vault ? vaultSummary(vault) : null), [vault]);
  const visible = useMemo(
    () => (vault ? sortVaultProducts(filterVaultProducts(vault, filter), sort) : []),
    [vault, filter, sort],
  );
  const example = useMemo(
    () =>
      vault
        ? (sortVaultProducts(vault, 'remaining-asc').find((p) => p.limitedEdition) ?? null)
        : null,
    [vault],
  );

  const showAll = () => updateParam('filter', DEFAULT_VAULT_FILTER, DEFAULT_VAULT_FILTER);
  const vaultEmpty = (vault?.length ?? 0) === 0;

  const emptyFiltered =
    filter === 'sold-out' ? (
      <EmptyState
        icon={<Lock />}
        title="No sold-out editions — yet"
        description="Every numbered run in the vault still has cars left. Grab yours before the counter hits zero."
        titleAs="h3"
        action={
          <Button variant="secondary" leftIcon={<RotateCcw />} onClick={showAll}>
            Show all editions
          </Button>
        }
      />
    ) : (
      <EmptyState
        icon={<Gem />}
        title="Every edition is claimed"
        description="All current runs have sold out. Join drop alerts to hear about the next one first."
        titleAs="h3"
        action={
          <>
            <Button variant="secondary" leftIcon={<RotateCcw />} onClick={showAll}>
              Show all editions
            </Button>
            <Button to={{ hash: ALERTS_ID }} leftIcon={<BellRing />}>
              Get drop alerts
            </Button>
          </>
        }
      />
    );

  return (
    <>
      <PageHeader
        tone="highlight"
        breadcrumbs={BREADCRUMBS}
        eyebrow="Rare · Limited · Numbered"
        eyebrowIcon={<Gem />}
        title="The Collector’s Vault"
        lead="Numbered limited editions and rare finds. Every run has a fixed size and a printed edition number — once a run is gone, it is gone."
        meta={
          <div className="flex flex-wrap gap-3">
            <Button to={{ hash: EDITIONS_ID }} rightIcon={<ArrowDown />}>
              Browse editions
            </Button>
            <Button to={{ hash: ALERTS_ID }} variant="secondary" leftIcon={<BellRing />}>
              Get drop alerts
            </Button>
          </div>
        }
        aside={<VaultStatusPanel summary={summary} isLoading={vaultQuery.isPending} />}
      />

      <Container className="flex flex-col gap-16 py-10 lg:gap-24 lg:py-16">
        <section id={EDITIONS_ID} aria-labelledby={`${EDITIONS_ID}-title`}>
          <SectionHeading
            id={`${EDITIONS_ID}-title`}
            eyebrow="In the display case"
            title="Numbered editions"
            description="Sorted by how many cars are left in each run. Counts are static figures from our stock sheet."
            className="mb-8"
          />
          <ErrorBoundary label="The vault" resetKeys={[filter, sort]}>
            <VaultToolbar
              filter={filter}
              sort={sort}
              counts={counts}
              resultCount={vault ? visible.length : null}
              onFilterChange={(next) => updateParam('filter', next, DEFAULT_VAULT_FILTER)}
              onSortChange={(next) => updateParam('sort', next, DEFAULT_VAULT_SORT)}
              className="mb-6"
            />
            <DataState
              isLoading={vaultQuery.isPending}
              isError={vaultQuery.isError && !vault}
              error={vaultQuery.error}
              onRetry={() => void vaultQuery.refetch()}
              errorTitle="VAULT DOOR JAMMED"
              isEmpty={vaultEmpty || visible.length === 0}
              loadingLabel="Opening the vault…"
              skeleton={<VaultGridSkeleton />}
              empty={
                vaultEmpty ? (
                  <EmptyState
                    icon={<Lock />}
                    title="The vault is sealed"
                    description="No numbered editions are on display right now. Join drop alerts and we’ll tell you when the next run opens."
                    titleAs="h3"
                    action={
                      <Button to={{ hash: ALERTS_ID }} leftIcon={<BellRing />}>
                        Get drop alerts
                      </Button>
                    }
                  />
                ) : (
                  emptyFiltered
                )
              }
            >
              {() => <VaultGrid products={visible} label="Vault editions" priorityCount={3} />}
            </DataState>
          </ErrorBoundary>
        </section>

        <section id={EXPLAINER_ID} aria-labelledby={`${EXPLAINER_ID}-title`}>
          <SectionHeading
            id={`${EXPLAINER_ID}-title`}
            eyebrow="Collector’s brief"
            title="How editions work"
            description="What the numbers on a vault card mean — and what they don’t."
            className="mb-8"
          />
          <EditionExplainer example={example} headingId={`${EXPLAINER_ID}-title`} />
        </section>

        <section id={ALERTS_ID} aria-labelledby={`${ALERTS_ID}-title`}>
          <VaultDropAlerts headingId={`${ALERTS_ID}-title`} />
        </section>
      </Container>
    </>
  );
}
