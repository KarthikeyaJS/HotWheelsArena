/**
 * `onGarageWrite` (Firestore trigger, 2nd gen) — `users/{uid}/garage/{productId}`.
 *
 * Whenever a car is added, removed or its quantity changes (manually from the web app, or by
 * `placeOrder`), recompute the collector's stats from the FULL garage + active series, unlock
 * newly satisfied badges and award each badge's XP exactly once, then update the level.
 * Favourite toggles are skipped, badges / XP are never removed, and re-deliveries of the same
 * event are harmless (the plan is a no-op when the profile is already up to date).
 */
import * as logger from 'firebase-functions/logger';
import { onDocumentWritten } from 'firebase-functions/v2/firestore';
import { COLLECTIONS, SUBCOLLECTIONS } from '../../../shared/index.js';
import { db, serverTimestamp } from '../admin.js';
import { REGION } from '../config.js';
import { affectsStats, planGarageSync } from '../lib/garageSync.js';
import { dataOf, readCollectorState, userRef } from '../refs.js';

export const GARAGE_DOCUMENT_PATH =
  `${COLLECTIONS.users}/{uid}/${SUBCOLLECTIONS.garage}/{productId}` as const;

export const onGarageWrite = onDocumentWritten(
  { document: GARAGE_DOCUMENT_PATH, region: REGION },
  async (event) => {
    const change = event.data;
    if (!change) return;
    const { uid, productId } = event.params;

    if (!affectsStats(dataOf(change.before), dataOf(change.after))) {
      logger.debug('onGarageWrite: no stats-relevant change, skipped', { uid, productId });
      return;
    }

    const plan = await db.runTransaction(async (transaction) => {
      const state = await readCollectorState(transaction, uid);
      const syncPlan = planGarageSync(
        {
          uid,
          profileData: state.profileData,
          garage: state.garage.values(),
          products: state.products,
          series: state.series,
        },
        serverTimestamp(),
      );
      const profileRef = userRef(uid);
      if (syncPlan.write?.kind === 'update') {
        transaction.update(profileRef, syncPlan.write.data);
      } else if (syncPlan.write?.kind === 'merge') {
        transaction.set(profileRef, syncPlan.write.data, { merge: true });
      }
      return syncPlan;
    });

    if (!plan.write) {
      logger.debug('onGarageWrite: profile already up to date', { uid, productId });
      return;
    }
    logger.info('onGarageWrite: collector stats synced', {
      uid,
      productId,
      stats: plan.stats,
      badgesUnlocked: plan.badgesUnlocked,
      xpEarned: plan.xpEarned,
      level: plan.level,
      leveledUp: plan.leveledUp,
    });
  },
);
