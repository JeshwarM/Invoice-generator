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

export const DEFAULT_VEGETABLES: Array<{ name: string; category: ProductCategory; defaultUnit: ProductUnit }> = [
  { name: 'Tomato (Local)', category: 'vegetables', defaultUnit: 'kg' },
  { name: 'Tomato (Hybrid)', category: 'vegetables', defaultUnit: 'kg' },
  { name: 'Potato', category: 'vegetables', defaultUnit: 'kg' },
  { name: 'Onion (Big)', category: 'vegetables', defaultUnit: 'kg' },
  { name: 'Onion (Small/Shallots)', category: 'vegetables', defaultUnit: 'kg' },
  { name: 'Carrot (Ooty)', category: 'vegetables', defaultUnit: 'kg' },
  { name: 'Beans (French)', category: 'vegetables', defaultUnit: 'kg' },
  { name: 'Cauliflower', category: 'vegetables', defaultUnit: 'piece' },
  { name: 'Cabbage', category: 'vegetables', defaultUnit: 'kg' },
  { name: 'Capsicum (Green)', category: 'vegetables', defaultUnit: 'kg' },
  { name: 'Capsicum (Red/Yellow)', category: 'vegetables', defaultUnit: 'kg' },
  { name: 'Green Chilli', category: 'vegetables', defaultUnit: 'kg' },
  { name: 'Ginger', category: 'vegetables', defaultUnit: 'kg' },
  { name: 'Garlic (Peeled)', category: 'vegetables', defaultUnit: 'kg' },
  { name: 'Spinach (Palak)', category: 'herbs', defaultUnit: 'bundle' },
  { name: 'Coriander Leaves', category: 'herbs', defaultUnit: 'bundle' },
  { name: 'Mint Leaves (Pudina)', category: 'herbs', defaultUnit: 'bundle' },
  { name: 'Cucumber (English)', category: 'vegetables', defaultUnit: 'kg' },
  { name: 'Lemon', category: 'fruits', defaultUnit: 'piece' },
  { name: 'Beetroot', category: 'vegetables', defaultUnit: 'kg' },
  { name: 'Mushroom (Button)', category: 'vegetables', defaultUnit: 'packet' },
  { name: 'Broccoli', category: 'vegetables', defaultUnit: 'kg' },
  { name: 'Green Peas', category: 'vegetables', defaultUnit: 'kg' },
];

export async function getProducts(activeOnly: boolean = false): Promise<Product[]> {
  try {
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
    if (!snapshot.empty) {
      return snapshot.docs.map((d) => mapProduct(d.id, d.data()));
    }
  } catch (err) {
    console.warn('Could not fetch from Firestore, falling back to default produce catalog:', err);
  }

  // Fallback to default produce catalog
  return DEFAULT_VEGETABLES.map((v, i) => ({
    id: `prod_seed_${i + 1}`,
    name: v.name,
    category: v.category,
    defaultUnit: v.defaultUnit,
    active: true,
    createdAt: new Date(),
    createdBy: 'system',
    updatedAt: new Date(),
  }));
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
