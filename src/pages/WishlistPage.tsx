import { Warehouse } from 'lucide-react';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { WishlistCollection } from '@/components/garage/WishlistCollection';
import { Button } from '@/components/ui/Button';
import { Container } from '@/components/ui/Container';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { garagePath } from '@/config/routes';
import { useDocumentMeta } from '@/lib/seo';

export default function WishlistPage() {
  useDocumentMeta({
    title: 'Wishlist',
    description: 'Cars you have your eye on.',
    noindex: true,
  });

  return (
    <Container className="flex flex-col gap-8 py-10 lg:py-14">
      <SectionHeading
        as="h1"
        eyebrow="On your radar"
        title="Your wishlist"
        description="Cars you have your eye on. Move them to your pit stop when you're ready to race."
        action={
          <Button to={garagePath()} variant="outline" leftIcon={<Warehouse />}>
            My Garage
          </Button>
        }
      />
      <ErrorBoundary label="Your wishlist">
        <WishlistCollection priorityCount={4} />
      </ErrorBoundary>
    </Container>
  );
}
