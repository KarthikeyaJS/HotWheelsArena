/**
 * HotWheelsArena — seed read-back check.
 *
 * Reads the seeded collections back from Firestore and verifies them against the seed catalogue:
 * document counts (36 products, 6 categories, 6 series, settings/site, reviews), key fields,
 * Timestamp types, series ↔ product links and product rating aggregates versus the reviews that
 * are actually stored. Exits 1 when any check fails.
 *
 *   npx tsx scripts/verify-seed.ts --emulator
 *   npx tsx scripts/verify-seed.ts --project my-project
 */
import { isDeepStrictEqual, parseArgs } from 'node:util';
import { getFirestore, Timestamp, type DocumentData } from 'firebase-admin/firestore';
import { DEFAULT_SITE_SETTINGS } from '../shared/commerce.ts';
import { COLLECTIONS, SUBCOLLECTIONS } from '../shared/constants.ts';
import { buildSeedCatalog } from './data/index.ts';
import {
  closeAdminApp,
  describeFirebaseError,
  initAdminApp,
  resolveTarget,
  TargetError,
  type Target,
} from './lib/firebase.ts';
import { aggregateRatings } from './lib/ratings.ts';
import { renderTable } from './lib/table.ts';
import { CATALOG_RULES } from './lib/validate.ts';

const USAGE = `
HotWheelsArena seed check — verifies the seeded Firestore data.

Usage
  npx tsx scripts/verify-seed.ts [--emulator] [--project <id>]

Flags
  --emulator         Read from the Firestore emulator (FIRESTORE_EMULATOR_HOST or 127.0.0.1:8080).
  --project <id>     Firebase project id (default for the emulator: demo-hotwheelsarena).
  --help, -h         Show this help.
`;

interface CheckResult {
  name: string;
  ok: boolean;
  detail: string;
  problems: string[];
}

const isTimestamp = (value: unknown): boolean => value instanceof Timestamp;

/** Up to `limit` problems for the summary, plus a count of the rest. */
function summarise(problems: readonly string[], limit = 6): string[] {
  if (problems.length <= limit) return [...problems];
  return [...problems.slice(0, limit), `…and ${problems.length - limit} more`];
}

