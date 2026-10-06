/**
 * Document metadata for the SPA: `<title>`, description, Open Graph / Twitter tags, canonical
 * and robots — plus JSON-LD structured data. Every page calls `useDocumentMeta` once.
 */
import { useEffect } from 'react';
import {
  BRAND_NAME,
  BRAND_PRODUCT_LINE,
  CURRENCY,
  DEFAULT_TITLE,
  SOCIAL_LINKS,
  SUPPORT_EMAIL,
} from '@/config/brand';
import { productPath } from '@/config/routes';
import { DEFAULT_META, absoluteUrl } from '@/config/site';
import type { Product } from '@/types';
import { productImageUrl } from './cloudinary';
import { primaryImageOf } from './product';

export interface DocumentMeta {
  /** Page title without the brand suffix, e.g. `Shop`. Omit for the default site title. */
  title?: string;
  /** ~155 chars; longer text is truncated at a word boundary. */
  description?: string;
  /** Absolute or site-relative image URL for social cards. */
  image?: string;
  /** Canonical path or URL. Defaults to the current pathname (no query string). */
  canonical?: string;
  /** Adds `noindex, nofollow` (checkout, orders, garage, 404…). */
  noindex?: boolean;
  /** Open Graph type (default `website`). */
  type?: 'website' | 'product' | 'article';
}

export type JsonLd = Record<string, unknown>;

const DESCRIPTION_LIMIT = 160;

/** `Shop | HotWheelsArena`; no title → the default site title. */
export function buildPageTitle(title?: string): string {
  const trimmed = title?.trim();
  return trimmed ? `${trimmed} | ${BRAND_NAME}` : DEFAULT_TITLE;
}

export function truncateDescription(text: string, limit = DESCRIPTION_LIMIT): string {
  const clean = text.replace(/\s+/g, ' ').trim();
  if (clean.length <= limit) return clean;
  const cut = clean.slice(0, limit - 1);
  const lastSpace = cut.lastIndexOf(' ');
  return `${(lastSpace > limit * 0.6 ? cut.slice(0, lastSpace) : cut).replace(/[\s,.;:]+$/, '')}…`;
}

function upsertMeta(attribute: 'name' | 'property', key: string, content: string | null): void {
  let element = document.head.querySelector<HTMLMetaElement>(`meta[${attribute}="${key}"]`);
  if (content === null) {
    element?.remove();
    return;
  }
  if (!element) {
    element = document.createElement('meta');
    element.setAttribute(attribute, key);
    document.head.appendChild(element);
  }
  element.setAttribute('content', content);
}

function upsertCanonical(href: string): void {
  let link = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!link) {
    link = document.createElement('link');
    link.rel = 'canonical';
    document.head.appendChild(link);
  }
  link.href = href;
}

/** Imperatively applies metadata (missing fields fall back to site defaults). */
export function applyDocumentMeta(meta: DocumentMeta): void {
  if (typeof document === 'undefined') return;
  const title = buildPageTitle(meta.title);
  const description = truncateDescription(meta.description ?? DEFAULT_META.description);
  const image = absoluteUrl(meta.image ?? DEFAULT_META.image);
  const canonical = absoluteUrl(meta.canonical ?? window.location.pathname);

  document.title = title;
  upsertMeta('name', 'description', description);
  upsertMeta('name', 'robots', meta.noindex ? 'noindex, nofollow' : 'index, follow');
  upsertMeta('property', 'og:title', title);
  upsertMeta('property', 'og:description', description);
  upsertMeta('property', 'og:image', image);
  upsertMeta('property', 'og:url', canonical);
  upsertMeta('property', 'og:type', meta.type ?? DEFAULT_META.type);
  upsertMeta('property', 'og:site_name', BRAND_NAME);
  upsertMeta('name', 'twitter:card', 'summary_large_image');
  upsertMeta('name', 'twitter:title', title);
  upsertMeta('name', 'twitter:description', description);
  upsertMeta('name', 'twitter:image', image);
  upsertCanonical(canonical);
}

/**
 * Sets page metadata while the calling component is mounted; restores site defaults on unmount.
 * Call unconditionally at the top of every page component.
 */
export function useDocumentMeta(meta: DocumentMeta): void {
  const { title, description, image, canonical, noindex, type } = meta;

  useEffect(() => {
    applyDocumentMeta({ title, description, image, canonical, noindex, type });
  }, [title, description, image, canonical, noindex, type]);

  useEffect(() => () => applyDocumentMeta({}), []);
}

/**
 * Injects `<script type="application/ld+json" id="jsonld-{id}">` while mounted.
 * Pass `null` to remove it (e.g. while data is loading).
 */
export function useJsonLd(id: string, data: JsonLd | JsonLd[] | null): void {
  const json = data ? JSON.stringify(data).replace(/</g, '\\u003c') : null;

  useEffect(() => {
    const scriptId = `jsonld-${id}`;
    const existing = document.getElementById(scriptId);
    if (json === null) {
      existing?.remove();
      return undefined;
    }
    const script =
      existing instanceof HTMLScriptElement ? existing : document.createElement('script');
    script.type = 'application/ld+json';
    script.id = scriptId;
    script.textContent = json;
    if (!script.isConnected) document.head.appendChild(script);
    return () => {
      script.remove();
    };
  }, [id, json]);
}

/* ------------------------------ JSON-LD builders ------------------------------ */

/**
 * schema.org Product with Offer (+ AggregateRating when rated). `brand` is the product line
 * (`BRAND_PRODUCT_LINE`) — the die-cast toy's brand, never the real car maker. Note: the product
 * page (`components/product-detail/productSeo.ts` → `buildProductDetailJsonLd`) builds on this,
 * keeps `brand`, adds `model` ("<make> <model>" of the real car) and overrides the description
 * with its generated fallback copy.
 */
export function buildProductJsonLd(product: Product): JsonLd {
  const url = absoluteUrl(productPath(product.slug));
  const image = absoluteUrl(productImageUrl(primaryImageOf(product), { w: 1200, h: 900 }));
  const data: JsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: truncateDescription(
      product.description || `${product.name} — ${product.seriesName}`,
      300,
    ),
    sku: product.id,
    image: [image],
    url,
    category: product.category,
    color: product.color,
    material: product.material,
    brand: { '@type': 'Brand', name: BRAND_PRODUCT_LINE },
    offers: {
      '@type': 'Offer',
      url,
      priceCurrency: CURRENCY,
      price: product.price.toFixed(2),
      availability:
        product.stock > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
      itemCondition: 'https://schema.org/NewCondition',
      seller: { '@type': 'Organization', name: BRAND_NAME },
    },
  };
  if (product.ratingCount > 0) {
    data.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: product.ratingAvg.toFixed(1),
      reviewCount: product.ratingCount,
      bestRating: '5',
      worstRating: '1',
    };
  }
  return data;
}

/** schema.org BreadcrumbList from `[{ name, path }]`. */
export function buildBreadcrumbJsonLd(
  items: ReadonlyArray<{ name: string; path: string }>,
): JsonLd {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  };
}

/** schema.org Organization for the home page. */
export function buildOrganizationJsonLd(): JsonLd {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: BRAND_NAME,
    url: absoluteUrl('/'),
    logo: absoluteUrl('/favicon.svg'),
    email: SUPPORT_EMAIL,
    sameAs: SOCIAL_LINKS.map((link) => link.href),
  };
}
