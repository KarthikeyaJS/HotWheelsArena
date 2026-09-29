import { useParams } from 'react-router-dom';
import { PageStub } from '@/components/common/PageStub';
import { useDocumentMeta } from '@/lib/seo';

/** STUB (core) — replaced by the product-detail agent in Workflow 2. */
export default function ProductPage() {
  const { slug = '' } = useParams<{ slug: string }>();

  useDocumentMeta({
    title: 'Car details',
    description: 'Specs, stats, reviews and collector details.',
  });

  return (
    <PageStub
      eyebrow="MEET THE MACHINE"
      title={`CAR ${slug.toUpperCase()}`}
      description="Specs, stats, reviews and collector details."
    />
  );
}
