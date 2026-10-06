/**
 * SEO helpers for the product detail page (pure): page title, meta description, social image
 * and the schema.org Product / BreadcrumbList JSON-LD.
 */
import { BRAND_NAME, BRAND_PRODUCT_LINE } from '@/config/brand';
import { ROUTES, productPath, shopPath } from '@/config/routes';
import { absoluteUrl, getCategoryDisplay } from '@/config/site';
import { productImageUrl } from '@/lib/cloudinary';
import { formatCollectionNumber, formatINR } from '@/lib/format';
import { isSoldOut, primaryImageOf } from '@/lib/product';
import { buildProductJsonLd, truncateDescription, type JsonLd } from '@/lib/seo';
import type { Product } from '@/types';

/** Social card size (Open Graph recommended 1.91:1). */
export const PRODUCT_OG_IMAGE_SIZE = { w: 1200, h: 630 } as const;

/** `<name> — <series>` (the brand suffix is added by `useDocumentMeta`). */
export function productPageTitle(product: Pick<Product, 'name' | 'seriesName'>): string {
  const series = product.seriesName.trim();
  return series ? `${product.name} — ${series}` : product.name;
}

/** Generated copy for products without an editorial description. */
export function generatedProductDescription(product: Product): string {
  const type = product.vehicleType ? ` ${product.vehicleType.toLowerCase()}` : '';
  const series = product.seriesName ? ` from the ${product.seriesName} ${product.year} series` : '';
  const availability = isSoldOut(product.stock)
    ? 'Currently sold out'
    : `${formatINR(product.price)} incl. GST`;
  return `${product.name}: a ${product.scale} ${BRAND_PRODUCT_LINE}${type}${series} in ${product.color.toLowerCase()}, collection ${formatCollectionNumber(product.collectionNumber)}. ${availability} at ${BRAND_NAME}.`;
}

/** The editorial description, or generated copy when it is empty. */
export function productDescription(product: Product): string {
  const editorial = product.description.trim();
  return editorial || generatedProductDescription(product);
}

/** Absolute URL of the primary image, sized for social cards. */
export function productOgImage(product: Product): string {
  return absoluteUrl(productImageUrl(primaryImageOf(product), PRODUCT_OG_IMAGE_SIZE));
}

/**
 * schema.org Product: name, image, description, sku (= id), brand (= the die-cast product line,
 * `BRAND_PRODUCT_LINE` — we sell the toy, not the real car), model (= "<make> <model>" of the real
 * car, omitted when both are empty), offers (price, INR, InStock / OutOfStock, url) and
 * aggregateRating when the car has ratings. Builds on the shared `buildProductJsonLd` (keeping its
 * brand) and overrides the description with the generated fallback copy.
 */
export function buildProductDetailJsonLd(product: Product): JsonLd {
  const base = buildProductJsonLd(product);
  const model = [product.make, product.model]
    .map((part) => part.trim())
    .filter(Boolean)
    .join(' ');
  return {
    ...base,
    description: truncateDescription(productDescription(product), 300),
    ...(model ? { model } : {}),
  };
}

export interface ProductCrumb {
  /** Visible label. */
  name: string;
  /** Internal path (omitted for the current page). */
  path: string;
}

/** Shop › Category › Name (the last crumb is the current page). */
export function productBreadcrumbs(
  product: Pick<Product, 'name' | 'slug' | 'category'>,
): ProductCrumb[] {
  const category = getCategoryDisplay(product.category);
  const crumbs: ProductCrumb[] = [{ name: 'Shop', path: ROUTES.shop }];
  if (category) crumbs.push({ name: category.name, path: shopPath({ category: category.slug }) });
  crumbs.push({ name: product.name, path: productPath(product.slug) });
  return crumbs;
}
