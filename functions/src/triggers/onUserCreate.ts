/**
 * `onUserCreate` (Auth trigger, 1st gen) — initialises `users/{uid}` as soon as a Firebase Auth
 * account is created. 2nd-gen functions have no plain "user created" event (only blocking
 * functions), hence `firebase-functions/v1`. Shares the idempotent bootstrap with the
 * `ensureUserProfile` callable, so the two can race safely.
 */
import * as logger from 'firebase-functions/logger';
import * as functionsV1 from 'firebase-functions/v1';
import { MAX_INSTANCES, REGION } from '../config.js';
import { ensureProfileDocument } from '../profile/ensureProfile.js';

export const onUserCreate = functionsV1
  .region(REGION)
  .runWith({ maxInstances: MAX_INSTANCES })
  .auth.user()
  .onCreate(async (user) => {
    try {
      await ensureProfileDocument({
        uid: user.uid,
        displayName: user.displayName ?? null,
        email: user.email ?? null,
        photoURL: user.photoURL ?? null,
      });
    } catch (error: unknown) {
      // `ensureUserProfile` repairs the profile on the collector's next sign-in; surface the
      // failure in logs / error reporting without leaking anything to the client.
      logger.error('onUserCreate: profile bootstrap failed', { uid: user.uid }, error);
      throw error;
    }
  });
