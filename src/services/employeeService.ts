import {
  collection,
  doc,
  addDoc,
  setDoc,
  updateDoc,
  getDocs,
  query,
  where,
  orderBy,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { auth, db } from '../config/firebase';
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

export async function getAccessRequestByEmail(email: string): Promise<AccessRequest | null> {
  const cleanEmail = email.toLowerCase().trim();
  const cached = getCachedData<AccessRequest[]>(CACHE_KEYS.ACCESS_REQUESTS, []);
  const localMatch = cached.find((r) => r.email.toLowerCase() === cleanEmail);
  if (localMatch) return localMatch;

  try {
    const q = query(collection(db, 'accessRequests'), where('email', '==', cleanEmail));
    const snapshot = await withTimeout(getDocs(q), 350);
    if (!snapshot.empty) {
      const docData = snapshot.docs[0];
      return mapAccessRequest(docData.id, docData.data());
    }
  } catch {}

  return null;
}

export async function activateEmployeeAccount(
  email: string,
  password: string
): Promise<User> {
  const cleanEmail = email.toLowerCase().trim();
  const request = await getAccessRequestByEmail(cleanEmail);

  if (!request) {
    throw new Error('No access request found for this email. Please submit an access request first.');
  }

  if (request.status === 'pending') {
    throw new Error('Your access request is still pending administrator approval. Please wait for the administrator to approve it.');
  }

  if (request.status === 'rejected') {
    throw new Error('Your access request was rejected' + (request.rejectionReason ? `: ${request.rejectionReason}` : '. Please contact your administrator.'));
  }

  // Request is approved! Register locally and in Firebase
  const newUid = 'emp_' + cleanEmail.replace(/[^a-zA-Z0-9]/g, '_');
  const user: User = {
    uid: newUid,
    name: request.name,
    email: cleanEmail,
    role: 'employee',
    status: 'active',
    createdAt: new Date(),
    updatedAt: new Date(),
    lastLoginAt: new Date(),
  };

  // 1. Save in local accounts store for offline/local authentication
  try {
    const raw = localStorage.getItem('agrobill_accounts');
    const accounts = raw ? JSON.parse(raw) : [];
    const filtered = accounts.filter((a: { email: string }) => a.email.toLowerCase() !== cleanEmail);
    filtered.push({ email: cleanEmail, password, name: request.name, role: 'employee' });
    localStorage.setItem('agrobill_accounts', JSON.stringify(filtered));
  } catch {}

  // 2. Add to cached users list
  const currentUsers = getCachedData<User[]>(CACHE_KEYS.USERS, []);
  const userFiltered = currentUsers.filter((u) => u.email.toLowerCase() !== cleanEmail);
  setCachedData(CACHE_KEYS.USERS, [...userFiltered, user]);

  // 3. Sync to Firebase Auth & Firestore with timeout if reachable
  try {
    const cred = await withTimeout(createUserWithEmailAndPassword(auth, cleanEmail, password), 500);
    user.uid = cred.user.uid;
    try {
      await updateProfile(cred.user, { displayName: request.name });
    } catch {}
    await withTimeout(
      setDoc(doc(db, 'users', cred.user.uid), {
        uid: cred.user.uid,
        name: request.name,
        email: cleanEmail,
        role: 'employee',
        status: 'active',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        lastLoginAt: serverTimestamp(),
      }),
      500
    );
  } catch {
    // Non-blocking in offline / local dev
  }

  return user;
}
