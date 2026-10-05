import { ProductCardSkeleton } from '@/components/product/ProductCardSkeleton';
import { Container } from '@/components/ui/Container';
import { Skeleton } from '@/components/ui/Skeleton';

/** Loading layout for /collections/:slug (header, progress panel and car grid). */
export function SeriesPageSkeleton() {
  return (
    <div role="status" aria-busy="true">
      <span className="sr-only">Loading series…</span>
      <div aria-hidden="true" className="border-b border-line">
        <Container className="pb-8 pt-6 sm:pt-8 lg:pb-12 lg:pt-10">
          <Skeleton variant="text" className="w-48" />
          <div className="mt-8 grid gap-8 lg:grid-cols-12 lg:items-end">
            <div className="flex flex-col gap-4 lg:col-span-7">
              <Skeleton variant="text" className="w-40" />
              <Skeleton className="h-12 w-3/4 rounded-md" />
              <Skeleton variant="text" lines={2} className="max-w-xl" />
            </div>
            <Skeleton className="h-32 rounded-md lg:col-span-5" />
          </div>
        </Container>
      </div>
      <Container aria-hidden="true" className="flex flex-col gap-10 py-10 lg:py-14">
        <Skeleton className="h-36 rounded-2xl" />
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 4 }, (_, index) => (
            <ProductCardSkeleton key={index} />
          ))}
        </div>
      </Container>
    </div>
  );
}
