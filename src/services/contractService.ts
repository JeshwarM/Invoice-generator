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
import type { Contract, ContractItem, ContractStatus, ContractDuration, ProductUnit } from '../types';
import { isDateInRange } from '../utils/date';
import { getCachedData, setCachedData, withTimeout, CACHE_KEYS } from '../utils/localStore';

function mapContract(id: string, data: Record<string, unknown>): Contract {
  const toDate = (v: unknown): Date =>
    v instanceof Timestamp ? v.toDate() : v ? new Date(v as string) : new Date();
  return {
    id,
    hotelId: (data.hotelId as string) || '',
    hotelName: (data.hotelName as string) || '',
    contractNumber: (data.contractNumber as string) || '',
    startDate: toDate(data.startDate),
    endDate: toDate(data.endDate),
    duration: (data.duration as ContractDuration) || 12,
    status: (data.status as ContractStatus) || 'draft',
    createdAt: toDate(data.createdAt),
    createdBy: (data.createdBy as string) || '',
    updatedAt: toDate(data.updatedAt),
  };
}

function mapContractItem(id: string, data: Record<string, unknown>): ContractItem {
  const toDate = (v: unknown): Date =>
    v instanceof Timestamp ? v.toDate() : v ? new Date(v as string) : new Date();
  return {
    id,
    contractId: (data.contractId as string) || '',
    productId: (data.productId as string) || '',
    productName: (data.productName as string) || '',
    unit: (data.unit as ProductUnit) || 'kg',
    rate: (data.rate as number) || 0,
    active: data.active !== false,
    createdAt: toDate(data.createdAt),
    updatedAt: toDate(data.updatedAt),
  };
}

export async function getContracts(hotelId?: string): Promise<Contract[]> {
  const cached = getCachedData<Contract[]>(CACHE_KEYS.CONTRACTS, []);
  const filteredCached = hotelId ? cached.filter((c) => c.hotelId === hotelId) : cached;

  try {
    let q;
    if (hotelId) {
      q = query(collection(db, 'contracts'), where('hotelId', '==', hotelId), orderBy('startDate', 'desc'));
    } else {
      q = query(collection(db, 'contracts'), orderBy('startDate', 'desc'));
    }
    const snapshot = await withTimeout(getDocs(q), 350);
    if (!snapshot.empty) {
      const live = snapshot.docs.map((d) => mapContract(d.id, d.data()));
      setCachedData(CACHE_KEYS.CONTRACTS, live);
      return live;
    }
  } catch {
    // Return cached immediately
  }

  return filteredCached;
}

export async function getContract(id: string): Promise<Contract | null> {
  const cached = getCachedData<Contract[]>(CACHE_KEYS.CONTRACTS, []);
  const found = cached.find((c) => c.id === id);
  if (found) return found;

  try {
    const snap = await withTimeout(getDoc(doc(db, 'contracts', id)), 350);
    if (snap.exists()) return mapContract(snap.id, snap.data());
  } catch {}
  return null;
}

export async function findActiveContractForDate(
  hotelId: string,
  deliveryDate: Date
): Promise<Contract | null> {
  const cached = getCachedData<Contract[]>(CACHE_KEYS.CONTRACTS, []);
  const matchingCached = cached.find(
    (c) =>
      c.hotelId === hotelId &&
      c.status === 'active' &&
      isDateInRange(new Date(deliveryDate), new Date(c.startDate), new Date(c.endDate))
  );
  if (matchingCached) return matchingCached;

  try {
    const q = query(
      collection(db, 'contracts'),
      where('hotelId', '==', hotelId),
      where('status', '==', 'active')
    );
    const snapshot = await withTimeout(getDocs(q), 350);
    for (const d of snapshot.docs) {
      const contract = mapContract(d.id, d.data());
      if (isDateInRange(new Date(deliveryDate), new Date(contract.startDate), new Date(contract.endDate))) {
        return contract;
      }
    }
  } catch {}

  return null;
}

export async function getActiveContracts(): Promise<Contract[]> {
  const cached = getCachedData<Contract[]>(CACHE_KEYS.CONTRACTS, []);
  const activeCached = cached.filter((c) => c.status === 'active');
  try {
    const q = query(collection(db, 'contracts'), where('status', '==', 'active'), orderBy('endDate', 'asc'));
    const snapshot = await withTimeout(getDocs(q), 350);
    if (!snapshot.empty) {
      return snapshot.docs.map((d) => mapContract(d.id, d.data()));
    }
  } catch {}
  return activeCached;
}

