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
  deleteDoc,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import type { Contract, ContractItem, ContractDuration, ContractStatus, ProductUnit } from '../types';

function mapContract(id: string, data: Record<string, unknown>): Contract {
  return {
    id,
    hotelId: (data.hotelId as string) || '',
    hotelName: (data.hotelName as string) || '',
    contractNumber: (data.contractNumber as string) || '',
    startDate: data.startDate instanceof Timestamp ? data.startDate.toDate() : new Date(data.startDate as string),
    endDate: data.endDate instanceof Timestamp ? data.endDate.toDate() : new Date(data.endDate as string),
    duration: (data.duration as ContractDuration) || 12,
    status: (data.status as ContractStatus) || 'draft',
    createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(),
    createdBy: (data.createdBy as string) || '',
    updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate() : new Date(),
  };
}

function mapContractItem(id: string, data: Record<string, unknown>): ContractItem {
  return {
    id,
    contractId: (data.contractId as string) || '',
    productId: (data.productId as string) || '',
    productName: (data.productName as string) || '',
    unit: (data.unit as ProductUnit) || 'kg',
    rate: (data.rate as number) || 0,
    active: data.active !== false,
    createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(),
    updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate() : new Date(),
  };
}

export async function getContracts(hotelId?: string): Promise<Contract[]> {
  let q;
  if (hotelId) {
    q = query(collection(db, 'contracts'), where('hotelId', '==', hotelId), orderBy('startDate', 'desc'));
  } else {
    q = query(collection(db, 'contracts'), orderBy('startDate', 'desc'));
  }
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => mapContract(d.id, d.data()));
}

export async function getContract(id: string): Promise<Contract | null> {
  const snap = await getDoc(doc(db, 'contracts', id));
  if (!snap.exists()) return null;
  return mapContract(snap.id, snap.data());
}

/**
 * Find the active contract for a hotel on a specific delivery date.
 * Uses: startDate <= deliveryDate AND deliveryDate <= endDate AND status == 'active'
 */
export async function findActiveContractForDate(
  hotelId: string,
  deliveryDate: Date
): Promise<Contract | null> {
  const q = query(
    collection(db, 'contracts'),
    where('hotelId', '==', hotelId),
    where('status', '==', 'active')
  );
  const snapshot = await getDocs(q);
  const delivery = new Date(deliveryDate.getFullYear(), deliveryDate.getMonth(), deliveryDate.getDate());
  
  for (const d of snapshot.docs) {
    const contract = mapContract(d.id, d.data());
    const start = new Date(contract.startDate.getFullYear(), contract.startDate.getMonth(), contract.startDate.getDate());
    const end = new Date(contract.endDate.getFullYear(), contract.endDate.getMonth(), contract.endDate.getDate());
    if (delivery >= start && delivery <= end) {
      return contract;
    }
  }
  return null;
}

export async function getActiveContracts(): Promise<Contract[]> {
  const q = query(
    collection(db, 'contracts'),
    where('status', '==', 'active'),
    orderBy('endDate', 'asc')
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => mapContract(d.id, d.data()));
}

export async function getExpiringContracts(withinDays: number = 30): Promise<Contract[]> {
  const now = new Date();
  const futureDate = new Date();
  futureDate.setDate(now.getDate() + withinDays);

  const contracts = await getActiveContracts();
  return contracts.filter((c) => c.endDate <= futureDate && c.endDate >= now);
}

function generateContractNumber(hotelName: string, startDate: Date): string {
  const prefix = hotelName.substring(0, 3).toUpperCase().replace(/[^A-Z]/g, 'X');
  const year = startDate.getFullYear().toString().slice(-2);
  const month = (startDate.getMonth() + 1).toString().padStart(2, '0');
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `CNT-${prefix}-${year}${month}-${rand}`;
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
  const contractNumber = generateContractNumber(data.hotelName, data.startDate);
  const docRef = await addDoc(collection(db, 'contracts'), {
    hotelId: data.hotelId,
    hotelName: data.hotelName,
    contractNumber,
    startDate: Timestamp.fromDate(data.startDate),
    endDate: Timestamp.fromDate(data.endDate),
    duration: data.duration,
    status: 'active' as ContractStatus,
    createdAt: serverTimestamp(),
    createdBy,
    updatedAt: serverTimestamp(),
  });
  return docRef.id;
}

export async function updateContractStatus(id: string, status: ContractStatus): Promise<void> {
  await updateDoc(doc(db, 'contracts', id), { status, updatedAt: serverTimestamp() });
}

// Contract Items
export async function getContractItems(contractId: string): Promise<ContractItem[]> {
  const q = query(
    collection(db, 'contractItems'),
    where('contractId', '==', contractId),
    orderBy('productName', 'asc')
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => mapContractItem(d.id, d.data()));
}

export async function addContractItem(
  contractId: string,
  data: { productId: string; productName: string; unit: ProductUnit; rate: number }
): Promise<string> {
  const docRef = await addDoc(collection(db, 'contractItems'), {
    contractId,
    productId: data.productId,
    productName: data.productName,
    unit: data.unit,
    rate: data.rate, // stored in paise
    active: true,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return docRef.id;
}

export async function updateContractItem(
  id: string,
  data: Partial<{ rate: number; unit: ProductUnit; active: boolean }>
): Promise<void> {
  await updateDoc(doc(db, 'contractItems', id), {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

export async function removeContractItem(id: string): Promise<void> {
  await deleteDoc(doc(db, 'contractItems', id));
}
