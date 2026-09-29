/**
 * HotWheelsArena — Firestore seed.
 *
 * Writes the launch catalogue — 6 categories, 6 series, 36 products with their reviews and the
 * `settings/site` document — using deterministic document ids, so re-running is idempotent.
 * Every catalogue invariant is validated first; any violation aborts with exit code 1 before a
 * single write happens.
 *
 *   npx tsx scripts/seed.ts --dry-run                 validate + print the plan (no Firebase)
 *   npx tsx scripts/seed.ts --emulator                seed the local Firestore emulator
 *   npx tsx scripts/seed.ts --emulator --reset        wipe seeded collections, then seed
 *   npx tsx scripts/seed.ts --project my-project      seed a live project (service account)
 *
 * (`npm run seed -- <flags>` and `npm run seed:emulator` run the same script.)
 * Run with --help for every flag. Users and orders are never touched.
 */
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import {
  getFirestore,
  type DocumentData,
  type DocumentReference,
  type Firestore,
  type Query,
} from 'firebase-admin/firestore';
import { COLLECTIONS, SUBCOLLECTIONS } from '../shared/constants.ts';
import { buildSeedCatalog, type SeedCatalog } from './data/index.ts';
import { timestamped, toStoredDoc } from './lib/documents.ts';
import {
  closeAdminApp,
  describeFirebaseError,
  initAdminApp,
  resolveTarget,
  TargetError,
  type Target,
} from './lib/firebase.ts';
import { aggregateRatings, clampRating } from './lib/ratings.ts';
import { renderTable, type Cell } from './lib/table.ts';
import { validateCatalog, type ValidationResult } from './lib/validate.ts';

/** Firestore allows 500 writes per batch; stay well below it. */
const MAX_BATCH_OPS = 450;

/** Collections owned by the seed. `--reset` deletes these (recursively) and nothing else. */
const SEEDED_COLLECTIONS = [
  COLLECTIONS.products,
  COLLECTIONS.categories,
  COLLECTIONS.series,
  COLLECTIONS.settings,
] as const;

const PLACEHOLDERS_DIR = fileURLToPath(new URL('../public/placeholders', import.meta.url));

const USAGE = `
HotWheelsArena seed — writes the launch catalogue to Firestore.

Usage
  npx tsx scripts/seed.ts [flags]          (or: npm run seed -- [flags])

Flags
  --emulator         Target the Firestore emulator: FIRESTORE_EMULATOR_HOST if set,
                     else 127.0.0.1:8080. Project "demo-hotwheelsarena" unless --project.
  --project <id>     Firebase project id. Live mode (no --emulator) authenticates with
                     Application Default Credentials (GOOGLE_APPLICATION_CREDENTIALS).
  --reset            Delete the seeded collections first: products (+ their reviews),
                     categories, series and settings. Never touches users or orders.
  --yes, -y          Required together with --reset when targeting a LIVE project.
  --dry-run          Validate and print the plan without connecting to Firebase.
  --help, -h         Show this help.

Examples
  npm run seed -- --dry-run
  npm run seed:emulator
  npm run seed -- --emulator --reset
  GOOGLE_APPLICATION_CREDENTIALS=./service-account.json npm run seed -- --project my-project
`;

interface CliOptions {
  emulator: boolean;
  project: string | undefined;
  reset: boolean;
  dryRun: boolean;
  yes: boolean;
  help: boolean;
}

class UsageError extends Error {
  override name = 'UsageError';
}

function parseCli(argv: readonly string[]): CliOptions {
  try {
    const { values } = parseArgs({
      args: [...argv],
      options: {
        emulator: { type: 'boolean', default: false },
        project: { type: 'string' },
        reset: { type: 'boolean', default: false },
        'dry-run': { type: 'boolean', default: false },
        yes: { type: 'boolean', short: 'y', default: false },
        help: { type: 'boolean', short: 'h', default: false },
      },
      strict: true,
      allowPositionals: false,
    });
    if (values.project !== undefined && !values.project.trim()) {
      throw new UsageError('--project needs a project id');
    }
    return {
      emulator: values.emulator,
      project: values.project?.trim(),
      reset: values.reset,
      dryRun: values['dry-run'],
      yes: values.yes,
      help: values.help,
    };
  } catch (error) {
    if (error instanceof UsageError) throw error;
    throw new UsageError(error instanceof Error ? error.message : String(error));
  }
}

