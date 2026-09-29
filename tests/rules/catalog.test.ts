/**
 * Catalogue rules: products, categories, series, settings (public read, admin-claim write)
 * and product reviews (public read, writes only through the submitReview callable).
 */
import {
  assertFails,
  assertSucceeds,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import {
  ALICE,
  actorWithClaims,
  actors,
  createTestEnvironment,
  productDoc,
  profileDoc,
  seed,
  SEEDED_AT,
  serverTimestamp,
  type Actors,
} from './helpers';

let env: RulesTestEnvironment;
let db: Actors;

beforeAll(async () => {
  env = await createTestEnvironment();
});

afterAll(async () => {
  await env.cleanup();
});

beforeEach(async () => {
  await env.clearFirestore();
  db = actors(env);
  await seed(env, {
    'products/p-1': productDoc('p-1'),
    'products/p-retired': productDoc('p-retired', { isActive: false }),
    'categories/racing': {
      name: 'Racing',
      slug: 'racing',
      icon: 'Flag',
      order: 3,
      description: '',
      isActive: true,
      createdAt: SEEDED_AT,
      updatedAt: SEEDED_AT,
    },
    'series/hw-test-2026': {
      name: 'HW Test',
      slug: 'hw-test-2026',
      year: 2026,
      totalCars: 1,
      carIds: ['p-1'],
      description: '',
      isActive: true,
      createdAt: SEEDED_AT,
      updatedAt: SEEDED_AT,
    },
    'settings/site': {
      shippingThreshold: 999,
      shippingFee: 79,
      taxRate: 0.18,
      taxInclusive: true,
      showGstLine: true,
      codEnabled: true,
      maxQtyPerItem: 10,
      createdAt: SEEDED_AT,
      updatedAt: SEEDED_AT,
    },
    'products/p-1/reviews/bob': {
      productId: 'p-1',
      uid: 'bob',
      displayName: 'Bob',
      photoURL: null,
      rating: 5,
      text: 'Flawless paint, fast wheels.',
      verifiedBuyer: true,
      createdAt: SEEDED_AT,
      updatedAt: SEEDED_AT,
    },
  });
});

const CATALOGUE_DOCS = [
  'products/p-1',
  'categories/racing',
  'series/hw-test-2026',
  'settings/site',
];

describe('catalogue reads', () => {
  it.each(CATALOGUE_DOCS)('%s is readable by signed-out visitors', async (path) => {
    await assertSucceeds(db.anon.doc(path).get());
  });

  it.each(CATALOGUE_DOCS)('%s is readable by signed-in collectors', async (path) => {
    await assertSucceeds(db.alice.doc(path).get());
  });

  it('lists active products, categories and series without signing in', async () => {
    const products = await assertSucceeds(
      db.anon.collection('products').where('isActive', '==', true).get(),
    );
    expect(products.docs.map((doc) => doc.id)).toEqual(['p-1']);
    await assertSucceeds(db.anon.collection('categories').where('isActive', '==', true).get());
    await assertSucceeds(db.anon.collection('series').where('isActive', '==', true).get());
  });

  it('reads a product by slug the way the product page does', async () => {
    await assertSucceeds(
      db.anon
        .collection('products')
        .where('slug', '==', 'p-1')
        .where('isActive', '==', true)
        .limit(1)
        .get(),
    );
  });

  it('reads a retired (inactive) product by id for garage / wishlist views', async () => {
    await assertSucceeds(db.alice.doc('products/p-retired').get());
  });
});

describe('catalogue writes', () => {
  it.each(CATALOGUE_DOCS)('%s cannot be written by signed-out visitors', async (path) => {
    await assertFails(db.anon.doc(path).set({ name: 'Hacked' }, { merge: true }));
    await assertFails(db.anon.doc(path).delete());
  });

  it.each(CATALOGUE_DOCS)(
    '%s cannot be written by a collector without the admin claim',
    async (path) => {
      await assertFails(db.alice.doc(path).update({ updatedAt: serverTimestamp() }));
      await assertFails(db.alice.doc(path).delete());
    },
  );

  it('collectors cannot create products, categories, series or settings', async () => {
    await assertFails(db.alice.doc('products/p-new').set(productDoc('p-new')));
    await assertFails(db.alice.doc('categories/new').set({ name: 'New', isActive: true }));
    await assertFails(db.alice.doc('series/new').set({ name: 'New', isActive: true }));
    await assertFails(db.alice.doc('settings/site').set({ shippingThreshold: 0 }));
  });

  it('collectors cannot set a product price or stock', async () => {
    await assertFails(db.alice.doc('products/p-1').update({ price: 1 }));
    await assertFails(db.alice.doc('products/p-1').update({ stock: 9999 }));
  });

  it.each(CATALOGUE_DOCS)('%s can be updated and deleted by an admin', async (path) => {
    await assertSucceeds(db.admin.doc(path).update({ updatedAt: serverTimestamp() }));
    await assertSucceeds(db.admin.doc(path).delete());
  });

  it('an admin can create catalogue documents', async () => {
    await assertSucceeds(db.admin.doc('products/p-new').set(productDoc('p-new')));
    await assertSucceeds(
      db.admin.doc('categories/rescue').set({ name: 'Rescue', slug: 'rescue', isActive: true }),
    );
    await assertSucceeds(
      db.admin.doc('series/hw-new-2026').set({ name: 'HW New', isActive: true }),
    );
    await assertSucceeds(
      db.admin.doc('settings/site').set({ shippingThreshold: 1499 }, { merge: true }),
    );
  });

  it('an explicit admin: false claim is not an admin', async () => {
    const eve = actorWithClaims(env, 'eve', { admin: false });
    await assertFails(eve.doc('products/p-1').update({ price: 1 }));
  });

  it('a truthy but non-boolean admin claim is not an admin', async () => {
    const eve = actorWithClaims(env, 'eve', { admin: 'true' });
    await assertFails(eve.doc('products/p-1').update({ price: 1 }));
  });

  it('an admin-looking role field on the profile document grants nothing', async () => {
    await seed(env, { 'users/alice': profileDoc(ALICE, { role: 'admin' }) });
    await assertFails(db.alice.doc('products/p-1').update({ price: 1 }));
  });
});

describe('reviews (products/{id}/reviews)', () => {
  it('are publicly readable, newest first', async () => {
    await assertSucceeds(db.anon.doc('products/p-1/reviews/bob').get());
    await assertSucceeds(
      db.anon.collection('products/p-1/reviews').orderBy('createdAt', 'desc').limit(20).get(),
    );
  });

  it('cannot be created by a signed-in collector (submitReview callable only)', async () => {
    await assertFails(
      db.alice.doc('products/p-1/reviews/alice').set({
        productId: 'p-1',
        uid: ALICE,
        displayName: 'Alice',
        photoURL: null,
        rating: 5,
        text: 'Best car in my collection!',
        verifiedBuyer: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }),
    );
  });

  it('cannot be edited or deleted by their author', async () => {
    await assertFails(db.bob.doc('products/p-1/reviews/bob').update({ rating: 1 }));
    await assertFails(db.bob.doc('products/p-1/reviews/bob').delete());
  });

  it('cannot be written by signed-out visitors or admins from the client', async () => {
    await assertFails(
      db.anon.doc('products/p-1/reviews/anon').set({ rating: 1, text: 'spam spam spam' }),
    );
    await assertFails(db.admin.doc('products/p-1/reviews/bob').delete());
  });

  it('collectors cannot fake rating aggregates on the product', async () => {
    await assertFails(db.alice.doc('products/p-1').update({ ratingAvg: 5, ratingCount: 999 }));
  });
});
