import { describe, expect, it } from 'vitest';
import { makeProduct } from '@/components/product/__tests__/fixtures';
import { BRAND_NAME, BRAND_PRODUCT_LINE } from '@/config/brand';
import { absoluteUrl } from '@/config/site';
import {
  buildProductDetailJsonLd,
  generatedProductDescription,
  productBreadcrumbs,
  productDescription,
  productOgImage,
  productPageTitle,
} from '../productSeo';

describe('product SEO helpers', () => {
  it('titles the page "<name> — <series>"', () => {
    expect(productPageTitle(makeProduct())).toBe('Twin Mill — HW Legends');
    expect(productPageTitle(makeProduct({ seriesName: '' }))).toBe('Twin Mill');
  });

  it('uses the editorial description, else generates one', () => {
    expect(productDescription(makeProduct())).toBe('A legendary twin-engine concept.');
    const generated = productDescription(makeProduct({ description: '   ' }));
    expect(generated).toBe(generatedProductDescription(makeProduct({ description: '' })));
    expect(generated).toContain('Twin Mill');
    expect(generated).toContain('HW Legends 2025 series');
    expect(generated).toContain('collection #142');
    expect(generated).toContain('₹1,299');
    expect(generated).toContain(BRAND_NAME);
    expect(productDescription(makeProduct({ description: '', stock: 0 }))).toContain(
      'Currently sold out',
    );
  });

  it('gives an absolute social image URL', () => {
    expect(productOgImage(makeProduct())).toBe(absoluteUrl('/placeholders/supercar-orange.svg'));
    expect(productOgImage(makeProduct())).toMatch(/^https?:\/\//);
  });

  it('builds the schema.org Product JSON-LD', () => {
    const product = makeProduct({ make: 'Hot Rod Co', ratingAvg: 4.46, ratingCount: 12 });
    const ld = buildProductDetailJsonLd(product);
    const url = absoluteUrl('/product/twin-mill-orange');

    expect(ld).toMatchObject({
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: 'Twin Mill',
      sku: 'twin-mill-orange',
      description: 'A legendary twin-engine concept.',
      image: [absoluteUrl('/placeholders/supercar-orange.svg')],
      // The toy line is the brand; the real car's make + model go in `model` (and the name).
      brand: { '@type': 'Brand', name: BRAND_PRODUCT_LINE },
      model: 'Hot Rod Co Twin Mill',
      offers: {
        '@type': 'Offer',
        price: '1299.00',
        priceCurrency: 'INR',
        availability: 'https://schema.org/InStock',
        url,
      },
      aggregateRating: { '@type': 'AggregateRating', ratingValue: '4.5', reviewCount: 12 },
    });
  });

  it('never uses the real car maker as the brand, and omits model when make/model are empty', () => {
    const porsche = buildProductDetailJsonLd(
      makeProduct({ make: ' Porsche ', model: '911 GT3 RS' }),
    );
    expect(porsche.brand).toEqual({ '@type': 'Brand', name: BRAND_PRODUCT_LINE });
    expect(porsche.model).toBe('Porsche 911 GT3 RS');

    expect(buildProductDetailJsonLd(makeProduct({ make: '', model: 'Twin Mill' })).model).toBe(
      'Twin Mill',
    );
    const unnamed = buildProductDetailJsonLd(makeProduct({ make: ' ', model: '' }));
    expect(unnamed).not.toHaveProperty('model');
    expect(unnamed.brand).toEqual({ '@type': 'Brand', name: BRAND_PRODUCT_LINE });
  });

  it('marks sold-out cars OutOfStock and omits aggregateRating without ratings', () => {
    const ld = buildProductDetailJsonLd(makeProduct({ stock: 0, ratingCount: 0, ratingAvg: 0 }));
    expect(ld.offers).toMatchObject({ availability: 'https://schema.org/OutOfStock' });
    expect(ld).not.toHaveProperty('aggregateRating');
  });

  it('builds Shop › Category › Name breadcrumbs', () => {
    expect(productBreadcrumbs(makeProduct({ category: 'off-road' }))).toEqual([
      { name: 'Shop', path: '/shop' },
      { name: 'Off Road', path: '/shop?category=off-road' },
      { name: 'Twin Mill', path: '/product/twin-mill-orange' },
    ]);
  });
});
