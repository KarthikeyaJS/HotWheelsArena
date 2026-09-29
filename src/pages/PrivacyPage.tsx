import { PageStub } from '@/components/common/PageStub';
import { useDocumentMeta } from '@/lib/seo';

/** STUB (core) — replaced by the content agent in Workflow 2. */
export default function PrivacyPage() {
  useDocumentMeta({
    title: 'Privacy Policy',
    description: 'What we collect, why, and how we protect it.',
  });

  return (
    <PageStub
      eyebrow="LEGAL"
      title="PRIVACY POLICY"
      description="What we collect, why, and how we protect it."
    />
  );
}
