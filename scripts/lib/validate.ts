/**
 * Seed catalogue validation. Runs before anything is written (and on `--dry-run`).
 *
 * Errors  = data-integrity problems and the catalogue invariants the storefront relies on
 *           (36 cars, 8 new / 8 featured / ≥ 6 vault, unique slugs, series ↔ product links,
 *           numbered vault editions, ₹199–₹2,499, every category covered, rating aggregates…).
 *           Any error aborts the seed with a non-zero exit code.
 * Warnings = composition targets (rarity mix, sold-out count…) that are informative only.
 */
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { DEFAULT_SITE_SETTINGS } from '../../shared/commerce.ts';
import { REVIEW_TEXT_MAX, REVIEW_TEXT_MIN } from '../../shared/schemas.ts';
import { CATEGORY_SLUGS, RARITIES, type Rarity } from '../../shared/types.ts';
import type { SeedCatalog } from '../data/index.ts';
import {
  CLOUDINARY_CAR_FOLDER,
  GENERIC_CAR_URL,
  PLACEHOLDER_URL_PREFIX,
} from '../data/placeholders.ts';
import { SEED_REVIEWER_UID_PREFIX } from '../data/reviews.ts';
import { aggregateRatings } from './ratings.ts';

export const CATALOG_RULES = {
  productCount: 36,
  categoryCount: CATEGORY_SLUGS.length,
  seriesCount: 6,
  newCount: 8,
  featuredCount: 8,
  minVault: 6,
  minPerCategory: 4,
  priceMin: 199,
  priceMax: 2499,
  yearMin: 2024,
  yearMax: 2026,
  maxImages: 3,
  /** Vault editions must show scarcity ("Only 37 remaining"). */
  maxVaultStock: 50,
} as const;

export const COMPOSITION_TARGETS = {
  rarity: { common: 18, rare: 9, 'super-rare': 3, limited: 6 } satisfies Record<Rarity, number>,
  soldOut: 2,
  reviewedProducts: 12,
  reviewsPerProduct: [2, 5],
} as const;

/** Allowed rarityScore / collectorScore per rarity (keeps scores coherent with the chip). */
const SCORE_BANDS: Readonly<Record<Rarity, readonly [number, number]>> = {
  common: [1, 6],
  rare: [4, 8],
  'super-rare': [7, 10],
  limited: [8, 10],
};

/** Price band per rarity in whole rupees (keeps prices coherent with rarity). */
const PRICE_BANDS: Readonly<Record<Rarity, readonly [number, number]>> = {
  common: [199, 399],
  rare: [399, 999],
  'super-rare': [899, 1999],
  limited: [999, 2499],
};

const KEBAB = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export interface ValidationResult {
  errors: string[];
  warnings: string[];
}

export interface ValidateOptions {
  /** Absolute path of `public/placeholders`; when given, every referenced image must exist. */
  placeholdersDir?: string;
}

const isValidDate = (date: Date): boolean => !Number.isNaN(date.getTime());
const isInt = (value: number): boolean => Number.isInteger(value);
const inRange = (value: number, [min, max]: readonly [number, number]): boolean =>
  value >= min && value <= max;

function duplicates(values: readonly (string | number)[]): (string | number)[] {
  const seen = new Set<string | number>();
  const dupes = new Set<string | number>();
  for (const value of values) {
    if (seen.has(value)) dupes.add(value);
    seen.add(value);
  }
  return [...dupes];
}

