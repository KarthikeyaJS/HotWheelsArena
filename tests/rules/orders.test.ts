/**
 * orders/{orderId}: created only by the placeOrder callable. Collectors read their own
 * orders (get + the `where uid == me orderBy createdAt desc` list); admins read everything and
 * may move an order's status.
 */
import {
  assertFails,
  assertSucceeds,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import firebase from 'firebase/compat/app';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import {
  ALICE,
  BOB,
  actors,
  createTestEnvironment,
  orderDoc,
  seed,
  serverTimestamp,
  type Actors,
} from './helpers';

let env: RulesTestEnvironment;
let db: Actors;

const at = (iso: string) => firebase.firestore.Timestamp.fromDate(new Date(iso));

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
    'orders/alice-1': orderDoc(ALICE, { createdAt: at('2026-02-01T09:00:00Z') }),
    'orders/alice-2': orderDoc(ALICE, { createdAt: at('2026-03-01T09:00:00Z'), status: 'shipped' }),
    'orders/bob-1': orderDoc(BOB),
  });
});

const myOrders = (client: firebase.firestore.Firestore, uid: string) =>
  client.collection('orders').where('uid', '==', uid).orderBy('createdAt', 'desc').limit(50);

describe('orders — collectors', () => {
  it('a collector can get their own order', async () => {
    await assertSucceeds(db.alice.doc('orders/alice-1').get());
  });

  it('a collector can list their own orders, newest first', async () => {
    const snapshot = await assertSucceeds(myOrders(db.alice, ALICE).get());
    expect(snapshot.docs.map((doc) => doc.id)).toEqual(['alice-2', 'alice-1']);
  });

  it("a collector cannot get someone else's order", async () => {
    await assertFails(db.alice.doc('orders/bob-1').get());
  });

  it("a collector cannot query someone else's orders", async () => {
    await assertFails(myOrders(db.alice, BOB).get());
  });

  it('an unfiltered orders query is rejected for collectors', async () => {
    await assertFails(db.alice.collection('orders').get());
  });

  it('an unknown order id reads as missing (not permission-denied) for signed-in users', async () => {
    const snapshot = await assertSucceeds(db.alice.doc('orders/does-not-exist').get());
    expect(snapshot.exists).toBe(false);
  });

  it('signed-out visitors cannot read orders at all', async () => {
    await assertFails(db.anon.doc('orders/alice-1').get());
    await assertFails(db.anon.doc('orders/does-not-exist').get());
    await assertFails(myOrders(db.anon, ALICE).get());
  });

  it('a collector cannot create an order, even for themselves (placeOrder only)', async () => {
    await assertFails(
      db.alice
        .doc('orders/forged')
        .set(orderDoc(ALICE, { total: 1, createdAt: serverTimestamp() })),
    );
    await assertFails(db.alice.collection('orders').add(orderDoc(ALICE)));
  });

  it('a collector cannot update their own order', async () => {
    await assertFails(
      db.alice.doc('orders/alice-1').update({ status: 'delivered', updatedAt: serverTimestamp() }),
    );
    await assertFails(db.alice.doc('orders/alice-1').update({ total: 0 }));
  });

  it('a collector cannot delete their own order', async () => {
    await assertFails(db.alice.doc('orders/alice-1').delete());
  });
});

describe('orders — admins', () => {
  it('an admin can get any order and list all orders', async () => {
    await assertSucceeds(db.admin.doc('orders/bob-1').get());
    const snapshot = await assertSucceeds(db.admin.collection('orders').get());
    expect(snapshot.size).toBe(3);
  });

  it('an admin can move an order to the next status', async () => {
    await assertSucceeds(
      db.admin.doc('orders/alice-1').update({ status: 'processing', updatedAt: serverTimestamp() }),
    );
    await assertSucceeds(
      db.admin.doc('orders/alice-2').update({ status: 'delivered', updatedAt: serverTimestamp() }),
    );
  });

  it('an admin cannot set an unknown status', async () => {
    await assertFails(
      db.admin.doc('orders/alice-1').update({ status: 'lost', updatedAt: serverTimestamp() }),
    );
  });

  it('an admin status change must stamp updatedAt with the server time', async () => {
    await assertFails(db.admin.doc('orders/alice-1').update({ status: 'processing' }));
  });

  it('an admin cannot edit money, items or ownership', async () => {
    await assertFails(
      db.admin.doc('orders/alice-1').update({ total: 1, updatedAt: serverTimestamp() }),
    );
    await assertFails(
      db.admin.doc('orders/alice-1').update({ items: [], updatedAt: serverTimestamp() }),
    );
    await assertFails(
      db.admin.doc('orders/alice-1').update({ uid: BOB, updatedAt: serverTimestamp() }),
    );
  });

  it('an admin cannot create or delete orders from the client', async () => {
    await assertFails(db.admin.doc('orders/admin-made').set(orderDoc(ALICE)));
    await assertFails(db.admin.doc('orders/alice-1').delete());
  });
});