export async function getExpiringContracts(withinDays: number = 30): Promise<Contract[]> {
  const now = new Date();
  const futureDate = new Date();
  futureDate.setDate(now.getDate() + withinDays);

  const contracts = await getActiveContracts();
  return contracts.filter((c) => new Date(c.endDate) <= futureDate && new Date(c.endDate) >= now);
}

export async function createContract(
  data: {
    hotelId: string;
    hotelName: string;
    startDate: Date;
    endDate: Date;
    duration: ContractDuration;
  },
  createdBy: string
): Promise<string> {
  const contractNumber = `CNT_${Date.now().toString().slice(-6)}`;
  const newId = `contract_${Date.now()}`;

  const newContract: Contract = {
    id: newId,
    hotelId: data.hotelId,
    hotelName: data.hotelName,
    contractNumber,
    startDate: data.startDate,
    endDate: data.endDate,
    duration: data.duration,
    status: 'active',
    createdAt: new Date(),
    createdBy,
    updatedAt: new Date(),
  };

  // Instant local cache save
  const current = getCachedData<Contract[]>(CACHE_KEYS.CONTRACTS, []);
  setCachedData(CACHE_KEYS.CONTRACTS, [newContract, ...current]);

  // Sync to Firestore in background
  addDoc(collection(db, 'contracts'), {
    hotelId: data.hotelId,
    hotelName: data.hotelName,
    contractNumber,
    startDate: Timestamp.fromDate(data.startDate),
    endDate: Timestamp.fromDate(data.endDate),
    duration: data.duration,
    status: 'active',
    createdAt: serverTimestamp(),
    createdBy,
    updatedAt: serverTimestamp(),
  }).catch(() => {});

  return newId;
}

export async function getContractItems(contractId: string): Promise<ContractItem[]> {
  const cached = getCachedData<ContractItem[]>(CACHE_KEYS.CONTRACT_ITEMS, []);
  const matching = cached.filter((item) => item.contractId === contractId);
  if (matching.length > 0) return matching;

  try {
    const q = query(
      collection(db, 'contracts', contractId, 'items'),
      where('active', '==', true),
      orderBy('productName', 'asc')
    );
    const snapshot = await withTimeout(getDocs(q), 350);
    if (!snapshot.empty) {
      const live = snapshot.docs.map((d) => mapContractItem(d.id, d.data()));
      setCachedData(CACHE_KEYS.CONTRACT_ITEMS, [...cached.filter((i) => i.contractId !== contractId), ...live]);
      return live;
    }
  } catch {}

  return matching;
}

export async function addContractItem(
  contractId: string,
  data: {
    productId: string;
    productName: string;
    unit: ProductUnit;
    rate: number; // in paise
  }
): Promise<string> {
  const newId = `citem_${Date.now()}_${Math.random().toString(36).slice(-4)}`;
  const newItem: ContractItem = {
    id: newId,
    contractId,
    productId: data.productId,
    productName: data.productName,
    unit: data.unit,
    rate: data.rate,
    active: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  // Instant local save
  const cached = getCachedData<ContractItem[]>(CACHE_KEYS.CONTRACT_ITEMS, []);
  setCachedData(CACHE_KEYS.CONTRACT_ITEMS, [...cached, newItem]);

  // Sync in background
  addDoc(collection(db, 'contracts', contractId, 'items'), {
    contractId,
    productId: data.productId,
    productName: data.productName,
    unit: data.unit,
    rate: data.rate,
    active: true,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  }).catch(() => {});

  return newId;
}

export async function updateContractItem(
  contractId: string,
  itemId: string,
  data: Partial<Omit<ContractItem, 'id' | 'contractId' | 'createdAt'>>
): Promise<void> {
  const cached = getCachedData<ContractItem[]>(CACHE_KEYS.CONTRACT_ITEMS, []);
  const updated = cached.map((ci) =>
    ci.id === itemId ? { ...ci, ...data, updatedAt: new Date() } : ci
  );
  setCachedData(CACHE_KEYS.CONTRACT_ITEMS, updated);

  updateDoc(doc(db, 'contracts', contractId, 'items', itemId), {
    ...data,
    updatedAt: serverTimestamp(),
  }).catch(() => {});
}
