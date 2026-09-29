import { useParams } from 'react-router-dom';
import { PageStub } from '@/components/common/PageStub';
import { useDocumentMeta } from '@/lib/seo';

/** STUB (core) — replaced by the content agent in Workflow 2. */
export default function SeriesPage() {
  const { slug = '' } = useParams<{ slug: string }>();

  useDocumentMeta({
    title: 'Series',
    description: 'Every car in this series — track what you own and what is missing.',
  });

  return (
    <PageStub
      eyebrow="SERIES"
      title={`SERIES ${slug.toUpperCase()}`}
      description="Every car in this series — track what you own and what is missing."
    />
  );
}
