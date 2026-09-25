import {
  collection,
  doc,
  addDoc,
  updateDoc,
  getDoc,
  getDocs,
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import type { DraftBill, BillItem } from '../types';

function serializeBillItems(items: BillItem[]): Record<string, unknown>[] {
  return items.map((item) => ({
    ...item,
    deliveryDate: item.deliveryDate instanceof Date ? Timestamp.fromDate(item.deliveryDate) : item.deliveryDate,
    rateOverriddenAt: item.rateOverriddenAt instanceof Date ? Timestamp.fromDate(item.rateOverriddenAt) : null,
  }));
}

function deserializeBillItems(items: Record<string, unknown>[]): BillItem[] {
  return (items || []).map((item) => ({
    productId: (item.productId as string) || '',
    productName: (item.productName as string) || '',
    contractItemId: (item.contractItemId as string) || '',
    quantity: (item.quantity as number) || 0,
    quantityGrams: (item.quantityGrams as number) || 0,
    unit: (item.unit as BillItem['unit']) || 'kg',
    contractRate: (item.contractRate as number) || 0,
    finalRate: (item.finalRate as number) || 0,
    rateOverridden: (item.rateOverridden as boolean) || false,
    rateOverrideReason: (item.rateOverrideReason as string) || '',
    rateOverriddenBy: (item.rateOverriddenBy as string) || '',
    rateOverriddenAt: item.rateOverriddenAt instanceof Timestamp ? item.rateOverriddenAt.toDate() : null,
    igstRate: (item.igstRate as number) || 0,
    igstAmount: (item.igstAmount as number) || 0,
    lineTotal: (item.lineTotal as number) || 0,
    deliveryDate: item.deliveryDate instanceof Timestamp ? item.deliveryDate.toDate() : new Date(),
    deliveryTime: (item.deliveryTime as string) || '',
  }));
}

function mapDraft(id: string, data: Record<string, unknown>): DraftBill {
  return {
    id,
    hotelId: (data.hotelId as string) || '',
    hotelName: (data.hotelName as string) || '',
    contractId: (data.contractId as string) || '',
    contractNumber: (data.contractNumber as string) || '',
    deliveryDate: data.deliveryDate instanceof Timestamp ? data.deliveryDate.toDate() : new Date(),
    invoiceDate: data.invoiceDate instanceof Timestamp ? data.invoiceDate.toDate() : new Date(),
    items: deserializeBillItems((data.items as Record<string, unknown>[]) || []),
    subtotal: (data.subtotal as number) || 0,
    igstTotal: (data.igstTotal as number) || 0,
    grandTotal: (data.grandTotal as number) || 0,
    status: (data.status as DraftBill['status']) || 'draft',
    createdBy: (data.createdBy as string) || '',
    createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(),
    updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate() : new Date(),
    version: (data.version as number) || 1,
  };
}

export async function getDrafts(userId?: string): Promise<DraftBill[]> {
  let q;
  if (userId) {
    q = query(collection(db, 'draftBills'), where('createdBy', '==', userId), orderBy('updatedAt', 'desc'));
  } else {
    q = query(collection(db, 'draftBills'), orderBy('updatedAt', 'desc'));
  }
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => mapDraft(d.id, d.data()));
}

export async function getDraft(id: string): Promise<DraftBill | null> {
  const snap = await getDoc(doc(db, 'draftBills', id));
  if (!snap.exists()) return null;
  return mapDraft(snap.id, snap.data());
}

export async function saveDraft(
  data: {
    hotelId: string;
    hotelName: string;
    contractId: string;
    contractNumber: string;
    deliveryDate: Date;
    invoiceDate: Date;
    items: BillItem[];
    subtotal: number;
    igstTotal: number;
    grandTotal: number;
  },
  createdBy: string
): Promise<string> {
  const docRef = await addDoc(collection(db, 'draftBills'), {
    hotelId: data.hotelId,
    hotelName: data.hotelName,
    contractId: data.contractId,
    contractNumber: data.contractNumber,
    deliveryDate: Timestamp.fromDate(data.deliveryDate),
    invoiceDate: Timestamp.fromDate(data.invoiceDate),
    items: serializeBillItems(data.items),
    subtotal: data.subtotal,
    igstTotal: data.igstTotal,
    grandTotal: data.grandTotal,
    status: 'draft',
    createdBy,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    version: 1,
  });
  return docRef.id;
}

export async function updateDraft(
  id: string,
  data: Partial<{
    items: BillItem[];
    deliveryDate: Date;
    invoiceDate: Date;
    subtotal: number;
    igstTotal: number;
    grandTotal: number;
  }>,
  currentVersion: number
): Promise<void> {
  const updateData: Record<string, unknown> = { updatedAt: serverTimestamp(), version: currentVersion + 1 };
  if (data.items) updateData.items = serializeBillItems(data.items);
  if (data.deliveryDate) updateData.deliveryDate = Timestamp.fromDate(data.deliveryDate);
  if (data.invoiceDate) updateData.invoiceDate = Timestamp.fromDate(data.invoiceDate);
  if (data.subtotal !== undefined) updateData.subtotal = data.subtotal;
  if (data.igstTotal !== undefined) updateData.igstTotal = data.igstTotal;
  if (data.grandTotal !== undefined) updateData.grandTotal = data.grandTotal;

  await updateDoc(doc(db, 'draftBills', id), updateData);
}

export async function deleteDraft(id: string): Promise<void> {
  await deleteDoc(doc(db, 'draftBills', id));
}
