import { PageStub } from '@/components/common/PageStub';
import { BRAND_DESCRIPTION, BRAND_HERO_TITLE, BRAND_TAGLINE } from '@/config/brand';
import { useDocumentMeta } from '@/lib/seo';

/** STUB (core) — replaced by the home agent in Workflow 2. */
export default function HomePage() {
  useDocumentMeta({ description: BRAND_DESCRIPTION });

  return (
    <PageStub
      eyebrow="DIGITAL GARAGE · RPM 8,200"
      title={`${BRAND_HERO_TITLE} — ${BRAND_TAGLINE}`}
      description={BRAND_DESCRIPTION}
    />
  );
}
