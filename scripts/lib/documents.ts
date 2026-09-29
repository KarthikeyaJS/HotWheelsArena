/**
 * Catalogue records → Firestore document data. Dates become Firestore `Timestamp`s and the `id`
 * field is dropped (the document id carries it), matching the read converters in
 * src/services/firestore/converters.ts and the functions' readers.
 */
import { Timestamp } from 'firebase-admin/firestore';

interface DatedRecord {
  createdAt: Date;
  updatedAt: Date;
}

export type Timestamped<T extends DatedRecord> = Omit<T, 'createdAt' | 'updatedAt'> & {
  createdAt: Timestamp;
  updatedAt: Timestamp;
};

export type StoredDoc<T extends DatedRecord & { id: string }> = Omit<Timestamped<T>, 'id'>;

/** Converts the record's `createdAt` / `updatedAt` to Firestore Timestamps. */
export function timestamped<T extends DatedRecord>(record: T): Timestamped<T> {
  const { createdAt, updatedAt, ...rest } = record;
  return {
    ...rest,
    createdAt: Timestamp.fromDate(createdAt),
    updatedAt: Timestamp.fromDate(updatedAt),
  };
}

/** Document data for a record whose `id` is its document id. */
export function toStoredDoc<T extends DatedRecord & { id: string }>(record: T): StoredDoc<T> {
  const { id: _id, ...data } = timestamped(record);
  return data;
}