/* --------------------------------- output --------------------------------- */

const formatNumber = (value: number): string => new Intl.NumberFormat('en-IN').format(value);
const formatRupees = (value: number): string => `₹${formatNumber(value)}`;

function printValidation(result: ValidationResult, catalog: SeedCatalog): void {
  for (const warning of result.warnings) console.warn(`  ! ${warning}`);
  if (result.errors.length > 0) {
    console.error(`\n✖ Catalogue validation failed with ${result.errors.length} error(s):`);
    for (const message of result.errors) console.error(`  ✖ ${message}`);
    return;
  }
  console.log(
    `✔ Catalogue validated — ${catalog.products.length} products, ${catalog.categories.length} categories, ` +
      `${catalog.series.length} series, ${catalog.reviews.length} reviews` +
      (result.warnings.length > 0 ? ` (${result.warnings.length} warning(s))` : ''),
  );
}

function printCatalogSummary(catalog: SeedCatalog): void {
  const { products, reviews, categories, series } = catalog;
  const reviewed = new Set(reviews.map((review) => review.productId));
  const rows: Cell[][] = categories
    .slice()
    .sort((a, b) => a.order - b.order)
    .map((category) => {
      const cars = products.filter((product) => product.category === category.id);
      return [
        category.name,
        cars.length,
        cars.filter((product) => product.isNew).length,
        cars.filter((product) => product.isFeatured).length,
        cars.filter((product) => product.isVault).length,
        cars.filter((product) => product.stock === 0).length,
        cars.filter((product) => reviewed.has(product.id)).length,
      ];
    });
  const count = (predicate: (product: (typeof products)[number]) => boolean): number =>
    products.filter(predicate).length;
  console.log(
    `\n${renderTable(
      [
        { header: 'Category' },
        { header: 'Cars', align: 'right' },
        { header: 'New', align: 'right' },
        { header: 'Featured', align: 'right' },
        { header: 'Vault', align: 'right' },
        { header: 'Sold out', align: 'right' },
        { header: 'Reviewed', align: 'right' },
      ],
      rows,
      {
        footer: [
          'Total',
          products.length,
          count((p) => p.isNew),
          count((p) => p.isFeatured),
          count((p) => p.isVault),
          count((p) => p.stock === 0),
          reviewed.size,
        ],
      },
    )}`,
  );

  const rarityMix = (['common', 'rare', 'super-rare', 'limited'] as const)
    .map((rarity) => `${count((p) => p.rarity === rarity)} ${rarity}`)
    .join(' · ');
  const prices = products.map((product) => product.price);
  const scales = new Map<string, number>();
  for (const product of products) scales.set(product.scale, (scales.get(product.scale) ?? 0) + 1);
  console.log(`  Rarity   ${rarityMix}`);
  console.log(
    `  Prices   ${formatRupees(Math.min(...prices))}–${formatRupees(Math.max(...prices))} · ` +
      `${count((p) => p.compareAtPrice !== null)} on sale · scales ${[...scales]
        .map(([scale, n]) => `${scale} ×${n}`)
        .join(', ')}`,
  );
  console.log(
    `  Series   ${series.map((entry) => `${entry.name} ${entry.year} (${entry.totalCars})`).join(' · ')}`,
  );
}

/* -------------------------------- firestore ------------------------------- */

interface WriteOp {
  label: string;
  ref: DocumentReference;
  data: DocumentData;
}

type ResetCounts = Record<(typeof SEEDED_COLLECTIONS)[number] | 'reviews', number>;

async function countDocs(query: Query): Promise<number> {
  const snapshot = await query.count().get();
  return snapshot.data().count;
}

