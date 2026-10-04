/**
 * Structured data for the home page: schema.org WebSite (with the site search as a
 * SearchAction) + the shared Organization builder from `lib/seo`.
 */
import { BRAND_DESCRIPTION, BRAND_NAME, LOCALE } from '@/config/brand';
import { ROUTES } from '@/config/routes';
import { absoluteUrl } from '@/config/site';
import { buildOrganizationJsonLd, type JsonLd } from '@/lib/seo';

/** Placeholder the search engine substitutes in the SearchAction URL template. */
const SEARCH_TERM = 'search_term_string';

export function buildWebSiteJsonLd(): JsonLd {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: BRAND_NAME,
    url: absoluteUrl(ROUTES.home),
    description: BRAND_DESCRIPTION,
    inLanguage: LOCALE,
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        // Built by hand (not searchPath) so the braces of the template stay unencoded.
        urlTemplate: `${absoluteUrl(ROUTES.search)}?q={${SEARCH_TERM}}`,
      },
      'query-input': `required name=${SEARCH_TERM}`,
    },
  };
}

export function buildHomeJsonLd(): JsonLd[] {
  return [buildWebSiteJsonLd(), buildOrganizationJsonLd()];
}