export function validateCatalog(
  catalog: SeedCatalog,
  options: ValidateOptions = {},
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const error = (message: string): void => void errors.push(message);
  const warn = (message: string): void => void warnings.push(message);
  const { categories, series, products, reviews, settings, runAt } = catalog;
  const R = CATALOG_RULES;

  const checkDates = (label: string, createdAt: Date, updatedAt: Date): void => {
    if (!isValidDate(createdAt)) error(`${label}: createdAt is not a valid date`);
    else if (createdAt.getTime() > runAt.getTime()) error(`${label}: createdAt is in the future`);
    if (!isValidDate(updatedAt)) error(`${label}: updatedAt is not a valid date`);
    else if (isValidDate(createdAt) && updatedAt.getTime() < createdAt.getTime()) {
      error(`${label}: updatedAt is before createdAt`);
    }
  };

  /* ------------------------------- categories ------------------------------- */
  if (categories.length !== R.categoryCount) {
    error(`expected ${R.categoryCount} categories, found ${categories.length}`);
  }
  for (const dupe of duplicates(categories.map((c) => c.id))) error(`duplicate category id "${dupe}"`);
  for (const dupe of duplicates(categories.map((c) => c.order))) error(`duplicate category order ${dupe}`);
  const categoryIds = new Set(categories.map((c) => c.id));
  for (const slug of CATEGORY_SLUGS) {
    if (!categoryIds.has(slug)) error(`category "${slug}" is missing`);
  }
  for (const category of categories) {
    const label = `category "${category.id}"`;
    if (category.id !== category.slug) error(`${label}: id must equal slug`);
    if (!(CATEGORY_SLUGS as readonly string[]).includes(category.slug)) {
      error(`${label}: slug is not one of ${CATEGORY_SLUGS.join(', ')}`);
    }
    if (!category.name.trim()) error(`${label}: name is empty`);
    if (!/^[A-Z][A-Za-z0-9]+$/.test(category.icon)) error(`${label}: icon must be a lucide icon name`);
    if (!isInt(category.order) || category.order < 1) error(`${label}: order must be a positive integer`);
    if (!category.description.trim()) error(`${label}: description is empty`);
    if (!category.isActive) error(`${label}: must be active`);
    checkDates(label, category.createdAt, category.updatedAt);
  }

  /* --------------------------------- series --------------------------------- */
  if (series.length !== R.seriesCount) error(`expected ${R.seriesCount} series, found ${series.length}`);
  for (const dupe of duplicates(series.map((s) => s.id))) error(`duplicate series id "${dupe}"`);
  const productsById = new Map(products.map((p) => [p.id, p]));
  const seriesById = new Map(series.map((s) => [s.id, s]));
  for (const entry of series) {
    const label = `series "${entry.id}"`;
    if (entry.id !== entry.slug) error(`${label}: id must equal slug`);
    if (!KEBAB.test(entry.slug)) error(`${label}: slug must be kebab-case`);
    if (!entry.name.trim()) error(`${label}: name is empty`);
    if (!entry.description.trim()) error(`${label}: description is empty`);
    if (!isInt(entry.year) || entry.year < R.yearMin || entry.year > R.yearMax) {
      error(`${label}: year ${entry.year} is outside ${R.yearMin}–${R.yearMax}`);
    }
    if (entry.carIds.length === 0) error(`${label}: carIds is empty`);
    if (entry.totalCars !== entry.carIds.length) error(`${label}: totalCars must equal carIds.length`);
    for (const dupe of duplicates(entry.carIds)) error(`${label}: car "${dupe}" is listed twice`);
    entry.carIds.forEach((carId, index) => {
      const product = productsById.get(carId);
      if (!product) {
        error(`${label}: carIds references unknown product "${carId}"`);
        return;
      }
      if (product.series !== entry.id) {
        error(`${label}: lists "${carId}" but that product's series is "${product.series}"`);
      }
      if (product.seriesNumber !== index + 1) {
        error(`${label}: "${carId}" is at position ${index + 1} but has seriesNumber ${product.seriesNumber}`);
      }
    });
    if (!entry.isActive) error(`${label}: must be active`);
    checkDates(label, entry.createdAt, entry.updatedAt);
  }
  const seriesYears = new Set(series.map((s) => s.year));
  for (let year: number = R.yearMin; year <= R.yearMax; year += 1) {
    if (!seriesYears.has(year)) warn(`no series from ${year}`);
  }
  if (!series.some((s) => s.carIds.length > 0 && s.carIds.length <= 5)) {
    warn('no small series (≤ 5 cars) — "complete a series" will be hard to demo');
  }

  /* -------------------------------- products -------------------------------- */
  if (products.length !== R.productCount) {
    error(`expected exactly ${R.productCount} products, found ${products.length}`);
  }
  for (const dupe of duplicates(products.map((p) => p.id))) error(`duplicate product id "${dupe}"`);
  for (const dupe of duplicates(products.map((p) => p.slug))) error(`duplicate product slug "${dupe}"`);
  for (const dupe of duplicates(products.map((p) => p.collectionNumber))) {
    error(`duplicate collectionNumber #${dupe}`);
  }

  const reviewsByProduct = new Map<string, number[]>();
  for (const review of reviews) {
    const list = reviewsByProduct.get(review.productId) ?? [];
    list.push(review.rating);
    reviewsByProduct.set(review.productId, list);
  }

  for (const product of products) {
    const label = `product "${product.id}"`;
    if (product.id !== product.slug) error(`${label}: id must equal slug`);
    if (!KEBAB.test(product.slug)) error(`${label}: slug must be kebab-case`);
    for (const [field, value] of [
      ['name', product.name],
      ['description', product.description],
      ['make', product.make],
      ['model', product.model],
      ['color', product.color],
      ['material', product.material],
      ['vehicleType', product.vehicleType],
    ] as const) {
      if (!value.trim()) error(`${label}: ${field} is empty`);
    }
    if (product.description.length > 320) warn(`${label}: description is long (${product.description.length} chars)`);

    const owner = seriesById.get(product.series);
    if (!owner) {
      error(`${label}: unknown series "${product.series}"`);
    } else {
      if (!owner.carIds.includes(product.id)) error(`${label}: not listed in series "${owner.id}" carIds`);
      if (product.seriesName !== owner.name) error(`${label}: seriesName must be "${owner.name}"`);
      if (product.year !== owner.year) error(`${label}: year must match series year ${owner.year}`);
    }
    if (!isInt(product.seriesNumber) || product.seriesNumber < 1) error(`${label}: invalid seriesNumber`);
    if (!isInt(product.collectionNumber) || product.collectionNumber < 1) {
      error(`${label}: collectionNumber must be a positive integer`);
    }
    if (!isInt(product.year) || product.year < R.yearMin || product.year > R.yearMax) {
      error(`${label}: year ${product.year} is outside ${R.yearMin}–${R.yearMax}`);
    }
    if (!/^1:\d{1,3}$/.test(product.scale)) error(`${label}: scale "${product.scale}" is not like 1:64`);
    if (!(CATEGORY_SLUGS as readonly string[]).includes(product.category)) {
      error(`${label}: unknown category "${product.category}"`);
    }
    if (!(RARITIES as readonly string[]).includes(product.rarity)) {
      error(`${label}: unknown rarity "${product.rarity}"`);
    } else {
      const band = SCORE_BANDS[product.rarity];
      for (const [field, value] of [
        ['rarityScore', product.rarityScore],
        ['collectorScore', product.collectorScore],
      ] as const) {
        if (!isInt(value) || value < 1 || value > 10) error(`${label}: ${field} must be an integer 1–10`);
        else if (!inRange(value, band)) {
          error(`${label}: ${field} ${value} is incoherent with rarity "${product.rarity}" (${band[0]}–${band[1]})`);
        }
      }
      const priceBand = PRICE_BANDS[product.rarity];
      if (!inRange(product.price, priceBand)) {
        error(`${label}: price ₹${product.price} is incoherent with rarity "${product.rarity}" (₹${priceBand[0]}–₹${priceBand[1]})`);
      }
    }
    if (!(product.themedStats.topSpeedKmh > 0) || !(product.themedStats.powerHp > 0)) {
      error(`${label}: themedStats must be positive`);
    }
    if (!isInt(product.price) || product.price < R.priceMin || product.price > R.priceMax) {
      error(`${label}: price ₹${product.price} is outside ₹${R.priceMin}–₹${R.priceMax}`);
    }
    if (product.compareAtPrice !== null) {
      if (!isInt(product.compareAtPrice) || product.compareAtPrice <= product.price) {
        error(`${label}: compareAtPrice must be an integer above the price`);
      }
    }
    if (product.currency !== 'INR') error(`${label}: currency must be INR`);
    if (!isInt(product.stock) || product.stock < 0) error(`${label}: stock must be a non-negative integer`);

    const edition = product.limitedEdition;
    if (edition) {
      if (!isInt(edition.editionSize) || edition.editionSize < 1) error(`${label}: invalid editionSize`);
      if (!isInt(edition.editionNumber) || edition.editionNumber < 1 || edition.editionNumber > edition.editionSize) {
        error(`${label}: editionNumber must be 1…editionSize`);
      }
      if (product.stock > edition.editionSize) error(`${label}: stock exceeds the edition size`);
    }
    if (product.isVault) {
      if (!edition) error(`${label}: vault cars need a limitedEdition { editionNumber, editionSize }`);
      if (product.rarity !== 'limited') error(`${label}: vault cars must have rarity "limited"`);
      if (product.stock > R.maxVaultStock) error(`${label}: vault stock ${product.stock} is not low (≤ ${R.maxVaultStock})`);
    }
    if (product.rarity === 'limited' && !product.isVault) warn(`${label}: limited rarity but not in the vault`);
    if ((product.category === 'limited') !== (product.rarity === 'limited')) {
      warn(`${label}: category "limited" and rarity "limited" should go together`);
    }

    if (product.images.length < 1 || product.images.length > R.maxImages) {
      error(`${label}: needs 1–${R.maxImages} images, has ${product.images.length}`);
    }
    for (const dupe of duplicates(product.images.map((image) => image.url))) {
      error(`${label}: image "${dupe}" is used twice`);
    }
    product.images.forEach((image, index) => {
      const expectedId = `${CLOUDINARY_CAR_FOLDER}/${product.slug}${index === 0 ? '' : `-${index + 1}`}`;
      if (image.publicId !== expectedId) error(`${label}: image ${index + 1} publicId must be "${expectedId}"`);
      if (!image.url.startsWith(PLACEHOLDER_URL_PREFIX) || !image.url.endsWith('.svg')) {
        error(`${label}: image url "${image.url}" must be a local /placeholders/*.svg fallback`);
      }
      if (!image.alt.trim()) error(`${label}: image ${index + 1} needs alt text`);
    });
    if (product.primaryImage !== product.images[0]?.url) error(`${label}: primaryImage must equal images[0].url`);

    for (const dupe of duplicates(product.tags)) error(`${label}: duplicate tag "${dupe}"`);
    for (const tag of product.tags) if (!KEBAB.test(tag)) error(`${label}: tag "${tag}" must be kebab-case`);
    const isPremium = product.isVault || product.scale !== '1:64';
    if (isPremium && !product.tags.includes('premium')) error(`${label}: premium items must be tagged "premium"`);

    if (!product.isActive) error(`${label}: must be active`);
    checkDates(label, product.createdAt, product.updatedAt);

    const expected = aggregateRatings(reviewsByProduct.get(product.id) ?? []);
    if (product.ratingAvg !== expected.ratingAvg || product.ratingCount !== expected.ratingCount) {
      error(`${label}: rating ${product.ratingAvg}/${product.ratingCount} does not match its reviews (${expected.ratingAvg}/${expected.ratingCount})`);
    }
  }

  const countBy = (predicate: (p: (typeof products)[number]) => boolean): number =>
    products.filter(predicate).length;
  const newCount = countBy((p) => p.isNew);
  const featuredCount = countBy((p) => p.isFeatured);
  const vaultCount = countBy((p) => p.isVault);
  if (newCount !== R.newCount) error(`expected exactly ${R.newCount} isNew products, found ${newCount}`);
  if (featuredCount !== R.featuredCount) {
    error(`expected exactly ${R.featuredCount} isFeatured products, found ${featuredCount}`);
  }
  if (vaultCount < R.minVault) error(`expected at least ${R.minVault} isVault products, found ${vaultCount}`);

  if (products.every((p) => isValidDate(p.createdAt))) {
    const newest = [...products].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    const newestIds = new Set(newest.slice(0, R.newCount).map((p) => p.id));
    for (const product of products) {
      if (product.isNew !== newestIds.has(product.id)) {
        error(`product "${product.id}": isNew must be set on exactly the ${R.newCount} newest products (by createdAt)`);
      }
    }
    const last = newest[R.newCount - 1];
    const next = newest[R.newCount];
    if (last && next && last.createdAt.getTime() === next.createdAt.getTime()) {
      error(`products "${last.id}" and "${next.id}" share a createdAt at the isNew boundary`);
    }
  }

  for (const slug of CATEGORY_SLUGS) {
    const count = countBy((p) => p.category === slug);
    if (count < R.minPerCategory) {
      error(`category "${slug}" has ${count} products (needs ≥ ${R.minPerCategory})`);
    }
  }

  for (const rarity of RARITIES) {
    const count = countBy((p) => p.rarity === rarity);
    if (count === 0) error(`no "${rarity}" products`);
    else if (count !== COMPOSITION_TARGETS.rarity[rarity]) {
      warn(`rarity "${rarity}": ${count} products (target ≈ ${COMPOSITION_TARGETS.rarity[rarity]})`);
    }
  }
  const soldOut = countBy((p) => p.stock === 0);
  if (soldOut !== COMPOSITION_TARGETS.soldOut) {
    warn(`${soldOut} sold-out products (target ${COMPOSITION_TARGETS.soldOut})`);
  }

  if (options.placeholdersDir) {
    const dir = options.placeholdersDir;
    if (!existsSync(dir)) {
      warn(`placeholder directory not found (${dir}) — image files were not checked`);
    } else {
      const urls = new Set([GENERIC_CAR_URL, ...products.flatMap((p) => p.images.map((i) => i.url))]);
      for (const url of urls) {
        if (url.startsWith(PLACEHOLDER_URL_PREFIX)) {
          const file = url.slice(PLACEHOLDER_URL_PREFIX.length);
          if (!existsSync(join(dir, file))) error(`missing placeholder image public${url}`);
        }
      }
    }
  }

  /* --------------------------------- reviews -------------------------------- */
  for (const dupe of duplicates(reviews.map((r) => `${r.productId}/${r.uid}`))) {
    error(`duplicate review "${dupe}" (one review per collector per product)`);
  }
  for (const review of reviews) {
    const label = `review "${review.productId}/${review.uid}"`;
    const product = productsById.get(review.productId);
    if (!product) error(`${label}: unknown product`);
    if (review.id !== review.uid) error(`${label}: id must equal uid`);
    if (!review.uid || review.uid.includes('/')) error(`${label}: invalid uid`);
    if (!review.uid.startsWith(SEED_REVIEWER_UID_PREFIX)) {
      warn(`${label}: seed reviewer uids should start with "${SEED_REVIEWER_UID_PREFIX}"`);
    }
    if (!review.displayName.trim()) error(`${label}: displayName is empty`);
    if (!isInt(review.rating) || review.rating < 1 || review.rating > 5) error(`${label}: rating must be 1–5`);
    const length = review.text.trim().length;
    if (length < REVIEW_TEXT_MIN || length > REVIEW_TEXT_MAX) {
      error(`${label}: text must be ${REVIEW_TEXT_MIN}–${REVIEW_TEXT_MAX} characters (has ${length})`);
    }
    checkDates(label, review.createdAt, review.updatedAt);
    if (product && isValidDate(review.createdAt) && review.createdAt.getTime() < product.createdAt.getTime()) {
      error(`${label}: written before the product was listed`);
    }
  }
  const [minReviews, maxReviews] = COMPOSITION_TARGETS.reviewsPerProduct;
  for (const [productId, ratings] of reviewsByProduct) {
    if (ratings.length < minReviews || ratings.length > maxReviews) {
      warn(`product "${productId}" has ${ratings.length} reviews (target ${minReviews}–${maxReviews})`);
    }
  }

  /* -------------------------------- settings -------------------------------- */
  for (const key of [
    'shippingThreshold',
    'shippingFee',
    'taxRate',
    'taxInclusive',
    'showGstLine',
    'codEnabled',
    'maxQtyPerItem',
  ] as const) {
    if (settings[key] !== DEFAULT_SITE_SETTINGS[key]) {
      error(`settings/${catalog.settingsDocId}: ${key} must equal DEFAULT_SITE_SETTINGS.${key} (${String(DEFAULT_SITE_SETTINGS[key])})`);
    }
  }
  checkDates(`settings/${catalog.settingsDocId}`, settings.createdAt, settings.updatedAt);

  return { errors, warnings };
}
