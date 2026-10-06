/**
 * Firestore references and transactional readers shared by callables and triggers.
 * Paths come from the shared `COLLECTIONS` / `SUBCOLLECTIONS` constants so the web app, rules
 * tests, seed script and functions can never drift apart.
 */
import type {
  CollectionReference,
  DocumentReference,
  DocumentSnapshot,
  Query,
  Transaction,
} from 'firebase-admin/firestore';
import { COLLECTIONS, SETTINGS_SITE_DOC_ID, SUBCOLLECTIONS } from '../../shared/index.js';
import { db } from './admin.js';
import {
  readGarageRecord,
  readProductRecord,
  readSeriesRecord,
  type GarageRecord,
  type ProductRecord,
  type RawData,
  type SeriesRecord,
} from './lib/firestoreData.js';
import { PROCESSED_PAYMENTS_COLLECTION } from './lib/order.js';
import { RATE_LIMITS_COLLECTION } from './lib/rateLimit.js';

/* ------------------------------- References ------------------------------- */

export const userRef = (uid: string): DocumentReference =>
  db.collection(COLLECTIONS.users).doc(uid);

export const garageCollection = (uid: string): CollectionReference =>
  userRef(uid).collection(SUBCOLLECTIONS.garage);

export const productRef = (productId: string): DocumentReference =>
  db.collection(COLLECTIONS.products).doc(productId);

export const reviewRef = (productId: string, uid: string): DocumentReference =>
  productRef(productId).collection(SUBCOLLECTIONS.reviews).doc(uid);

export const siteSettingsRef = (): DocumentReference =>
  db.collection(COLLECTIONS.settings).doc(SETTINGS_SITE_DOC_ID);

/** Series that count towards `seriesCompleted` (same filter as the storefront). */
export const activeSeriesQuery = (): Query =>
  db.collection(COLLECTIONS.series).where('isActive', '==', true);

export const ordersCollection = (): CollectionReference => db.collection(COLLECTIONS.orders);

export const newsletterRef = (docId: string): DocumentReference =>
  db.collection(COLLECTIONS.newsletter).doc(docId);

export const rateLimitRef = (docId: string): DocumentReference =>
  db.collection(RATE_LIMITS_COLLECTION).doc(docId);

export const processedPaymentRef = (markerId: string): DocumentReference =>
  db.collection(PROCESSED_PAYMENTS_COLLECTION).doc(markerId);

/* --------------------------------- Readers -------------------------------- */

/** Snapshot data, or `undefined` when the document does not exist. */
export function dataOf(snapshot: DocumentSnapshot): RawData | undefined {
  return snapshot.exists ? snapshot.data() : undefined;
}

const GET_ALL_CHUNK_SIZE = 100;

/** `transaction.getAll` in bounded chunks (no-op for an empty list). Order is preserved. */
export async function getAllInTransaction(
  transaction: Transaction,
  refs: readonly DocumentReference[],
): Promise<DocumentSnapshot[]> {
  const snapshots: DocumentSnapshot[] = [];
  for (let start = 0; start < refs.length; start += GET_ALL_CHUNK_SIZE) {
    const chunk = refs.slice(start, start + GET_ALL_CHUNK_SIZE);
    snapshots.push(...(await transaction.getAll(...chunk)));
  }
  return snapshots;
}

/** The garage side of a collector's stats inputs, read inside one transaction. */
export interface GarageState {
  /** Full garage keyed by product id. */
  garage: Map<string, GarageRecord>;
  /** Active series. */
  series: SeriesRecord[];
  /** Product facts for every garage product plus `extraProductIds` (missing documents → `null`). */
  products: Map<string, ProductRecord | null>;
}

/** Everything needed to recompute a collector's stats, read inside one transaction. */
export interface CollectorState extends GarageState {
  /** Raw `users/{uid}` data (`undefined` when the profile does not exist). */
  profileData: RawData | undefined;
}

/**
 * Reads the collector's FULL garage (`transaction.get` on the collection) and the active series,
 * then every referenced product document, inside `transaction` (no profile read).
 */
export async function readGarageState(
  transaction: Transaction,
  uid: string,
  extraProductIds: readonly string[] = [],
): Promise<GarageState> {
  const [garageSnapshot, seriesSnapshot] = await Promise.all([
    transaction.get(garageCollection(uid)),
    transaction.get(activeSeriesQuery()),
  ]);

  const garage = new Map<string, GarageRecord>(
    garageSnapshot.docs.map((doc) => [doc.id, readGarageRecord(doc.id, doc.data())]),
  );
  const series = seriesSnapshot.docs.map((doc) => readSeriesRecord(doc.id, doc.data()));

  const productIds = Array.from(new Set([...extraProductIds, ...garage.keys()]));
  const productSnapshots = await getAllInTransaction(transaction, productIds.map(productRef));
  const products = new Map<string, ProductRecord | null>(
    productSnapshots.map((snapshot) => [
      snapshot.id,
      readProductRecord(snapshot.id, dataOf(snapshot)),
    ]),
  );

  return { garage, series, products };
}

/**
 * Reads the collector's profile, FULL garage (`transaction.get` on the collection) and the
 * active series, then every referenced product document — all inside `transaction`, so the
 * computed stats are consistent with what the transaction writes.
 */
export async function readCollectorState(
  transaction: Transaction,
  uid: string,
  extraProductIds: readonly string[] = [],
): Promise<CollectorState> {
  const [userSnapshot, garageState] = await Promise.all([
    transaction.get(userRef(uid)),
    readGarageState(transaction, uid, extraProductIds),
  ]);
  return { profileData: dataOf(userSnapshot), ...garageState };
}
