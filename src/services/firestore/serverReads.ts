/**
 * Server-confirmed query reads.
 *
 * With the in-memory cache, `getDocs` does NOT reject while the backend is unreachable: once the
 * SDK decides it is offline it resolves from the (usually empty) local cache with
 * `metadata.fromCache === true`. Returning that as data would make TanStack Query cache an empty
 * catalogue / a 404 / an "unavailable" cart as a success. `getDocsOnline` turns it into an
 * `unavailable` error instead, so the query errors, is retried and shows Retry.
 *
 * Use it for every list/lookup query. Do NOT use it for the realtime profile listener (cached
 * snapshots there are legitimate latency compensation) or for single-document `getDoc` reads
 * (those already reject offline).
 */
import { FirebaseError } from 'firebase/app';
import { getDocs, type DocumentData, type Query, type QuerySnapshot } from 'firebase/firestore';

/** Message carried by the `unavailable` error (the UI maps the code to friendly copy). */
export const OFFLINE_READ_MESSAGE = "Can't reach the track right now.";

/** `getDocs` that rejects with `unavailable` instead of resolving from the local cache. */
export async function getDocsOnline<AppModel, DbModel extends DocumentData = DocumentData>(
  q: Query<AppModel, DbModel>,
): Promise<QuerySnapshot<AppModel, DbModel>> {
  const snapshot = await getDocs(q);
  if (snapshot.metadata.fromCache) {
    throw new FirebaseError('unavailable', OFFLINE_READ_MESSAGE);
  }
  return snapshot;
}

/** True for Firestore's "backend unreachable" error (also thrown by `getDocsOnline`). */
export function isUnavailableError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code: unknown }).code === 'unavailable'
  );
}
