/**
 * Error normalisation → friendly, racing-themed messages. Never show raw SDK errors to users.
 */
import { FirebaseError } from 'firebase/app';
import { ZodError } from 'zod';

/** Error with a string `code` (FirebaseError, FunctionsError, AuthError…). */
interface CodedError {
  code: string;
  message?: string;
}

function isCodedError(error: unknown): error is CodedError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    typeof (error as { code: unknown }).code === 'string'
  );
}

/**
 * Normalised error code without the service prefix: `functions/permission-denied` →
 * `permission-denied`. Auth codes keep their `auth/` prefix (they are distinct). Null if none.
 */
export function getErrorCode(error: unknown): string | null {
  if (!isCodedError(error)) return null;
  const { code } = error;
  if (code.startsWith('auth/')) return code;
  return code.replace(/^(functions|firestore|storage)\//, '');
}

const FRIENDLY_MESSAGES: Readonly<Record<string, string>> = {
  // Firestore / Functions canonical codes
  'permission-denied': "Access denied at the gate — you don't have permission for that.",
  unauthenticated: 'Your pit pass has expired. Please sign in again.',
  'not-found': "That one isn't in the garage.",
  unavailable: "Can't reach the track right now. Check your connection and try again.",
  'deadline-exceeded': 'The pit crew took too long. Please try again.',
  'resource-exhausted': 'Too many laps too fast — wait a moment and try again.',
  aborted: 'Traffic on the track — please retry.',
  cancelled: 'Request cancelled.',
  'already-exists': 'That car is already parked here.',
  internal: 'Engine trouble on our side. Please try again in a moment.',
  unknown: 'Something went wrong under the hood. Please try again.',
  'data-loss': 'Engine trouble on our side. Please try again in a moment.',
  unimplemented: "That feature hasn't left the workshop yet.",
  // Auth
  'auth/popup-blocked': 'Your browser blocked the sign-in window. Allow pop-ups and try again.',
  'auth/popup-closed-by-user': 'Sign-in cancelled.',
  'auth/cancelled-popup-request': 'Sign-in cancelled.',
  'auth/network-request-failed': "Can't reach the sign-in server. Check your connection.",
  'auth/too-many-requests': 'Too many sign-in attempts. Take a breather and try again shortly.',
  'auth/user-disabled': 'This account has been disabled. Contact the pit crew for help.',
  'auth/unauthorized-domain': 'Sign-in is not enabled for this domain yet.',
  'auth/operation-not-allowed': 'Google sign-in is not enabled for this project yet.',
  'auth/internal-error': 'Sign-in hit a snag. Please try again.',
  'auth/account-exists-with-different-credential':
    'An account already exists with this email using a different sign-in method.',
};

/** Codes whose server message is written for humans (HttpsError thrown by our functions). */
const PASS_THROUGH_CODES = new Set([
  'invalid-argument',
  'failed-precondition',
  'out-of-range',
  'already-exists',
  'resource-exhausted',
]);

const GENERIC_MESSAGE = 'Something went wrong under the hood. Please try again.';

function cleanFirebaseMessage(message: string | undefined): string | null {
  if (!message) return null;
  // Strip SDK prefixes like "Firebase: Error (auth/…)." or "FirebaseError: ".
  const cleaned = message
    .replace(/^Firebase(Error)?:\s*/i, '')
    .replace(/\s*\((auth|functions|firestore)\/[^)]+\)\.?$/i, '')
    .trim();
  if (!cleaned || /^(internal|error)$/i.test(cleaned)) return null;
  return cleaned;
}

/** A user-facing message for any thrown value. */
export function getFriendlyErrorMessage(
  error: unknown,
  fallback: string = GENERIC_MESSAGE,
): string {
  if (error instanceof ZodError) {
    return error.issues[0]?.message ?? fallback;
  }

  const code = getErrorCode(error);
  if (code) {
    if (PASS_THROUGH_CODES.has(code) && isCodedError(error)) {
      const serverMessage = cleanFirebaseMessage(error.message);
      if (serverMessage) return serverMessage;
    }
    const friendly = FRIENDLY_MESSAGES[code];
    if (friendly) return friendly;
    if (error instanceof FirebaseError) return fallback;
  }

  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return FRIENDLY_MESSAGES.unavailable ?? fallback;
  }

  if (isChunkLoadError(error)) {
    return 'A new version of the garage is ready. Reload the page to continue.';
  }

  return fallback;
}

export function isPermissionError(error: unknown): boolean {
  const code = getErrorCode(error);
  return code === 'permission-denied' || code === 'unauthenticated';
}

export function isNotFoundError(error: unknown): boolean {
  return getErrorCode(error) === 'not-found';
}

/** True for a failed lazy-route chunk (usually a stale tab after a deploy). */
export function isChunkLoadError(error: unknown): boolean {
  return (
    error instanceof Error &&
    /Loading chunk|dynamically imported module|Importing a module script failed|error loading dynamically/i.test(
      error.message,
    )
  );
}

/** TanStack Query retry policy: retry once, never for permission / auth / not-found / validation. */
export function shouldRetryQuery(failureCount: number, error: unknown): boolean {
  const code = getErrorCode(error);
  if (
    code === 'permission-denied' ||
    code === 'unauthenticated' ||
    code === 'not-found' ||
    code === 'invalid-argument' ||
    code === 'failed-precondition'
  ) {
    return false;
  }
  return failureCount < 1;
}

/** Thrown when an action needs a signed-in user but none is present. */
export class NotSignedInError extends Error {
  readonly code = 'unauthenticated';
  constructor(message = 'You need to sign in first.') {
    super(message);
    this.name = 'NotSignedInError';
  }
}
