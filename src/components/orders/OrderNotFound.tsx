import { ClipboardList, SearchX } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { ROUTES, shopPath } from '@/config/routes';

/** Missing order, or one that belongs to another collector (permission denied looks the same). */
export function OrderNotFound() {
  return (
    <EmptyState
      size="lg"
      titleAs="h2"
      icon={<SearchX />}
      title="Order not found"
      description="We couldn't find that order in your race history. It may belong to another account, or the link is mistyped."
      action={
        <>
          <Button to={ROUTES.orders} leftIcon={<ClipboardList />}>
            Your orders
          </Button>
          <Button to={shopPath()} variant="outline">
            Back to the garage
          </Button>
        </>
      }
    />
  );
}
