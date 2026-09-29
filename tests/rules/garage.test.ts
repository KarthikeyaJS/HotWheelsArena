/**
 * users/{uid}/garage/{productId} and users/{uid}/wishlist/{productId} rules.
 *
 * Garage: owner read; create ONLY { productId == docId, addedAt == request.time,
 * source 'manual', isFavorite bool, quantity int 1..99 } for a real product; update ONLY
 * isFavorite / quantity; delete by owner. Purchase entries come from placeOrder.
 * Wishlist: owner read / create { productId, addedAt } / delete; no updates.
 */
import {
  assertFails,
  assertSucceeds,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import {
  actors,
  clientTimestamp,
  createTestEnvironment,
  fieldValue,
  manualGarageWrite,
  productDoc,
  seed,
  SEEDED_AT,
  serverTimestamp,
  without,
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
    'products/p-2': productDoc('p-2', { rarity: 'limited' }),
    'products/p-3': productDoc('p-3'),
    // Written by placeOrder (Admin SDK).
    'users/alice/garage/p-2': {
      productId: 'p-2',
      addedAt: SEEDED_AT,
      source: 'purchase',
      isFavorite: false,
      quantity: 1,
    },
    'users/bob/garage/p-1': {
      productId: 'p-1',
      addedAt: SEEDED_AT,
      source: 'manual',
      isFavorite: true,
      quantity: 2,
    },
    'users/alice/wishlist/p-3': { productId: 'p-3', addedAt: SEEDED_AT },
    'users/bob/wishlist/p-1': { productId: 'p-1', addedAt: SEEDED_AT },
  });
});

describe('garage — reading', () => {
  it('the owner can read their garage (doc + collection)', async () => {
    await assertSucceeds(db.alice.doc('users/alice/garage/p-2').get());
    const snapshot = await assertSucceeds(db.alice.collection('users/alice/garage').get());
    expect(snapshot.size).toBe(1);
  });

  it("a collector cannot read someone else's garage", async () => {
    await assertFails(db.alice.doc('users/bob/garage/p-1').get());
    await assertFails(db.alice.collection('users/bob/garage').get());
  });

  it('signed-out visitors cannot read garages', async () => {
    await assertFails(db.anon.collection('users/alice/garage').get());
  });
});

describe('garage — parking a car manually (create)', () => {
  it("accepts the exact client shape with source 'manual'", async () => {
    await assertSucceeds(db.alice.doc('users/alice/garage/p-1').set(manualGarageWrite('p-1')));
  });

  it('accepts a favourite with duplicates', async () => {
    await assertSucceeds(
      db.alice
        .doc('users/alice/garage/p-1')
        .set(manualGarageWrite('p-1', { isFavorite: true, quantity: 3 })),
    );
  });

  it("rejects source 'purchase' (only placeOrder may write purchases)", async () => {
    await assertFails(
      db.alice.doc('users/alice/garage/p-1').set(manualGarageWrite('p-1', { source: 'purchase' })),
    );
  });

  it('rejects an unknown source', async () => {
    await assertFails(
      db.alice.doc('users/alice/garage/p-1').set(manualGarageWrite('p-1', { source: 'gift' })),
    );
  });

  it.each([
    ['price', 0],
    ['xp', 1000],
    ['rarity', 'limited'],
  ])('rejects the extra key %s', async (key, value) => {
    await assertFails(
      db.alice.doc('users/alice/garage/p-1').set(manualGarageWrite('p-1', { [key]: value })),
    );
  });

  it.each(['productId', 'addedAt', 'source', 'isFavorite', 'quantity'])(
    'rejects a create missing %s',
    async (key) => {
      await assertFails(
        db.alice.doc('users/alice/garage/p-1').set(without(manualGarageWrite('p-1'), key)),
      );
    },
  );

  it('rejects a productId that does not match the document id', async () => {
    await assertFails(db.alice.doc('users/alice/garage/p-1').set(manualGarageWrite('p-3')));
  });

  it('rejects a client-chosen addedAt (must be serverTimestamp())', async () => {
    await assertFails(
      db.alice
        .doc('users/alice/garage/p-1')
        .set(manualGarageWrite('p-1', { addedAt: clientTimestamp() })),
    );
  });

  it('rejects cars that are not in the catalogue', async () => {
    await assertFails(
      db.alice.doc('users/alice/garage/ghost-car').set(manualGarageWrite('ghost-car')),
    );
  });

  it.each([
    ['0', 0],
    ['-1', -1],
    ['100', 100],
    ['1.5 (not an integer)', 1.5],
    ["'2' (a string)", '2'],
  ])('rejects quantity %s', async (_label, quantity) => {
    await assertFails(
      db.alice.doc('users/alice/garage/p-1').set(manualGarageWrite('p-1', { quantity })),
    );
  });

  it.each([1, 99])('accepts the boundary quantity %i', async (quantity) => {
    await assertSucceeds(
      db.alice.doc('users/alice/garage/p-1').set(manualGarageWrite('p-1', { quantity })),
    );
  });

  it('rejects a non-boolean isFavorite', async () => {
    await assertFails(
      db.alice.doc('users/alice/garage/p-1').set(manualGarageWrite('p-1', { isFavorite: 'yes' })),
    );
  });

  it("rejects parking a car in someone else's garage", async () => {
    await assertFails(db.alice.doc('users/bob/garage/p-3').set(manualGarageWrite('p-3')));
  });

  it('rejects signed-out visitors', async () => {
    await assertFails(db.anon.doc('users/alice/garage/p-1').set(manualGarageWrite('p-1')));
  });
});

