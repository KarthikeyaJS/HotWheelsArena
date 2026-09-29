/**
 * Function-only collections (newsletter, rateLimits, processedPayments) and the default-deny
 * catch-all: no client — signed out, collector or admin — may read or write them.
 */
import { assertFails, type RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';
import {
  actors,
  createTestEnvironment,
  seed,
  SEEDED_AT,
  serverTimestamp,
  type Actors,
  type Db,
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
    'newsletter/seeded': { email: 'collector@example.com', createdAt: SEEDED_AT },
    'rateLimits/seeded': { count: 3, windowStart: SEEDED_AT },
    'processedPayments/seeded': { orderId: 'alice-1', uid: 'alice', createdAt: SEEDED_AT },
    'secrets/seeded': { value: 'nope' },
  });
});

const LOCKED_COLLECTIONS = ['newsletter', 'rateLimits', 'processedPayments', 'secrets'];
const ACTORS: Array<keyof Actors> = ['anon', 'alice', 'admin'];

const cases = LOCKED_COLLECTIONS.flatMap((collection) =>
  ACTORS.map((actor) => [collection, actor] as const),
);

describe('function-only and unknown collections', () => {
  it.each(cases)(
    '%s: %s cannot read a document or list the collection',
    async (collection, actor) => {
      const client: Db = db[actor];
      await assertFails(client.doc(`${collection}/seeded`).get());
      await assertFails(client.collection(collection).get());
    },
  );

  it.each(cases)('%s: %s cannot create a document', async (collection, actor) => {
    const client: Db = db[actor];
    await assertFails(
      client
        .doc(`${collection}/new-doc`)
        .set({ email: 'someone@example.com', createdAt: serverTimestamp() }),
    );
  });

  it.each(cases)('%s: %s cannot update or delete a document', async (collection, actor) => {
    const client: Db = db[actor];
    await assertFails(client.doc(`${collection}/seeded`).update({ createdAt: serverTimestamp() }));
    await assertFails(client.doc(`${collection}/seeded`).delete());
  });

  it('a collector cannot subscribe themselves to the newsletter directly', async () => {
    await assertFails(
      db.alice
        .collection('newsletter')
        .add({ email: 'alice@example.com', createdAt: serverTimestamp() }),
    );
  });

  it('a collector cannot reset their own rate limit counter', async () => {
    await assertFails(db.alice.doc('rateLimits/placeOrder_alice').set({ count: 0 }));
  });

  it('a collector cannot pre-register a payment transaction id', async () => {
    await assertFails(
      db.alice
        .doc('processedPayments/test_0123456789abcdef0123')
        .set({ orderId: 'forged', uid: 'alice' }),
    );
  });
});
