/**
 * `ensureUserProfile` (callable) — idempotently creates / backfills `users/{uid}` for the
 * signed-in collector. The web app calls it once per session after Google sign-in (the
 * `onUserCreate` Auth trigger does the same on account creation; whichever runs first wins).
 *
 * Request: none (any payload is ignored). Response: `{ created: boolean }`.
 * Errors: `unauthenticated` when signed out.
 */
import { onCall, type CallableRequest } from 'firebase-functions/v2/https';
import { CALLABLES, type EnsureProfileResponse } from '../../../shared/index.js';
import { REGION } from '../config.js';
import { requireAuth, withErrorHandling } from '../lib/callable.js';
import { ensureProfileDocument } from '../profile/ensureProfile.js';

export async function handleEnsureUserProfile(
  request: CallableRequest<unknown>,
): Promise<EnsureProfileResponse> {
  const caller = requireAuth(request.auth);
  return ensureProfileDocument(caller);
}

export const ensureUserProfile = onCall<unknown, Promise<EnsureProfileResponse>>(
  { region: REGION },
  withErrorHandling(CALLABLES.ensureUserProfile, handleEnsureUserProfile),
);
