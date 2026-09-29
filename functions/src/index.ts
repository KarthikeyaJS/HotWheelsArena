/**
 * HotWheelsArena Cloud Functions — Node.js 22, region asia-south1 (Mumbai).
 *
 * Callables (names = shared `CALLABLES`; typed wrappers in the web app's src/services/functions.ts):
 *   ensureUserProfile   · idempotent collector profile bootstrap
 *   placeOrder          · server-priced order + payment verification + garage / XP / badges
 *   submitReview        · one review per collector per product + exact rating aggregates
 *   subscribeNewsletter · deduplicated, rate-limited newsletter sign-up
 * Triggers:
 *   onUserCreate        · Auth account created → profile bootstrap (1st gen)
 *   onGarageWrite       · garage changed → stats / badges / XP / level (2nd gen)
 *
 * Only these six functions may be exported from this module: Firebase deploys every export.
 */
import './config.js';

export { ensureUserProfile } from './callables/ensureUserProfile.js';
export { placeOrder } from './callables/placeOrder.js';
export { submitReview } from './callables/submitReview.js';
export { subscribeNewsletter } from './callables/subscribeNewsletter.js';
export { onUserCreate } from './triggers/onUserCreate.js';
export { onGarageWrite } from './triggers/onGarageWrite.js';
