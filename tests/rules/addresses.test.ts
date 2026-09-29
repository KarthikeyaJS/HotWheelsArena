/**
 * users/{uid}/addresses/{addressId}: owner CRUD with Indian-address validation that mirrors
 * the zod AddressSchema (shared/schemas.ts) and the write shape of
 * src/services/firestore/addresses.ts.
 */
import {
  assertFails,
  assertSucceeds,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { INDIAN_STATES } from '../../shared/india.ts';
import {
  actors,
  addressWrite,
  clientTimestamp,
  createTestEnvironment,
  readRules,
  seed,
  SEEDED_AT,
  serverTimestamp,
  without,
  type Actors,
  type DocData,
} from './helpers';

let env: RulesTestEnvironment;
let db: Actors;

const storedAddress = (overrides: DocData = {}): DocData => ({
  ...addressWrite(),
  isDefault: false,
  createdAt: SEEDED_AT,
  updatedAt: SEEDED_AT,
  ...overrides,
});

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
    'users/alice/addresses/home': storedAddress({ isDefault: true }),
    'users/alice/addresses/office': storedAddress({
      line1: 'Level 5, Prestige Tech Park',
      landmark: '',
    }),
    'users/bob/addresses/home': storedAddress({
      name: 'Bob Dsouza',
      city: 'Panaji',
      state: 'Goa',
      pincode: '403001',
    }),
  });
});

describe('addresses — reading', () => {
  it('the owner can read and list their saved addresses', async () => {
    await assertSucceeds(db.alice.doc('users/alice/addresses/home').get());
    const snapshot = await assertSucceeds(db.alice.collection('users/alice/addresses').get());
    expect(snapshot.size).toBe(2);
  });

  it("a collector cannot read someone else's addresses", async () => {
    await assertFails(db.alice.doc('users/bob/addresses/home').get());
    await assertFails(db.alice.collection('users/bob/addresses').get());
  });

  it('signed-out visitors and admins cannot read addresses', async () => {
    await assertFails(db.anon.collection('users/alice/addresses').get());
    await assertFails(db.admin.collection('users/alice/addresses').get());
  });
});

describe('addresses — creating', () => {
  it('accepts a valid Indian address', async () => {
    await assertSucceeds(db.alice.collection('users/alice/addresses').add(addressWrite()));
  });

  it('accepts a union territory and empty optional lines', async () => {
    await assertSucceeds(
      db.alice.collection('users/alice/addresses').add(
        addressWrite({
          state: 'Delhi',
          city: 'New Delhi',
          pincode: '110001',
          line2: '',
          landmark: '',
        }),
      ),
    );
  });

  it('accepts the longest allowed values', async () => {
    await assertSucceeds(
      db.alice.collection('users/alice/addresses').add(
        addressWrite({
          name: 'n'.repeat(80),
          line1: 'l'.repeat(120),
          line2: 'l'.repeat(120),
          landmark: 'm'.repeat(80),
          city: 'c'.repeat(60),
        }),
      ),
    );
  });

  const INVALID: Array<[string, DocData]> = [
    ['a phone starting with 5', { phone: '5876543210' }],
    ['a 9-digit phone', { phone: '987654321' }],
    ['a phone with +91', { phone: '+919876543210' }],
    ['a numeric phone', { phone: 9876543210 }],
    ['a PIN code starting with 0', { pincode: '060001' }],
    ['a 5-digit PIN code', { pincode: '56001' }],
    ['a PIN code with letters', { pincode: '56OO01' }],
    ['an unknown state', { state: 'Bangalore' }],
    ['a lower-case state', { state: 'karnataka' }],
    ['a one-letter name', { name: 'A' }],
    ['a name over 80 characters', { name: 'n'.repeat(81) }],
    ['a short line1', { line1: 'abc' }],
    ['a line1 over 120 characters', { line1: 'l'.repeat(121) }],
    ['a line2 over 120 characters', { line2: 'l'.repeat(121) }],
    ['a landmark over 80 characters', { landmark: 'm'.repeat(81) }],
    ['a one-letter city', { city: 'B' }],
    ['a city over 60 characters', { city: 'c'.repeat(61) }],
    ['a null line2', { line2: null }],
    ['a non-boolean isDefault', { isDefault: 'yes' }],
    ['a client-chosen createdAt', { createdAt: clientTimestamp() }],
    ['a client-chosen updatedAt', { updatedAt: clientTimestamp() }],
    ['an extra field', { gstin: '29ABCDE1234F1Z5' }],
  ];

  it.each(INVALID)('rejects %s', async (_label, overrides) => {
    await assertFails(db.alice.collection('users/alice/addresses').add(addressWrite(overrides)));
  });

  it.each([
    'name',
    'phone',
    'pincode',
    'line1',
    'line2',
    'landmark',
    'city',
    'state',
    'isDefault',
    'createdAt',
    'updatedAt',
  ])('rejects an address missing %s', async (key) => {
    await assertFails(
      db.alice.collection('users/alice/addresses').add(without(addressWrite(), key)),
    );
  });

  it("rejects writing into someone else's address book", async () => {
    await assertFails(db.alice.collection('users/bob/addresses').add(addressWrite()));
  });

  it('rejects signed-out visitors', async () => {
    await assertFails(db.anon.collection('users/alice/addresses').add(addressWrite()));
  });
});

