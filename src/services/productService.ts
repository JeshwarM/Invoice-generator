import {
  collection,
  doc,
  addDoc,
  updateDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import type { Product, ProductCategory, ProductUnit } from '../types';

function mapProduct(id: string, data: Record<string, unknown>): Product {
  return {
    id,
    name: data.name as string,
    category: data.category as ProductCategory,
    defaultUnit: data.defaultUnit as ProductUnit,
    active: data.active as boolean,
    createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(),
    createdBy: data.createdBy as string,
    updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate() : new Date(),
  };
}

export async function getProducts(activeOnly: boolean = false): Promise<Product[]> {
  let q;
  if (activeOnly) {
    q = query(
      collection(db, 'products'),
      where('active', '==', true),
      orderBy('name', 'asc')
    );
  } else {
    q = query(collection(db, 'products'), orderBy('name', 'asc'));
  }
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => mapProduct(d.id, d.data()));
}

export async function getProduct(id: string): Promise<Product | null> {
  const snap = await getDoc(doc(db, 'products', id));
  if (!snap.exists()) return null;
  return mapProduct(snap.id, snap.data());
}

export async function createProduct(
  data: { name: string; category: ProductCategory; defaultUnit: ProductUnit },
  createdBy: string
): Promise<string> {
  const docRef = await addDoc(collection(db, 'products'), {
    name: data.name.trim(),
    category: data.category,
    defaultUnit: data.defaultUnit,
    active: true,
    createdAt: serverTimestamp(),
    createdBy,
    updatedAt: serverTimestamp(),
  });
  return docRef.id;
}

export async function updateProduct(
  id: string,
  data: Partial<{ name: string; category: ProductCategory; defaultUnit: ProductUnit; active: boolean }>
): Promise<void> {
  await updateDoc(doc(db, 'products', id), {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

export async function toggleProductActive(id: string, active: boolean): Promise<void> {
  await updateDoc(doc(db, 'products', id), {
    active,
    updatedAt: serverTimestamp(),
  });
}

export const PRODUCT_CATEGORIES: { value: ProductCategory; label: string }[] = [
  { value: 'vegetables', label: 'Vegetables' },
  { value: 'fruits', label: 'Fruits' },
  { value: 'herbs', label: 'Herbs' },
  { value: 'spices', label: 'Spices' },
  { value: 'dairy', label: 'Dairy' },
  { value: 'grocery', label: 'Grocery' },
  { value: 'other', label: 'Other' },
];

export const PRODUCT_UNITS: { value: ProductUnit; label: string }[] = [
  { value: 'kg', label: 'Kilogram (kg)' },
  { value: 'g', label: 'Gram (g)' },
  { value: 'box', label: 'Box' },
  { value: 'piece', label: 'Piece' },
  { value: 'bundle', label: 'Bundle' },
  { value: 'packet', label: 'Packet' },
  { value: 'dozen', label: 'Dozen' },
];
