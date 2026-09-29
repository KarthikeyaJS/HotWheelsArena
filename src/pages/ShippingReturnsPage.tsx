import { PageStub } from '@/components/common/PageStub';
import { useDocumentMeta } from '@/lib/seo';

/** STUB (core) — replaced by the content agent in Workflow 2. */
export default function ShippingReturnsPage() {
  useDocumentMeta({
    title: 'Shipping & Returns',
    description: 'How we pack, ship and handle returns across India.',
  });

  return (
    <PageStub
      eyebrow="LOGISTICS"
      title="SHIPPING & RETURNS"
      description="How we pack, ship and handle returns across India."
    />
  );
}
