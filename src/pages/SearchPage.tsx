import { PageStub } from '@/components/common/PageStub';
import { useDocumentMeta } from '@/lib/seo';

/** STUB (core) — replaced by the shop agent in Workflow 2. */
export default function SearchPage() {
  useDocumentMeta({
    title: 'Search',
    description: 'Find any car by make, model, series or colour.',
  });

  return (
    <PageStub
      eyebrow="SEARCH THE GARAGE"
      title="SEARCH RESULTS"
      description="Find any car by make, model, series or colour."
    />
  );
}