/** Recursively deletes the seeded collections (products take their reviews with them). */
async function resetCollections(db: Firestore): Promise<ResetCounts> {
  const counts: ResetCounts = { products: 0, categories: 0, series: 0, settings: 0, reviews: 0 };
  counts.reviews = await countDocs(db.collectionGroup(SUBCOLLECTIONS.reviews));
  for (const name of SEEDED_COLLECTIONS) {
    const collection = db.collection(name);
    counts[name] = await countDocs(collection);
    await db.recursiveDelete(collection);
  }
  return counts;
}

/**
 * Ratings of reviews already stored under each product, keyed by reviewer uid. Used so a
 * re-seed keeps rating aggregates consistent with reviews that collectors submitted through the
 * app (those documents are left untouched by a non-reset seed).
 */
async function readExistingRatings(
  db: Firestore,
  productIds: readonly string[],
): Promise<Map<string, Map<string, number>>> {
  const entries = await Promise.all(
    productIds.map(async (productId) => {
      const snapshot = await db
        .collection(COLLECTIONS.products)
        .doc(productId)
        .collection(SUBCOLLECTIONS.reviews)
        .select('rating')
        .get();
      const ratings = new Map<string, number>();
      for (const doc of snapshot.docs) {
        const rating: unknown = doc.get('rating');
        if (typeof rating === 'number' && Number.isFinite(rating)) {
          ratings.set(doc.id, clampRating(rating));
        }
      }
      return [productId, ratings] as const;
    }),
  );
  return new Map(entries);
}

interface WritePlan {
  ops: WriteOp[];
  counts: Record<string, number>;
  /** Reviews submitted through the app that were folded into the rating aggregates. */
  preservedReviews: number;
}

function planWrites(
  db: Firestore,
  catalog: SeedCatalog,
  existingRatings: Map<string, Map<string, number>>,
): WritePlan {
  const ops: WriteOp[] = [];
  const counts: Record<string, number> = {};
  const add = (label: string, ref: DocumentReference, data: DocumentData): void => {
    ops.push({ label, ref, data });
    counts[label] = (counts[label] ?? 0) + 1;
  };

  for (const category of catalog.categories) {
    add(
      COLLECTIONS.categories,
      db.collection(COLLECTIONS.categories).doc(category.id),
      toStoredDoc(category),
    );
  }
  for (const entry of catalog.series) {
    add(COLLECTIONS.series, db.collection(COLLECTIONS.series).doc(entry.id), toStoredDoc(entry));
  }

  let preservedReviews = 0;
  for (const product of catalog.products) {
    const ratings = new Map(existingRatings.get(product.id) ?? []);
    const seededUids = new Set<string>();
    for (const review of catalog.reviews) {
      if (review.productId !== product.id) continue;
      ratings.set(review.uid, review.rating);
      seededUids.add(review.uid);
    }
    preservedReviews += [...ratings.keys()].filter((uid) => !seededUids.has(uid)).length;
    add(
      COLLECTIONS.products,
      db.collection(COLLECTIONS.products).doc(product.id),
      toStoredDoc({ ...product, ...aggregateRatings(ratings.values()) }),
    );
  }

  const reviewsLabel = `${COLLECTIONS.products}/*/${SUBCOLLECTIONS.reviews}`;
  for (const review of catalog.reviews) {
    add(
      reviewsLabel,
      db
        .collection(COLLECTIONS.products)
        .doc(review.productId)
        .collection(SUBCOLLECTIONS.reviews)
        .doc(review.uid),
      toStoredDoc(review),
    );
  }

  add(
    COLLECTIONS.settings,
    db.collection(COLLECTIONS.settings).doc(catalog.settingsDocId),
    timestamped(catalog.settings),
  );

  return { ops, counts, preservedReviews };
}

async function commitInBatches(db: Firestore, ops: readonly WriteOp[]): Promise<number> {
  let batches = 0;
  for (let start = 0; start < ops.length; start += MAX_BATCH_OPS) {
    const batch = db.batch();
    for (const op of ops.slice(start, start + MAX_BATCH_OPS)) batch.set(op.ref, op.data);
    await batch.commit();
    batches += 1;
  }
  return batches;
}

/* ---------------------------------- main ---------------------------------- */

