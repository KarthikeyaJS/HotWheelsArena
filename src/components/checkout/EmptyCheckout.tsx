import { Gem, ShoppingCart } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { ROUTES, shopPath } from '@/config/routes';

/** /checkout with an empty cart: a friendly panel (no redirect, so no loops). */
export function EmptyCheckout() {
  return (
    <EmptyState
      size="lg"
      titleAs="h2"
      icon={<ShoppingCart />}
      title="Nothing to check out yet"
      description="Your pit stop is empty — add a car or two, then come back to start your engine."
      action={
        <>
          <Button to={shopPath()} size="lg">
            Explore the garage
          </Button>
          <Button to={ROUTES.vault} variant="outline" size="lg" leftIcon={<Gem />}>
            Visit the Vault
          </Button>
        </>
      }
    />
  );
}
