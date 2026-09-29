/**
 * Domain errors raised by the pure logic in `src/lib` and `src/payments`.
 *
 * They carry a callable error code plus a USER-FACING message (the web client shows messages for
 * invalid-argument / failed-precondition / out-of-range / already-exists / resource-exhausted
 * verbatim). The callable wrapper (`lib/callable.ts`) converts them into `HttpsError`s; anything
 * that is not an `AppError` / `HttpsError` is logged and replaced with a generic message so
 * internals never leak to the client.
 */

/** Subset of the callable `FunctionsErrorCode`s our domain logic raises. */
export type AppErrorCode =
  | 'invalid-argument'
  | 'failed-precondition'
  | 'out-of-range'
  | 'not-found'
  | 'already-exists'
  | 'permission-denied'
  | 'resource-exhausted'
  | 'unauthenticated'
  | 'aborted';

export class AppError extends Error {
  readonly code: AppErrorCode;
  /** Extra structured context for logs only — never sent to the client. */
  readonly details: Readonly<Record<string, unknown>> | undefined;

  constructor(code: AppErrorCode, message: string, details?: Record<string, unknown>) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.details = details;
  }
}

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}
