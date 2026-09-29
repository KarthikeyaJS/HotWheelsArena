import { PageStub } from '@/components/common/PageStub';
import { useDocumentMeta } from '@/lib/seo';

/** STUB (core) — replaced by the content agent in Workflow 2. */
export default function CollectionsPage() {
  useDocumentMeta({
    title: 'Collections',
    description: 'Every series in the garage, from HW Exotics to HW Legends.',
  });

  return (
    <PageStub
      eyebrow="SERIES & SETS"
      title="COLLECTIONS"
      description="Every series in the garage, from HW Exotics to HW Legends."
    />
  );
}
