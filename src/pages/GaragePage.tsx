import { BarChart3, ExternalLink, Heart, Star, Trophy, Warehouse } from 'lucide-react';
import { useCallback, useMemo, useRef, useState } from 'react';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { AchievementsTab } from '@/components/garage/AchievementsTab';
import { AddCarDialog } from '@/components/garage/AddCarDialog';
import { CollectionTab } from '@/components/garage/CollectionTab';
import { FavoritesTab } from '@/components/garage/FavoritesTab';
import { GarageHeader } from '@/components/garage/GarageHeader';
import { GarageStatsStrip } from '@/components/garage/GarageStatsStrip';
import { copiesOf, carName, type GarageCarView } from '@/components/garage/garageModel';
import { RemovalUndoBar } from '@/components/garage/RemovalUndoBar';
import { StatsTab } from '@/components/garage/StatsTab';
import { useGarageDashboard } from '@/components/garage/useGarageDashboard';
import { useGarageTab } from '@/components/garage/useGarageTab';
import { useRemovalQueue } from '@/components/garage/useRemovalQueue';
import { WishlistCollection } from '@/components/garage/WishlistCollection';
import { Button } from '@/components/ui/Button';
import { Container } from '@/components/ui/Container';
import { TabPanel } from '@/components/ui/TabPanel';
import { tabId } from '@/components/ui/tabIds';
import { Tabs, type TabItem } from '@/components/ui/Tabs';
import { ROUTES, type GarageTab } from '@/config/routes';
import { useGarageActions } from '@/hooks/useGarageActions';
import { useDocumentMeta } from '@/lib/seo';
import { useGarageStore } from '@/store/garageStore';
import { toast } from '@/store/toastStore';
import type { Product } from '@/types';

const ID_PREFIX = 'garage';

