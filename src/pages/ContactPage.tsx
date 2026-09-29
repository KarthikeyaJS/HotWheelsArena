import { PageStub } from '@/components/common/PageStub';
import { useDocumentMeta } from '@/lib/seo';

/** STUB (core) — replaced by the content agent in Workflow 2. */
export default function ContactPage() {
  useDocumentMeta({
    title: 'Contact',
    description: 'Questions about an order or a car? The pit crew is here to help.',
  });

  return (
    <PageStub
      eyebrow="PIT CREW"
      title="CONTACT"
      description="Questions about an order or a car? The pit crew is here to help."
    />
  );
}
