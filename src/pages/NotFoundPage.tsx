import { Home } from 'lucide-react';
import { Link } from 'react-router-dom';
import { PageStub } from '@/components/common/PageStub';
import { useDocumentMeta } from '@/lib/seo';

/** STUB (core) — replaced by the content agent in Workflow 2. */
export default function NotFoundPage() {
  useDocumentMeta({
    title: 'Wrong turn',
    description: "This road doesn't lead anywhere. Head back to the garage.",
    noindex: true,
  });

  return (
    <PageStub
      eyebrow="ERROR 404 · OFF TRACK"
      title="WRONG TURN — BACK TO THE GARAGE"
      description="This road doesn't lead anywhere."
    >
      <Link
        to="/"
        className="inline-flex w-fit items-center gap-2 rounded-md bg-accent px-5 py-3 font-mono text-sm font-bold uppercase tracking-hud text-on-accent transition hover:brightness-110 active:scale-[0.98]"
      >
        <Home aria-hidden="true" className="h-4 w-4" />
        Back to the garage
      </Link>
    </PageStub>
  );
}
