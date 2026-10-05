import { CircleHelp } from 'lucide-react';
import { useMemo } from 'react';
import { ContentPage } from '@/components/content/ContentPage';
import { SupportCard } from '@/components/content/SupportCard';
import { FaqBoard } from '@/components/content/faq/FaqBoard';
import { buildFaqGroups } from '@/components/content/faq/faqData';
import { ROUTES } from '@/config/routes';
import { useSettings } from '@/hooks/useSiteSettings';
import { buildBreadcrumbJsonLd, useDocumentMeta, useJsonLd, type JsonLd } from '@/lib/seo';

const BREADCRUMBS = [
  { label: 'Home', to: ROUTES.home },
  { label: 'FAQ', to: ROUTES.faq },
] as const;

/** /faq — grouped, deep-linkable WAI-ARIA accordions. */
export default function FaqPage() {
  useDocumentMeta({
    title: 'FAQ',
    description:
      'Answers on delivery times, free shipping, test-mode payments, XP, badges, My Garage, your account and privacy.',
  });

  const settings = useSettings();
  const groups = useMemo(
    () =>
      buildFaqGroups({
        shippingThreshold: settings.shippingThreshold,
        shippingFee: settings.shippingFee,
        codEnabled: settings.codEnabled,
        maxQtyPerItem: settings.maxQtyPerItem,
      }),
    [settings.shippingThreshold, settings.shippingFee, settings.codEnabled, settings.maxQtyPerItem],
  );

  const toc = useMemo(
    () => groups.map((group) => ({ id: group.id, label: group.title })),
    [groups],
  );

  const faqJsonLd = useMemo<JsonLd>(
    () => ({
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: groups.flatMap((group) =>
        group.items.map((item) => ({
          '@type': 'Question',
          name: item.question,
          acceptedAnswer: { '@type': 'Answer', text: item.answer.join(' ') },
        })),
      ),
    }),
    [groups],
  );

  useJsonLd(
    'breadcrumbs',
    buildBreadcrumbJsonLd(BREADCRUMBS.map((crumb) => ({ name: crumb.label, path: crumb.to }))),
  );
  useJsonLd('faq', faqJsonLd);

  return (
    <ContentPage
      breadcrumbs={BREADCRUMBS}
      eyebrow="Pit lane briefing"
      eyebrowIcon={<CircleHelp />}
      title="Frequently asked questions"
      lead="Quick answers from the pit crew — orders and shipping, test-mode payments, XP and badges, and what we do with your data."
      toc={toc}
      headerAside={<SupportCard title="Still stuck?" />}
    >
      <FaqBoard groups={groups} />
    </ContentPage>
  );
}
