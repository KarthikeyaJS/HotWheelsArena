import { PageStub } from '@/components/common/PageStub';
import { useDocumentMeta } from '@/lib/seo';

/** STUB (core) — replaced by the commerce agent in Workflow 2. */
export default function CartPage() {
  useDocumentMeta({
    title: 'Your Pit Stop',
    description: 'Review your cars before you start the engine.',
    noindex: true,
  });

  return (
    <PageStub
      eyebrow="PIT STOP"
      title="YOUR PIT STOP"
      description="Review your cars before you start the engine."
    />
  );
}
