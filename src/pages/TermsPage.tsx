import { PageStub } from '@/components/common/PageStub';
import { useDocumentMeta } from '@/lib/seo';

/** STUB (core) — replaced by the content agent in Workflow 2. */
export default function TermsPage() {
  useDocumentMeta({
    title: 'Terms of Service',
    description: 'The rules of the road for using the store.',
  });

  return (
    <PageStub
      eyebrow="LEGAL"
      title="TERMS OF SERVICE"
      description="The rules of the road for using the store."
    />
  );
}
