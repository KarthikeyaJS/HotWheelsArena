import { PageStub } from '@/components/common/PageStub';
import { useDocumentMeta } from '@/lib/seo';

/** STUB (core) — replaced by the garage agent in Workflow 2. */
export default function GaragePage() {
  useDocumentMeta({
    title: 'My Garage',
    description: 'Your collection, favourites, badges and XP in one place.',
    noindex: true,
  });

  return (
    <PageStub
      eyebrow="COLLECTOR DASHBOARD"
      title="MY GARAGE"
      description="Your collection, favourites, badges and XP in one place."
    />
  );
}