describe('garage — updating an entry', () => {
  it('the owner can favourite a purchased car', async () => {
    await assertSucceeds(db.alice.doc('users/alice/garage/p-2').update({ isFavorite: true }));
  });

  it('the owner can track duplicates (quantity 1..99)', async () => {
    await assertSucceeds(db.alice.doc('users/alice/garage/p-2').update({ quantity: 5 }));
    await assertSucceeds(
      db.alice.doc('users/alice/garage/p-2').update({ quantity: 99, isFavorite: true }),
    );
  });

  it.each([0, 100, 2.5])('rejects quantity %s on update', async (quantity) => {
    await assertFails(db.alice.doc('users/alice/garage/p-2').update({ quantity }));
  });

  it('rejects a non-boolean isFavorite on update', async () => {
    await assertFails(db.alice.doc('users/alice/garage/p-2').update({ isFavorite: 1 }));
  });

  it('validates the resulting quantity of an increment transform', async () => {
    await assertSucceeds(
      db.alice.doc('users/alice/garage/p-2').update({ quantity: fieldValue.increment(1) }),
    );
    await assertFails(
      db.alice.doc('users/alice/garage/p-2').update({ quantity: fieldValue.increment(500) }),
    );
  });

  it('immutable keys cannot be deleted', async () => {
    for (const key of ['productId', 'addedAt', 'source']) {
      await assertFails(
        db.alice.doc('users/alice/garage/p-2').update({ [key]: fieldValue.delete() }),
      );
    }
  });

  it('source is immutable (a purchase cannot be relabelled)', async () => {
    await assertFails(db.alice.doc('users/alice/garage/p-2').update({ source: 'manual' }));
  });

  it('a manual entry cannot be upgraded to a purchase', async () => {
    await assertSucceeds(db.alice.doc('users/alice/garage/p-1').set(manualGarageWrite('p-1')));
    await assertFails(db.alice.doc('users/alice/garage/p-1').update({ source: 'purchase' }));
  });

  it('addedAt and productId are immutable', async () => {
    await assertFails(
      db.alice.doc('users/alice/garage/p-2').update({ addedAt: serverTimestamp() }),
    );
    await assertFails(db.alice.doc('users/alice/garage/p-2').update({ productId: 'p-1' }));
  });

  it('no new keys can be added', async () => {
    await assertFails(db.alice.doc('users/alice/garage/p-2').update({ note: 'mint condition' }));
  });

  it('re-parking an existing car with set() is rejected (it would reset addedAt)', async () => {
    await assertFails(db.alice.doc('users/alice/garage/p-2').set(manualGarageWrite('p-2')));
  });

  it("a collector cannot update someone else's entry", async () => {
    await assertFails(db.alice.doc('users/bob/garage/p-1').update({ isFavorite: false }));
  });
});

describe('garage — removing an entry', () => {
  it('the owner can remove a car', async () => {
    await assertSucceeds(db.alice.doc('users/alice/garage/p-2').delete());
  });

  it("a collector cannot remove a car from someone else's garage", async () => {
    await assertFails(db.alice.doc('users/bob/garage/p-1').delete());
  });

  it('signed-out visitors cannot remove cars', async () => {
    await assertFails(db.anon.doc('users/alice/garage/p-2').delete());
  });
});

describe('wishlist', () => {
  const wishlistWrite = (productId: string) => ({ productId, addedAt: serverTimestamp() });

  it('the owner can read their wishlist', async () => {
    await assertSucceeds(db.alice.doc('users/alice/wishlist/p-3').get());
    await assertSucceeds(db.alice.collection('users/alice/wishlist').get());
  });

  it("a collector cannot read someone else's wishlist", async () => {
    await assertFails(db.alice.collection('users/bob/wishlist').get());
    await assertFails(db.anon.doc('users/alice/wishlist/p-3').get());
  });

  it('the owner can wishlist a car with { productId, addedAt: serverTimestamp() }', async () => {
    await assertSucceeds(db.alice.doc('users/alice/wishlist/p-1').set(wishlistWrite('p-1')));
  });

  it('rejects extra keys', async () => {
    await assertFails(
      db.alice.doc('users/alice/wishlist/p-1').set({ ...wishlistWrite('p-1'), priceAlert: 199 }),
    );
  });

  it('rejects a missing addedAt or a client-chosen timestamp', async () => {
    await assertFails(db.alice.doc('users/alice/wishlist/p-1').set({ productId: 'p-1' }));
    await assertFails(
      db.alice
        .doc('users/alice/wishlist/p-1')
        .set({ productId: 'p-1', addedAt: clientTimestamp() }),
    );
  });

  it('rejects a productId that does not match the document id', async () => {
    await assertFails(db.alice.doc('users/alice/wishlist/p-1').set(wishlistWrite('p-2')));
  });

  it('rejects cars that are not in the catalogue', async () => {
    await assertFails(
      db.alice.doc('users/alice/wishlist/ghost-car').set(wishlistWrite('ghost-car')),
    );
  });

  it('wishlist entries cannot be updated', async () => {
    await assertFails(
      db.alice.doc('users/alice/wishlist/p-3').update({ addedAt: serverTimestamp() }),
    );
    await assertFails(db.alice.doc('users/alice/wishlist/p-3').set(wishlistWrite('p-3')));
  });

  it('the owner can remove a wishlisted car', async () => {
    await assertSucceeds(db.alice.doc('users/alice/wishlist/p-3').delete());
  });

  it("a collector cannot write someone else's wishlist", async () => {
    await assertFails(db.alice.doc('users/bob/wishlist/p-2').set(wishlistWrite('p-2')));
    await assertFails(db.alice.doc('users/bob/wishlist/p-1').delete());
  });

  it('signed-out visitors cannot wishlist', async () => {
    await assertFails(db.anon.doc('users/alice/wishlist/p-1').set(wishlistWrite('p-1')));
  });
});
