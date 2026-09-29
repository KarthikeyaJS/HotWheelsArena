import { useParams } from 'react-router-dom';
import { PageStub } from '@/components/common/PageStub';
import { useDocumentMeta } from '@/lib/seo';

/** STUB (core) — replaced by the commerce agent in Workflow 2. */
export default function OrderDetailPage() {
  const { orderId = '' } = useParams<{ orderId: string }>();

  useDocumentMeta({
    title: 'Order details',
    description: 'Items, delivery address and payment details for this order.',
    noindex: true,
  });

  return (
    <PageStub
      eyebrow="ORDER DETAILS"
      title={`ORDER ${orderId.toUpperCase()}`}
      description="Items, delivery address and payment details for this order."
    />
  );
}