async function main(): Promise<number> {
  let options: CliOptions;
  try {
    options = parseCli(process.argv.slice(2));
  } catch (error) {
    console.error(`✖ ${error instanceof Error ? error.message : String(error)}`);
    console.error(USAGE);
    return 2;
  }
  if (options.help) {
    console.log(USAGE);
    return 0;
  }

  const startedAt = Date.now();
  const catalog = buildSeedCatalog(new Date());
  console.log('HotWheelsArena seed');
  const validation = validateCatalog(catalog, { placeholdersDir: PLACEHOLDERS_DIR });
  printValidation(validation, catalog);
  if (validation.errors.length > 0) return 1;
  printCatalogSummary(catalog);

  if (options.dryRun) {
    const docCount =
      catalog.categories.length +
      catalog.series.length +
      catalog.products.length +
      catalog.reviews.length +
      1;
    console.log(
      `\n✔ Dry run — nothing written. A real run would ${options.reset ? `delete ${SEEDED_COLLECTIONS.join(', ')} (with reviews) and then ` : ''}write ${docCount} documents.`,
    );
    return 0;
  }

  let target: Target | null = null;
  try {
    target = resolveTarget({
      service: 'firestore',
      emulator: options.emulator,
      project: options.project,
    });
  } catch (error) {
    if (error instanceof TargetError) {
      console.error(`\n✖ ${error.message}`);
      return 1;
    }
    throw error;
  }
  for (const note of target.notes) console.log(`  i ${note}`);
  if (target.mode === 'live' && options.reset && !options.yes) {
    console.error(
      `\n✖ Refusing to --reset LIVE project "${target.projectId}" without --yes. This permanently deletes ${SEEDED_COLLECTIONS.join(', ')} and all product reviews.`,
    );
    return 1;
  }
  console.log(
    `\n→ Target: ${target.label}${target.mode === 'live' ? '  (writing to a real project)' : ''}`,
  );

  const app = initAdminApp(target, `seed-${Date.now()}`);
  try {
    const db = getFirestore(app);

    let resetCounts: ResetCounts | null = null;
    if (options.reset) {
      console.log(`→ Resetting ${SEEDED_COLLECTIONS.join(', ')} (and product reviews)…`);
      resetCounts = await resetCollections(db);
    }

    const existingRatings = resetCounts
      ? new Map<string, Map<string, number>>()
      : await readExistingRatings(
          db,
          catalog.products.map((product) => product.id),
        );
    const plan = planWrites(db, catalog, existingRatings);
    const batchCount = Math.ceil(plan.ops.length / MAX_BATCH_OPS);
    console.log(
      `→ Writing ${plan.ops.length} documents in ${batchCount} batch(es) of ≤ ${MAX_BATCH_OPS}…`,
    );
    await commitInBatches(db, plan.ops);

    const deletedFor = (label: string): Cell => {
      if (!resetCounts) return '-';
      if (label === COLLECTIONS.products) return resetCounts.products;
      if (label === COLLECTIONS.categories) return resetCounts.categories;
      if (label === COLLECTIONS.series) return resetCounts.series;
      if (label === COLLECTIONS.settings) return resetCounts.settings;
      return resetCounts.reviews;
    };
    const labels = Object.keys(plan.counts);
    const totalDeleted = resetCounts
      ? resetCounts.products +
        resetCounts.categories +
        resetCounts.series +
        resetCounts.settings +
        resetCounts.reviews
      : '-';
    console.log(
      `\n${renderTable(
        [
          { header: 'Collection' },
          { header: 'Deleted', align: 'right' },
          { header: 'Written', align: 'right' },
        ],
        labels.map((label) => [label, deletedFor(label), plan.counts[label] ?? 0]),
        { footer: ['Total', totalDeleted, plan.ops.length] },
      )}`,
    );
    if (plan.preservedReviews > 0) {
      console.log(
        `  i Kept ${plan.preservedReviews} collector review(s) submitted through the app in the rating aggregates.`,
      );
    }
    console.log(`\n✔ Seeded ${target.label} in ${((Date.now() - startedAt) / 1000).toFixed(1)} s`);
    return 0;
  } catch (error) {
    console.error(`\n✖ Seeding failed: ${describeFirebaseError(error, target)}`);
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
