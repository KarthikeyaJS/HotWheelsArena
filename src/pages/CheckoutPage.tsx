import { PageStub } from '@/components/common/PageStub';
import { useDocumentMeta } from '@/lib/seo';

/** STUB (core) — replaced by the commerce agent in Workflow 2. */
export default function CheckoutPage() {
  useDocumentMeta({
    title: 'Checkout',
    description: 'Address, payment and review — three laps to the finish line.',
    noindex: true,
  });

  return (
    <PageStub
      eyebrow="CHECKOUT · TEST MODE"
      title="CHECKOUT"
      description="Address, payment and review — three laps to the finish line."
    />
  );
}
