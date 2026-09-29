import { PageStub } from '@/components/common/PageStub';
import { useDocumentMeta } from '@/lib/seo';

/** STUB (core) — replaced by the garage agent in Workflow 2. */
export default function WishlistPage() {
  useDocumentMeta({
    title: 'Wishlist',
    description: 'Cars you have your eye on.',
    noindex: true,
  });

  return (
    <PageStub eyebrow="WISHLIST" title="YOUR WISHLIST" description="Cars you have your eye on." />
  );
}
