import { ArrowRight, Gem } from 'lucide-react';
import { useMemo } from 'react';
import { DataState } from '@/components/common/DataState';
import { VaultCard } from '@/components/product/VaultCard';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { Skeleton } from '@/components/ui/Skeleton';
import { ROUTES } from '@/config/routes';
import { productSelectors, useProducts } from '@/hooks/useProducts';
import { HomeSection } from './HomeSection';
import { HOME_SECTION_IDS, sectionHeadingId } from './homeSections';
import { pickVaultLineup } from './vaultLineup';

function VaultSkeleton() {
  return (
    <div className="flex flex-col gap-6" aria-hidden="true">
      <div className="grid gap-6 rounded-2xl border border-line bg-card p-5 md:grid-cols-2 md:p-8">
        <Skeleton className="aspect-[16/10] w-full rounded-xl" />
        <div className="flex flex-col gap-4">
          <Skeleton className="h-6 w-40 rounded-sm" />
          <Skeleton className="h-9 w-3/4 rounded-sm" />
          <Skeleton variant="text" lines={2} />
          <Skeleton className="mt-auto h-3 w-full rounded-full" />
        </div>
      </div>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2].map((index) => (
          <div
            key={index}
            className="flex flex-col gap-4 rounded-2xl border border-line bg-card p-5"
          >
            <Skeleton className="aspect-[16/10] w-full rounded-xl" />
            <Skeleton className="h-6 w-2/3 rounded-sm" />
            <Skeleton className="h-3 w-full rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * THE COLLECTOR'S VAULT — numbered limited editions as large display-case cards (yellow is the
 * rare accent, used only on the cards). "Only N remaining" comes from the static product stock.
 */
export function VaultSection() {
  const vault = useProducts(productSelectors.vault);
  const lineup = useMemo(() => pickVaultLineup(vault.data ?? []), [vault.data]);
  const headingId = sectionHeadingId(HOME_SECTION_IDS.vault);

  return (
    <HomeSection
      id={HOME_SECTION_IDS.vault}
      decoration={
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
        >
          <div className="absolute left-1/2 top-0 h-[28rem] w-[min(64rem,120%)] -translate-x-1/2 bg-[radial-gradient(ellipse_at_top,rgb(var(--highlight)/0.07),transparent_70%)]" />
        </div>
      }
    >
      <SectionHeading
        id={headingId}
        index={5}
        eyebrow="Rare · numbered · limited"
        title="The collector's vault"
        description="Numbered editions behind glass. When the counter hits zero, the edition is closed for good."
        action={
          <Button variant="outline" to={ROUTES.vault} rightIcon={<ArrowRight />}>
            Enter the Vault
          </Button>
        }
      />
      <div className="mt-8 lg:mt-10">
        <DataState
          isLoading={vault.isLoading}
          isError={vault.isError}
          error={vault.error}
          onRetry={() => void vault.refetch()}
          errorTitle="Vault door jammed"
          errorCompact
          isEmpty={lineup.lead === null}
          skeleton={<VaultSkeleton />}
          loadingLabel="Unlocking the vault…"
          empty={
            <EmptyState
              icon={<Gem />}
              title="The vault is sealed"
              description="No numbered editions are on display right now. The next drop will be announced to the pit crew first."
            />
          }
        >
          {() => (
            <div className="flex flex-col gap-6">
              {lineup.lead ? <VaultCard product={lineup.lead} layout="horizontal" /> : null}
              {lineup.rest.length > 0 ? (
                <ul
                  className="grid gap-6 md:grid-cols-2 lg:grid-cols-3"
                  aria-label="More vault editions"
                >
                  {lineup.rest.map((product) => (
                    <li key={product.id} className="min-w-0">
                      <VaultCard product={product} className="h-full" />
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          )}
        </DataState>
      </div>
    </HomeSection>
  );
}
