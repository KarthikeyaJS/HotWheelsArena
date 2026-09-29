/**
 * Idempotent collector-profile bootstrap shared by the `ensureUserProfile` callable (called by
 * the web app after every sign-in) and the `onUserCreate` Auth trigger. Both may run at the same
 * time for a brand-new account; the transaction guarantees exactly one of them creates the
 * document and the other becomes a no-op.
 */
import * as logger from 'firebase-functions/logger';
import type { EnsureProfileResponse } from '../../../shared/index.js';
import { db, serverTimestamp } from '../admin.js';
import { buildProfileDoc, profileBackfill, type ProfileSeed } from '../lib/profile.js';
import { dataOf, userRef } from '../refs.js';

/**
 * Creates `users/{uid}` with defaults (xp 0, level 1, no badges, zeroed stats, role `customer`)
 * when it does not exist; otherwise only fills in missing / malformed required fields (never
 * touches valid values, so XP, badges and stats written by other functions are safe).
 */
export async function ensureProfileDocument(seed: ProfileSeed): Promise<EnsureProfileResponse> {
  const ref = userRef(seed.uid);
  const outcome = await db.runTransaction(async (transaction) => {
    const existing = dataOf(await transaction.get(ref));
    if (existing === undefined) {
      transaction.create(ref, buildProfileDoc(seed, serverTimestamp()));
      return { created: true, patched: false };
    }
    const patch = profileBackfill(existing, seed, serverTimestamp());
    if (patch) transaction.set(ref, patch, { merge: true });
    return { created: false, patched: patch !== null };
  });

  if (outcome.created) logger.info('Collector profile created', { uid: seed.uid });
  else if (outcome.patched) logger.info('Collector profile backfilled', { uid: seed.uid });
  return { created: outcome.created };
}
