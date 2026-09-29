/**
 * users/{uid} profile rules: owner (and admin) read, function-only creation, and a client
 * update surface limited to displayName / photoURL / updatedAt (server time).
 */
import {
  assertFails,
  assertSucceeds,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import {
  ALICE,
  BOB,
  actors,
  clientTimestamp,
  createTestEnvironment,
  fieldValue,
  profileDoc,
  seed,
  serverTimestamp,
  type Actors,
  type DocData,
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
    'users/alice': profileDoc(ALICE),
    'users/bob': profileDoc(BOB),
  });
});

describe('reading profiles', () => {
  it('a collector can read their own profile', async () => {
    const snapshot = await assertSucceeds(db.alice.doc('users/alice').get());
    expect(snapshot.get('xp')).toBe(0);
  });

  it("a collector cannot read someone else's profile", async () => {
    await assertFails(db.bob.doc('users/alice').get());
  });

  it('signed-out visitors cannot read profiles', async () => {
    await assertFails(db.anon.doc('users/alice').get());
  });

  it('collectors cannot list the users collection', async () => {
    await assertFails(db.alice.collection('users').get());
  });

  it('an admin can read any profile and list users', async () => {
    await assertSucceeds(db.admin.doc('users/alice').get());
    await assertSucceeds(db.admin.collection('users').get());
  });

  it('a profile that does not exist yet reads as missing for its owner', async () => {
    await env.clearFirestore();
    const snapshot = await assertSucceeds(db.alice.doc('users/alice').get());
    expect(snapshot.exists).toBe(false);
  });
});

describe('creating and deleting profiles', () => {
  it('a collector cannot create their own profile (ensureUserProfile / onUserCreate do)', async () => {
    await env.clearFirestore();
    await assertFails(db.alice.doc('users/alice').set(profileDoc(ALICE)));
  });

  it('a collector cannot create a profile with inflated XP', async () => {
    await env.clearFirestore();
    await assertFails(db.alice.doc('users/alice').set(profileDoc(ALICE, { xp: 99999, level: 25 })));
  });

  it("a collector cannot create someone else's profile", async () => {
    await assertFails(db.alice.doc('users/carol').set(profileDoc('carol')));
  });

  it('profiles cannot be deleted from the client', async () => {
    await assertFails(db.alice.doc('users/alice').delete());
    await assertFails(db.admin.doc('users/alice').delete());
  });
});

describe('updating profiles', () => {
  it('the owner can change their display name (with a server updatedAt)', async () => {
    await assertSucceeds(
      db.alice
        .doc('users/alice')
        .update({ displayName: 'Alice Racer', updatedAt: serverTimestamp() }),
    );
  });

  it('the owner can change or clear their photo URL', async () => {
    await assertSucceeds(
      db.alice.doc('users/alice').update({
        photoURL: 'https://lh3.googleusercontent.com/a/alice-photo',
        updatedAt: serverTimestamp(),
      }),
    );
    await assertSucceeds(
      db.alice.doc('users/alice').update({ photoURL: null, updatedAt: serverTimestamp() }),
    );
  });

  it('the owner can update name and photo together', async () => {
    await assertSucceeds(
      db.alice.doc('users/alice').update({
        displayName: 'A. Racer',
        photoURL: 'https://lh3.googleusercontent.com/a/new',
        updatedAt: serverTimestamp(),
      }),
    );
  });

  it('updatedAt must be the server time', async () => {
    await assertFails(
      db.alice.doc('users/alice').update({ displayName: 'Alice', updatedAt: clientTimestamp() }),
    );
  });

  it('updatedAt must be refreshed on every update', async () => {
    await assertFails(db.alice.doc('users/alice').update({ displayName: 'Alice' }));
  });

  it.each([
    ['an empty name', ''],
    ['a name longer than 80 characters', 'x'.repeat(81)],
    ['a non-string name', 42],
  ])('rejects %s', async (_label, displayName) => {
    await assertFails(
      db.alice.doc('users/alice').update({ displayName, updatedAt: serverTimestamp() }),
    );
  });

  it.each([
    ['an http (non-TLS) photo URL', 'http://example.com/me.png'],
    ['a javascript: photo URL', 'javascript:alert(1)'],
    ['a non-string photo URL', 7],
    ['an oversized photo URL', `https://example.com/${'a'.repeat(2100)}`],
  ])('rejects %s', async (_label, photoURL) => {
    await assertFails(
      db.alice.doc('users/alice').update({ photoURL, updatedAt: serverTimestamp() }),
    );
  });

  const FUNCTION_OWNED_FIELDS: Array<[string, unknown]> = [
    ['xp', 99999],
    ['level', 25],
    ['badges', ['first-ride', 'master-collector']],
    [
      'stats',
      {
        carsOwned: 500,
        uniqueCars: 500,
        seriesCompleted: 9,
        ordersPlaced: 9,
        racingCars: 99,
        rareCars: 99,
        totalSpent: 1,
      },
    ],
    ['stats.carsOwned', 500],
    ['role', 'admin'],
    ['email', 'someone-else@example.com'],
    ['uid', BOB],
    ['createdAt', serverTimestamp()],
    ['isAdmin', true],
  ];

  it.each(FUNCTION_OWNED_FIELDS)('the owner cannot change %s', async (field, value) => {
    const patch: DocData = { [field]: value, updatedAt: serverTimestamp() };
    await assertFails(db.alice.doc('users/alice').update(patch));
  });

  it.each(FUNCTION_OWNED_FIELDS)(
    'the owner cannot sneak %s in alongside a valid name change',
    async (field, value) => {
      const patch: DocData = { displayName: 'Alice', [field]: value, updatedAt: serverTimestamp() };
      await assertFails(db.alice.doc('users/alice').update(patch));
    },
  );

  it('the owner cannot delete function-owned fields', async () => {
    for (const field of ['xp', 'level', 'badges', 'stats', 'role', 'email', 'createdAt']) {
      await assertFails(
        db.alice
          .doc('users/alice')
          .update({ [field]: fieldValue.delete(), updatedAt: serverTimestamp() }),
      );
    }
  });

  it('the owner cannot use field transforms to award themselves XP or badges', async () => {
    await assertFails(
      db.alice
        .doc('users/alice')
        .update({ xp: fieldValue.increment(500), updatedAt: serverTimestamp() }),
    );
    await assertFails(
      db.alice.doc('users/alice').update({
        badges: fieldValue.arrayUnion('master-collector'),
        updatedAt: serverTimestamp(),
      }),
    );
  });

  it('an admin cannot edit collector profiles from the client (functions own them)', async () => {
    await assertFails(
      db.admin.doc('users/alice').update({ xp: 5000, updatedAt: serverTimestamp() }),
    );
    await assertFails(
      db.admin
        .doc('users/alice')
        .update({ displayName: 'Renamed by ops', updatedAt: serverTimestamp() }),
    );
  });

  it('the owner cannot overwrite the whole profile with set()', async () => {
    await assertFails(
      db.alice
        .doc('users/alice')
        .set(profileDoc(ALICE, { xp: 5000, updatedAt: serverTimestamp() })),
    );
  });

  it("a collector cannot update someone else's profile", async () => {
    await assertFails(
      db.bob.doc('users/alice').update({ displayName: 'Pwned', updatedAt: serverTimestamp() }),
    );
  });

  it('signed-out visitors cannot update profiles', async () => {
    await assertFails(
      db.anon.doc('users/alice').update({ displayName: 'Pwned', updatedAt: serverTimestamp() }),
    );
  });
});