describe('addresses — updating', () => {
  it('accepts a merge update that keeps createdAt (saveAddress with an id)', async () => {
    const { createdAt: _createdAt, ...fields } = addressWrite({
      line1: '42 Residency Road',
      isDefault: true,
    });
    await assertSucceeds(db.alice.doc('users/alice/addresses/office').set(fields, { merge: true }));
  });

  it('accepts clearing the default flag on another address (batch.update)', async () => {
    await assertSucceeds(
      db.alice
        .doc('users/alice/addresses/home')
        .update({ isDefault: false, updatedAt: serverTimestamp() }),
    );
  });

  it('rejects changing createdAt', async () => {
    await assertFails(
      db.alice
        .doc('users/alice/addresses/home')
        .update({ createdAt: serverTimestamp(), updatedAt: serverTimestamp() }),
    );
  });

  it('rejects an update that does not refresh updatedAt', async () => {
    await assertFails(db.alice.doc('users/alice/addresses/home').update({ city: 'Mysuru' }));
  });

  it('rejects an update that makes the address invalid', async () => {
    await assertFails(
      db.alice
        .doc('users/alice/addresses/home')
        .update({ phone: '12345', updatedAt: serverTimestamp() }),
    );
    await assertFails(
      db.alice
        .doc('users/alice/addresses/home')
        .update({ nickname: 'Home', updatedAt: serverTimestamp() }),
    );
  });

  it("rejects updating someone else's address", async () => {
    await assertFails(
      db.alice
        .doc('users/bob/addresses/home')
        .update({ city: 'Margao', updatedAt: serverTimestamp() }),
    );
  });
});

describe('addresses — deleting', () => {
  it('the owner can delete an address', async () => {
    await assertSucceeds(db.alice.doc('users/alice/addresses/office').delete());
  });

  it("a collector cannot delete someone else's address", async () => {
    await assertFails(db.alice.doc('users/bob/addresses/home').delete());
  });
});

describe('rules ↔ shared/india.ts', () => {
  it('the rules state list mirrors INDIAN_STATES exactly', () => {
    const body = /function indianStates\(\)\s*\{\s*return\s*\[([\s\S]*?)\];/.exec(readRules())?.[1];
    expect(body, 'indianStates() not found in firestore.rules').toBeDefined();
    const ruleStates = [...(body ?? '').matchAll(/'([^']+)'/g)].map((match) => match[1]);
    expect(ruleStates).toEqual([...INDIAN_STATES]);
  });

  it('every state and union territory is accepted', async () => {
    const book = db.alice.collection('users/alice/addresses');
    for (const state of INDIAN_STATES) {
      await assertSucceeds(book.add(addressWrite({ state })));
    }
  });
});
