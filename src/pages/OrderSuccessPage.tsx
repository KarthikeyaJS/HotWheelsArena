import { useParams } from 'react-router-dom';
import { PageStub } from '@/components/common/PageStub';
import { useDocumentMeta } from '@/lib/seo';

/** STUB (core) — replaced by the commerce agent in Workflow 2. */
export default function OrderSuccessPage() {
  const { orderId = '' } = useParams<{ orderId: string }>();

  useDocumentMeta({
    title: 'Order confirmed',
    description: 'Your order is in. XP and badges are on their way to your garage.',
    noindex: true,
  });

  return (
    <PageStub
      eyebrow="CHECKERED FLAG"
      title={`ORDER ${orderId.toUpperCase()}`}
      description="Your order is in. XP and badges are on their way to your garage."
    />
  );
}
