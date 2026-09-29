import { PageStub } from '@/components/common/PageStub';
import { useDocumentMeta } from '@/lib/seo';

/** STUB (core) — replaced by the shop agent in Workflow 2. */
export default function ShopPage() {
  useDocumentMeta({
    title: 'Shop',
    description: 'Browse every die-cast machine — filter by make, series, rarity and price.',
  });

  return (
    <PageStub
      eyebrow="THE GARAGE · ALL CARS"
      title="SHOP THE GARAGE"
      description="Browse every die-cast machine — filter by make, series, rarity and price."
    />
  );
}
