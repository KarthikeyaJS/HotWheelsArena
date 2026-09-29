import { PageStub } from '@/components/common/PageStub';
import { useDocumentMeta } from '@/lib/seo';

/** STUB (core) — replaced by the content agent in Workflow 2. */
export default function VaultPage() {
  useDocumentMeta({
    title: 'The Vault',
    description: 'Numbered limited editions and rare finds — once they are gone, they are gone.',
  });

  return (
    <PageStub
      eyebrow="RARE · LIMITED · NUMBERED"
      title="THE COLLECTOR'S VAULT"
      description="Numbered limited editions and rare finds — once they are gone, they are gone."
    />
  );
}
