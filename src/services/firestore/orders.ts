/**
 * Order reads. Orders are created ONLY by the `placeOrder` callable; clients can read their own.
 * Requires the composite index orders(uid ASC, createdAt DESC).
 */
import { collection, doc, getDoc, getDocs, limit, orderBy, query, where } from 'firebase/firestore';
import { COLLECTIONS } from '@shared/constants';
import type { Order } from '@shared/types';
import { db } from '@/config/firebase';
import { orderConverter } from './converters';

export const ORDERS_PAGE_SIZE = 50;

export const ordersCollection = () =>
  collection(db, COLLECTIONS.orders).withConverter(orderConverter);

/** The collector's orders, newest first. */
export async function fetchOrders(uid: string, max = ORDERS_PAGE_SIZE): Promise<Order[]> {
  const snapshot = await getDocs(
    query(ordersCollection(), where('uid', '==', uid), orderBy('createdAt', 'desc'), limit(max)),
  );
  return snapshot.docs.map((document) => document.data());
}

/** One order by id (rules only allow the owner), or null when missing. */
export async function fetchOrder(orderId: string): Promise<Order | null> {
  const snapshot = await getDoc(doc(ordersCollection(), orderId));
  return snapshot.exists() ? snapshot.data() : null;
}