export default function GaragePage() {
  useDocumentMeta({
    title: 'My Garage',
    description: 'Your collection, favourites, badges and XP in one place.',
    noindex: true,
  });

  const [tab, setTab] = useGarageTab();
  const [addOpen, setAddOpen] = useState(false);
  const panelsRef = useRef<HTMLDivElement>(null);

  const { addToGarage, setQuantity } = useGarageActions();
  const { removeFromGarage } = useGarageActions({ toasts: false });

  // Commits a removal once its undo window closes. Skips cars that already left the garage
  // mirror (removed elsewhere, or the collector signed out meanwhile).
  const commitRemoval = useCallback(
    (productId: string, name: string) => {
      if (!useGarageStore.getState().garage[productId]) return;
      removeFromGarage({ id: productId, name });
    },
    [removeFromGarage],
  );
  const removal = useRemovalQueue(commitRemoval);
  const dashboard = useGarageDashboard(removal.pendingIds);
  const { requestRemoval, undo, pendingIds } = removal;

  const ownedCopies = useMemo(
    () => new Map(dashboard.cars.map((car) => [car.entry.productId, copiesOf(car)])),
    [dashboard.cars],
  );

  const handleRemove = useCallback(
    (car: GarageCarView) => requestRemoval({ productId: car.entry.productId, name: carName(car) }),
    [requestRemoval],
  );

  const handleAdd = useCallback(
    (product: Product) => {
      if (pendingIds.has(product.id)) {
        undo(product.id);
        toast.success('Back in your garage', product.name);
        return;
      }
      addToGarage(product);
    },
    [addToGarage, pendingIds, undo],
  );

  const handleAddCopy = useCallback(
    (product: Product, copies: number) => {
      setQuantity(product, copies);
      toast.success('Copy logged', `${product.name} ×${copies}`);
    },
    [setQuantity],
  );

  const openAddCar = useCallback(() => setAddOpen(true), []);
  // Empty-state CTA on another tab: that button unmounts with its panel, so keep keyboard focus
  // on the tab strip (the COLLECTION tab) instead of dropping it to <body>.
  const showCollection = useCallback(() => {
    setTab('collection');
    document.getElementById(tabId(ID_PREFIX, 'collection'))?.focus();
  }, [setTab]);
  const { stats, profile } = dashboard;

  const tabItems = useMemo<ReadonlyArray<TabItem<GarageTab>>>(
    () => [
      { id: 'collection', label: 'Collection', icon: <Warehouse />, badge: stats.uniqueCars },
      { id: 'wishlist', label: 'Wishlist', icon: <Heart />, badge: stats.wishlist },
      { id: 'favorites', label: 'Favorites', icon: <Star />, badge: stats.favorites },
      {
        id: 'achievements',
        label: 'Achievements',
        icon: <Trophy />,
        badge: profile?.badges.length ?? 0,
      },
      { id: 'stats', label: 'Stats', icon: <BarChart3 /> },
    ],
    [stats.uniqueCars, stats.wishlist, stats.favorites, profile?.badges.length],
  );

  const renderPanel = (id: GarageTab) => {
    switch (id) {
      case 'collection':
        return (
          <CollectionTab
            dashboard={dashboard}
            onRemove={handleRemove}
            onAddCar={openAddCar}
            onHaveIt={handleAdd}
          />
        );
      case 'wishlist':
        return (
          <section aria-labelledby="garage-wishlist-title" className="flex flex-col gap-5">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <h2
                id="garage-wishlist-title"
                className="font-display text-lg font-bold uppercase tracking-display text-fg"
              >
                On your radar
              </h2>
              <Button variant="link" size="sm" to={ROUTES.wishlist} rightIcon={<ExternalLink />}>
                Open wishlist page
              </Button>
            </div>
            <WishlistCollection />
          </section>
        );
      case 'favorites':
        return (
          <FavoritesTab
            dashboard={dashboard}
            onRemove={handleRemove}
            onShowCollection={showCollection}
          />
        );
      case 'achievements':
        return <AchievementsTab profile={profile} isLoading={dashboard.profileLoading} />;
      default:
        return <StatsTab dashboard={dashboard} />;
    }
  };

  return (
    <>
      <GarageHeader
        displayName={dashboard.displayName}
        photoURL={dashboard.photoURL}
        xp={profile?.xp ?? 0}
        memberSince={profile?.createdAt ?? null}
        stats={stats}
        profileLoading={dashboard.profileLoading}
        statsLoading={dashboard.isLoading}
        onAddCar={openAddCar}
      />

      <Container className="flex flex-col gap-8 py-8 lg:py-10">
        <GarageStatsStrip stats={stats} isLoading={dashboard.isLoading} />

        <div className="flex flex-col gap-6">
          <Tabs
            items={tabItems}
            value={tab}
            onChange={setTab}
            label="Garage sections"
            idPrefix={ID_PREFIX}
          />
          <div ref={panelsRef} tabIndex={-1} className="relative rounded-md focus:outline-none">
            {tabItems.map((item) => (
              <TabPanel key={item.id} idPrefix={ID_PREFIX} tabId={item.id} active={tab === item.id}>
                <ErrorBoundary
                  label={typeof item.label === 'string' ? item.label : 'Garage'}
                  resetKeys={[tab]}
                >
                  {tab === item.id ? renderPanel(item.id) : null}
                </ErrorBoundary>
              </TabPanel>
            ))}
            <RemovalUndoBar
              pending={removal.pending}
              onUndo={removal.undo}
              onDismiss={removal.commitNow}
              fallbackFocusRef={panelsRef}
              className="mt-6"
            />
          </div>
        </div>
      </Container>

      <AddCarDialog
        open={addOpen}
        onClose={() => setAddOpen(false)}
        catalogue={dashboard.catalogue}
        isLoading={dashboard.catalogueLoading}
        error={dashboard.catalogueError}
        onRetry={dashboard.refetchCatalogue}
        ownedCopies={ownedCopies}
        onAdd={handleAdd}
        onAddCopy={handleAddCopy}
      />
    </>
  );
}
