/**
 * `onGarageWrite` (Firestore trigger, 2nd gen) — `users/{uid}/garage/{productId}`.
 *
 * Whenever a car is added, removed or its quantity changes (manually from the web app, or by
 * `placeOrder`), recompute the collector's stats from the FULL garage + active series, unlock
 * newly satisfied badges and award each badge's XP exactly once, then update the level.
 * Favourite toggles are skipped, badges / XP are never removed, and re-deliveries of the same
 * event are harmless (the plan changes nothing when the profile is already up to date).
 *
 * Bursts stay cheap: every full recompute stamps `statsSyncedAt` on the profile, and the
 * transaction reads ONLY the profile first. If a recompute provably committed after this event's
 * garage write (`isSuperseded`), that recompute already saw the write, so the event is skipped
 * after one read instead of re-reading the garage, the series and every garage product. The
 * write's commit time comes from the written document's `updateTime` (deletes: the event time,
 * rounded up to its precision; see `garageWriteCommitBoundMs`).
 */
import * as logger from 'firebase-functions/logger';
import { onDocumentWritten } from 'firebase-functions/v2/firestore';
import { COLLECTIONS, SUBCOLLECTIONS } from '../../../shared/index.js';
import { db, serverTimestamp } from '../admin.js';
import { REGION } from '../config.js';
import {
  affectsStats,
  garageWriteCommitBoundMs,
  isSuperseded,
  planGarageSync,
} from '../lib/garageSync.js';
import { dataOf, readGarageState, userRef } from '../refs.js';

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

    const commitBoundMs = garageWriteCommitBoundMs(
      change.after.exists ? change.after.updateTime : undefined,
      event.time,
    );
    const profileRef = userRef(uid);

    const plan = await db.runTransaction(async (transaction) => {
      const profileData = dataOf(await transaction.get(profileRef));
      if (isSuperseded(profileData, commitBoundMs)) return null;

      const state = await readGarageState(transaction, uid);
      const syncPlan = planGarageSync(
        {
          uid,
          profileData,
          garage: state.garage.values(),
          products: state.products,
          series: state.series,
        },
        serverTimestamp(),
      );
      if (syncPlan.write?.kind === 'merge') {
        transaction.set(profileRef, syncPlan.write.data, { merge: true });
      } else if (syncPlan.write) {
        transaction.update(profileRef, syncPlan.write.data);
      }
      return syncPlan;
    });

    if (!plan) {
      logger.debug('onGarageWrite: superseded by a later recompute, skipped', {
        uid,
        productId,
        eventTime: event.time,
        commitBoundMs,
      });
      return;
    }
    if (!plan.changed) {
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
