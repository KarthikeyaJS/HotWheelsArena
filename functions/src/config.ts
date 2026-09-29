/**
 * Deployment configuration shared by every function.
 *
 * `setGlobalOptions` must run before any 2nd-gen function is defined, so every function module
 * imports `REGION` from here (the import guarantees this module is evaluated first) and
 * `index.ts` imports it before re-exporting the functions. 1st-gen functions (the Auth
 * `onCreate` trigger) ignore global options and pass the same values through `runWith`.
 */
import { setGlobalOptions } from 'firebase-functions/v2/options';
import { FUNCTIONS_REGION } from '../../shared/index.js';

/** Every function is deployed next to the Firestore database in Mumbai. */
export const REGION = FUNCTIONS_REGION;

/** Upper bound on concurrently running instances per function (cost guard-rail). */
export const MAX_INSTANCES = 10;

/** Timeout for the checkout callable; the web client gives up after 30 s. */
export const PLACE_ORDER_TIMEOUT_SECONDS = 30;

setGlobalOptions({ region: REGION, maxInstances: MAX_INSTANCES });
