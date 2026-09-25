import {
  collection,
  doc,
  addDoc,
  updateDoc,
  getDocs,
  query,
  where,
  orderBy,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import type { User, AccessRequest, UserStatus, AccessRequestStatus } from '../types';
import { getCachedData, setCachedData, withTimeout, CACHE_KEYS } from '../utils/localStore';

function mapUser(id: string, data: Record<string, unknown>): User {
  return {
    uid: id,
    name: (data.name as string) || '',
    email: (data.email as string) || '',
    role: (data.role as User['role']) || 'employee',
    status: (data.status as UserStatus) || 'pending',
    createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(),
    updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate() : new Date(),
    lastLoginAt: data.lastLoginAt instanceof Timestamp ? data.lastLoginAt.toDate() : null,
  };
}

function mapAccessRequest(id: string, data: Record<string, unknown>): AccessRequest {
  return {
    id,
    name: (data.name as string) || '',
    email: (data.email as string) || '',
    status: (data.status as AccessRequestStatus) || 'pending',
    requestedAt: data.requestedAt instanceof Timestamp ? data.requestedAt.toDate() : new Date(),
    reviewedAt: data.reviewedAt instanceof Timestamp ? data.reviewedAt.toDate() : null,
    reviewedBy: (data.reviewedBy as string) || null,
    rejectionReason: (data.rejectionReason as string) || undefined,
  };
}

export async function submitAccessRequest(name: string, email: string): Promise<void> {
  const cached = getCachedData<AccessRequest[]>(CACHE_KEYS.ACCESS_REQUESTS, []);
  const cleanEmail = email.toLowerCase().trim();
  const existing = cached.find((r) => r.email.toLowerCase() === cleanEmail);
  if (existing) {
    if (existing.status === 'pending') {
      throw new Error('A request with this email is already pending.');
    }
    if (existing.status === 'approved') {
      throw new Error('This email has already been approved. Please log in.');
    }
  }

  const newRequest: AccessRequest = {
    id: 'req_' + Date.now(),
    name: name.trim(),
    email: cleanEmail,
    status: 'pending',
    requestedAt: new Date(),
    reviewedAt: null,
    reviewedBy: null,
  };

  // Immediate local update so the Controller immediately sees it
  setCachedData(CACHE_KEYS.ACCESS_REQUESTS, [newRequest, ...cached]);

  // Non-blocking firestore sync with 350ms timeout
  try {
    await withTimeout(
      addDoc(collection(db, 'accessRequests'), {
        name: name.trim(),
        email: cleanEmail,
        status: 'pending',
        requestedAt: serverTimestamp(),
        reviewedAt: null,
        reviewedBy: null,
      }),
      350
    );
  } catch {
    // Graceful offline fallback
  }
}

export async function getAccessRequests(status?: AccessRequestStatus): Promise<AccessRequest[]> {
  const cached = getCachedData<AccessRequest[]>(CACHE_KEYS.ACCESS_REQUESTS, []);
  let filtered = status ? cached.filter((r) => r.status === status) : cached;

  try {
    let q;
    if (status) {
      q = query(
        collection(db, 'accessRequests'),
        where('status', '==', status),
        orderBy('requestedAt', 'desc')
      );
    } else {
      q = query(collection(db, 'accessRequests'), orderBy('requestedAt', 'desc'));
    }
    const snapshot = await withTimeout(getDocs(q), 350);
    if (!snapshot.empty) {
      const live = snapshot.docs.map((d) => mapAccessRequest(d.id, d.data()));
      setCachedData(CACHE_KEYS.ACCESS_REQUESTS, live);
      return status ? live.filter((r) => r.status === status) : live;
    }
  } catch {}

  return filtered;
}

export async function getPendingRequestCount(): Promise<number> {
  const cached = getCachedData<AccessRequest[]>(CACHE_KEYS.ACCESS_REQUESTS, []);
  const pendingCached = cached.filter((r) => r.status === 'pending').length;

  try {
    const q = query(collection(db, 'accessRequests'), where('status', '==', 'pending'));
    const snapshot = await withTimeout(getDocs(q), 350);
    return snapshot.size;
  } catch {}

  return pendingCached;
}

export async function approveAccessRequest(
  requestId: string,
  reviewerUid: string
): Promise<void> {
  const cached = getCachedData<AccessRequest[]>(CACHE_KEYS.ACCESS_REQUESTS, []);
  setCachedData(
    CACHE_KEYS.ACCESS_REQUESTS,
    cached.map((r) => (r.id === requestId ? { ...r, status: 'approved' as AccessRequestStatus, reviewedBy: reviewerUid, reviewedAt: new Date() } : r))
  );

  updateDoc(doc(db, 'accessRequests', requestId), {
    status: 'approved',
    reviewedAt: serverTimestamp(),
    reviewedBy: reviewerUid,
  }).catch(() => {});
}

export async function rejectAccessRequest(
  requestId: string,
  reviewerUid: string,
  reason: string
): Promise<void> {
  const cached = getCachedData<AccessRequest[]>(CACHE_KEYS.ACCESS_REQUESTS, []);
  setCachedData(
    CACHE_KEYS.ACCESS_REQUESTS,
    cached.map((r) => (r.id === requestId ? { ...r, status: 'rejected' as AccessRequestStatus, reviewedBy: reviewerUid, rejectionReason: reason, reviewedAt: new Date() } : r))
  );

  updateDoc(doc(db, 'accessRequests', requestId), {
    status: 'rejected',
    reviewedAt: serverTimestamp(),
    reviewedBy: reviewerUid,
    rejectionReason: reason,
  }).catch(() => {});
}

export async function getUsers(): Promise<User[]> {
  const cached = getCachedData<User[]>(CACHE_KEYS.USERS, []);

  try {
    const q = query(collection(db, 'users'), orderBy('name', 'asc'));
    const snapshot = await withTimeout(getDocs(q), 350);
    if (!snapshot.empty) {
      const live = snapshot.docs.map((d) => mapUser(d.id, d.data()));
      setCachedData(CACHE_KEYS.USERS, live);
      return live;
    }
  } catch {}

  return cached;
}

export async function updateUserStatus(uid: string, status: UserStatus): Promise<void> {
  const cached = getCachedData<User[]>(CACHE_KEYS.USERS, []);
  setCachedData(
    CACHE_KEYS.USERS,
    cached.map((u) => (u.uid === uid ? { ...u, status, updatedAt: new Date() } : u))
  );

  updateDoc(doc(db, 'users', uid), {
    status,
    updatedAt: serverTimestamp(),
  }).catch(() => {});
}
