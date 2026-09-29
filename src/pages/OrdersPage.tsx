import { PageStub } from '@/components/common/PageStub';
import { useDocumentMeta } from '@/lib/seo';

/** STUB (core) — replaced by the commerce agent in Workflow 2. */
export default function OrdersPage() {
  useDocumentMeta({
    title: 'Your orders',
    description: 'Every order you have placed, newest first.',
    noindex: true,
  });

  return (
    <PageStub
      eyebrow="RACE HISTORY"
      title="YOUR ORDERS"
      description="Every order you have placed, newest first."
    />
  );
}
