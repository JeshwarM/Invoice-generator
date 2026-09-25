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
import { getCachedData, setCachedData, withTimeout, CACHE_KEYS } from '../utils/localStore';

function mapProduct(id: string, data: Record<string, unknown>): Product {
  return {
    id,
    name: data.name as string,
    category: data.category as ProductCategory,
    defaultUnit: data.defaultUnit as ProductUnit,
    active: data.active !== false,
    createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(),
    createdBy: (data.createdBy as string) || 'system',
    updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate() : new Date(),
  };
}

export const DEFAULT_VEGETABLES: Array<{ name: string; category: ProductCategory; defaultUnit: ProductUnit }> = [
  { name: 'EDIBLE FLOWER', category: 'vegetables', defaultUnit: 'box' },
  { name: 'WHITE RADISH MICROGREENS', category: 'herbs', defaultUnit: 'box' },
  { name: 'YELLOW ZUCCINI', category: 'vegetables', defaultUnit: 'kg' },
  { name: 'GREEN ZUCCHINI', category: 'vegetables', defaultUnit: 'kg' },
  { name: 'BABY CORN', category: 'vegetables', defaultUnit: 'kg' },
  { name: 'PARSLEY', category: 'herbs', defaultUnit: 'kg' },
  { name: 'BROCOLLI', category: 'vegetables', defaultUnit: 'kg' },
  { name: 'CELERY', category: 'vegetables', defaultUnit: 'kg' },
  { name: 'POKCHAI', category: 'vegetables', defaultUnit: 'kg' },
  { name: 'YELLOW CAPSICUM', category: 'vegetables', defaultUnit: 'kg' },
  { name: 'RED CAPSICUM', category: 'vegetables', defaultUnit: 'kg' },
  { name: 'RED CHERRY TOMATO', category: 'vegetables', defaultUnit: 'kg' },
  { name: 'THYME', category: 'herbs', defaultUnit: 'kg' },
  { name: 'BEANS SUGARSNAPS', category: 'vegetables', defaultUnit: 'kg' },
  { name: 'ROMAINE lettuce', category: 'vegetables', defaultUnit: 'kg' },
  { name: 'Tomato (Local)', category: 'vegetables', defaultUnit: 'kg' },
  { name: 'Tomato (Hybrid)', category: 'vegetables', defaultUnit: 'kg' },
  { name: 'Potato', category: 'vegetables', defaultUnit: 'kg' },
  { name: 'Onion (Big)', category: 'vegetables', defaultUnit: 'kg' },
  { name: 'Carrot (Ooty)', category: 'vegetables', defaultUnit: 'kg' },
  { name: 'Cabbage', category: 'vegetables', defaultUnit: 'kg' },
  { name: 'Green Chilli', category: 'vegetables', defaultUnit: 'kg' },
  { name: 'Ginger', category: 'vegetables', defaultUnit: 'kg' },
  { name: 'Garlic (Peeled)', category: 'vegetables', defaultUnit: 'kg' },
];

function getInitialDefaultProducts(): Product[] {
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

export async function getProducts(activeOnly: boolean = false): Promise<Product[]> {
  // 1. Instant Cache Return (< 2ms)
  const cached = getCachedData<Product[]>(CACHE_KEYS.PRODUCTS, getInitialDefaultProducts());

  // 2. Try Firestore with fast timeout
  try {
    let q;
    if (activeOnly) {
      q = query(collection(db, 'products'), where('active', '==', true), orderBy('name', 'asc'));
    } else {
      q = query(collection(db, 'products'), orderBy('name', 'asc'));
    }
    const snapshot = await withTimeout(getDocs(q), 350);
    if (!snapshot.empty) {
      const live = snapshot.docs.map((d) => mapProduct(d.id, d.data()));
      setCachedData(CACHE_KEYS.PRODUCTS, live);
      return activeOnly ? live.filter((p) => p.active) : live;
    }
  } catch {
    // Timeout or offline — use cached items immediately
  }

  return activeOnly ? cached.filter((p) => p.active) : cached;
}

export async function getProduct(id: string): Promise<Product | null> {
  const cached = getCachedData<Product[]>(CACHE_KEYS.PRODUCTS, []);
  const found = cached.find((p) => p.id === id);
  if (found) return found;

  try {
    const snap = await withTimeout(getDoc(doc(db, 'products', id)), 350);
    if (snap.exists()) return mapProduct(snap.id, snap.data());
  } catch {
    // Ignore timeout
  }
  return null;
}

export async function createProduct(
  data: { name: string; category?: ProductCategory; defaultUnit?: ProductUnit },
  createdBy: string
): Promise<string> {
  const name = data.name.trim();
  const category = data.category || 'vegetables';
  const defaultUnit = data.defaultUnit || 'kg';
  const newId = `prod_${Date.now()}`;

  const newProduct: Product = {
    id: newId,
    name,
    category,
    defaultUnit,
    active: true,
    createdAt: new Date(),
    createdBy,
    updatedAt: new Date(),
  };

  // Instant local cache save
  const current = getCachedData<Product[]>(CACHE_KEYS.PRODUCTS, getInitialDefaultProducts());
  setCachedData(CACHE_KEYS.PRODUCTS, [...current, newProduct]);

  // Sync to Firestore in background
  addDoc(collection(db, 'products'), {
    name,
    category,
    defaultUnit,
    active: true,
    createdAt: serverTimestamp(),
    createdBy,
    updatedAt: serverTimestamp(),
  }).catch(() => {
    // Handled silently
  });

  return newId;
}

export async function updateProduct(
  id: string,
  data: Partial<{ name: string; category: ProductCategory; defaultUnit: ProductUnit; active: boolean }>
): Promise<void> {
  const current = getCachedData<Product[]>(CACHE_KEYS.PRODUCTS, []);
  const updated = current.map((p) => (p.id === id ? { ...p, ...data, updatedAt: new Date() } : p));
  setCachedData(CACHE_KEYS.PRODUCTS, updated);

  updateDoc(doc(db, 'products', id), {
    ...data,
    updatedAt: serverTimestamp(),
  }).catch(() => {});
}

export async function toggleProductActive(id: string, active: boolean): Promise<void> {
  return updateProduct(id, { active });
}

export const PRODUCT_CATEGORIES: { value: ProductCategory; label: string }[] = [
  { value: 'vegetables', label: 'Vegetables' },
  { value: 'fruits', label: 'Fruits' },
  { value: 'herbs', label: 'Herbs & Greens' },
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
