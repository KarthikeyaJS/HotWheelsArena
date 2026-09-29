/**
 * Callable plumbing shared by every `onCall` handler:
 *  - `requireAuth`   → caller identity, or HttpsError('unauthenticated').
 *  - `parseInput`    → zod validation with USER-FACING messages → HttpsError('invalid-argument').
 *  - `toHttpsError`  → maps domain errors to HttpsError; anything unexpected is logged and replaced
 *                      with a generic message so internals never reach the client.
 *
 * The web client shows messages of invalid-argument / failed-precondition / out-of-range /
 * already-exists / resource-exhausted errors verbatim, so every message here is written for
 * collectors, not developers.
 */
import * as logger from 'firebase-functions/logger';
import { HttpsError } from 'firebase-functions/v2/https';
import type { z } from 'zod';
import { isAppError } from './errors.js';

export const GENERIC_ERROR_MESSAGE = 'Engine trouble on our side. Please try again in a moment.';
export const SIGN_IN_REQUIRED_MESSAGE =
  'Your pit pass has expired — sign in with Google to continue.';
export const BUSY_MESSAGE = 'Traffic on the track — please try again.';
export const UNAVAILABLE_MESSAGE =
  'The pit crew is unreachable right now. Please try again shortly.';

/* ---------------------------------- Auth ---------------------------------- */

/** Structural subset of the callable `request.auth` (`AuthData`) used here. */
export interface AuthLike {
  uid: string;
  token?: Readonly<Record<string, unknown>>;
}

/** The signed-in caller, with profile hints from the verified ID token. */
export interface CallerIdentity {
  uid: string;
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
}

function tokenString(token: Readonly<Record<string, unknown>>, key: string): string | null {
  const value = token[key];
  return typeof value === 'string' && value.trim() !== '' ? value.trim() : null;
}

/** @throws HttpsError('unauthenticated') when the request carries no verified Firebase ID token. */
export function requireAuth(auth: AuthLike | null | undefined): CallerIdentity {
  if (!auth || typeof auth.uid !== 'string' || auth.uid.trim() === '') {
    throw new HttpsError('unauthenticated', SIGN_IN_REQUIRED_MESSAGE);
  }
  const token = auth.token ?? {};
  return {
    uid: auth.uid,
    displayName: tokenString(token, 'name'),
    email: tokenString(token, 'email'),
    photoURL: tokenString(token, 'picture'),
  };
}

/* --------------------------------- Inputs --------------------------------- */

export interface ParseOptions {
  /** Used for issues whose schema check has no message of its own (wrong type, missing field…). */
  fallbackMessage: string;
  /** Friendlier fallback per top-level field, e.g. `{ address: 'Check your delivery address.' }`. */
  fieldMessages?: Readonly<Record<string, string>>;
}

/**
 * Validates untrusted callable data with a shared zod schema.
 *
 * Messages written in the schema (e.g. "Enter a valid 6-digit PIN code") are kept as-is; zod's
 * generic defaults ("Expected object, received null") are replaced by `fieldMessages[field]` or
 * `fallbackMessage`. Only the offending field path is attached as details.
 *
 * @throws HttpsError('invalid-argument')
 */
export function parseInput<Output, Input>(
  schema: z.ZodType<Output, z.ZodTypeDef, Input>,
  data: unknown,
  options: ParseOptions,
): Output {
  const errorMap: z.ZodErrorMap = (issue) => {
    const field = issue.path[0];
    const fieldMessage = typeof field === 'string' ? options.fieldMessages?.[field] : undefined;
    return { message: fieldMessage ?? options.fallbackMessage };
  };
  const result = schema.safeParse(data, { errorMap });
  if (result.success) return result.data;
  const issue = result.error.issues[0];
  throw new HttpsError(
    'invalid-argument',
    issue?.message || options.fallbackMessage,
    issue && issue.path.length > 0 ? { field: issue.path.join('.') } : undefined,
  );
}

/* --------------------------------- Errors --------------------------------- */

/** gRPC status codes surfaced by the Firestore Admin SDK. */
const GRPC_ABORTED = 10;
const GRPC_DEADLINE_EXCEEDED = 4;
const GRPC_UNAVAILABLE = 14;

function grpcCode(error: unknown): number | null {
  if (typeof error !== 'object' || error === null || !('code' in error)) return null;
  const { code } = error as { code: unknown };
  return typeof code === 'number' ? code : null;
}

/**
 * Converts anything thrown inside a handler into an `HttpsError` that is safe to send:
 * HttpsErrors pass through, `AppError`s keep their code + user-facing message, transaction
 * contention becomes a retryable `aborted`, and everything else becomes a generic `internal`.
 */
export function toHttpsError(error: unknown, context: string): HttpsError {
  if (error instanceof HttpsError) return error;

  if (isAppError(error)) {
    logger.info(`${context}: request rejected`, {
      ...(error.details ?? {}),
      code: error.code,
      reason: error.message,
    });
    return new HttpsError(error.code, error.message);
  }

  const code = grpcCode(error);
  if (code === GRPC_ABORTED) {
    logger.warn(`${context}: transaction contention`, error);
    return new HttpsError('aborted', BUSY_MESSAGE);
  }
  if (code === GRPC_UNAVAILABLE || code === GRPC_DEADLINE_EXCEEDED) {
    logger.warn(`${context}: backend unavailable`, error);
    return new HttpsError('unavailable', UNAVAILABLE_MESSAGE);
  }

  logger.error(`${context}: unexpected failure`, error);
  return new HttpsError('internal', GENERIC_ERROR_MESSAGE);
}

/** Wraps a callable handler so every failure leaves as a safe `HttpsError`. */
export function withErrorHandling<Req, Res>(
  context: string,
  handler: (request: Req) => Promise<Res>,
): (request: Req) => Promise<Res> {
  return async (request: Req): Promise<Res> => {
    try {
      return await handler(request);
    } catch (error: unknown) {
      throw toHttpsError(error, context);
    }
  };
}