async function main(): Promise<number> {
  let values: { emulator: boolean; project?: string; help: boolean };
  try {
    ({ values } = parseArgs({
      args: process.argv.slice(2),
      options: {
        emulator: { type: 'boolean', default: false },
        project: { type: 'string' },
        help: { type: 'boolean', short: 'h', default: false },
      },
      strict: true,
      allowPositionals: false,
    }));
  } catch (error) {
    console.error(`✖ ${error instanceof Error ? error.message : String(error)}`);
    console.error(USAGE);
    return 2;
  }
  if (values.help) {
    console.log(USAGE);
    return 0;
  }

  let target: Target;
  try {
    target = resolveTarget({
      service: 'firestore',
      emulator: values.emulator,
      project: values.project,
    });
  } catch (error) {
    if (error instanceof TargetError) {
      console.error(`✖ ${error.message}`);
      return 1;
    }
    throw error;
  }
  for (const note of target.notes) console.log(`  i ${note}`);
  console.log(`HotWheelsArena seed check → ${target.label}`);

  const expected = buildSeedCatalog(new Date());
  const app = initAdminApp(target, `verify-${Date.now()}`);
  try {
    const db = getFirestore(app);
    const [categorySnap, seriesSnap, productSnap, settingsSnap, reviewSnap] = await Promise.all([
      db.collection(COLLECTIONS.categories).get(),
      db.collection(COLLECTIONS.series).get(),
      db.collection(COLLECTIONS.products).get(),
      db.collection(COLLECTIONS.settings).doc(expected.settingsDocId).get(),
      db.collectionGroup(SUBCOLLECTIONS.reviews).get(),
    ]);
    const categories = new Map(categorySnap.docs.map((doc) => [doc.id, doc.data()]));
    const series = new Map(seriesSnap.docs.map((doc) => [doc.id, doc.data()]));
    const products = new Map(productSnap.docs.map((doc) => [doc.id, doc.data()]));
    const reviewsByProduct = new Map<string, Map<string, DocumentData>>();
    for (const doc of reviewSnap.docs) {
      const productId = doc.ref.parent.parent?.id;
      if (!productId || doc.ref.parent.parent?.parent.id !== COLLECTIONS.products) continue;
      const list = reviewsByProduct.get(productId) ?? new Map<string, DocumentData>();
      list.set(doc.id, doc.data());
      reviewsByProduct.set(productId, list);
    }
    const results: CheckResult[] = [];
    const check = (name: string, detail: string, problems: string[]): void => {
      results.push({ name, ok: problems.length === 0, detail, problems });
    };

    /* categories */
    {
      const problems: string[] = [];
      if (categories.size !== expected.categories.length) {
        problems.push(`expected ${expected.categories.length} documents, found ${categories.size}`);
      }
      for (const category of expected.categories) {
        const data = categories.get(category.id);
        if (!data) {
          problems.push(`missing categories/${category.id}`);
          continue;
        }
        for (const key of ['name', 'slug', 'icon', 'order', 'description', 'isActive'] as const) {
          if (!isDeepStrictEqual(data[key], category[key]))
            problems.push(`categories/${category.id}.${key} differs`);
        }
        if (!isTimestamp(data.createdAt) || !isTimestamp(data.updatedAt)) {
          problems.push(`categories/${category.id} timestamps are not Timestamps`);
        }
      }
      check('categories', `${categories.size} docs`, problems);
    }

    /* series */
    {
      const problems: string[] = [];
      if (series.size !== expected.series.length) {
        problems.push(`expected ${expected.series.length} documents, found ${series.size}`);
      }
      for (const entry of expected.series) {
        const data = series.get(entry.id);
        if (!data) {
          problems.push(`missing series/${entry.id}`);
          continue;
        }
        for (const key of [
          'name',
          'slug',
          'year',
          'totalCars',
          'carIds',
          'description',
          'isActive',
        ] as const) {
          if (!isDeepStrictEqual(data[key], entry[key]))
            problems.push(`series/${entry.id}.${key} differs`);
        }
        const carIds: unknown = data.carIds;
        if (Array.isArray(carIds)) {
          for (const carId of carIds) {
            const product = typeof carId === 'string' ? products.get(carId) : undefined;
            if (!product)
              problems.push(`series/${entry.id} lists missing product "${String(carId)}"`);
            else if (product.series !== entry.id)
              problems.push(`products/${String(carId)}.series ≠ ${entry.id}`);
          }
        }
        if (!isTimestamp(data.createdAt) || !isTimestamp(data.updatedAt)) {
          problems.push(`series/${entry.id} timestamps are not Timestamps`);
        }
      }
      check('series', `${series.size} docs`, problems);
    }

    /* products */
    {
      const problems: string[] = [];
      if (products.size !== expected.products.length) {
        problems.push(`expected ${expected.products.length} documents, found ${products.size}`);
      }
      const compared = [
        'slug',
        'name',
        'description',
        'make',
        'model',
        'series',
        'seriesName',
        'seriesNumber',
        'collectionNumber',
        'year',
        'scale',
        'color',
        'material',
        'vehicleType',
        'category',
        'rarity',
        'rarityScore',
        'collectorScore',
        'themedStats',
        'price',
        'compareAtPrice',
        'currency',
        'stock',
        'limitedEdition',
        'images',
        'primaryImage',
        'tags',
        'isNew',
        'isFeatured',
        'isVault',
        'isActive',
      ] as const;
      for (const product of expected.products) {
        const data = products.get(product.id);
        if (!data) {
          problems.push(`missing products/${product.id}`);
          continue;
        }
        for (const key of compared) {
          if (!isDeepStrictEqual(data[key], product[key]))
            problems.push(`products/${product.id}.${key} differs`);
        }
        if ('id' in data) problems.push(`products/${product.id} stores a redundant "id" field`);
        if (!isTimestamp(data.createdAt) || !isTimestamp(data.updatedAt)) {
          problems.push(`products/${product.id} timestamps are not Timestamps`);
        }
      }
      const flag = (key: 'isNew' | 'isFeatured' | 'isVault'): number =>
        [...products.values()].filter((data) => data[key] === true).length;
      const [newCount, featuredCount, vaultCount] = [
        flag('isNew'),
        flag('isFeatured'),
        flag('isVault'),
      ];
      if (newCount !== CATALOG_RULES.newCount)
        problems.push(`isNew count ${newCount} ≠ ${CATALOG_RULES.newCount}`);
      if (featuredCount !== CATALOG_RULES.featuredCount) {
        problems.push(`isFeatured count ${featuredCount} ≠ ${CATALOG_RULES.featuredCount}`);
      }
      if (vaultCount < CATALOG_RULES.minVault)
        problems.push(`isVault count ${vaultCount} < ${CATALOG_RULES.minVault}`);
      check(
        'products',
        `${products.size} docs · ${newCount} new · ${featuredCount} featured · ${vaultCount} vault`,
        problems,
      );
    }

    /* reviews */
    {
      const problems: string[] = [];
      let stored = 0;
      for (const list of reviewsByProduct.values()) stored += list.size;
      for (const review of expected.reviews) {
        const data = reviewsByProduct.get(review.productId)?.get(review.uid);
        if (!data) {
          problems.push(`missing products/${review.productId}/reviews/${review.uid}`);
          continue;
        }
        for (const key of [
          'productId',
          'uid',
          'displayName',
          'photoURL',
          'rating',
          'text',
          'verifiedBuyer',
        ] as const) {
          if (!isDeepStrictEqual(data[key], review[key])) {
            problems.push(`reviews/${review.productId}/${review.uid}.${key} differs`);
          }
        }
        if (!isTimestamp(data.createdAt) || !isTimestamp(data.updatedAt)) {
          problems.push(`reviews/${review.productId}/${review.uid} timestamps are not Timestamps`);
        }
      }
      if (stored < expected.reviews.length) {
        problems.push(`expected at least ${expected.reviews.length} reviews, found ${stored}`);
      }
      check(
        'reviews',
        `${stored} docs (${expected.reviews.length} seeded) on ${reviewsByProduct.size} products`,
        problems,
      );
    }

    /* rating aggregates */
    {
      const problems: string[] = [];
      for (const [productId, data] of products) {
        const ratings = [...(reviewsByProduct.get(productId)?.values() ?? [])]
          .map((review) => review.rating as unknown)
          .filter((rating): rating is number => typeof rating === 'number');
        const aggregate = aggregateRatings(ratings);
        if (data.ratingCount !== aggregate.ratingCount || data.ratingAvg !== aggregate.ratingAvg) {
          problems.push(
            `products/${productId} rating ${String(data.ratingAvg)}/${String(data.ratingCount)} ≠ stored reviews ${aggregate.ratingAvg}/${aggregate.ratingCount}`,
          );
        }
      }
      check('rating aggregates', 'ratingAvg / ratingCount match stored reviews', problems);
    }

    /* settings */
    {
      const problems: string[] = [];
      const data = settingsSnap.data();
      if (!settingsSnap.exists || !data) {
        problems.push(`missing ${COLLECTIONS.settings}/${expected.settingsDocId}`);
      } else {
        for (const key of [
          'shippingThreshold',
          'shippingFee',
          'taxRate',
          'taxInclusive',
          'showGstLine',
          'codEnabled',
          'maxQtyPerItem',
        ] as const) {
          if (data[key] !== DEFAULT_SITE_SETTINGS[key])
            problems.push(`${key} ≠ ${String(DEFAULT_SITE_SETTINGS[key])}`);
        }
        if (!isTimestamp(data.createdAt) || !isTimestamp(data.updatedAt))
          problems.push('timestamps are not Timestamps');
      }
      check(
        `${COLLECTIONS.settings}/${expected.settingsDocId}`,
        settingsSnap.exists ? 'present' : 'missing',
        problems,
      );
    }

    console.log(
      `\n${renderTable(
        [{ header: 'Check' }, { header: 'Result' }, { header: 'Detail' }],
        results.map((result) => [result.name, result.ok ? 'PASS' : 'FAIL', result.detail]),
      )}`,
    );
    const failed = results.filter((result) => !result.ok);
    for (const result of failed) {
      console.error(`\n✖ ${result.name}:`);
      for (const problem of summarise(result.problems)) console.error(`  - ${problem}`);
    }
    if (failed.length > 0) {
      console.error(`\n✖ ${failed.length} of ${results.length} checks failed`);
      return 1;
    }
    console.log(`\n✔ All ${results.length} checks passed`);
    return 0;
  } catch (error) {
    console.error(`\n✖ Check failed: ${describeFirebaseError(error, target)}`);
    return 1;
  } finally {
    await closeAdminApp(app);
  }
}

main()
  .then((code) => process.exit(code))
  .catch((error: unknown) => {
    console.error(error);
    process.exit(1);
  });
