import { PageStub } from '@/components/common/PageStub';
import { useDocumentMeta } from '@/lib/seo';

/** STUB (core) — replaced by the content agent in Workflow 2. */
export default function AboutPage() {
  useDocumentMeta({
    title: 'About',
    description: 'An independent store built by collectors, for collectors.',
  });

  return (
    <PageStub
      eyebrow="ABOUT THE ARENA"
      title="ABOUT US"
      description="An independent store built by collectors, for collectors."
    />
  );
}
