import { PageStub } from '@/components/common/PageStub';
import { useDocumentMeta } from '@/lib/seo';

/** STUB (core) — replaced by the content agent in Workflow 2. */
export default function FaqPage() {
  useDocumentMeta({
    title: 'FAQ',
    description: 'Shipping, payments, authenticity and your virtual garage.',
  });

  return (
    <PageStub
      eyebrow="HELP DESK"
      title="FREQUENTLY ASKED QUESTIONS"
      description="Shipping, payments, authenticity and your virtual garage."
    />
  );
}
